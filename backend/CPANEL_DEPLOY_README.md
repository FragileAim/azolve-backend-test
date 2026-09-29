# 🚀 cPanel Deployment Instructions — Fresh Install

## What's in this ZIP

- ✅ Full backend source (routes, models, services, middleware, config, utils)
- ✅ All V2 features (AI Co-Pilot, e-Invoicing, Workflows, Churn, Bank Import, WhatsApp, Search, Public API, Webhooks, i18n, Audit Log, Notifications)
- ✅ Frontend assets (CSS, JS widgets, locale files, HTML pages)
- ✅ `node_modules/` already installed (no need to run `npm install` on cPanel)
- ✅ `.env.example` template
- ✅ Empty `uploads/` directory structure (avatars, bank-statements)

## 📋 Step-by-Step Deployment

### 1. Backup your current `.env` file
**IMPORTANT:** Before deleting old files, download your existing `.env` file from cPanel — you'll need to put it back after upload.

### 2. Delete old files in cPanel
- Go to **File Manager** → your Node.js app folder
- Select all files and delete them (you said you'll do this)

### 3. Upload this ZIP
- Upload `azolve-backend-FULL-cpanel.zip` to the app folder
- Right-click → **Extract**
- Delete the ZIP after extraction

### 4. Restore your `.env` file
- Upload the `.env` file you backed up in step 1
- OR copy `.env.example` → `.env` and fill in values:
  ```
  MONGODB_URI=mongodb+srv://...
  JWT_SECRET=your-secret-key
  PORT=3000
  NODE_ENV=production
  ```

### 5. Restart the Node.js app
- Go to cPanel → **Setup Node.js App**
- Click **Restart** on your app
- ⚠️ Do NOT click "Run NPM Install" — `node_modules` is already included

### 6. Verify
Open your domain — you should see the app running. Check:
- `https://yourdomain.com/api/health` (if you have a health endpoint)
- `https://yourdomain.com/api/auth/login` should respond

## 🔐 Optional V2 Environment Variables

Add these to `.env` to enable features (otherwise they run in mock/disabled mode):

```bash
# WhatsApp Business API
WHATSAPP_TOKEN=your-meta-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_VERIFY_TOKEN=your-webhook-verify-token

# GST e-Invoicing (NIC API)
EINVOICE_API_BASE=https://api.einvoice.gov.in
EINVOICE_USERNAME=your-username
EINVOICE_PASSWORD=your-password
EINVOICE_GSTIN=your-gstin
```

## 🆘 If something breaks

1. Check cPanel Node.js app **Stderr Log**
2. Make sure `MONGODB_URI` and `JWT_SECRET` are set in `.env`
3. Make sure Node.js version is **18.x or higher** in cPanel
4. Make sure `Application startup file` is set to `server.js`

## 📚 V2 Features Reference

See `V2_FEATURES.md` for full endpoint documentation.

## 🏗️ Repo

GitHub: https://github.com/FragileAim/azolve-backend (branch: `main`, commit: `54aa1a2`)
