/**
 * Universal Search API
 * GET /api/search?q=...&types=clients,invoices,...
 * Searches across all major entities in one call
 */
const express = require('express');
const router = express.Router();
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

router.use(...auth);

/**
 * GET /api/search
 * Searches across multiple resources and returns unified results
 */
router.get('/', async (req, res) => {
  try {
    const { q, types, limit = 8 } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: { results: [], total: 0 } });
    }

    const companyId = req.user.companyId;
    const searchTypes = types ? types.split(',') : ['clients', 'invoices', 'leads', 'deals', 'products', 'projects', 'tasks', 'employees', 'tickets'];
    const perType = parseInt(limit);
    const regex = new RegExp(escapeRegex(q.trim()), 'i');

    const results = [];

    // Run all searches in parallel
    const searchPromises = [];

    if (searchTypes.includes('clients')) {
      searchPromises.push(
        safeFind('Client', { company: companyId, $or: [{ name: regex }, { email: regex }, { phone: regex }, { gstin: regex }] }, perType)
          .then(items => items.map(c => ({
            type: 'client',
            id: c._id,
            title: c.name,
            subtitle: c.email || c.phone,
            badge: c.gstin,
            url: `/app-dashboard.html#clients/${c._id}`,
            icon: '👤',
          })))
      );
    }

    if (searchTypes.includes('invoices')) {
      searchPromises.push(
        safeFind('Invoice', { company: companyId, $or: [{ invoiceNumber: regex }, { clientName: regex }, { notes: regex }] }, perType)
          .then(items => items.map(i => ({
            type: 'invoice',
            id: i._id,
            title: i.invoiceNumber || `Invoice ${i._id.toString().slice(-6)}`,
            subtitle: `${i.clientName || 'Unknown'} • ₹${(i.total || 0).toLocaleString('en-IN')}`,
            badge: i.status,
            url: `/app-dashboard.html#invoices/${i._id}`,
            icon: '🧾',
          })))
      );
    }

    if (searchTypes.includes('leads')) {
      searchPromises.push(
        safeFind('Lead', { company: companyId, $or: [{ name: regex }, { email: regex }, { company: regex }] }, perType)
          .then(items => items.map(l => ({
            type: 'lead',
            id: l._id,
            title: l.name,
            subtitle: l.company || l.email,
            badge: l.status,
            url: `/app-dashboard.html#leads/${l._id}`,
            icon: '🎯',
          })))
      );
    }

    if (searchTypes.includes('deals')) {
      searchPromises.push(
        safeFind('Deal', { company: companyId, $or: [{ title: regex }, { clientName: regex }] }, perType)
          .then(items => items.map(d => ({
            type: 'deal',
            id: d._id,
            title: d.title,
            subtitle: `${d.clientName || ''} • ₹${(d.value || 0).toLocaleString('en-IN')}`,
            badge: d.stage,
            url: `/app-dashboard.html#deals/${d._id}`,
            icon: '💰',
          })))
      );
    }

    if (searchTypes.includes('products')) {
      searchPromises.push(
        safeFind('Product', { company: companyId, $or: [{ name: regex }, { sku: regex }, { description: regex }, { hsnCode: regex }] }, perType)
          .then(items => items.map(p => ({
            type: 'product',
            id: p._id,
            title: p.name,
            subtitle: `${p.sku || ''} • ₹${(p.price || 0).toLocaleString('en-IN')}`,
            badge: p.stock !== undefined ? `${p.stock} in stock` : null,
            url: `/app-dashboard.html#products/${p._id}`,
            icon: '📦',
          })))
      );
    }

    if (searchTypes.includes('projects')) {
      searchPromises.push(
        safeFind('Project', { company: companyId, $or: [{ name: regex }, { description: regex }] }, perType)
          .then(items => items.map(p => ({
            type: 'project',
            id: p._id,
            title: p.name,
            subtitle: p.clientName || p.description?.slice(0, 60),
            badge: p.status,
            url: `/app-dashboard.html#projects/${p._id}`,
            icon: '📊',
          })))
      );
    }

    if (searchTypes.includes('tasks')) {
      searchPromises.push(
        safeFind('Task', { company: companyId, $or: [{ title: regex }, { description: regex }] }, perType)
          .then(items => items.map(t => ({
            type: 'task',
            id: t._id,
            title: t.title,
            subtitle: t.assigneeName || t.description?.slice(0, 60),
            badge: t.status,
            url: `/app-dashboard.html#tasks/${t._id}`,
            icon: '✓',
          })))
      );
    }

    if (searchTypes.includes('employees')) {
      searchPromises.push(
        safeFind('Employee', { company: companyId, $or: [{ name: regex }, { email: regex }, { phone: regex }, { designation: regex }] }, perType)
          .then(items => items.map(e => ({
            type: 'employee',
            id: e._id,
            title: e.name,
            subtitle: e.designation || e.email,
            badge: e.department,
            url: `/app-dashboard.html#employees/${e._id}`,
            icon: '👨‍💼',
          })))
      );
    }

    if (searchTypes.includes('tickets')) {
      searchPromises.push(
        safeFind('Ticket', { company: companyId, $or: [{ subject: regex }, { description: regex }, { ticketNumber: regex }] }, perType)
          .then(items => items.map(t => ({
            type: 'ticket',
            id: t._id,
            title: t.subject || `Ticket ${t.ticketNumber}`,
            subtitle: t.clientName || t.description?.slice(0, 60),
            badge: t.priority,
            url: `/app-dashboard.html#tickets/${t._id}`,
            icon: '🎫',
          })))
      );
    }

    const allResults = (await Promise.all(searchPromises)).flat();

    // Add quick actions / shortcuts
    const shortcuts = getQuickActions(q);

    res.json({
      success: true,
      data: {
        results: allResults,
        shortcuts,
        total: allResults.length,
        query: q,
      },
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/search/recent
 * Returns user's recently viewed items
 */
router.get('/recent', async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const recent = await AuditLog.find({
      company: req.user.companyId,
      userId: req.user._id || req.user.id,
      action: 'view',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const seen = new Set();
    const unique = recent.filter(r => {
      const key = `${r.resource}:${r.resourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({ success: true, data: unique });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- Helpers ----

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function safeFind(modelName, filter, limit) {
  try {
    const Model = require(`../models/${modelName}`);
    return await Model.find(filter).limit(limit).lean();
  } catch (e) {
    return [];
  }
}

function getQuickActions(q) {
  const lower = q.toLowerCase().trim();
  const shortcuts = [];

  const actions = [
    { keywords: ['new invoice', 'create invoice', 'add invoice'], title: 'Create New Invoice', icon: '🧾', url: '/app-dashboard.html#invoices/new' },
    { keywords: ['new client', 'add client'], title: 'Add New Client', icon: '👤', url: '/app-dashboard.html#clients/new' },
    { keywords: ['new lead', 'add lead'], title: 'Add New Lead', icon: '🎯', url: '/app-dashboard.html#leads/new' },
    { keywords: ['new product', 'add product'], title: 'Add New Product', icon: '📦', url: '/app-dashboard.html#products/new' },
    { keywords: ['new task', 'add task'], title: 'Create New Task', icon: '✓', url: '/app-dashboard.html#tasks/new' },
    { keywords: ['settings', 'preferences'], title: 'Open Settings', icon: '⚙️', url: '/app-dashboard.html#settings' },
    { keywords: ['logout', 'sign out'], title: 'Logout', icon: '🚪', url: '#logout' },
    { keywords: ['help', 'support'], title: 'Get Help', icon: '❓', url: '/app-dashboard.html#tickets/new' },
    { keywords: ['pos', 'sale', 'point of sale'], title: 'Open POS Terminal', icon: '🛒', url: '/pos-terminal.html' },
    { keywords: ['dashboard', 'home'], title: 'Go to Dashboard', icon: '🏠', url: '/app-dashboard.html#dashboard' },
  ];

  for (const a of actions) {
    if (a.keywords.some(k => k.includes(lower) || lower.includes(k))) {
      shortcuts.push({ type: 'shortcut', ...a });
    }
  }
  return shortcuts.slice(0, 3);
}

module.exports = router;
