const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  phone: { type: String, trim: true },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['super_admin', 'admin', 'manager', 'sales', 'hr', 'finance', 'support', 'employee', 'viewer'], default: 'employee' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
  refreshToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  // Two-Factor Authentication
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String, select: false },
  twoFactorExpire: { type: Date, select: false },
  twoFactorAttempts: { type: Number, default: 0, select: false },
  twoFactorLastSent: { type: Date, select: false },
  permissions: {
    canCreateInvoices: { type: Boolean, default: false },
    canViewAllClients: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canManageCompany: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageHR: { type: Boolean, default: false },
    canManageProjects: { type: Boolean, default: false },
    canManageSupport: { type: Boolean, default: false },
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
  },
}, { timestamps: true });

// Index for multi-tenant queries
userSchema.index({ company: 1, email: 1 });
userSchema.index({ company: 1, role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role, company: this.company },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// Generate Password Reset Token
userSchema.methods.generateResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

// Generate Two-Factor Authentication Code (6-digit OTP)
userSchema.methods.generateTwoFactorCode = function () {
  const otpCode = crypto.randomInt(100000, 999999).toString();
  this.twoFactorCode = crypto.createHash('sha256').update(otpCode).digest('hex');
  const expireMinutes = parseInt(process.env.TWO_FACTOR_EXPIRE) || 5;
  this.twoFactorExpire = Date.now() + expireMinutes * 60 * 1000;
  this.twoFactorAttempts = 0;
  this.twoFactorLastSent = new Date();
  return otpCode;
};

// Verify Two-Factor Authentication Code
userSchema.methods.verifyTwoFactorCode = function (code) {
  const maxAttempts = parseInt(process.env.TWO_FACTOR_MAX_ATTEMPTS) || 5;

  // Check expiry
  if (!this.twoFactorExpire || this.twoFactorExpire < Date.now()) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Check max attempts
  if (this.twoFactorAttempts >= maxAttempts) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  // Increment attempts
  this.twoFactorAttempts += 1;

  // Hash the provided code and compare
  const hashedCode = crypto.createHash('sha256').update(code.toString()).digest('hex');
  if (hashedCode !== this.twoFactorCode) {
    const remaining = maxAttempts - this.twoFactorAttempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempt(s) remaining.`, remainingAttempts: remaining };
  }

  // Success — clear 2FA fields
  this.twoFactorCode = undefined;
  this.twoFactorExpire = undefined;
  this.twoFactorAttempts = 0;
  return { success: true, message: 'OTP verified successfully.' };
};

// Set default permissions based on role
userSchema.pre('save', function (next) {
  if (this.isModified('role')) {
    const rolePermissions = {
      super_admin: { canCreateInvoices: true, canViewAllClients: true, canManageUsers: true, canManageCompany: true, canViewReports: true, canManageHR: true, canManageProjects: true, canManageSupport: true },
      admin: { canCreateInvoices: true, canViewAllClients: true, canManageUsers: true, canManageCompany: true, canViewReports: true, canManageHR: true, canManageProjects: true, canManageSupport: true },
      manager: { canCreateInvoices: true, canViewAllClients: true, canManageUsers: false, canManageCompany: false, canViewReports: true, canManageHR: false, canManageProjects: true, canManageSupport: true },
      sales: { canCreateInvoices: true, canViewAllClients: true, canManageUsers: false, canManageCompany: false, canViewReports: false, canManageHR: false, canManageProjects: false, canManageSupport: false },
      hr: { canCreateInvoices: false, canViewAllClients: false, canManageUsers: false, canManageCompany: false, canViewReports: false, canManageHR: true, canManageProjects: false, canManageSupport: false },
      finance: { canCreateInvoices: true, canViewAllClients: true, canManageUsers: false, canManageCompany: false, canViewReports: true, canManageHR: false, canManageProjects: false, canManageSupport: false },
      support: { canCreateInvoices: false, canViewAllClients: false, canManageUsers: false, canManageCompany: false, canViewReports: false, canManageHR: false, canManageProjects: false, canManageSupport: true },
      employee: { canCreateInvoices: false, canViewAllClients: false, canManageUsers: false, canManageCompany: false, canViewReports: false, canManageHR: false, canManageProjects: false, canManageSupport: false },
      viewer: { canCreateInvoices: false, canViewAllClients: false, canManageUsers: false, canManageCompany: false, canViewReports: false, canManageHR: false, canManageProjects: false, canManageSupport: false },
    };
    if (rolePermissions[this.role]) {
      this.permissions = rolePermissions[this.role];
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);