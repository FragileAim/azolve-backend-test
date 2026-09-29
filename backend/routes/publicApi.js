/**
 * Public API + Webhooks routes
 *
 * Mount as:  app.use('/api/v1/public', require('./routes/publicApi'));
 *            app.use('/api/webhooks', require('./routes/publicApi').webhooksAdmin);
 */
const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiKeyAuth');
const dispatcher = require('../services/webhookDispatcher');
const ApiKey = require('../models/ApiKey');
const { Webhook, WebhookDelivery, WEBHOOK_EVENTS } = require('../models/Webhook');
const crypto = require('crypto');

// Lazy-load existing models
function tryRequire(...paths) {
  for (const p of paths) { try { return require(p); } catch (_) {} }
  return null;
}
const Invoice = tryRequire('../models/Invoice');
const Client = tryRequire('../models/Client');
const Lead = tryRequire('../models/Lead');
const Product = tryRequire('../models/Product');

// ===========================================================
//  PUBLIC API v1 — Authenticated by API key
// ===========================================================
const publicApi = express.Router();

publicApi.get('/', (req, res) => {
  res.json({
    name: 'Azolve Public API',
    version: '1.0.0',
    documentation: 'https://docs.azolve.io/api',
    endpoints: {
      invoices: '/api/v1/public/invoices',
      clients: '/api/v1/public/clients',
      leads: '/api/v1/public/leads',
      products: '/api/v1/public/products',
      webhooks: '/api/v1/public/webhooks',
    },
  });
});

