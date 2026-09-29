/**
 * Bank Statement Parser Service
 * Supports CSV / Excel uploads from major Indian banks
 * + Auto-categorization + Auto-matching to invoices/payments
 *
 * Saves ~4 hours/week per company
 */
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

let xlsx;
try { xlsx = require('xlsx'); } catch (_) { xlsx = null; }

// ----- Bank-specific column mappings -----
const BANK_FORMATS = {
  hdfc: {
    name: 'HDFC Bank',
    headerKeywords: ['narration', 'chq./ref.no.', 'value dt', 'withdrawal amt.', 'deposit amt.'],
    columns: { date: ['date'], description: ['narration'], reference: ['chq./ref.no.', 'ref no'],
               debit: ['withdrawal amt.', 'withdrawal amt'], credit: ['deposit amt.', 'deposit amt'],
               balance: ['closing balance'] },
  },
  icici: {
    name: 'ICICI Bank',
    headerKeywords: ['transaction date', 'transaction remarks', 'withdrawal amount', 'deposit amount'],
    columns: { date: ['transaction date', 'txn date'], description: ['transaction remarks', 'particulars'],
               reference: ['cheque no', 'cheque number'], debit: ['withdrawal amount (inr)', 'withdrawal amount'],
               credit: ['deposit amount (inr)', 'deposit amount'], balance: ['balance (inr)', 'balance'] },
  },
  sbi: {
    name: 'State Bank of India',
    headerKeywords: ['txn date', 'description', 'ref no./cheque no.', 'debit', 'credit', 'balance'],
    columns: { date: ['txn date', 'date'], description: ['description'],
               reference: ['ref no./cheque no.', 'ref no'], debit: ['debit'], credit: ['credit'], balance: ['balance'] },
  },
  axis: {
    name: 'Axis Bank',
    headerKeywords: ['tran date', 'particulars', 'chq no', 'debit', 'credit', 'balance'],
    columns: { date: ['tran date', 'transaction date'], description: ['particulars', 'narration'],
               reference: ['chq no', 'cheque no'], debit: ['debit', 'dr'], credit: ['credit', 'cr'],
               balance: ['balance'] },
  },
  kotak: {
    name: 'Kotak Mahindra Bank',
    headerKeywords: ['date', 'narration', 'chq/ref no', 'withdrawal(dr)', 'deposit(cr)'],
    columns: { date: ['date'], description: ['narration', 'description'], reference: ['chq/ref no', 'ref no'],
               debit: ['withdrawal(dr)', 'debit'], credit: ['deposit(cr)', 'credit'], balance: ['balance'] },
  },
  generic: {
    name: 'Generic',
    headerKeywords: [],
    columns: { date: ['date', 'txn date', 'transaction date', 'value date'],
               description: ['description', 'narration', 'particulars', 'remarks'],
               reference: ['reference', 'ref no', 'utr', 'cheque', 'chq no'],
               debit: ['debit', 'dr', 'withdrawal', 'amount debited'],
               credit: ['credit', 'cr', 'deposit', 'amount credited'],
               balance: ['balance', 'closing balance'] },
  },
};

// ----- Auto-categorization rules -----
const CATEGORY_RULES = [
  { category: 'salary', subCategory: 'salary', patterns: [/salary|sal\s*credit|payroll|wages/i] },
  { category: 'tax', subCategory: 'gst', patterns: [/gst|cgst|sgst|igst|gov\.in.*tax|gst pmt/i] },
  { category: 'tax', subCategory: 'tds', patterns: [/tds|tax deducted|income tax/i] },
  { category: 'rent', patterns: [/rent\s|office rent|shop rent/i] },
  { category: 'utility', subCategory: 'electricity', patterns: [/electricity|bescom|tneb|mseb|powergrid|bses/i] },
  { category: 'utility', subCategory: 'internet', patterns: [/airtel|jio|vi\s|bsnl|broadband|act\s*fibernet|tata\s*sky/i] },
  { category: 'utility', subCategory: 'phone', patterns: [/recharge|prepaid|postpaid|mobile bill/i] },
  { category: 'travel', patterns: [/uber|ola|rapido|irctc|makemytrip|goibibo|cleartrip|indigo|spicejet|vistara|air\s*india/i] },
  { category: 'office', subCategory: 'food', patterns: [/swiggy|zomato|dominos|food|restaurant/i] },
  { category: 'office', subCategory: 'supplies', patterns: [/amazon|flipkart|stationery|office\s*supply/i] },
  { category: 'marketing', patterns: [/google\s*ads|facebook|meta\s*ads|linkedin|instagram\s*ads/i] },
  { category: 'fee', subCategory: 'bank', patterns: [/bank charge|service charge|processing fee|annual fee|sms charge|min bal/i] },
  { category: 'interest', patterns: [/interest credit|int\.cr|fd interest|sb int/i] },
  { category: 'transfer', patterns: [/own transfer|self transfer|own a\/c|own account/i] },
  { category: 'refund', patterns: [/refund|reversal|reversed|chargeback/i] },
];

