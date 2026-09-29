const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: [true, 'Deal name is required'], trim: true, maxlength: 300 },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  value: { type: Number, default: 0, min: 0 },
  stage: { type: String, enum: ['new', 'discovery', 'proposal', 'negotiation', 'won', 'lost'], default: 'new' },
  probability: { type: Number, default: 0, min: 0, max: 100 },
  expectedCloseDate: { type: Date },
  actualCloseDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
  }],
  competitor: { type: String, trim: true },
  lostReason: { type: String, trim: true },
  wonDate: { type: Date },
  notes: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  activities: [{
    type: { type: String, enum: ['call', 'email', 'meeting', 'note', 'task', 'stage_change'] },
    description: { type: String, trim: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

dealSchema.index({ company: 1, stage: 1 });
dealSchema.index({ company: 1, assignedTo: 1 });
dealSchema.index({ company: 1, client: 1 });

module.exports = mongoose.model('Deal', dealSchema);