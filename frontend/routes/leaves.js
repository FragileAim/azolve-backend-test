const router = require('express').Router();
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');
const { validateLeave, validateId } = require('../middleware/validate');
const { paginate, sanitize } = require('../utils/helpers');

// GET /api/leaves
router.get('/', protect, async (req, res) => {
  try {
    const query = { company: req.companyId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.employee) query.employee = req.query.employee;
    if (req.query.startDate && req.query.endDate) {
      query.startDate = { $gte: new Date(req.query.startDate) };
      query.endDate = { $lte: new Date(req.query.endDate) };
    }
    const sort = req.query.sort || '-createdAt';
    const result = await paginate(Leave, query, req.query.page, req.query.limit, sort, 'employee user approvedBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leaves/stats
router.get('/stats', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const c = req.companyId;
    const total = await Leave.countDocuments({ company: c });
    const pending = await Leave.countDocuments({ company: c, status: 'pending' });
    const approved = await Leave.countDocuments({ company: c, status: 'approved' });
    const rejected = await Leave.countDocuments({ company: c, status: 'rejected' });

    const byType = await Leave.aggregate([
      { $match: { company: c, status: 'approved' } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
    ]);

    // Current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const thisMonth = await Leave.countDocuments({
      company: c,
      status: 'approved',
      startDate: { $gte: monthStart, $lte: monthEnd },
    });

    res.json({ success: true, data: { total, pending, approved, rejected, thisMonth, byType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leaves/my
router.get('/my', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const query = { company: req.companyId, employee: employee._id };
    if (req.query.status) query.status = req.query.status;
    if (req.query.year) {
      const year = parseInt(req.query.year);
      query.startDate = { $gte: new Date(year, 0, 1) };
      query.endDate = { $lte: new Date(year, 11, 31, 23, 59, 59, 999) };
    }

    const leaves = await Leave.find(query).sort('-createdAt').populate('approvedBy', 'name');

    // Leave balance
    const balance = employee.leaveBalance || { sick: 12, casual: 12, earned: 15 };
    const used = await Leave.aggregate([
      { $match: { employee: employee._id, status: 'approved' } },
      { $group: { _id: '$type', totalDays: { $sum: '$totalDays' } } },
    ]);

    const usedMap = {};
    used.forEach(u => { usedMap[u._id] = u.totalDays; });

    res.json({
      success: true,
      data: {
        leaves,
        balance: {
          sick: { total: balance.sick || 12, used: usedMap.sick || 0, remaining: (balance.sick || 12) - (usedMap.sick || 0) },
          casual: { total: balance.casual || 12, used: usedMap.casual || 0, remaining: (balance.casual || 12) - (usedMap.casual || 0) },
          earned: { total: balance.earned || 15, used: usedMap.earned || 0, remaining: (balance.earned || 15) - (usedMap.earned || 0) },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leaves/pending
router.get('/pending', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const leaves = await Leave.find({ company: req.companyId, status: 'pending' })
      .sort('-createdAt')
      .populate('employee', 'name employeeId department designation')
      .populate('user', 'name email avatar');
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leaves/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId })
      .populate('employee', 'name employeeId department designation')
      .populate('user', 'name email avatar')
      .populate('approvedBy', 'name email')
      .populate('createdBy', 'name');
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leaves
router.post('/', protect, validateLeave, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.user = req.user._id;
    data.createdBy = req.user._id;

    // Find employee record
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });
    data.employee = employee._id;

    // Calculate total days
    if (data.isHalfDay) {
      data.totalDays = 0.5;
    } else {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffTime = Math.abs(end - start);
      data.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Check for overlapping leaves
    const overlap = await Leave.findOne({
      company: req.companyId,
      employee: employee._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(data.endDate) }, endDate: { $gte: new Date(data.startDate) } },
      ],
    });

    if (overlap) {
      return res.status(400).json({ success: false, message: 'Leave request overlaps with an existing leave' });
    }

    const leave = await Leave.create(data);
    const populated = await leave.populate('employee user');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/leaves/:id/approve
router.put('/:id/approve', protect, authorize('admin', 'hr', 'manager'), validateId, async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot approve a ${leave.status} leave request` });
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedDate = new Date();
    await leave.save();

    const populated = await leave.populate('employee user approvedBy');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/leaves/:id/reject
router.put('/:id/reject', protect, authorize('admin', 'hr', 'manager'), validateId, async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject a ${leave.status} leave request` });
    }

    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvedDate = new Date();
    leave.rejectionReason = req.body.reason || '';
    await leave.save();

    const populated = await leave.populate('employee user approvedBy');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/leaves/:id/cancel
router.put('/:id/cancel', protect, validateId, async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, company: req.companyId, user: req.user._id });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Already cancelled' });
    }

    leave.status = 'cancelled';
    await leave.save();
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/leaves/:id
router.delete('/:id', protect, authorize('admin', 'hr'), validateId, async (req, res) => {
  try {
    const leave = await Leave.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    res.json({ success: true, message: 'Leave request deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;