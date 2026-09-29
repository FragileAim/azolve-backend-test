/**
 * Notifications Routes
 */
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const service = require('../services/notificationService');

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

router.get('/', auth, async (req, res) => {
  try {
    const { read, type, limit = 50, page = 1 } = req.query;
    const q = {
      company: req.user.companyId,
      $or: [{ userId: req.user.id }, { userId: null }],
      dismissed: false,
    };
    if (read !== undefined) q.read = read === 'true';
    if (type) q.type = type;
    const skip = (page - 1) * limit;
    const [items, total, unread] = await Promise.all([
      Notification.find(q).sort('-createdAt').skip(skip).limit(parseInt(limit)).lean(),
      Notification.countDocuments(q),
      Notification.countDocuments({ ...q, read: false }),
    ]);
    res.json({ data: items, total, unread, page: parseInt(page) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/unread-count', auth, async (req, res) => {
  const count = await Notification.countDocuments({
    company: req.user.companyId,
    $or: [{ userId: req.user.id }, { userId: null }],
    read: false, dismissed: false,
  });
  res.json({ count });
});

router.post('/:id/read', auth, async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, company: req.user.companyId },
    { read: true, readAt: new Date() });
  res.json({ success: true });
});

router.post('/read-all', auth, async (req, res) => {
  await Notification.updateMany(
    { company: req.user.companyId, $or: [{ userId: req.user.id }, { userId: null }], read: false },
    { read: true, readAt: new Date() });
  res.json({ success: true });
});

router.post('/:id/dismiss', auth, async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, company: req.user.companyId },
    { dismissed: true });
  res.json({ success: true });
});

router.delete('/:id', auth, async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, company: req.user.companyId });
  res.json({ success: true });
});

// Manual create (for testing / admin)
router.post('/', auth, async (req, res) => {
  try {
    const n = await service.create({ ...req.body, company: req.user.companyId });
    res.status(201).json({ data: n });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

module.exports = router;
