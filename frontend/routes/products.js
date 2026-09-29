const router = require('express').Router();
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { validateProduct, validateId } = require('../middleware/validate');
const { paginate, buildSearchQuery, buildSort, sanitize } = require('../utils/helpers');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

// GET /api/products
router.get('/', protect, async (req, res) => {
  try {
    const query = buildSearchQuery(req, ['name', 'sku', 'category', 'description']);
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.lowStock === 'true') query.$expr = { $lte: ['$stock', '$lowStockAlert'] };
    const sort = buildSort(req);
    const result = await paginate(Product, query, req.query.page, req.query.limit, sort);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/categories
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { company: req.companyId, category: { $ne: '' } });
    res.json({ success: true, data: categories.sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', protect, validateId, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/products
router.post('/', protect, validateProduct, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, company: req.companyId, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Product created', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id
router.put('/:id', protect, validateId, async (req, res) => {
  try {
    const updates = sanitize(req.body);
    delete updates.company; delete updates.createdBy;
    const product = await Product.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, updates, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id/image
router.put('/:id/image', protect, uploadSingle('productImage'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const imageUrl = getFileUrl(req, req.file);
    const product = await Product.findOneAndUpdate({ _id: req.params.id, company: req.companyId }, { image: imageUrl }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Image updated', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:id/stock
router.put('/:id/stock', protect, async (req, res) => {
  try {
    const { adjustment, type } = req.body; // type: 'add' or 'subtract'
    const product = await Product.findOne({ _id: req.params.id, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    product.stock = type === 'add' ? product.stock + adjustment : Math.max(0, product.stock - adjustment);
    await product.save();
    res.json({ success: true, message: 'Stock updated', data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', protect, validateId, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, company: req.companyId });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;