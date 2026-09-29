/**
 * e-Invoicing API Routes
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
const eInvoice = require('../services/eInvoice');
const AuditLogger = require('../services/auditLogger');

router.use(...auth);

/**
 * POST /api/einvoice/generate
 * Body: { invoice, seller, buyer }
 */
router.post('/generate', async (req, res) => {
  try {
    const { invoice, seller, buyer } = req.body;

    if (!invoice || !seller || !buyer) {
      return res.status(400).json({
        success: false,
        message: 'invoice, seller, and buyer objects are required',
      });
    }

    const result = await eInvoice.generateEInvoice(invoice, seller, buyer);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Log
    await AuditLogger.log({
      req,
      action: 'create',
      resource: 'einvoice',
      resourceId: invoice._id || invoice.id,
      resourceName: invoice.invoiceNumber,
      description: `Generated e-Invoice IRN for ${invoice.invoiceNumber}`,
      metadata: { irn: result.data.irn, ackNo: result.data.ackNo },
    });

    res.json(result);
  } catch (err) {
    console.error('e-Invoice generation error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/einvoice/cancel
 * Body: { irn, reason, remarks }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { irn, reason, remarks } = req.body;
    if (!irn) return res.status(400).json({ success: false, message: 'IRN required' });

    const validReasons = ['1', '2', '3', '4']; // 1=Duplicate, 2=Data entry, 3=Order cancel, 4=Other
    if (!validReasons.includes(String(reason))) {
      return res.status(400).json({ success: false, message: 'Reason must be 1, 2, 3, or 4' });
    }

    const result = await eInvoice.cancelEInvoice(irn, reason, remarks);

    await AuditLogger.log({
      req,
      action: 'delete',
      resource: 'einvoice',
      resourceName: irn,
      description: `Cancelled e-Invoice IRN ${irn}`,
      severity: 'warning',
      metadata: { reason, remarks },
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/einvoice/validate
 * Validate invoice without generating IRN
 */
router.post('/validate', async (req, res) => {
  try {
    const { invoice, seller, buyer } = req.body;
    const validation = eInvoice.validateInvoice(invoice || {}, seller || {}, buyer || {});
    res.json({ success: validation.valid, ...validation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/einvoice/status
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      mode: process.env.EINVOICE_MODE || 'sandbox',
      configured: !!(process.env.GSP_USERNAME && process.env.GSP_PASSWORD),
      version: '1.1',
    },
  });
});

module.exports = router;