// ----- INVOICES -----
if (Invoice) {
  publicApi.get('/invoices', apiKeyAuth('invoices:read'), async (req, res) => {
    try {
      const { status, from, to, limit = 50, page = 1 } = req.query;
      const q = { company: req.user.companyId };
      if (status) q.status = status;
      if (from || to) {
        q.invoiceDate = {};
        if (from) q.invoiceDate.$gte = new Date(from);
        if (to) q.invoiceDate.$lte = new Date(to);
      }
      const docs = await Invoice.find(q).sort('-invoiceDate').skip((page - 1) * limit).limit(parseInt(limit)).lean();
      const total = await Invoice.countDocuments(q);
      res.json({ data: docs, total, page: parseInt(page) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  publicApi.get('/invoices/:id', apiKeyAuth('invoices:read'), async (req, res) => {
    try {
      const inv = await Invoice.findOne({ _id: req.params.id, company: req.user.companyId }).lean();
      if (!inv) return res.status(404).json({ error: 'Not found' });
      res.json({ data: inv });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  publicApi.post('/invoices', apiKeyAuth('invoices:write'), async (req, res) => {
    try {
      const inv = await Invoice.create({ ...req.body, company: req.user.companyId });
      dispatcher.trigger(req.user.companyId, 'invoice.created', inv).catch(() => {});
      res.status(201).json({ data: inv });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
}

// ----- CLIENTS -----
if (Client) {
  publicApi.get('/clients', apiKeyAuth('clients:read'), async (req, res) => {
    try {
      const { limit = 50, page = 1, search } = req.query;
      const q = { company: req.user.companyId };
      if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
      const docs = await Client.find(q).sort('-createdAt').skip((page - 1) * limit).limit(parseInt(limit)).lean();
      const total = await Client.countDocuments(q);
      res.json({ data: docs, total, page: parseInt(page) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  publicApi.post('/clients', apiKeyAuth('clients:write'), async (req, res) => {
    try {
      const c = await Client.create({ ...req.body, company: req.user.companyId });
      dispatcher.trigger(req.user.companyId, 'client.created', c).catch(() => {});
      res.status(201).json({ data: c });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
}

// ----- LEADS -----
if (Lead) {
  publicApi.get('/leads', apiKeyAuth('leads:read'), async (req, res) => {
    try {
      const docs = await Lead.find({ company: req.user.companyId }).limit(100).lean();
      res.json({ data: docs });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  publicApi.post('/leads', apiKeyAuth('leads:write'), async (req, res) => {
    try {
      const l = await Lead.create({ ...req.body, company: req.user.companyId });
      dispatcher.trigger(req.user.companyId, 'lead.created', l).catch(() => {});
      res.status(201).json({ data: l });
    } catch (e) { res.status(400).json({ error: e.message }); }
  });
}

// ----- PRODUCTS -----
if (Product) {
  publicApi.get('/products', apiKeyAuth('products:read'), async (req, res) => {
    try {
      const docs = await Product.find({ company: req.user.companyId }).limit(100).lean();
      res.json({ data: docs });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// ----- WEBHOOK MANAGEMENT (via API) -----
publicApi.get('/webhooks', apiKeyAuth('webhooks:read'), async (req, res) => {
  const hooks = await Webhook.find({ company: req.user.companyId }).select('-secret').lean();
  res.json({ data: hooks });
});

publicApi.post('/webhooks', apiKeyAuth('webhooks:write'), async (req, res) => {
  try {
    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
    const hook = await Webhook.create({ ...req.body, company: req.user.companyId, secret });
    res.status(201).json({ data: { ...hook.toObject(), secret } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ===========================================================
//  WEBHOOK ADMIN — Authenticated by user session (UI)
// ===========================================================
const webhooksAdmin = express.Router();
const { protect: __protect } = require('../middleware/auth');
const __normalize = (req, res, next) => {
  if (req.user) {
    req.user.id = req.user.id || (req.user._id && req.user._id.toString());
    req.user.companyId = req.user.companyId || req.companyId ||
      (req.user.company && (req.user.company._id || req.user.company));
  }
  next();
};
const userAuth = [__protect, __normalize];

webhooksAdmin.get('/events', userAuth, (req, res) => res.json({ data: WEBHOOK_EVENTS }));

webhooksAdmin.get('/', userAuth, async (req, res) => {
  const hooks = await Webhook.find({ company: req.user.companyId }).lean();
  res.json({ data: hooks });
});

webhooksAdmin.post('/', userAuth, async (req, res) => {
  try {
    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');
    const hook = await Webhook.create({ ...req.body, company: req.user.companyId, secret, createdBy: req.user.id });
    res.status(201).json({ data: hook });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

webhooksAdmin.put('/:id', userAuth, async (req, res) => {
  try {
    const hook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, company: req.user.companyId },
      req.body, { new: true });
    if (!hook) return res.status(404).json({ error: 'Not found' });
    res.json({ data: hook });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

webhooksAdmin.delete('/:id', userAuth, async (req, res) => {
  await Webhook.deleteOne({ _id: req.params.id, company: req.user.companyId });
  res.json({ success: true });
});

webhooksAdmin.post('/:id/test', userAuth, async (req, res) => {
  const hook = await Webhook.findOne({ _id: req.params.id, company: req.user.companyId });
  if (!hook) return res.status(404).json({ error: 'Not found' });
  const result = await dispatcher.test(hook, req.body.payload);
  res.json({ data: result });
});

webhooksAdmin.post('/:id/regenerate-secret', userAuth, async (req, res) => {
  const newSecret = 'whsec_' + crypto.randomBytes(24).toString('hex');
  const hook = await Webhook.findOneAndUpdate(
    { _id: req.params.id, company: req.user.companyId },
    { secret: newSecret }, { new: true });
  if (!hook) return res.status(404).json({ error: 'Not found' });
  res.json({ data: { secret: newSecret } });
});

webhooksAdmin.get('/:id/deliveries', userAuth, async (req, res) => {
  const items = await WebhookDelivery.find({ webhookId: req.params.id, company: req.user.companyId })
    .sort('-createdAt').limit(100).lean();
  res.json({ data: items });
});

// ===========================================================
//  API KEYS MANAGEMENT (UI auth)
// ===========================================================
const apiKeysAdmin = express.Router();
apiKeysAdmin.get('/', userAuth, async (req, res) => {
  const keys = await ApiKey.find({ company: req.user.companyId }).select('-keyHash').lean();
  res.json({ data: keys });
});

apiKeysAdmin.post('/', userAuth, async (req, res) => {
  try {
    const { name, scopes = ['*'], rateLimit, expiresAt, ipWhitelist } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { key, prefix, hash } = ApiKey.generate();
    const apiKey = await ApiKey.create({
      company: req.user.companyId, name, scopes, rateLimit, expiresAt, ipWhitelist,
      keyPrefix: prefix, keyHash: hash, createdBy: req.user.id,
    });
    res.status(201).json({
      data: { ...apiKey.toObject(), key }, // Show full key ONCE on creation
      warning: 'Save this key — it will not be shown again',
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

apiKeysAdmin.delete('/:id', userAuth, async (req, res) => {
  await ApiKey.findOneAndUpdate(
    { _id: req.params.id, company: req.user.companyId },
    { isActive: false, revokedAt: new Date(), revokedBy: req.user.id });
  res.json({ success: true });
});

apiKeysAdmin.get('/scopes', userAuth, (req, res) => {
  res.json({ data: [
    '*', 'invoices:read', 'invoices:write', 'invoices:*',
    'clients:read', 'clients:write', 'clients:*',
    'leads:read', 'leads:write', 'leads:*',
    'products:read', 'products:write', 'products:*',
    'webhooks:read', 'webhooks:write', 'webhooks:*',
  ]});
});

module.exports = publicApi;
module.exports.publicApi = publicApi;
module.exports.webhooksAdmin = webhooksAdmin;
module.exports.apiKeysAdmin = apiKeysAdmin;
module.exports.dispatcher = dispatcher;
