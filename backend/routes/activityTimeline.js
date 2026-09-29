/**
 * Activity Timeline — uses AuditLog data to provide a beautiful "what happened" feed
 */
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// ---- Auth adapter: use existing JWT protect middleware ----
const { protect } = require('../middleware/auth');
const auth = [protect, (req, res, next) => {
  // Normalize to v2 shape: req.user.id + req.user.companyId
  if (req.user) {
    req.user.id = req.user.id || req.user._id;
    req.user.companyId = req.user.companyId || req.companyId || req.user.company?._id || req.user.company;
  }
  next();
}];

const ACTION_LABELS = {
  create: 'created', update: 'updated', delete: 'deleted',
  login: 'logged in', logout: 'logged out',
  invoice_sent: 'sent an invoice', invoice_paid: 'recorded a payment',
  payment_received: 'received a payment', lead_created: 'added a new lead',
  lead_converted: 'converted a lead', task_completed: 'completed a task',
  export: 'exported data', import: 'imported data',
};

const RESOURCE_ICONS = {
  invoice: '🧾', client: '👤', lead: '🎯', deal: '🤝', product: '📦',
  project: '📊', task: '📋', employee: '👨‍💼', payment: '💰', user: '🔑',
  ticket: '🎫', meeting: '🗓️', expense: '💸',
};

router.get('/', auth, async (req, res) => {
  try {
    const { resource, resourceId, userId, from, to, limit = 50, page = 1 } = req.query;
    const q = { company: req.user.companyId };
    if (resource) q.resource = resource;
    if (resourceId) q.resourceId = resourceId;
    if (userId) q.userId = userId;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const skip = (page - 1) * limit;
    const items = await AuditLog.find(q)
      .sort('-createdAt').skip(skip).limit(parseInt(limit))
      .populate('userId', 'name email avatar').lean();

    // Enrich with display data
    const timeline = items.map(item => ({
      id: item._id,
      icon: RESOURCE_ICONS[item.resource] || '📌',
      actionLabel: ACTION_LABELS[item.action] || item.action,
      user: item.userId,
      resource: item.resource,
      resourceId: item.resourceId,
      severity: item.severity,
      summary: buildSummary(item),
      changes: item.changes,
      timestamp: item.createdAt,
      ago: timeAgo(item.createdAt),
    }));

    res.json({ data: timeline, page: parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Group by date
router.get('/grouped', auth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const items = await AuditLog.find({ company: req.user.companyId })
      .sort('-createdAt').limit(parseInt(limit))
      .populate('userId', 'name email avatar').lean();

    const grouped = {};
    for (const item of items) {
      const dateKey = new Date(item.createdAt).toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        id: item._id,
        icon: RESOURCE_ICONS[item.resource] || '📌',
        actionLabel: ACTION_LABELS[item.action] || item.action,
        user: item.userId,
        resource: item.resource,
        resourceId: item.resourceId,
        summary: buildSummary(item),
        timestamp: item.createdAt,
        ago: timeAgo(item.createdAt),
      });
    }
    res.json({ data: grouped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function buildSummary(item) {
  const userName = item.userId?.name || 'Someone';
  const action = ACTION_LABELS[item.action] || item.action;
  const resource = item.resource;
  return `${userName} ${action} a ${resource}`;
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

module.exports = router;
