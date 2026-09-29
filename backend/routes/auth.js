const router = require('express').Router();
const User = require('../models/User');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { sendEmail, verifyTransporter, templates } = require('../utils/email');
const crypto = require('crypto');

// POST /api/auth/register
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, companyName, companyDomain, phone, industry } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create company
    const domain = companyDomain || email.split('@')[1].toLowerCase();
    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com'];
    
    let company = null;
    // Only auto-join if it's not a generic public email domain
    if (!genericDomains.includes(domain)) {
        company = await Company.findOne({ domain });
    }
    
    if (!company) {
      company = await Company.create({
        name: companyName,
        domain,
        email,
        phone,
        industry: industry || '',
        settings: { timezone: 'Asia/Kolkata', currency: 'INR', dateFormat: 'DD/MM/YYYY' },
      });
    }

    // Create user
    const user = await User.create({
      name, email, password, phone,
      role: 'admin', // First user is admin
      company: company._id,
      isActive: true,
      isVerified: true,
    });

    // Update company creator
    company.createdBy = user._id;
    await company.save();

    // Generate tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Send welcome email
    const emailTemplate = templates.welcome(name, companyName);
    sendEmail({ to: email, ...emailTemplate }).catch(err => console.warn('Welcome email failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          phone: user.phone || '',
          permissions: user.permissions,
          preferences: user.preferences,
          company: company._id,          // ← Added: company reference in user object
        },
        company: {
          id: company._id,
          _id: company._id,              // ← Added: both id and _id for compatibility
          name: company.name,
          domain: company.domain,
          plan: company.plan,
          isActive: company.isActive,
          settings: company.settings,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +twoFactorEnabled +twoFactorCode +twoFactorExpire +twoFactorAttempts +twoFactorLastSent').populate('company', 'name domain plan isActive settings logo features');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact your administrator.' });
    }

    if (user.company && !user.company.isActive) {
      return res.status(401).json({ success: false, message: 'Company account is inactive.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // ── 2FA Check ──
    if (user.twoFactorEnabled) {
      // Generate OTP
      const otpCode = user.generateTwoFactorCode();
      await user.save({ validateBeforeSave: false });

      // Send OTP email (non-blocking)
      const emailTemplate = templates.twoFactorOTP(user.name, otpCode);
      sendEmail({ to: email, ...emailTemplate }).catch(err => console.warn('2FA OTP email failed:', err.message));

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 [DEV MODE] 2FA OTP Code for ${email}: ${otpCode}`);
      }

      // Generate a short-lived temp token (10 min) — cannot be used as auth token
      const jwt = require('jsonwebtoken');
      const tempToken = jwt.sign(
        { id: user._id, purpose: '2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      console.log(`🔐 2FA OTP sent to ${email}`);

      const responseData = {
        requires2FA: true,
        tempToken,
      };

      if (process.env.NODE_ENV !== 'production') {
        responseData.otpCode = otpCode;
      }

      return res.json({
        success: true,
        message: 'OTP sent to your email',
        data: responseData,
      });
    }

    // ── Standard login (no 2FA) ──
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          phone: user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          permissions: user.permissions,
          preferences: user.preferences,
          company: user.company?._id || user.company,
        },
        company: user.company,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('company', 'name domain plan isActive settings logo features');
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          phone: user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          permissions: user.permissions,
          preferences: user.preferences,
          company: user.company?._id || user.company,
        },
        company: user.company,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const newToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate token and save (with validateBeforeSave:false to skip unrelated validators)
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = (process.env.FRONTEND_URL || 'https://azolve.io').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;
    console.log(`📧 Sending password reset to ${normalizedEmail}, URL: ${resetUrl}`);

    // NON-BLOCKING email — route always succeeds even if email config is missing
    const emailTemplate = templates.resetPassword(user.name, resetUrl);
    sendEmail({ to: normalizedEmail, ...emailTemplate }).then(result => {
      if (result && result.success) {
        console.log(`✅ Password reset email sent to ${normalizedEmail} (MessageID: ${result.messageId})`);
      } else {
        console.warn(`⚠️ Password reset email NOT delivered to ${normalizedEmail}`);
        console.warn(`   Reason: ${result ? result.message : 'unknown error'}`);
        console.warn(`   Error code: ${result ? result.code : 'N/A'}`);
        console.warn('   === TROUBLESHOOTING ===');
        console.warn('   1. Check EMAIL_USER and EMAIL_PASS are correct in Render env vars');
        console.warn('   2. For Brevo: Login must be xxxxxxxx@smtp-brevo.com (NOT your account email)');
        console.warn('   3. For Brevo: Pass must be the SMTP key from brevo.com -> SMTP & API tab');
        console.warn('   4. Verify sender email (EMAIL_FROM) is authorized in Brevo senders list');
        console.warn('   5. Check Brevo dashboard for bounce/delivery logs');
        console.warn('   Debug: GET /api/auth/email-status for SMTP verification');
      }
    }).catch(err => {
      console.error(`❌ Password reset email error for ${normalizedEmail}:`, err.message);
      console.error(`   Error code: ${err.code}`);
    });

    res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/email-status — Check if email is configured (admin debug)
router.get('/email-status', async (req, res) => {
  const hasBrevoApiKey = !!process.env.BREVO_API_KEY;
  const hasSmtpConfig = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  let smtpVerification = null;

  if (hasSmtpConfig) {
    smtpVerification = await verifyTransporter();
  }

  res.json({
    // Primary method: Brevo HTTP API (works on Render free tier — port 443)
    brevoApiConfigured: hasBrevoApiKey,
    brevoApiKeyPreview: hasBrevoApiKey ? process.env.BREVO_API_KEY.substring(0, 8) + '***' : 'not set',
    senderEmail: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM || 'not set',
    senderName: process.env.EMAIL_FROM_NAME || 'Azolve',

    // Fallback method: SMTP (may fail on Render free tier — ports 25/465/587 blocked)
    smtpConfigured: hasSmtpConfig,
    smtpHost: process.env.EMAIL_HOST || 'not set',
    smtpPort: process.env.EMAIL_PORT || 'not set',
    smtpUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 6) + '***' : 'not set',
    smtpVerified: smtpVerification ? smtpVerification.success : false,
    smtpError: smtpVerification && !smtpVerification.success ? smtpVerification.message : null,

    // Overall status
    emailReady: hasBrevoApiKey || (hasSmtpConfig && smtpVerification?.success),
    activeMethod: hasBrevoApiKey ? 'brevo-api' : (hasSmtpConfig ? 'smtp' : 'none'),

    frontendUrl: process.env.FRONTEND_URL || 'not set',
  });
});

// POST /api/auth/test-email — Send a test email (admin debug, requires auth)
router.post('/test-email', protect, async (req, res) => {
  try {
    const { to } = req.body;
    const testEmail = to || req.user.email;

    console.log(`🧪 Test email requested by ${req.user.email} -> ${testEmail}`);

    const result = await sendEmail({
      to: testEmail,
      subject: '🧪 Azolve Email Test — If you see this, email is working!',
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#714B67,#00A09D);padding:30px;text-align:center">
          <div style="font-size:32px;font-weight:900;color:#fff">AZOLVE</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">Email Test</div>
        </td></tr>
        <tr><td style="padding:32px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="color:#059669;margin:0 0 12px">Email Delivery Working!</h2>
          <p style="color:#475569;font-size:14px">This test email confirms that your Azolve email system is properly configured and delivering emails successfully.</p>
          <div style="background:#f8fafc;border-radius:10px;padding:16px;margin:20px 0;text-align:left">
            <p style="color:#64748b;font-size:12px;margin:0"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0"><strong>Delivery method:</strong> ${process.env.BREVO_API_KEY ? 'Brevo HTTP API' : 'SMTP (' + (process.env.EMAIL_HOST || 'not set') + ')'}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });

    res.json({
      success: result.success,
      message: result.success
        ? `Test email sent to ${testEmail}. Check inbox and spam folder.`
        : `Failed to send: ${result.message}`,
      details: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    // Must use .select() to include fields marked select:false in the User model
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Two-Factor Authentication (2FA) Endpoints ──

// GET /api/auth/2fa-status
router.get('/2fa-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false
      }
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/enable-2fa
router.post('/enable-2fa', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFactorCode +twoFactorExpire +twoFactorAttempts +twoFactorLastSent');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled' });
    }

    // Check cooldown
    const cooldown = parseInt(process.env.TWO_FACTOR_COOLDOWN) || 60;
    if (user.twoFactorLastSent) {
      const timeDiff = (Date.now() - new Date(user.twoFactorLastSent).getTime()) / 1000;
      if (timeDiff < cooldown) {
        const remaining = Math.ceil(cooldown - timeDiff);
        return res.status(400).json({ success: false, message: `Please wait ${remaining} second(s) before requesting another code.` });
      }
    }

    // Generate and send code
    const otpCode = user.generateTwoFactorCode();
    await user.save({ validateBeforeSave: false });

    // Send OTP email (non-blocking)
    const emailTemplate = templates.twoFactorOTP(user.name, otpCode);
    sendEmail({ to: user.email, ...emailTemplate }).catch(err => console.warn('2FA Enable OTP email failed:', err.message));

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [DEV MODE] 2FA Enable OTP Code for ${user.email}: ${otpCode}`);
    }

    const responseData = {
      success: true,
      message: 'Verification code sent to your email.'
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.otpCode = otpCode;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/confirm-enable-2fa
router.post('/confirm-enable-2fa', protect, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.user._id).select('+twoFactorCode +twoFactorExpire +twoFactorAttempts');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled' });
    }

    const verification = user.verifyTwoFactorCode(code);
    if (!verification.success) {
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        success: false,
        message: verification.message,
        remainingAttempts: verification.remainingAttempts
      });
    }

    // Success — Enable 2FA
    user.twoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Two-factor authentication has been successfully enabled.'
    });
  } catch (error) {
    console.error('Confirm Enable 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/disable-2fa
router.post('/disable-2fa', protect, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to disable 2FA' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect password' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorCode = undefined;
    user.twoFactorExpire = undefined;
    user.twoFactorAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Two-factor authentication has been disabled.'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ success: false, message: 'Token and verification code are required' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Verification link expired or invalid. Please login again.' });
    }

    if (decoded.purpose !== '2fa') {
      return res.status(401).json({ success: false, message: 'Invalid token purpose' });
    }

    const user = await User.findById(decoded.id)
      .select('+twoFactorCode +twoFactorExpire +twoFactorAttempts +twoFactorLastSent +refreshToken')
      .populate('company', 'name domain plan isActive settings logo features');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const verification = user.verifyTwoFactorCode(code);
    await user.save({ validateBeforeSave: false });

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
        remainingAttempts: verification.remainingAttempts
      });
    }

    // Success — generate full auth tokens
    const token = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Verification successful',
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || '',
          phone: user.phone || '',
          department: user.department || '',
          designation: user.designation || '',
          permissions: user.permissions,
          preferences: user.preferences,
          company: user.company?._id || user.company,
        },
        company: user.company,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/resend-2fa
