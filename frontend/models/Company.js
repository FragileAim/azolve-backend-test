const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Company name is required'], trim: true, maxlength: 200 },
  domain: { type: String, unique: true, trim: true, lowercase: true },
  logo: { type: String, default: '' },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  website: { type: String, trim: true },
  industry: { type: String, trim: true },
  size: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], default: '1-10' },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
  },
  taxInfo: {
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    cin: { type: String, trim: true },
  },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    branch: { type: String, trim: true },
  },
  plan: { type: String, enum: ['free', 'starter', 'professional', 'enterprise'], default: 'free' },
  planExpiry: { type: Date },
  settings: {
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    invoicePrefix: { type: String, default: 'INV' },
    invoiceStartNumber: { type: Number, default: 1 },
    taxRate: { type: Number, default: 18 },
    fiscalYearStart: { type: Number, default: 4 }, // April
  },
  features: {
    maxUsers: { type: Number, default: 5 },
    maxStorage: { type: Number, default: 512 }, // MB
    hasWhatsApp: { type: Boolean, default: false },
    hasMeetings: { type: Boolean, default: true },
    hasPOS: { type: Boolean, default: false },
    hasAdvancedReports: { type: Boolean, default: false },
    posAddonExpiry: { type: Date },
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

companySchema.index({ domain: 1 });

module.exports = mongoose.model('Company', companySchema);