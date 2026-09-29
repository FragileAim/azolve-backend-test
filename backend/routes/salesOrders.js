const router = require('express').Router();
const SalesOrder = require('../models/SalesOrder');
const DeliveryChallan = require('../models/DeliveryChallan');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Company = require('../models/Company');
const { protect, requirePermission } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, generateInvoiceNumber } = require('../utils/helpers');

// GET /api/sales-orders
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['orderNumber', 'clientSnapshot.name']);
    if (req.query.status) query.status = req.query.status;
    if (req.query.client) query.client = req.query.client;
    const sort = buildSort(req, '-issueDate');
    const result = await paginate(SalesOrder, query, req.query.page, req.query.limit, sort, 'client');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sales-orders/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findOne({ _id: req.params.id, company: req.companyId }).populate('client').populate('issuedBy', 'name email');
    if (!salesOrder) return res.status(404).json({ success: false, message: 'Sales Order not found' });
    res.json({ success: true, data: salesOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/sales-orders/:id/convert-to-delivery-challan
router.post('/:id/convert-to-delivery-challan', protect, validateId, async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findOne({ _id: req.params.id, company: req.companyId });
    if (!salesOrder) return res.status(404).json({ success: false, message: 'Sales Order not found' });

    const company = await Company.findById(req.companyId);
    const count = await DeliveryChallan.countDocuments({ company: req.companyId });
    const challanNumber = generateInvoiceNumber(company?.settings?.challanPrefix || 'DC', company?.settings?.challanStartNumber || 1, count);

    const deliveryChallan = await DeliveryChallan.create({
      company: req.companyId,
      challanNumber,
      client: salesOrder.client,
      clientSnapshot: salesOrder.clientSnapshot,
      items: salesOrder.items,
      subtotal: salesOrder.subtotal,
      taxAmount: salesOrder.taxAmount,
      discountAmount: salesOrder.discountAmount,
      shippingCost: salesOrder.shippingCost,
      grandTotal: salesOrder.grandTotal,
      currency: salesOrder.currency,
      status: 'draft',
      issueDate: new Date(),
      convertedFromSalesOrder: salesOrder._id,
      notes: salesOrder.notes,
      terms: salesOrder.terms,
      issuedBy: req.user._id,
      createdBy: req.user._id,
    });

    salesOrder.status = 'processing';
    salesOrder.convertedToDeliveryChallan = deliveryChallan._id;
    await salesOrder.save();

    res.status(201).json({ success: true, message: 'Sales Order converted to Delivery Challan', data: { salesOrder, deliveryChallan } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
