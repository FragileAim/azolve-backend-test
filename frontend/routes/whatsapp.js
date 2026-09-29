/**
 * WhatsApp Business API Routes
 */
const express = require('express');
const router = express.Router();
const wa = require('../services/whatsappService');

// ---- Auth adapter: use existing JWT protect middleware ----
const { protect } = require('../middleware/auth');
const auth = [protect, (req, res, next) => {
  // Normalize to v2 shape: req.user.id + req.user.companyId
  if (req.user) {
    req.user.id = req.user.id || req.user._id;
    req.user.companyId = req.user.companyId || req.companyId || req.user.company?._id || req.user.company;
  }
  next();
}];

// In-memory message log (replace with Mongo model if persistence needed)
const messageLog = [];
const MAX_LOG = 1000;
function logMessage(entry) {
  messageLog.push({ ...entry, ts: new Date() });
  if (messageLog.length > MAX_LOG) messageLog.shift();
}

// ----- Webhook (Meta verification + incoming messages) -----
router.get('/webhook', (req, res) => {
  const challenge = wa.verifyWebhook(req.query);
  if (challenge) return res.status(200).send(challenge);
  res.sendStatus(403);
});

router.post('/webhook', express.json(), (req, res) => {
  res.sendStatus(200); // ack immediately
  try {
    const events = wa.parseWebhook(req.body);
    if (!events) return;
    for (const ev of events) {
      logMessage(ev);
      // Emit to socket.io for real-time UI
      if (req.app.get('io')) req.app.get('io').emit('whatsapp:event', ev);
    }
  } catch (e) { console.error('WA webhook error:', e); }
});

// ----- Send messages -----
router.post('/send/text', auth, async (req, res) => {
  try {
    const { to, text, previewUrl } = req.body;
    if (!to || !text) return res.status(400).json({ error: 'to and text required' });
    const result = await wa.sendText(to, text, previewUrl);
    logMessage({ kind: 'sent', type: 'text', to, text, result });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/template', auth, async (req, res) => {
  try {
    const { to, templateName, languageCode, components } = req.body;
    const result = await wa.sendTemplate(to, templateName, languageCode, components);
    logMessage({ kind: 'sent', type: 'template', to, templateName, result });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/image', auth, async (req, res) => {
  try {
    const { to, source, caption } = req.body;
    const result = await wa.sendImage(to, source, caption);
    logMessage({ kind: 'sent', type: 'image', to, source, result });
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/document', auth, async (req, res) => {
  try {
    const { to, source, filename, caption } = req.body;
    const result = await wa.sendDocument(to, source, filename, caption);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/buttons', auth, async (req, res) => {
  try {
    const { to, body, buttons, header, footer } = req.body;
    const result = await wa.sendButtons(to, body, buttons, header, footer);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/list', auth, async (req, res) => {
  try {
    const { to, body, buttonText, sections, header, footer } = req.body;
    const result = await wa.sendList(to, body, buttonText, sections, header, footer);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Pre-built business templates -----
router.post('/send/invoice', auth, async (req, res) => {
  try {
    const result = await wa.sendInvoiceNotification(req.body.to, req.body);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/reminder', auth, async (req, res) => {
  try {
    const result = await wa.sendPaymentReminder(req.body.to, req.body);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send/order-confirmation', auth, async (req, res) => {
  try {
    const result = await wa.sendOrderConfirmation(req.body.to, req.body);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Bulk send (rate-limited) -----
router.post('/send/bulk', auth, async (req, res) => {
  try {
    const { recipients, templateName, languageCode = 'en', components = [], delayMs = 1000 } = req.body;
    if (!Array.isArray(recipients) || !recipients.length)
      return res.status(400).json({ error: 'recipients[] required' });
    if (!templateName) return res.status(400).json({ error: 'templateName required for bulk send' });

    const results = [];
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    for (const to of recipients) {
      try {
        const r = await wa.sendTemplate(to, templateName, languageCode, components);
        results.push({ to, success: true, messageId: r.messages?.[0]?.id });
      } catch (e) {
        results.push({ to, success: false, error: e.message });
      }
      await sleep(delayMs);
    }
    res.json({ success: true, data: { sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length, results } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Status / Logs -----
router.get('/status', auth, (req, res) => {
  res.json({
    success: true,
    data: {
      configured: wa.isConfigured(),
      mode: wa.isConfigured() ? 'live' : 'mock',
      apiVersion: process.env.WA_API_VERSION || 'v20.0',
    },
  });
});

router.get('/logs', auth, (req, res) => {
  const { kind, type, limit = 100 } = req.query;
  let items = messageLog.slice().reverse();
  if (kind) items = items.filter(i => i.kind === kind);
  if (type) items = items.filter(i => i.type === type);
  res.json({ success: true, data: items.slice(0, parseInt(limit)) });
});

module.exports = router;
