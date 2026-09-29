const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  ticketNumber: { type: String, required: true, trim: true },
  subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 300 },
  description: { type: String, required: [true, 'Description is required'], trim: true },
  category: { type: String, enum: ['technical', 'billing', 'general', 'product_issue', 'feature_request'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'waiting', 'resolved', 'closed'], default: 'open' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  raisedBy: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, trim: true },
    text: { type: String, trim: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
  resolution: { type: String, trim: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedDate: { type: Date },
  firstResponseDate: { type: Date },
  slaBreached: { type: Boolean, default: false },
  attachments: [{ name: String, url: String, size: Number }],
  tags: [{ type: String, trim: true }],
  satisfaction: { type: Number, min: 1, max: 5 },
  satisfactionComment: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ticketSchema.index({ company: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ company: 1, status: 1 });
ticketSchema.index({ company: 1, assignedTo: 1 });
ticketSchema.index({ company: 1, priority: 1 });
ticketSchema.index({ company: 1, client: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);