class BankStatementParser {
  /**
   * Detect bank format from headers
   */
  detectBank(headers) {
    const lower = headers.map(h => String(h || '').toLowerCase().trim());
    let bestBank = 'generic', bestScore = 0;
    for (const [key, fmt] of Object.entries(BANK_FORMATS)) {
      if (key === 'generic') continue;
      let score = 0;
      for (const kw of fmt.headerKeywords) if (lower.some(h => h.includes(kw))) score++;
      if (score > bestScore) { bestScore = score; bestBank = key; }
    }
    return bestScore >= 2 ? bestBank : 'generic';
  }

  findCol(headers, candidates) {
    const lower = headers.map(h => String(h || '').toLowerCase().trim());
    for (const c of candidates) {
      const idx = lower.findIndex(h => h === c || h.includes(c));
      if (idx >= 0) return idx;
    }
    return -1;
  }

  /**
   * Parse uploaded CSV/Excel file → array of normalized transactions
   */
  parseFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let rows = [];
    if (ext === '.csv' || ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf8');
      rows = this.parseCSV(content);
    } else if ((ext === '.xlsx' || ext === '.xls') && xlsx) {
      const wb = xlsx.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    } else {
      throw new Error(`Unsupported file format: ${ext}. Use CSV or XLSX.`);
    }
    return this.parseRows(rows);
  }

  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return lines.map(line => {
      const cells = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
        else cur += ch;
      }
      cells.push(cur);
      return cells.map(c => c.trim().replace(/^"|"$/g, ''));
    });
  }

  parseRows(rows) {
    // Find the header row (skip top junk lines often present in bank exports)
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const r = rows[i].map(c => String(c || '').toLowerCase());
      if (r.some(c => c.includes('date')) &&
          r.some(c => /narration|description|particulars|remarks/.test(c)) &&
          r.some(c => /debit|withdrawal|dr/.test(c) || /credit|deposit|cr/.test(c))) {
        headerIdx = i; break;
      }
    }
    if (headerIdx < 0) throw new Error('Could not detect header row in statement');

    const headers = rows[headerIdx];
    const bank = this.detectBank(headers);
    const fmt = BANK_FORMATS[bank];
    const dataRows = rows.slice(headerIdx + 1);

    const idx = {
      date: this.findCol(headers, fmt.columns.date),
      desc: this.findCol(headers, fmt.columns.description),
      ref: this.findCol(headers, fmt.columns.reference),
      debit: this.findCol(headers, fmt.columns.debit),
      credit: this.findCol(headers, fmt.columns.credit),
      bal: this.findCol(headers, fmt.columns.balance),
    };

    const transactions = [];
    for (const row of dataRows) {
      if (!row || row.every(c => !String(c).trim())) continue;
      const dateStr = String(row[idx.date] || '').trim();
      const desc = String(row[idx.desc] || '').trim();
      if (!dateStr || !desc) continue;
      const txnDate = this.parseDate(dateStr);
      if (!txnDate) continue;

      const debit = this.parseAmount(row[idx.debit]);
      const credit = this.parseAmount(row[idx.credit]);
      if (!debit && !credit) continue;

      const amount = debit || credit;
      const type = debit ? 'debit' : 'credit';
      const reference = idx.ref >= 0 ? String(row[idx.ref] || '').trim() : '';
      const balance = idx.bal >= 0 ? this.parseAmount(row[idx.bal]) : null;
      const channel = this.detectChannel(desc);
      const { category, subCategory } = this.categorize(desc, type);

      transactions.push({
        txnDate, description: desc, reference, type, amount, balance, channel,
        category, subCategory,
        rawRow: row,
        uniqueHash: this.hashTxn(txnDate, desc, type, amount, reference),
      });
    }

    return { bank: fmt.name, bankKey: bank, count: transactions.length, transactions };
  }

  parseAmount(v) {
    if (v === null || v === undefined || v === '') return 0;
    const s = String(v).replace(/[,₹\s]/g, '').replace(/[()]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  parseDate(s) {
    s = String(s).trim();
    // dd/mm/yyyy or dd-mm-yyyy
    let m = s.match(/^(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{2,4})$/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
      const dt = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`);
      return isNaN(dt) ? null : dt;
    }
    // yyyy-mm-dd
    m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (m) { const dt = new Date(s); return isNaN(dt) ? null : dt; }
    // dd-MMM-yyyy (e.g. 12-Jan-2024)
    m = s.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s](\d{2,4})$/);
    if (m) {
      let [, d, mon, y] = m;
      if (y.length === 2) y = '20' + y;
      const dt = new Date(`${d} ${mon} ${y}`);
      return isNaN(dt) ? null : dt;
    }
    const dt = new Date(s);
    return isNaN(dt) ? null : dt;
  }

  detectChannel(desc) {
    const d = desc.toUpperCase();
    if (/UPI|@OK|@YBL|@PAYTM|@AXL/.test(d)) return 'UPI';
    if (/NEFT/.test(d)) return 'NEFT';
    if (/RTGS/.test(d)) return 'RTGS';
    if (/IMPS/.test(d)) return 'IMPS';
    if (/ATM/.test(d)) return 'ATM';
    if (/CHQ|CHEQUE/.test(d)) return 'CHEQUE';
    if (/POS|CARD/.test(d)) return 'CARD';
    if (/ECS|ACH|NACH/.test(d)) return 'ACH';
    return 'OTHER';
  }

  categorize(desc, type) {
    for (const rule of CATEGORY_RULES) {
      for (const p of rule.patterns) {
        if (p.test(desc)) return { category: rule.category, subCategory: rule.subCategory };
      }
    }
    // Default by type
    return { category: type === 'credit' ? 'income' : 'expense', subCategory: null };
  }

  hashTxn(date, desc, type, amount, ref) {
    const key = `${date.toISOString().slice(0,10)}|${type}|${amount.toFixed(2)}|${(ref||'').trim()}|${desc.slice(0,80)}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
  }

  /**
   * Auto-match parsed transactions to invoices/payments
   * @param transactions array of normalized transactions
   * @param invoices array of open invoices
   * @returns transactions with status/matchedInvoiceId/matchConfidence/matchReason set
   */
  autoMatch(transactions, invoices) {
    return transactions.map(txn => {
      if (txn.type !== 'credit') return txn; // only match incoming for invoices

      let best = null, bestScore = 0;
      for (const inv of invoices) {
        const score = this.scoreMatch(txn, inv);
        if (score > bestScore) { bestScore = score; best = inv; }
      }

      if (best && bestScore >= 60) {
        txn.matchedInvoiceId = best._id;
        txn.matchConfidence = bestScore;
        txn.status = bestScore >= 85 ? 'matched' : 'partially_matched';
        txn.matchReason = this.buildReason(txn, best, bestScore);
      }
      return txn;
    });
  }

  scoreMatch(txn, inv) {
    let score = 0;
    const invAmount = inv.totalAmount || inv.amount || inv.grandTotal || 0;
    const due = invAmount - (inv.paidAmount || 0);

    // Amount match (most important)
    if (Math.abs(txn.amount - due) < 1) score += 60;
    else if (Math.abs(txn.amount - invAmount) < 1) score += 50;
    else if (Math.abs(txn.amount - due) / Math.max(due, 1) < 0.02) score += 40;
    else return 0; // amount mismatch is a deal-breaker

    // Reference match (UTR / invoice number in description)
    const desc = (txn.description + ' ' + (txn.reference || '')).toLowerCase();
    if (inv.invoiceNumber && desc.includes(String(inv.invoiceNumber).toLowerCase())) score += 25;
    if (inv.clientName && desc.includes(String(inv.clientName).toLowerCase().slice(0, 6))) score += 10;

    // Date proximity (invoice date ≤ txn date ≤ +60 days)
    if (inv.invoiceDate) {
      const days = (txn.txnDate - new Date(inv.invoiceDate)) / 86400000;
      if (days >= 0 && days <= 60) score += 5;
    }
    return Math.min(score, 100);
  }

  buildReason(txn, inv, score) {
    const reasons = [];
    const invAmount = inv.totalAmount || inv.amount || inv.grandTotal || 0;
    if (Math.abs(txn.amount - invAmount) < 1) reasons.push('Exact amount match');
    const desc = (txn.description + ' ' + (txn.reference || '')).toLowerCase();
    if (inv.invoiceNumber && desc.includes(String(inv.invoiceNumber).toLowerCase()))
      reasons.push(`Invoice # found in description`);
    if (inv.clientName && desc.includes(String(inv.clientName).toLowerCase().slice(0, 6)))
      reasons.push(`Client name matched`);
    return reasons.join(' • ') || `Score ${score}/100`;
  }
}

module.exports = new BankStatementParser();
module.exports.BankStatementParser = BankStatementParser;
module.exports.BANK_FORMATS = BANK_FORMATS;
