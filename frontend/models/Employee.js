const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String, trim: true },
  name: { type: String, required: [true, 'Employee name is required'], trim: true, maxlength: 200 },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  joiningDate: { type: Date },
  reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employmentType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern', 'freelance'], default: 'full_time' },
  status: { type: String, enum: ['active', 'inactive', 'terminated', 'on_notice'], default: 'active' },
  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
  },
  personalInfo: {
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    bloodGroup: { type: String, trim: true },
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed', ''], default: '' },
    nationality: { type: String, default: 'Indian' },
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true },
  },
  documents: {
    pan: { type: String, trim: true },
    aadhaar: { type: String, trim: true },
    passport: { type: String, trim: true },
    bankAccount: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    offerLetter: { type: String },
    resume: { type: String },
  },
  leaveBalance: {
    sick: { type: Number, default: 12 },
    casual: { type: Number, default: 12 },
    earned: { type: Number, default: 15 },
    maternity: { type: Number, default: 0 },
    paternity: { type: Number, default: 0 },
    compensatory: { type: Number, default: 0 },
  },
  skills: [{ type: String, trim: true }],
  notes: { type: String, trim: true },
  avatar: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

employeeSchema.index({ company: 1, employeeId: 1 });
employeeSchema.index({ company: 1, department: 1 });
employeeSchema.index({ company: 1, status: 1 });
employeeSchema.index({ company: 1, user: 1 });

module.exports = mongoose.model('Employee', employeeSchema);