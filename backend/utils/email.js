const nodemailer = require('nodemailer');
const { BrevoClient, BrevoError } = require('@getbrevo/brevo');

// ============================================================
// EMAIL DELIVERY SYSTEM
// Primary: Brevo HTTP API (works on Render free tier — port 443)
// Fallback: SMTP (for local dev / hosts that allow SMTP ports)
// ============================================================
//
// Render.com free tier blocks outbound SMTP ports (25, 465, 587)
// as of September 2025. The Brevo HTTP API uses HTTPS (port 443)
// which is NOT blocked, making it the reliable choice for Render.
//
// Setup:
//   1. Go to Brevo → SMTP & API → API Keys → Generate new key
//   2. Add BREVO_API_KEY to your Render environment variables
//   3. Verify sender email in Brevo → Senders
// ============================================================

// --- Brevo API Client (singleton) ---
let _brevoClient = null;

const getBrevoClient = () => {
  if (_brevoClient) return _brevoClient;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  _brevoClient = new BrevoClient({
    apiKey,
    timeout: 30000,
    maxRetries: 2,
  });
  console.log('✅ Brevo HTTP API client initialized (v5 SDK)');
  return _brevoClient;
};

// --- Send via Brevo HTTP API ---
const sendViaBrevoApi = async ({ to, subject, html, text }) => {
  const client = getBrevoClient();
  if (!client) {
    return { success: false, message: 'BREVO_API_KEY not configured', method: 'brevo-api' };
  }

  try {
    const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'connect@azolve.io';
    const senderName = process.env.EMAIL_FROM_NAME || 'Azolve';

    console.log(`📧 Sending via Brevo HTTP API to: ${to}`);
    console.log(`   From: ${senderName} <${senderEmail}>`);

    const response = await client.transactionalEmails.sendTransacEmail({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]+>/g, ''),
    });

    console.log(`✅ Email sent via Brevo API to ${to}:`, JSON.stringify(response).substring(0, 200));
    return { success: true, messageId: response.messageId, method: 'brevo-api' };
  } catch (error) {
    console.error('❌ Brevo API send failed:', error.message);
    if (error instanceof BrevoError) {
      console.error('   Status:', error.statusCode);
      console.error('   Body:', JSON.stringify(error.body || {}).substring(0, 500));
    }
    return { success: false, message: error.message, method: 'brevo-api' };
  }
};

// --- SMTP Transporter (fallback) ---
let _transporter = null;
let _transporterValid = false;

const createTransporter = () => {
  if (_transporter && _transporterValid) return _transporter;

  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  const secure = process.env.EMAIL_SECURE === 'true';

  console.log(`📧 Creating SMTP transporter: ${host}:${port} (secure=${secure})`);

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  _transporterValid = true;

  _transporter.on('error', (err) => {
    console.error('❌ SMTP transporter error:', err.message);
    _transporterValid = false;
    _transporter = null;
  });

  return _transporter;
};

// Verify SMTP connection
const verifyTransporter = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return { success: false, message: 'EMAIL_USER or EMAIL_PASS not configured' };
    }

    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ SMTP transporter verified successfully');
    return { success: true, message: 'SMTP connection verified' };
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    _transporterValid = false;
    _transporter = null;
    return { success: false, message: error.message, code: error.code };
  }
};

