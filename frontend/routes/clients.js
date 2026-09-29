const router = require('express').Router();
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');
const { validateClient, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');

// GET /api/clients
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'contactPerson', 'email', 'phone', 'industry']);
    const sort = buildSort(req);
    const result = await paginate(Client, query, req.query.page, req.query.limit, sort, 'assignedTo createdBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/clients/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, company: req.companyId }).populate('assignedTo', 'name email').populate('createdBy', 'name');
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/clients
router.post('/', protect, validateClient, async (req, res) => {
  try {
    const client = await Client.create({ ...req.body, company: req.companyId, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Client created', data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = sanitize(req.body);
    delete updates.company; delete updates.createdBy;
    const client = await Client.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client updated', data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;