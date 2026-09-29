/**
 * WhatsApp Business Cloud API Service
 * Replaces fragile Puppeteer/whatsapp-web.js with official Meta API
 *
 * Setup:
 *   - Create Meta WhatsApp Business app: https://developers.facebook.com/
 *   - Get Phone Number ID + Permanent Access Token
 *   - Set webhook URL: https://your-app.com/api/whatsapp/webhook
 *
 * Env vars required:
 *   WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_VERIFY_TOKEN, WA_BUSINESS_ACCOUNT_ID
 */
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const API_VERSION = process.env.WA_API_VERSION || 'v20.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

class WhatsAppService {
  constructor(opts = {}) {
    this.phoneNumberId = opts.phoneNumberId || process.env.WA_PHONE_NUMBER_ID;
    this.accessToken = opts.accessToken || process.env.WA_ACCESS_TOKEN;
    this.businessAccountId = opts.businessAccountId || process.env.WA_BUSINESS_ACCOUNT_ID;
    this.verifyToken = opts.verifyToken || process.env.WA_VERIFY_TOKEN || 'azolve-verify';
  }

  isConfigured() {
    return !!(this.phoneNumberId && this.accessToken);
  }

  _normalizePhone(phone) {
    let p = String(phone || '').replace(/\D/g, '');
    if (p.length === 10) p = '91' + p; // assume India
    return p;
  }

