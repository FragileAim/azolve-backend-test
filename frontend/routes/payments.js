const router = require('express').Router();
const crypto = require('crypto');
const https = require('https');
const { protect, authorize } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Company = require('../models/Company');

// ─── Cashfree credentials ────────────────────────────────────────────────
const CF_APP_ID  = process.env.CASHFREE_APP_ID  || '';
const CF_SECRET  = process.env.CASHFREE_SECRET  || '';
const CF_ENV     = process.env.CASHFREE_ENV     || 'production'; // 'sandbox' or 'production'
const CF_BASE    = CF_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// ─── Plan pricing (INR) ───────────────────────────────────────────────────────
const PLANS = {
  starter: {
    name: 'Starter',
    monthly: 999,
    yearly: 9990,
    features: { maxUsers: 10, hasPOS: false, hasAdvancedReports: false, hasWhatsApp: false, maxStorage: 1024 },
  },
  professional: {
    name: 'Professional',
    monthly: 2499,
    yearly: 24990,
    features: { maxUsers: 25, hasPOS: false, hasAdvancedReports: true, hasWhatsApp: true, maxStorage: 5120 },
  },
  enterprise: {
    name: 'Enterprise',
    monthly: 4999,
    yearly: 49990,
    features: { maxUsers: 100, hasPOS: true, hasAdvancedReports: true, hasWhatsApp: true, maxStorage: 20480 },
  },
  pos_addon: {
    name: 'POS Add-on',
    monthly: 799,
    yearly: 7990,
    features: { hasPOS: true },
  },
};

