/**
 * Activities — HubSpot-style engagement log + unified client timeline.
 *
 * POST   /api/activities              log a note/call/email/meeting against a client
 * GET    /api/activities?client=:id   list logged activities for a client
 * DELETE /api/activities/:id
 * GET    /api/activities/timeline/:clientId
 *          -> merges manually-logged activities with real CRM events
 *             (deals, invoices, quotations, tasks) for that client into
 *             one chronological feed — the "single record, full history"
 *             view HubSpot is built around.
 */
const router = require('express').Router();
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// ---- POST /api/activities — log a note/call/email/meeting ----
router.post('/', protect, async (req, res) => {
  try {
    const { client, deal, lead, type, subject, body, outcome, durationMinutes, direction, meetingAt } = req.body;
    if (!client || !type) return res.status(400).json({ success: false, message: 'client and type are required' });
    if (!['note', 'call', 'email', 'meeting', 'task'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid activity type' });
    }
    const clientDoc = await Client.findOne({ _id: client, company: req.companyId });
    if (!clientDoc) return res.status(404).json({ success: false, message: 'Client not found' });

    const activity = await Activity.create({
      company: req.companyId,
      client, deal: deal || undefined, lead: lead || undefined,
      type, subject, body,
      outcome: outcome || '', durationMinutes, direction: direction || '',
      meetingAt: meetingAt || undefined,
      createdBy: req.user._id,
    });
    const populated = await Activity.findById(activity._id).populate('createdBy', 'name email avatar').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---- GET /api/activities — list activities for a client ----
router.get('/', protect, async (req, res) => {
  try {
    const q = { company: req.companyId };
    if (req.query.client) q.client = req.query.client;
    if (req.query.type) q.type = req.query.type;
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const items = await Activity.find(q).sort('-createdAt').limit(limit).populate('createdBy', 'name email avatar').lean();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---- DELETE /api/activities/:id ----
router.delete('/:id', protect, async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---- GET /api/activities/timeline/:clientId — unified HubSpot-style record ----
router.get('/timeline/:clientId', protect, async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const companyId = req.companyId;
    const client = await Client.findOne({ _id: clientId, company: companyId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const Deal = require('../models/Deal');
    const Invoice = require('../models/Invoice');
    const Quotation = require('../models/Quotation');
    const Project = require('../models/Project');
    const Task = require('../models/Task');

    const [activities, deals, invoices, quotations, projects] = await Promise.all([
      Activity.find({ company: companyId, client: clientId }).populate('createdBy', 'name email avatar').lean(),
      Deal.find({ company: companyId, client: clientId }).lean(),
      Invoice.find({ company: companyId, client: clientId }).lean(),
      Quotation.find({ company: companyId, client: clientId }).lean(),
      Project.find({ company: companyId, client: clientId }).select('_id name').lean(),
    ]);

    const projectIds = projects.map(p => p._id);
    const tasks = projectIds.length
      ? await Task.find({ company: companyId, project: { $in: projectIds } }).populate('assignedTo', 'name').lean()
      : [];

    const feed = [];

    for (const a of activities) {
      feed.push({
        kind: 'activity', type: a.type,
        icon: { note: '📝', call: '📞', email: '✉️', meeting: '🗓️', task: '✅' }[a.type] || '📌',
        title: a.subject || (a.type.charAt(0).toUpperCase() + a.type.slice(1)),
        detail: a.body || '',
        meta: a.type === 'call' ? [a.outcome, a.durationMinutes ? `${a.durationMinutes} min` : null].filter(Boolean).join(' · ') : '',
        by: a.createdBy?.name || 'Someone',
        timestamp: a.createdAt,
        refId: a._id,
      });
    }
    for (const d of deals) {
      feed.push({
        kind: 'deal', type: 'deal',
        icon: '🤝',
        title: `Deal "${d.name}" — ${d.stage.replace('_', ' ')}`,
        detail: `Value: ₹${(d.value || 0).toLocaleString('en-IN')}`,
        meta: `${d.probability || 0}% probability`,
        by: '', timestamp: d.updatedAt || d.createdAt, refId: d._id,
      });
    }
    for (const i of invoices) {
      feed.push({
        kind: 'invoice', type: 'invoice',
        icon: '🧾',
        title: `Invoice ${i.invoiceNumber} — ${i.status}`,
        detail: `Amount: ₹${(i.grandTotal || 0).toLocaleString('en-IN')}`,
        meta: i.dueDate ? `Due ${new Date(i.dueDate).toLocaleDateString('en-IN')}` : '',
        by: '', timestamp: i.createdAt, refId: i._id,
      });
    }
    for (const q of quotations) {
      feed.push({
        kind: 'quotation', type: 'quotation',
        icon: '📄',
        title: `Quotation ${q.quotationNumber} — ${q.status}`,
        detail: `Amount: ₹${(q.grandTotal || 0).toLocaleString('en-IN')}`,
        meta: '', by: '', timestamp: q.createdAt, refId: q._id,
      });
    }
    for (const t of tasks) {
      feed.push({
        kind: 'task', type: 'task',
        icon: t.status === 'completed' ? '✅' : '📋',
        title: `Task: ${t.title}`,
        detail: `Status: ${t.status.replace('_', ' ')}`,
        meta: t.assignedTo?.name ? `Assigned to ${t.assignedTo.name}` : '',
        by: '', timestamp: t.updatedAt || t.createdAt, refId: t._id,
      });
    }

    feed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const stats = {
      totalDealValue: deals.reduce((s, d) => s + (d.value || 0), 0),
      openDeals: deals.filter(d => !['won', 'lost'].includes(d.stage)).length,
      wonDeals: deals.filter(d => d.stage === 'won').length,
      totalInvoiced: invoices.reduce((s, i) => s + (i.grandTotal || 0), 0),
      unpaidInvoiced: invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).reduce((s, i) => s + (i.grandTotal || 0), 0),
      openTasks: tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length,
    };

    res.json({ success: true, data: { client, feed: feed.slice(0, 150), stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
