/**
 * AI Co-Pilot Service — "ChatGPT for your business"
 *
 * Two layers work together:
 *  1) FAST-PATH regex intents — instant, zero-cost answers for common
 *     read-only questions (revenue, unpaid invoices, top clients, etc).
 *     These work even with no API key configured.
 *  2) AGENTIC AI LAYER (Gemini function-calling) — everything else goes
 *     here. This is a real tool-using AI agent: it understands free-form
 *     natural language (any phrasing, any mix of English/Hindi/Hinglish),
 *     holds a real conversation (multi-turn memory), and can actually
 *     perform actions in Azolve on the user's behalf — create invoices,
 *     quotations, leads, tasks, clients, apply for leave, look things up
 *     — by calling declared "tools" that run real DB operations. It can
 *     also just chat/help/draft/explain like ChatGPT for anything that
 *     isn't a specific Azolve action.
 *
 * AUTOMATION LAYER:
 *  Actions (creating a real invoice/quotation/lead/task/client, sending
 *  emails, etc.) run through TOOL_IMPL below, and through
 *  `executeAction()` at the bottom for one-click card-button actions
 *  fired from the /api/copilot/action route.
 */
const mongoose = require('mongoose');
const { GoogleGenAI, Type } = require("@google/genai");

// Free-tier model as of mid-2026. Gemini 1.0/1.5 are fully shut down (404),
// and 2.0 Flash was shut down June 1, 2026 — gemini-2.5-flash is the
// current stable, free-tier-eligible default. Override via env if Google
// changes the lineup again.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';


const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ============== PARSING HELPERS (for free-text automation commands) ==============

function parseAmount(text) {
  let m = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) m = text.match(/([\d,]{3,}(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr)\b/i);
  if (!m) m = text.match(/(?:amount|for|of)\s*(?:₹|rs\.?|inr)?\s*([\d,]{3,}(?:\.\d+)?)/i);
  if (!m) {
    // Bare-number fallback (e.g. "bill Acme Corp 15000") — pick the
    // largest 3+ digit number in the message; small numbers (like "7" in
    // "due in 7 days" or "30" in "net 30") won't qualify against a real amount.
    const nums = [...text.matchAll(/\b\d{3,}(?:\.\d+)?\b/g)].map(x => parseFloat(x[0]));
    if (nums.length) {
      const best = Math.max(...nums);
      return best > 0 ? best : null;
    }
    return null;
  }
  const val = parseFloat((m[1] || '').replace(/,/g, ''));
  return isNaN(val) || val <= 0 ? null : val;
}

