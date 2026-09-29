const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Cashfree fields
  cfOrderId: { type: String, unique: true, sparse: true },   // Cashfree order_id
  cfPaymentId: { type: String, sparse: true },               // Cashfree payment_id
  cfSignature: { type: String },                             // Cashfree signature for verification

  // Internal order reference
  orderId: { type: String, unique: true, required: true },   // our internal order id

  // What they are paying for
  plan: { type: String, enum: ['starter', 'professional', 'enterprise', 'pos_addon'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  amount: { type: Number, required: true },                  // in INR
  currency: { type: String, default: 'INR' },

  // Status
  status: {
    type: String,
    enum: ['created', 'pending', 'paid', 'failed', 'refunded', 'cancelled'],
    default: 'created',
  },

  // Metadata
  notes: { type: String },
  failureReason: { type: String },
  paidAt: { type: Date },
  sessionId: { type: String }, // Cashfree payment_session_id for SDK

}, { timestamps: true });

paymentSchema.index({ company: 1, status: 1 });
// orderId index already created by unique: true above

module.exports = mongoose.model('Payment', paymentSchema);