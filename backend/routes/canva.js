/**
 * Canva Connect API integration
 * ------------------------------------------------------------------
 * Real integration with Canva (not a clone) using Canva's official
 * Connect APIs: https://www.canva.dev/docs/connect/
 *
 * Flow:
 *  1. Each Azolve user connects their own Canva account once via OAuth
 *     2.0 Authorization Code + PKCE (GET /connect -> Canva -> GET /oauth/callback).
 *  2. Tokens are stored per-user in CanvaAccount and auto-refreshed.
 *  3. The rest of the endpoints proxy the Connect API on the user's
 *     behalf: create/list designs, create export jobs, upload assets,
 *     browse folders.
 *
 * Required environment variables (see .env.example):
 *   CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, CANVA_REDIRECT_URI
 *
 * NOTE: Canva's Connect API does not offer an embeddable in-page editor
 * for third-party apps — the real Canva editor only opens by navigating
 * to the design's `edit_url` (this is Canva's own restriction, the same
 * behavior every Connect API integration has). We open that in a new
 * tab, exactly like Canva's own starter kit and the "Edit in Canva"
 * buttons used by apps like HubSpot/Notion integrations.
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const multer = require('multer');

const User = require('../models/User');
const CanvaAccount = require('../models/CanvaAccount');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET) {
  console.warn('⚠️  Canva Studio: CANVA_CLIENT_ID / CANVA_CLIENT_SECRET not set in backend/.env — the "Connect to Canva" button will fail until these are filled in.');
}

const CANVA_API_BASE = 'https://api.canva.com/rest';
const CANVA_AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const CANVA_TOKEN_URL = `${CANVA_API_BASE}/v1/oauth/token`;

// Full scope set for a "can do everything the Connect API allows" integration.
const CANVA_SCOPES = [
  'design:content:read', 'design:content:write',
  'design:meta:read',
  'folder:read', 'folder:write',
  'asset:read', 'asset:write',
  'profile:read',
].join(' ');

// ---------------------------------------------------------------------
// In-memory PKCE/state store. Short-lived (OAuth handshake takes seconds),
// so an in-memory Map is fine for a single-node deployment — consistent
// with the rate limiter and other in-memory state already used in app.js.
// ---------------------------------------------------------------------
const pkceStore = new Map(); // state -> { verifier, userId, companyId, createdAt }
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000; // 10 min TTL
  for (const [state, entry] of pkceStore.entries()) {
    if (entry.createdAt < cutoff) pkceStore.delete(state);
  }
}, 5 * 60 * 1000).unref();

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generatePkcePair() {
  const verifier = base64url(crypto.randomBytes(64)); // 86 chars, within 43-128 spec
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function getEnvOrThrow(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

// ---------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------
async function requestToken(bodyParams) {
  const clientId = getEnvOrThrow('CANVA_CLIENT_ID');
  const clientSecret = getEnvOrThrow('CANVA_CLIENT_SECRET');
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error_description || data?.error || `Canva token request failed (${resp.status})`;
    throw new Error(msg);
  }
  return data; // { access_token, refresh_token, expires_in, scope, token_type }
}

async function exchangeCodeForToken({ code, verifier, redirectUri }) {
  return requestToken({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
}

async function refreshAccessToken(refreshToken) {
  return requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

// Returns a valid access token for the given userId, refreshing if needed.
// Throws if the user has never connected Canva.
async function getValidAccessToken(userId) {
  const account = await CanvaAccount.findOne({ user: userId });
  if (!account) {
    const err = new Error('Canva account not connected');
    err.code = 'NOT_CONNECTED';
    throw err;
  }

  const bufferMs = 2 * 60 * 1000; // refresh 2 min before real expiry
  if (account.expiresAt.getTime() - bufferMs > Date.now()) {
    account.lastUsedAt = new Date();
    await account.save();
    return account.accessToken;
  }

  // Expired (or about to) — refresh
  const tokenData = await refreshAccessToken(account.refreshToken);
  account.accessToken = tokenData.access_token;
  if (tokenData.refresh_token) account.refreshToken = tokenData.refresh_token;
  account.expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000);
  account.scope = tokenData.scope || account.scope;
  account.lastUsedAt = new Date();
  await account.save();
  return account.accessToken;
}

// Generic authenticated call to the Canva Connect API on behalf of a user.
async function canvaFetch(userId, path, { method = 'GET', body, headers = {}, isForm = false, raw = false } = {}) {
  const accessToken = await getValidAccessToken(userId);
  const finalHeaders = { Authorization: `Bearer ${accessToken}`, ...headers };
  if (!isForm && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  const resp = await fetch(`${CANVA_API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  });

  if (raw) return resp; // caller handles binary/streamed response

  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!resp.ok) {
    const message = data?.message || data?.error?.message || data?.error || `Canva API error (${resp.status})`;
    const err = new Error(message);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

function sendCanvaError(res, err) {
  if (err.code === 'NOT_CONNECTED') {
    return res.status(409).json({ success: false, code: 'NOT_CONNECTED', message: 'Canva account not connected. Please connect your Canva account first.' });
  }
  console.error('❌ Canva API error:', err.message);
  return res.status(err.status && err.status < 500 ? err.status : 502).json({ success: false, message: err.message || 'Canva API error' });
}

// =====================================================================
// OAuth — connect / callback / disconnect / status
// =====================================================================

// GET /api/canva/connect?token=<JWT>
// Browser navigation (popup window), so we can't send an Authorization
// header — the JWT is passed as a query param instead and verified here.
router.get('/connect', async (req, res) => {
  const errorPage = (title, message) => {
    res.status(500).set('Content-Type', 'text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Canva setup needed</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b12;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .card{text-align:left;max-width:480px;padding:32px 40px;background:#15151f;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
        .icon{font-size:34px;margin-bottom:8px}
        h2{margin:0 0 10px;font-size:18px}
        p{color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 10px}
        code{background:#232332;color:#c4b5fd;padding:2px 6px;border-radius:4px;font-size:13px}
        ol{color:#9ca3af;font-size:13.5px;line-height:1.8;padding-left:20px;margin:12px 0}
        button{background:#8b3dff;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;margin-top:8px}
      </style></head><body>
      <div class="card">
        <div class="icon">⚠️</div>
        <h2>${title}</h2>
        <p>${message}</p>
        <ol>
          <li>Open <code>backend/.env</code></li>
          <li>Fill in <code>CANVA_CLIENT_ID</code>, <code>CANVA_CLIENT_SECRET</code>, <code>CANVA_REDIRECT_URI</code></li>
          <li>Restart the backend server (stop and re-run <code>node server.js</code> / <code>npm run dev</code>)</li>
          <li>Come back to Canva Studio and click Connect again</li>
        </ol>
        <button onclick="window.close()">Close this window</button>
      </div>
      </body></html>`);
  };

  try {
    const token = req.query.token;
    if (!token) return res.status(401).send('Missing auth token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).send('Invalid or inactive user');

    let clientId, redirectUri;
    try {
      clientId = getEnvOrThrow('CANVA_CLIENT_ID');
      redirectUri = getEnvOrThrow('CANVA_REDIRECT_URI');
    } catch (envErr) {
      return errorPage('Canva isn\'t configured yet', `The backend is missing <code>${envErr.message.split(': ')[1]}</code> in <code>backend/.env</code>. Add your real Canva Client ID/Secret from the <a href="https://www.canva.com/developers" style="color:#c4b5fd">Canva Developer Portal</a> and restart the server.`);
    }

    const { verifier, challenge } = generatePkcePair();
    const state = base64url(crypto.randomBytes(24));
    pkceStore.set(state, {
      verifier,
      userId: user._id.toString(),
      companyId: user.company.toString(),
      createdAt: Date.now(),
    });

    const authUrl = new URL(CANVA_AUTHORIZE_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', CANVA_SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 's256');

    res.redirect(authUrl.toString());
  } catch (err) {
    console.error('❌ Canva connect error:', err.message);
    errorPage('Couldn\'t start Canva connection', escapeForHtml(err.message));
  }
});

function escapeForHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// GET /api/canva/oauth/callback — Canva redirects here after user approval
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  const closePage = (ok, message) => {
    res.set('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Canva</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b12;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .card{text-align:center;padding:32px 40px;background:#15151f;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.4)}
        .icon{font-size:40px;margin-bottom:12px}
        h2{margin:0 0 8px;font-size:18px}
        p{color:#9ca3af;font-size:14px;margin:0 0 18px}
        button{background:#8b3dff;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer}
      </style></head><body>
      <div class="card">
        <div class="icon">${ok ? '✅' : '⚠️'}</div>
        <h2>${ok ? 'Canva connected' : 'Connection failed'}</h2>
        <p>${message}</p>
        <button onclick="window.close()">Close this window</button>
      </div>
      <script>
        try { window.opener && window.opener.postMessage({ source:'azolve-canva', type: '${ok ? 'canva-connected' : 'canva-error'}', message: ${JSON.stringify(message)} }, '*'); } catch(e){}
        setTimeout(function(){ window.close(); }, ${ok ? 1200 : 4000});
      </script>
      </body></html>`);
  };

  try {
    if (error) return closePage(false, error_description || error);
    if (!code || !state || !pkceStore.has(state)) {
      return closePage(false, 'Invalid or expired connection request. Please try again.');
    }

    const entry = pkceStore.get(state);
    pkceStore.delete(state);

    const redirectUri = getEnvOrThrow('CANVA_REDIRECT_URI');
    const tokenData = await exchangeCodeForToken({ code, verifier: entry.verifier, redirectUri });

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 14400) * 1000);

    // Fetch Canva profile for a friendly display name
    let profile = {};
    try {
      const profResp = await fetch(`${CANVA_API_BASE}/v1/users/me/profile`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (profResp.ok) profile = await profResp.json();
    } catch { /* non-fatal */ }

    await CanvaAccount.findOneAndUpdate(
      { user: entry.userId },
      {
        user: entry.userId,
        company: entry.companyId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || CANVA_SCOPES,
        expiresAt,
        displayName: profile.display_name || '',
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    closePage(true, 'Your Canva account is now connected. You can start creating designs.');
  } catch (err) {
    console.error('❌ Canva callback error:', err.message);
    closePage(false, err.message || 'Something went wrong connecting your Canva account.');
  }
});

