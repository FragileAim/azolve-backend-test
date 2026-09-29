/**
 * Webhook Dispatcher — Fire events to subscribed URLs with HMAC signing
 * + Exponential backoff retry
 */
const crypto = require('crypto');
const { Webhook, WebhookDelivery } = require('../models/Webhook');

const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const RETRY_DELAYS = [60_000, 300_000, 1_800_000, 7_200_000, 21_600_000]; // 1m, 5m, 30m, 2h, 6h

class WebhookDispatcher {
  /**
   * Trigger an event — finds all subscriptions and fires async
   */
  async trigger(companyId, event, payload) {
    try {
      const hooks = await Webhook.find({ companyId, isActive: true, events: event });
      if (!hooks.length) return { fired: 0 };

      // Fire and forget (don't block business logic)
      hooks.forEach(hook => this._deliver(hook, event, payload).catch(err =>
        console.error(`Webhook delivery error (${hook._id}):`, err.message)));

      return { fired: hooks.length };
    } catch (e) {
      console.error('Webhook trigger error:', e);
      return { fired: 0, error: e.message };
    }
  }

  signPayload(secret, payloadString) {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  async _deliver(hook, event, data, attempt = 1) {
    const eventId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const payload = {
      id: eventId,
      event,
      timestamp: new Date().toISOString(),
      companyId: hook.companyId,
      data,
    };
    const body = JSON.stringify(payload);
    const signature = this.signPayload(hook.secret, body);
    const start = Date.now();

    const delivery = await WebhookDelivery.create({
      webhookId: hook._id,
      companyId: hook.companyId,
      event,
      payload,
      url: hook.url,
      attempt,
      status: 'pending',
    });

    try {
      const customHeaders = {};
      if (hook.headers && typeof hook.headers.forEach === 'function') {
        hook.headers.forEach((v, k) => { customHeaders[k] = v; });
      }
      const f = await fetch;
      const res = await f(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Azolve-Event': event,
          'X-Azolve-Event-Id': eventId,
          'X-Azolve-Signature': signature,
          'X-Azolve-Delivery': delivery._id.toString(),
          'X-Azolve-Attempt': String(attempt),
          'User-Agent': 'Azolve-Webhooks/1.0',
          ...customHeaders,
        },
        body,
        // 15s timeout
        signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
      });

      const responseText = await res.text().catch(() => '');
      const duration = Date.now() - start;

      if (res.ok) {
        delivery.status = 'success';
        delivery.responseStatus = res.status;
        delivery.responseBody = responseText.slice(0, 2000);
        delivery.durationMs = duration;
        await delivery.save();

        await Webhook.updateOne({ _id: hook._id }, {
          $set: { lastSuccessAt: new Date(), failureCount: 0 },
          $inc: { totalDeliveries: 1 },
        });
      } else {
        throw new Error(`HTTP ${res.status}: ${responseText.slice(0, 200)}`);
      }
    } catch (err) {
      const duration = Date.now() - start;
      delivery.status = attempt < RETRY_DELAYS.length ? 'retrying' : 'failed';
      delivery.errorMessage = err.message;
      delivery.durationMs = duration;
      if (delivery.status === 'retrying') {
        delivery.nextRetryAt = new Date(Date.now() + RETRY_DELAYS[attempt - 1]);
      }
      await delivery.save();

      await Webhook.updateOne({ _id: hook._id }, {
        $set: { lastFailureAt: new Date(), lastFailureReason: err.message },
        $inc: { failureCount: 1, totalFailures: 1, totalDeliveries: 1 },
      });

      // Schedule retry
      if (delivery.status === 'retrying') {
        setTimeout(() => this._deliver(hook, event, data, attempt + 1).catch(() => {}),
          RETRY_DELAYS[attempt - 1]);
      }

      // Auto-disable after 20 consecutive failures
      if (hook.failureCount >= 20) {
        await Webhook.updateOne({ _id: hook._id }, { isActive: false });
      }
    }
  }

  /**
   * Test fire — synchronous, returns full result
   */
  async test(hook, payload = { test: true, message: 'Test event from Azolve' }) {
    const body = JSON.stringify({
      id: 'test_' + Date.now(),
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: payload,
    });
    const sig = this.signPayload(hook.secret, body);
    const start = Date.now();
    try {
      const f = await fetch;
      const res = await f(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Azolve-Event': 'webhook.test',
          'X-Azolve-Signature': sig, 'User-Agent': 'Azolve-Webhooks/1.0' },
        body,
      });
      const text = await res.text().catch(() => '');
      return {
        success: res.ok, status: res.status, body: text.slice(0, 500),
        duration: Date.now() - start, signature: sig,
      };
    } catch (e) {
      return { success: false, error: e.message, duration: Date.now() - start };
    }
  }
}

module.exports = new WebhookDispatcher();
