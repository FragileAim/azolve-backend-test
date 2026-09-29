/**
 * AI Co-Pilot API Routes
 * POST /api/copilot/chat        — main chat endpoint (Q&A + free-text automation)
 * POST /api/copilot/action      — one-click button actions (create/send/etc.)
 * GET  /api/copilot/suggestions — suggestion chips
 * GET  /api/copilot/history     — chat history (per user)
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
const { detectAndHandle, executeAction } = require('../services/aiCopilot');
const mongoose = require('mongoose');

router.use(...auth);

// In-memory chat history (use Redis in production)
const chatHistory = new Map();

// Build the context object every handler/action relies on.
// IMPORTANT: key is `companyId` (not `company`) — the service layer reads
// `ctx.companyId` everywhere, so this must match exactly.
function buildCtx(req) {
  return {
    companyId: req.user.companyId,
    userId: req.user._id || req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    permissions: req.user.permissions || {},
  };
}

/**
 * POST /api/copilot/chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const ctx = buildCtx(req);

    // Pull recent conversation for this session so the AI agent has memory
    const sid = sessionId || `${ctx.userId}-default`;
    if (!chatHistory.has(sid)) chatHistory.set(sid, []);
    const priorHistory = chatHistory.get(sid);

    const startTime = Date.now();
    const result = await detectAndHandle(message, ctx, priorHistory);
    const duration = Date.now() - startTime;

    // Store in history
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
 * POST /api/copilot/action
 * Executes a one-click action that came from a chat card button
 * (e.g. confirming which client to bill, sending an invoice email,
 * bulk-sending payment reminders).
 */
router.post('/action', async (req, res) => {
  try {
    const { action, payload, sessionId } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'Action required' });

    const ctx = buildCtx(req);
    const result = await executeAction(action, payload || {}, ctx);

    const sid = sessionId || `${ctx.userId}-default`;
    if (!chatHistory.has(sid)) chatHistory.set(sid, []);
    chatHistory.get(sid).push({ role: 'assistant', content: result.message, type: result.type, data: result.data, timestamp: new Date() });

    res.json({ success: true, data: { ...result, sessionId: sid } });
  } catch (err) {
    console.error('Copilot action error:', err);
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

  const general = [
    'Show me revenue this month',
    'Top 5 clients',
    'Create invoice for Acme Corp ₹15000',
    'Remind me to call the vendor tomorrow',
  ];

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
