/**
 * Azolve V2 — Route registration helper
 *
 * Drop this file into your existing azolve-backend project, then in app.js add:
 *
 *   const registerV2 = require('./routes/v2-features');
 *   registerV2(app, io);  // io is your socket.io instance (optional)
 *
 * It will mount all v2 routes and attach socket-aware services.
 */
const path = require('path');

module.exports = function registerV2Features(app, io) {
  // ---------- Services that need io ----------
  if (io) {
    try {
      const notif = require('./services/notificationService');
      notif.setIo(io);
    } catch (_) {}
    app.set('io', io);
    io.on('connection', (socket) => {
      const { userId, companyId } = socket.handshake.auth || {};
      if (userId) socket.join(`user:${userId}`);
      if (companyId) socket.join(`company:${companyId}`);
    });
  }

  // ---------- Routes ----------
  const safeMount = (mountPath, modulePath) => {
    try {
      app.use(mountPath, require(modulePath));
      console.log(`✓ Mounted ${mountPath} → ${modulePath}`);
    } catch (e) {
      console.warn(`✗ Skipped ${mountPath}: ${e.message}`);
    }
  };

  safeMount('/api/audit-logs', './routes/auditLogs');
  safeMount('/api/search', './routes/search');
  safeMount('/api/copilot', './routes/copilot');
  safeMount('/api/einvoice', './routes/einvoice');
  safeMount('/api/churn', './routes/churn');
  safeMount('/api/workflows', './routes/workflows');
  safeMount('/api/bank-statements', './routes/bankStatements');
  safeMount('/api/whatsapp', './routes/whatsapp');
  safeMount('/api/notifications', './routes/notifications');
  safeMount('/api/activity', './routes/activityTimeline');

  // Public API + admin sub-routers
  try {
    const publicApi = require('./routes/publicApi');
    app.use('/api/v1/public', publicApi.publicApi);
    app.use('/api/webhooks', publicApi.webhooksAdmin);
    app.use('/api/api-keys', publicApi.apiKeysAdmin);
    console.log('✓ Mounted /api/v1/public, /api/webhooks, /api/api-keys');
    // Expose dispatcher globally so business logic can call it
    app.set('webhookDispatcher', publicApi.dispatcher);
  } catch (e) {
    console.warn(`✗ Skipped public API: ${e.message}`);
  }

  // ---------- Audit logger middleware ----------
  try {
    const auditLogger = require('./services/auditLogger');
    app.use(auditLogger.middleware ? auditLogger.middleware() : (req, res, next) => next());
  } catch (_) {}

  // ---------- Locale files (Hindi etc.) ----------
  try {
    const express = require('express');
    app.use('/locales', express.static(path.join(__dirname, '../public/locales')));
    app.use('/css', express.static(path.join(__dirname, '../public/css')));
    app.use('/js', express.static(path.join(__dirname, '../public/js')));
  } catch (_) {}

  return {
    triggerWebhook(companyId, event, data) {
      const d = app.get('webhookDispatcher');
      if (d) return d.trigger(companyId, event, data);
    },
    notify(data) {
      try { return require('./services/notificationService').create(data); } catch(_) {}
    },
    audit(data) {
      try { return require('./services/auditLogger').log(data); } catch(_) {}
    },
  };
};