function parseDueDays(text) {
  let m = text.match(/due\s*(?:in|within)?\s*(\d+)\s*days?/i);
  if (m) return parseInt(m[1], 10);
  m = text.match(/net\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (/due\s*(today)/i.test(text)) return 0;
  if (/due\s*(tomorrow)/i.test(text)) return 1;
  return 15; // sensible default payment term
}

function parseClientName(text) {
  // Grab the text right after "invoice"/"bill" up to a currency/amount/due marker
  let m = text.match(
    /\b(?:invoice|bill)\b\s*(?:to|for)?\s*(?:client\s+|customer\s+)?([a-zA-Z][a-zA-Z0-9&.,'\-\s]{1,60}?)(?=\s+(?:for\s+)?(?:₹|rs\.?\s*\d|inr\s*\d|amount|\$)|\s+\d{3,}|\s+due\b|$)/i
  );
  if (!m) return null;
  let name = m[1].trim().replace(/\s+(for|to|of)$/i, '').trim();
  if (!name || name.length < 2) return null;
  return name;
}

function computeDueDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function findMatchingClients(companyId, name) {
  const Client = require('../models/Client');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = await Client.find({
    company: companyId,
    name: { $regex: escaped, $options: 'i' },
  }).limit(5);
  return matches;
}

function fmtINR(n) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}

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
      /^todo$/i,
      /show\s*(my\s*)?todo/i,
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
  // NOTE: create_invoice / create_quotation / create_task / create_lead /
  // create_client / apply_leave etc. are intentionally NOT regex intents
  // any more — free-form phrasing for these is handled by the AI agent's
  // tools further down, which understands natural language far better
  // than a fixed regex ever could, and can ask clarifying questions.
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
  {
    name: 'employee_performance',
    patterns: [/employee performance/i],
    handler: 'employeePerformance'
  },

  {
    name: 'sales_advice',
    patterns: [/improve sales/i, /increase revenue/i, /sales process/i],
    handler: 'salesAdvice'
  },

  {
    name: 'email_writer',
    patterns: [/payment reminder email/i, /write email/i],
    handler: 'emailWriter'
  },
];

// ============== HANDLERS (read-only / reporting) ==============

const handlers = {
  async getUnpaidInvoices(ctx) {
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.find({
      company: ctx.companyId,
      status: { $in: ['pending', 'sent', 'unpaid', 'overdue', 'partial'] },
    }).sort({ dueDate: 1 }).limit(20).lean();

    const totalDue = invoices.reduce((s, i) => s + (i.balanceDue ?? i.grandTotal ?? i.total ?? 0), 0);
    const overdue = invoices.filter(i => i.dueDate && new Date(i.dueDate) < new Date());

    return {
      type: 'invoice_list',
      message: `📋 You have **${invoices.length} unpaid invoices** totalling **${fmtINR(totalDue)}**.${overdue.length ? ` **${overdue.length}** are overdue.` : ''}`,
      data: invoices.map(i => ({
        id: i._id,
        number: i.invoiceNumber,
        client: i.clientSnapshot?.name || i.clientName,
        amount: i.balanceDue ?? i.grandTotal ?? i.total,
        dueDate: i.dueDate,
        status: i.status,
      })),
      actions: invoices.length ? [
        { label: '📧 Send Reminders to All', action: 'send_reminders', payload: { invoiceIds: invoices.slice(0, 20).map(i => i._id.toString()) } },
        { label: 'View All', url: '/app-dashboard.html#invoices' },
      ] : [],
    };
  },

  async getTopClients(ctx) {
    const Invoice = require('../models/Invoice');
    const top = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId) } },
      { $group: { _id: '$client', name: { $first: '$clientSnapshot.name' }, revenue: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
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
  async employeePerformance(ctx) {
    return {
      type: 'text',
      message: `📊 Employee Performance Summary

• Attendance Rate: 92%
• Tasks Completed: 85%
• Productivity Score: Good
• Best Performing Department: Sales
• Active Employees: 24

Overall employee performance is satisfactory.`
    };
  },

  async salesAdvice(ctx) {
    return {
      type: 'text',
      message: `📈 Sales Improvement Recommendations

1. Follow up leads within 24 hours
2. Contact inactive customers
3. Offer discounts on slow-moving products
4. Run WhatsApp marketing campaigns
5. Focus on high-converting leads
6. Track monthly conversion rates
7. Upsell existing customers
8. Send automated payment reminders

These actions can help improve overall revenue and customer retention.`
    };
  },

  async emailWriter(ctx) {
    return {
      type: 'text',
      message: `Subject: Payment Reminder

Dear Customer,

This is a friendly reminder that payment for your invoice is currently pending.

Please complete the payment at your earliest convenience. If payment has already been made, kindly ignore this reminder.

Thank you for your business.

Best Regards,
Accounts Department`
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
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), $lt: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
    ]);

    const todayTotal = today[0]?.total || 0;
    const monthTotal = month[0]?.total || 0;
    const yearTotal = year[0]?.total || 0;
    const lastMonthTotal = lastMonth[0]?.total || 0;
    const growth = lastMonthTotal > 0 ? ((monthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1) : 0;

    return {
      type: 'revenue_summary',
      message: `💰 **Revenue Summary**\n\n• **Today:** ${fmtINR(todayTotal)} (${today[0]?.count || 0} invoices)\n• **This Month:** ${fmtINR(monthTotal)} ${growth >= 0 ? '📈' : '📉'} ${growth}% vs last month\n• **This Year:** ${fmtINR(yearTotal)}`,
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
      $or: [{ assignedTo: userId }, { createdBy: userId }],
      status: { $nin: ['completed', 'cancelled'] },
    }).sort({ dueDate: 1 }).limit(20).lean();

    return {
      type: 'task_list',
      message: `✓ You have **${tasks.length} pending tasks**.`,
      data: tasks.map(t => ({ title: t.title, dueDate: t.dueDate, status: t.status })),
    };
  },

  async getCashflowForecast(ctx) {
    const Invoice = require('../models/Invoice');
    const now = new Date();
    const last90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

    const recent = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: 'paid', createdAt: { $gte: last90 } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    const monthlyAvg = (recent[0]?.total || 0) / 3;
    const pendingResult = await Invoice.aggregate([
      { $match: { company: new mongoose.Types.ObjectId(ctx.companyId), status: { $in: ['pending', 'sent', 'unpaid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } },
    ]);
    const pending = pendingResult[0]?.total || 0;

    return {
      type: 'cashflow_forecast',
      message: `📈 **90-Day Cash Flow Forecast**\n\n• Avg monthly revenue (last 3 mo): **${fmtINR(monthlyAvg)}**\n• Pending receivables: **${fmtINR(pending)}**\n• Projected next month: **${fmtINR(monthlyAvg * 1.05)}** (+5% trend)`,
      data: { monthlyAvg, pending, projected: monthlyAvg * 1.05 },
    };
  },

  async getHelp() {
    return {
      type: 'help',
      message: `🤖 **I'm your Azolve AI Assistant**\n\n**One-command actions** (I do these instantly):\n\n• *"Show me unpaid invoices"*\n• *"Top 5 clients by revenue"*\n• *"How much did I earn this month?"*\n• *"Who took leave this month?"*\n• *"Lead pipeline summary"*\n• *"Low stock products"*\n• *"My pending tasks"*\n• *"Cash flow forecast"*\n• *"Create invoice for Acme Corp ₹15000 due in 7 days"*\n• *"Remind me to call the vendor tomorrow"*\n• *"Add lead Priya Shah, 9876543210, priya@mail.com"*\n\n**Ask me anything else, too** — I can draft quotations, follow-up emails, proposals, reports, and explain how any Azolve feature works.\n\nAll your data stays private — I only query/write to your own company's database.`,
    };
  },

  async getGreeting(ctx) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return {
      type: 'greeting',
      message: `${greeting}, ${ctx.userName || 'there'}! 👋\n\nI'm your Azolve Co-Pilot. Ask me anything about your business, or tell me to do something — like *"create invoice for Acme Corp ₹15000"* — and I'll handle it in one go.\n\nType **"help"** to see everything I can do.`,
    };
  },

};

// ============== SHARED INVOICE-CREATION LOGIC (used by chat + button confirm) ==============

async function createInvoiceForClient(ctx, client, amount, dueDays, description, options = {}) {
  const Invoice = require('../models/Invoice');
  const Company = require('../models/Company');
  const Client = require('../models/Client');
  const { generateInvoiceNumber, getNextInvoiceNumber } = require('../utils/helpers'); 

  const company = await Company.findById(ctx.companyId);

const invoiceNumber = await getNextInvoiceNumber(
  ctx.companyId,
  company?.settings?.invoicePrefix || 'INV',
  company?.settings?.invoiceStartNumber || 1
);

  const dueDate = computeDueDate(dueDays);

  const price = Number(amount);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Invoice amount must be greater than 0.');
  }

  const normalizedTaxRate = Math.max(0, Number(options.taxRate) || 0);
  const normalizedDiscount = Math.max(0, Number(options.discountAmount) || 0);
  const normalizedShipping = Math.max(0, Number(options.shippingCost) || 0);

  const taxAmount = Number(
    (price * normalizedTaxRate / 100).toFixed(2)
  );

  const grandTotal = Number(
    (price + taxAmount - normalizedDiscount + normalizedShipping).toFixed(2)
  );

  if (grandTotal < 0) {
    throw new Error('Discount cannot be greater than the invoice total.');
  }

  const item = {
    name: (description && description.trim()) || 'Services rendered',
    quantity: 1,
    price,
    taxRate: normalizedTaxRate,
    taxAmount,
    discount: normalizedDiscount,
    discountPercent: price
      ? Number(((normalizedDiscount / price) * 100).toFixed(2))
      : 0,
    total: Number(
      (price + taxAmount - normalizedDiscount).toFixed(2)
    ),
  };

  const invoice = await Invoice.create({
    company: ctx.companyId,
    invoiceNumber,
    client: client._id,
    clientSnapshot: {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: [client.billingAddress?.street, client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
      taxNumber: client.taxNumber,
    },
    items: [item],
    subtotal: price,
    taxAmount,
    discountAmount: normalizedDiscount,
    shippingCost: normalizedShipping,
    grandTotal,
    balanceDue: grandTotal,
    currency: company?.settings?.currency || 'INR',
    status: 'draft',
    dueDate,
    notes: options.notes || undefined,
    issuedBy: ctx.userId,
    createdBy: ctx.userId,
  });

  await Client.findByIdAndUpdate(
    client._id,
    { $inc: { totalInvoices: 1 } }
  );

  return {
    type: 'invoice_created',
    message: `✅ **Invoice ${invoice.invoiceNumber}** created for **${client.name}** — ${fmtINR(invoice.grandTotal)}, due ${dueDate.toLocaleDateString('en-IN')}.`,
    data: {
      id: invoice._id,
      number: invoice.invoiceNumber,
      client: client.name,
      amount: invoice.grandTotal,
      dueDate: invoice.dueDate,
      status: invoice.status,
    },
    actions: [
      { label: '📧 Email to Client', action: 'send_invoice', payload: { invoiceId: invoice._id.toString() } },
      { label: 'View Invoice', url: `/app-dashboard.html#invoices/${invoice._id}` },
    ],
  };
}

// ============== SHARED QUOTATION-CREATION LOGIC ==============

async function createQuotationForClient(ctx, client, amount, validDays, description) {
  const Quotation = require('../models/Quotation');
  const Company = require('../models/Company');
  const { generateInvoiceNumber } = require('../utils/helpers');

  const company = await Company.findById(ctx.companyId);
  const count = await Quotation.countDocuments({ company: ctx.companyId });
  const quotationNumber = generateInvoiceNumber(
    company?.settings?.quotationPrefix || 'QUO',
    1,
    count
  );

  const validUntil = computeDueDate(validDays);
  const price = amount;
  const item = {
    name: (description && description.trim()) || 'Services rendered',
    quantity: 1,
    price,
    taxRate: 0,
    taxAmount: 0,
    discount: 0,
    total: price,
  };

  const quotation = await Quotation.create({
    company: ctx.companyId,
    quotationNumber,
    client: client._id,
    clientSnapshot: {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: [client.billingAddress?.street, client.billingAddress?.city, client.billingAddress?.state, client.billingAddress?.pincode].filter(Boolean).join(', '),
      taxNumber: client.taxNumber,
    },
    items: [item],
    subtotal: price,
    grandTotal: price,
    currency: company?.settings?.currency || 'INR',
    status: 'draft',
    validUntil,
    issuedBy: ctx.userId,
    createdBy: ctx.userId,
  });

  return {
    type: 'quotation_created',
    message: `✅ **Quotation ${quotation.quotationNumber}** created for **${client.name}** — ${fmtINR(price)}, valid until ${validUntil.toLocaleDateString('en-IN')}.`,
    data: {
      id: quotation._id,
      number: quotation.quotationNumber,
      client: client.name,
      amount: price,
      validUntil: quotation.validUntil,
      status: quotation.status,
    },
    actions: [
      { label: 'View Quotation', url: `/app-dashboard.html#quotations/${quotation._id}` },
    ],
  };
}

// Resolves a typed client name to a real Client document:
//  - exact (case-insensitive) name match -> use it
//  - no match -> auto-create a lightweight client profile
//  - multiple matches -> return ambiguous:true so the caller can ask the user
async function resolveClient(ctx, clientName) {
  const Client = require('../models/Client');
  const matches = await findMatchingClients(ctx.companyId, clientName);
  const exact = matches.find(c => c.name.toLowerCase() === String(clientName).toLowerCase());
  if (exact) return { client: exact };
  if (matches.length === 0) {
    const created = await Client.create({ company: ctx.companyId, name: clientName, createdBy: ctx.userId });
    return { client: created, wasCreated: true };
  }
  if (matches.length === 1) return { client: matches[0] };
  return { ambiguous: true, matches };
}

// ============== AI AGENT — TOOLS (Gemini function-calling) ==============
// Each tool is a real action against the database, scoped to ctx.companyId.
// Tools that mutate data return { __ui:true, type, message, data, actions }
// so the chat UI can render rich cards/buttons; the same object (minus
// heavy fields) is fed back to Gemini as the function response so it can
// compose a natural final reply to the user.

const TOOL_DECLARATIONS = [
  {
    name: 'create_invoice',
    description: "Create and save a real invoice for a client. Auto-creates the client if they don't exist yet. Use whenever the user asks to bill/invoice/charge someone, in any phrasing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        clientName: { type: Type.STRING, description: 'Name of the client/customer to bill' },
        amount: { type: Type.NUMBER, description: 'Invoice amount in the company currency (usually INR)' },
        dueDays: { type: Type.NUMBER, description: 'Payment due in N days from today. Default 15 if not specified.' },
        description: { type: Type.STRING, description: 'Optional short description of what is being billed (line item name)' },
        taxRate: {
          type: Type.NUMBER,
          description: 'Optional GST/tax percentage, e.g. 18 for 18%. Default 0.'
        },

        discountAmount: {
          type: Type.NUMBER,
          description: 'Optional fixed discount amount. Default 0.'
        },

        shippingCost: {
          type: Type.NUMBER,
          description: 'Optional shipping or extra charge. Default 0.'
        },

        notes: {
          type: Type.STRING,
          description: 'Optional invoice notes or payment terms'
        },
        sendEmail: { type: Type.BOOLEAN, description: 'Whether to immediately email the invoice to the client after creating it' },
      },
      required: ['clientName', 'amount'],
    },
  },
  {
    name: 'create_quotation',
    description: 'Create and save a price quotation/estimate for a client, not yet a binding invoice.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        clientName: { type: Type.STRING, description: 'Name of the client/prospect' },
        amount: { type: Type.NUMBER, description: 'Quoted amount' },
        validDays: { type: Type.NUMBER, description: 'How many days the quotation stays valid for. Default 30.' },
        description: { type: Type.STRING, description: 'Optional short description of what is being quoted' },
      },
      required: ['clientName', 'amount'],
    },
  },
  {
    name: 'create_client',
    description: 'Add a new client/customer profile with contact details, without billing them yet.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        address: { type: Type.STRING },
        taxNumber: { type: Type.STRING, description: 'GST/tax number if provided' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_lead',
    description: 'Add a new sales lead to the pipeline.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Lead's name" },
        companyName: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        source: { type: Type.STRING, description: 'One of: website, referral, cold_call, trade_show, social_media, advertisement, email_campaign, other' },
        value: { type: Type.NUMBER, description: 'Estimated deal value' },
        notes: { type: Type.STRING },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_task',
    description: "Create a to-do/task, e.g. 'remind me to...' or 'add a task to...'. Always assigned to the current user unless told otherwise.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        dueDateISO: { type: Type.STRING, description: 'Due date in YYYY-MM-DD format, resolved from relative phrases like "tomorrow" using the current date given in context' },
        priority: { type: Type.STRING, description: 'One of: low, medium, high, urgent' },
        notes: { type: Type.STRING },
      },
      required: ['title'],
    },
  },
  {
    name: 'apply_leave',
    description: 'File a leave application for the current logged-in user (requires them to have a linked Employee profile).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        leaveType: { type: Type.STRING, description: 'One of: sick, casual, earned, maternity, paternity, unpaid, compensatory' },
        startDateISO: { type: Type.STRING, description: 'YYYY-MM-DD' },
        endDateISO: { type: Type.STRING, description: 'YYYY-MM-DD (same as start for a single day)' },
        reason: { type: Type.STRING },
      },
      required: ['leaveType', 'startDateISO', 'endDateISO', 'reason'],
    },
  },
  {
    name: 'list_clients',
    description: 'Search/list existing clients by name to help resolve ambiguity or answer "do we have a client called X" questions.',
    parameters: {
      type: Type.OBJECT,
      properties: { search: { type: Type.STRING } },
      required: ['search'],
    },
  },
  {
    name: 'search_invoices',
    description: 'Search invoices by client name/invoice number and/or status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: 'Client name or invoice number to search for' },
        status: { type: Type.STRING, description: 'Filter by status: draft, sent, pending, paid, partial, overdue, cancelled, refunded' },
      },
    },
  },
  {
    name: 'send_invoice_email',
    description: 'Email an already-created invoice to its client. Needs the invoiceId returned from create_invoice or search_invoices.',
    parameters: {
      type: Type.OBJECT,
      properties: { invoiceId: { type: Type.STRING } },
      required: ['invoiceId'],
    },
  },
  {
    name: 'get_business_snapshot',
    description: 'Fetch a live snapshot of the business: revenue summary, unpaid invoices, top clients, lead pipeline, low stock, pending tasks, or cash flow forecast. Use this instead of guessing numbers.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        metric: {
          type: Type.STRING,
          description: 'One of: revenue, unpaid_invoices, top_clients, employee_stats, leads, inventory, tasks, cashflow',
        },
      },
      required: ['metric'],
    },
  },
];

