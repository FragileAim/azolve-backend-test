/**
 * Activity Model — HubSpot-style CRM engagement log.
 * A manually-logged touchpoint (note, call, email, meeting) tied to a
 * client, so every conversation and interaction lives on that client's
 * record in one chronological timeline — not scattered across inboxes.
 */
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
  deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

  type: {
    type: String,
    enum: ['note', 'call', 'email', 'meeting', 'task'],
    required: true,
    index: true,
  },

  subject: { type: String, trim: true, maxlength: 200 },
  body: { type: String, trim: true, maxlength: 5000 },

  // Call-specific
  outcome: { type: String, enum: ['connected', 'no_answer', 'left_voicemail', 'busy', 'wrong_number', ''], default: '' },
  durationMinutes: { type: Number, min: 0 },
  direction: { type: String, enum: ['inbound', 'outbound', ''], default: '' },

  // Meeting-specific
  meetingAt: { type: Date },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

activitySchema.index({ company: 1, client: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
