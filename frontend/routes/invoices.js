const router = require('express').Router();
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Company = require('../models/Company');
const { protect, requirePermission } = require('../middleware/auth');
const { validateInvoice, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, generateInvoiceNumber } = require('../utils/helpers');
const { sendEmail, templates } = require('../utils/email');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');

// GET /api/invoices
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['invoiceNumber', 'clientSnapshot.name']);
    if (req.query.status) query.status = req.query.status;
    if (req.query.client) query.client = req.query.client;
    if (req.query.overdue === 'true') { query.dueDate = { $lt: new Date() }; query.status = { $in: ['pending', 'sent'] }; }
    const sort = buildSort(req, '-issueDate');
    const result = await paginate(Invoice, query, req.query.page, req.query.limit, sort, 'client issuedBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const companyId = req.companyId;
    const [total, paid, pending, overdue, revenue] = await Promise.all([
      Invoice.countDocuments({ company: companyId }),
      Invoice.countDocuments({ company: companyId, status: 'paid' }),
      Invoice.countDocuments({ company: companyId, status: { $in: ['pending', 'sent'] } }),
      Invoice.countDocuments({ company: companyId, status: { $in: ['pending', 'sent'] }, dueDate: { $lt: new Date() } }),
      Invoice.aggregate([{ $match: { company: companyId, status: 'paid' } }, { $group: { _id: null, total: { $sum: '$grandTotal' } } }]),
    ]);
    res.json({ success: true, data: { total, paid, pending, overdue, revenue: revenue[0]?.total || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId }).populate('client').populate('issuedBy', 'name email');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices
router.post('/', protect, requirePermission('canCreateInvoices'), validateInvoice, async (req, res) => {
  try {
    // Generate invoice number
    const company = await Company.findById(req.companyId);
    const count = await Invoice.countDocuments({ company: req.companyId });
    const invoiceNumber = generateInvoiceNumber(
      company?.settings?.invoicePrefix || 'INV',
      company?.settings?.invoiceStartNumber || 1,
      count
    );

    // Get client snapshot
    const client = await Client.findById(req.body.client);
    const clientSnapshot = client ? {
      name: client.name, email: client.email, phone: client.phone,
      address: [client.billingAddress?.street, client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
      taxNumber: client.taxNumber,
    } : {};

    // Calculate line item totals
    const items = req.body.items.map(item => {
      const taxAmount = (item.price * item.quantity * (item.taxRate || 0)) / 100;
      const total = (item.price * item.quantity) + taxAmount - (item.discount || 0);
      return { ...item, taxAmount, total };
    });

    const invoice = await Invoice.create({
      ...req.body, items, invoiceNumber, clientSnapshot,
      company: req.companyId, issuedBy: req.user._id, createdBy: req.user._id,
      currency: company?.settings?.currency || 'INR',
    });

    // Update client totals
    if (client) {
      client.totalInvoices = (client.totalInvoices || 0) + 1;
      await client.save();
    }

    res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.company; delete updates.invoiceNumber; delete updates.createdBy;

    if (updates.items) {
      updates.items = updates.items.map(item => {
        const taxAmount = (item.price * item.quantity * (item.taxRate || 0)) / 100;
        const total = (item.price * item.quantity) + taxAmount - (item.discount || 0);
        return { ...item, taxAmount, total };
      });
    }

    const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice updated', data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/invoices/:id/status
router.put('/:id/status', protect, validateId, async (req, res) => {
  try {
    const { status, paymentMethod, paymentReference, amountPaid } = req.body;
    const update = { status };
    if (status === 'paid') {
      update.paidDate = new Date();
      update.paymentMethod = paymentMethod || '';
      update.paymentReference = paymentReference || '';
    }
    if (amountPaid !== undefined) update.amountPaid = amountPaid;

    const invoice = await Invoice.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, update, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Update client totals if paid
    if (status === 'paid' && invoice.client) {
      await Client.findByIdAndUpdate(invoice.client, { $inc: { totalPurchases: invoice.grandTotal } });
    }

    res.json({ success: true, message: `Invoice marked as ${status}`, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices/:id/send
router.post('/:id/send', protect, validateId, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId }).populate('client');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const clientEmail = invoice.client?.email || invoice.clientSnapshot?.email;
    if (!clientEmail) return res.status(400).json({ success: false, message: 'Client email not found' });

    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
    const emailTemplate = templates.invoiceSent(invoice.clientSnapshot?.name || 'Client', invoice.invoiceNumber, invoice.grandTotal, dueDate);
    await sendEmail({ to: clientEmail, ...emailTemplate });

    if (invoice.status === 'draft') {
      invoice.status = 'sent';
      await invoice.save();
    }

    res.json({ success: true, message: 'Invoice sent to ' + clientEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete paid invoice' });
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;