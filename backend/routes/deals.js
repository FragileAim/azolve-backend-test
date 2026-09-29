const router = require('express').Router();
const Deal = require('../models/Deal');
const { protect } = require('../middleware/auth');
const { validateDeal, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');

// GET /api/deals
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'competitor']);
    if (req.query.stage) query.stage = req.query.stage;
    const sort = buildSort(req);
    const result = await paginate(Deal, query, req.query.page, req.query.limit, sort, 'assignedTo client lead');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deals/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const stages = await Deal.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$stage', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
    ]);
    const [totalDeals, wonValue] = await Promise.all([
      Deal.countDocuments({ company: c }),
      Deal.aggregate([{ $match: { company: c, stage: 'won' } }, { $group: { _id: null, total: { $sum: '$value' } } }]),
    ]);
    res.json({ success: true, data: { totalDeals, stages, wonValue: wonValue[0]?.total || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deals/pipeline
router.get('/pipeline', protect, async (req, res) => {
  try {
    const deals = await Deal.find({ company: req.companyId, stage: { $nin: ['won', 'lost'] } })
      .populate('assignedTo', 'name avatar').populate('client', 'name').sort('-value').lean();
    const pipeline = {};
    ['new', 'discovery', 'proposal', 'negotiation'].forEach(stage => {
      pipeline[stage] = deals.filter(d => d.stage === stage);
    });
    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/deals/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, company: req.companyId })
      .populate('assignedTo', 'name email').populate('client').populate('lead').populate('createdBy', 'name');
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deals
router.post('/', protect, validateDeal, async (req, res) => {
  try {
    const deal = await Deal.create({ ...req.body, company: req.companyId, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Deal created', data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/deals/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = sanitize(req.body);
    delete updates.company; delete updates.createdBy;
    const oldDeal = await Deal.findOne({ _id: req.params.id, company: req.companyId });
    if (!oldDeal) return res.status(404).json({ success: false, message: 'Deal not found' });

    // Track stage change
    if (updates.stage && updates.stage !== oldDeal.stage) {
      if (!updates.activities) updates.activities = [...(oldDeal.activities || [])];
      updates.activities.push({
        type: 'stage_change', description: `Stage changed from ${oldDeal.stage} to ${updates.stage}`,
        date: new Date(), createdBy: req.user._id,
      });
      if (updates.stage === 'won') updates.wonDate = new Date();
    }

    const deal = await Deal.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Deal updated', data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/deals/:id/activity
router.post('/:id/activity', protect, validateId, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, company: req.companyId });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    deal.activities.push({ ...req.body, createdBy: req.user._id, date: new Date() });
    await deal.save();
    res.json({ success: true, message: 'Activity added', data: deal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/deals/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const deal = await Deal.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!deal) return res.status(404).json({ success: false, message: 'Deal not found' });
    res.json({ success: true, message: 'Deal deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;