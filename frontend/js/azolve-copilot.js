/**
 * Azolve AI Co-Pilot — Floating Chat Widget
 * Beautiful chat UI with intent-based responses, action cards, data visualizations
 */
(function () {
 'use strict';

 const API_BASE = window.AZOLVE_API_BASE || (
 (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
 ? 'http://localhost:3000/api'
 : 'https://azolve-api.onrender.com/api'
 );
 const STATE = {
 open: false,
 minimized: false,
 sessionId: localStorage.getItem('copilot_session') || ('s_' + Math.random().toString(36).slice(2)),
 messages: [],
 suggestions: [],
 typing: false,
 voiceOutput: localStorage.getItem('aria_voice_output') === '1',
 };
 localStorage.setItem('copilot_session', STATE.sessionId);

 // ============== STYLES ==============
 const css = `
 .azv-cp-fab { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #714B67 0%, #00A09D 100%); box-shadow: 0 8px 24px rgba(113,75,103,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset; cursor: pointer; z-index: 99998; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, box-shadow 0.2s; border: none; }
 .azv-cp-fab:hover { transform: scale(1.08); box-shadow: 0 12px 32px rgba(113,75,103,0.5); }
 .azv-cp-fab.hidden { display: none; }
 .azv-cp-fab svg { width: 28px; height: 28px; fill: white; }
 .azv-cp-fab::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(113,75,103,0.3); animation: azv-cp-pulse 2s ease-in-out infinite; }
 @keyframes azv-cp-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.15); opacity: 0; } }

 .azv-cp-panel { position: fixed; bottom: 24px; right: 24px; width: 480px; height: 700px; max-height: calc(100vh - 48px); background: #0f172a; border: 1px solid rgba(113,75,103,0.15); border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,0.5); display: none; flex-direction: column; z-index: 99998; overflow: hidden; animation: azv-cp-slide-up 0.25s ease-out; }
 .azv-cp-panel.open { display: flex; }
 @keyframes azv-cp-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

 .azv-cp-header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 12px; background: linear-gradient(135deg, rgba(113,75,103,0.08) 0%, rgba(255,107,53,0.04) 100%); }
 .azv-cp-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #714B67, #00A09D); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
 .azv-cp-title { flex: 1; }
 .azv-cp-title-name { font-size: 14px; font-weight: 700; color: #e0e6f0; }
 .azv-cp-title-status { font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 5px; }
 .azv-cp-title-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
 .azv-cp-actions { display: flex; gap: 4px; }
 .azv-cp-btn { width: 28px; height: 28px; border: none; background: transparent; border-radius: 6px; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; transition: background 0.1s; font-size: 14px; }
 .azv-cp-btn:hover { background: rgba(255,255,255,0.06); color: #e0e6f0; }

 .azv-cp-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
 .azv-cp-body::-webkit-scrollbar { width: 6px; }
 .azv-cp-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

 .azv-cp-msg { display: flex; gap: 10px; max-width: 90%; }
 .azv-cp-msg.user { align-self: flex-end; flex-direction: row-reverse; }
 .azv-cp-msg-avatar { width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; }
 .azv-cp-msg.user .azv-cp-msg-avatar { background: rgba(255,255,255,0.06); color: #94a3b8; }
 .azv-cp-msg.bot .azv-cp-msg-avatar { background: linear-gradient(135deg, #714B67, #00A09D); color: white; }
 .azv-cp-msg-bubble { background: rgba(255,255,255,0.04); padding: 12px 14px; border-radius: 14px; font-size: 13.5px; line-height: 1.6; color: #e0e6f0; white-space: pre-wrap; word-wrap: break-word; }
 .azv-cp-msg.user .azv-cp-msg-bubble { background: rgba(113,75,103,0.12); color: #ffd9a8; border-radius: 14px 14px 4px 14px; }
 .azv-cp-msg.bot .azv-cp-msg-bubble { border-radius: 14px 14px 14px 4px; border: 1px solid rgba(255,255,255,0.04); }
 .azv-cp-msg-bubble strong { color: #714B67; font-weight: 700; }
 .azv-cp-msg-bubble code { background: rgba(0,0,0,0.3); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
 .azv-cp-msg-bubble ul, .azv-cp-msg-bubble ol { margin: 8px 0; padding-left: 18px; }
 .azv-cp-msg-bubble li { margin: 3px 0; }
 .azv-cp-msg-bubble p { margin: 0 0 8px; }
 .azv-cp-msg-bubble p:last-child { margin-bottom: 0; }
 .azv-cp-msg-bubble h3, .azv-cp-msg-bubble h4, .azv-cp-msg-bubble h5, .azv-cp-msg-bubble h6 { margin: 10px 0 6px; color: #f1f5f9; font-weight: 700; }
 .azv-cp-msg-bubble h3 { font-size: 15px; } .azv-cp-msg-bubble h4 { font-size: 14px; } .azv-cp-msg-bubble h5, .azv-cp-msg-bubble h6 { font-size: 13px; }

 .azv-cp-code { margin: 8px 0; border-radius: 10px; overflow: hidden; background: #0a0e1a; border: 1px solid rgba(255,255,255,0.08); }
 .azv-cp-code-bar { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.04); font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; }
 .azv-cp-copy-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 5px; padding: 3px 6px; border-radius: 5px; text-transform: none; letter-spacing: 0; }
 .azv-cp-copy-btn:hover { background: rgba(255,255,255,0.08); color: #e0e6f0; }
 .azv-cp-code pre { margin: 0; padding: 12px 14px; overflow-x: auto; }
 .azv-cp-code code { background: none; padding: 0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12.5px; line-height: 1.55; color: #d1e0f0; white-space: pre; }

 /* Data card (results) */
 .azv-cp-data { margin-top: 8px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden; }
 .azv-cp-data-row { display: flex; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 12px; align-items: center; gap: 10px; }
 .azv-cp-data-row:last-child { border-bottom: none; }
 .azv-cp-data-row:hover { background: rgba(113,75,103,0.05); cursor: pointer; }
 .azv-cp-data-rank { width: 24px; height: 24px; border-radius: 50%; background: rgba(113,75,103,0.1); color: #714B67; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
 .azv-cp-data-text { flex: 1; min-width: 0; }
 .azv-cp-data-name { color: #e0e6f0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
 .azv-cp-data-sub { color: #64748b; font-size: 11px; margin-top: 2px; }
 .azv-cp-data-amount { color: #714B67; font-weight: 700; font-size: 12px; flex-shrink: 0; }
 .azv-cp-data-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
 .badge-paid { background: rgba(34,197,94,0.15); color: #4ade80; }
 .badge-pending { background: rgba(113,75,103,0.15); color: #714B67; }
 .badge-overdue { background: rgba(239,68,68,0.15); color: #f87171; }

 /* Action buttons */
 .azv-cp-actions-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
 .azv-cp-action-btn { padding: 8px 14px; background: rgba(113,75,103,0.12); border: 1px solid rgba(113,75,103,0.25); color: #714B67; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
 .azv-cp-action-btn:hover { background: rgba(113,75,103,0.2); transform: translateY(-1px); }
 .azv-cp-action-btn.primary { background: linear-gradient(135deg, #714B67, #00A09D); border-color: transparent; color: white; }

 /* Suggestions */
 .azv-cp-suggestions { padding: 0 20px 12px; display: flex; gap: 6px; flex-wrap: wrap; }
 .azv-cp-suggestion { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; border-radius: 100px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
 .azv-cp-suggestion:hover { background: rgba(113,75,103,0.08); border-color: rgba(113,75,103,0.2); color: #714B67; }

 /* Input */
 .azv-cp-input-wrap { padding: 12px 16px 16px; border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.2); }
 .azv-cp-input-row { display: flex; gap: 8px; align-items: flex-end; }
 .azv-cp-input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e0e6f0; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; font-family: inherit; resize: none; min-height: 40px; max-height: 120px; outline: none; transition: border-color 0.15s; }
 .azv-cp-input:focus { border-color: rgba(113,75,103,0.4); }
 .azv-cp-input::placeholder { color: #475569; }
 .azv-cp-send { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #714B67, #00A09D); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.1s; }
 .azv-cp-send:hover { transform: scale(1.05); }
 .azv-cp-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
 .azv-cp-send svg { width: 18px; height: 18px; }

 /* Typing indicator */
 .azv-cp-typing { display: flex; gap: 4px; align-items: center; padding: 12px 14px; }
 .azv-cp-typing-dot { width: 6px; height: 6px; border-radius: 50%; background: #714B67; animation: azv-cp-bounce 1.4s ease-in-out infinite; }
 .azv-cp-typing-dot:nth-child(2) { animation-delay: 0.16s; }
 .azv-cp-typing-dot:nth-child(3) { animation-delay: 0.32s; }
 @keyframes azv-cp-bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }

 /* Welcome state */
 .azv-cp-welcome { padding: 32px 20px; text-align: center; }
 .azv-cp-welcome-icon { font-size: 40px; margin-bottom: 16px; }
 .azv-cp-welcome-title { font-size: 18px; font-weight: 700; color: #e0e6f0; margin-bottom: 6px; background: linear-gradient(135deg, #714B67, #00A09D); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
 .azv-cp-welcome-sub { font-size: 13px; color: #64748b; line-height: 1.6; }

 /* Mobile */
 @media (max-width: 640px) {
 .azv-cp-panel { width: calc(100% - 24px); right: 12px; bottom: 12px; height: calc(100vh - 24px); max-height: none; border-radius: 16px; }
 .azv-cp-fab { right: 16px; bottom: 16px; }
 }

 /* Mic + speaker controls */
 .azv-cp-mic { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
 .azv-cp-mic:hover { color: #e0e6f0; background: rgba(255,255,255,0.1); }
 .azv-cp-mic.listening { background: linear-gradient(135deg, #ff6b6b, #ff9f43); border-color: transparent; color: #fff; animation: azv-mic-pulse 1.2s ease-in-out infinite; }
 @keyframes azv-mic-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,107,107,0.5); } 50% { box-shadow: 0 0 0 10px rgba(255,107,107,0); } }
 .azv-cp-btn.voice-on { color: #00A09D; }

 /* ================= VOICE MODE (ARIA) ================= */
 .azv-vm-overlay { position: fixed; inset: 0; background: radial-gradient(ellipse at center, #1a1030 0%, #060612 70%); z-index: 999999; display: none; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
 .azv-vm-overlay.open { display: flex; }
 .azv-vm-close { position: absolute; top: 24px; right: 24px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
 .azv-vm-close:hover { background: rgba(255,255,255,0.12); }
 .azv-vm-brand { position: absolute; top: 26px; left: 28px; color: #a78bfa; font-weight: 800; letter-spacing: 3px; font-size: 13px; text-transform: uppercase; opacity: .8; }

 .azv-vm-orb-wrap { position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; }
 .azv-vm-ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(167,139,250,0.35); }
 .azv-vm-ring.r1 { width: 100%; height: 100%; animation: azv-vm-spin 14s linear infinite; }
 .azv-vm-ring.r2 { width: 78%; height: 78%; border-color: rgba(56,189,248,0.3); animation: azv-vm-spin 10s linear infinite reverse; }
 .azv-vm-ring.r3 { width: 58%; height: 58%; border-color: rgba(255,107,53,0.25); animation: azv-vm-spin 18s linear infinite; }
 @keyframes azv-vm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

 .azv-vm-orb { width: 150px; height: 150px; border-radius: 50%; background: radial-gradient(circle at 32% 28%, #c4b5fd, #7c3aed 45%, #4c1d95 85%); box-shadow: 0 0 60px 10px rgba(124,58,237,0.55), inset 0 0 30px rgba(255,255,255,0.15); cursor: pointer; position: relative; transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; }
 .azv-vm-orb:hover { transform: scale(1.03); }
 .azv-vm-orb i { font-size: 34px; color: rgba(255,255,255,0.9); }
 .azv-vm-orb-wrap.listening .azv-vm-orb { animation: azv-vm-breathe 1.1s ease-in-out infinite; box-shadow: 0 0 90px 18px rgba(255,107,107,0.55), inset 0 0 30px rgba(255,255,255,0.2); background: radial-gradient(circle at 32% 28%, #fecaca, #ef4444 45%, #7f1d1d 85%); }
 .azv-vm-orb-wrap.speaking .azv-vm-orb { animation: azv-vm-breathe 0.7s ease-in-out infinite; box-shadow: 0 0 90px 18px rgba(56,189,248,0.55), inset 0 0 30px rgba(255,255,255,0.2); background: radial-gradient(circle at 32% 28%, #bae6fd, #0ea5e9 45%, #0c4a6e 85%); }
 .azv-vm-orb-wrap.thinking .azv-vm-orb { animation: azv-vm-spin 1.4s linear infinite; }
 @keyframes azv-vm-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.09); } }

 .azv-vm-bars { position: absolute; bottom: -34px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; align-items: flex-end; height: 22px; }
 .azv-vm-bars span { width: 3px; background: #a78bfa; border-radius: 2px; height: 6px; opacity: .5; }
 .azv-vm-orb-wrap.listening .azv-vm-bars span, .azv-vm-orb-wrap.speaking .azv-vm-bars span { opacity: 1; animation: azv-vm-bar 0.9s ease-in-out infinite; }
 .azv-vm-bars span:nth-child(1){animation-delay:0s} .azv-vm-bars span:nth-child(2){animation-delay:.1s} .azv-vm-bars span:nth-child(3){animation-delay:.2s} .azv-vm-bars span:nth-child(4){animation-delay:.3s} .azv-vm-bars span:nth-child(5){animation-delay:.4s}
 @keyframes azv-vm-bar { 0%,100% { height: 6px; } 50% { height: 22px; } }

 .azv-vm-status { margin-top: 56px; color: #cbd5e1; font-size: 13px; letter-spacing: .5px; text-transform: uppercase; opacity: .75; }
 .azv-vm-transcript { margin-top: 18px; max-width: 640px; text-align: center; color: #f1f5f9; font-size: 20px; line-height: 1.5; padding: 0 24px; min-height: 60px; }
 .azv-vm-transcript .azv-vm-user { color: #93c5fd; }
 .azv-vm-transcript .azv-vm-bot { color: #f1f5f9; }
 .azv-vm-hint { margin-top: 28px; color: #64748b; font-size: 12.5px; }
 .azv-vm-unsupported { max-width: 420px; text-align: center; color: #cbd5e1; padding: 24px; }
 `;

 const style = document.createElement('style');
 style.textContent = css;
 document.head.appendChild(style);

 // ============== MARKUP ==============
 const fab = document.createElement('button');
 fab.className = 'azv-cp-fab';
 fab.title = 'ARIA — Ask me anything, or just talk to me';
 fab.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V5h12v3z"/></svg>`;
 document.body.appendChild(fab);

 const panel = document.createElement('div');
 panel.className = 'azv-cp-panel';
 panel.innerHTML = `
 <div class="azv-cp-header">
 <div class="azv-cp-avatar"><i class="fas fa-atom"></i></div>
 <div class="azv-cp-title">
 <div class="azv-cp-title-name">ARIA</div>
 <div class="azv-cp-title-status">Online · Type or talk to me</div>
 </div>
 <div class="azv-cp-actions">
 <button class="azv-cp-btn" data-action="voice-toggle" title="Speak responses out loud"><i class="fas fa-volume-up"></i></button>
 <button class="azv-cp-btn" data-action="voice-mode" title="Open Voice Mode"><i class="fas fa-microphone-lines"></i></button>
 <button class="azv-cp-btn" data-action="clear" title="Clear conversation">↻</button>
 <button class="azv-cp-btn" data-action="close" title="Close"><i class="fas fa-xmark"></i></button>
 </div>
 </div>
 <div class="azv-cp-body"></div>
 <div class="azv-cp-suggestions"></div>
 <div class="azv-cp-input-wrap">
 <div class="azv-cp-input-row">
 <button class="azv-cp-mic" title="Talk instead of typing"><i class="fas fa-microphone"></i></button>
 <textarea class="azv-cp-input" rows="1" placeholder="Ask anything, or tap the mic to talk..."></textarea>
 <button class="azv-cp-send" title="Send (Enter)">
 <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
 </button>
 </div>
 </div>
 `;
 document.body.appendChild(panel);

 const body = panel.querySelector('.azv-cp-body');
 const sugRow = panel.querySelector('.azv-cp-suggestions');
 const input = panel.querySelector('.azv-cp-input');
 const sendBtn = panel.querySelector('.azv-cp-send');
 const micBtn = panel.querySelector('.azv-cp-mic');
 const voiceToggleBtn = panel.querySelector('[data-action=voice-toggle]');
 const voiceModeBtn = panel.querySelector('[data-action=voice-mode]');

 // ============== OPEN / CLOSE ==============
 function open() {
 STATE.open = true;
 panel.classList.add('open');
 fab.classList.add('hidden');
 setTimeout(() => input.focus(), 100);
 if (STATE.messages.length === 0) showWelcome();
 loadSuggestions();
 }
 function close() {
 STATE.open = false;
 panel.classList.remove('open');
 fab.classList.remove('hidden');
 }
 function clearChat() {
 STATE.messages = [];
 body.innerHTML = '';
 showWelcome();
 fetch(`${API_BASE}/copilot/history?sessionId=${STATE.sessionId}`, { method: 'DELETE', headers: getHeaders() }).catch(()=>{});
 }

 fab.addEventListener('click', open);
 panel.querySelector('[data-action=close]').addEventListener('click', close);
 panel.querySelector('[data-action=clear]').addEventListener('click', clearChat);

 // ============== WELCOME ==============
 function showWelcome() {
 body.innerHTML = `
 <div class="azv-cp-welcome">
 <div class="azv-cp-welcome-icon"><i class="fas fa-atom"></i></div>
 <div class="azv-cp-welcome-title">Hi, I'm ARIA</div>
 <div class="azv-cp-welcome-sub">Ask me anything about your business — revenue, clients, tasks, inventory.<br>Or tell me to <strong>do</strong> something, like "Create invoice for Acme Corp ₹15000" — one message and it's done.<br><br>Tap the mic to talk to me, or hit <i class="fas fa-microphone-lines"></i> up top for full Voice Mode.</div>
 </div>
 `;
 }

 // ============== SUGGESTIONS ==============
 async function loadSuggestions() {
 try {
 const res = await fetch(`${API_BASE}/copilot/suggestions`, { headers: getHeaders() });
 const data = await res.json();
 if (data.success) {
 STATE.suggestions = data.data.suggestions;
 renderSuggestions();
 }
 } catch (e) {
 // Fallback static suggestions
 STATE.suggestions = ['Show revenue this month', 'Top clients', 'Unpaid invoices', 'My tasks'];
 renderSuggestions();
 }
 }
 function renderSuggestions() {
 if (STATE.messages.length > 0) {
 sugRow.innerHTML = '';
 return;
 }
 sugRow.innerHTML = STATE.suggestions.map(s =>
 `<button class="azv-cp-suggestion" data-msg="${escapeHtml(s)}">${escapeHtml(s)}</button>`
 ).join('');
 sugRow.querySelectorAll('.azv-cp-suggestion').forEach(b => {
 b.addEventListener('click', () => sendMessage(b.dataset.msg));
 });
 }

 // ============== SEND MESSAGE ==============
 async function sendMessage(message) {
 message = (message || input.value).trim();
 if (!message) return;
 input.value = '';
 input.style.height = 'auto';

 // Hide welcome
 if (STATE.messages.length === 0) body.innerHTML = '';

 // Add user message
 addMessage('user', message);
 sugRow.innerHTML = '';

 // Show typing
 showTyping();

 try {
 const res = await fetch(`${API_BASE}/copilot/chat`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', ...getHeaders() },
 body: JSON.stringify({ message, sessionId: STATE.sessionId }),
 });
 const data = await res.json();
 hideTyping();

 if (data.success) {
 addMessage('bot', data.data.message, data.data);
 } else {
 addMessage('bot', ` ${data.message || 'Something went wrong'}`);
 }
 } catch (err) {
 hideTyping();
 addMessage('bot', ` Connection error. Make sure you're logged in and try again.`);
 }
 }

 // ============== RENDER MESSAGES ==============
 function addMessage(role, content, extra, skipSpeak) {
 STATE.messages.push({ role, content, extra });

 if (role === 'bot' && STATE.voiceOutput && !skipSpeak) speak(content);

 const msg = document.createElement('div');
 msg.className = `azv-cp-msg ${role}`;
 msg.innerHTML = `
 <div class="azv-cp-msg-avatar">${role === 'user' ? '<i class=\'fas fa-user\'></i>' : '<i class=\'fas fa-atom\'></i>'}</div>
 <div>
 <div class="azv-cp-msg-bubble">${formatMarkdown(content)}</div>
 ${extra && extra.data ? renderData(extra) : ''}
 ${extra && extra.actions ? renderActions(extra.actions) : ''}
 </div>
 `;
 body.appendChild(msg);
 bindCodeCopyButtons(msg);

 // Bind url-navigation buttons
 msg.querySelectorAll('.azv-cp-action-btn[data-url]').forEach(b => {
 b.addEventListener('click', e => {
 e.preventDefault();
 const url = b.dataset.url;
 if (url && url !== '#') window.location.href = url;
 });
 });

 // Bind one-click backend action buttons
 if (extra && Array.isArray(extra.actions)) {
 msg.querySelectorAll('.azv-cp-action-btn[data-call-action]').forEach(b => {
 const idx = parseInt(b.dataset.payloadIdx, 10);
 const actionDef = extra.actions[idx];
 if (!actionDef) return;
 b.addEventListener('click', () => callAction(actionDef.action, actionDef.payload || {}, b));
 });
 }

 body.scrollTop = body.scrollHeight;
 }

 function renderData(extra) {
 const t = extra.type;

 // Single-object automation results (not lists) get their own cards
 if (t === 'invoice_created' && extra.data) {
 const d = extra.data;
 return `<div class="azv-cp-data"><div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name"> ${escapeHtml(d.number || '')} · ${escapeHtml(d.client || '')}</div>
 <div class="azv-cp-data-sub">Due: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString('en-IN') : '-'}</div>
 </div>
 <div class="azv-cp-data-amount">₹${(d.amount||0).toLocaleString('en-IN')}</div>
 <span class="azv-cp-data-badge badge-pending">${escapeHtml(d.status||'draft')}</span>
 </div></div>`;
 }
 if (t === 'task_created' && extra.data) {
 const d = extra.data;
 return `<div class="azv-cp-data"><div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name"> ${escapeHtml(d.title || '')}</div>
 <div class="azv-cp-data-sub">${d.dueDate ? 'Due: ' + new Date(d.dueDate).toLocaleDateString('en-IN') : 'No deadline'}</div>
 </div>
 </div></div>`;
 }
 if (t === 'lead_created' && extra.data) {
 const d = extra.data;
 return `<div class="azv-cp-data"><div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name"> ${escapeHtml(d.name || '')}</div>
 <div class="azv-cp-data-sub">${escapeHtml(d.phone||'')}${d.phone && d.email ? ' · ' : ''}${escapeHtml(d.email||'')}</div>
 </div>
 </div></div>`;
 }

 if (!extra.data || !Array.isArray(extra.data)) return '';
 const items = extra.data.slice(0, 8);

 if (t === 'invoice_list') {
 return `<div class="azv-cp-data">${items.map(i => `
 <div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name">${escapeHtml(i.number || 'Invoice')} · ${escapeHtml(i.client || '')}</div>
 <div class="azv-cp-data-sub">Due: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-IN') : 'No date'}</div>
 </div>
 <div class="azv-cp-data-amount">₹${(i.amount||0).toLocaleString('en-IN')}</div>
 <span class="azv-cp-data-badge badge-${i.status}">${i.status}</span>
 </div>
 `).join('')}</div>`;
 }

 if (t === 'client_list') {
 return `<div class="azv-cp-data">${items.map(c => `
 <div class="azv-cp-data-row">
 <div class="azv-cp-data-rank">${c.rank}</div>
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name">${escapeHtml(c.name)}</div>
 <div class="azv-cp-data-sub">${c.invoices} invoices</div>
 </div>
 <div class="azv-cp-data-amount">₹${(c.revenue||0).toLocaleString('en-IN')}</div>
 </div>
 `).join('')}</div>`;
 }

 if (t === 'task_list') {
 return `<div class="azv-cp-data">${items.map(t => `
 <div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name">${escapeHtml(t.title)}</div>
 <div class="azv-cp-data-sub">${t.dueDate ? 'Due: ' + new Date(t.dueDate).toLocaleDateString('en-IN') : 'No deadline'}</div>
 </div>
 <span class="azv-cp-data-badge badge-pending">${t.status||'todo'}</span>
 </div>
 `).join('')}</div>`;
 }

 if (t === 'inventory_alert') {
 return `<div class="azv-cp-data">${items.map(p => `
 <div class="azv-cp-data-row">
 <div class="azv-cp-data-text">
 <div class="azv-cp-data-name">${escapeHtml(p.name)}</div>
 <div class="azv-cp-data-sub">SKU: ${escapeHtml(p.sku||'-')}</div>
 </div>
 <div class="azv-cp-data-amount" style="color:#f87171">${p.stock} left</div>
 </div>
 `).join('')}</div>`;
 }

 return '';
 }

 function renderActions(actions) {
 return `<div class="azv-cp-actions-row">${actions.map((a, idx) => {
 if (a.action) {
 return `<button type="button" class="azv-cp-action-btn ${a.primary?'primary':''}" data-call-action="${escapeHtml(a.action)}" data-payload-idx="${idx}">${escapeHtml(a.label)}</button>`;
 }
 return `<a href="${escapeHtml(a.url||'#')}" class="azv-cp-action-btn ${a.primary?'primary':''}" data-url="${escapeHtml(a.url||'')}">${escapeHtml(a.label)}</a>`;
 }).join('')}</div>`;
 }

 // Execute a one-click action button (create/confirm/send/etc.) by calling
 // the backend directly — no page navigation, no manual form filling.
 async function callAction(actionName, payload, btnEl) {
 btnEl.disabled = true;
 const originalLabel = btnEl.textContent;
 btnEl.textContent = '⏳ Working...';
 showTyping();
 try {
 const res = await fetch(`${API_BASE}/copilot/action`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', ...getHeaders() },
 body: JSON.stringify({ action: actionName, payload, sessionId: STATE.sessionId }),
 });
 const data = await res.json();
 hideTyping();
 if (data.success) {
 addMessage('bot', data.data.message, data.data);
 } else {
 addMessage('bot', ` ${data.message || 'Action failed'}`);
 }
 } catch (err) {
 hideTyping();
 addMessage('bot', ` Connection error while running that action.`);
 } finally {
 btnEl.disabled = false;
 btnEl.textContent = originalLabel;
 }
 }

 // ============== TYPING ==============
 let typingEl = null;
 function showTyping() {
 typingEl = document.createElement('div');
 typingEl.className = 'azv-cp-msg bot';
 typingEl.innerHTML = `
 <div class="azv-cp-msg-avatar"><i class="fas fa-robot"></i></div>
 <div class="azv-cp-msg-bubble" style="padding:0">
 <div class="azv-cp-typing">
 <span class="azv-cp-typing-dot"></span>
 <span class="azv-cp-typing-dot"></span>
 <span class="azv-cp-typing-dot"></span>
 </div>
 </div>
 `;
 body.appendChild(typingEl);
 body.scrollTop = body.scrollHeight;
 }
 function hideTyping() {
 if (typingEl) typingEl.remove();
 typingEl = null;
 }

 // ============== INPUT ==============
 input.addEventListener('keydown', e => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 sendMessage();
 }
 });
 input.addEventListener('input', () => {
 input.style.height = 'auto';
 input.style.height = Math.min(120, input.scrollHeight) + 'px';
 });
 sendBtn.addEventListener('click', () => sendMessage());

 // ============== HELPERS ==============
 function getHeaders() {
 const token = localStorage.getItem('azolve_token') || localStorage.getItem('token');
 return token ? { 'Authorization': `Bearer ${token}` } : {};
 }
 function escapeHtml(s) {
 return String(s||'').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
 }

 // Stores raw code text for copy-to-clipboard buttons, keyed by index.
 const codeBlockStore = [];

 function formatInline(s) {
 return escapeHtml(s)
 .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
 .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
 .replace(/`([^`]+?)`/g, '<code>$1</code>');
 }

 function formatMarkdown(raw) {
 const text = String(raw || '');

 // 1) Pull out fenced code blocks first so nothing inside them gets touched.
 const blocks = [];
 const withPlaceholders = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (m, lang, code) => {
 const idx = codeBlockStore.length;
 codeBlockStore.push(code.replace(/\n$/, ''));
 blocks.push({ idx, lang: (lang || '').trim(), code: code.replace(/\n$/, '') });
 return `\u0000CODEBLOCK${blocks.length - 1}\u0000`;
 });

 // 2) Process the remaining text line-by-line for headings/lists/paragraphs.
 const lines = withPlaceholders.split('\n');
 let html = '';
 let listType = null; // 'ul' | 'ol' | null
 let para = [];

 function flushPara() {
 if (para.length) { html += `<p>${para.join(' ')}</p>`; para = []; }
 }
 function closeList() {
 if (listType) { html += `</${listType}>`; listType = null; }
 }

 lines.forEach(line => {
 const trimmed = line.trim();
 if (!trimmed) { flushPara(); closeList(); return; }

 const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
 if (heading) {
 flushPara(); closeList();
 const level = Math.min(4, heading[1].length) + 2; // h3..h6, fits chat bubble
 html += `<h${level}>${formatInline(heading[2])}</h${level}>`;
 return;
 }

 const bullet = trimmed.match(/^[-*]\s+(.*)$/);
 if (bullet) {
 flushPara();
 if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
 html += `<li>${formatInline(bullet[1])}</li>`;
 return;
 }

 const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
 if (numbered) {
 flushPara();
 if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
 html += `<li>${formatInline(numbered[1])}</li>`;
 return;
 }

 if (/^\u0000CODEBLOCK\d+\u0000$/.test(trimmed)) {
 flushPara(); closeList();
 html += trimmed;
 return;
 }

 closeList();
 para.push(formatInline(trimmed));
 });
 flushPara(); closeList();

 // 3) Re-insert code blocks as proper <pre><code> with a copy button.
 blocks.forEach(b => {
 const html_block = `<div class="azv-cp-code"><div class="azv-cp-code-bar"><span>${escapeHtml(b.lang || 'code')}</span><button class="azv-cp-copy-btn" data-code-idx="${b.idx}"><i class="fas fa-copy"></i> Copy</button></div><pre><code>${escapeHtml(b.code)}</code></pre></div>`;
 html = html.replace(`\u0000CODEBLOCK${blocks.indexOf(b)}\u0000`, html_block);
 });

 return html;
 }

 function bindCodeCopyButtons(container) {
 container.querySelectorAll('.azv-cp-copy-btn').forEach(btn => {
 btn.addEventListener('click', () => {
 const code = codeBlockStore[parseInt(btn.dataset.codeIdx, 10)] || '';
 navigator.clipboard?.writeText(code).then(() => {
 const original = btn.innerHTML;
 btn.innerHTML = '<i class="fas fa-check"></i> Copied';
 setTimeout(() => { btn.innerHTML = original; }, 1500);
 }).catch(() => {});
 });
 });
 }

 // ============== VOICE ENGINE (speech-to-text + text-to-speech) ==============
 const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
 const supportsSTT = !!SpeechRecognitionCtor;
 const supportsTTS = 'speechSynthesis' in window;

 let recognition = null;
 let isListening = false;
 let preferredVoice = null;

 if (supportsTTS) {
 const pickVoice = () => {
 const voices = window.speechSynthesis.getVoices();
 preferredVoice = voices.find(v => /en-US|en-GB/i.test(v.lang) && /Google|Natural|Neural/i.test(v.name))
 || voices.find(v => /^en/i.test(v.lang))
 || voices[0] || null;
 };
 pickVoice();
 window.speechSynthesis.onvoiceschanged = pickVoice;
 }

 function stripForSpeech(text) {
 return String(text || '')
 .replace(/\*\*(.+?)\*\*/g, '$1')
 .replace(/\*(.+?)\*/g, '$1')
 .replace(/`(.+?)`/g, '$1')
 .replace(/[#>_~]/g, '')
 .replace(/https?:\/\/\S+/g, 'a link')
 .trim();
 }

 function speak(text, onEnd) {
 if (!supportsTTS || !text) { if (onEnd) onEnd(); return; }
 window.speechSynthesis.cancel();
 const utter = new SpeechSynthesisUtterance(stripForSpeech(text));
 if (preferredVoice) utter.voice = preferredVoice;
 utter.rate = 1.02;
 utter.pitch = 1;
 if (onEnd) utter.onend = onEnd;
 if (onEnd) utter.onerror = onEnd;
 window.speechSynthesis.speak(utter);
 }
 function stopSpeaking() {
 if (supportsTTS) window.speechSynthesis.cancel();
 }

 function initRecognition(onFinal, onInterim, onEnd) {
 if (!supportsSTT) return null;
 const rec = new SpeechRecognitionCtor();
 rec.continuous = false;
 rec.interimResults = true;
 rec.lang = navigator.language || 'en-US';
 rec.onresult = (e) => {
 let finalText = '', interim = '';
 for (let i = e.resultIndex; i < e.results.length; i++) {
 const t = e.results[i][0].transcript;
 if (e.results[i].isFinal) finalText += t; else interim += t;
 }
 if (interim && onInterim) onInterim(interim);
 if (finalText && onFinal) onFinal(finalText.trim());
 };
 rec.onend = () => { if (onEnd) onEnd(); };
 rec.onerror = () => { if (onEnd) onEnd(); };
 return rec;
 }

 // ---- Mic button inside the normal text panel ----
 function setMicListening(on) {
 isListening = on;
 micBtn.classList.toggle('listening', on);
 micBtn.innerHTML = on ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-microphone"></i>';
 }
 if (supportsSTT) {
 micBtn.addEventListener('click', () => {
 if (isListening) { recognition && recognition.stop(); return; }
 recognition = initRecognition(
 (finalText) => { input.value = finalText; sendMessage(finalText); },
 (interim) => { input.value = interim; },
 () => setMicListening(false)
 );
 setMicListening(true);
 try { recognition.start(); } catch (e) { setMicListening(false); }
 });
 } else {
 micBtn.disabled = true;
 micBtn.title = 'Voice input needs Chrome or Edge';
 micBtn.style.opacity = '0.4';
 }

 // ---- Speaker toggle (auto-read bot replies in the normal panel) ----
 function refreshVoiceToggleUI() {
 voiceToggleBtn.classList.toggle('voice-on', STATE.voiceOutput);
 voiceToggleBtn.title = STATE.voiceOutput ? 'Voice replies: ON (click to mute)' : 'Speak responses out loud';
 }
 refreshVoiceToggleUI();
 voiceToggleBtn.addEventListener('click', () => {
 STATE.voiceOutput = !STATE.voiceOutput;
 localStorage.setItem('aria_voice_output', STATE.voiceOutput ? '1' : '0');
 if (!STATE.voiceOutput) stopSpeaking();
 refreshVoiceToggleUI();
 });
 if (!supportsTTS) { voiceToggleBtn.disabled = true; voiceToggleBtn.style.opacity = '0.4'; voiceToggleBtn.title = 'Voice output not supported in this browser'; }

 // ================= VOICE MODE (full-screen ARIA orb) =================
 const vmOverlay = document.createElement('div');
 vmOverlay.className = 'azv-vm-overlay';
 vmOverlay.innerHTML = supportsSTT ? `
 <div class="azv-vm-brand">A R I A</div>
 <button class="azv-vm-close" title="Exit Voice Mode"><i class="fas fa-xmark"></i></button>
 <div class="azv-vm-orb-wrap" id="azvVmOrbWrap">
 <div class="azv-vm-ring r1"></div>
 <div class="azv-vm-ring r2"></div>
 <div class="azv-vm-ring r3"></div>
 <div class="azv-vm-orb" id="azvVmOrb"><i class="fas fa-microphone"></i></div>
 <div class="azv-vm-bars"><span></span><span></span><span></span><span></span><span></span></div>
 </div>
 <div class="azv-vm-status" id="azvVmStatus">Tap the orb and start talking</div>
 <div class="azv-vm-transcript" id="azvVmTranscript"></div>
 <div class="azv-vm-hint">Voice replies stay on while Voice Mode is open</div>
 ` : `
 <button class="azv-vm-close" title="Close"><i class="fas fa-xmark"></i></button>
 <div class="azv-vm-unsupported">
 <div style="font-size:34px;margin-bottom:14px;"><i class="fas fa-microphone-slash"></i></div>
 <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#f1f5f9;">Voice Mode needs Chrome or Edge</div>
 <div>Your current browser doesn't support speech recognition. You can still type in the regular chat.</div>
 </div>
 `;
 document.body.appendChild(vmOverlay);

 let vmRecognition = null;
 let vmActive = false;

 function vmSetState(state) {
 // state: 'idle' | 'listening' | 'thinking' | 'speaking'
 const wrap = document.getElementById('azvVmOrbWrap');
 if (!wrap) return;
 wrap.classList.remove('listening', 'thinking', 'speaking');
 if (state !== 'idle') wrap.classList.add(state);
 const statusEl = document.getElementById('azvVmStatus');
 if (statusEl) {
 statusEl.textContent = {
 idle: 'Tap the orb and start talking',
 listening: 'Listening…',
 thinking: 'Thinking…',
 speaking: 'Speaking…',
 }[state] || '';
 }
 }

 function vmSetTranscript(html) {
 const t = document.getElementById('azvVmTranscript');
 if (t) t.innerHTML = html;
 }

 async function vmSendMessage(message) {
 vmSetTranscript(`<span class="azv-vm-user">"${escapeHtml(message)}"</span>`);
 vmSetState('thinking');
 addMessage('user', message);
 try {
 const res = await fetch(`${API_BASE}/copilot/chat`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json', ...getHeaders() },
 body: JSON.stringify({ message, sessionId: STATE.sessionId }),
 });
 const data = await res.json();
 const replyText = data.success ? data.data.message : (data.message || 'Something went wrong.');
 if (data.success) addMessage('bot', data.data.message, data.data, true); else addMessage('bot', ` ${replyText}`, null, true);
 vmSetTranscript(`<span class="azv-vm-bot">${formatMarkdown(replyText)}</span>`);
 vmSetState('speaking');
 speak(replyText, () => { if (vmActive) vmSetState('idle'); });
 } catch (err) {
 const errText = "Connection error — I couldn't reach the server.";
 vmSetTranscript(`<span class="azv-vm-bot">${escapeHtml(errText)}</span>`);
 addMessage('bot', ` ${errText}`, null, true);
 vmSetState('speaking');
 speak(errText, () => { if (vmActive) vmSetState('idle'); });
 }
 }

 function vmStartListening() {
 if (!supportsSTT) return;
 stopSpeaking();
 vmSetState('listening');
 vmSetTranscript('');
 vmRecognition = initRecognition(
 (finalText) => { vmSendMessage(finalText); },
 (interim) => { vmSetTranscript(`<span class="azv-vm-user">"${escapeHtml(interim)}"</span>`); },
 () => { if (vmActive) { const wrap = document.getElementById('azvVmOrbWrap'); if (wrap && wrap.classList.contains('listening')) vmSetState('idle'); } }
 );
 try { vmRecognition.start(); } catch (e) { vmSetState('idle'); }
 }

 function openVoiceMode() {
 vmActive = true;
 vmOverlay.classList.add('open');
 vmSetState('idle');
 vmSetTranscript('');
 const orb = document.getElementById('azvVmOrb');
 if (orb) orb.onclick = () => {
 const wrap = document.getElementById('azvVmOrbWrap');
 if (wrap && wrap.classList.contains('listening')) { vmRecognition && vmRecognition.stop(); vmSetState('idle'); }
 else { vmStartListening(); }
 };
 }
 function closeVoiceMode() {
 vmActive = false;
 vmOverlay.classList.remove('open');
 vmRecognition && vmRecognition.stop();
 stopSpeaking();
 }
 vmOverlay.querySelector('.azv-vm-close').addEventListener('click', closeVoiceMode);
 voiceModeBtn.addEventListener('click', openVoiceMode);

 // ============== EXPOSE ==============
 window.AzolveCopilot = { open, close, clear: clearChat, send: sendMessage };

 console.log(' Azolve AI Co-Pilot loaded');
})();
