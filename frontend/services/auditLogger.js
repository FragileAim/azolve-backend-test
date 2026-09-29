/**
 * Audit Logger Service
 * Drop-in helper to log actions from anywhere in the codebase
 */
const AuditLog = require('../models/AuditLog');

class AuditLogger {
  /**
   * Log an action
   * @param {Object} params
   * @param {Object} params.req - Express request (optional, auto-extracts user/ip)
   * @param {String} params.action - Action type
   * @param {String} params.resource - Resource type
   * @param {String} params.resourceId - Resource ID
   * @param {String} params.resourceName - Human-readable name
   * @param {String} params.description - Description of what happened
   * @param {Object} params.changes - { before, after } for updates
   * @param {String} params.severity - 'info' | 'warning' | 'critical'
   * @param {Boolean} params.success - default true
   */
  static async log(params) {
    try {
      const {
        req,
        action,
        resource,
        resourceId,
        resourceName,
        description,
        changes,
        severity = 'info',
        success = true,
        errorMessage,
        metadata,
      } = params;

      let userId, userName, userEmail, companyId, ipAddress, userAgent, endpoint, method;

      if (req) {
        userId = req.user?._id || req.user?.id;
        userName = req.user?.name;
        userEmail = req.user?.email;
        companyId = req.user?.companyId || req.headers['x-company-id'];
        ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
        userAgent = req.headers?.['user-agent'];
        endpoint = req.originalUrl;
        method = req.method;
      }

      // Override with explicit values if provided
      userId = params.userId || userId;
      userName = params.userName || userName;
      companyId = params.companyId || companyId;

      if (!companyId) {
        console.warn('[AuditLogger] Skipping log — no companyId');
        return null;
      }

      const log = await AuditLog.create({ company: companyId,
        userId,
        userName,
        userEmail,
        action,
        resource,
        resourceId,
        resourceName,
        description,
        changes,
        severity,
        success,
        errorMessage,
        ipAddress,
        userAgent,
        endpoint,
        method,
        metadata,
      });

      // Emit to socket for real-time activity feed
      try {
        const io = global.io || require('../server').io;
        if (io && companyId) {
          io.to(`company:${companyId}`).emit('audit:new', {
            id: log._id,
            action,
            resource,
            resourceName,
            description,
            userName,
            severity,
            createdAt: log.createdAt,
          });
        }
      } catch (e) { /* non-fatal */ }

      return log;
    } catch (err) {
      console.error('[AuditLogger] Failed to log:', err.message);
      return null;
    }
  }

  /**
   * Express middleware that auto-logs based on route
   */
  static middleware(options = {}) {
    return async (req, res, next) => {
      const startTime = Date.now();
      const oldJson = res.json.bind(res);

      res.json = function (data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;

        // Determine action from method
        const actionMap = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete', GET: 'view' };
        const action = options.action || actionMap[req.method] || 'api_call';

        // Skip GET requests unless explicitly enabled
        if (req.method === 'GET' && !options.logReads) {
          return oldJson(data);
        }

        // Extract resource from URL path
        const resource = options.resource || (req.baseUrl?.split('/').pop() || 'unknown');

        AuditLogger.log({
          req,
          action,
          resource,
          resourceId: data?.data?._id || data?._id || req.params.id,
          resourceName: data?.data?.name || data?.name,
          description: options.description || `${action} ${resource}`,
          success,
          severity: success ? 'info' : 'warning',
          metadata: { duration, statusCode: res.statusCode },
        });

        return oldJson(data);
      };

      next();
    };
  }
}

module.exports = AuditLogger;
