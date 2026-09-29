const router = require('express').Router();
const DeliveryChallan = require('../models/DeliveryChallan');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Company = require('../models/Company');
const { protect, requirePermission } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, generateInvoiceNumber, getNextInvoiceNumber } = require('../utils/helpers');

// GET /api/delivery-challans
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['challanNumber', 'clientSnapshot.name']);
    if (req.query.status) query.status = req.query.status;
    if (req.query.client) query.client = req.query.client;
    const sort = buildSort(req, '-issueDate');
    const result = await paginate(DeliveryChallan, query, req.query.page, req.query.limit, sort, 'client');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/delivery-challans/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const deliveryChallan = await DeliveryChallan.findOne({ _id: req.params.id, company: req.companyId }).populate('client').populate('issuedBy', 'name email');
    if (!deliveryChallan) return res.status(404).json({ success: false, message: 'Delivery Challan not found' });
    res.json({ success: true, data: deliveryChallan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/delivery-challans/:id/convert-to-invoice
router.post('/:id/convert-to-invoice', protect, validateId, async (req, res) => {
  try {
    const deliveryChallan = await DeliveryChallan.findOne({ _id: req.params.id, company: req.companyId });
    if (!deliveryChallan) return res.status(404).json({ success: false, message: 'Delivery Challan not found' });

    const company = await Company.findById(req.companyId);

const invoiceNumber = await getNextInvoiceNumber(
  req.companyId,
  company?.settings?.invoicePrefix || 'INV',
  company?.settings?.invoiceStartNumber || 1
); 
    const invoice = await Invoice.create({
      company: req.companyId,
      invoiceNumber,
      client: deliveryChallan.client, 
      clientSnapshot: deliveryChallan.clientSnapshot,
      items: deliveryChallan.items,
      subtotal: deliveryChallan.subtotal,
      taxAmount: deliveryChallan.taxAmount,
      discountAmount: deliveryChallan.discountAmount,
      shippingCost: deliveryChallan.shippingCost,
      grandTotal: deliveryChallan.grandTotal,
      currency: deliveryChallan.currency,
      status: 'draft',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: deliveryChallan.notes,
      terms: deliveryChallan.terms,
      issuedBy: req.user._id,
      createdBy: req.user._id,
    });

    deliveryChallan.status = 'delivered';
    deliveryChallan.convertedToInvoice = invoice._id;
    await deliveryChallan.save();

    res.status(201).json({ success: true, message: 'Delivery Challan converted to Invoice', data: { deliveryChallan, invoice } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
