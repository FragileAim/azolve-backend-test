# Task 4 — AI Chatbot: Full Automation (Invoice Creation & More)

## What existed before
The Azolve AI Co-Pilot widget (`frontend/js/azolve-copilot.js` +
`backend/services/aiCopilot.js` + `backend/routes/copilot.js`) could only
**answer questions** (revenue, unpaid invoices, top clients, etc.) using
regex-based intent detection. The "create invoice" intent just linked to a
manual form — it never actually created anything.

There was also a hidden bug: the chat route built `ctx = { company: ... }`
but every handler read `ctx.companyId` — so company-scoped queries were
silently broken. Fixed as part of this task.

## What's new

### 1. Real one-command automation
Typing a single message now performs the action directly in the database —
no forms, no extra clicks:

- `"Create invoice for Acme Corp ₹15000 due in 7 days"` → finds/creates the
  client, generates the invoice number, saves a real Invoice document.
- `"Bill Rahul Traders 5000 net 30"` → same, with a 30-day due date.
- `"Remind me to call the vendor tomorrow"` → creates a Task.
- `"Add lead Priya Shah, 9876543210, priya@mail.com"` → creates a Lead.

### 2. One-click follow-up actions on chat cards
After an action runs, the chat shows result cards with buttons that call
the backend directly (no page navigation):
- **Email to Client** — sends the invoice email immediately.
- **Send Reminders to All** — bulk-emails everyone with an unpaid invoice.
- Client disambiguation — if more than one client matches a name, the bot
  shows buttons to pick the right one instead of guessing with money.

### 3. New backend pieces
- `POST /api/copilot/action` — single endpoint that executes any one-click
  action (`confirm_invoice`, `send_invoice`, `send_reminders`, …).
- `executeAction()` in `aiCopilot.js` — the action dispatcher used by that
  route.
- `handleCreateInvoice`, `handleCreateTask`, `handleCreateLead` — new
  automation handlers with light NLP parsing (amount, due date, client/lead
  name, phone, email).
- Permission check: invoice creation respects `user.permissions.canCreateInvoices`
  (same rule the manual invoice form already used).

### 4. Files touched
- `backend/services/aiCopilot.js` — automation handlers + action executor + bug fix.
- `backend/routes/copilot.js` — `ctx.companyId` fix + new `/action` route.
- `frontend/js/azolve-copilot.js` — chat widget can now render and execute
  one-click action buttons, plus new result cards for created
  invoices/tasks/leads.

## Try it
1. Log in, open the chat bubble (bottom-right).
2. Type: `Create invoice for Test Client ₹5000 due in 5 days`
3. The invoice is created instantly; click **Email to Client** to send it.
