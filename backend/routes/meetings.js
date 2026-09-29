const router = require('express').Router();
const Meeting = require('../models/Meeting');
const { protect } = require('../middleware/auth');
const { validateMeeting, validateId } = require('../middleware/validate');
const { paginate, buildSort, sanitize } = require('../utils/helpers');
const { generateMeetingId } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/email');

// GET /api/meetings
router.get('/', protect, async (req, res) => {
  try {
    const query = { company: req.companyId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    if (req.query.host) query.host = req.query.host;
    if (req.query.upcoming === 'true') {
      query.scheduledTime = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'live'] };
    }
    if (req.query.startDate && req.query.endDate) {
      query.scheduledTime = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    const sort = buildSort(req) || '-scheduledTime';
    const result = await paginate(Meeting, query, req.query.page, req.query.limit, sort, 'host participants.user');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/meetings/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const c = req.companyId;
    const total = await Meeting.countDocuments({ company: c });
    const live = await Meeting.countDocuments({ company: c, status: 'live' });
    const scheduled = await Meeting.countDocuments({ company: c, status: 'scheduled', scheduledTime: { $gte: new Date() } });
    const ended = await Meeting.countDocuments({ company: c, status: 'ended' });

    // This month's meetings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = await Meeting.countDocuments({
      company: c,
      createdAt: { $gte: monthStart },
    });

    // Average duration
    const avgDuration = await Meeting.aggregate([
      { $match: { company: c, duration: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } },
    ]);

    // Meetings with recordings
    const withRecordings = await Meeting.countDocuments({ company: c, 'recording.enabled': true, 'recording.url': { $exists: true } });

    res.json({
      success: true,
      data: { total, live, scheduled, ended, thisMonth, withRecordings, avgDurationSeconds: avgDuration[0]?.avg || 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/meetings/my
router.get('/my', protect, async (req, res) => {
  try {
    const query = {
      company: req.companyId,
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    };
    if (req.query.status) query.status = req.query.status;
    const sort = '-scheduledTime';
    const result = await paginate(Meeting, query, req.query.page, req.query.limit, sort, 'host participants.user');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/meetings/upcoming
router.get('/upcoming', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      company: req.companyId,
      status: 'scheduled',
      scheduledTime: { $gte: new Date() },
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    })
      .sort('scheduledTime')
      .limit(10)
      .populate('host', 'name email avatar');
    res.json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/meetings/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, company: req.companyId })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/meetings/join/:meetingId (by meeting code, not ObjectId)
router.get('/join/:meetingId', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingId: req.params.meetingId, company: req.companyId })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Check password if set
    if (meeting.password && req.query.password !== meeting.password) {
      return res.status(403).json({ success: false, message: 'Invalid meeting password', requiresPassword: true });
    }

    // Check max participants
    const activeParticipants = meeting.participants.filter(p => p.joinedAt && !p.leftAt).length;
    if (activeParticipants >= meeting.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Meeting is full' });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/meetings
router.post('/', protect, validateMeeting, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.host = req.user._id;
    data.meetingId = generateMeetingId();
    data.createdBy = req.user._id;

    // Add host as first participant
    if (!data.participants) data.participants = [];
    data.participants.unshift({
      user: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: 'host',
    });

    const meeting = await Meeting.create(data);
    const populated = await meeting.populate('host participants.user');

    // Send invite emails to participants
    const externalParticipants = (data.participants || []).filter(p => p.email && p.isExternal);
    for (const p of externalParticipants) {
      try {
        await sendEmail(
          p.email,
          `Meeting Invite: ${data.title}`,
          emailTemplates.meetingInvite({
            name: p.name || 'Participant',
            title: data.title,
            meetingId: data.meetingId,
            scheduledTime: data.scheduledTime,
            hostName: req.user.name,
          })
        );
      } catch (emailErr) {
        console.error('Meeting invite email failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const data = sanitize(req.body);
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId, host: req.user._id },
      data,
      { new: true, runValidators: true }
    ).populate('host participants.user');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found or unauthorized' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id/start
router.put('/:id/start', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId, host: req.user._id },
      { status: 'live', startTime: new Date() },
      { new: true }
    ).populate('host participants.user');
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found or unauthorized' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id/end
router.put('/:id/end', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, company: req.companyId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    meeting.status = 'ended';
    meeting.endTime = new Date();
    if (meeting.startTime) {
      meeting.duration = Math.floor((meeting.endTime - meeting.startTime) / 1000);
    }

    // Mark all active participants as left
    meeting.participants.forEach(p => {
      if (p.joinedAt && !p.leftAt) p.leftAt = new Date();
    });

    await meeting.save();
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id/join
router.put('/:id/join', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, company: req.companyId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Check if user already a participant
    const existing = meeting.participants.find(p => p.user && p.user.toString() === req.user._id.toString());
    if (existing) {
      existing.joinedAt = new Date();
      existing.leftAt = undefined;
    } else {
      meeting.participants.push({
        user: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: 'participant',
        joinedAt: new Date(),
      });
    }

    await meeting.save();
    const populated = await meeting.populate('host participants.user');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id/leave
router.put('/:id/leave', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, company: req.companyId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const participant = meeting.participants.find(p => p.user && p.user.toString() === req.user._id.toString());
    if (participant) {
      participant.leftAt = new Date();
    }

    await meeting.save();
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/meetings/:id/recording
router.put('/:id/recording', protect, validateId, async (req, res) => {
  try {
    const { url, size, duration } = req.body;
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      {
        'recording.enabled': true,
        'recording.url': url,
        'recording.size': size || 0,
        'recording.duration': duration || 0,
        'recording.createdDate': new Date(),
      },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/meetings/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      company: req.companyId,
      host: req.user._id,
    });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found or unauthorized' });
    res.json({ success: true, message: 'Meeting deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;