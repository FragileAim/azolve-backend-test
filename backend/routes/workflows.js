/**
 * Workflow API Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
// Normalize req.user to v2 shape: req.user.id + req.user.companyId
const normalizeUser = (req, res, next) => {
  if (req.user) {
    req.user.id = req.user.id || (req.user._id && req.user._id.toString());
    req.user.companyId = req.user.companyId || req.companyId ||
      (req.user.company && (req.user.company._id || req.user.company));
  }
  next();
};
const auth = [protect, normalizeUser];
const Workflow = require('../models/Workflow');
const engine = require('../services/workflowEngine');
const AuditLogger = require('../services/auditLogger');

router.use(...auth);

/**
 * GET /api/workflows — list
 */
router.get('/', async (req, res) => {
  try {
    const workflows = await Workflow.find({ company: req.user.companyId }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: workflows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/workflows/templates — pre-built templates
 */
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: getTemplates(),
  });
});

/**
 * GET /api/workflows/triggers — available triggers
 */
router.get('/triggers', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'invoice.created', label: 'Invoice Created', icon: '🧾', category: 'Invoice' },
      { id: 'invoice.paid', label: 'Invoice Paid', icon: '💰', category: 'Invoice' },
      { id: 'invoice.overdue', label: 'Invoice Overdue', icon: '⚠️', category: 'Invoice' },
      { id: 'lead.created', label: 'New Lead', icon: '🎯', category: 'CRM' },
      { id: 'lead.qualified', label: 'Lead Qualified', icon: '✅', category: 'CRM' },
      { id: 'deal.won', label: 'Deal Won', icon: '🏆', category: 'CRM' },
      { id: 'deal.lost', label: 'Deal Lost', icon: '😞', category: 'CRM' },
      { id: 'task.completed', label: 'Task Completed', icon: '✓', category: 'Tasks' },
      { id: 'ticket.created', label: 'New Support Ticket', icon: '🎫', category: 'Support' },
      { id: 'product.low_stock', label: 'Low Stock Alert', icon: '📦', category: 'Inventory' },
      { id: 'employee.checkin', label: 'Employee Checked In', icon: '🕐', category: 'HR' },
      { id: 'schedule.daily', label: 'Daily at specific time', icon: '📅', category: 'Schedule' },
      { id: 'schedule.weekly', label: 'Weekly', icon: '📆', category: 'Schedule' },
      { id: 'schedule.monthly', label: 'Monthly', icon: '🗓️', category: 'Schedule' },
    ],
  });
});

/**
 * GET /api/workflows/actions — available actions
 */
router.get('/actions', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'send_email', label: 'Send Email', icon: '📧', category: 'Notify', config: ['to', 'subject', 'body'] },
      { id: 'send_whatsapp', label: 'Send WhatsApp', icon: '💬', category: 'Notify', config: ['phone', 'message'] },
      { id: 'send_sms', label: 'Send SMS', icon: '📱', category: 'Notify', config: ['phone', 'message'] },
      { id: 'create_task', label: 'Create Task', icon: '✓', category: 'Productivity', config: ['title', 'assigneeId', 'dueDate'] },
      { id: 'update_field', label: 'Update Field', icon: '✏️', category: 'Data', config: ['field', 'value'] },
      { id: 'webhook', label: 'Call Webhook', icon: '🔗', category: 'Integration', config: ['url', 'method', 'body'] },
      { id: 'delay', label: 'Wait/Delay', icon: '⏰', category: 'Flow', config: ['days', 'hours', 'minutes'] },
      { id: 'condition', label: 'If/Then', icon: '🔀', category: 'Flow', config: ['field', 'operator', 'value'] },
      { id: 'create_invoice', label: 'Create Invoice', icon: '🧾', category: 'Billing', config: ['clientId', 'items'] },
      { id: 'assign_to_user', label: 'Assign to User', icon: '👤', category: 'CRM', config: ['userId'] },
    ],
  });
});

/**
 * POST /api/workflows
 */
