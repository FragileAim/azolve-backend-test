const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ---------- Security Middleware ----------
// In development: disable CSP so inline scripts in HTML work (login, register, dashboard all use inline <script>)
// In production: enable CSP with nonce/hash-based policy for security
const helmetConfig = {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
};

if (process.env.NODE_ENV !== 'production') {
  // Dev mode: disable Content-Security-Policy so inline scripts work on localhost
  // The frontend uses inline <script> tags extensively — CSP would block them all
  helmetConfig.contentSecurityPolicy = false;
}

app.use(helmet(helmetConfig));

// ---------- CORS Configuration ----------
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:8082',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8082',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      null, // Same-origin requests have null origin
    ].filter(Boolean);

    // In development, allow ALL origins; in production, only allow listed ones
    const isDev = (process.env.NODE_ENV !== 'production');
    if (!origin || isDev || allowedOrigins.some(o => origin && o.startsWith(origin.split('//')[0] + '//' + origin.split('/')[2]))) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Still allow in dev; block only in strict production
      callback(isDev ? null : new Error('CORS not allowed'), isDev);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
};
app.use(cors(corsOptions));

// ---------- Rate Limiting ----------
const isDevMode = (process.env.NODE_ENV !== 'production');

const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: isDevMode ? 5000 : (parseInt(process.env.RATE_LIMIT_MAX) || 100),
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevMode && process.env.SKIP_RATE_LIMIT === 'true',
});
app.use('/api/', limiter);

// Auth rate limiter — more generous for localhost dev (testing repeats frequently)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevMode ? 200 : 20,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' },
  skip: () => isDevMode && process.env.SKIP_RATE_LIMIT === 'true',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---------- Body Parsing ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Compression ----------
app.use(compression());

// ---------- Logging ----------
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ---------- Static Files (Uploads) ----------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Static Files (Frontend for localhost dev) ----------
// When running locally, the backend serves the frontend HTML/CSS/JS files
// Supports two directory layouts:
//   Layout A (ZIP package):  backend/app.js  +  ../frontend/  (sibling)
//   Layout B (GitHub clone): app.js  +  ./frontend/            (inside repo root)
const fs = require('fs');
let frontendPath = path.join(__dirname, '..', 'frontend');
if (!fs.existsSync(path.join(frontendPath, 'login.html'))) {
  // Try layout B: frontend/ inside the repo root
  frontendPath = path.join(__dirname, 'frontend');
}
console.log(`📁 Frontend static files: ${frontendPath}`);
app.use(express.static(frontendPath));
// Serve specific subdirectories
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));
app.use('/pages', express.static(path.join(frontendPath, 'pages')));
app.use('/locales', express.static(path.join(frontendPath, 'locales')));
app.use('/apps', express.static(path.join(frontendPath, 'apps')));

// ---------- API Routes ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/products', require('./routes/products'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/sales-orders', require('./routes/salesOrders'));
app.use('/api/delivery-challans', require('./routes/deliveryChallans'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/emails', require('./routes/emails'));


// ===== V2 Feature Routes =====
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/search', require('./routes/search'));
app.use('/api/copilot', require('./routes/copilot'));
app.use('/api/einvoice', require('./routes/einvoice'));
app.use('/api/churn', require('./routes/churn'));
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/bank-statements', require('./routes/bankStatements'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/office', require('./routes/office'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activityTimeline'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/canva', require('./routes/canva'));
app.use('/api/seo', require('./routes/seo'));
app.use('/api/remote-access', require('./routes/remoteAccess'));

// Public API (API key auth) + Webhooks/API Keys admin (JWT auth)
const _publicApiModule = require('./routes/publicApi');
if (_publicApiModule.publicApi) {
  app.use('/api/v1/public', _publicApiModule.publicApi);
  if (_publicApiModule.webhooksAdmin) app.use('/api/webhooks', _publicApiModule.webhooksAdmin);
  if (_publicApiModule.apiKeysAdmin) app.use('/api/api-keys', _publicApiModule.apiKeysAdmin);
} else {
  app.use('/api/v1/public', _publicApiModule);
}

// ---------- Health Check ----------
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Azolve API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()) + 's',
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    emailHost: process.env.EMAIL_HOST || 'not set',
  });
});

// ---------- 404 Handler ----------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ---------- Global Error Handler ----------
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation Error', errors: messages });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;