# Gemini AI Chat — Fix Notes (June 2026)

## What was broken
The AI Co-Pilot's chat-bot fallback (for free-text questions that don't
match a built-in command like "create invoice") was silently failing on
every single call:

1. **Dead model name.** The code called `gemini-1.5-flash`. Google fully
   shut down all Gemini 1.0 and 1.5 models — every request returned a
   404. This was happening on every fallback chat message, regardless of
   your API key being valid.
2. **Deprecated SDK.** The npm package in use, `@google/generative-ai`,
   is Google's old/legacy SDK (officially end-of-life). The current,
   maintained package is `@google/genai`.
3. Raw error messages (`err.message`) were being shown directly to the
   end user when Gemini failed — not a great experience for a business
   user who isn't a developer.
4. Leftover debug `console.log` statements were left in the route file.

## What changed
- `backend/package.json` — swapped `@google/generative-ai` for
  `@google/genai` (current SDK).
- `backend/services/aiCopilot.js`:
  - New SDK import/init: `new GoogleGenAI({ apiKey: ... })`.
  - Model updated to `gemini-2.5-flash` (current free-tier model as of
    June 2026), configurable via a new `GEMINI_MODEL` env var if Google
    changes the lineup again.
  - Call site updated to the new SDK shape:
    `genAI.models.generateContent({ model, contents })` →
    `result.text` (no more `.getGenerativeModel()` / `.response.text()`).
  - Improved the system prompt so the fallback nudges users toward the
    exact one-command phrasing (e.g. "Create invoice for X ₹Y due in N
    days") when their free-text question sounds like it wants an action.
  - On Gemini failure, the user now sees a friendly message pointing
    them to `help` instead of a raw API error string.
- `backend/routes/copilot.js` — removed leftover debug `console.log`s.
- `backend/.env` — added a comment documenting the new optional
  `GEMINI_MODEL` override.

## Note on the older chat widget (azolve-ai.js)
There's a second, older "AI Assistant" (in `frontend/js/azolve-ai.js`)
that's purely client-side — it reads from `localStorage`, can't create
real invoices/tasks/leads, and injects its own floating button alongside
the new chat bot's button. It was **left untouched** in this pass per
your request — worth revisiting later since two floating buttons in the
same corner will be visually confusing for users.

## How to verify it after `npm install`
A quick standalone test (won't touch your DB):

```js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

(async () => {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Say "ok" and nothing else.',
  });
  console.log(result.text);
})();
```

Run with `node test.js` from the `backend` folder — it should print `ok`.
If it errors with a 404/model-not-found, check
https://ai.google.dev/gemini-api/docs/models for the current free-tier
model name and set `GEMINI_MODEL` in `.env` accordingly.

Then in the app itself: log in, open the 🤖 chat bubble, and type
something that ISN'T a built-in command — e.g. *"What's GST and do I
need to charge it?"* — that's the path that goes through Gemini.
