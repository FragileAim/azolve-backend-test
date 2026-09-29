const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: [true, 'Client name is required'], trim: true, maxlength: 200 },
  contactPerson: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  industry: { type: String, trim: true },
  website: { type: String, trim: true },
  billingAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
  },
  shippingAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    pincode: { type: String, trim: true },
  },
  taxNumber: { type: String, trim: true },
  creditLimit: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalInvoices: { type: Number, default: 0 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String, trim: true }],
  notes: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  source: { type: String, enum: ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'advertisement', 'other'], default: 'other' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

clientSchema.index({ company: 1, name: 1 });
clientSchema.index({ company: 1, email: 1 });
clientSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Client', clientSchema);