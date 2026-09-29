const router = require('express').Router();
const Company = require('../models/Company');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

// Helper: normalize company size to match enum
const normalizeSize = (size) => {
  const sizeMap = {
    '500+': '1000+',
    '1000+': '1000+',
    '501-1000': '501-1000',
    '201-500': '201-500',
    '51-200': '51-200',
    '11-50': '11-50',
    '1-10': '1-10',
  };
  return sizeMap[size] || '1-10';
};

// GET /api/companies/mine - Get current company
router.get('/mine', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/companies/mine - Update company
router.put('/mine', protect, async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id; delete updates.createdBy; delete updates.plan;
    
    // Normalize size to match enum
    if (updates.size) {
      updates.size = normalizeSize(updates.size);
    }

    const company = await Company.findByIdAndUpdate(req.companyId, updates, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    res.json({ success: true, message: 'Company updated', data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/companies/mine/logo
router.put('/mine/logo', protect, uploadSingle('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const logoUrl = getFileUrl(req, req.file);
    const company = await Company.findByIdAndUpdate(req.companyId, { logo: logoUrl }, { new: true });
    res.json({ success: true, message: 'Logo updated', data: { logo: logoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/companies/mine/settings
router.put('/mine/settings', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
    if (!company.settings) company.settings = {};
    Object.keys(req.body || {}).forEach(key => { company.settings[key] = req.body[key]; });
    await company.save();
    res.json({ success: true, message: 'Settings updated', data: company.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
