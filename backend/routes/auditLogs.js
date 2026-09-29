/**
 * Audit Log API Routes
 * GET /api/audit-logs — list with filters
 * GET /api/audit-logs/:id — get specific log
 * GET /api/audit-logs/stats — aggregated stats
 * GET /api/audit-logs/export — export as CSV
 */
const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');
// Normalize req.user to v2 shape: req.user.id + req.user.companyId
const normalizeUser = (req, res, next) => {
  if (req.user) {
    req.user.id = req.user.id || (req.user._id && req.user._id.toString());
    req.user.companyId = req.user.companyId || req.companyId ||
      (req.user.company && (req.user.company._id || req.user.company));
  }
  next();
};
const auth = [protect, normalizeUser];

// Middleware: all audit log routes require auth
router.use(...auth);

/**
 * GET /api/audit-logs
 * Query params: action, resource, userId, severity, from, to, search, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      action, resource, userId, severity,
      from, to, search,
      page = 1, limit = 50,
    } = req.query;

    const filter = { companyId };

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (userId) filter.userId = userId;
    if (severity) filter.severity = severity;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { resourceName: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Audit log list error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/audit-logs/stats
 * Returns aggregated stats for the dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [byAction, byResource, byUser, bySeverity, timeline] = await Promise.all([
      AuditLog.aggregate([
        { $match: { company: companyId, createdAt: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { company: companyId, createdAt: { $gte: since } } },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { company: companyId, createdAt: { $gte: since }, userId: { $ne: null } } },
        { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.aggregate([
        { $match: { company: companyId, createdAt: { $gte: since } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      AuditLog.aggregate([
        { $match: { company: companyId, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: { byAction, byResource, byUser, bySeverity, timeline },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/audit-logs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const log = await AuditLog.findOne({
      _id: req.params.id,
      company: req.user.companyId,
    }).lean();

    if (!log) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/audit-logs/export/csv
 */
router.get('/export/csv', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { from, to } = req.query;

    const filter = { companyId };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(10000).lean();

    const headers = ['Date', 'User', 'Action', 'Resource', 'Description', 'IP', 'Severity', 'Success'];
    const rows = logs.map(l => [
      l.createdAt.toISOString(),
      l.userName || '',
      l.action,
      l.resource,
      (l.description || '').replace(/"/g, '""'),
      l.ipAddress || '',
      l.severity,
      l.success,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
