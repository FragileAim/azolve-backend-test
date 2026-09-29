const router = require('express').Router();
const Event = require('../models/Event');
const { protect } = require('../middleware/auth');
const { validateEvent, validateId } = require('../middleware/validate');
const { paginate, sanitize } = require('../utils/helpers');

// GET /api/calendar - Get events for date range
router.get('/', protect, async (req, res) => {
  try {
    const query = { company: req.companyId };

    // Date range filter (required for calendar view)
    if (req.query.start && req.query.end) {
      query.$or = [
        { startDate: { $gte: new Date(req.query.start), $lte: new Date(req.query.end) } },
        { endDate: { $gte: new Date(req.query.start), $lte: new Date(req.query.end) } },
        { startDate: { $lte: new Date(req.query.start) }, endDate: { $gte: new Date(req.query.end) } },
      ];
    }

    // Filter by type
    if (req.query.type) query.type = req.query.type;

    // Show user's events (created or attendee) + public events
    if (req.query.mine === 'true') {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { createdBy: req.user._id },
          { 'attendees.user': req.user._id },
          { isPrivate: false },
        ],
      });
    }

    const events = await Event.find(query)
      .sort('startDate')
      .populate('createdBy', 'name email avatar')
      .populate('attendees.user', 'name email avatar');

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/upcoming
router.get('/upcoming', protect, async (req, res) => {
  try {
    const now = new Date();
    const limit = parseInt(req.query.limit) || 10;

    const events = await Event.find({
      company: req.companyId,
      startDate: { $gte: now },
      $or: [
        { createdBy: req.user._id },
        { 'attendees.user': req.user._id },
        { isPrivate: false },
      ],
    })
      .sort('startDate')
      .limit(limit)
      .populate('createdBy', 'name avatar')
      .populate('attendees.user', 'name avatar');

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/today
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await Event.find({
      company: req.companyId,
      $or: [
        { startDate: { $gte: today, $lt: tomorrow } },
        { startDate: { $lte: today }, endDate: { $gte: today } },
      ],
    })
      .sort('startDate')
      .populate('createdBy', 'name avatar')
      .populate('attendees.user', 'name avatar');

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonth = await Event.countDocuments({
      company: c,
      startDate: { $gte: monthStart, $lte: monthEnd },
    });

    const upcoming = await Event.countDocuments({
      company: c,
      startDate: { $gte: now },
    });

    const byType = await Event.aggregate([
      { $match: { company: c, startDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const today = await Event.countDocuments({
      company: c,
      $or: [
        { startDate: { $gte: todayStart, $lte: todayEnd } },
        { startDate: { $lte: todayStart }, endDate: { $gte: todayStart } },
      ],
    });

    res.json({ success: true, data: { thisMonth, upcoming, today, byType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/calendar/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, company: req.companyId })
      .populate('createdBy', 'name email avatar')
      .populate('attendees.user', 'name email avatar');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/calendar
router.post('/', protect, validateEvent, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.createdBy = req.user._id;

    // Add creator as attendee if not already included
    if (!data.attendees) data.attendees = [];
    const creatorPresent = data.attendees.find(
      a => (a.user || a).toString() === req.user._id.toString()
    );
    if (!creatorPresent) {
      data.attendees.unshift({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        status: 'accepted',
      });
    }

    const event = await Event.create(data);
    const populated = await event.populate('createdBy attendees.user');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/calendar/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      data,
      { new: true, runValidators: true }
    ).populate('createdBy attendees.user');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/calendar/:id/rsvp - Respond to event invite
router.put('/:id/rsvp', protect, validateId, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid RSVP status' });
    }

    const event = await Event.findOne({ _id: req.params.id, company: req.companyId });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const attendee = event.attendees.find(
      a => a.user && a.user.toString() === req.user._id.toString()
    );

    if (attendee) {
      attendee.status = status;
    } else {
      event.attendees.push({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        status,
      });
    }

    await event.save();
    const populated = await event.populate('attendees.user');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/calendar/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/calendar/:id/recurring - Delete all recurring instances
router.delete('/:id/recurring', protect, validateId, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, company: req.companyId });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Delete this and all linked recurring events
    if (event.linkedTo?.id) {
      await Event.deleteMany({ company: req.companyId, 'linkedTo.id': event.linkedTo.id });
    }
    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Recurring events deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;