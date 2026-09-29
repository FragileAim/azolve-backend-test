/**
 * BankAccount Model
 * Stores bank account details for a company
 */
const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  accountName: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  ifscCode: { type: String, trim: true, uppercase: true },
  accountType: { type: String, enum: ['current', 'savings', 'cc', 'od', 'other'], default: 'current' },
  branchName: { type: String, trim: true },
  currency: { type: String, default: 'INR' },
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  lastReconciledAt: { type: Date },
  lastReconciledBalance: { type: Number, default: 0 },

  // Account Aggregator (RBI-AA) integration prep
  aaConsent: {
    consentId: String,
    handle: String,
    status: { type: String, enum: ['pending', 'active', 'expired', 'revoked'], default: 'pending' },
    grantedAt: Date,
    expiresAt: Date,
    fipId: String, // Financial Information Provider
  },

  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bankAccountSchema.index({ companyId: 1, accountNumber: 1 }, { unique: true });

module.exports = mongoose.models.BankAccount || mongoose.model('BankAccount', bankAccountSchema);
