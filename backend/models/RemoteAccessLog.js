const mongoose = require('mongoose');

const remoteAccessLogSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  tool: { type: String, required: true },
  identifier: { type: String, trim: true }, // snapshot of the ID/link used, in case the profile changes later
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: [true, 'A reason is required before connecting'], trim: true, maxlength: 500 },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' }, // optional link to a support ticket
  status: { type: String, enum: ['open', 'completed'], default: 'open' },
  resolutionNotes: { type: String, trim: true, maxlength: 1000 },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
}, { timestamps: true });

remoteAccessLogSchema.index({ company: 1, client: 1, createdAt: -1 });
remoteAccessLogSchema.index({ company: 1, initiatedBy: 1 });

module.exports = mongoose.model('RemoteAccessLog', remoteAccessLogSchema);
