const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: [true, 'Lead name is required'], trim: true, maxlength: 200 },
  companyName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  industry: { type: String, trim: true },
  source: { type: String, enum: ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'advertisement', 'email_campaign', 'other'], default: 'other' },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], default: 'new' },
  value: { type: Number, default: 0 },
  probability: { type: Number, default: 0, min: 0, max: 100 },
  expectedCloseDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  nextFollowUp: { type: Date },
  notes: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  activities: [{
    type: { type: String, enum: ['call', 'email', 'meeting', 'note', 'task'] },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  convertedToDeal: { type: Boolean, default: false },
  dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  lostReason: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leadSchema.index({ company: 1, status: 1 });
leadSchema.index({ company: 1, assignedTo: 1 });
leadSchema.index({ company: 1, source: 1 });

module.exports = mongoose.model('Lead', leadSchema);