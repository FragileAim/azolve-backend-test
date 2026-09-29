const router = require('express').Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { protect, authorize } = require('../middleware/auth');
const { validateId } = require('../middleware/validate');
const { paginate, sanitize } = require('../utils/helpers');

// GET /api/attendance
router.get('/', protect, async (req, res) => {
  try {
    const query = { company: req.companyId };
    if (req.query.employee) query.employee = req.query.employee;
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) {
      const d = new Date(req.query.date);
      query.date = { $gte: new Date(d.setHours(0, 0, 0, 0)), $lte: new Date(d.setHours(23, 59, 59, 999)) };
    }
    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    const sort = req.query.sort || '-date';
    const result = await paginate(Attendance, query, req.query.page, req.query.limit, sort, 'employee user approvedBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/today
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await Attendance.find({
      company: req.companyId,
      date: { $gte: today, $lt: tomorrow },
    }).populate('employee', 'name employeeId department designation').populate('user', 'name avatar');

    const totalEmployees = await Employee.countDocuments({ company: req.companyId, status: 'active' });
    const present = records.filter(r => ['present', 'late', 'work_from_home'].includes(r.status)).length;
    const absent = totalEmployees - present;
    const late = records.filter(r => r.status === 'late').length;
    const wfh = records.filter(r => r.status === 'work_from_home').length;

    res.json({
      success: true,
      data: { totalEmployees, present, absent, late, wfh, records },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/my
router.get('/my', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const query = { company: req.companyId, employee: employee._id };
    if (req.query.startDate && req.query.endDate) {
      query.date = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    } else {
      // Default: current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query).sort('-date');
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/attendance/clock-in
router.post('/clock-in', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already clocked in today
    let attendance = await Attendance.findOne({
      company: req.companyId,
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow },
    });

    if (attendance && attendance.clockIn && !attendance.clockOut) {
      return res.status(400).json({ success: false, message: 'Already clocked in' });
    }

    if (!attendance) {
      attendance = new Attendance({
        company: req.companyId,
        employee: employee._id,
        user: req.user._id,
        date: today,
        clockIn: new Date(),
        status: 'present',
        ipAddress: req.ip,
        device: req.headers['user-agent'],
      });
    } else {
      // Re-clock-in after clock-out (second shift)
      attendance.clockIn = new Date();
      attendance.clockOut = undefined;
    }

    // Check late (assuming 9:30 AM threshold)
    const clockInTime = new Date();
    if (clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 30)) {
      attendance.status = 'late';
    }

    if (req.body.location) {
      attendance.location = req.body.location;
    }
    if (req.body.status === 'work_from_home') {
      attendance.status = 'work_from_home';
    }

    await attendance.save();
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      company: req.companyId,
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow },
      clockIn: { $exists: true },
      clockOut: { $exists: false },
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No active clock-in found' });
    }

    attendance.clockOut = new Date();

    // Calculate work hours
    const diffMs = attendance.clockOut - attendance.clockIn;
    const totalMinutes = Math.floor(diffMs / 60000);
    attendance.totalWorkMinutes = totalMinutes - attendance.totalBreakMinutes;
    attendance.totalHours = parseFloat((attendance.totalWorkMinutes / 60).toFixed(2));

    // Calculate overtime (assuming 8 hours standard)
    if (attendance.totalWorkMinutes > 480) {
      attendance.overtime = attendance.totalWorkMinutes - 480;
    }

    // Check half day (less than 4 hours)
    if (attendance.totalHours < 4 && attendance.status !== 'work_from_home') {
      attendance.status = 'half_day';
    }

    if (req.body.notes) attendance.notes = req.body.notes;

    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/attendance/break-start
router.post('/break-start', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      company: req.companyId,
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow },
      clockIn: { $exists: true },
      clockOut: { $exists: false },
    });

    if (!attendance) return res.status(400).json({ success: false, message: 'No active clock-in found' });

    attendance.breaks.push({ start: new Date() });
    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/attendance/break-end
router.post('/break-end', protect, async (req, res) => {
  try {
    const employee = await Employee.findOne({ company: req.companyId, user: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee record not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      company: req.companyId,
      employee: employee._id,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!attendance) return res.status(400).json({ success: false, message: 'No attendance found' });

    const lastBreak = attendance.breaks[attendance.breaks.length - 1];
    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({ success: false, message: 'No active break found' });
    }

    lastBreak.end = new Date();
    lastBreak.duration = Math.floor((lastBreak.end - lastBreak.start) / 60000);
    attendance.totalBreakMinutes = attendance.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);

    await attendance.save();
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/attendance/stats
router.get('/stats', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const c = req.companyId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthly = await Attendance.aggregate([
      { $match: { company: c, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const avgHours = await Attendance.aggregate([
      { $match: { company: c, date: { $gte: monthStart, $lte: monthEnd }, totalHours: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$totalHours' } } },
    ]);

    const totalOvertime = await Attendance.aggregate([
      { $match: { company: c, date: { $gte: monthStart, $lte: monthEnd }, overtime: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$overtime' } } },
    ]);

    res.json({
      success: true,
      data: {
        monthly,
        averageHours: avgHours[0]?.avg || 0,
        totalOvertimeMinutes: totalOvertime[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/attendance/:id (admin/hr manual update)
router.put('/:id', protect, authorize('admin', 'hr'), validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.approvedBy = req.user._id;
    const attendance = await Attendance.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    ).populate('employee user');
    if (!attendance) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;