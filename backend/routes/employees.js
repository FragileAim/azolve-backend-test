const router = require('express').Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validateEmployee, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

// GET /api/employees
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'email', 'department', 'designation', 'employeeId']);
    if (req.query.department) query.department = req.query.department;
    if (req.query.employmentType) query.employmentType = req.query.employmentType;
    const sort = buildSort(req);
    const result = await paginate(Employee, query, req.query.page, req.query.limit, sort, 'user reportingTo');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/employees/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const total = await Employee.countDocuments({ company: c, status: 'active' });
    const departments = await Employee.aggregate([
      { $match: { company: c, status: 'active' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const employmentTypes = await Employee.aggregate([
      { $match: { company: c, status: 'active' } },
      { $group: { _id: '$employmentType', count: { $sum: 1 } } },
    ]);
    const statuses = await Employee.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const recentJoins = await Employee.countDocuments({
      company: c,
      joiningDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    res.json({ success: true, data: { total, recentJoins, departments, employmentTypes, statuses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/employees/departments
router.get('/departments', protect, async (req, res) => {
  try {
    const departments = await Employee.distinct('department', { company: req.companyId, status: 'active' });
    res.json({ success: true, data: departments.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/employees/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId })
      .populate('user', 'name email avatar role')
      .populate('reportingTo', 'name designation');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees
router.post('/', protect, authorize('admin', 'hr', 'manager'), validateEmployee, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;

    // Auto-generate employeeId if not provided
    if (!data.employeeId) {
      const count = await Employee.countDocuments({ company: req.companyId });
      data.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate gross and net salary
    if (data.salary) {
      const s = data.salary;
      s.gross = (s.basic || 0) + (s.hra || 0) + (s.allowances || 0);
      s.net = s.gross - (s.deductions || 0);
    }

    const employee = await Employee.create(data);
    const populated = await employee.populate('user reportingTo');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/employees/:id
router.put('/:id', protect, authorize('admin', 'hr', 'manager'), validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);

    // Recalculate salary if updated
    if (data.salary) {
      const s = data.salary;
      s.gross = (s.basic || 0) + (s.hra || 0) + (s.allowances || 0);
      s.net = s.gross - (s.deductions || 0);
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    ).populate('user reportingTo');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', protect, authorize('admin', 'hr'), validateId, async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, message: 'Employee deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees/:id/documents
router.post('/:id/documents', protect, authorize('admin', 'hr'), validateId, uploadSingle('document'), async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, company: req.companyId });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    if (!employee.documents) employee.documents = [];
    employee.documents.push({
      name: req.body.name || req.file.originalname,
      url: getFileUrl(req, req.file),
      type: req.body.type || 'other',
    });
    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;