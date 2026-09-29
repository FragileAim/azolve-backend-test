const crypto = require('crypto');

// Generate unique meeting ID (abc-def-ghi format)
const generateMeetingId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const group = () => Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${group()}-${group()}-${group()}`;
};

// Generate invoice number
const generateInvoiceNumber = (prefix = 'INV', startNum = 1, existingCount = 0) => {
  const year = new Date().getFullYear();
  const num = String(startNum + existingCount).padStart(4, '0');
  return `${prefix}-${year}-${num}`;
};

// Generate next available invoice number for a company
const getNextInvoiceNumber = async (companyId, prefix = 'INV', startNum = 1) => {
  const Invoice = require('../models/Invoice');

  const year = new Date().getFullYear();
  const escapedPrefix = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedPrefix}-${year}-(\\d+)$`);

  const invoices = await Invoice.find({
    company: companyId,
    invoiceNumber: { $regex: pattern }, 
  }).select('invoiceNumber').lean();

  let maxNumber = startNum - 1; 

  for (const invoice of invoices) {
    const match = String(invoice.invoiceNumber).match(pattern);

    if (match) { 
      const number = parseInt(match[1], 10);

      if (Number.isFinite(number)) {  
        maxNumber = Math.max(maxNumber, number);  
      } 
    }
  }

  return `${prefix}-${year}-${String(maxNumber + 1).padStart(4, '0')}`; 
}; 

// Generate ticket number
const generateTicketNumber = (existingCount = 0) => {
  const year = new Date().getFullYear();
  const num = String(existingCount + 1).padStart(4, '0');
  return `TKT-${year}-${num}`;
};

// Generate employee ID
const generateEmployeeId = (prefix = 'EMP', existingCount = 0) => {
  const num = String(existingCount + 1).padStart(4, '0');
  return `${prefix}-${num}`;
};

// Build pagination response
const paginate = async (model, query, page = 1, limit = 20, sort = '-createdAt', populate = '') => {
  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(limit).populate(populate).lean(),
    model.countDocuments(query),
  ]);

  return {
    data: docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

// Build search query from request
const buildSearchQuery = (req, searchFields = []) => {
  const query = { company: req.companyId };

  // Text search across multiple fields
  if (req.query.search && searchFields.length > 0) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    query.$or = searchFields.map(field => ({ [field]: searchRegex }));
  }

  // Status filter
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Priority filter
  if (req.query.priority) {
    query.priority = req.query.priority;
  }

  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Assigned to filter
  if (req.query.assignedTo) {
    query.assignedTo = req.query.assignedTo;
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      query.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  // Industry filter
  if (req.query.industry) {
    query.industry = req.query.industry;
  }

  // Source filter
  if (req.query.source) {
    query.source = req.query.source;
  }

  // Department filter
  if (req.query.department) {
    query.department = req.query.department;
  }

  // Client filter
  if (req.query.client) {
    query.client = req.query.client;
  }

  // Project filter
  if (req.query.project) {
    query.project = req.query.project;
  }

  // Tags filter
  if (req.query.tags) {
    query.tags = { $in: req.query.tags.split(',').map(t => t.trim()) };
  }

  return query;
};

// Build sort string from request
const buildSort = (req, defaultSort = '-createdAt') => {
  if (!req.query.sort) return defaultSort;
  const sortField = req.query.sort;
  const sortOrder = req.query.order === 'asc' ? '' : '-';
  return `${sortOrder}${sortField}`;
};

// Calculate date difference in days
const dateDiffDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Format currency
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
};

// Generate random secure token
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Sanitize object - remove undefined and null values
const sanitize = (obj) => {
  const clean = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      clean[key] = obj[key];
    }
  });
  return clean;
};

module.exports = {
  generateMeetingId,
  generateInvoiceNumber,
  getNextInvoiceNumber,
  generateTicketNumber,
  generateEmployeeId,
  paginate,
  buildSearchQuery,
  buildSort,
  dateDiffDays,
  formatCurrency,
  generateToken,
  sanitize,
};