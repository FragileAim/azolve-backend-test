# Dashboard Customization — What Changed

## Files touched
- `frontend/app-dashboard.html` — added a "Customize Dashboard" button, a customize toolbar, a widget grid container, and wrapped the existing charts/tasks/activity sections in named containers so they can be shown/hidden.
- `frontend/js/dashboard-customizer.js` — **new file**, all the real logic.
- `frontend/js/features-expansion-2.js` — replaced the old non-functional "Dashboard Builder" page (fake drag, fake settings, fake save) with a pointer to the real, working feature on the main Dashboard.

## What actually works now (verified with an automated test, not just visually)
1. **Add Widget** — opens a picker of real metrics (Total Revenue, Pending Amount, Active Clients, Open Leads, Open Deals, Active Projects, Open Tasks, Support Tickets, Team Members, Present Today, a 6-month Revenue chart, Top Pending Invoices). Every value is computed live from the same `invoices` / `clients` / `tasks` / `tickets` / `employees` / `attendance` data the rest of the app already uses — nothing is hardcoded.
2. **Remove Widget** — actually deletes it and saves.
3. **Drag to reorder** — dragging a widget over another and dropping it actually reorders the saved widget list (this previously had `draggable="true"` with no event handlers at all).
4. **Resize** — a cycle button (small → medium → large) that changes the grid span and persists.
5. **Show/Hide sections** — a "Sections" modal lets you toggle the charts block, the tasks/clock block, and the activity feed on/off independently. Persisted per browser.
6. **Reset to default** — clears custom widgets and section choices back to the original dashboard.
7. Everything persists in `localStorage` (same mechanism the rest of the app already uses via the `DB` helper) so it survives refresh/login.

## Testing
Ran a jsdom-based functional test directly against `dashboard-customizer.js` (add/remove/duplicate-block/reorder/resize/section-toggle/reset) — all 10 checks passed against real computed data, not mocked output.

## Known limits / things to mention if asked
- Customization is stored in the browser's localStorage, same as the rest of this app's demo data — it's per-browser, not synced to the backend/MongoDB yet. If real per-user persistence across devices is needed later, this would need a small API endpoint + a `User.dashboardLayout` field.
- The old "Dashboard Builder" sidebar page now just links over to the real Dashboard with customize mode open, instead of duplicating the feature.
