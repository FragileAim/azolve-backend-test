const router = require('express').Router();
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { validateTask, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');

// GET /api/tasks
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['title', 'description']);
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
    if (req.query.project) query.project = req.query.project;
    if (req.query.tag) query.tags = req.query.tag;
    const sort = buildSort(req);
    const result = await paginate(Task, query, req.query.page, req.query.limit, sort, 'assignedTo createdBy project');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const statuses = await Task.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const priorities = await Task.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const total = await Task.countDocuments({ company: c });
    const overdue = await Task.countDocuments({
      company: c,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: new Date() },
    });
    const myTasks = await Task.countDocuments({ company: c, assignedTo: req.user._id });
    res.json({ success: true, data: { total, overdue, myTasks, statuses, priorities } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/my
router.get('/my', protect, async (req, res) => {
  try {
    const query = { company: req.companyId, assignedTo: req.user._id };
    if (req.query.status) query.status = req.query.status;
    const sort = buildSort(req) || '-dueDate';
    const result = await paginate(Task, query, req.query.page, req.query.limit, sort, 'project');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, company: req.companyId })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .populate('comments.user', 'name avatar')
      .populate('dependencies', 'title status');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks
router.post('/', protect, validateTask, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.createdBy = req.user._id;
    const task = await Task.create(data);
    const populated = await task.populate('assignedTo project');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);
    if (data.status === 'completed' && !data.completedDate) {
      data.completedDate = new Date();
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    ).populate('assignedTo project createdBy');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', protect, validateId, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, company: req.companyId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.comments.push({
      user: req.user._id,
      userName: req.user.name,
      text: req.body.text,
    });
    await task.save();
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tasks/:id/checklist
router.put('/:id/checklist', protect, validateId, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { checklist: req.body.checklist },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/:id/attachments
router.post('/:id/attachments', protect, validateId, uploadMultiple('files', 5), async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, company: req.companyId });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const newFiles = req.files.map(f => ({
      name: f.originalname,
      url: getFileUrl(req, f),
      size: f.size,
    }));
    task.attachments.push(...newFiles);
    await task.save();
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;