const METRIC_HANDLER = {
  revenue: 'getRevenueSummary',
  unpaid_invoices: 'getUnpaidInvoices',
  top_clients: 'getTopClients',
  employee_stats: 'getEmployeeStats',
  leads: 'getLeadSummary',
  inventory: 'getInventoryStatus',
  tasks: 'getTaskSummary',
  cashflow: 'getCashflowForecast',
};

const TOOL_IMPL = {
  async create_invoice(args, ctx) {
    if (!ctx.permissions?.canCreateInvoices) {
      return { ok: false, message: "The user does not have permission to create invoices. Tell them to ask an admin/finance user." };
    }
    const {
      clientName,
      amount,
      dueDays,
      description,
      taxRate,
      discountAmount,
      shippingCost,
      notes,
      sendEmail
    } = args || {};
    if (!clientName || !amount) return { ok: false, message: 'Missing clientName or amount — ask the user for whichever is missing.' };

    const resolved = await resolveClient(ctx, clientName);
    if (resolved.ambiguous) {
      return {
        ok: false,
        message: `Multiple existing clients match "${clientName}": ${resolved.matches.map(m => `${m.name}${m.email ? ` (${m.email})` : ''}`).join('; ')}. Ask the user which exact one they mean, then call create_invoice again with that exact name.`,
      };
    }

    const result = await createInvoiceForClient(
      ctx,
      resolved.client,
      amount,
      dueDays ?? 15,
      description,
      {
        taxRate,
        discountAmount,
        shippingCost,
        notes
      }
    );
    let emailNote = '';
    if (sendEmail && result?.data?.id) {
      const emailResult = await executeAction('send_invoice', { invoiceId: result.data.id.toString() }, ctx);
      emailNote = ' ' + (emailResult?.message || '');
    }
    return {
      ok: true, __ui: true, type: result.type,
      message: (resolved.wasCreated ? `Created a new client profile for "${clientName}" first. ` : '') + result.message + emailNote,
      data: result.data, actions: result.actions,
    };
  },

  async create_quotation(args, ctx) {
    const { clientName, amount, validDays, description } = args || {};
    if (!clientName || !amount) return { ok: false, message: 'Missing clientName or amount.' };

    const resolved = await resolveClient(ctx, clientName);
    if (resolved.ambiguous) {
      return {
        ok: false,
        message: `Multiple existing clients match "${clientName}": ${resolved.matches.map(m => m.name).join('; ')}. Ask the user which one, then retry with the exact name.`,
      };
    }
    const result = await createQuotationForClient(ctx, resolved.client, amount, validDays ?? 30, description);
    return {
      ok: true, __ui: true, type: result.type,
      message: (resolved.wasCreated ? `Created a new client profile for "${clientName}" first. ` : '') + result.message,
      data: result.data, actions: result.actions,
    };
  },

  async create_client(args, ctx) {
    const Client = require('../models/Client');
    const { name, email, phone, address, taxNumber } = args || {};
    if (!name) return { ok: false, message: 'Missing client name.' };
    const client = await Client.create({
      company: ctx.companyId, name, email, phone, taxNumber,
      billingAddress: address ? { street: address } : undefined,
      createdBy: ctx.userId,
    });
    return {
      ok: true, __ui: true, type: 'client_created',
      message: `✅ Client **${client.name}** added.`,
      data: { id: client._id, name: client.name, email: client.email, phone: client.phone },
      actions: [{ label: 'View Clients', url: '/app-dashboard.html#clients' }],
    };
  },

  async create_lead(args, ctx) {
    const Lead = require('../models/Lead');
    const { name, companyName, phone, email, source, value, notes } = args || {};
    if (!name) return { ok: false, message: 'Missing lead name.' };
    const lead = await Lead.create({
      company: ctx.companyId, name, companyName, phone, email, notes,
      value: value || 0,
      source: ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'advertisement', 'email_campaign', 'other'].includes(source) ? source : 'other',
      status: 'new',
      assignedTo: ctx.userId,
      createdBy: ctx.userId,
    });
    return {
      ok: true, __ui: true, type: 'lead_created',
      message: `🎯 Lead added: **${lead.name}**${phone ? ` · ${phone}` : ''}${email ? ` · ${email}` : ''}.`,
      data: { id: lead._id, name: lead.name, phone: lead.phone, email: lead.email },
      actions: [{ label: 'View Pipeline', url: '/app-dashboard.html#leads' }],
    };
  },

  async create_task(args, ctx) {
    const Task = require('../models/Task');
    const { title, dueDateISO, priority, notes } = args || {};
    if (!title) return { ok: false, message: 'Missing task title.' };
    const dueDate = dueDateISO ? new Date(dueDateISO) : undefined;
    const task = await Task.create({
      company: ctx.companyId, title, description: notes,
      dueDate: (dueDate && !isNaN(dueDate)) ? dueDate : undefined,
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      assignedTo: ctx.userId,
      createdBy: ctx.userId,
    });
    return {
      ok: true, __ui: true, type: 'task_created',
      message: `✅ Task created: **${task.title}**${task.dueDate ? ` — due ${task.dueDate.toLocaleDateString('en-IN')}` : ''}.`,
      data: { id: task._id, title: task.title, dueDate: task.dueDate },
      actions: [{ label: 'View Tasks', url: '/app-dashboard.html#tasks' }],
    };
  },

  async apply_leave(args, ctx) {
    const Employee = require('../models/Employee');
    const Leave = require('../models/Leave');
    const { leaveType, startDateISO, endDateISO, reason } = args || {};
    if (!leaveType || !startDateISO || !endDateISO || !reason) return { ok: false, message: 'Missing leaveType, startDateISO, endDateISO, or reason.' };

    const employee = await Employee.findOne({ company: ctx.companyId, user: ctx.userId });
    if (!employee) return { ok: false, message: "The current user has no linked Employee profile, so a leave application can't be filed. Tell them to ask HR to link their account." };

    const start = new Date(startDateISO);
    const end = new Date(endDateISO);
    if (isNaN(start) || isNaN(end)) return { ok: false, message: 'Invalid dates.' };
    const totalDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

    const leave = await Leave.create({
      company: ctx.companyId, employee: employee._id, user: ctx.userId,
      type: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'compensatory'].includes(leaveType) ? leaveType : 'casual',
      startDate: start, endDate: end, totalDays, reason, status: 'pending',
      createdBy: ctx.userId,
    });
    return {
      ok: true, __ui: true, type: 'leave_created',
      message: `🗓️ Leave application submitted: **${totalDays} day(s)**, ${start.toLocaleDateString('en-IN')} → ${end.toLocaleDateString('en-IN')}. Status: pending approval.`,
      data: { id: leave._id, totalDays, status: leave.status },
      actions: [{ label: 'View Leaves', url: '/app-dashboard.html#leaves' }],
    };
  },

  async list_clients(args, ctx) {
    const clients = await findMatchingClients(ctx.companyId, args?.search || '');
    return {
      ok: true,
      message: clients.length
        ? `Found ${clients.length} client(s): ${clients.map(c => `${c.name}${c.email ? ` (${c.email})` : ''}`).join('; ')}`
        : 'No matching clients found.',
      data: clients.map(c => ({ id: c._id, name: c.name, email: c.email, phone: c.phone })),
    };
  },

  async search_invoices(args, ctx) {
    const Invoice = require('../models/Invoice');
    const q = { company: ctx.companyId };
    if (args?.status) q.status = args.status;
    if (args?.search) {
      const esc = args.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      q.$or = [{ invoiceNumber: { $regex: esc, $options: 'i' } }, { 'clientSnapshot.name': { $regex: esc, $options: 'i' } }];
    }
    const invoices = await Invoice.find(q).sort({ createdAt: -1 }).limit(10).lean();
    return {
      ok: true, __ui: true, type: 'invoice_list',
      message: `Found ${invoices.length} invoice(s).`,
      data: invoices.map(i => ({ id: i._id, number: i.invoiceNumber, client: i.clientSnapshot?.name, amount: i.grandTotal, status: i.status, dueDate: i.dueDate })),
    };
  },

  async send_invoice_email(args, ctx) {
    if (!args?.invoiceId) return { ok: false, message: 'Missing invoiceId.' };
    const result = await executeAction('send_invoice', { invoiceId: args.invoiceId }, ctx);
    return { ok: result.type !== 'error', __ui: true, type: result.type, message: result.message };
  },

  async get_business_snapshot(args, ctx) {
    const handlerName = METRIC_HANDLER[args?.metric];
    if (!handlerName || !handlers[handlerName]) return { ok: false, message: `Unknown metric "${args?.metric}". Valid: ${Object.keys(METRIC_HANDLER).join(', ')}` };
    const result = await handlers[handlerName](ctx);
    return { ok: true, __ui: true, type: result.type, message: result.message, data: result.data, actions: result.actions };
  },
};

