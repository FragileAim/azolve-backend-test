const mongoose = require('mongoose');

// Stores the Canva Connect API OAuth connection for a single Azolve user.
// One Canva account can be connected per Azolve user (1:1). Tokens are
// refreshed automatically by backend/routes/canva.js whenever they're
// close to expiring — callers should never touch accessToken directly,
// they should go through getValidAccessToken() in that file.
const canvaAccountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenType: { type: String, default: 'Bearer' },
  scope: { type: String, default: '' },
  expiresAt: { type: Date, required: true }, // when accessToken expires

  canvaUserId: { type: String },       // Canva's internal user id (from /v1/users/me)
  canvaTeamId: { type: String },
  displayName: { type: String, default: '' },

  connectedAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('CanvaAccount', canvaAccountSchema);
