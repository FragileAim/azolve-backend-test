const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 200 },
  sku: { type: String, trim: true },
  category: { type: String, trim: true },
  description: { type: String, trim: true },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  image: { type: String, default: '' },
  price: { type: Number, required: [true, 'Price is required'], min: 0 },
  cost: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 18 },
  stock: { type: Number, default: 0 },
  lowStockAlert: { type: Number, default: 10 },
  unit: { type: String, default: 'Piece', trim: true },
  barcode: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  tags: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

productSchema.index({ company: 1, name: 1 });
productSchema.index({ company: 1, sku: 1 });
productSchema.index({ company: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);