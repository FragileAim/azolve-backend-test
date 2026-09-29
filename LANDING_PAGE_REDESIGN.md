# Premium Landing Page Redesign — Changelog (June 2026)

## What this covers
A full redesign of the public marketing site (9 pages), replacing the old
single-page `index.html`/`landing.html`. The app itself (CRM, invoicing,
HRM, AI Copilot, backend, database) was **not touched** — this is the
public-facing site only.

## Brand decision
Kept the real Azolve brand — plum `#714B67` and teal `#00A09D`, taken from
the actual logo files in `assets/`. Did not switch to the alternate
purple-blue palette that was proposed, since that would have put the
marketing site out of sync with the logo, the dashboard, and invoices.

## Stack decision
Stayed in plain HTML/CSS/JS to match the existing Node/Express backend and
the rest of the frontend — no React/Next.js rebuild. Pages are static
files served by the existing Express static middleware
(`backend/app.js`), so nothing about deployment changes.

## Pages built (9, all new)
- `index.html` — Home, with an interactive "app switcher" hero panel
  (CRM / Invoicing / HRM / AI Copilot / WhatsApp tabs) and live stat
  counters
- `products.html` — Products hub: all real modules (CRM, Invoicing, HRM,
  AI Copilot, Finance, WhatsApp, Projects, POS, Bank Import, Workflow
  Builder, Webhooks, Audit Logs, Churn Dashboard, e-Invoicing), plus a
  callout for the built-in Office suite (Word/Excel/PowerPoint) and the
  17 real industries from the signup form
- `product-crm.html`, `product-invoicing.html`, `product-hrm.html`,
  `product-ai.html` — dedicated pages for the four core modules
- `pricing.html` — pulls live plan data from `GET /api/payments/plans`
  (Starter ₹999/mo, Professional ₹2,499/mo, Enterprise ₹4,999/mo, POS
  add-on ₹799/mo), with a static fallback matching
  `backend/routes/payments.js` exactly if the API call fails. Monthly/
  yearly toggle, FAQ accordion.
- `about.html` — honest company copy; no invented founding date, team
  photos, or history not already on file
- `contact.html` — same real contact details and `mailto:` form logic as
  the original `contact.html` (connect@azolve.io, Mon–Sat 9–6 IST,
  "address available on request"), redesigned

## Shared infrastructure (new)
- `css/marketing.css` — design system: color tokens, glass nav, mega-menu,
  buttons, cards, CTA bands, scroll-reveal/count-up utilities
- `js/site-chrome.js` — shared nav (with Products mega-menu) + footer,
  injected into every page so all 9 stay in sync from one source
- `js/motion.js` — scroll-reveal (IntersectionObserver) and animated
  count-up for stats, shared across pages

## Real data used (nothing invented)
- Pricing: live from `backend/routes/payments.js` PLANS object
- CRM stages: from `backend/models/Lead.js` / `Deal.js` enums
- HRM: attendance statuses and leave types from `backend/models/
  Attendance.js` / `Leave.js`
- Invoicing: GST/UPI/payment methods from `backend/models/Invoice.js`
- AI Copilot example commands: from the real intent list in
  `backend/services/aiCopilot.js` (unpaid invoices, top clients, revenue
  summary, employee stats, create invoice/task/lead, etc.)
- Industries list: the same 17 industries from the registration form
- Company/contact info: unchanged from the original `contact.html`

## Things intentionally left out of this round
- Blog, Careers, Docs, Help Center, comparison tables vs competitors —
  these need real content we don't have yet; skipped rather than faked
- Per-industry landing pages (Healthcare, Retail, etc.) — out of scope
  for this round, can be added later using the same shared CSS/JS
- The old `azolve-ai.js` floating assistant widget on the in-app
  dashboard pages — untouched, as requested

## Known limitation worth knowing about
The Pricing page's live fetch (`/api/payments/plans`) only succeeds when
the page is served by the actual backend (which is how it works in
production — `backend/app.js` serves the frontend statically). If you
open the HTML file directly without the backend running, it falls back to
the static numbers, which are kept in sync with the backend by hand —
worth checking `backend/routes/payments.js` if those numbers ever change.