// ─── Helper: generate unique order ID ─────────────────────────────────────────
function genOrderId() {
  return 'AZV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ─── Helper: Cashfree API call ───────────────────────────────────────────────
function cashfreeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const url = new URL(CF_BASE + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CF_APP_ID,
        'x-client-secret': CF_SECRET,
        'x-api-version': '2025-01-01', // Updated to latest API version
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Invalid JSON response from Cashfree')); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Creates a Cashfree payment order and returns payment_session_id
router.post('/create-order', protect, async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;

    // Check if Cashfree credentials are configured
    if (!CF_APP_ID || !CF_SECRET) {
      console.error('Cashfree credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway not configured. Please contact support.',
        error: 'MISSING_CREDENTIALS'
      });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const user = req.user;
    const amount = PLANS[plan][billingCycle];
    
    // Minimum amount validation (Cashfree requires >= 1.00)
    if (amount < 1.00) {
      return res.status(400).json({ success: false, message: 'Invalid plan amount' });
    }

    const orderId = genOrderId();

    // Create Cashfree order
    const cfPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      order_note: `Azolve ${PLANS[plan].name} - ${billingCycle}`,
      customer_details: {
        customer_id: String(user._id),
        customer_name: user.name || 'Customer',
        customer_email: user.email || 'customer@example.com',
        customer_phone: user.phone || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || 'https://azolve.io'}/payment-status.html?order_id={order_id}&plan=${plan}&cycle=${billingCycle}`,
        notify_url: `${process.env.BACKEND_URL || 'https://azolve-api.onrender.com'}/api/payments/webhook`,
        payment_methods: 'cc,dc,ppc,ccc,upi,nb,app,paylater', // Valid Cashfree payment methods
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes expiry
    };

    try {
      const cfRes = await cashfreeRequest('POST', '/orders', cfPayload);

      if (cfRes.status !== 200 || !cfRes.body.payment_session_id) {
        console.error('Cashfree order creation failed:', cfRes.body);
        return res.status(500).json({
          success: false,
          message: 'Payment gateway error. Please try again.',
          detail: cfRes.body.message || 'Unknown error',
          error: 'CASHFREE_API_ERROR'
        });
      }

      // Save payment record
      await Payment.create({
        company: req.companyId,
        user: user._id,
        cfOrderId: cfRes.body.cf_order_id,
        orderId,
        plan,
        billingCycle,
        amount,
        status: 'created',
        sessionId: cfRes.body.payment_session_id,
      });

      res.json({
        success: true,
        data: {
          orderId,
          sessionId: cfRes.body.payment_session_id,
          amount,
          plan,
          billingCycle,
          planName: PLANS[plan].name,
        },
      });
    } catch (cfError) {
      console.error('Cashfree API request error:', cfError);
      return res.status(500).json({
        success: false,
        message: 'Payment gateway service unavailable. Please try again.',
        error: 'CASHFREE_SERVICE_ERROR'
      });
    }

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/verify ───────────────────────────────────────────────
// Called by frontend after payment redirect to verify and activate plan
router.post('/verify', protect, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    // Find our payment record
    const payment = await Payment.findOne({ orderId, company: req.companyId });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found' });

    // Already processed
    if (payment.status === 'paid') {
      const company = await Company.findById(req.companyId);
      return res.json({ success: true, message: 'Already activated', data: { plan: company.plan, features: company.features } });
    }

    // Check if Cashfree credentials are configured
    if (!CF_APP_ID || !CF_SECRET) {
      console.error('Cashfree credentials not configured for verification');
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    // Fetch payment status from Cashfree
    const cfRes = await cashfreeRequest('GET', `/orders/${orderId}/payments`, null);

    if (cfRes.status !== 200) {
      console.error('Cashfree payment verification failed:', cfRes);
      return res.status(500).json({ success: false, message: 'Could not verify payment with gateway' });
    }

    const payments = cfRes.body;
    // Find a successful payment
    const successPay = Array.isArray(payments)
      ? payments.find(p => p.payment_status === 'SUCCESS')
      : null;

    if (!successPay) {
      payment.status = 'failed';
      payment.failureReason = 'No successful payment found';
      await payment.save();
      return res.status(402).json({ success: false, message: 'Payment not completed or failed' });
    }

    // ✅ Payment verified — update plan
    payment.status = 'paid';
    payment.cfPaymentId = successPay.cf_payment_id;
    payment.paidAt = new Date();
    await payment.save();

    // Calculate plan expiry
    const now = new Date();
    const expiry = new Date(now);
    if (payment.billingCycle === 'yearly') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    // Update company plan & features
    const planConfig = PLANS[payment.plan];
    const company = await Company.findById(req.companyId);

    if (payment.plan === 'pos_addon') {
      // POS add-on: only enable POS feature, don't change main plan
      company.features.hasPOS = true;
      company.features.posAddonExpiry = expiry;
    } else {
      company.plan = payment.plan;
      company.planExpiry = expiry;
      // Apply feature limits
      Object.assign(company.features, planConfig.features);
    }

    await company.save();

    res.json({
      success: true,
      message: `${planConfig.name} plan activated successfully!`,
      data: {
        plan: company.plan,
        planExpiry: company.planExpiry,
        features: company.features,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/payments/webhook ─────────────────────────────────────────────
// Cashfree webhook for async payment notification
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature if credentials are configured
    if (signature && timestamp && CF_SECRET) {
      const payload = timestamp + rawBody;
      const expectedSig = crypto
        .createHmac('sha256', CF_SECRET)
        .update(payload)
        .digest('base64');
      if (expectedSig !== signature) {
        console.warn('Invalid webhook signature');
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body;
    const orderId = event?.data?.order?.order_id;
    const payStatus = event?.data?.payment?.payment_status;

    if (!orderId) return res.status(200).json({ received: true });

    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.status(200).json({ received: true });

    if (payStatus === 'SUCCESS' && payment.status !== 'paid') {
      payment.status = 'paid';
      payment.cfPaymentId = event?.data?.payment?.cf_payment_id;
      payment.paidAt = new Date();
      await payment.save();

      const expiry = new Date();
      if (payment.billingCycle === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1);
      else expiry.setMonth(expiry.getMonth() + 1);

      const planConfig = PLANS[payment.plan];
      const company = await Company.findById(payment.company);
      if (company) {
        if (payment.plan === 'pos_addon') {
          company.features.hasPOS = true;
        } else {
          company.plan = payment.plan;
          company.planExpiry = expiry;
          Object.assign(company.features, planConfig.features);
        }
        await company.save();
      }
    } else if (['FAILED', 'CANCELLED', 'VOID'].includes(payStatus)) {
      payment.status = payStatus === 'FAILED' ? 'failed' : 'cancelled';
      payment.failureReason = event?.data?.payment?.payment_message || '';
      await payment.save();
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ received: true }); // Always 200 to Cashfree
  }
});

// ──── GET /api/payments/ping ──────────────────────────────────────────────
// Lightweight wake-up endpoint (no auth required) for Render cold-start detection
router.get('/ping', async (req, res) => {
  res.json({ success: true, message: 'pong', timestamp: Date.now() });
});

// ─── GET /api/payments/plans ────────────────────────────────────────────────
// Returns plan pricing - public endpoint
router.get('/plans', async (req, res) => {
  try {
    res.json({ success: true, data: PLANS });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/status ───────────────────────────────────────────────
// Returns current company subscription status
router.get('/status', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId).select('plan planExpiry features');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

    const now = new Date();
    const isExpired = company.planExpiry && company.planExpiry < now;
    const daysLeft = company.planExpiry
      ? Math.max(0, Math.ceil((company.planExpiry - now) / (1000 * 60 * 60 * 24)))
      : null;

    res.json({
      success: true,
      data: {
        plan: isExpired ? 'free' : company.plan,
        planExpiry: company.planExpiry,
        isExpired,
        daysLeft,
        features: company.features,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/payments/history ──────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ company: req.companyId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-cfSignature -sessionId');
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;