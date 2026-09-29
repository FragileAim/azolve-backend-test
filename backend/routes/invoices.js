const router = require('express').Router();
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Company = require('../models/Company');
const { protect, requirePermission } = require('../middleware/auth');
const { validateInvoice, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, generateInvoiceNumber, getNextInvoiceNumber } = require('../utils/helpers');
const { sendEmail, templates } = require('../utils/email');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');
const notificationService = require('../services/notificationService');
const { isIntraState, calculateItemTax, aggregateTaxSummary } = require('../utils/tax');
const { generateUpiString } = require('../utils/upi');

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
    const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId }).populate('client').populate('issuedBy', 'name email').lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    // Generate UPI string if balance is due
    if (invoice.balanceDue > 0) {
      const company = await Company.findById(req.companyId);
      const vpa = company?.bankDetails?.upiVpa || 'merchant@upi'; // Fallback for now
      try {
        invoice.upiString = generateUpiString({
          pa: vpa,
          pn: company?.name || 'Merchant',
          am: invoice.balanceDue,
          tr: invoice.invoiceNumber
        });
      } catch (e) {
        invoice.upiString = null;
      }
    }
    
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

const invoiceNumber = await getNextInvoiceNumber(
  req.companyId,
  company?.settings?.invoicePrefix || 'INV',
  company?.settings?.invoiceStartNumber || 1
);

    // Get client snapshot
    const client = await Client.findById(req.body.client);
    const clientSnapshot = client ? {
      name: client.name, email: client.email, phone: client.phone,
      address: [client.billingAddress?.street, client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
      taxNumber: client.taxNumber,
    } : {};

    // Determine tax type
    const clientState = req.body.placeOfSupply || client?.billingAddress?.state;
    const isIntra = isIntraState(company?.address?.state, clientState);

    // Calculate line item totals and dynamic tax
    const items = (req.body.items || []).map(item => {
      const taxRate = item.gstRate || item.taxRate || 0;
      const amountAfterDiscount = (item.price * item.quantity) - (item.discount || 0);
      const tax = calculateItemTax(amountAfterDiscount, taxRate, isIntra);
      const total = amountAfterDiscount + tax.totalTax;
      
      return { 
        ...item, 
        taxAmount: tax.totalTax,  
        cgst: tax.cgst, 
        sgst: tax.sgst, 
        igst: tax.igst,
        total 
      };
    });
    
    const taxSummary = aggregateTaxSummary(items);

    const invoice = await Invoice.create({
      ...req.body, items, invoiceNumber, clientSnapshot,
      taxSummary,
      company: req.companyId, issuedBy: req.user._id, createdBy: req.user._id,
      currency: company?.settings?.currency || 'INR',
    });

    // Update client totals  
    if (client) {
      client.totalInvoices = (client.totalInvoices || 0) + 1;
      await client.save();
    }

    await notificationService.create({
      companyId: req.companyId,
      type: 'invoice',
      icon: '🧾',
      priority: 'normal',
      title: 'Invoice created',
      message: `${invoice.invoiceNumber} was created`,
      resource: 'invoice',
      resourceId: invoice._id,
      url: `/invoices/${invoice._id}`,
    });

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
      const company = await Company.findById(req.companyId);
      const invoice = await Invoice.findOne({ _id: req.params.id, company: req.companyId }).populate('client');
      
      const clientState = updates.placeOfSupply || invoice?.client?.billingAddress?.state;
      const isIntra = isIntraState(company?.address?.state, clientState);

      updates.items = updates.items.map(item => {
        const taxRate = item.gstRate || item.taxRate || 0;
        const amountAfterDiscount = (item.price * item.quantity) - (item.discount || 0);
        const tax = calculateItemTax(amountAfterDiscount, taxRate, isIntra);
        const total = amountAfterDiscount + tax.totalTax;
        
        return { 
          ...item, 
          taxAmount: tax.totalTax, 
          cgst: tax.cgst, 
          sgst: tax.sgst, 
          igst: tax.igst,
          total 
        };
      });
      
      updates.taxSummary = aggregateTaxSummary(updates.items);
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

    if (status === 'paid') {
      await notificationService.invoicePaid(req.companyId, req.user._id, invoice);
      if (invoice.client) {
        await Client.findByIdAndUpdate(invoice.client, { $inc: { totalPurchases: invoice.grandTotal } });
      }
    }

    if (status === 'sent') {
      await notificationService.create({
        companyId: req.companyId,
        type: 'invoice',
        icon: '✉️',
        priority: 'normal',
        title: 'Invoice sent',
        message: `${invoice.invoiceNumber} was sent to the client`,
        resource: 'invoice',
        resourceId: invoice._id,
        url: `/invoices/${invoice._id}`,
      });
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

    await notificationService.create({
      companyId: req.companyId,
      type: 'invoice',
      icon: '✉️',
      priority: 'normal',
      title: 'Invoice sent',
      message: `${invoice.invoiceNumber} was emailed to ${clientEmail}`,
      resource: 'invoice',
      resourceId: invoice._id,
      url: `/invoices/${invoice._id}`,
    });

    res.json({ success: true, message: 'Invoice sent to ' + clientEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/invoices/email-direct
// Sends a fully itemized invoice email straight to the client's inbox.
// Accepts the invoice payload directly from the frontend (used by the
// dashboard's "Email" button) so it works regardless of whether the
// invoice is persisted in MongoDB or only in the client's local store.
router.post('/email-direct', protect, async (req, res) => {
  try {
    const { to, invoice, company, client } = req.body;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ success: false, message: 'A valid recipient email is required' });
    }
    if (!invoice || !invoice.invoiceNumber) {
      return res.status(400).json({ success: false, message: 'Invoice details are required' });
    }

    const emailTemplate = templates.invoiceDetailed({
      company: company || {},
      client: client || {},
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      items: invoice.items || [],
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discountAmount: invoice.discountAmount,
      shippingCost: invoice.shippingCost,
      grandTotal: invoice.grandTotal,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      currency: invoice.currency,
      status: invoice.status,
      notes: invoice.notes,
    });

    const result = await sendEmail({ to, ...emailTemplate });

    if (!result.success) {
      return res.status(502).json({ success: false, message: result.message || 'Failed to send email' });
    }

    res.json({ success: true, message: `Invoice emailed to ${to}` });
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