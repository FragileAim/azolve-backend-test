/**
 * Churn Predictor API
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
// Normalize req.user to v2 shape: req.user.id + req.user.companyId
const normalizeUser = (req, res, next) => {
  if (req.user) {
    req.user.id = req.user.id || (req.user._id && req.user._id.toString());
    req.user.companyId = req.user.companyId || req.companyId ||
      (req.user.company && (req.user.company._id || req.user.company));
  }
  next();
};
const auth = [protect, normalizeUser];
const churnPredictor = require('../services/churnPredictor');

router.use(...auth);

/**
 * GET /api/churn — Get churn analysis for all clients
 */
router.get('/', async (req, res) => {
  try {
    const { results, stats } = await churnPredictor.calculateAllClients(req.user.companyId);
    res.json({ success: true, data: { results, stats } });
  } catch (err) {
    console.error('Churn analysis error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/churn/at-risk — Get only at-risk clients (score >= 50)
 */
router.get('/at-risk', async (req, res) => {
  try {
    const { results, stats } = await churnPredictor.calculateAllClients(req.user.companyId);
    const atRisk = results.filter(r => r.score >= 50);
    res.json({ success: true, data: { results: atRisk, stats } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/churn/client/:id — Get churn analysis for one client
 */
router.get('/client/:id', async (req, res) => {
  try {
    const Client = require('../models/Client');
    const client = await Client.findOne({ _id: req.params.id, company: req.user.companyId }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const result = await churnPredictor.calculateChurnScore(client, req.user.companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