// GET /api/canva/status — is this user connected? basic profile info
router.get('/status', protect, async (req, res) => {
  try {
    const account = await CanvaAccount.findOne({ user: req.user._id });
    if (!account) return res.json({ success: true, connected: false });
    res.json({
      success: true,
      connected: true,
      displayName: account.displayName,
      connectedAt: account.connectedAt,
      scope: account.scope,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/canva/disconnect
router.post('/disconnect', protect, async (req, res) => {
  try {
    const account = await CanvaAccount.findOne({ user: req.user._id });
    if (account) {
      // Best-effort revoke on Canva's side too
      try {
        const clientId = getEnvOrThrow('CANVA_CLIENT_ID');
        const clientSecret = getEnvOrThrow('CANVA_CLIENT_SECRET');
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        await fetch(`${CANVA_API_BASE}/v1/oauth/revoke`, {
          method: 'POST',
          headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: account.accessToken }).toString(),
        });
      } catch { /* non-fatal */ }
      await account.deleteOne();
    }
    res.json({ success: true, message: 'Canva account disconnected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =====================================================================
// Designs
// =====================================================================

// GET /api/canva/designs?query=&continuation=
router.get('/designs', protect, async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.query) params.set('query', req.query.query);
    if (req.query.continuation) params.set('continuation', req.query.continuation);
    params.set('ownership', 'owned');
    params.set('sort_by', 'modified_descending');

    const data = await canvaFetch(req.user._id, `/v1/designs?${params.toString()}`);
    res.json({ success: true, ...data });
  } catch (err) { sendCanvaError(res, err); }
});

// POST /api/canva/designs  { presetType?, width?, height?, title?, assetId? }
// presetType must be one of: doc, email, presentation, whiteboard (Canva's
// only valid preset names for the Create Design API). For social-media
// sizes (Instagram post, poster, etc.) the frontend sends width/height
// instead — Canva doesn't have named presets for those, only pixel sizes.
const VALID_PRESETS = ['doc', 'email', 'presentation', 'whiteboard'];

router.post('/designs', protect, async (req, res) => {
  try {
    const { presetType, width, height, title, assetId } = req.body;

    let design_type;
    if (presetType && VALID_PRESETS.includes(presetType)) {
      design_type = { type: 'preset', name: presetType };
    } else if (width && height) {
      design_type = { type: 'custom', width: Number(width), height: Number(height) };
    } else if (!assetId) {
      return res.status(400).json({ success: false, message: 'Provide a valid presetType, width/height, or assetId' });
    }

    const body = { type: 'type_and_asset' };
    if (design_type) body.design_type = design_type;
    if (title) body.title = title;
    if (assetId) body.asset_id = assetId;

    const data = await canvaFetch(req.user._id, '/v1/designs', { method: 'POST', body });
    res.json({ success: true, design: data.design });
  } catch (err) { sendCanvaError(res, err); }
});

// GET /api/canva/designs/:id — refresh a single design's metadata/thumbnail
router.get('/designs/:id', protect, async (req, res) => {
  try {
    const data = await canvaFetch(req.user._id, `/v1/designs/${req.params.id}`);
    res.json({ success: true, design: data.design });
  } catch (err) { sendCanvaError(res, err); }
});

// =====================================================================
// Exports
// =====================================================================

// POST /api/canva/designs/:id/export  { format: 'pdf'|'png'|'jpg'|'pptx'|'gif'|'mp4'|'csv', pages?, quality?(jpg 1-100), videoQuality?(mp4) }
router.post('/designs/:id/export', protect, async (req, res) => {
  try {
    const { format = 'png', pages, quality, videoQuality } = req.body;
    const formatBody = { type: format };
    if (pages && Array.isArray(pages) && pages.length) formatBody.pages = pages;
    if (format === 'jpg') formatBody.quality = quality || 90; // required by Canva for jpg
    if (format === 'mp4') formatBody.quality = videoQuality || 'horizontal_1080p'; // required by Canva for mp4

    const data = await canvaFetch(req.user._id, '/v1/exports', {
      method: 'POST',
      body: { design_id: req.params.id, format: formatBody },
    });
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// GET /api/canva/exports/:jobId — poll export job status
router.get('/exports/:jobId', protect, async (req, res) => {
  try {
    const data = await canvaFetch(req.user._id, `/v1/exports/${req.params.jobId}`);
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// =====================================================================
// Assets
// =====================================================================

// POST /api/canva/assets/upload — multipart file upload -> Canva asset
router.post('/assets/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });

    const nameB64 = base64url(Buffer.from(req.file.originalname || 'asset', 'utf-8'));
    const metadata = JSON.stringify({ name_base64: nameB64 });

    const data = await canvaFetch(req.user._id, '/v1/asset-uploads', {
      method: 'POST',
      isForm: true,
      headers: {
        'Content-Type': req.file.mimetype || 'application/octet-stream',
        'Asset-Upload-Metadata': metadata,
      },
      body: req.file.buffer,
    });
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// GET /api/canva/assets/upload/:jobId — poll asset upload job
router.get('/assets/upload/:jobId', protect, async (req, res) => {
  try {
    const data = await canvaFetch(req.user._id, `/v1/asset-uploads/${req.params.jobId}`);
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// POST /api/canva/assets/from-url  { url, name }
router.post('/assets/from-url', protect, async (req, res) => {
  try {
    const { url, name } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'url is required' });
    const data = await canvaFetch(req.user._id, '/v1/url-asset-uploads', {
      method: 'POST',
      body: { url, name: name || 'Azolve asset' },
    });
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// GET /api/canva/assets/from-url/:jobId — poll URL asset upload job
router.get('/assets/from-url/:jobId', protect, async (req, res) => {
  try {
    const data = await canvaFetch(req.user._id, `/v1/url-asset-uploads/${req.params.jobId}`);
    res.json({ success: true, job: data.job });
  } catch (err) { sendCanvaError(res, err); }
});

// =====================================================================
// Folders
// =====================================================================

// GET /api/canva/folders/:folderId/items — default folderId "root"
router.get('/folders/:folderId/items', protect, async (req, res) => {
  try {
    const folderId = req.params.folderId || 'root';
    const params = new URLSearchParams();
    if (req.query.continuation) params.set('continuation', req.query.continuation);
    const data = await canvaFetch(req.user._id, `/v1/folders/${folderId}/items?${params.toString()}`);
    res.json({ success: true, ...data });
  } catch (err) { sendCanvaError(res, err); }
});

module.exports = router;