// --- Send via SMTP (fallback) ---
const sendViaSmtp = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return { success: false, message: 'EMAIL_USER or EMAIL_PASS not configured', method: 'smtp' };
    }

    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || `Azolve <${process.env.EMAIL_USER}>`;

    console.log(`📧 Sending via SMTP to: ${to}`);
    console.log(`   From: ${fromAddress}`);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });

    console.log(`✅ Email sent via SMTP to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId, response: info.response, method: 'smtp' };
  } catch (error) {
    console.error('❌ SMTP send failed:', error.message);
    console.error('   Error code:', error.code);
    if (error.command) console.error('   Failed command:', error.command);
    if (error.response) console.error('   SMTP response:', error.response);

    if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
      _transporterValid = false;
      _transporter = null;
    }

    return { success: false, message: error.message, code: error.code, method: 'smtp' };
  }
};

// ============================================================
// MAIN SEND FUNCTION — auto-selects best delivery method
// ============================================================
// Priority:
//   1. BREVO_API_KEY set → Brevo HTTP API (port 443, works everywhere)
//   2. EMAIL_USER/EMAIL_PASS set → SMTP fallback (may fail on Render free tier)
//   3. Neither configured → skip email with warning
// ============================================================
const sendEmail = async ({ to, subject, html, text }) => {
  const hasBrevoApiKey = !!process.env.BREVO_API_KEY;
  const hasSmtpConfig = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  // --- Method 1: Brevo HTTP API (preferred) ---
  if (hasBrevoApiKey) {
    console.log('📧 Using Brevo HTTP API (primary method)');
    const result = await sendViaBrevoApi({ to, subject, html, text });
    if (result.success) return result;

    // API failed — try SMTP as fallback if configured
    if (hasSmtpConfig) {
      console.log('⚠️ Brevo API failed, falling back to SMTP...');
      const smtpResult = await sendViaSmtp({ to, subject, html, text });
      return smtpResult;
    }

    return result;
  }

  // --- Method 2: SMTP (fallback) ---
  if (hasSmtpConfig) {
    console.log('📧 Using SMTP (BREVO_API_KEY not set, using EMAIL_USER/EMAIL_PASS)');
    return await sendViaSmtp({ to, subject, html, text });
  }

  // --- No email config at all ---
  console.warn('⚠️ Email not configured. Skipping email send.');
  console.warn('   Set BREVO_API_KEY (recommended) or EMAIL_USER/EMAIL_PASS');
  return { success: false, message: 'Email not configured' };
};

// ============================================================
// EMAIL TEMPLATES
// ============================================================
const templates = {

  // --- Welcome Email ---
  welcome: (name, companyName) => ({
    subject: `Welcome to Azolve — ${companyName} is ready! 🎉`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);border-radius:16px 16px 0 0;padding:36px;text-align:center">
          <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px">Business Management Platform</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
          <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px">Welcome aboard, ${name}! 👋</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px">
            Your Azolve workspace for <strong style="color:#714B67">${companyName}</strong> is ready. You now have access to your complete business management suite.
          </p>
          <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:24px 0">
            <p style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 12px">What's included:</p>
            <table width="100%" cellpadding="4" cellspacing="0">
              <tr><td style="font-size:14px;color:#334155">✅ CRM — Manage customers & leads</td></tr>
              <tr><td style="font-size:14px;color:#334155">✅ Invoicing — Create & send invoices</td></tr>
              <tr><td style="font-size:14px;color:#334155">✅ POS Terminal — Point of sale</td></tr>
              <tr><td style="font-size:14px;color:#334155">✅ HRM — HR & employee management</td></tr>
              <tr><td style="font-size:14px;color:#334155">✅ Projects — Task & project tracking</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin:28px 0">
            <a href="${process.env.FRONTEND_URL || 'https://azolve.io'}/login.html"
               style="background:linear-gradient(135deg,#714B67,#00A09D);color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">
              🚀 Go to Dashboard
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center">
            If you didn't create this account, please ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0">
            © ${new Date().getFullYear()} Azolve · <a href="${process.env.FRONTEND_URL || 'https://azolve.io'}" style="color:#714B67;text-decoration:none">${process.env.FRONTEND_URL || 'https://azolve.io'}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),

  // --- Password Reset Email ---
  resetPassword: (name, resetUrl) => ({
    subject: '🔑 Azolve — Password Reset Request',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);border-radius:16px 16px 0 0;padding:36px;text-align:center">
          <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px">Password Reset Request</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">

          <div style="text-align:center;margin-bottom:28px">
            <div style="width:72px;height:72px;background:rgba(113,75,103,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px">🔑</div>
          </div>

          <h2 style="color:#1e293b;font-size:22px;margin:0 0 12px;text-align:center">Reset Your Password</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;text-align:center">
            Hi <strong>${name}</strong>, we received a request to reset your Azolve account password.
          </p>

          <!-- Reset Button -->
          <div style="text-align:center;margin:28px 0">
            <a href="${resetUrl}"
               style="background:linear-gradient(135deg,#714B67,#00A09D);color:#fff;padding:16px 40px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block;letter-spacing:0.3px">
              🔑 Reset My Password
            </a>
          </div>

          <!-- Expiry warning -->
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0;text-align:center">
            <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 4px">⏰ This link expires in 30 minutes</p>
            <p style="color:#78350f;font-size:12px;margin:0">After that, you'll need to request a new reset link.</p>
          </div>

          <!-- Link fallback -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0">
            <p style="color:#64748b;font-size:12px;margin:0 0 8px;font-weight:600">If the button doesn't work, copy and paste this link:</p>
            <p style="color:#714B67;font-size:12px;word-break:break-all;margin:0">${resetUrl}</p>
          </div>

          <!-- Security notice -->
          <div style="border-top:1px solid #f1f5f9;padding-top:20px;margin-top:20px">
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
              🛡️ If you did not request a password reset, please ignore this email.<br>
              Your password will remain unchanged and the link will expire automatically.
            </p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0">
            © ${new Date().getFullYear()} Azolve · <a href="${process.env.FRONTEND_URL || 'https://azolve.io'}" style="color:#714B67;text-decoration:none">${process.env.FRONTEND_URL || 'https://azolve.io'}</a><br>
            <span style="font-size:11px">This is an automated email. Please do not reply.</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),

  // --- Invoice Sent ---
  invoiceSent: (clientName, invoiceNumber, amount, dueDate, viewUrl) => ({
    subject: `Invoice ${invoiceNumber} from Azolve`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">Invoice ${invoiceNumber}</div>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="color:#334155;font-size:15px">Hi <strong>${clientName}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.7">A new invoice has been generated for you. Please review the details below.</p>
          <table width="100%" style="border-collapse:collapse;margin:20px 0;border-radius:10px;overflow:hidden">
            <tr style="background:#f8fafc">
              <td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">Invoice #</td>
              <td style="padding:12px 16px;color:#1e293b;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">Amount</td>
              <td style="padding:12px 16px;color:#714B67;font-weight:700;font-size:16px;border-bottom:1px solid #e2e8f0">₹${amount}</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:12px 16px;color:#64748b;font-size:13px">Due Date</td>
              <td style="padding:12px 16px;color:#1e293b;font-weight:700;font-size:13px">${dueDate}</td>
            </tr>
          </table>
          ${viewUrl ? `<div style="text-align:center;margin:24px 0"><a href="${viewUrl}" style="background:linear-gradient(135deg,#714B67,#00A09D);color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;display:inline-block">View Invoice</a></div>` : ''}
          <p style="color:#94a3b8;font-size:12px;text-align:center">Thank you for your business! 🙏</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),

  // --- Invoice Detailed (full itemized invoice, sent via Email button) ---
  invoiceDetailed: (data) => {
    const {
      company = {}, client = {}, invoiceNumber, issueDate, dueDate,
      items = [], subtotal = 0, taxAmount = 0, discountAmount = 0,
      shippingCost = 0, grandTotal = 0, amountPaid = 0, balanceDue = 0,
      currency = 'INR', status = 'pending', notes = '',
    } = data;

    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', CAD: 'C$' };
    const cur = symbols[currency] || currency || '₹';
    const fmt = (n) => cur + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const statusStyles = {
      paid: { bg: '#dcfce7', color: '#16a34a', label: 'PAID' },
      pending: { bg: '#fef9c3', color: '#ca8a04', label: 'PENDING' },
      sent: { bg: '#dbeafe', color: '#2563eb', label: 'SENT' },
      overdue: { bg: '#fee2e2', color: '#dc2626', label: 'OVERDUE' },
      partial: { bg: '#fef3c7', color: '#d97706', label: 'PARTIALLY PAID' },
      draft: { bg: '#f1f5f9', color: '#64748b', label: 'DRAFT' },
    };
    const st = statusStyles[status] || statusStyles.pending;

    const rows = items.map((it, idx) => {
      const qty = Number(it.quantity || it.qty || 1);
      const price = Number(it.price || 0);
      const lineSubtotal = qty * price;
      const lineTotal = Number(it.total != null ? it.total : lineSubtotal);
      return `<tr style="background:${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}">
        <td style="padding:10px 14px;color:#1e293b;font-size:13px;border-bottom:1px solid #e2e8f0">${it.name || it.description || it.desc || 'Item'}</td>
        <td style="padding:10px 14px;color:#475569;font-size:13px;text-align:center;border-bottom:1px solid #e2e8f0">${qty}</td>
        <td style="padding:10px 14px;color:#475569;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0">${fmt(price)}</td>
        <td style="padding:10px 14px;color:#1e293b;font-weight:700;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0">${fmt(lineTotal)}</td>
      </tr>`;
    }).join('');

    return {
      subject: `Invoice ${invoiceNumber} from ${company.name || 'Azolve'} — ${fmt(grandTotal)} due ${dueDate || ''}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);padding:32px 36px">
          <table width="100%"><tr>
            <td style="vertical-align:top">
              <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-0.5px">${company.name || 'Azolve'}</div>
              ${company.email ? `<div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">${company.email}</div>` : ''}
              ${company.phone ? `<div style="color:rgba(255,255,255,0.8);font-size:12px">${company.phone}</div>` : ''}
            </td>
            <td style="vertical-align:top;text-align:right">
              <div style="font-size:13px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px">Invoice</div>
              <div style="font-size:20px;font-weight:800;color:#fff;margin-top:2px">${invoiceNumber}</div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Greeting + status -->
        <tr><td style="padding:28px 36px 0">
          <table width="100%"><tr>
            <td style="vertical-align:middle">
              <p style="color:#334155;font-size:15px;margin:0">Hi <strong>${client.name || 'there'}</strong>,</p>
              <p style="color:#64748b;font-size:13px;margin:6px 0 0">Please find your invoice details below.</p>
            </td>
            <td style="vertical-align:middle;text-align:right">
              <span style="display:inline-block;background:${st.bg};color:${st.color};font-size:12px;font-weight:800;letter-spacing:0.5px;padding:6px 14px;border-radius:20px">${st.label}</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Meta -->
        <tr><td style="padding:20px 36px 0">
          <table width="100%" style="background:#f8fafc;border-radius:10px">
            <tr>
              <td style="padding:14px 16px;font-size:12px;color:#94a3b8">Issue Date<br><strong style="color:#1e293b;font-size:13px">${issueDate || '—'}</strong></td>
              <td style="padding:14px 16px;font-size:12px;color:#94a3b8">Due Date<br><strong style="color:#1e293b;font-size:13px">${dueDate || '—'}</strong></td>
              <td style="padding:14px 16px;font-size:12px;color:#94a3b8;text-align:right">Amount Due<br><strong style="color:#714B67;font-size:16px">${fmt(balanceDue)}</strong></td>
            </tr>
          </table>
        </td></tr>

        <!-- Line items -->
        <tr><td style="padding:24px 36px 0">
          <table width="100%" style="border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0">
            <thead><tr style="background:#1e293b">
              <th style="padding:10px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;text-align:left">Item</th>
              <th style="padding:10px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;text-align:center">Qty</th>
              <th style="padding:10px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Price</th>
              <th style="padding:10px 14px;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;text-align:right">Total</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;font-size:13px">No items</td></tr>`}</tbody>
          </table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:18px 36px 0">
          <table width="100%" style="max-width:280px;margin-left:auto">
            <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Subtotal</td><td style="padding:5px 0;color:#1e293b;font-size:13px;text-align:right">${fmt(subtotal)}</td></tr>
            ${taxAmount ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Tax</td><td style="padding:5px 0;color:#1e293b;font-size:13px;text-align:right">${fmt(taxAmount)}</td></tr>` : ''}
            ${discountAmount ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Discount</td><td style="padding:5px 0;color:#dc2626;font-size:13px;text-align:right">-${fmt(discountAmount)}</td></tr>` : ''}
            ${shippingCost ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Shipping</td><td style="padding:5px 0;color:#1e293b;font-size:13px;text-align:right">${fmt(shippingCost)}</td></tr>` : ''}
            <tr><td style="padding:10px 0 5px;color:#1e293b;font-size:15px;font-weight:800;border-top:2px solid #e2e8f0">Grand Total</td><td style="padding:10px 0 5px;color:#714B67;font-size:16px;font-weight:800;text-align:right;border-top:2px solid #e2e8f0">${fmt(grandTotal)}</td></tr>
            ${amountPaid ? `<tr><td style="padding:5px 0;color:#16a34a;font-size:13px">Amount Paid</td><td style="padding:5px 0;color:#16a34a;font-size:13px;text-align:right">-${fmt(amountPaid)}</td></tr>
            <tr><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:800">Balance Due</td><td style="padding:5px 0;color:#1e293b;font-size:14px;font-weight:800;text-align:right">${fmt(balanceDue)}</td></tr>` : ''}
          </table>
        </td></tr>

        ${notes ? `<tr><td style="padding:20px 36px 0"><div style="background:#f8fafc;border-left:4px solid #714B67;border-radius:0 8px 8px 0;padding:14px 16px"><p style="margin:0;color:#475569;font-size:13px;line-height:1.6"><strong style="color:#1e293b">Note:</strong> ${notes}</p></div></td></tr>` : ''}

        <!-- Footer -->
        <tr><td style="padding:30px 36px">
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">Thank you for your business! 🙏</p>
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:10px 0 0">This invoice was sent via ${company.name || 'Azolve'} · Powered by Azolve</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    };
  },

  // --- Meeting Invite ---
  meetingInvite: (name, meetingTitle, dateTime, meetingUrl) => ({
    subject: `📅 Meeting Invite: ${meetingTitle}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">Meeting Invitation</div>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="color:#334155;font-size:15px">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">You've been invited to join a meeting:</p>
          <div style="background:#f8fafc;border-left:4px solid #714B67;border-radius:0 10px 10px 0;padding:20px;margin:20px 0">
            <p style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px">${meetingTitle}</p>
            <p style="font-size:14px;color:#64748b;margin:0">📅 ${dateTime}</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="${meetingUrl}" style="background:#00A09D;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;display:inline-block">🎥 Join Meeting</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),

  // --- Support Ticket Created ---
  ticketCreated: (name, ticketNumber, subject, priority) => ({
    subject: `Support Ticket ${ticketNumber}: ${subject}`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">Support Ticket ${ticketNumber}</div>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="color:#334155;font-size:15px">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;font-size:14px">Your support ticket has been created. Our team will respond shortly.</p>
          <table width="100%" style="border-collapse:collapse;margin:20px 0">
            <tr style="background:#f8fafc"><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">Ticket #</td><td style="padding:10px 16px;color:#1e293b;font-weight:700;font-size:13px;border-bottom:1px solid #e2e8f0">${ticketNumber}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0">Subject</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;border-bottom:1px solid #e2e8f0">${subject}</td></tr>
            <tr style="background:#f8fafc"><td style="padding:10px 16px;color:#64748b;font-size:13px">Priority</td><td style="padding:10px 16px;font-size:13px;font-weight:700;text-transform:uppercase;color:${priority==='high'?'#dc2626':priority==='medium'?'#d97706':'#64748b'}">${priority}</td></tr>
          </table>
          <p style="color:#94a3b8;font-size:12px;text-align:center">Thank you for your patience. We typically respond within 24 hours.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),

  // --- Two-Factor Authentication OTP ---
  twoFactorOTP: (name, otpCode) => ({
    subject: '🔐 Azolve — Your Login Verification Code',
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);border-radius:16px 16px 0 0;padding:36px;text-align:center">
          <div style="font-size:36px;font-weight:900;color:#fff;letter-spacing:-1px">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px">Login Verification</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:36px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">

          <div style="text-align:center;margin-bottom:28px">
            <div style="width:72px;height:72px;background:rgba(113,75,103,0.1);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px">🔐</div>
          </div>

          <h2 style="color:#1e293b;font-size:22px;margin:0 0 12px;text-align:center">Verification Code</h2>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center">
            Hi <strong>${name}</strong>, use the following code to complete your sign-in:
          </p>

          <!-- OTP Code Box -->
          <div style="text-align:center;margin:28px 0">
            <div style="display:inline-block;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:2px solid #e2e8f0;border-radius:16px;padding:24px 40px">
              <div style="font-family:'Courier New',Courier,monospace;font-size:42px;font-weight:900;letter-spacing:12px;color:#714B67">${otpCode}</div>
            </div>
          </div>

          <!-- Expiry warning -->
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:24px 0;text-align:center">
            <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 4px">⏰ This code expires in ${process.env.TWO_FACTOR_EXPIRE || '5'} minutes</p>
            <p style="color:#78350f;font-size:12px;margin:0">Do not share this code with anyone.</p>
          </div>

          <!-- Security notice -->
          <div style="border-top:1px solid #f1f5f9;padding-top:20px;margin-top:20px">
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
              🛡️ If you did not attempt to sign in, someone may be trying to access your account.<br>
              Please change your password immediately and contact support.
            </p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:20px;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0">
            © ${new Date().getFullYear()} Azolve · <a href="${process.env.FRONTEND_URL || 'https://azolve.io'}" style="color:#714B67;text-decoration:none">${process.env.FRONTEND_URL || 'https://azolve.io'}</a><br>
            <span style="font-size:11px">This is an automated email. Please do not reply.</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }),
};

module.exports = { sendEmail, verifyTransporter, templates };
