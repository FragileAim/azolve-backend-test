const router = require('express').Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, getFileUrl } = require('../middleware/upload');
const { paginate, buildSearchQuery, buildSort } = require('../utils/helpers');

// GET /api/users - Get all users in company
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'email', 'department', 'designation']);
    if (req.query.role) query.role = req.query.role;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    const sort = buildSort(req);
    const result = await paginate(User, query, req.query.page, req.query.limit, sort, 'company');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, company: req.companyId }).populate('company', 'name domain');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users - Create user (admin only)
router.post('/', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, designation, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({
      name, email, password: password || 'Azolve@123', role: role || 'employee',
      department, designation, phone, company: req.companyId, isActive: true, isVerified: true,
    });

    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const isSelf = req.user._id.toString() === req.params.id;
    if (!isAdmin && !isSelf) return res.status(403).json({ success: false, message: 'Not authorized' });

    const updates = { ...req.body };
    delete updates.password; delete updates.email; delete updates.company;
    if (!isAdmin) { delete updates.role; delete updates.permissions; delete updates.isActive; }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id/avatar
router.put('/:id/avatar', protect, uploadSingle('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = getFileUrl(req, req.file);
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId }, { avatar: avatarUrl }, { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Avatar updated', data: { avatar: avatarUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId }, { isActive: false }, { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;