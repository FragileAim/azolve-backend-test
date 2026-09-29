const router = require('express').Router();
const mongoose = require('mongoose');
const Email = require('../models/Email');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');
const { sendEmail } = require('../utils/email');

// Helper for simulation reply
const triggerSimulatedReply = ({
  companyId, threadId, subject, recipientEmail, recipientName, senderEmail, senderName, originalBody, io
}) => {
  setTimeout(async () => {
    try {
      const count = await Email.countDocuments({ threadId, company: companyId });
      if (count === 0) return;

      const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
      const replies = [
        "Thanks for the update. That looks perfect! I've shared it with the team and we are ready to move forward.",
        "Got it, thank you. Could you clarify the timeline for completion? We'd like to get this finalized by early next week.",
        "Thank you for emailing. I will review this document and get back to you with my feedback by tomorrow afternoon.",
        "This sounds great. Let's schedule a brief meeting tomorrow at 10 AM to sync on the details and next steps. Does that time work for you?",
        "I appreciate the detailed message. I have a few questions regarding the pricing model we discussed. Can you send over an itemized proposal?",
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      const body = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
          <p>Hi ${recipientName},</p>
          <p>${randomReply}</p>
          <br>
          <p>Best regards,</p>
          <p><strong>${senderName}</strong></p>
          <br>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <div style="color: #64748b; font-size: 12px;">
            <p>On ${new Date().toLocaleString()}, ${recipientName} &lt;${recipientEmail}&gt; wrote:</p>
            <blockquote style="margin: 0 0 0 10px; border-left: 2px solid #cbd5e1; padding-left: 10px;">
              ${originalBody}
            </blockquote>
          </div>
        </div>
      `;

      const snippet = randomReply.substring(0, 100);
      const recipientUser = await User.findOne({ email: recipientEmail, company: companyId });

      const email = new Email({
        company: companyId,
        sender: {
          name: senderName,
          email: senderEmail
        },
        recipients: [{
          user: recipientUser ? recipientUser._id : undefined,
          name: recipientName,
          email: recipientEmail,
          recipientType: 'to'
        }],
        subject: replySubject,
        body,
        snippet,
        isDraft: false,
        threadId,
        readBy: [], // Unread
        starredBy: [],
        trashedBy: [],
        archivedBy: [],
        spamBy: [],
        deletedBy: []
      });

      await email.save();
      console.log(`🤖 Simulated reply created from ${senderEmail} in thread ${threadId}`);

      if (io) {
        io.to(`company:${companyId}`).emit('email:received', { threadId: threadId.toString(), sender: senderName });
      }
    } catch (err) {
      console.error('Error in simulated reply:', err);
    }
  }, 4000);
};

// GET /api/emails/folder/:folder - Get threads inside folder
router.get('/folder/:folder', protect, async (req, res) => {
  try {
    const { folder } = req.params;
    const userEmail = req.user.email.toLowerCase();
    const userId = req.user._id;
    const companyId = req.companyId;

    let query = { company: companyId, deletedBy: { $ne: userId } };

    switch (folder) {
      case 'inbox':
        query.isDraft = false;
        query['recipients.email'] = userEmail;
        query.trashedBy = { $ne: userId };
        query.archivedBy = { $ne: userId };
        break;
      case 'sent':
        query.isDraft = false;
        query['sender.email'] = userEmail;
        query.trashedBy = { $ne: userId };
        break;
      case 'starred':
        query.starredBy = userId;
        query.trashedBy = { $ne: userId };
        break;
      case 'drafts':
        query.isDraft = true;
        query['sender.email'] = userEmail;
        query.trashedBy = { $ne: userId };
        break;
      case 'trash':
        query.trashedBy = userId;
        break;
      case 'archive':
        query.archivedBy = userId;
        query.trashedBy = { $ne: userId };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid folder' });
    }

    const emails = await Email.find(query).sort({ createdAt: -1 });

    const threadMap = new Map();
    for (const email of emails) {
      const threadIdStr = email.threadId.toString();
      if (!threadMap.has(threadIdStr)) {
        threadMap.set(threadIdStr, []);
      }
      threadMap.get(threadIdStr).push(email);
    }

    const threads = [];
    for (const [threadId, threadEmails] of threadMap.entries()) {
      const allThreadEmails = await Email.find({ threadId, company: companyId, deletedBy: { $ne: userId } }).sort({ createdAt: 1 });
      if (allThreadEmails.length === 0) continue;

      const latestEmail = allThreadEmails[allThreadEmails.length - 1];
      
      const senders = [];
      allThreadEmails.forEach(e => {
        const isMe = e.sender.email.toLowerCase() === userEmail;
        const name = isMe ? 'me' : (e.sender.name || e.sender.email.split('@')[0]);
        if (!senders.includes(name)) {
          senders.push(name);
        }
      });

      // A thread is read if all of its messages are read
      const isUnread = allThreadEmails.some(e => !e.readBy.includes(userId));

      threads.push({
        threadId,
        subject: latestEmail.subject || '(No Subject)',
        snippet: latestEmail.snippet || '',
        messagesCount: allThreadEmails.length,
        senders,
        latestMessageDate: latestEmail.createdAt,
        isRead: !isUnread,
        isStarred: allThreadEmails.some(e => e.starredBy.includes(userId)),
        isDraft: latestEmail.isDraft,
        hasAttachments: allThreadEmails.some(e => e.attachments && e.attachments.length > 0)
      });
    }

    threads.sort((a, b) => new Date(b.latestMessageDate) - new Date(a.latestMessageDate));
    res.json({ success: true, count: threads.length, data: threads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/emails/thread/:threadId - Get full conversation thread
router.get('/thread/:threadId', protect, async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user._id;
    const companyId = req.companyId;

    const emails = await Email.find({
      threadId,
      company: companyId,
      deletedBy: { $ne: userId }
    }).sort({ createdAt: 1 });

    if (emails.length === 0) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    // Mark all emails in thread as read
    for (const email of emails) {
      if (!email.readBy.includes(userId)) {
        email.readBy.push(userId);
        await email.save();
      }
    }

    res.json({ success: true, data: emails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/emails/compose - Compose new email or draft
router.post('/compose', protect, uploadMultiple('attachments', 10), async (req, res) => {
  try {
    const { 
      to, cc, bcc, subject, body, isDraft, threadId, parentEmailId, draftId 
    } = req.body;

    const userId = req.user._id;
    const companyId = req.companyId;
    const userEmail = req.user.email.toLowerCase();
    const userName = req.user.name;

    const parseRecipients = async (fieldVal, type) => {
      if (!fieldVal) return [];
      const emailsList = Array.isArray(fieldVal) 
        ? fieldVal 
        : fieldVal.split(',').map(e => e.trim()).filter(Boolean);
      
      const parsed = [];
      for (const emailStr of emailsList) {
        const cleanEmail = emailStr.toLowerCase();
        const matchedUser = await User.findOne({ email: cleanEmail, company: companyId });
        parsed.push({
          user: matchedUser ? matchedUser._id : undefined,
          name: matchedUser ? matchedUser.name : cleanEmail.split('@')[0],
          email: cleanEmail,
          recipientType: type
        });
      }
      return parsed;
    };

    const toRecipients = await parseRecipients(to, 'to');
    const ccRecipients = await parseRecipients(cc, 'cc');
    const bccRecipients = await parseRecipients(bcc, 'bcc');
    const allRecipients = [...toRecipients, ...ccRecipients, ...bccRecipients];

    const isDraftBool = isDraft === 'true' || isDraft === true;

    if (!isDraftBool && allRecipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.originalname,
          url: getFileUrl(req, file),
          size: file.size,
          mimetype: file.mimetype
        });
      });
    }

    const snippet = body 
      ? body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 100).trim() 
      : '';

    let email;

    if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
      email = await Email.findOne({ _id: draftId, company: companyId, isDraft: true, 'sender.email': userEmail });
      if (email) {
        email.recipients = allRecipients;
        email.subject = subject || '(No Subject)';
        email.body = body || '';
        email.snippet = snippet;
        if (attachments.length > 0) {
          email.attachments = [...email.attachments, ...attachments];
        }
        email.isDraft = isDraftBool;
      }
    }

    if (!email) {
      email = new Email({
        company: companyId,
        sender: {
          user: userId,
          name: userName,
          email: userEmail
        },
        recipients: allRecipients,
        subject: subject || '(No Subject)',
        body: body || '',
        snippet,
        attachments,
        isDraft: isDraftBool,
        parentEmailId: parentEmailId && mongoose.Types.ObjectId.isValid(parentEmailId) ? parentEmailId : undefined,
        readBy: [userId],
        starredBy: [],
        trashedBy: [],
        archivedBy: [],
        spamBy: [],
        deletedBy: []
      });

      if (threadId && mongoose.Types.ObjectId.isValid(threadId)) {
        email.threadId = threadId;
      } else {
        email.threadId = email._id;
      }
    }

    if (!email.isDraft) {
      email.isDraft = false;
      await email.save();

      // Trigger external nodemailer sending
      const externalRecipients = allRecipients.filter(r => !r.user);
      if (externalRecipients.length > 0) {
        for (const recipient of externalRecipients) {
          try {
            await sendEmail({
              to: recipient.email,
              subject: email.subject,
              html: email.body,
              text: email.snippet
            });
          } catch (e) {
            console.error('Nodemailer send error:', e.message);
          }

          // Trigger simulator reply
          const lowerEmail = recipient.email.toLowerCase();
          const shouldSimulate = lowerEmail.includes('simulation') || 
                                lowerEmail.includes('test') || 
                                lowerEmail.includes('client') || 
                                lowerEmail.includes('example.com') ||
                                lowerEmail.includes('demo');
          if (shouldSimulate) {
            triggerSimulatedReply({
              companyId,
              threadId: email.threadId,
              subject: email.subject,
              recipientEmail: userEmail,
              recipientName: userName,
              senderEmail: recipient.email,
              senderName: recipient.name,
              originalBody: email.body,
              io: req.app.get('io')
            });
          }
        }
      }
    } else {
      await email.save();
    }

    res.status(200).json({ success: true, data: email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/emails/:id/star - Star/Unstar email
router.put('/:id/star', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    const starIdx = email.starredBy.indexOf(userId);
    if (starIdx > -1) {
      email.starredBy.splice(starIdx, 1);
    } else {
      email.starredBy.push(userId);
    }
    await email.save();
    res.json({ success: true, isStarred: starIdx === -1 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/emails/:id/read - Mark read/unread
router.put('/:id/read', protect, async (req, res) => {
  try {
    const { isRead } = req.body;
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    const readIdx = email.readBy.indexOf(userId);
    
    if (isRead) {
      if (readIdx === -1) email.readBy.push(userId);
    } else {
      if (readIdx > -1) email.readBy.splice(readIdx, 1);
    }
    
    await email.save();
    res.json({ success: true, isRead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/emails/:id/trash - Move to trash
router.put('/:id/trash', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    if (!email.trashedBy.includes(userId)) {
      email.trashedBy.push(userId);
      const archIdx = email.archivedBy.indexOf(userId);
      if (archIdx > -1) email.archivedBy.splice(archIdx, 1);
    }
    await email.save();
    res.json({ success: true, message: 'Email moved to Trash' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/emails/:id/archive - Archive email
router.put('/:id/archive', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    if (!email.archivedBy.includes(userId)) {
      email.archivedBy.push(userId);
      const trashIdx = email.trashedBy.indexOf(userId);
      if (trashIdx > -1) email.trashedBy.splice(trashIdx, 1);
    }
    await email.save();
    res.json({ success: true, message: 'Email archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/emails/:id/restore - Restore from trash/archive
router.put('/:id/restore', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    const trashIdx = email.trashedBy.indexOf(userId);
    if (trashIdx > -1) email.trashedBy.splice(trashIdx, 1);
    const archIdx = email.archivedBy.indexOf(userId);
    if (archIdx > -1) email.archivedBy.splice(archIdx, 1);

    await email.save();
    res.json({ success: true, message: 'Email restored' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/emails/:id - Permanent delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const email = await Email.findOne({ _id: req.params.id, company: req.companyId });
    if (!email) return res.status(404).json({ success: false, message: 'Email not found' });

    const userId = req.user._id;
    if (!email.deletedBy.includes(userId)) {
      email.deletedBy.push(userId);
    }
    await email.save();
    res.json({ success: true, message: 'Email permanently deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/emails/trash/empty - Empty trash
router.delete('/trash/empty', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.companyId;

    const emails = await Email.find({ company: companyId, trashedBy: userId });
    for (const email of emails) {
      if (!email.deletedBy.includes(userId)) {
        email.deletedBy.push(userId);
        await email.save();
      }
    }
    res.json({ success: true, message: 'Trash emptied' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/emails/search - Search emails
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const userId = req.user._id;
    const companyId = req.companyId;
    const searchRegex = new RegExp(q.trim(), 'i');

    const query = {
      company: companyId,
      deletedBy: { $ne: userId },
      $or: [
        { subject: searchRegex },
        { body: searchRegex },
        { 'sender.name': searchRegex },
        { 'sender.email': searchRegex },
        { 'recipients.name': searchRegex },
        { 'recipients.email': searchRegex }
      ]
    };

    const emails = await Email.find(query).sort({ createdAt: -1 });

    const threadMap = new Map();
    for (const email of emails) {
      const threadIdStr = email.threadId.toString();
      if (!threadMap.has(threadIdStr)) {
        threadMap.set(threadIdStr, []);
      }
      threadMap.get(threadIdStr).push(email);
    }

    const threads = [];
    for (const [threadId, threadEmails] of threadMap.entries()) {
      const allThreadEmails = await Email.find({ threadId, company: companyId, deletedBy: { $ne: userId } }).sort({ createdAt: 1 });
      if (allThreadEmails.length === 0) continue;

      const latestEmail = allThreadEmails[allThreadEmails.length - 1];
      const senders = [];
      allThreadEmails.forEach(e => {
        const isMe = e.sender.email.toLowerCase() === req.user.email.toLowerCase();
        const name = isMe ? 'me' : (e.sender.name || e.sender.email.split('@')[0]);
        if (!senders.includes(name)) senders.push(name);
      });

      const isUnread = allThreadEmails.some(e => !e.readBy.includes(userId));

      threads.push({
        threadId,
        subject: latestEmail.subject || '(No Subject)',
        snippet: latestEmail.snippet || '',
        messagesCount: allThreadEmails.length,
        senders,
        latestMessageDate: latestEmail.createdAt,
        isRead: !isUnread,
        isStarred: allThreadEmails.some(e => e.starredBy.includes(userId)),
        isDraft: latestEmail.isDraft,
        hasAttachments: allThreadEmails.some(e => e.attachments && e.attachments.length > 0)
      });
    }

    threads.sort((a, b) => new Date(b.latestMessageDate) - new Date(a.latestMessageDate));
    res.json({ success: true, count: threads.length, data: threads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/emails/simulate-incoming - Manually inject simulation email
router.post('/simulate-incoming', protect, async (req, res) => {
  try {
    const companyId = req.companyId;
    const userId = req.user._id;
    const userEmail = req.user.email.toLowerCase();
    const userName = req.user.name;

    const threadId = new mongoose.Types.ObjectId();
    const senderEmail = req.body.email || 'customer@acmecorp.com';
    const senderName = req.body.name || 'Jane Miller';
    const subject = req.body.subject || 'Inquiry about Enterprise Pricing';
    const bodyText = req.body.body || 'Hello, we are interested in signing up for the Azolve Enterprise suite for our team of 150 employees. Could you provide details on enterprise discount options and onboarding support?';
    
    const body = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
        <p>Hi ${userName},</p>
        <p>${bodyText}</p>
        <br>
        <p>Best regards,</p>
        <p><strong>${senderName}</strong></p>
        <p>Procurement Manager · Acme Corp</p>
      </div>
    `;

    const snippet = bodyText.substring(0, 100);

    const email = new Email({
      company: companyId,
      sender: {
        name: senderName,
        email: senderEmail
      },
      recipients: [{
        user: userId,
        name: userName,
        email: userEmail,
        recipientType: 'to'
      }],
      subject,
      body,
      snippet,
      isDraft: false,
      threadId,
      readBy: [],
      starredBy: [],
      trashedBy: [],
      archivedBy: [],
      spamBy: [],
      deletedBy: []
    });

    await email.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`company:${companyId}`).emit('email:received', { threadId: threadId.toString(), sender: senderName });
    }

    res.json({ success: true, message: 'Simulated email received', data: email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
