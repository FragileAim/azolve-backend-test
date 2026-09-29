/**
 * Public API authentication middleware
 *
 * Looks for: Authorization: Bearer azk_xxx
 *         OR X-API-Key: azk_xxx
 */
const ApiKey = require('../models/ApiKey');

// In-memory rate limiter (per key, per hour)
const buckets = new Map();
function rateLimit(keyId, limit) {
  const now = Date.now();
  const hour = Math.floor(now / 3600000);
  const bucketKey = `${keyId}:${hour}`;
  const count = (buckets.get(bucketKey) || 0) + 1;
  buckets.set(bucketKey, count);

  // Clean old buckets
  if (buckets.size > 10000) {
    for (const k of buckets.keys()) {
      const [, h] = k.split(':');
      if (parseInt(h) < hour - 1) buckets.delete(k);
    }
  }
  return { allowed: count <= limit, count, remaining: Math.max(0, limit - count) };
}

module.exports = function apiKeyAuth(requiredScope) {
  return async (req, res, next) => {
    try {
      // Extract key
      let key = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) key = authHeader.slice(7).trim();
      if (!key) key = req.headers['x-api-key'];
      if (!key) return res.status(401).json({ error: 'Missing API key', code: 'NO_API_KEY' });

      const apiKey = await ApiKey.verifyKey(key);
      if (!apiKey) return res.status(401).json({ error: 'Invalid or expired API key', code: 'INVALID_KEY' });

      // IP whitelist
      if (apiKey.ipWhitelist && apiKey.ipWhitelist.length) {
        const ip = req.ip || req.connection?.remoteAddress;
        if (!apiKey.ipWhitelist.includes(ip)) {
          return res.status(403).json({ error: 'IP not whitelisted', code: 'IP_BLOCKED' });
        }
      }

      // Scope check
      if (requiredScope && !apiKey.hasScope(requiredScope)) {
        return res.status(403).json({
          error: `Missing required scope: ${requiredScope}`,
          code: 'INSUFFICIENT_SCOPE',
          required: requiredScope, granted: apiKey.scopes,
        });
      }

      // Rate limit
      const rl = rateLimit(apiKey._id.toString(), apiKey.rateLimit);
      res.set('X-RateLimit-Limit', apiKey.rateLimit);
      res.set('X-RateLimit-Remaining', rl.remaining);
      if (!rl.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded', code: 'RATE_LIMIT',
          limit: apiKey.rateLimit, retryAfter: 3600 - Math.floor((Date.now() % 3600000) / 1000),
        });
      }

      // Update usage (fire-and-forget)
      ApiKey.updateOne({ _id: apiKey._id }, {
        $set: { lastUsedAt: new Date(), lastUsedIp: req.ip },
        $inc: { usageCount: 1 },
      }).catch(() => {});

      // Attach to req
      req.apiKey = apiKey;
      req.user = { id: apiKey.createdBy, companyId: apiKey.companyId, isApiClient: true };
      next();
    } catch (err) {
      console.error('apiKeyAuth error:', err);
      res.status(500).json({ error: 'Authentication error', code: 'AUTH_ERROR' });
    }
  };
};
