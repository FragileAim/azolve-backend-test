const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  sender: {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true }
  },
  
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    recipientType: { type: String, enum: ['to', 'cc', 'bcc'], default: 'to' }
  }],
  
  subject: { type: String, trim: true, default: '(No Subject)' },
  body: { type: String, default: '' },
  snippet: { type: String, default: '' },
  
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number },
    mimetype: { type: String }
  }],
  
  isDraft: { type: Boolean, default: false },
  
  threadId: { type: mongoose.Schema.Types.ObjectId, index: true },
  parentEmailId: { type: mongoose.Schema.Types.ObjectId, ref: 'Email' },
  
  // Tracking folders & read status per user
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  trashedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  spamBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

// Indexes for query performance
emailSchema.index({ company: 1, threadId: 1 });
emailSchema.index({ company: 1, 'sender.email': 1 });
emailSchema.index({ company: 1, 'recipients.email': 1 });
emailSchema.index({ company: 1, isDraft: 1 });

module.exports = mongoose.model('Email', emailSchema);
