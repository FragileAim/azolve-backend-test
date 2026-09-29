const test = require('node:test');
const assert = require('node:assert/strict');

const Quotation = require('../models/Quotation');
const quotationRouter = require('../routes/quotations');

test('quotation model and router are available', () => {
  assert.equal(typeof Quotation, 'function');
  assert.equal(typeof quotationRouter, 'function');
});
