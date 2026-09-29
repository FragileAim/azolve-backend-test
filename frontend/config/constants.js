module.exports = {
  // User Roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    SALES: 'sales',
    HR: 'hr',
    FINANCE: 'finance',
    SUPPORT: 'support',
    EMPLOYEE: 'employee',
    VIEWER: 'viewer',
  },

  // Lead Statuses
  LEAD_STATUS: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],

  // Deal Stages
  DEAL_STAGES: ['new', 'discovery', 'proposal', 'negotiation', 'won', 'lost'],

  // Invoice Statuses
  INVOICE_STATUS: ['draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled'],

  // Project Statuses
  PROJECT_STATUS: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],

  // Task Statuses
  TASK_STATUS: ['todo', 'in_progress', 'review', 'completed', 'cancelled'],

  // Task Priorities
  PRIORITIES: ['low', 'medium', 'high', 'urgent'],

  // Ticket Statuses
  TICKET_STATUS: ['open', 'in_progress', 'waiting', 'resolved', 'closed'],

  // Ticket Categories
  TICKET_CATEGORIES: ['technical', 'billing', 'general', 'product_issue', 'feature_request'],

  // Leave Types
  LEAVE_TYPES: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'compensatory'],

  // Leave Statuses
  LEAVE_STATUS: ['pending', 'approved', 'rejected', 'cancelled'],

  // Attendance Statuses
  ATTENDANCE_STATUS: ['present', 'absent', 'half_day', 'late', 'on_leave', 'work_from_home'],

  // Meeting Types
  MEETING_TYPES: ['video', 'audio', 'chat'],

  // Meeting Statuses
  MEETING_STATUS: ['scheduled', 'live', 'ended', 'cancelled'],

  // Chat Types
  CHAT_TYPES: ['private', 'group', 'project', 'support'],

  // Message Types
  MESSAGE_TYPES: ['text', 'image', 'file', 'audio', 'video', 'system'],

  // Payment Methods
  PAYMENT_METHODS: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online'],

  // Currencies
  CURRENCIES: ['INR', 'USD', 'EUR', 'GBP', 'AED'],

  // Event Types
  EVENT_TYPES: ['meeting', 'reminder', 'task', 'deadline', 'holiday', 'birthday', 'other'],

  // Recurrence Types
  RECURRENCE_TYPES: ['none', 'daily', 'weekly', 'monthly', 'yearly'],

  // Industries
  INDUSTRIES: [
    'Wind Energy',
    'Oil & Gas',
    'Marine & Shipping',
    'Infrastructure',
    'Construction',
    'Manufacturing',
    'Automotive',
    'Aerospace',
    'Power & Utilities',
    'Chemicals',
    'Mining',
    'Telecommunications',
    'Technology',
    'Healthcare',
    'Education',
    'Retail',
    'Other',
  ],

  // Departments
  DEPARTMENTS: [
    'Sales',
    'Marketing',
    'R&D',
    'Production',
    'Quality',
    'Finance',
    'HR',
    'IT',
    'Support',
    'Operations',
    'Administration',
    'Management',
    'Other',
  ],

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // File upload limits
  FILE_LIMITS: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCS: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
    ],
    ALLOWED_VIDEOS: ['video/mp4', 'video/webm', 'video/ogg'],
    ALLOWED_AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  },
};