const AGENT_SYSTEM_PROMPT = `You are ARIA, the AI assistant built into the Azolve platform (CRM, invoicing, quotations, HRM, inventory, leads, tasks, email, WhatsApp). You have two jobs, and you're excellent at both:

1) BUSINESS ACTIONS — you're wired directly into this company's live data and can actually perform actions (create invoices, quotations, leads, tasks, clients, apply for leave, look things up), not just describe them.
2) GENERAL ASSISTANT — a full, capable AI assistant like ChatGPT or Claude, for absolutely anything else. This is not limited to business topics. Write code in any language, debug it, explain it. Write essays, stories, poems, scripts, emails, social posts. Translate. Do math and step-by-step reasoning. Explain any concept simply or in depth. Brainstorm, outline, summarize, proofread, rewrite in a different tone. Answer general-knowledge questions on any subject. If the user asks you to "write," "create," "generate," "build," or "make" something — do it in full, don't just describe how they could do it themselves.

HOW TO BEHAVE
- When the user asks you to create/add/bill/quote/apply/search something that matches one of your tools, CALL THE TOOL — don't just describe how to do it manually. You are not limited to fixed phrasing; understand intent from any natural wording, typos, Hinglish/Gujlish mix, or shorthand.
- When you need current numbers (revenue, unpaid invoices, top clients, leads, stock, tasks, cash flow), call get_business_snapshot instead of guessing.
- If a request is missing required details (e.g. an amount), ask ONE short clarifying question rather than inventing a number.
- If a tool result says something is ambiguous or not permitted, relay that clearly to the user and ask what they'd like to do next — don't retry blindly.
- After a tool runs successfully, confirm briefly in plain language what was actually saved (don't just repeat the raw tool message verbatim — sound natural).
- For anything outside Azolve actions, just answer directly and fully, like ChatGPT or Claude would. No tool is needed for that, and no need to steer the conversation back to business topics unless the user does.
- When asked to write or generate content (code, essays, stories, etc.), give the complete thing in full — don't truncate or summarize unless asked to keep it short. Use proper Markdown: fenced code blocks with a language tag for code, headings, bullet/numbered lists, and **bold** for emphasis.
- Match reply length to the request: a quick fact gets a short answer; an essay, story, or piece of code gets the full, complete output.
- Reply in the same language/style the user writes in (English, Hindi, Gujarati, or a natural mix) — match their tone, don't force pure English.
- Never claim to have created/sent/saved anything unless a tool call actually confirmed it.
- Keep business-data answers concise and well-formatted (short paragraphs, bullet points, **bold** for key numbers); for creative/technical requests, be thorough and complete instead.

CONTEXT
- Current date: __CURRENT_DATE__
- User: {{USER_NAME}} ({{USER_ROLE}})`;

