const router = require('express').Router();
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const { protect } = require('../middleware/auth');
const { validateLead, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const notificationService = require('../services/notificationService');

// GET /api/leads
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'companyName', 'email', 'phone']);
    const sort = buildSort(req);
    const result = await paginate(Lead, query, req.query.page, req.query.limit, sort, 'assignedTo createdBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leads/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const [total, newLeads, qualified, won, lost, pipeline] = await Promise.all([
      Lead.countDocuments({ company: c }),
      Lead.countDocuments({ company: c, status: 'new' }),
      Lead.countDocuments({ company: c, status: 'qualified' }),
      Lead.countDocuments({ company: c, status: 'closed_won' }),
      Lead.countDocuments({ company: c, status: 'closed_lost' }),
      Lead.aggregate([{ $match: { company: c, status: { $nin: ['closed_won', 'closed_lost'] } } }, { $group: { _id: null, total: { $sum: '$value' } } }]),
    ]);
    res.json({ success: true, data: { total, newLeads, qualified, won, lost, pipelineValue: pipeline[0]?.total || 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leads/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, company: req.companyId }).populate('assignedTo', 'name email').populate('createdBy', 'name');
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads
router.post('/', protect, validateLead, async (req, res) => {
  try {
    const lead = await Lead.create({ ...req.body, company: req.companyId, createdBy: req.user._id });

    if (lead.assignedTo) {
      await notificationService.newLead(req.companyId, lead.assignedTo, lead);
    } else {
      await notificationService.create({
        companyId: req.companyId,
        type: 'lead',
        icon: '🎯',
        priority: 'normal',
        title: 'Lead created',
        message: `${lead.name} was added`,
        resource: 'lead',
        resourceId: lead._id,
        url: `/leads/${lead._id}`,
      });
    }

    res.status(201).json({ success: true, message: 'Lead created', data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/leads/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = sanitize(req.body);
    delete updates.company; delete updates.createdBy;

    const existingLead = await Lead.findOne({ _id: req.params.id, company: req.companyId });
    if (!existingLead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const assignedToChanged = updates.assignedTo && existingLead.assignedTo?.toString() !== updates.assignedTo.toString();

    const lead = await Lead.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (assignedToChanged && lead.assignedTo) {
      await notificationService.newLead(req.companyId, lead.assignedTo, lead);
    }

    res.json({ success: true, message: 'Lead updated', data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads/:id/activity
router.post('/:id/activity', protect, validateId, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, company: req.companyId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    lead.activities.push({ ...req.body, createdBy: req.user._id, date: new Date() });
    await lead.save();
    res.json({ success: true, message: 'Activity added', data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads/:id/convert
router.post('/:id/convert', protect, validateId, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, company: req.companyId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.convertedToDeal) return res.status(400).json({ success: false, message: 'Lead already converted' });

    const deal = await Deal.create({
      company: req.companyId, name: req.body.dealName || `Deal - ${lead.companyName || lead.name}`,
      lead: lead._id, value: lead.value, stage: 'new', probability: lead.probability,
      expectedCloseDate: lead.expectedCloseDate, assignedTo: lead.assignedTo, createdBy: req.user._id,
    });

    lead.convertedToDeal = true;
    lead.dealId = deal._id;
    lead.status = 'closed_won';
    await lead.save();

    await notificationService.create({
      companyId: req.companyId,
      userId: lead.assignedTo || req.user._id,
      type: 'lead',
      icon: '🤝',
      priority: 'normal',
      title: 'Lead converted',
      message: `${lead.name} converted into deal ${deal.name}`,
      resource: 'deal',
      resourceId: deal._id,
      url: `/deals/${deal._id}`,
    });

    res.json({ success: true, message: 'Lead converted to deal', data: { lead, deal } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;