const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

// =====================================================================
// Public share endpoints (no auth) — must come BEFORE generic auth routes
// =====================================================================

// GET /api/office/share/:token — fetch public doc
router.get('/share/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token, isPublic: true })
      .populate('createdBy', 'name email')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Shared document not found or revoked' });
    res.json({
      success: true,
      data: {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        content: doc.content,
        permission: doc.sharePermission,
        createdBy: doc.createdBy,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/office/share/:token — update via public link IF permission=edit
router.put('/share/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token, isPublic: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Shared document not found' });
    if (doc.sharePermission !== 'edit') return res.status(403).json({ success: false, message: 'Read-only share link' });
    if (req.body.title !== undefined) doc.title = req.body.title;
    if (req.body.content !== undefined) doc.content = req.body.content;
    doc.size = JSON.stringify(doc.content || {}).length;
    await doc.save();
    res.json({ success: true, data: { _id: doc._id, updatedAt: doc.updatedAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// Authenticated routes
// =====================================================================
router.use(protect);

// GET /api/office — list user's documents
router.get('/', async (req, res) => {
  try {
    const { type, q, starred, trashed = 'false', limit = 100 } = req.query;
    const filter = { company: req.companyId, trashed: trashed === 'true' };
    if (type) filter.type = type;
    if (starred === 'true') filter.starred = true;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const docs = await Document.find(filter)
      .select('-content -versions') // keep list lightweight
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .sort({ updatedAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .lean();

    res.json({ success: true, data: docs, total: docs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/office/stats — counts by type for the dashboard
router.get('/stats', async (req, res) => {
  try {
    const agg = await Document.aggregate([
      { $match: { company: req.companyId, trashed: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const stats = { document: 0, spreadsheet: 0, presentation: 0, total: 0 };
    agg.forEach(r => { stats[r._id] = r.count; stats.total += r.count; });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/office/:id — fetch single doc
router.get('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId })
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/office — create new doc
router.post('/', async (req, res) => {
  try {
    const { type, title, content } = req.body;
    if (!['document', 'spreadsheet', 'presentation'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }
    const defaultContent = type === 'spreadsheet'
      ? { sheets: [{ name: 'Sheet1', rows: 100, cols: 26, cells: {} }] }
      : type === 'presentation'
      ? { slides: [{ id: 's1', layout: 'title', elements: [
          { type:'text', x:60, y:120, w:840, h:80, text:'Click to add title', fontSize:44, bold:true, color:'#0f172a', align:'center' },
          { type:'text', x:60, y:230, w:840, h:50, text:'Click to add subtitle', fontSize:22, color:'#64748b', align:'center' },
        ], background:'#ffffff' }] }
      : { html: '<h1>Untitled Document</h1><p>Start typing here...</p>', plainText: '' };

    const doc = await Document.create({
      type,
      title: title || (type === 'spreadsheet' ? 'Untitled Spreadsheet' : type === 'presentation' ? 'Untitled Presentation' : 'Untitled Document'),
      content: content || defaultContent,
      company: req.companyId,
      createdBy: req.user._id,
      lastEditedBy: req.user._id,
      size: JSON.stringify(content || defaultContent).length,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/office/:id — update doc (auto-save)
router.put('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.body.title !== undefined) doc.title = req.body.title;
    if (req.body.content !== undefined) doc.content = req.body.content;
    if (req.body.starred !== undefined) doc.starred = !!req.body.starred;
    if (req.body.thumbnail !== undefined) doc.thumbnail = req.body.thumbnail;

    doc.lastEditedBy = req.user._id;
    doc.size = JSON.stringify(doc.content || {}).length;

    await doc.save();
    res.json({ success: true, data: { _id: doc._id, title: doc.title, updatedAt: doc.updatedAt } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/office/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const src = await Document.findOne({ _id: req.params.id, company: req.companyId }).lean();
    if (!src) return res.status(404).json({ success: false, message: 'Document not found' });
    const copy = await Document.create({
      type: src.type,
      title: 'Copy of ' + src.title,
      content: src.content,
      company: req.companyId,
      createdBy: req.user._id,
      lastEditedBy: req.user._id,
      size: src.size,
    });
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/office/:id — trash (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    doc.trashed = true;
    await doc.save();
    res.json({ success: true, message: 'Moved to trash' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/office/:id/restore — restore from trash
router.post('/:id/restore', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    doc.trashed = false;
    await doc.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/office/:id/share — generate / update share link
// body: { permission: 'view' | 'comment' | 'edit', enabled: bool }
router.post('/:id/share', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, company: req.companyId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const { permission = 'view', enabled = true } = req.body;
    if (!['view', 'comment', 'edit'].includes(permission)) {
      return res.status(400).json({ success: false, message: 'Invalid permission' });
    }

    if (enabled) {
      if (!doc.shareToken) doc.generateShareToken();
      doc.isPublic = true;
      doc.sharePermission = permission;
    } else {
      doc.revokeShare();
    }
    await doc.save();
    res.json({
      success: true,
      data: {
        shareToken: doc.shareToken,
        isPublic: doc.isPublic,
        sharePermission: doc.sharePermission,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
