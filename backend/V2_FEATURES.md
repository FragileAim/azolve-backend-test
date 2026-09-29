# Azolve V2 Features

This release integrates 10+ major features into the Azolve backend.

## ✨ New Features

| # | Feature | Endpoint Base | Description |
|---|---------|---------------|-------------|
| 1 | 🤖 AI Co-Pilot | `/api/copilot` | Chat with your business in plain English/Hindi |
| 2 | 📄 e-Invoicing (IRN + QR) | `/api/einvoice` | GST-compliant invoice signing with QR |
| 3 | ⚙️ Visual Workflow Builder | `/api/workflows` | Trigger → Condition → Action automation |
| 4 | 📉 Predictive Churn Alerts | `/api/churn` | ML-lite client risk scoring |
| 5 | 🏦 Bank Statement Auto-Import | `/api/bank-statements` | CSV/Excel parser + auto-reconciliation |
| 6 | 💬 WhatsApp Business API | `/api/whatsapp` | Official Meta Cloud API integration |
| 7 | 🔍 Universal Search (⌘K) | `/api/search` | Full-text across all entities |
| 8 | 🔌 Public API + Webhooks | `/api/v1/public`, `/api/webhooks`, `/api/api-keys` | API keys + HMAC webhooks |
| 9 | 🇮🇳 Hindi/Regional Language UI | `frontend/locales/*.json` | en, hi, mr, gu, ta, te, bn |
| 10 | 📋 Audit Log | `/api/audit-logs` | Full activity tracking |
| 11 | 🔔 Notifications | `/api/notifications` | Real-time + bell center |
| 12 | 📅 Activity Timeline | `/api/activity` | Per-entity history feed |

## 🛠 New Models

`AuditLog`, `Workflow`, `BankAccount`, `BankTransaction`, `ApiKey`, `Webhook`, `Notification`

## 🔐 Auth

All v2 routes use the existing `protect` JWT middleware. A small `normalizeUser` shim
is applied so `req.user.id` and `req.user.companyId` are always available.

## 📦 New Dependencies

- `qrcode` — e-invoice QR generation
- `node-fetch` — outbound HTTP (WhatsApp, webhooks)
- `xlsx` — bank statement parsing

## 🌐 Frontend Widgets

Drop these into any page:

```html
<link rel="stylesheet" href="/frontend/css/azolve-v2.css">
<script src="/frontend/js/azolve-i18n.js"></script>
<script src="/frontend/js/azolve-search.js"></script>
<script src="/frontend/js/azolve-copilot.js"></script>
<script src="/frontend/js/azolve-notifications.js"></script>
<script src="/frontend/js/azolve-shortcuts.js"></script>
```

Pages: `frontend/pages/audit-logs.html`, `churn-dashboard.html`, `einvoicing.html`,
`workflow-builder.html`, `bank-import.html`, `whatsapp.html`, `webhooks.html`.

## ⚙️ Environment Variables (optional)

```
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_ID=...
WHATSAPP_VERIFY_TOKEN=...
EINVOICE_API_BASE=...
EINVOICE_USERNAME=...
EINVOICE_PASSWORD=...
EINVOICE_GSTIN=...
```

If not set, e-invoice runs in **mock mode** (still produces valid signed payload + QR).