  async _request(endpoint, body, method = 'POST') {
    if (!this.isConfigured()) {
      // Mock mode for development
      console.log('[WhatsApp MOCK]', endpoint, body);
      return { messaging_product: 'whatsapp', messages: [{ id: 'wamid.MOCK_' + Date.now() }], mock: true };
    }
    const f = await fetch;
    const res = await f(`${BASE}/${this.phoneNumberId}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`WhatsApp API error: ${data.error?.message || res.statusText} (code ${data.error?.code})`);
    }
    return data;
  }

  /**
   * Send a free-form text message (only allowed within 24h customer service window)
   */
  async sendText(to, text, previewUrl = false) {
    return this._request('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this._normalizePhone(to),
      type: 'text',
      text: { preview_url: previewUrl, body: text },
    });
  }

  /**
   * Send template message (use for marketing / outside 24h window)
   */
  async sendTemplate(to, templateName, languageCode = 'en', components = []) {
    return this._request('/messages', {
      messaging_product: 'whatsapp',
      to: this._normalizePhone(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  /**
   * Send image (URL or media ID)
   */
  async sendImage(to, source, caption = '') {
    const image = source.startsWith('http') ? { link: source } : { id: source };
    if (caption) image.caption = caption;
    return this._request('/messages', {
      messaging_product: 'whatsapp', to: this._normalizePhone(to),
      type: 'image', image,
    });
  }

  async sendDocument(to, source, filename = '', caption = '') {
    const document = source.startsWith('http') ? { link: source } : { id: source };
    if (filename) document.filename = filename;
    if (caption) document.caption = caption;
    return this._request('/messages', {
      messaging_product: 'whatsapp', to: this._normalizePhone(to),
      type: 'document', document,
    });
  }

  async sendVideo(to, source, caption = '') {
    const video = source.startsWith('http') ? { link: source } : { id: source };
    if (caption) video.caption = caption;
    return this._request('/messages', {
      messaging_product: 'whatsapp', to: this._normalizePhone(to),
      type: 'video', video,
    });
  }

  /**
   * Interactive button message (max 3 buttons)
   */
  async sendButtons(to, bodyText, buttons, headerText = '', footerText = '') {
    const payload = {
      messaging_product: 'whatsapp', to: this._normalizePhone(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.slice(0, 3).map((b, i) => ({
            type: 'reply',
            reply: { id: b.id || `btn_${i}`, title: String(b.title).slice(0, 20) },
          })),
        },
      },
    };
    if (headerText) payload.interactive.header = { type: 'text', text: headerText };
    if (footerText) payload.interactive.footer = { text: footerText };
    return this._request('/messages', payload);
  }

  /**
   * Interactive list message (max 10 sections, 10 rows each)
   */
  async sendList(to, bodyText, buttonText, sections, headerText = '', footerText = '') {
    const payload = {
      messaging_product: 'whatsapp', to: this._normalizePhone(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: { button: buttonText, sections },
      },
    };
    if (headerText) payload.interactive.header = { type: 'text', text: headerText };
    if (footerText) payload.interactive.footer = { text: footerText };
    return this._request('/messages', payload);
  }

  async markAsRead(messageId) {
    return this._request('/messages', {
      messaging_product: 'whatsapp', status: 'read', message_id: messageId,
    });
  }

  /**
   * Verify webhook (Meta calls GET with hub.* params)
   */
  verifyWebhook(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (mode === 'subscribe' && token === this.verifyToken) return challenge;
    return null;
  }

  /**
   * Parse incoming webhook payload into a clean event
   */
  parseWebhook(body) {
    try {
      const change = body.entry?.[0]?.changes?.[0]?.value;
      if (!change) return null;

      // Status update (sent/delivered/read/failed)
      if (change.statuses) {
        return change.statuses.map(s => ({
          kind: 'status',
          messageId: s.id,
          status: s.status, // 'sent' | 'delivered' | 'read' | 'failed'
          recipient: s.recipient_id,
          timestamp: new Date(parseInt(s.timestamp) * 1000),
          error: s.errors?.[0]?.title,
        }));
      }

      // Incoming message
      if (change.messages) {
        const contact = change.contacts?.[0];
        return change.messages.map(m => ({
          kind: 'message',
          messageId: m.id,
          from: m.from,
          contactName: contact?.profile?.name,
          timestamp: new Date(parseInt(m.timestamp) * 1000),
          type: m.type,
          text: m.text?.body,
          buttonReply: m.interactive?.button_reply,
          listReply: m.interactive?.list_reply,
          image: m.image,
          document: m.document,
          audio: m.audio,
          location: m.location,
        }));
      }
    } catch (e) {
      console.error('parseWebhook error:', e);
    }
    return null;
  }

  /**
   * Pre-built templates for common SMB scenarios
   */
  async sendInvoiceNotification(to, { customerName, invoiceNumber, amount, dueDate, paymentLink }) {
    const text = `🧾 *Invoice from ${customerName ? '' : 'us'}*\n\n` +
      `Hi ${customerName || 'there'},\n\n` +
      `Your invoice *${invoiceNumber}* for ₹${amount} is ready.\n` +
      `Due Date: ${new Date(dueDate).toLocaleDateString('en-IN')}\n\n` +
      (paymentLink ? `💳 Pay now: ${paymentLink}\n\n` : '') +
      `Thank you for your business!`;
    return this.sendText(to, text, !!paymentLink);
  }

  async sendPaymentReminder(to, { customerName, invoiceNumber, amount, daysOverdue, paymentLink }) {
    const buttons = paymentLink ? [
      { id: 'pay_now', title: 'Pay Now' },
      { id: 'request_extension', title: 'Need Extension' },
      { id: 'contact_support', title: 'Contact Us' },
    ] : [
      { id: 'request_extension', title: 'Need Extension' },
      { id: 'contact_support', title: 'Contact Us' },
    ];
    const body = `Hi ${customerName || ''},\n\nYour invoice *${invoiceNumber}* for ₹${amount} is *${daysOverdue} days overdue*. ` +
      `Please clear at the earliest to avoid late fees.${paymentLink ? `\n\n💳 Quick pay: ${paymentLink}` : ''}`;
    return this.sendButtons(to, body, buttons, '⏰ Payment Reminder', 'Powered by Azolve');
  }

  async sendOrderConfirmation(to, { orderNumber, items, total, eta }) {
    const itemList = items.map(i => `• ${i.name} × ${i.qty} = ₹${i.amount}`).join('\n');
    const text = `✅ *Order Confirmed: ${orderNumber}*\n\n${itemList}\n\n*Total: ₹${total}*\n` +
      (eta ? `📦 Estimated delivery: ${eta}\n` : '') +
      `\nThank you for ordering with us!`;
    return this.sendText(to, text);
  }
}

module.exports = new WhatsAppService();
module.exports.WhatsAppService = WhatsAppService;
