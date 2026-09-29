/**
 * Azolve Database Seed Script
 * Run: npm run seed
 * 
 * Populates MongoDB with comprehensive sample data for local development.
 * Automatically clears existing data before seeding.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Company = require('../models/Company');
const User = require('../models/User');
const Email = require('../models/Email');
const Client = require('../models/Client');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Lead = require('../models/Lead');
const Deal = require('../models/Deal');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Ticket = require('../models/Ticket');
const Meeting = require('../models/Meeting');
const { Chat, Message } = require('../models/Chat');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const BankAccount = require('../models/BankAccount');
const BankTransaction = require('../models/BankTransaction');
const Notification = require('../models/Notification');
const ApiKey = require('../models/ApiKey');
const { Webhook } = require('../models/Webhook');
const Workflow = require('../models/Workflow');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/azolve_db';

// ─── Helpers ──────────────────────────────────────────────
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(9, 0, 0, 0); return d; }
function daysFromNow(n) { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(9, 0, 0, 0); return d; }

// ─── Seed Data ────────────────────────────────────────────
const COMPANY_DATA = {
  name: 'Azolve Technologies',
  domain: 'azolve',
  email: 'info@azolve.com',
  phone: '+91-9876543210',
  website: 'https://azolve.io',
  industry: 'Software & SaaS',
  size: '11-50',
  address: {
    street: '42 Tech Park, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    country: 'India',
    pincode: '201309',
  },
  taxInfo: {
    gstin: '09AABCU9603R1ZM',
    pan: 'AABCU9603R',
    cin: 'U72200UR2020PTC011234',
  },
  bankDetails: {
    bankName: 'HDFC Bank',
    accountNumber: '50100352674912',
    ifsc: 'HDFC0002674',
    branch: 'Sector 62, Noida',
  },
  plan: 'professional',
  planExpiry: daysFromNow(365),
  settings: {
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    taxRate: 18,
    fiscalYearStart: 4,
  },
  features: {
    maxUsers: 25,
    maxStorage: 5120,
    hasWhatsApp: false,
    hasMeetings: true,
    hasPOS: true,
    hasAdvancedReports: true,
  },
};

const ADMIN_DATA = {
  name: 'Admin User',
  email: 'admin@azolve.com',
  password: 'admin123',
  phone: '+91-9999000001',
  role: 'admin',
  department: 'Management',
  designation: 'Chief Executive Officer',
  isActive: true,
  isVerified: true,
};

const TEAM_MEMBERS = [
  { name: 'Priya Sharma', email: 'priya@azolve.com', password: 'team123', phone: '+91-9999000002', role: 'manager', department: 'Sales', designation: 'Sales Manager' },
  { name: 'Rahul Verma', email: 'rahul@azolve.com', password: 'team123', phone: '+91-9999000003', role: 'sales', department: 'Sales', designation: 'Sales Executive' },
  { name: 'Anita Desai', email: 'anita@azolve.com', password: 'team123', phone: '+91-9999000004', role: 'hr', department: 'Human Resources', designation: 'HR Manager' },
  { name: 'Vikram Singh', email: 'vikram@azolve.com', password: 'team123', phone: '+91-9999000005', role: 'finance', department: 'Finance', designation: 'Finance Lead' },
  { name: 'Meera Patel', email: 'meera@azolve.com', password: 'team123', phone: '+91-9999000006', role: 'support', department: 'Support', designation: 'Support Engineer' },
];

const CLIENT_DATA = [
  { name: 'Acme Corp', contactPerson: 'John Anderson', email: 'john@acmecorp.com', phone: '+1-555-0101', industry: 'Manufacturing', website: 'https://acmecorp.com', source: 'referral', billingAddress: { street: '123 Industrial Ave', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001' }, taxNumber: '27AABCU9603R1ZM', creditLimit: 500000, tags: ['enterprise', 'manufacturing'] },
  { name: 'TechVista Solutions', contactPerson: 'Sarah Chen', email: 'sarah@techvista.com', phone: '+1-555-0102', industry: 'IT Services', website: 'https://techvista.com', source: 'website', billingAddress: { street: '456 Silicon Valley', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560001' }, taxNumber: '29AABCU9603R1ZM', creditLimit: 300000, tags: ['tech', 'services'] },
  { name: 'GreenLeaf Industries', contactPerson: 'Mike Johnson', email: 'mike@greenleaf.com', phone: '+44-20-7123-4567', industry: 'Agriculture', website: 'https://greenleaf.com', source: 'trade_show', billingAddress: { street: '789 Farm Road', city: 'Hyderabad', state: 'Telangana', country: 'India', pincode: '500001' }, creditLimit: 200000, tags: ['agriculture', 'export'] },
  { name: 'BlueStar Logistics', contactPerson: 'David Park', email: 'david@bluestar.com', phone: '+91-22-1234-5678', industry: 'Logistics', website: 'https://bluestar.com', source: 'cold_call', billingAddress: { street: '321 Port Area', city: 'Chennai', state: 'Tamil Nadu', country: 'India', pincode: '600001' }, taxNumber: '33AABCU9603R1ZM', creditLimit: 400000, tags: ['logistics', 'shipping'] },
  { name: 'Digital Dynamics', contactPerson: 'Emily Ross', email: 'emily@digitaldynamics.com', phone: '+1-555-0105', industry: 'Software', website: 'https://digitaldynamics.com', source: 'website', billingAddress: { street: '555 Code Street', city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411001' }, taxNumber: '27AABCU9603R1ZN', creditLimit: 250000, tags: ['software', 'startup'] },
  { name: 'Metro Healthcare', contactPerson: 'Dr. Suresh Iyer', email: 'suresh@metrohealth.com', phone: '+91-80-2345-6789', industry: 'Healthcare', website: 'https://metrohealth.com', source: 'referral', billingAddress: { street: '888 Hospital Lane', city: 'Bengaluru', state: 'Karnataka', country: 'India', pincode: '560002' }, creditLimit: 600000, tags: ['healthcare', 'hospital'] },
  { name: 'Sunrise Education', contactPerson: 'Prof. Kavitha Nair', email: 'kavitha@sunrise-edu.com', phone: '+91-484-234-5678', industry: 'Education', website: 'https://sunrise-edu.com', source: 'social_media', billingAddress: { street: '12 Campus Road', city: 'Kochi', state: 'Kerala', country: 'India', pincode: '682001' }, creditLimit: 150000, tags: ['education', 'training'] },
  { name: 'Peak Construction', contactPerson: 'Raj Malhotra', email: 'raj@peakconstruction.com', phone: '+91-11-2345-6789', industry: 'Construction', website: 'https://peakconstruction.com', source: 'advertisement', billingAddress: { street: '77 Builder Hub', city: 'Delhi', state: 'Delhi', country: 'India', pincode: '110001' }, taxNumber: '07AABCU9603R1ZP', creditLimit: 800000, tags: ['construction', 'infrastructure'] },
  { name: 'CloudNine Retail', contactPerson: 'Neha Gupta', email: 'neha@cloudnine.com', phone: '+91-79-2345-6789', industry: 'Retail', website: 'https://cloudnine.com', source: 'website', billingAddress: { street: '99 Mall Road', city: 'Ahmedabad', state: 'Gujarat', country: 'India', pincode: '380001' }, creditLimit: 350000, tags: ['retail', 'ecommerce'] },
  { name: 'Pacific Foods', contactPerson: 'Takeshi Yamada', email: 'takeshi@pacificfoods.com', phone: '+81-3-1234-5678', industry: 'Food & Beverage', website: 'https://pacificfoods.com', source: 'trade_show', billingAddress: { street: '45 Food Street', city: 'Kolkata', state: 'West Bengal', country: 'India', pincode: '700001' }, creditLimit: 450000, tags: ['food', 'fmcg'] },
];

const PRODUCT_DATA = [
  { name: 'Azolve CRM Pro', sku: 'AZ-CRM-001', category: 'Software', description: 'Complete CRM solution with lead management, deal tracking, and analytics', price: 4999, cost: 500, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['crm', 'software'] },
  { name: 'Azolve Invoice Pro', sku: 'AZ-INV-001', category: 'Software', description: 'Professional invoicing with GST compliance and payment tracking', price: 2999, cost: 300, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['invoice', 'software'] },
  { name: 'Azolve Project Suite', sku: 'AZ-PRJ-001', category: 'Software', description: 'Project management with Gantt charts, task boards, and time tracking', price: 3499, cost: 400, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['project', 'software'] },
  { name: 'Azolve HR Module', sku: 'AZ-HRM-001', category: 'Software', description: 'HR management with attendance, leave, payroll, and employee self-service', price: 3999, cost: 450, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['hr', 'software'] },
  { name: 'Azolve Support Desk', sku: 'AZ-SUP-001', category: 'Software', description: 'Help desk with ticket management, SLA tracking, and knowledge base', price: 1999, cost: 200, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['support', 'software'] },
  { name: 'Azolve Meeting Room', sku: 'AZ-MTG-001', category: 'Software', description: 'Video conferencing with screen share, recording, and meeting scheduler', price: 1499, cost: 150, taxRate: 18, stock: 999, unit: 'License/Month', tags: ['meeting', 'video'] },
  { name: 'Enterprise USB Drive 64GB', sku: 'HW-USB-064', category: 'Hardware', description: 'Branded USB flash drive, USB 3.0, 64GB capacity', price: 799, cost: 350, taxRate: 18, stock: 200, unit: 'Piece', tags: ['hardware', 'accessory'] },
  { name: 'Wireless Mouse', sku: 'HW-MSE-001', category: 'Hardware', description: 'Ergonomic wireless mouse with USB receiver', price: 1299, cost: 500, taxRate: 18, stock: 150, unit: 'Piece', tags: ['hardware', 'accessory'] },
  { name: 'Mechanical Keyboard', sku: 'HW-KEY-001', category: 'Hardware', description: 'Full-size mechanical keyboard with Cherry MX switches', price: 4999, cost: 2200, taxRate: 18, stock: 80, unit: 'Piece', tags: ['hardware', 'accessory'] },
  { name: 'Webcam HD 1080p', sku: 'HW-CAM-001', category: 'Hardware', description: 'Full HD webcam with built-in microphone and auto-focus', price: 3499, cost: 1500, taxRate: 18, stock: 100, unit: 'Piece', tags: ['hardware', 'video'] },
  { name: 'Standing Desk Converter', sku: 'HW-DSK-001', category: 'Furniture', description: 'Adjustable standing desk converter for monitor and keyboard', price: 14999, cost: 7000, taxRate: 18, stock: 30, unit: 'Piece', tags: ['furniture', 'ergonomic'] },
  { name: 'Office Chair Premium', sku: 'HW-CHR-001', category: 'Furniture', description: 'Ergonomic office chair with lumbar support and adjustable armrests', price: 19999, cost: 9000, taxRate: 18, stock: 20, unit: 'Piece', tags: ['furniture', 'ergonomic'] },
  { name: 'Training Session - 1 Day', sku: 'SRV-TRN-001', category: 'Services', description: 'On-site professional training session for up to 10 participants', price: 25000, cost: 8000, taxRate: 18, stock: 999, unit: 'Session', tags: ['service', 'training'] },
  { name: 'Technical Support - Monthly', sku: 'SRV-SUP-001', category: 'Services', description: 'Dedicated technical support for one month, business hours', price: 9999, cost: 3000, taxRate: 18, stock: 999, unit: 'Month', tags: ['service', 'support'] },
  { name: 'Custom Development - Per Hour', sku: 'SRV-DEV-001', category: 'Services', description: 'Custom software development, per hour billing', price: 2500, cost: 800, taxRate: 18, stock: 999, unit: 'Hour', tags: ['service', 'development'] },
];

// ─── Main Seed Function ──────────────────────────────────
async function seed() {
  console.log('\n🌱 Seeding Azolve database...\n');
  console.log(`   Connecting to: ${MONGODB_URI}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB\n');

    // ─── Clear All Collections ───
    console.log('   🧹 Clearing existing data...');
    const collections = [
      Company, User, Client, Product, Invoice, Lead, Deal, Project, Task,
      Employee, Attendance, Leave, Ticket, Meeting, Chat, Message, Event,
      Payment, Document, AuditLog, BankAccount, BankTransaction, Notification,
      ApiKey, Webhook, Workflow, Email,
    ];
    for (const Model of collections) {
      await Model.deleteMany({});
    }
    console.log('   ✅ All collections cleared\n');

    // ─── 1. Company ───
    const company = await Company.create(COMPANY_DATA);
    console.log(`   ✅ Company created: ${company.name}`);

    // ─── 2. Admin User ───
    const adminUser = await User.create({
      ...ADMIN_DATA,
      company: company._id,
    });
    console.log(`   ✅ Admin user created: ${ADMIN_DATA.email} / ${ADMIN_DATA.password}`);

    // ─── 3. Team Members ───
    const teamUsers = [];
    for (const member of TEAM_MEMBERS) {
      const user = await User.create({ ...member, company: company._id });
      teamUsers.push(user);
    }
    console.log(`   ✅ ${teamUsers.length} team members created`);

    const allUsers = [adminUser, ...teamUsers];

    // ─── 4. Clients ───
    const clients = [];
    for (const cd of CLIENT_DATA) {
      const client = await Client.create({
        ...cd,
        company: company._id,
        assignedTo: randomItem(allUsers)._id,
        createdBy: adminUser._id,
      });
      clients.push(client);
    }
    console.log(`   ✅ ${clients.length} clients created`);

    // ─── 5. Products ───
    const products = [];
    for (const pd of PRODUCT_DATA) {
      const product = await Product.create({
        ...pd,
        company: company._id,
        createdBy: adminUser._id,
      });
      products.push(product);
    }
    console.log(`   ✅ ${products.length} products created`);

    // ─── 6. Invoices ───
    const invoiceStatuses = ['draft', 'sent', 'paid', 'paid', 'overdue', 'pending', 'partial', 'cancelled'];
    const invoices = [];
    for (let i = 0; i < 8; i++) {
      const client = randomItem(clients);
      const numItems = randomInt(1, 4);
      const items = [];
      for (let j = 0; j < numItems; j++) {
        const prod = randomItem(products);
        const qty = randomInt(1, 10);
        const taxAmt = Math.round(prod.price * qty * prod.taxRate / 100 * 100) / 100;
        items.push({
          product: prod._id,
          name: prod.name,
          sku: prod.sku,
          quantity: qty,
          price: prod.price,
          taxRate: prod.taxRate,
          taxAmount: taxAmt,
          discount: 0,
          total: Math.round((prod.price * qty + taxAmt) * 100) / 100,
        });
      }
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const taxAmount = items.reduce((s, it) => s + it.taxAmount, 0);
      const discountAmount = i === 7 ? Math.round(subtotal * 0.1) : 0;
      const grandTotal = subtotal + taxAmount - discountAmount;
      const amountPaid = ['paid', 'partial'].includes(invoiceStatuses[i])
        ? (invoiceStatuses[i] === 'paid' ? grandTotal : Math.round(grandTotal * 0.6))
        : 0;
      const inv = await Invoice.create({
        company: company._id,
        invoiceNumber: `INV-2024-${String(i + 1).padStart(4, '0')}`,
        client: client._id,
        clientSnapshot: { name: client.name, email: client.email, phone: client.phone, address: `${client.billingAddress?.street || ''}, ${client.billingAddress?.city || ''}`, taxNumber: client.taxNumber || '' },
        items,
        subtotal,
        taxAmount,
        discountAmount,
        grandTotal,
        amountPaid,
        balanceDue: grandTotal - amountPaid,
        currency: 'INR',
        status: invoiceStatuses[i],
        issueDate: daysAgo(randomInt(1, 30)),
        dueDate: daysFromNow(randomInt(7, 30)),
        paidDate: invoiceStatuses[i] === 'paid' ? daysAgo(randomInt(1, 10)) : undefined,
        paymentMethod: invoiceStatuses[i] === 'paid' ? randomItem(['bank_transfer', 'upi', 'card', 'online']) : '',
        notes: 'Thank you for your business!',
        terms: 'Payment due within 30 days. Late payments subject to 2% monthly interest.',
        issuedBy: adminUser._id,
        createdBy: adminUser._id,
      });
      invoices.push(inv);
    }
    console.log(`   ✅ ${invoices.length} invoices created`);

    // ─── 7. Leads ───
    const leadStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const leadSources = ['website', 'referral', 'cold_call', 'trade_show', 'social_media', 'email_campaign'];
    const leads = [];
    const leadNames = [
      { name: 'Sandeep Reddy', companyName: 'InnoTech Labs', industry: 'IT Services' },
      { name: 'Linda Martinez', companyName: 'GlobalTraders Inc', industry: 'Import/Export' },
      { name: 'Arun Kumar', companyName: 'SmartBuild Corp', industry: 'Construction' },
      { name: 'Yuki Tanaka', companyName: 'NexGen Robotics', industry: 'Robotics' },
      { name: 'Fatima Al-Rashid', companyName: 'Desert Oasis Hotels', industry: 'Hospitality' },
      { name: 'Robert Chen', companyName: 'CloudPeak Analytics', industry: 'Data Analytics' },
      { name: 'Pooja Bhat', companyName: 'EduSmart India', industry: 'EdTech' },
      { name: 'James Wilson', companyName: 'Atlantic Shipping', industry: 'Logistics' },
      { name: 'Nisha Kapoor', companyName: 'StyleCraft Fashion', industry: 'Fashion' },
      { name: 'Ahmed Hassan', companyName: 'PharmaCare Ltd', industry: 'Pharmaceutical' },
      { name: 'Sophie Laurent', companyName: 'BistroChain', industry: 'F&B' },
      { name: 'Deepak Joshi', companyName: 'AgriTech Solutions', industry: 'Agriculture Tech' },
    ];
    for (let i = 0; i < 12; i++) {
      const ld = leadNames[i];
      const status = randomItem(leadStatuses);
      const lead = await Lead.create({
        company: company._id,
        name: ld.name,
        companyName: ld.companyName,
        email: ld.name.toLowerCase().replace(' ', '.') + '@example.com',
        phone: `+91-99${String(randomInt(10000000, 99999999))}`,
        industry: ld.industry,
        source: randomItem(leadSources),
        status,
        value: randomInt(50000, 500000),
        probability: status === 'closed_won' ? 100 : status === 'closed_lost' ? 0 : randomInt(10, 80),
        expectedCloseDate: daysFromNow(randomInt(7, 90)),
        assignedTo: randomItem(allUsers)._id,
        nextFollowUp: daysFromNow(randomInt(1, 14)),
        notes: `Lead from ${ld.companyName} - interested in our solutions`,
        tags: [ld.industry.toLowerCase().replace(/[^a-z]/g, '')],
        activities: [
          { type: 'note', description: 'Initial contact made', date: daysAgo(5), createdBy: randomItem(allUsers)._id },
          { type: randomItem(['call', 'email']), description: 'Follow-up discussion', date: daysAgo(2), createdBy: randomItem(allUsers)._id },
        ],
        convertedToDeal: status === 'closed_won',
        createdBy: randomItem(allUsers)._id,
      });
      leads.push(lead);
    }
    console.log(`   ✅ ${leads.length} leads created`);

    // ─── 8. Deals ───
    const dealStages = ['new', 'discovery', 'proposal', 'negotiation', 'won', 'lost'];
    const deals = [];
    const dealData = [
      { name: 'CRM Implementation - Acme Corp', value: 250000, stage: 'negotiation' },
      { name: 'ERP Migration - TechVista', value: 450000, stage: 'proposal' },
      { name: 'HR Suite - Metro Healthcare', value: 180000, stage: 'won' },
      { name: 'Support Desk - BlueStar', value: 120000, stage: 'discovery' },
      { name: 'Custom Dev - Digital Dynamics', value: 350000, stage: 'new' },
      { name: 'Full Platform - Peak Construction', value: 600000, stage: 'lost' },
    ];
    for (const dd of dealData) {
      const deal = await Deal.create({
        company: company._id,
        name: dd.name,
        lead: randomItem(leads)._id,
        client: randomItem(clients)._id,
        value: dd.value,
        stage: dd.stage,
        probability: dd.stage === 'won' ? 100 : dd.stage === 'lost' ? 0 : randomInt(20, 80),
        expectedCloseDate: daysFromNow(randomInt(14, 60)),
        assignedTo: randomItem(allUsers.filter(u => ['admin', 'manager', 'sales'].includes(u.role)))?._id || adminUser._id,
        products: [{ product: randomItem(products)._id, name: randomItem(products).name, quantity: randomInt(1, 5), price: randomItem(products).price }],
        notes: `Deal for ${dd.name}`,
        tags: ['enterprise'],
        activities: [
          { type: 'meeting', description: 'Initial discovery meeting', date: daysAgo(7), createdBy: adminUser._id },
          { type: 'email', description: 'Proposal sent', date: daysAgo(3), createdBy: adminUser._id },
        ],
        createdBy: adminUser._id,
      });
      deals.push(deal);
    }
    console.log(`   ✅ ${deals.length} deals created`);

    // ─── 9. Projects ───
    const projectData = [
      { name: 'CRM Platform v2.0', description: 'Complete CRM platform overhaul with new UI and advanced analytics', status: 'in_progress', priority: 'high', budget: 1500000, spent: 650000, progress: 45, milestones: [
        { title: 'Design Phase', description: 'UI/UX design and wireframes', dueDate: daysAgo(20), completed: true, completedDate: daysAgo(22) },
        { title: 'Backend API', description: 'REST API development', dueDate: daysFromNow(15), completed: false },
        { title: 'Frontend Build', description: 'React frontend implementation', dueDate: daysFromNow(45), completed: false },
        { title: 'Testing & QA', description: 'End-to-end testing', dueDate: daysFromNow(60), completed: false },
      ]},
      { name: 'Mobile App - Phase 1', description: 'React Native mobile app for iOS and Android', status: 'planning', priority: 'medium', budget: 800000, spent: 50000, progress: 10, milestones: [
        { title: 'Requirements', description: 'Gather requirements and create specs', dueDate: daysFromNow(7), completed: false },
        { title: 'Prototype', description: 'Interactive prototype', dueDate: daysFromNow(21), completed: false },
      ]},
      { name: 'Invoice Automation', description: 'Automated invoicing system with GST compliance and recurring billing', status: 'completed', priority: 'high', budget: 500000, spent: 480000, progress: 100, milestones: [
        { title: 'Core Engine', description: 'Invoice generation engine', completed: true, completedDate: daysAgo(30) },
        { title: 'GST Module', description: 'GST calculation and filing', completed: true, completedDate: daysAgo(15) },
        { title: 'Launch', description: 'Production deployment', completed: true, completedDate: daysAgo(5) },
      ]},
      { name: 'AI Chatbot Integration', description: 'Integrate AI-powered chatbot for customer support automation', status: 'on_hold', priority: 'low', budget: 300000, spent: 80000, progress: 20, milestones: [
        { title: 'Bot Training', description: 'Train NLP model', dueDate: daysFromNow(30), completed: false },
        { title: 'Integration', description: 'Connect to support desk', dueDate: daysFromNow(60), completed: false },
      ]},
    ];
    const projectObjs = [];
    for (const pd of projectData) {
      const startDate = daysAgo(randomInt(10, 60));
      const proj = await Project.create({
        company: company._id,
        ...pd,
        startDate,
        endDate: daysFromNow(randomInt(30, 90)),
        client: randomItem(clients)._id,
        deal: randomItem(deals)._id,
        manager: adminUser._id,
        team: allUsers.slice(0, randomInt(3, 5)).map(u => u._id),
        tags: ['active'],
        createdBy: adminUser._id,
      });
      projectObjs.push(proj);
    }
    console.log(`   ✅ ${projectObjs.length} projects created`);

    // ─── 10. Tasks ───
    const taskTitles = [
      'Design login page', 'Implement JWT auth', 'Build dashboard layout', 'Create invoice form', 'Set up CI/CD pipeline',
      'Write API docs', 'Add unit tests for auth', 'Implement search', 'Build notification system', 'Create user profile page',
      'Design email templates', 'Fix pagination bug', 'Add export to CSV', 'Implement dark mode', 'Build settings page',
      'Add multi-language support', 'Optimize database queries', 'Create onboarding flow', 'Build admin panel', 'Add webhook integration',
    ];
    const taskStatuses = ['todo', 'in_progress', 'review', 'completed', 'cancelled'];
    const taskPriorities = ['low', 'medium', 'high', 'urgent'];
    const tasks = [];
    for (let i = 0; i < 20; i++) {
      const task = await Task.create({
        company: company._id,
        project: randomItem(projectObjs)._id,
        title: taskTitles[i],
        description: `Implement and test: ${taskTitles[i]}`,
        status: randomItem(taskStatuses),
        priority: randomItem(taskPriorities),
        assignedTo: randomItem(allUsers)._id,
        dueDate: daysFromNow(randomInt(1, 30)),
        estimatedHours: randomInt(2, 40),
        actualHours: randomInt(0, 30),
        tags: [randomItem(['frontend', 'backend', 'design', 'devops', 'testing'])],
        checklist: [
          { text: 'Research requirements', completed: true },
          { text: 'Implementation', completed: Math.random() > 0.5 },
          { text: 'Testing', completed: false },
        ],
        comments: [{
          user: randomItem(allUsers)._id,
          userName: randomItem(allUsers).name,
          text: 'Working on this, will update by EOD',
          createdAt: daysAgo(randomInt(0, 3)),
        }],
        createdBy: randomItem(allUsers)._id,
      });
      tasks.push(task);
    }
    console.log(`   ✅ ${tasks.length} tasks created`);

    // ─── 11. Employees ───
    const employeeData = [
      { name: 'Admin User', employeeId: 'EMP-001', department: 'Management', designation: 'CEO', employmentType: 'full_time', salary: { basic: 100000, hra: 40000, allowances: 15000, deductions: 12000, gross: 155000, net: 143000 } },
      { name: 'Priya Sharma', employeeId: 'EMP-002', department: 'Sales', designation: 'Sales Manager', employmentType: 'full_time', salary: { basic: 70000, hra: 28000, allowances: 10000, deductions: 8500, gross: 108000, net: 99500 } },
      { name: 'Rahul Verma', employeeId: 'EMP-003', department: 'Sales', designation: 'Sales Executive', employmentType: 'full_time', salary: { basic: 45000, hra: 18000, allowances: 6000, deductions: 5500, gross: 69000, net: 63500 } },
      { name: 'Anita Desai', employeeId: 'EMP-004', department: 'HR', designation: 'HR Manager', employmentType: 'full_time', salary: { basic: 65000, hra: 26000, allowances: 9000, deductions: 8000, gross: 100000, net: 92000 } },
      { name: 'Vikram Singh', employeeId: 'EMP-005', department: 'Finance', designation: 'Finance Lead', employmentType: 'full_time', salary: { basic: 75000, hra: 30000, allowances: 12000, deductions: 9500, gross: 117000, net: 107500 } },
      { name: 'Meera Patel', employeeId: 'EMP-006', department: 'Support', designation: 'Support Engineer', employmentType: 'full_time', salary: { basic: 40000, hra: 16000, allowances: 5000, deductions: 5000, gross: 61000, net: 56000 } },
      { name: 'Arjun Nair', employeeId: 'EMP-007', department: 'Engineering', designation: 'Senior Developer', employmentType: 'full_time', salary: { basic: 80000, hra: 32000, allowances: 15000, deductions: 10200, gross: 127000, net: 116800 } },
      { name: 'Divya Reddy', employeeId: 'EMP-008', department: 'Engineering', designation: 'Frontend Developer', employmentType: 'full_time', salary: { basic: 55000, hra: 22000, allowances: 8000, deductions: 6800, gross: 85000, net: 78200 } },
    ];
    const employees = [];
    for (let i = 0; i < employeeData.length; i++) {
      const ed = employeeData[i];
      const matchingUser = allUsers.find(u => u.name === ed.name);
      const emp = await Employee.create({
        company: company._id,
        user: matchingUser?._id,
        employeeId: ed.employeeId,
        name: ed.name,
        email: matchingUser?.email || ed.name.toLowerCase().replace(' ', '.') + '@azolve.com',
        phone: matchingUser?.phone || `+91-99${String(randomInt(10000000, 99999999))}`,
        department: ed.department,
        designation: ed.designation,
        joiningDate: daysAgo(randomInt(90, 730)),
        employmentType: ed.employmentType,
        status: 'active',
        salary: ed.salary,
        address: { street: `${randomInt(10, 99)} Sector ${randomInt(1, 60)}`, city: randomItem(['Noida', 'Delhi', 'Gurgaon', 'Bengaluru', 'Mumbai']), state: randomItem(['Uttar Pradesh', 'Delhi', 'Haryana', 'Karnataka', 'Maharashtra']), country: 'India', pincode: `${randomInt(110001, 560099)}` },
        personalInfo: { dateOfBirth: randomDate(new Date(1985, 0, 1), new Date(1998, 11, 31)), gender: randomItem(['male', 'female']), bloodGroup: randomItem(['A+', 'B+', 'O+', 'AB+']), maritalStatus: randomItem(['single', 'married']), nationality: 'Indian' },
        emergencyContact: { name: 'Emergency Contact', phone: `+91-98${String(randomInt(10000000, 99999999))}`, relation: randomItem(['Spouse', 'Parent', 'Sibling']) },
        documents: { pan: `${String.fromCharCode(65 + randomInt(0, 25))}${String.fromCharCode(65 + randomInt(0, 25))}KP${randomInt(1000, 9999)}${String.fromCharCode(65 + randomInt(0, 25))}`, aadhaar: `${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}` },
        leaveBalance: { sick: 12, casual: 12, earned: 15, maternity: 0, paternity: 0, compensatory: 2 },
        skills: randomItem([['JavaScript', 'React', 'Node.js'], ['Python', 'Django', 'AWS'], ['Sales', 'CRM', 'Negotiation'], ['HR', 'Recruitment', 'Compliance'], ['Finance', 'Tally', 'GST']]),
        notes: 'Team member',
        createdBy: adminUser._id,
      });
      employees.push(emp);
    }
    console.log(`   ✅ ${employees.length} employees created`);

    // ─── 12. Attendance ───
    let attendanceCount = 0;
    for (const emp of employees.slice(0, 6)) {
      for (let d = 1; d <= 7; d++) {
        const date = daysAgo(d);
        if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
        const clockIn = new Date(date); clockIn.setHours(9, randomInt(0, 30), 0, 0);
        const clockOut = new Date(date); clockOut.setHours(18, randomInt(0, 30), 0, 0);
        await Attendance.create({
          company: company._id,
          employee: emp._id,
          user: emp.user,
          date,
          clockIn,
          clockOut,
          totalBreakMinutes: 60,
          totalWorkMinutes: 480,
          totalHours: 8,
          status: randomItem(['present', 'present', 'present', 'late', 'work_from_home']),
        });
        attendanceCount++;
      }
    }
    console.log(`   ✅ ${attendanceCount} attendance records created`);

    // ─── 13. Leaves ───
    const leaveTypes = ['sick', 'casual', 'earned', 'unpaid'];
    const leaveStatuses2 = ['pending', 'approved', 'rejected'];
    const leaveData = [
      { empIdx: 2, type: 'casual', days: 2, status: 'approved', reason: 'Personal work' },
      { empIdx: 3, type: 'sick', days: 1, status: 'approved', reason: 'Not feeling well' },
      { empIdx: 5, type: 'earned', days: 3, status: 'pending', reason: 'Family vacation' },
      { empIdx: 1, type: 'casual', days: 1, status: 'approved', reason: 'Doctor appointment' },
      { empIdx: 4, type: 'sick', days: 2, status: 'rejected', reason: 'Fever and cold' },
    ];
    for (const ld of leaveData) {
      const emp = employees[ld.empIdx];
      const startDate = daysFromNow(randomInt(1, 14));
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + ld.days - 1);
      await Leave.create({
        company: company._id,
        employee: emp._id,
        user: emp.user,
        type: ld.type,
        startDate,
        endDate,
        totalDays: ld.days,
        reason: ld.reason,
        status: ld.status,
        approvedBy: ld.status === 'approved' ? adminUser._id : undefined,
        approvedDate: ld.status === 'approved' ? daysAgo(1) : undefined,
        rejectionReason: ld.status === 'rejected' ? 'Peak season - cannot approve at this time' : undefined,
        createdBy: emp.user || adminUser._id,
      });
    }
    console.log(`   ✅ ${leaveData.length} leave requests created`);

    // ─── 14. Tickets ───
    const ticketData = [
      { subject: 'Unable to export invoice to PDF', category: 'technical', priority: 'high', status: 'in_progress', client: clients[0] },
      { subject: 'GST calculation showing wrong amount', category: 'billing', priority: 'urgent', status: 'open', client: clients[3] },
      { subject: 'Feature request: Multi-currency support', category: 'feature_request', priority: 'low', status: 'open', client: clients[4] },
      { subject: 'Login page not loading on Safari', category: 'technical', priority: 'medium', status: 'resolved', client: clients[1] },
      { subject: 'Need bulk invoice creation feature', category: 'feature_request', priority: 'medium', status: 'open', client: clients[7] },
    ];
    const tickets = [];
    for (let i = 0; i < ticketData.length; i++) {
      const td = ticketData[i];
      const ticket = await Ticket.create({
        company: company._id,
        ticketNumber: `TKT-${String(i + 1).padStart(5, '0')}`,
        subject: td.subject,
        description: `${td.subject}. Please look into this as soon as possible. Steps to reproduce: 1. Login to the application 2. Navigate to the relevant section 3. Perform the action 4. Observe the issue`,
        category: td.category,
        priority: td.priority,
        status: td.status,
        client: td.client._id,
        raisedBy: { name: td.client.contactPerson, email: td.client.email, phone: td.client.phone },
        assignedTo: td.priority === 'urgent' ? teamUsers[4]._id : randomItem(teamUsers)._id,
        comments: [{
          user: adminUser._id,
          userName: 'Admin User',
          text: 'Looking into this issue. Will update shortly.',
          isInternal: false,
          createdAt: daysAgo(1),
        }],
        tags: [td.category],
        createdBy: adminUser._id,
      });
      tickets.push(ticket);
    }
    console.log(`   ✅ ${tickets.length} support tickets created`);

    // ─── 15. Meetings ───
    const meetingData = [
      { title: 'Weekly Team Standup', type: 'video', status: 'scheduled', scheduledTime: daysFromNow(1) },
      { title: 'Client Demo - Acme Corp', type: 'video', status: 'scheduled', scheduledTime: daysFromNow(2) },
      { title: 'Sprint Planning - CRM v2', type: 'video', status: 'ended', scheduledTime: daysAgo(1), startTime: daysAgo(1), endTime: daysAgo(1), duration: 3600 },
    ];
    const meetings = [];
    for (let i = 0; i < meetingData.length; i++) {
      const md = meetingData[i];
      const meeting = await Meeting.create({
        company: company._id,
        meetingId: `mtg-${Date.now()}-${i}`,
        title: md.title,
        description: `Regular meeting: ${md.title}`,
        host: adminUser._id,
        type: md.type,
        status: md.status,
        scheduledTime: md.scheduledTime,
        startTime: md.startTime,
        endTime: md.endTime,
        duration: md.duration || 0,
        participants: allUsers.slice(0, 4).map(u => ({
          user: u._id, name: u.name, email: u.email, role: u._id.equals(adminUser._id) ? 'host' : 'participant',
        })),
        maxParticipants: 50,
        isPublic: true,
        password: i === 1 ? 'demo123' : undefined,
        settings: { muteOnEntry: false, videoOffOnEntry: false, allowScreenShare: true, allowChat: true, allowRecording: true, waitingRoom: false },
        agenda: md.title,
        createdBy: adminUser._id,
      });
      meetings.push(meeting);
    }
    console.log(`   ✅ ${meetings.length} meetings created`);

    // ─── 16. Events ───
    const eventData = [
      { title: 'Team Lunch', type: 'other', allDay: false, color: '#4CAF50' },
      { title: 'Product Launch', type: 'reminder', allDay: true, color: '#FF9800' },
      { title: 'Quarterly Review', type: 'meeting', allDay: false, color: '#2196F3' },
      { title: 'Tax Filing Deadline', type: 'deadline', allDay: true, color: '#F44336' },
      { title: 'Team Building Event', type: 'other', allDay: true, color: '#9C27B0' },
      { title: 'Annual Day', type: 'holiday', allDay: true, color: '#FF5722' },
      { title: 'Client Presentation', type: 'meeting', allDay: false, color: '#009688' },
      { title: 'Diwali Holiday', type: 'holiday', allDay: true, color: '#FFD700' },
    ];
    for (const ed of eventData) {
      const startDate = daysFromNow(randomInt(1, 60));
      const endDate = new Date(ed.allDay ? startDate.getTime() : startDate.getTime() + 3600000);
      await Event.create({
        company: company._id,
        title: ed.title,
        type: ed.type,
        startDate,
        endDate,
        allDay: ed.allDay,
        location: randomItem(['Office - Conference Room', 'Main Hall', 'Virtual', '']),
        color: ed.color,
        attendees: allUsers.slice(0, randomInt(2, 5)).map(u => ({ user: u._id, name: u.name, email: u.email, status: randomItem(['pending', 'accepted', 'accepted']) })),
        reminder: { enabled: true, minutesBefore: 30 },
        recurrence: { type: 'none' },
        isPrivate: false,
        createdBy: adminUser._id,
      });
    }
    console.log(`   ✅ ${eventData.length} calendar events created`);

    // ─── 17. Bank Account & Transactions ───
    const bankAccount = await BankAccount.create({
      companyId: company._id,
      accountName: 'Azolve Technologies - Current Account',
      bankName: 'HDFC Bank',
      accountNumber: '50100352674912',
      ifscCode: 'HDFC0002674',
      accountType: 'current',
      branchName: 'Sector 62, Noida',
      currency: 'INR',
      openingBalance: 500000,
      currentBalance: 725000,
      lastReconciledAt: daysAgo(3),
      lastReconciledBalance: 720000,
      isActive: true,
      createdBy: adminUser._id,
    });
    console.log('   ✅ Bank account created');

    const txnDescriptions = [
      { desc: 'NEFT from Acme Corp - INV-2024-0003', type: 'credit', amount: 65000, category: 'income', channel: 'NEFT' },
      { desc: 'Salary - Priya Sharma', type: 'debit', amount: 99500, category: 'salary', channel: 'NEFT' },
      { desc: 'Salary - Rahul Verma', type: 'debit', amount: 63500, category: 'salary', channel: 'NEFT' },
      { desc: 'AWS Cloud Services', type: 'debit', amount: 15800, category: 'utility', channel: 'UPI' },
      { desc: 'UPI from Digital Dynamics', type: 'credit', amount: 42000, category: 'income', channel: 'UPI' },
      { desc: 'Office Rent - May 2024', type: 'debit', amount: 75000, category: 'rent', channel: 'NEFT' },
      { desc: 'Google Workspace', type: 'debit', amount: 8900, category: 'utility', channel: 'UPI' },
      { desc: 'IMPS from GreenLeaf Industries', type: 'credit', amount: 28000, category: 'income', channel: 'IMPS' },
      { desc: 'Marketing - Facebook Ads', type: 'debit', amount: 25000, category: 'marketing', channel: 'UPI' },
      { desc: 'NEFT from CloudNine Retail', type: 'credit', amount: 89000, category: 'income', channel: 'NEFT' },
      { desc: 'Electricity Bill', type: 'debit', amount: 12400, category: 'utility', channel: 'UPI' },
      { desc: 'Office Supplies - Amazon', type: 'debit', amount: 5600, category: 'office', channel: 'UPI' },
      { desc: 'Travel - Client Visit Bangalore', type: 'debit', amount: 18500, category: 'travel', channel: 'UPI' },
      { desc: 'GST Payment - Q4 2023', type: 'debit', amount: 125000, category: 'tax', channel: 'RTGS' },
      { desc: 'Bank Interest Credit', type: 'credit', amount: 3200, category: 'interest', channel: 'INT' },
    ];
    let runningBalance = 500000;
    for (let i = 0; i < txnDescriptions.length; i++) {
      const td = txnDescriptions[i];
      runningBalance += td.type === 'credit' ? td.amount : -td.amount;
      await BankTransaction.create({
        companyId: company._id,
        bankAccountId: bankAccount._id,
        txnDate: daysAgo(txnDescriptions.length - i),
        description: td.desc,
        reference: `REF${String(randomInt(100000, 999999))}`,
        type: td.type,
        amount: td.amount,
        balance: runningBalance,
        channel: td.channel,
        category: td.category,
        status: randomItem(['unmatched', 'matched', 'manually_matched']),
        matchedInvoiceId: td.category === 'income' && invoices.length > 0 ? randomItem(invoices)._id : undefined,
        uniqueHash: require('crypto').createHash('sha256').update(`${td.desc}-${td.amount}-${runningBalance}-${i}`).digest('hex'),
        notes: '',
      });
    }
    console.log(`   ✅ ${txnDescriptions.length} bank transactions created`);

    // ─── 18. Notifications ───
    const notifData = [
      { type: 'invoice', title: 'Invoice Overdue', message: 'Invoice INV-2024-0005 is overdue by 5 days', priority: 'high', url: '/invoices' },
      { type: 'payment', title: 'Payment Received', message: 'Payment of ₹65,000 received from Acme Corp', priority: 'normal', url: '/payments' },
      { type: 'task', title: 'Task Assigned', message: 'You have been assigned: Design login page', priority: 'normal', url: '/tasks' },
      { type: 'lead', title: 'New Lead', message: 'New lead from InnoTech Labs - Sandeep Reddy', priority: 'normal', url: '/leads' },
      { type: 'reminder', title: 'Meeting Reminder', message: 'Weekly Team Standup in 30 minutes', priority: 'high', url: '/meetings' },
      { type: 'system', title: 'System Update', message: 'Azolve v2.1 update available with new features', priority: 'low', url: '/settings' },
      { type: 'invoice', title: 'Invoice Created', message: 'Invoice INV-2024-0008 created for Pacific Foods', priority: 'normal', url: '/invoices' },
      { type: 'task', title: 'Task Completed', message: 'Task "Fix pagination bug" marked as completed', priority: 'normal', url: '/tasks' },
      { type: 'warning', title: 'Low Stock Alert', message: 'Mechanical Keyboard stock is below threshold (80 units)', priority: 'high', url: '/products' },
      { type: 'info', title: 'Welcome to Azolve!', message: 'Start exploring your business management suite', priority: 'normal', url: '/dashboard' },
    ];
    for (const nd of notifData) {
      await Notification.create({
        companyId: company._id,
        userId: randomItem(allUsers)._id,
        type: nd.type,
        title: nd.title,
        message: nd.message,
        icon: randomItem(['📋', '💰', '📌', '🎯', '⏰', '🔔', '📄', '✅', '⚠️', '👋']),
        url: nd.url,
        priority: nd.priority,
        read: Math.random() > 0.6,
      });
    }
    console.log(`   ✅ ${notifData.length} notifications created`);

    // ─── 19. Audit Logs ───
    const auditActions = [
      { action: 'login', resource: 'user', description: 'Admin user logged in' },
      { action: 'create', resource: 'invoice', description: 'Created invoice INV-2024-0001' },
      { action: 'create', resource: 'client', description: 'Created client Acme Corp' },
      { action: 'update', resource: 'deal', description: 'Updated deal CRM Implementation stage to negotiation' },
      { action: 'create', resource: 'task', description: 'Created task: Design login page' },
      { action: 'send', resource: 'invoice', description: 'Sent invoice INV-2024-0002 to client' },
      { action: 'pay', resource: 'invoice', description: 'Payment recorded for INV-2024-0003' },
      { action: 'create', resource: 'lead', description: 'Created lead: Sandeep Reddy from InnoTech Labs' },
      { action: 'update', resource: 'project', description: 'Updated project CRM Platform v2.0 progress to 45%' },
      { action: 'create', resource: 'ticket', description: 'Created support ticket TKT-00001' },
      { action: 'approve', resource: 'leave', description: 'Approved leave request for Priya Sharma' },
      { action: 'export', resource: 'invoice', description: 'Exported invoices to CSV' },
      { action: 'settings_change', resource: 'company', description: 'Updated company settings' },
      { action: 'role_change', resource: 'user', description: 'Changed role for Rahul Verma to sales' },
      { action: 'create', resource: 'employee', description: 'Created employee record for Arjun Nair' },
    ];
    for (const al of auditActions) {
      await AuditLog.create({
        companyId: company._id,
        userId: randomItem(allUsers)._id,
        userName: randomItem(allUsers).name,
        userEmail: randomItem(allUsers).email,
        action: al.action,
        resource: al.resource,
        description: al.description,
        severity: randomItem(['info', 'info', 'info', 'warning']),
        success: true,
        ipAddress: `192.168.1.${randomInt(1, 255)}`,
        endpoint: `/api/${al.resource}s`,
        method: randomItem(['GET', 'POST', 'PUT', 'PATCH']),
      });
    }
    console.log(`   ✅ ${auditActions.length} audit logs created`);

    // ─── 20. Documents (Office Suite) ───
    await Document.create({
      type: 'document',
      title: 'Welcome to Azolve',
      content: { html: '<h1>Welcome to Azolve</h1><p>This is a sample document created by the seed script. You can edit this using the Word editor in the Office Suite.</p><h2>Features</h2><ul><li>Rich text editing</li><li>Multiple format support</li><li>Share with team members</li></ul>', plainText: 'Welcome to Azolve\nThis is a sample document...' },
      company: company._id,
      createdBy: adminUser._id,
      lastEditedBy: adminUser._id,
    });
    await Document.create({
      type: 'spreadsheet',
      title: 'Sales Report Q1',
      content: { sheets: [{ name: 'Sheet1', rows: 100, cols: 26, cells: { 'A1': { v: 'Month', s: { bold: true } }, 'B1': { v: 'Revenue', s: { bold: true } }, 'C1': { v: 'Expenses', s: { bold: true } }, 'D1': { v: 'Profit', s: { bold: true } }, 'A2': { v: 'January' }, 'B2': { v: 450000 }, 'C2': { v: 320000 }, 'D2': { v: 130000 }, 'A3': { v: 'February' }, 'B3': { v: 520000 }, 'C3': { v: 350000 }, 'D3': { v: 170000 }, 'A4': { v: 'March' }, 'B4': { v: 480000 }, 'C4': { v: 310000 }, 'D4': { v: 170000 }, 'A5': { v: 'Total' }, 'B5': { f: 'SUM(B2:B4)', v: 1450000 }, 'C5': { f: 'SUM(C2:C4)', v: 980000 }, 'D5': { f: 'SUM(D2:D4)', v: 470000 } } }] },
      company: company._id,
      createdBy: adminUser._id,
      lastEditedBy: adminUser._id,
    });
    await Document.create({
      type: 'presentation',
      title: 'Company Overview',
      content: { slides: [{ id: 's1', layout: 'title', elements: [{ type: 'text', x: 50, y: 150, w: 700, h: 100, content: 'Azolve Technologies', fontSize: 44, bold: true, color: '#1a237e' }, { type: 'text', x: 50, y: 280, w: 700, h: 60, content: 'Business Management Suite', fontSize: 24, color: '#555' }], background: '#ffffff' }, { id: 's2', layout: 'content', elements: [{ type: 'text', x: 50, y: 50, w: 700, h: 60, content: 'Our Products', fontSize: 32, bold: true, color: '#1a237e' }, { type: 'text', x: 50, y: 150, w: 700, h: 300, content: '• CRM Pro - Complete CRM Solution\n• Invoice Pro - GST Compliant Billing\n• Project Suite - Task & Gantt Charts\n• HR Module - Employee Management\n• Support Desk - Ticket System', fontSize: 18, color: '#333' }], background: '#ffffff' }] },
      company: company._id,
      createdBy: adminUser._id,
      lastEditedBy: adminUser._id,
    });
    console.log('   ✅ 3 Office documents created');

    // ─── 21. API Key ───
    const { key, prefix, hash } = ApiKey.generate();
    await ApiKey.create({
      companyId: company._id,
      name: 'Development Test Key',
      keyPrefix: prefix,
      keyHash: hash,
      scopes: ['*'],
      rateLimit: 1000,
      isActive: true,
      createdBy: adminUser._id,
    });
    console.log(`   ✅ API key created (save this!): ${key}`);

    // ─── 22. Webhook ───
    await Webhook.create({
      companyId: company._id,
      name: 'Slack Notification',
      url: 'https://hooks.slack.com/services/T00/B00/XXX',
      events: ['invoice.paid', 'deal.won', 'ticket.created'],
      secret: 'whsec_' + require('crypto').randomBytes(16).toString('hex'),
      isActive: false,
      createdBy: adminUser._id,
    });
    console.log('   ✅ Sample webhook created');

    // ─── 23. Workflow ───
    await Workflow.create({
      companyId: company._id,
      name: 'Auto-send Invoice on Deal Won',
      description: 'When a deal is marked as won, automatically create and send an invoice',
      enabled: false,
      steps: [
        { id: 'step1', type: 'trigger', appType: 'deal', operation: 'deal.won', config: {}, position: { x: 100, y: 100 }, next: ['step2'] },
        { id: 'step2', type: 'action', appType: 'invoice', operation: 'invoice.create_send', config: { template: 'default' }, position: { x: 300, y: 100 }, next: [] },
      ],
      createdBy: adminUser._id,
      tags: ['automation', 'invoice'],
    });
    console.log('   ✅ Sample workflow created');

    // ─── 24. Chat & Messages ───
    const chat = await Chat.create({
      company: company._id,
      name: 'General Team Chat',
      type: 'group',
      description: 'Main team communication channel',
      participants: allUsers.map(u => ({ user: u._id, name: u.name, role: u._id.equals(adminUser._id) ? 'admin' : 'member' })),
      lastMessage: { content: 'Hey team, let\'s sync up on the CRM project!', sender: 'Priya Sharma', timestamp: daysAgo(0.1) },
      isActive: true,
      createdBy: adminUser._id,
    });
    const chatMessages = [
      { sender: adminUser, content: 'Good morning team! How is everyone doing?' },
      { sender: teamUsers[0], content: 'Morning! Working on the sales reports today.' },
      { sender: teamUsers[2], content: 'HR updates: 3 new candidates shortlisted for the developer position.' },
      { sender: teamUsers[1], content: 'Great news! Acme Corp deal is moving to negotiation stage.' },
      { sender: teamUsers[0], content: 'Hey team, let\'s sync up on the CRM project!' },
    ];
    for (let i = 0; i < chatMessages.length; i++) {
      const cm = chatMessages[i];
      await Message.create({
        company: company._id,
        chat: chat._id,
        sender: cm.sender._id,
        senderName: cm.sender.name,
        content: cm.content,
        type: 'text',
      });
    }
    console.log('   ✅ Chat channel + messages created');

    // ─── 22. Emails ───
    const priyaUser = teamUsers.find(u => u.email === 'priya@azolve.com');
    const anitaUser = teamUsers.find(u => u.email === 'anita@azolve.com');

    const email1Thread = new mongoose.Types.ObjectId();
    const email1 = await Email.create({
      company: company._id,
      sender: { name: 'Marcus Vance', email: 'partner@globalcorp.com' },
      recipients: [{ user: adminUser._id, name: adminUser.name, email: adminUser.email, recipientType: 'to' }],
      subject: 'Request for Strategic Proposal',
      body: '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;"><p>Dear Admin,</p><p>I reviewed your software portfolio and would like to request an enterprise proposal for custom integration services. We have around 120 employees in our core operations.</p><p>Looking forward to your reply.</p><br><p>Best regards,</p><p><strong>Marcus Vance</strong><br>VP Strategy · GlobalCorp</p></div>',
      snippet: 'Dear Admin, I reviewed your software portfolio and would like to request an enterprise proposal...',
      isDraft: false,
      threadId: email1Thread,
      readBy: [], // Unread
      starredBy: [],
      trashedBy: [],
      archivedBy: [],
      deletedBy: []
    });

    const email2Thread = new mongoose.Types.ObjectId();
    const email2 = await Email.create({
      company: company._id,
      sender: { user: adminUser._id, name: adminUser.name, email: adminUser.email },
      recipients: [{ user: priyaUser ? priyaUser._id : undefined, name: priyaUser ? priyaUser.name : 'Priya', email: 'priya@azolve.com', recipientType: 'to' }],
      subject: 'Weekly Sales Pipeline Targets',
      body: '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;"><p>Hi Priya,</p><p>Please make sure we follow up with Acme Corp and GlobalCorp this week. They have active enterprise interest.</p><p>Thanks,</p><p>Admin</p></div>',
      snippet: 'Hi Priya, Please make sure we follow up with Acme Corp and GlobalCorp this week...',
      isDraft: false,
      threadId: email2Thread,
      readBy: [adminUser._id],
      starredBy: [],
      trashedBy: [],
      archivedBy: [],
      deletedBy: []
    });

    const email3Thread = new mongoose.Types.ObjectId();
    const email3 = await Email.create({
      company: company._id,
      sender: { user: anitaUser ? anitaUser._id : undefined, name: anitaUser ? anitaUser.name : 'Anita', email: 'anita@azolve.com' },
      recipients: [{ user: adminUser._id, name: adminUser.name, email: adminUser.email, recipientType: 'to' }],
      subject: 'New Developer Onboarding Documents',
      body: '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;"><p>Hi Admin,</p><p>I have prepared the contracts and compliance checklists for the new engineering hires starting next week. Let me know if you need any edits.</p><p>Regards,</p><p>Anita (HR)</p></div>',
      snippet: 'Hi Admin, I have prepared the contracts and compliance checklists for the new engineering hires...',
      isDraft: false,
      threadId: email3Thread,
      readBy: [],
      starredBy: [adminUser._id], // Starred by admin
      trashedBy: [],
      archivedBy: [],
      deletedBy: []
    });

    const email4Thread = new mongoose.Types.ObjectId();
    const email4 = await Email.create({
      company: company._id,
      sender: { user: adminUser._id, name: adminUser.name, email: adminUser.email },
      recipients: [{ name: 'Partner Org', email: 'partner@simulation.com', recipientType: 'to' }],
      subject: 'Draft Strategic Partnership Contract',
      body: '<div style="font-family:Arial,sans-serif;color:#333;line-height:1.5;"><p>This is a draft version of the partnership agreement. Please review details before our sync next week.</p></div>',
      snippet: 'This is a draft version of the partnership agreement. Please review details...',
      isDraft: true, // Draft
      threadId: email4Thread,
      readBy: [adminUser._id],
      starredBy: [],
      trashedBy: [],
      archivedBy: [],
      deletedBy: []
    });

    console.log('   ✅ Initial mock email threads created');

    // ─── Done! ───
    console.log('\n🎉 ─────────────────────────────────────────────');
    console.log('   Seeding complete! You can now login with:');
    console.log('');
    console.log('   📧 Email:    admin@azolve.com');
    console.log('   🔑 Password: admin123');
    console.log('');
    console.log('   Other team members (all use password: team123):');
    console.log('   - priya@azolve.com  (Sales Manager)');
    console.log('   - rahul@azolve.com  (Sales Executive)');
    console.log('   - anita@azolve.com  (HR Manager)');
    console.log('   - vikram@azolve.com (Finance Lead)');
    console.log('   - meera@azolve.com  (Support Engineer)');
    console.log('');
    console.log('   🔑 API Key (save this — shown only once):');
    console.log(`   ${key}`);
    console.log('');
    console.log('   Start the server: npm start');
    console.log('   Open: http://localhost:3000');
    console.log('─────────────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed();