router.post('/resend-2fa', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Temporary token is required' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Verification link expired or invalid. Please login again.' });
    }

    if (decoded.purpose !== '2fa') {
      return res.status(401).json({ success: false, message: 'Invalid token purpose' });
    }

    const user = await User.findById(decoded.id).select('+twoFactorCode +twoFactorExpire +twoFactorAttempts +twoFactorLastSent');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check cooldown
    const cooldown = parseInt(process.env.TWO_FACTOR_COOLDOWN) || 60;
    if (user.twoFactorLastSent) {
      const timeDiff = (Date.now() - new Date(user.twoFactorLastSent).getTime()) / 1000;
      if (timeDiff < cooldown) {
        const remaining = Math.ceil(cooldown - timeDiff);
        return res.status(400).json({ success: false, message: `Please wait ${remaining} second(s) before requesting another code.` });
      }
    }

    // Generate and send new OTP
    const otpCode = user.generateTwoFactorCode();
    await user.save({ validateBeforeSave: false });

    // Send OTP email (non-blocking)
    const emailTemplate = templates.twoFactorOTP(user.name, otpCode);
    sendEmail({ to: user.email, ...emailTemplate }).catch(err => console.warn('2FA OTP resend email failed:', err.message));

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [DEV MODE] 2FA Resend OTP Code for ${user.email}: ${otpCode}`);
    }

    const responseData = {
      success: true,
      message: 'A new verification code has been sent to your email.'
    };

    if (process.env.NODE_ENV !== 'production') {
      responseData.otpCode = otpCode;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
