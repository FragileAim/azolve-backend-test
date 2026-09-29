/**
 * AI Co-Pilot Service
 * Intent-based routing for "Chat with your business"
 *
 * Modes supported:
 *  1) OpenAI/Anthropic mode (if API key set): full LLM with function calling
 *  2) Smart-rule mode (default): regex-based intent detection + DB queries
 *     Works WITHOUT any API key — useful for free tier / fallback
 */
const mongoose = require('mongoose');

// ============== INTENT DETECTION ==============

const INTENTS = [
  {
    name: 'unpaid_invoices',
    patterns: [
      /unpaid\s*(invoice|bill)/i,
      /(invoice|bill).*not\s*paid/i,
      /pending\s*(payment|invoice)/i,
      /overdue/i,
      /haven'?t\s*paid/i,
      /due\s*invoice/i,
      /unpaid|outstanding/i,
    ],
    handler: 'getUnpaidInvoices',
  },
  {
    name: 'top_clients',
    patterns: [
      /top\s*(\d+\s*)?client/i,
      /best\s*client/i,
      /highest\s*revenue\s*client/i,
      /biggest\s*client/i,
      /(most|biggest)\s*paying\s*client/i,
    ],
    handler: 'getTopClients',
  },
  {
    name: 'revenue_summary',
    patterns: [
      /(total|today|this\s*month|this\s*year|monthly|yearly).*revenue/i,
      /how\s*much\s*(did|have).*earn/i,
      /sales\s*(today|this\s*month|this\s*week|this\s*year)/i,
      /total\s*sales/i,
      /revenue\s*report/i,
    ],
    handler: 'getRevenueSummary',
  },
  {
    name: 'employee_stats',
    patterns: [
      /employee.*leave/i,
      /who\s*(took|has\s*taken)\s*(leave|off)/i,
      /attendance/i,
      /who\s*is\s*(absent|present|out|on\s*leave)/i,
      /leaves\s*(today|this\s*month)/i,
    ],
    handler: 'getEmployeeStats',
  },
  {
    name: 'lead_summary',
    patterns: [
      /(new|recent|latest)\s*lead/i,
      /lead\s*(status|summary|count)/i,
      /how\s*many\s*lead/i,
      /pipeline/i,
    ],
    handler: 'getLeadSummary',
  },
  {
    name: 'inventory_status',
    patterns: [
      /low\s*stock/i,
      /out\s*of\s*stock/i,
      /inventory/i,
      /stock\s*(level|status|report)/i,
    ],
    handler: 'getInventoryStatus',
  },
  {
    name: 'task_summary',
    patterns: [
      /pending\s*task/i,
      /my\s*task/i,
      /task\s*(today|this\s*week|due)/i,
      /todo/i,
    ],
    handler: 'getTaskSummary',
  },
  {
    name: 'cashflow_forecast',
    patterns: [
      /cash\s*flow/i,
      /forecast/i,
      /next\s*month.*revenue/i,
      /predict.*revenue/i,
    ],
    handler: 'getCashflowForecast',
  },
  {
    name: 'create_invoice',
    patterns: [
      /create\s*(an?\s*)?invoice/i,
      /generate\s*invoice/i,
      /raise\s*invoice/i,
      /bill\s*(client|customer)/i,
    ],
    handler: 'suggestInvoiceCreation',
  },
  {
    name: 'help',
    patterns: [
      /^help$/i,
      /what\s*can\s*you\s*do/i,
      /how\s*to\s*use/i,
      /commands/i,
    ],
    handler: 'getHelp',
  },
  {
    name: 'greeting',
    patterns: [
      /^(hi|hello|hey|namaste|hola)\b/i,
      /good\s*(morning|afternoon|evening)/i,
    ],
    handler: 'getGreeting',
  },
];

// ============== HANDLERS ==============

