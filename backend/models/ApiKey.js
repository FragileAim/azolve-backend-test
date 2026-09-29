/**
 * ApiKey Model — Public API authentication
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  keyPrefix: { type: String, required: true, index: true }, // visible: azk_live_xxx
  keyHash: { type: String, required: true }, // sha256 of full key
  scopes: [{ type: String }], // ['invoices:read', 'invoices:write', 'clients:*', '*']
  rateLimit: { type: Number, default: 1000 }, // per hour
  ipWhitelist: [String],
  lastUsedAt: Date,
  lastUsedIp: String,
  usageCount: { type: Number, default: 0 },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

apiKeySchema.statics.generate = function () {
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const random = crypto.randomBytes(24).toString('hex');
  const key = `azk_${env}_${random}`;
  const prefix = key.slice(0, 16);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
};

apiKeySchema.statics.verifyKey = async function (rawKey) {
  if (!rawKey || !rawKey.startsWith('azk_')) return null;
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await this.findOne({ keyHash: hash, isActive: true });
  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
  return apiKey;
};

apiKeySchema.methods.hasScope = function (required) {
  if (this.scopes.includes('*')) return true;
  if (this.scopes.includes(required)) return true;
  const [resource] = required.split(':');
  return this.scopes.includes(`${resource}:*`);
};

module.exports = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);