router.post('/', async (req, res) => {
  try {
    const wf = await Workflow.create({
      ...req.body,
      company: req.user.companyId,
      createdBy: req.user._id || req.user.id,
    });
    await AuditLogger.log({
      req, action: 'create', resource: 'workflow',
      resourceId: wf._id, resourceName: wf.name,
      description: `Created workflow "${wf.name}"`,
    });
    res.json({ success: true, data: wf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/workflows/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const wf = await Workflow.findOneAndUpdate(
      { _id: req.params.id, company: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: wf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/workflows/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const wf = await Workflow.findOneAndDelete({ _id: req.params.id, company: req.user.companyId });
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    await AuditLogger.log({
      req, action: 'delete', resource: 'workflow',
      resourceId: wf._id, resourceName: wf.name,
      description: `Deleted workflow "${wf.name}"`,
      severity: 'warning',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/workflows/:id/test — test run a workflow
 */
router.post('/:id/test', async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, company: req.user.companyId });
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await engine.execute(wf, req.body.testData || {});
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/workflows/:id/toggle — enable/disable
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const wf = await Workflow.findOne({ _id: req.params.id, company: req.user.companyId });
    if (!wf) return res.status(404).json({ success: false, message: 'Not found' });
    wf.enabled = !wf.enabled;
    await wf.save();
    res.json({ success: true, data: wf });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============ TEMPLATES ============
function getTemplates() {
  return [
    {
      id: 'tpl_invoice_paid_thanks',
      name: 'Send WhatsApp thank-you when invoice is paid',
      description: 'Automatically thanks customers via WhatsApp the moment they pay an invoice',
      icon: '🙏',
      category: 'Customer Engagement',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'invoice.paid', position: { x: 100, y: 100 }, next: ['action1'] },
        { id: 'action1', type: 'action', operation: 'send_whatsapp', config: { phone: '{{trigger.client.phone}}', message: 'Hi {{trigger.client.name}}, thank you for your payment of ₹{{trigger.amount}} for invoice {{trigger.number}}. We appreciate your business! 🙏' }, position: { x: 100, y: 250 }, next: [] },
      ],
    },
    {
      id: 'tpl_overdue_reminder',
      name: 'Auto-remind overdue invoices (3 days late)',
      description: 'Sends a friendly reminder when an invoice goes 3 days overdue',
      icon: '⏰',
      category: 'Collections',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'invoice.overdue', position: { x: 100, y: 100 }, next: ['delay1'] },
        { id: 'delay1', type: 'delay', config: { days: 3 }, position: { x: 100, y: 250 }, next: ['action1'] },
        { id: 'action1', type: 'action', operation: 'send_email', config: { to: '{{trigger.client.email}}', subject: 'Reminder: Invoice {{trigger.number}} is overdue', body: 'Hi {{trigger.client.name}},\n\nThis is a gentle reminder that invoice {{trigger.number}} of ₹{{trigger.amount}} is now {{trigger.daysOverdue}} days overdue. Please process the payment at your earliest convenience.\n\nThank you!' }, position: { x: 100, y: 400 }, next: ['action2'] },
        { id: 'action2', type: 'action', operation: 'send_whatsapp', config: { phone: '{{trigger.client.phone}}', message: 'Hi {{trigger.client.name}}, kindly note invoice {{trigger.number}} (₹{{trigger.amount}}) is overdue. Please pay at your earliest. Thank you!' }, position: { x: 100, y: 550 }, next: [] },
      ],
    },
    {
      id: 'tpl_new_lead_assign',
      name: 'Auto-assign new leads to sales team',
      description: 'When a new lead arrives, create a follow-up task and notify the assigned rep',
      icon: '🎯',
      category: 'Sales',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'lead.created', position: { x: 100, y: 100 }, next: ['action1'] },
        { id: 'action1', type: 'action', operation: 'create_task', config: { title: 'Follow up with {{trigger.name}}', description: 'New lead from {{trigger.source}}. Phone: {{trigger.phone}}', dueDate: '+1 day' }, position: { x: 100, y: 250 }, next: ['action2'] },
        { id: 'action2', type: 'action', operation: 'send_whatsapp', config: { phone: '{{trigger.assignee.phone}}', message: 'New lead assigned: {{trigger.name}} from {{trigger.company}}. Follow up within 24 hrs.' }, position: { x: 100, y: 400 }, next: [] },
      ],
    },
    {
      id: 'tpl_low_stock',
      name: 'Low stock alert to purchase team',
      description: 'Notifies the team when product stock drops below threshold',
      icon: '📦',
      category: 'Inventory',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'product.low_stock', position: { x: 100, y: 100 }, next: ['action1'] },
        { id: 'action1', type: 'action', operation: 'create_task', config: { title: 'Reorder: {{trigger.product.name}}', description: 'Stock has dropped to {{trigger.product.stock}} units. Reorder needed.' }, position: { x: 100, y: 250 }, next: [] },
      ],
    },
    {
      id: 'tpl_weekly_report',
      name: 'Weekly business report on WhatsApp',
      description: 'Every Monday 9am, send the owner a weekly performance summary',
      icon: '📊',
      category: 'Reporting',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'schedule.weekly', config: { day: 'monday', time: '09:00' }, position: { x: 100, y: 100 }, next: ['action1'] },
        { id: 'action1', type: 'action', operation: 'send_whatsapp', config: { phone: '{{owner.phone}}', message: 'Weekly Business Report\n\nRevenue: ₹{{stats.revenue}}\nNew clients: {{stats.newClients}}\nDeals won: {{stats.dealsWon}}\nPending invoices: ₹{{stats.pending}}' }, position: { x: 100, y: 250 }, next: [] },
      ],
    },
    {
      id: 'tpl_high_value_deal',
      name: 'Alert owner when deal > ₹1L is won',
      description: 'Sends instant notification when a high-value deal closes',
      icon: '🏆',
      category: 'Sales',
      steps: [
        { id: 'trigger1', type: 'trigger', operation: 'deal.won', position: { x: 100, y: 100 }, next: ['cond1'] },
        { id: 'cond1', type: 'condition', config: { field: 'trigger.value', operator: 'greater_than', value: 100000 }, position: { x: 100, y: 250 }, next: [{ branch: 'true', stepId: 'action1' }] },
        { id: 'action1', type: 'action', operation: 'send_whatsapp', config: { phone: '{{owner.phone}}', message: '🏆 BIG WIN! {{trigger.title}} closed for ₹{{trigger.value}}. Congrats to {{trigger.assignee.name}}!' }, position: { x: 100, y: 400 }, next: [] },
      ],
    },
  ];
}

module.exports = router;
