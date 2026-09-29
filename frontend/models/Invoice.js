const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  sku: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true, trim: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientSnapshot: {
    name: String,
    email: String,
    phone: String,
    address: String,
    taxNumber: String,
  },
  items: [lineItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['draft', 'sent', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'], default: 'draft' },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online', ''], default: '' },
  paymentReference: { type: String, trim: true },
  notes: { type: String, trim: true },
  terms: { type: String, trim: true },
  attachments: [{ name: String, url: String, size: Number }],
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly', ''], default: '' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.index({ company: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ company: 1, client: 1 });
invoiceSchema.index({ company: 1, status: 1 });
invoiceSchema.index({ company: 1, dueDate: 1 });

// Auto-calculate totals before save
invoiceSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    this.grandTotal = this.subtotal + this.taxAmount - this.discountAmount + this.shippingCost;
    this.balanceDue = this.grandTotal - this.amountPaid;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);