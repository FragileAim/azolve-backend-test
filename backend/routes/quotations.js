const router = require('express').Router();
const Quotation = require('../models/Quotation');
const Client = require('../models/Client');
const Company = require('../models/Company');
const Invoice = require('../models/Invoice');
const SalesOrder = require('../models/SalesOrder');
const DeliveryChallan = require('../models/DeliveryChallan');
const { protect, requirePermission } = require('../middleware/auth');
const { validateInvoice, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, generateInvoiceNumber, getNextInvoiceNumber } = require('../utils/helpers');
const { sendEmail, templates } = require('../utils/email');

// GET /api/quotations
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['quotationNumber', 'clientSnapshot.name']);
    if (req.query.status) query.status = req.query.status;
    if (req.query.client) query.client = req.query.client;
    const sort = buildSort(req, '-issueDate');
    const result = await paginate(Quotation, query, req.query.page, req.query.limit, sort, 'client');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/quotations/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const companyId = req.companyId;
    const [total, sent, accepted, expired] = await Promise.all([
      Quotation.countDocuments({ company: companyId }),
      Quotation.countDocuments({ company: companyId, status: 'sent' }),
      Quotation.countDocuments({ company: companyId, status: 'accepted' }),
      Quotation.countDocuments({ company: companyId, status: 'expired' }),
    ]);
    res.json({ success: true, data: { total, sent, accepted, expired } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/quotations/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId }).populate('client').populate('issuedBy', 'name email');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/quotations
router.post('/', protect, requirePermission('canCreateInvoices'), validateInvoice, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    const count = await Quotation.countDocuments({ company: req.companyId });
    const quotationNumber = generateInvoiceNumber(
      company?.settings?.quotePrefix || 'QTN',
      company?.settings?.quoteStartNumber || 1,
      count
    );

    const client = await Client.findById(req.body.client);
    const clientSnapshot = client ? {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: [client.billingAddress?.street, client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
      taxNumber: client.taxNumber,
    } : {};

    const items = (req.body.items || []).map(item => {
      const taxAmount = (item.price * item.quantity * (item.taxRate || 0)) / 100;
      const total = (item.price * item.quantity) + taxAmount - (item.discount || 0);
      return { ...item, taxAmount, total };
    });

    const quotation = await Quotation.create({
      ...req.body,
      items,
      quotationNumber,
      clientSnapshot,
      company: req.companyId,
      issuedBy: req.user._id,
      createdBy: req.user._id,
      currency: company?.settings?.currency || 'INR',
      validUntil: req.body.validUntil ? new Date(req.body.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ success: true, message: 'Quotation created', data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/quotations/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.company; delete updates.quotationNumber; delete updates.createdBy;

    if (updates.items) {
      updates.items = updates.items.map(item => {
        const taxAmount = (item.price * item.quantity * (item.taxRate || 0)) / 100;
        const total = (item.price * item.quantity) + taxAmount - (item.discount || 0);
        return { ...item, taxAmount, total };
      });
    }

    const quotation = await Quotation.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, message: 'Quotation updated', data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/quotations/:id/status
router.put('/:id/status', protect, validateId, async (req, res) => {
  try {
    const { status } = req.body;
    const quotation = await Quotation.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, { status }, { new: true });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, message: `Quotation marked as ${status}`, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/quotations/:id/send
router.post('/:id/send', protect, validateId, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId }).populate('client');
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const clientEmail = quotation.client?.email || quotation.clientSnapshot?.email;
    if (!clientEmail) return res.status(400).json({ success: false, message: 'Client email not found' });

    const emailTemplate = templates.invoiceSent(quotation.clientSnapshot?.name || 'Client', quotation.quotationNumber, quotation.grandTotal, new Date(quotation.validUntil).toLocaleDateString('en-IN'));
    await sendEmail({ to: clientEmail, ...emailTemplate });

    if (quotation.status === 'draft') {
      quotation.status = 'sent';
      await quotation.save();
    }

    res.json({ success: true, message: 'Quotation sent to ' + clientEmail });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/quotations/:id/convert
router.post('/:id/convert', protect, validateId, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId });
if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

if (quotation.status === 'converted' || quotation.convertedInvoice) {
  return res.status(400).json({
    success: false,
    message: 'Quotation has already been converted to an invoice',
  });
} 

const company = await Company.findById(req.companyId);

const invoiceNumber = await getNextInvoiceNumber(
  req.companyId,
  company?.settings?.invoicePrefix || 'INV',
  company?.settings?.invoiceStartNumber || 1
);
    const invoice = await Invoice.create({
      company: req.companyId,
      invoiceNumber,
      client: quotation.client,
      clientSnapshot: quotation.clientSnapshot,
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discountAmount: quotation.discountAmount,
      shippingCost: quotation.shippingCost,
      grandTotal: quotation.grandTotal,
      currency: quotation.currency,
      status: 'draft',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: quotation.notes,
      terms: quotation.terms,
      issuedBy: req.user._id,
      createdBy: req.user._id,
    });

    quotation.status = 'converted';
    quotation.convertedInvoice = invoice._id;
    quotation.acceptedDate = new Date();
    await quotation.save();

    res.status(201).json({ success: true, message: 'Quotation converted to invoice', data: { quotation, invoice } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});  

// POST /api/quotations/:id/convert-to-sales-order
router.post('/:id/convert-to-sales-order', protect, validateId, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    if (quotation.status === 'converted') {
  return res.status(400).json({
    success: false,
    message: 'Quotation has already been converted to an invoice',
    data: {
      quotationId: quotation._id, 
      invoiceId: quotation.convertedInvoice
    }
  }); 
}

    const company = await Company.findById(req.companyId);
    const count = await SalesOrder.countDocuments({ company: req.companyId });
    const orderNumber = generateInvoiceNumber(company?.settings?.orderPrefix || 'SO', company?.settings?.orderStartNumber || 1, count);

    const salesOrder = await SalesOrder.create({
      company: req.companyId,
      orderNumber,
      client: quotation.client,
      clientSnapshot: quotation.clientSnapshot,
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxAmount: quotation.taxAmount,
      discountAmount: quotation.discountAmount,
      shippingCost: quotation.shippingCost,
      grandTotal: quotation.grandTotal,
      currency: quotation.currency,
      status: 'draft',
      issueDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days default
      convertedFromQuotation: quotation._id,
      notes: quotation.notes,
      terms: quotation.terms,
      issuedBy: req.user._id,
      createdBy: req.user._id,
    });

    quotation.status = 'converted';
    quotation.convertedSalesOrder = salesOrder._id;
    quotation.acceptedDate = new Date();
    await quotation.save();

    res.status(201).json({ success: true, message: 'Quotation converted to Sales Order', data: { quotation, salesOrder } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const quotation = await Quotation.findOne({ _id: req.params.id, company: req.companyId });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    await quotation.deleteOne();
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
