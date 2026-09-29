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

const deliveryChallanSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  challanNumber: { type: String, required: true, trim: true },
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
  status: { type: String, enum: ['draft', 'dispatched', 'delivered', 'returned', 'cancelled'], default: 'draft' },
  issueDate: { type: Date, default: Date.now },
  dispatchDate: { type: Date },
  deliveryDate: { type: Date },
  vehicleNumber: { type: String, trim: true },
  transporterName: { type: String, trim: true },
  ewayBillNumber: { type: String, trim: true },
  convertedFromSalesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  convertedFromQuotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  notes: { type: String, trim: true },
  terms: { type: String, trim: true },
  attachments: [{ name: String, url: String, size: Number }],
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

deliveryChallanSchema.index({ company: 1, challanNumber: 1 }, { unique: true });
deliveryChallanSchema.index({ company: 1, client: 1 });
deliveryChallanSchema.index({ company: 1, status: 1 });

deliveryChallanSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    this.grandTotal = this.subtotal + this.taxAmount - this.discountAmount + this.shippingCost;
  }
  next();
});

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