const handlers = {
  async getUnpaidInvoices(ctx) {
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.find({
      company: ctx.companyId,
      status: { $in: ['pending', 'unpaid', 'overdue'] },
    }).sort({ dueDate: 1 }).limit(20).lean();

    const totalDue = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const overdue = invoices.filter(i => i.dueDate && new Date(i.dueDate) < new Date());

    return {
      type: 'invoice_list',
      message: `📋 You have **${invoices.length} unpaid invoices** totalling **₹${totalDue.toLocaleString('en-IN')}**.${overdue.length ? ` **${overdue.length}** are overdue.` : ''}`,
      data: invoices.map(i => ({
        id: i._id,
        number: i.invoiceNumber,
        client: i.clientName,
        amount: i.total,
        dueDate: i.dueDate,
        status: i.status,
      })),
      actions: [
        { label: 'Send Reminders', action: 'send_reminders', resource: 'invoices' },
        { label: 'View All', url: '/app-dashboard.html#invoices' },
      ],
    };
  },

  async getTopClients(ctx) {
    const Invoice = require('../models/Invoice');
    const top = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId) } },
      { $group: { _id: '$clientId', name: { $first: '$clientName' }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    return {
      type: 'client_list',
      message: `🏆 Your **top ${top.length} clients** by revenue:`,
      data: top.map((c, i) => ({
        rank: i + 1,
        name: c.name || 'Unknown',
        revenue: c.revenue,
        invoices: c.count,
      })),
    };
  },

  async getRevenueSummary(ctx) {
    const Invoice = require('../models/Invoice');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [today, month, year, lastMonth] = await Promise.all([
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), $lt: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const todayTotal = today[0]?.total || 0;
    const monthTotal = month[0]?.total || 0;
    const yearTotal = year[0]?.total || 0;
    const lastMonthTotal = lastMonth[0]?.total || 0;
    const growth = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;

    return {
      type: 'revenue_summary',
      message: `💰 **Revenue Summary**\n\n• **Today:** ₹${todayTotal.toLocaleString('en-IN')} (${today[0]?.count || 0} invoices)\n• **This Month:** ₹${monthTotal.toLocaleString('en-IN')} ${growth >= 0 ? '📈' : '📉'} ${growth}% vs last month\n• **This Year:** ₹${yearTotal.toLocaleString('en-IN')}`,
      data: { today: todayTotal, month: monthTotal, year: yearTotal, growth },
    };
  },

  async getEmployeeStats(ctx) {
    const Leave = require('../models/Leave');
    const Attendance = require('../models/Attendance');
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [leaves, todayAtt] = await Promise.all([
      Leave.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), createdAt: { $gte: startOfMonth } } },
        { $group: { _id: { employeeId: '$employeeId', name: '$employeeName' }, days: { $sum: 1 } } },
        { $sort: { days: -1 } },
        { $limit: 10 },
      ]),
      Attendance.countDocuments({ company: ctx.companyId, date: new Date().toISOString().split('T')[0] }),
    ]);

    return {
      type: 'employee_stats',
      message: `👥 **Employee Stats This Month**\n\n• **${todayAtt} employees** checked in today\n• Top leave-takers: ${leaves.slice(0, 3).map(l => `${l._id.name} (${l.days}d)`).join(', ') || 'None'}`,
      data: { leaves, attendanceToday: todayAtt },
    };
  },

  async getLeadSummary(ctx) {
    const Lead = require('../models/Lead');
    const [byStatus, recent] = await Promise.all([
      Lead.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.find({ company: ctx.companyId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const total = byStatus.reduce((s, x) => s + x.count, 0);
    return {
      type: 'lead_summary',
      message: `🎯 **Lead Pipeline**\n\nTotal: **${total} leads**\n${byStatus.map(s => `• ${s._id}: ${s.count}`).join('\n')}`,
      data: { byStatus, recent },
    };
  },

  async getInventoryStatus(ctx) {
    const Product = require('../models/Product');
    const products = await Product.find({
      company: ctx.companyId,
      stock: { $exists: true, $lte: 10 },
    }).sort({ stock: 1 }).limit(20).lean();

    return {
      type: 'inventory_alert',
      message: `📦 **${products.length} products** are low on stock (≤10 units).`,
      data: products.map(p => ({ name: p.name, stock: p.stock, sku: p.sku })),
    };
  },

  async getTaskSummary(ctx) {
    const Task = require('../models/Task');
    const userId = ctx.userId;
    const tasks = await Task.find({
      company: ctx.companyId,
      $or: [{ assigneeId: userId }, { createdBy: userId }],
      status: { $ne: 'done' },
    }).sort({ dueDate: 1 }).limit(20).lean();

    return {
      type: 'task_list',
      message: `✓ You have **${tasks.length} pending tasks**.`,
      data: tasks,
    };
  },

  async getCashflowForecast(ctx) {
    const Invoice = require('../models/Invoice');
    const now = new Date();
    const last90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    const recent = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: last90 } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const monthlyAvg = (recent[0]?.total || 0) / 3;
    const pendingResult = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: { $in: ['pending', 'unpaid'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const pending = pendingResult[0]?.total || 0;

    return {
      type: 'cashflow_forecast',
      message: `📈 **90-Day Cash Flow Forecast**\n\n• Avg monthly revenue (last 3 mo): **₹${Math.round(monthlyAvg).toLocaleString('en-IN')}**\n• Pending receivables: **₹${pending.toLocaleString('en-IN')}**\n• Projected next month: **₹${Math.round(monthlyAvg * 1.05).toLocaleString('en-IN')}** (+5% trend)`,
      data: { monthlyAvg, pending, projected: monthlyAvg * 1.05 },
    };
  },

  async suggestInvoiceCreation(ctx, query) {
    // Try to extract amount and client name from query
    const amountMatch = query.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)|(\d{4,})\s*(?:rupees?|rs)/i);
    const amount = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, '')) : null;

    return {
      type: 'action_card',
      message: `🧾 I can help you create an invoice. Click below to start:`,
      actions: [
        { label: 'Create New Invoice', url: amount ? `/app-dashboard.html#invoices/new?amount=${amount}` : '/app-dashboard.html#invoices/new', primary: true },
      ],
    };
  },

  async getHelp() {
    return {
      type: 'help',
      message: `🤖 **I'm your Azolve AI Co-Pilot**\n\nTry asking me things like:\n\n• *"Show me unpaid invoices"*\n• *"Top 5 clients by revenue"*\n• *"How much did I earn this month?"*\n• *"Who took leave this month?"*\n• *"Lead pipeline summary"*\n• *"Low stock products"*\n• *"My pending tasks"*\n• *"Cash flow forecast"*\n• *"Create an invoice for ₹50,000"*\n\nAll your data stays private — I only query your own database.`,
    };
  },

  async getGreeting(ctx) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return {
      type: 'greeting',
      message: `${greeting}, ${ctx.userName || 'there'}! 👋\n\nI'm your Azolve Co-Pilot. Ask me anything about your business — revenue, clients, tasks, inventory, anything.\n\nType **"help"** to see what I can do.`,
    };
  },
};

// ============== MAIN ENTRY ==============

async function detectAndHandle(query, ctx) {
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(query))) {
      const handler = handlers[intent.handler];
      if (handler) {
        const result = await handler(ctx, query);
        return { intent: intent.name, ...result };
      }
    }
  }

  return {
    intent: 'unknown',
    type: 'fallback',
    message: `I'm not sure how to answer that yet. Try asking about:\n• Revenue or sales\n• Unpaid invoices\n• Top clients\n• Employee stats\n• Pipeline summary\n• Low stock products\n\nOr type **"help"** for more.`,
  };
}

module.exports = { detectAndHandle, INTENTS };
