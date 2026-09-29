/**
 * Remote Access Suite API Routes
 *
 * This does NOT build remote-control functionality from scratch — that
 * requires the actual tool (AnyDesk, ConnectWise Control, TeamViewer, Chrome
 * Remote Desktop) to already be installed/running on the client's machine.
 * What this DOES do:
 *   - stores which tool + ID/link each client uses
 *   - launches the real tool via its documented URI scheme / access link
 *   - keeps a mandatory, timestamped audit log of every access attempt —
 *     who connected, to which client, why, and how it was resolved
 *
 * GET    /api/remote-access/profiles          — all clients + their saved remote-access setup
 * GET    /api/remote-access/profile/:clientId — one client's profile
 * PUT    /api/remote-access/profile/:clientId — create/update a client's profile
 * POST   /api/remote-access/connect           — log an access attempt + get the launch URL
 * PUT    /api/remote-access/log/:id/end       — close out a session with resolution notes
 * GET    /api/remote-access/logs              — audit log (filterable, paginated)
 * GET    /api/remote-access/stats             — quick counts for the dashboard header
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Client = require('../models/Client');
const RemoteAccessProfile = require('../models/RemoteAccessProfile');
const RemoteAccessLog = require('../models/RemoteAccessLog');
const { paginate, buildSort } = require('../utils/helpers');

router.use(protect);

const TOOL_LABELS = {
  anydesk: 'AnyDesk',
  connectwise: 'ConnectWise Control',
  teamviewer: 'TeamViewer',
  chrome_remote_desktop: 'Chrome Remote Desktop',
  other: 'Other',
};

function buildLaunchUrl(tool, identifier) {
  const id = (identifier || '').trim();
  if (/^https?:\/\//i.test(id)) {
    // Already a full link (typical for ConnectWise Control access URLs, or a
    // pasted Chrome Remote Desktop / "other" link) — use it as-is.
    return { launchUrl: id, mode: 'link' };
  }
  if (tool === 'anydesk') {
    const cleanId = id.replace(/\s+/g, '');
    return { launchUrl: `anydesk:${cleanId}`, mode: 'protocol' };
  }
  if (tool === 'teamviewer') {
    const cleanId = id.replace(/\s+/g, '');
    return { launchUrl: `teamviewer10://control?device=${cleanId}&type=control`, mode: 'protocol' };
  }
  if (tool === 'chrome_remote_desktop') {
    // Support codes are one-time and typically entered by hand — send the
    // tech to the support page rather than guessing a broken deep link.
    return { launchUrl: 'https://remotedesktop.google.com/support', mode: 'manual', manualValue: id };
  }
  // 'other' with a non-URL identifier — we don't know the protocol, so don't
  // guess; hand the raw value back for the tech to use manually.
  return { launchUrl: null, mode: 'manual', manualValue: id };
}

// ---------------------------------------------------------------
// GET /api/remote-access/profiles — every client + their setup (or lack of one)
// ---------------------------------------------------------------
router.get('/profiles', async (req, res) => {
  try {
    const clients = await Client.find({ company: req.companyId, status: { $ne: 'blocked' } })
      .select('name contactPerson email phone')
      .sort({ name: 1 })
      .lean();
    const profiles = await RemoteAccessProfile.find({ company: req.companyId }).lean();
    const byClient = new Map(profiles.map(p => [String(p.client), p]));

    const merged = clients.map(c => {
      const p = byClient.get(String(c._id));
      return {
        clientId: c._id,
        clientName: c.name,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        configured: !!p,
        tool: p ? p.tool : null,
        toolLabel: p ? TOOL_LABELS[p.tool] : null,
        identifier: p ? p.identifier : null,
        contactForAccess: p ? p.contactForAccess : null,
        notes: p ? p.notes : null,
        updatedAt: p ? p.updatedAt : null,
      };
    });

    const search = (req.query.search || '').toLowerCase();
    const filtered = search ? merged.filter(m => m.clientName.toLowerCase().includes(search)) : merged;

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// GET /api/remote-access/profile/:clientId
// ---------------------------------------------------------------
router.get('/profile/:clientId', async (req, res) => {
  try {
    const profile = await RemoteAccessProfile.findOne({ company: req.companyId, client: req.params.clientId });
    res.json({ success: true, data: profile || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// PUT /api/remote-access/profile/:clientId — create or update
// ---------------------------------------------------------------
router.put('/profile/:clientId', async (req, res) => {
  try {
    const { tool, identifier, contactForAccess, notes } = req.body || {};
    if (!tool || !TOOL_LABELS[tool]) return res.status(400).json({ success: false, message: 'Please choose a valid remote access tool.' });
    if (!identifier || !identifier.trim()) return res.status(400).json({ success: false, message: 'Please provide the AnyDesk ID / access link / identifier for this client.' });

    const client = await Client.findOne({ _id: req.params.clientId, company: req.companyId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found.' });

    const profile = await RemoteAccessProfile.findOneAndUpdate(
      { company: req.companyId, client: req.params.clientId },
      {
        company: req.companyId, client: req.params.clientId, tool,
        identifier: identifier.trim(), contactForAccess: (contactForAccess || '').trim(),
        notes: (notes || '').trim(), updatedBy: req.user.id || req.user._id,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// POST /api/remote-access/connect — log the attempt, return the launch URL
// ---------------------------------------------------------------
router.post('/connect', async (req, res) => {
  try {
    const { clientId, reason, ticketId } = req.body || {};
    if (!clientId) return res.status(400).json({ success: false, message: 'clientId is required.' });
    if (!reason || !reason.trim()) return res.status(400).json({ success: false, message: 'Please note why you\'re connecting — it\'s saved to the audit log.' });

    const profile = await RemoteAccessProfile.findOne({ company: req.companyId, client: clientId });
    if (!profile) return res.status(404).json({ success: false, message: 'No remote access is set up for this client yet. Add their AnyDesk ID / access link first.' });

    const { launchUrl, mode, manualValue } = buildLaunchUrl(profile.tool, profile.identifier);

    const log = await RemoteAccessLog.create({
      company: req.companyId, client: clientId, tool: profile.tool, identifier: profile.identifier,
      initiatedBy: req.user.id || req.user._id, reason: reason.trim(),
      ticket: ticketId || undefined, status: 'open', startedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        logId: log._id, tool: profile.tool, toolLabel: TOOL_LABELS[profile.tool],
        launchUrl, mode, manualValue: manualValue || null,
        contactForAccess: profile.contactForAccess || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// PUT /api/remote-access/log/:id/end — close out a session
// ---------------------------------------------------------------
router.put('/log/:id/end', async (req, res) => {
  try {
    const log = await RemoteAccessLog.findOneAndUpdate(
      { _id: req.params.id, company: req.companyId },
      { status: 'completed', endedAt: new Date(), resolutionNotes: (req.body?.resolutionNotes || '').trim() },
      { new: true }
    );
    if (!log) return res.status(404).json({ success: false, message: 'Session log not found.' });
    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// GET /api/remote-access/logs — audit trail
// ---------------------------------------------------------------
router.get('/logs', async (req, res) => {
  try {
    const query = { company: req.companyId };
    if (req.query.client) query.client = req.query.client;
    if (req.query.status) query.status = req.query.status;
    if (req.query.initiatedBy) query.initiatedBy = req.query.initiatedBy;
    const sort = buildSort(req, '-createdAt');
    const result = await paginate(RemoteAccessLog, query, req.query.page, req.query.limit, sort, 'client initiatedBy ticket');
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------
// GET /api/remote-access/stats
// ---------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const c = req.companyId;
    const [configuredClients, totalClients, openSessions, sessionsThisMonth] = await Promise.all([
      RemoteAccessProfile.countDocuments({ company: c }),
      Client.countDocuments({ company: c, status: { $ne: 'blocked' } }),
      RemoteAccessLog.countDocuments({ company: c, status: 'open' }),
      RemoteAccessLog.countDocuments({ company: c, createdAt: { $gte: new Date(new Date().setDate(1)) } }),
    ]);
    res.json({ success: true, data: { configuredClients, totalClients, openSessions, sessionsThisMonth } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
