const router = require('express').Router();
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const { validateId } = require('../utils/helpers');
const { paginate, sanitize } = require('../utils/helpers');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

// Get Message model from Chat file (same file exports both)
const Message = mongoose.model('Message');

// GET /api/chats - Get user's chats
router.get('/', protect, async (req, res) => {
  try {
    const query = {
      company: req.companyId,
      'members.user': req.user._id,
      isActive: true,
    };
    if (req.query.type) query.type = req.query.type;

    const chats = await Chat.find(query)
      .sort('-lastMessage.timestamp')
      .populate('members.user', 'name email avatar')
      .populate('project', 'name');

    // Add unread count for each chat
    const chatsWithUnread = await Promise.all(chats.map(async (chat) => {
      const member = chat.members.find(m => m.user && m.user._id.toString() === req.user._id.toString());
      const lastRead = member?.lastRead || new Date(0);
      const unread = await Message.countDocuments({
        chat: chat._id,
        createdAt: { $gt: lastRead },
        sender: { $ne: req.user._id },
      });
      return { ...chat.toObject(), unreadCount: unread };
    }));

    res.json({ success: true, data: chatsWithUnread });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chats/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    })
      .populate('members.user', 'name email avatar')
      .populate('project', 'name')
      .populate('pinnedMessages');

    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats - Create new chat
router.post('/', protect, async (req, res) => {
  try {
    const data = sanitize(req.body);
    data.company = req.companyId;
    data.createdBy = req.user._id;

    // For private chats, check if one already exists between the two users
    if (data.type === 'private' && data.members?.length === 1) {
      const otherUserId = data.members[0].user || data.members[0];
      const existing = await Chat.findOne({
        company: req.companyId,
        type: 'private',
        isActive: true,
        'members.user': { $all: [req.user._id, otherUserId] },
        $expr: { $eq: [{ $size: '$members' }, 2] },
      }).populate('members.user', 'name email avatar');

      if (existing) {
        return res.json({ success: true, data: existing, existing: true });
      }
    }

    // Ensure creator is always a member with admin role
    const creatorInMembers = (data.members || []).find(
      m => (m.user || m).toString() === req.user._id.toString()
    );
    if (!creatorInMembers) {
      if (!data.members) data.members = [];
      data.members.unshift({ user: req.user._id, name: req.user.name, role: 'admin' });
    }

    // Set member names
    data.members = data.members.map(m => {
      if (typeof m === 'string' || m instanceof mongoose.Types.ObjectId) {
        return { user: m, role: 'member' };
      }
      return m;
    });

    const chat = await Chat.create(data);
    const populated = await chat.populate('members.user');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/chats/:id - Update chat (name, description, avatar)
router.put('/:id', protect, async (req, res) => {
  try {
    const data = sanitize(req.body);
    // Only allow updating name, description, avatar for group chats
    const allowedFields = ['name', 'description', 'avatar'];
    const update = {};
    allowedFields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });

    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId, 'members.user': req.user._id },
      update,
      { new: true }
    ).populate('members.user', 'name email avatar');
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats/:id/members - Add members to chat
router.post('/:id/members', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    if (chat.type === 'private') {
      return res.status(400).json({ success: false, message: 'Cannot add members to private chat' });
    }

    const newMembers = req.body.members || [];
    for (const m of newMembers) {
      const userId = m.user || m;
      const exists = chat.members.find(mem => mem.user && mem.user.toString() === userId.toString());
      if (!exists) {
        chat.members.push({ user: userId, name: m.name || '', role: 'member' });
      }
    }

    await chat.save();
    const populated = await chat.populate('members.user');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/chats/:id/members/:userId - Remove member from chat
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    chat.members = chat.members.filter(m => m.user && m.user.toString() !== req.params.userId);
    await chat.save();
    const populated = await chat.populate('members.user');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chats/:id/messages - Get messages for a chat
router.get('/:id/messages', protect, async (req, res) => {
  try {
    // Verify user is member of chat
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ chat: req.params.id, company: req.companyId });
    const messages = await Message.find({ chat: req.params.id, company: req.companyId })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email avatar')
      .populate('replyTo', 'content senderName');

    // Update lastRead for current user
    const member = chat.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (member) {
      member.lastRead = new Date();
      await chat.save();
    }

    res.json({
      success: true,
      data: messages.reverse(), // Return oldest first
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats/:id/messages - Send a message
router.post('/:id/messages', protect, async (req, res) => {
  try {
    // Verify user is member
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const data = {
      company: req.companyId,
      chat: req.params.id,
      sender: req.user._id,
      senderName: req.user.name,
      content: req.body.content,
      type: req.body.type || 'text',
    };

    if (req.body.replyTo) data.replyTo = req.body.replyTo;
    if (req.body.mediaUrl) {
      data.mediaUrl = req.body.mediaUrl;
      data.mediaName = req.body.mediaName;
      data.mediaSize = req.body.mediaSize;
    }

    const message = await Message.create(data);

    // Update chat's lastMessage
    chat.lastMessage = {
      content: data.content,
      sender: req.user.name,
      timestamp: new Date(),
    };
    await chat.save();

    const populated = await message.populate('sender', 'name email avatar');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/chats/:id/messages/media - Send media message
router.post('/:id/messages/media', protect, uploadSingle('media'), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const fileUrl = getFileUrl(req, req.file);
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
                     req.file.mimetype.startsWith('video/') ? 'video' :
                     req.file.mimetype.startsWith('audio/') ? 'audio' : 'file';

    const message = await Message.create({
      company: req.companyId,
      chat: req.params.id,
      sender: req.user._id,
      senderName: req.user.name,
      content: req.body.content || '',
      type: fileType,
      mediaUrl: fileUrl,
      mediaName: req.file.originalname,
      mediaSize: req.file.size,
    });

    chat.lastMessage = {
      content: `📎 ${req.file.originalname}`,
      sender: req.user.name,
      timestamp: new Date(),
    };
    await chat.save();

    const populated = await message.populate('sender', 'name email avatar');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/chats/:id/messages/:messageId/react - Add reaction
router.put('/:id/messages/:messageId/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'Emoji is required' });

    const message = await Message.findOne({ _id: req.params.messageId, chat: req.params.id });
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    // Toggle reaction
    const users = message.reactions.get(emoji) || [];
    const userIdx = users.findIndex(u => u.toString() === req.user._id.toString());
    if (userIdx > -1) {
      users.splice(userIdx, 1);
    } else {
      users.push(req.user._id);
    }
    message.reactions.set(emoji, users);
    if (users.length === 0) message.reactions.delete(emoji);

    await message.save();
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/chats/:id/read - Mark chat as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const member = chat.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (member) {
      member.lastRead = new Date();
      await chat.save();
    }

    res.json({ success: true, message: 'Chat marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/chats/:id/mute - Toggle mute
router.put('/:id/mute', protect, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      company: req.companyId,
      'members.user': req.user._id,
    });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    const member = chat.members.find(m => m.user && m.user.toString() === req.user._id.toString());
    if (member) {
      member.muted = !member.muted;
      await chat.save();
    }

    res.json({ success: true, data: { muted: member?.muted } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/chats/:id - Archive/delete chat
router.delete('/:id', protect, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId, createdBy: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found or unauthorized' });
    res.json({ success: true, message: 'Chat archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;