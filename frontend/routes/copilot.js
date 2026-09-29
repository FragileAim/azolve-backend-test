/**
 * AI Co-Pilot API Routes
 * POST /api/copilot/chat — main chat endpoint
 * GET /api/copilot/suggestions — suggestion chips
 * GET /api/copilot/history — chat history (per user)
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
const { detectAndHandle } = require('../services/aiCopilot');
const mongoose = require('mongoose');

router.use(...auth);

// In-memory chat history (use Redis in production)
const chatHistory = new Map();

/**
 * POST /api/copilot/chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const ctx = {
      company: req.user.companyId,
      userId: req.user._id || req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
    };

    const startTime = Date.now();
    const result = await detectAndHandle(message, ctx);
    const duration = Date.now() - startTime;

    // Store in history
    const sid = sessionId || `${ctx.userId}-default`;
    if (!chatHistory.has(sid)) chatHistory.set(sid, []);
    const history = chatHistory.get(sid);
    history.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: result.message, type: result.type, data: result.data, timestamp: new Date() }
    );
    // Keep last 50 exchanges
    if (history.length > 100) chatHistory.set(sid, history.slice(-100));

    res.json({
      success: true,
      data: { ...result, sessionId: sid, duration },
    });
  } catch (err) {
    console.error('Copilot error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/copilot/suggestions
 */
router.get('/suggestions', async (req, res) => {
  const hour = new Date().getHours();
  const morning = ['How much did I earn yesterday?', 'Show today\'s pipeline', 'Pending tasks for today'];
  const afternoon = ['Show unpaid invoices', 'Top clients this month', 'Employee attendance today'];
  const evening = ['Today\'s revenue summary', 'Pending follow-ups', 'Cash flow forecast'];

  const general = ['Show me revenue this month', 'Top 5 clients', 'Low stock products', 'Lead pipeline summary'];

  const timely = hour < 12 ? morning : hour < 17 ? afternoon : evening;

  res.json({
    success: true,
    data: { suggestions: [...timely, ...general].slice(0, 6) },
  });
});

/**
 * GET /api/copilot/history
 */
router.get('/history', async (req, res) => {
  const sid = req.query.sessionId || `${req.user._id || req.user.id}-default`;
  res.json({ success: true, data: chatHistory.get(sid) || [] });
});

/**
 * DELETE /api/copilot/history
 */
router.delete('/history', async (req, res) => {
  const sid = req.query.sessionId || `${req.user._id || req.user.id}-default`;
  chatHistory.delete(sid);
  res.json({ success: true });
});

module.exports = router;
