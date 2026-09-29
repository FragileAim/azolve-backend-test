/**
 * BankTransaction Model
 * Each row of a bank statement
 */
const mongoose = require('mongoose');

const bankTransactionSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true, index: true },

  txnDate: { type: Date, required: true, index: true },
  valueDate: { type: Date },
  description: { type: String, required: true },
  reference: { type: String, trim: true, index: true }, // UTR / Cheque No / RRN
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  balance: { type: Number },
  channel: { type: String }, // NEFT, RTGS, IMPS, UPI, ATM, CHQ, etc.

  // Auto-categorization
  category: {
    type: String,
    enum: ['income', 'expense', 'transfer', 'tax', 'salary', 'rent', 'utility',
           'office', 'travel', 'marketing', 'refund', 'fee', 'interest', 'uncategorized'],
    default: 'uncategorized',
    index: true,
  },
  subCategory: String,
  tags: [String],

  // Reconciliation
  status: {
    type: String,
    enum: ['unmatched', 'matched', 'partially_matched', 'manually_matched', 'ignored', 'duplicate'],
    default: 'unmatched',
    index: true,
  },
  matchedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  matchedPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  matchConfidence: { type: Number, min: 0, max: 100 }, // 0-100 score
  matchReason: String,

  // Source tracking
  importBatchId: { type: String, index: true }, // unique per upload
  sourceFile: String,
  rawRow: mongoose.Schema.Types.Mixed, // original parsed row

  // Hash for duplicate detection
  uniqueHash: { type: String, index: true },

  notes: String,
  reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reconciledAt: Date,
}, { timestamps: true });

bankTransactionSchema.index({ companyId: 1, bankAccountId: 1, txnDate: -1 });
bankTransactionSchema.index({ companyId: 1, uniqueHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.BankTransaction || mongoose.model('BankTransaction', bankTransactionSchema);
