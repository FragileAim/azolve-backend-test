/**
 * Webhook Model — Outbound event subscriptions
 */
const mongoose = require('mongoose');

const WEBHOOK_EVENTS = [
  // Invoice
  'invoice.created', 'invoice.updated', 'invoice.paid', 'invoice.overdue', 'invoice.cancelled',
  // Client
  'client.created', 'client.updated', 'client.deleted',
  // Lead / Deal
  'lead.created', 'lead.converted', 'deal.created', 'deal.won', 'deal.lost',
  // Payment
  'payment.received', 'payment.failed', 'payment.refunded',
  // Project / Task
  'project.created', 'project.completed', 'task.created', 'task.completed',
  // Employee
  'employee.created', 'employee.updated', 'attendance.checked_in', 'leave.requested', 'leave.approved',
  // Inventory
  'product.created', 'product.low_stock', 'product.out_of_stock',
  // Misc
  'ticket.created', 'ticket.resolved',
];

const webhookSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  events: [{ type: String, enum: WEBHOOK_EVENTS, required: true }],
  secret: { type: String, required: true }, // used for HMAC-SHA256 signature
  headers: { type: Map, of: String, default: {} },
  isActive: { type: Boolean, default: true },
  failureCount: { type: Number, default: 0 },
  lastSuccessAt: Date,
  lastFailureAt: Date,
  lastFailureReason: String,
  totalDeliveries: { type: Number, default: 0 },
  totalFailures: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

webhookSchema.index({ companyId: 1, isActive: 1, events: 1 });

const webhookDeliverySchema = new mongoose.Schema({
  webhookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  event: { type: String, required: true },
  payload: mongoose.Schema.Types.Mixed,
  url: String,
  attempt: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'success', 'failed', 'retrying'], default: 'pending', index: true },
  responseStatus: Number,
  responseBody: String,
  durationMs: Number,
  errorMessage: String,
  nextRetryAt: Date,
}, { timestamps: true });

webhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }); // 30-day TTL

module.exports = {
  Webhook: mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema),
  WebhookDelivery: mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', webhookDeliverySchema),
  WEBHOOK_EVENTS,
};
