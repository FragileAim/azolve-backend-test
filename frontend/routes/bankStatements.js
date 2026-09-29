/**
 * Bank Statement Routes
 * Upload, parse, auto-match, reconcile
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = (() => { try { return require('uuid'); } catch (_) { return { v4: () => Date.now() + '-' + Math.random().toString(36).slice(2,10) }; } })();

const parser = require('../services/bankStatementParser');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');

// Try to load existing Invoice model
let Invoice; try { Invoice = require('../models/Invoice'); } catch (_) { Invoice = null; }

// ---- Auth adapter: use existing JWT protect middleware ----
const { protect } = require('../middleware/auth');
const auth = [protect, (req, res, next) => {
  // Normalize to v2 shape: req.user.id + req.user.companyId
  if (req.user) {
    req.user.id = req.user.id || req.user._id;
    req.user.companyId = req.user.companyId || req.companyId || req.user.company?._id || req.user.company;
  }
  next();
}];

const uploadDir = path.join(process.cwd(), 'uploads', 'bank-statements');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g,'_')}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(csv|xlsx|xls|txt)$/i.test(file.originalname);
    cb(ok ? null : new Error('Only CSV/Excel files allowed'), ok);
  },
});

// ----- Bank Accounts CRUD -----
router.get('/accounts', auth, async (req, res) => {
  try {
    const accounts = await BankAccount.find({ company: req.user.companyId, isActive: true }).sort('-createdAt');
    res.json({ success: true, data: accounts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/accounts', auth, async (req, res) => {
  try {
    const acct = await BankAccount.create({ ...req.body, company: req.user.companyId, createdBy: req.user.id });
    res.json({ success: true, data: acct });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/accounts/:id', auth, async (req, res) => {
  try {
    const acct = await BankAccount.findOneAndUpdate(
      { _id: req.params.id, company: req.user.companyId },
      req.body, { new: true });
    if (!acct) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: acct });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ----- Upload & Parse -----
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { bankAccountId, autoMatch = true } = req.body;
    if (!bankAccountId) return res.status(400).json({ error: 'bankAccountId required' });

    const account = await BankAccount.findOne({ _id: bankAccountId, company: req.user.companyId });
    if (!account) return res.status(404).json({ error: 'Bank account not found' });

    // Parse
    const parsed = parser.parseFile(req.file.path);
    const batchId = uuidv4();

    // Auto-match
    let openInvoices = [];
    if (autoMatch && Invoice) {
      try {
        openInvoices = await Invoice.find({
          company: req.user.companyId,
          status: { $in: ['sent', 'partial', 'overdue', 'pending'] },
        }).lean();
      } catch (_) { /* invoices not available */ }
    }
    const matched = autoMatch ? parser.autoMatch(parsed.transactions, openInvoices) : parsed.transactions;

    // Insert (skip duplicates via uniqueHash)
    let inserted = 0, duplicates = 0, autoMatchedCount = 0;
    const errors = [];
    for (const t of matched) {
      try {
        const existing = await BankTransaction.findOne({ company: req.user.companyId, uniqueHash: t.uniqueHash });
        if (existing) { duplicates++; continue; }
        await BankTransaction.create({
          ...t,
          company: req.user.companyId,
          bankAccountId,
          importBatchId: batchId,
          sourceFile: req.file.originalname,
        });
        inserted++;
        if (t.matchedInvoiceId) autoMatchedCount++;
      } catch (err) {
        errors.push({ desc: t.description, error: err.message });
      }
    }

    // Cleanup file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    res.json({
      success: true,
      data: {
        bank: parsed.bank,
        batchId,
        totalParsed: parsed.count,
        inserted,
        duplicates,
        autoMatched: autoMatchedCount,
        errors: errors.slice(0, 10),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----- List Transactions -----
router.get('/transactions', auth, async (req, res) => {
  try {
    const { bankAccountId, status, category, type, from, to, search, page = 1, limit = 50 } = req.query;
    const q = { company: req.user.companyId };
    if (bankAccountId) q.bankAccountId = bankAccountId;
    if (status) q.status = status;
    if (category) q.category = category;
    if (type) q.type = type;
    if (from || to) {
      q.txnDate = {};
      if (from) q.txnDate.$gte = new Date(from);
      if (to) q.txnDate.$lte = new Date(to);
    }
    if (search) q.description = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      BankTransaction.find(q).sort('-txnDate').skip(skip).limit(parseInt(limit)).lean(),
      BankTransaction.countDocuments(q),
    ]);
    res.json({ success: true, data: items, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Reconcile (manual match / unmatch / ignore) -----
router.post('/transactions/:id/reconcile', auth, async (req, res) => {
  try {
    const { action, invoiceId, paymentId, notes } = req.body;
    const txn = await BankTransaction.findOne({ _id: req.params.id, company: req.user.companyId });
    if (!txn) return res.status(404).json({ error: 'Not found' });

    if (action === 'match') {
      txn.matchedInvoiceId = invoiceId;
      txn.matchedPaymentId = paymentId;
      txn.status = 'manually_matched';
      txn.matchConfidence = 100;
      txn.matchReason = 'Manually matched';
    } else if (action === 'unmatch') {
      txn.matchedInvoiceId = null;
      txn.matchedPaymentId = null;
      txn.status = 'unmatched';
      txn.matchConfidence = 0;
      txn.matchReason = '';
    } else if (action === 'ignore') {
      txn.status = 'ignored';
    }
    txn.notes = notes || txn.notes;
    txn.reconciledBy = req.user.id;
    txn.reconciledAt = new Date();
    await txn.save();
    res.json({ success: true, data: txn });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ----- Stats / Summary -----
router.get('/summary', auth, async (req, res) => {
  try {
    const { bankAccountId, from, to } = req.query;
    const match = { company: req.user.companyId };
    if (bankAccountId) match.bankAccountId = require('mongoose').Types.ObjectId(bankAccountId);
    if (from || to) {
      match.txnDate = {};
      if (from) match.txnDate.$gte = new Date(from);
      if (to) match.txnDate.$lte = new Date(to);
    }

    const [byType, byCategory, byStatus] = await Promise.all([
      BankTransaction.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      BankTransaction.aggregate([{ $match: match }, { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      BankTransaction.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const credits = byType.find(t => t._id === 'credit') || { total: 0, count: 0 };
    const debits = byType.find(t => t._id === 'debit') || { total: 0, count: 0 };

    res.json({
      success: true,
      data: {
        netCashflow: credits.total - debits.total,
        totalCredits: credits.total,
        totalDebits: debits.total,
        creditCount: credits.count,
        debitCount: debits.count,
        byCategory,
        byStatus,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----- Supported banks -----
router.get('/supported-banks', auth, (req, res) => {
  const { BANK_FORMATS } = require('../services/bankStatementParser');
  res.json({
    success: true,
    data: Object.entries(BANK_FORMATS).filter(([k]) => k !== 'generic').map(([k, v]) => ({ key: k, name: v.name })),
  });
});

module.exports = router;