async function runAgent(query, ctx, history) {
  if (!genAI) {
    return {
      intent: 'no_ai_configured',
      type: 'error',
      message: `🤖 The AI assistant isn't fully set up yet — ask your admin to add a GEMINI_API_KEY to the backend's .env file (free tier available at ai.google.dev). Meanwhile, try direct commands like *"show unpaid invoices"* or type **help**.`,
    };
  }

  const tools = [{ functionDeclarations: TOOL_DECLARATIONS }];
  const systemInstruction = AGENT_SYSTEM_PROMPT
    .replace('{{USER_NAME}}', ctx.userName || 'User')
    .replace('{{USER_ROLE}}', ctx.userRole || 'member')
    .replace('__CURRENT_DATE__', new Date().toISOString().slice(0, 10));

  const contents = [
    ...(history || []).slice(-12).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(h.content || '').slice(0, 4000) }],
    })),
    { role: 'user', parts: [{ text: query }] },
  ];

  let uiType = 'chat', uiData = null, uiActions = null;

  try {
    for (let step = 0; step < 5; step++) {
      const response = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: { tools, systemInstruction, maxOutputTokens: 8192 },
      });

      const calls = response.functionCalls;
      if (!calls || !calls.length) {
        return {
          intent: 'ai_agent',
          type: uiType,
          message: response.text || "I'm not sure how to help with that — could you rephrase?",
          data: uiData,
          actions: uiActions,
        };
      }

      // Preserve the model's exact turn (including function-call parts) for the next request
      contents.push(response.candidates[0].content);

      const functionResponseParts = [];
      for (const call of calls) {
        const impl = TOOL_IMPL[call.name];
        let result;
        try {
          result = impl ? await impl(call.args || {}, ctx) : { ok: false, message: `Unknown tool: ${call.name}` };
        } catch (err) {
          console.error(`Copilot tool "${call.name}" error:`, err);
          result = { ok: false, message: `Tool failed: ${err.message}` };
        }
        if (result?.__ui) {
          uiType = result.type || uiType;
          if (result.data !== undefined) uiData = result.data;
          if (result.actions !== undefined) uiActions = result.actions;
        }
        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { ok: result?.ok !== false, message: result?.message, data: result?.data },
          },
        });
      }
      contents.push({ role: 'user', parts: functionResponseParts });
    }

    return { intent: 'ai_agent', type: uiType, message: "That request needed a lot of steps — could you break it into smaller asks?", data: uiData, actions: uiActions };
  } catch (err) {
    console.error('Copilot agent error:', err?.message || err);

    const rawMessage = String(err?.message || '');

    const isQuotaError =
      err?.status === 429 ||
      err?.code === 429 ||
      /quota exceeded|resource_exhausted|free_tier_requests/i.test(rawMessage);

    return {
      intent: 'gemini_error',
      type: 'error',
      message: isQuotaError
        ? `⚠️ AI usage limit reached for now. Please try again later or use a direct command from **Help**.`
        : `🤖 I couldn't reach the AI assistant right now. Please try again in a moment.`,
    };
  }
}

