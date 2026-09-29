/**
 * Workflow Model
 * Stores user-defined automations
 */
const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  id: { type: String, required: true }, // unique within workflow
  type: { type: String, enum: ['trigger', 'action', 'condition', 'delay'], required: true },
  appType: String, // 'invoice', 'whatsapp', 'email', 'sms', 'webhook', etc.
  operation: String, // 'invoice.paid', 'send_email', 'check_amount', etc.
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  position: { x: Number, y: Number },
  next: [String], // IDs of next steps
}, { _id: false });

const workflowSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  enabled: { type: Boolean, default: false },

  steps: [stepSchema],

  // Stats
  runs: { type: Number, default: 0 },
  successes: { type: Number, default: 0 },
  failures: { type: Number, default: 0 },
  lastRunAt: Date,
  lastRunStatus: String,

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
}, { timestamps: true });

workflowSchema.index({ companyId: 1, enabled: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
