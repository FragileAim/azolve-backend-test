const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');
const { validateProject, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');

// GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'description', 'location']);
    const sort = buildSort(req);
    const result = await paginate(Project, query, req.query.page, req.query.limit, sort, 'manager client team');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const statuses = await Project.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = await Project.countDocuments({ company: c });
    res.json({ success: true, data: { total, statuses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.companyId })
      .populate('manager', 'name email avatar').populate('client', 'name').populate('team', 'name email avatar').populate('createdBy', 'name');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const tasks = await Task.find({ project: project._id, company: req.companyId }).populate('assignedTo', 'name avatar').lean();
    res.json({ success: true, data: { ...project.toObject(), tasks } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects
router.post('/', protect, validateProject, async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, company: req.companyId, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Project created', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = sanitize(req.body);
    delete updates.company; delete updates.createdBy;
    const project = await Project.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project updated', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects/:id/attachments
router.post('/:id/attachments', protect, uploadMultiple('files', 5), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, company: req.companyId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const newAttachments = req.files.map(f => ({ name: f.originalname, url: getFileUrl(req, f), size: f.size }));
    project.attachments.push(...newAttachments);
    await project.save();
    res.json({ success: true, message: 'Files uploaded', data: project.attachments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id/team
router.put('/:id/team', protect, async (req, res) => {
  try {
    const { team } = req.body;
    const project = await Project.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, { team }, { new: true }).populate('team', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Team updated', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    await Task.deleteMany({ project: project._id });
    res.json({ success: true, message: 'Project and associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;