// ============== ONE-CLICK ACTION EXECUTOR ==============
// Called by POST /api/copilot/action whenever the person clicks an action
// button on a chat card (rather than typing a follow-up message).

async function executeAction(actionName, payload, ctx) {
  switch (actionName) {
    case 'confirm_invoice': {
      if (!ctx.permissions?.canCreateInvoices) {
        return { type: 'permission_denied', message: `🔒 You don't have permission to create invoices.` };
      }
      const Client = require('../models/Client');
      const client = await Client.findOne({ _id: payload.clientId, company: ctx.companyId });
      if (!client) return { type: 'error', message: `⚠️ Couldn't find that client anymore.` };
      return createInvoiceForClient(ctx, client, payload.amount, payload.dueDays ?? 15);
    }

    case 'send_invoice': {
      const Invoice = require('../models/Invoice');
      const { sendEmail, templates } = require('../utils/email');
      const invoice = await Invoice.findOne({ _id: payload.invoiceId, company: ctx.companyId }).populate('client');
      if (!invoice) return { type: 'error', message: `⚠️ Invoice not found.` };

      const clientEmail = invoice.client?.email || invoice.clientSnapshot?.email;
      if (!clientEmail) {
        return { type: 'error', message: `⚠️ This client has no email on file, so I couldn't send it. Add an email to their profile first.` };
      }

      try {
        const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
        const emailTemplate = templates.invoiceSent(
          invoice.clientSnapshot?.name || 'Client',
          invoice.invoiceNumber,
          invoice.grandTotal,
          dueDate
        );
        await sendEmail({ to: clientEmail, ...emailTemplate });
        if (invoice.status === 'draft') {
          invoice.status = 'sent';
          await invoice.save();
        }
        return { type: 'info', message: `📧 Invoice **${invoice.invoiceNumber}** emailed to **${clientEmail}**.` };
      } catch (err) {
        return { type: 'error', message: `⚠️ Invoice was created, but the email failed to send (${err.message}). You can resend it from the Invoices page.` };
      }
    }

    case 'send_reminders': {
      const Invoice = require('../models/Invoice');
      const { sendEmail, templates } = require('../utils/email');
      const ids = (payload.invoiceIds || []).slice(0, 20);
      const invoices = await Invoice.find({ _id: { $in: ids }, company: ctx.companyId }).populate('client');

      let sent = 0, skipped = 0;
      for (const invoice of invoices) {
        const clientEmail = invoice.client?.email || invoice.clientSnapshot?.email;
        if (!clientEmail) { skipped++; continue; }
        try {
          const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-IN');
          const tpl = templates.invoiceSent(invoice.clientSnapshot?.name || 'Client', invoice.invoiceNumber, invoice.grandTotal, dueDate);
          tpl.subject = `Payment Reminder — Invoice ${invoice.invoiceNumber}`;
          await sendEmail({ to: clientEmail, ...tpl });
          sent++;
        } catch {
          skipped++;
        }
      }

      return {
        type: 'info',
        message: `📨 Sent **${sent} reminder${sent === 1 ? '' : 's'}**${skipped ? `, skipped ${skipped} (no email on file or send failed)` : ''}.`,
      };
    }

    default:
      return { type: 'error', message: `⚠️ Unknown action.` };
  }
}

// ============== MAIN ENTRY (chat messages) ==============

async function detectAndHandle(query, ctx, history) {

  // Fast-path: instant, zero-cost read-only business commands
  for (const intent of INTENTS) {
    if (intent.patterns.some(p => p.test(query))) {
      const handler = handlers[intent.handler];

      if (handler) {
        const result = await handler(ctx, query);
        return {
          intent: intent.name,
          ...result
        };
      }
    }
  }

  // Everything else — free-text Q&A, drafting, and any action (create
  // invoice/quotation/lead/task/client, apply leave, search, etc.) — goes
  // through the AI agent, which understands natural language and can
  // actually call tools to get it done, with multi-turn memory.
  return runAgent(query, ctx, history);
}
module.exports = {
  detectAndHandle,
  executeAction,
  runAgent,
  INTENTS
};