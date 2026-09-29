/**
 * AuditLog Model
 * Tracks every significant action across the system
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userName: { type: String },
  userEmail: { type: String },

  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'view',
      'login', 'logout', 'login_failed',
      'export', 'import', 'send', 'receive',
      'pay', 'refund', 'approve', 'reject',
      'assign', 'unassign', 'archive', 'restore',
      'permission_change', 'role_change', 'settings_change',
      'api_call', 'webhook_trigger', 'workflow_run',
    ],
    index: true,
  },

  resource: { type: String, required: true, index: true }, // 'invoice', 'client', 'user', etc.
  resourceId: { type: mongoose.Schema.Types.ObjectId, index: true },
  resourceName: { type: String }, // human-readable

  description: { type: String, required: true },

  // Before/after for updates
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
  },

  // Context
  ipAddress: { type: String },
  userAgent: { type: String },
  endpoint: { type: String },
  method: { type: String },

  // Severity
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true,
  },

  // Status
  success: { type: Boolean, default: true },
  errorMessage: { type: String },

  // Metadata
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

// Compound indexes for common queries
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, resource: 1, resourceId: 1 });
auditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });

// TTL — auto-delete logs older than 1 year (configurable)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
