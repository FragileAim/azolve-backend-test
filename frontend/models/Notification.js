/**
 * Notification Model
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  // null userId = company-wide

  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'reminder',
           'invoice', 'payment', 'task', 'lead', 'mention', 'system', 'churn'],
    default: 'info',
    index: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: String, // emoji or icon class
  url: String,  // deep-link
  actions: [{ label: String, url: String, style: String }],

  resource: { type: String, ref: 'resource' },
  resourceId: { type: mongoose.Schema.Types.ObjectId },

  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  read: { type: Boolean, default: false, index: true },
  readAt: Date,
  dismissed: { type: Boolean, default: false, index: true },
  expiresAt: Date,
}, { timestamps: true });

notificationSchema.index({ companyId: 1, userId: 1, read: 1, createdAt: -1 });
// Auto-cleanup after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
