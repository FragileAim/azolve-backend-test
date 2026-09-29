const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  sku: { type: String, trim: true },
  hsnCode: { type: String, trim: true },
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  total: { type: Number, required: true },
}, { _id: true });

const salesOrderSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  orderNumber: { type: String, required: true, trim: true },
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
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'draft' },
  issueDate: { type: Date, default: Date.now },
  expectedDeliveryDate: { type: Date },
  convertedFromQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  convertedToDeliveryChallan: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryChallan' },
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  notes: { type: String, trim: true },
  terms: { type: String, trim: true },
  attachments: [{ name: String, url: String, size: Number }],
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

salesOrderSchema.index({ company: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ company: 1, client: 1 });
salesOrderSchema.index({ company: 1, status: 1 });

salesOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    this.grandTotal = this.subtotal + this.taxAmount - this.discountAmount + this.shippingCost;
  }
  next();
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
