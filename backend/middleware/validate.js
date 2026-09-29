const { validationResult, body, param, query } = require('express-validator');

// Process validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Auth validations
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name max 100 chars'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('companyName').trim().notEmpty().withMessage('Company name is required'),
  handleValidation,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

// Client validations
const validateClient = [
  body('name').trim().notEmpty().withMessage('Client name is required').isLength({ max: 200 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  handleValidation,
];

// Product validations
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 200 }),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim(),
  handleValidation,
];

// Invoice validations
const validateInvoice = [
  body('client').notEmpty().withMessage('Client is required').isMongoId().withMessage('Invalid client ID'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  handleValidation,
];

// Quotation validations
const validateQuotation = [
  body('client').notEmpty().withMessage('Client is required').isMongoId().withMessage('Invalid client ID'),
  body('validUntil').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
  body('items').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('items.*.name').trim().notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  handleValidation,
];

// Lead validations
const validateLead = [
  body('name').trim().notEmpty().withMessage('Lead name is required').isLength({ max: 200 }),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  handleValidation,
];

// Deal validations
const validateDeal = [
  body('name').trim().notEmpty().withMessage('Deal name is required').isLength({ max: 300 }),
  body('value').optional().isFloat({ min: 0 }).withMessage('Value must be positive'),
  body('stage').optional().isIn(['new', 'discovery', 'proposal', 'negotiation', 'won', 'lost']),
  handleValidation,
];

// Project validations
const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 300 }),
  body('status').optional().isIn(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  handleValidation,
];

// Task validations
const validateTask = [
  body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 300 }),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  handleValidation,
];

// Employee validations
const validateEmployee = [
  body('name').trim().notEmpty().withMessage('Employee name is required').isLength({ max: 200 }),
  body('email').optional().trim().isEmail().withMessage('Valid email required'),
  body('department').optional().trim(),
  handleValidation,
];

// Leave validations
const validateLeave = [
  body('type').notEmpty().withMessage('Leave type is required').isIn(['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'compensatory']),
  body('startDate').notEmpty().withMessage('Start date is required').isISO8601(),
  body('endDate').notEmpty().withMessage('End date is required').isISO8601(),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  handleValidation,
];

// Ticket validations
const validateTicket = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 300 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('category').optional().isIn(['technical', 'billing', 'general', 'product_issue', 'feature_request']),
  handleValidation,
];

// Meeting validations
const validateMeeting = [
  body('title').trim().notEmpty().withMessage('Meeting title is required').isLength({ max: 300 }),
  body('type').optional().isIn(['video', 'audio', 'chat']),
  handleValidation,
];

// Event validations
const validateEvent = [
  body('title').trim().notEmpty().withMessage('Event title is required').isLength({ max: 300 }),
  body('startDate').notEmpty().withMessage('Start date is required').isISO8601(),
  body('endDate').notEmpty().withMessage('End date is required').isISO8601(),
  handleValidation,
];

// MongoDB ID param validation
const validateId = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidation,
];

module.exports = {
  handleValidation,
  validateRegister, validateLogin,
  validateClient, validateProduct, validateInvoice, validateQuotation,
  validateLead, validateDeal,
  validateProject, validateTask,
  validateEmployee, validateLeave,
  validateTicket, validateMeeting, validateEvent,
  validateId,
};