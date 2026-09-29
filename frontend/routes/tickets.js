const router = require('express').Router();
const Ticket = require('../models/Ticket');
const { protect, authorize } = require('../middleware/auth');
const { validateTicket, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');

// GET /api/tickets
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['subject', 'description', 'ticketNumber']);
    if (req.query.category) query.category = req.query.category;
    if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
    if (req.query.client) query.client = req.query.client;
    const sort = buildSort(req);
    const result = await paginate(Ticket, query, req.query.page, req.query.limit, sort, 'assignedTo client createdBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const total = await Ticket.countDocuments({ company: c });
    const open = await Ticket.countDocuments({ company: c, status: 'open' });
    const inProgress = await Ticket.countDocuments({ company: c, status: 'in_progress' });
    const resolved = await Ticket.countDocuments({ company: c, status: 'resolved' });
    const closed = await Ticket.countDocuments({ company: c, status: 'closed' });

    const byPriority = await Ticket.aggregate([
      { $match: { company: c, status: { $nin: ['resolved', 'closed'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const byCategory = await Ticket.aggregate([
      { $match: { company: c } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const slaBreached = await Ticket.countDocuments({ company: c, slaBreached: true, status: { $nin: ['resolved', 'closed'] } });

    const avgSatisfaction = await Ticket.aggregate([
      { $match: { company: c, satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$satisfaction' } } },
    ]);

    // Unassigned tickets
    const unassigned = await Ticket.countDocuments({ company: c, assignedTo: null, status: { $nin: ['resolved', 'closed'] } });

    res.json({
      success: true,
      data: {
        total, open, inProgress, resolved, closed, unassigned, slaBreached,
        byPriority, byCategory,
        avgSatisfaction: avgSatisfaction[0]?.avg || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/my
router.get('/my', protect, async (req, res) => {
  try {
    const query = { company: req.companyId, assignedTo: req.user._id };
    if (req.query.status) query.status = req.query.status;
    const sort = '-updatedAt';
    const result = await paginate(Ticket, query, req.query.page, req.query.limit, sort, 'client createdBy');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, company: req.companyId })
      .populate('assignedTo', 'name email avatar')
      .populate('client', 'name email company')
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('comments.user', 'name avatar');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tickets
router.post('/', protect, validateTicket, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.createdBy = req.user._id;

    // Auto-generate ticket number
    const count = await Ticket.countDocuments({ company: req.companyId });
    data.ticketNumber = `TKT-${String(count + 1).padStart(5, '0')}`;

    const ticket = await Ticket.create(data);
    const populated = await ticket.populate('assignedTo client createdBy');

    // Send notification email if contact email exists
    if (data.contactInfo?.email) {
      try {
        await sendEmail(
          data.contactInfo.email,
          `Ticket Created: ${data.ticketNumber} - ${data.subject}`,
          emailTemplates.ticketCreated({
            ticketNumber: data.ticketNumber,
            subject: data.subject,
            name: data.contactInfo.name || 'Customer',
          })
        );
      } catch (emailErr) {
        console.error('Ticket email notification failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tickets/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    ).populate('assignedTo client createdBy');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tickets/:id/status
router.put('/:id/status', protect, validateId, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const update = { status };

    if (status === 'resolved') {
      update.resolvedBy = req.user._id;
      update.resolvedDate = new Date();
      if (resolution) update.resolution = resolution;
    }

    // Track first response time
    const ticket = await Ticket.findOne({ _id: req.params.id, company: req.companyId });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (!ticket.firstResponseDate && status === 'in_progress') {
      update.firstResponseDate = new Date();
    }

    const updated = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      update,
      { new: true }
    ).populate('assignedTo client');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tickets/:id/assign
router.put('/:id/assign', protect, authorize('admin', 'manager', 'support'), validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { assignedTo: req.body.assignedTo },
      { new: true }
    ).populate('assignedTo', 'name email avatar');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tickets/:id/comments
router.post('/:id/comments', protect, validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, company: req.companyId });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.comments.push({
      user: req.user._id,
      userName: req.user.name,
      text: req.body.text,
      isInternal: req.body.isInternal || false,
    });
    await ticket.save();

    const populated = await ticket.populate('comments.user');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tickets/:id/satisfaction
router.put('/:id/satisfaction', protect, validateId, async (req, res) => {
  try {
    const { satisfaction, satisfactionComment } = req.body;
    if (!satisfaction || satisfaction < 1 || satisfaction > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    const ticket = await Ticket.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { satisfaction, satisfactionComment: satisfactionComment || '' },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', protect, authorize('admin', 'manager'), validateId, async (req, res) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;