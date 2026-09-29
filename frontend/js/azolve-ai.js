/**
 * ========================================
 * AZOLVE AI - KILLER FEATURES MODULE
 * ========================================
 * Adds: AI Assistant, Voice Commands, Health Score,
 * Smart Predictions, WhatsApp Send, Receipt Scanner
 * ========================================
 */

(function() {
 'use strict';

 const API_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
 ? 'http://localhost:3000/api'
 : 'https://azolve-api.onrender.com/api';

 // ============================================================
 // UTILITY HELPERS
 // ============================================================
 function getDB() {
 return {
 get(key, def=[]){ try{return JSON.parse(localStorage.getItem('azolve_'+key))||def}catch(e){return def} },
 getObj(key, def={}){ try{return JSON.parse(localStorage.getItem('azolve_'+key))||def}catch(e){return def} },
 set(key, val){ localStorage.setItem('azolve_'+key, JSON.stringify(val)) }
 };
 }

 const DB = getDB();

 function fmtCurrency(n) {
 const c = DB.getObj('company');
 const sym = {USD:'$',EUR:'€',GBP:'£',INR:'₹',AUD:'A$',CAD:'C$'}[c.currency||'INR']||'₹';
 return sym + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 }

 // ============================================================
 // AI BUSINESS ASSISTANT
 // ============================================================
 const AIAssistant = {
 history: [],

 open() {
 let modal = document.getElementById('aiAssistantModal');
 if (!modal) {
 modal = this.createModal();
 document.body.appendChild(modal);
 }
 modal.style.display = 'flex';
 setTimeout(() => document.getElementById('aiInput')?.focus(), 100);
 },

 close() {
 const modal = document.getElementById('aiAssistantModal');
 if (modal) modal.style.display = 'none';
 },

 createModal() {
 const modal = document.createElement('div');
 modal.id = 'aiAssistantModal';
 modal.className = 'ai-modal-overlay';
 modal.innerHTML = `
 <div class="ai-modal">
 <div class="ai-header">
 <div class="ai-avatar"><i class="fas fa-robot"></i></div>
 <div class="ai-header-info">
 <div class="ai-title">Azolve AI Assistant</div>
 <div class="ai-status"><span class="ai-dot"></span>Ready to help</div>
 </div>
 <button class="ai-close" onclick="AzolveAI.assistant.close()"><i class="fas fa-xmark"></i></button>
 </div>
 <div class="ai-messages" id="aiMessages">
 <div class="ai-msg ai-msg-bot">
 <div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>
 <div class="ai-msg-bubble">Hi! I'm your business assistant. Ask me anything in plain English!<br><br>
 <div class="ai-suggestions">
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('How much did I earn this month?')"><i class="fas fa-sack-dollar"></i>Earnings this month</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('Show me unpaid invoices')"><i class="fas fa-file-invoice"></i>Unpaid invoices</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('Which client owes me the most?')"><i class="fas fa-user-clock"></i>Top debtor</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('Show top 5 clients by revenue')"><i class="fas fa-trophy"></i>Top clients</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('What is my total revenue this year?')"><i class="fas fa-chart-column"></i>Yearly revenue</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('How many invoices did I create this week?')"><i class="fas fa-calendar-week"></i>Weekly activity</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('help')"><i class="fas fa-sparkles"></i>Summarize / draft email</button>
 </div>
 </div>
 </div>
 </div>
 <div class="ai-input-box">
 <button class="ai-voice-btn" onclick="AzolveAI.voice.start()" title="Voice input"><i class="fas fa-microphone"></i></button>
 <input type="text" id="aiInput" placeholder="Ask anything about your business..." autocomplete="off">
 <button class="ai-send-btn" onclick="AzolveAI.assistant.send()"><i class="fas fa-paper-plane"></i></button>
 </div>
 </div>
 `;

 // Handle Enter key
 setTimeout(() => {
 const input = modal.querySelector('#aiInput');
 if (input) {
 input.addEventListener('keypress', (e) => {
 if (e.key === 'Enter') this.send();
 });
 }
 }, 100);

 return modal;
 },

 send() {
 const input = document.getElementById('aiInput');
 if (!input) return;
 const text = input.value.trim();
 if (!text) return;
 input.value = '';
 this.ask(text);
 },

 ask(question) {
 this.addMessage(question, 'user');
 setTimeout(() => {
 const answer = this.processQuery(question);
 this.addMessage(answer, 'bot');
 }, 400);
 },

 addMessage(text, type) {
 const msgs = document.getElementById('aiMessages');
 if (!msgs) return;
 const msg = document.createElement('div');
 msg.className = `ai-msg ai-msg-${type}`;
 msg.innerHTML = type === 'user'
 ? `<div class="ai-msg-bubble ai-user-bubble">${this.escape(text)}</div><div class="ai-msg-avatar"><i class="fas fa-user"></i></div>`
 : `<div class="ai-msg-avatar"><i class="fas fa-robot"></i></div><div class="ai-msg-bubble">${text}</div>`;
 msgs.appendChild(msg);
 msgs.scrollTop = msgs.scrollHeight;
 },

 escape(s) {
 return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
 },

 // Query processor - understands plain English
 processQuery(q) {
 const query = q.toLowerCase();
 const invoices = DB.get('invoices', []);
 const clients = DB.get('clients', []);
 const products = DB.get('products', []);
 const transactions = DB.get('pos_transactions', []);

 // Time helpers
 const now = new Date();
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
 const yearStart = new Date(now.getFullYear(), 0, 1);
 const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
 const lastMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
 const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

 // === EARNING/REVENUE QUERIES ===
 if (/earn|revenue|income|sales|total/.test(query)) {
 let period = 'all time';
 let filtered = invoices.filter(i => i.status === 'paid');

 if (/this month|current month/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate) >= monthStart);
 period = 'this month';
 } else if (/last month/.test(query)) {
 filtered = filtered.filter(i => {
 const d = new Date(i.date || i.issueDate);
 return d >= lastMonthStart && d <= lastMonthEnd;
 });
 period = 'last month';
 } else if (/this year|year/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate) >= yearStart);
 period = 'this year';
 } else if (/this week|week/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate) >= weekStart);
 period = 'this week';
 } else if (/today/.test(query)) {
 const today = now.toISOString().split('T')[0];
 filtered = filtered.filter(i => (i.date || i.issueDate || '').startsWith(today));
 period = 'today';
 }

 const total = filtered.reduce((s, i) => s + (i.total || 0), 0);
 const posTotal = transactions
 .filter(t => {
 if(period === 'all time') return true;
 const d = new Date(t.date);
 if(period === 'this month') return d >= monthStart;
 if(period === 'last month') return d >= lastMonthStart && d <= lastMonthEnd;
 if(period === 'this year') return d >= yearStart;
 if(period === 'this week') return d >= weekStart;
 if(period === 'today') return d.toDateString() === now.toDateString();
 return true;
 })
 .reduce((s, t) => s + (t.total || 0), 0);

 const grandTotal = total + posTotal;

 return `<strong>Total Revenue ${period}:</strong><br>
 <div class="ai-stat-big">${fmtCurrency(grandTotal)}</div>
 <div class="ai-stat-breakdown">From Invoices: ${fmtCurrency(total)} (${filtered.length} paid)<br>From POS Sales: ${fmtCurrency(posTotal)} (${transactions.length} txns)
 </div>`;
 }

 // === UNPAID / PENDING INVOICES ===
 if (/unpaid|pending|overdue|owe|due/.test(query)) {
 const unpaid = invoices.filter(i => i.status !== 'paid');
 if (unpaid.length === 0) {
 return ` Great news! You have <strong>no pending invoices</strong>. Everything is paid up!`;
 }
 const totalDue = unpaid.reduce((s, i) => s + (i.total || 0), 0);
 const list = unpaid.slice(0, 5).map(i =>
 `<div class="ai-list-item">
 <strong>${i.invoiceNumber || i.number || 'INV'}</strong> - ${i.clientName || i.client || 'Client'}
 <span class="ai-badge ai-badge-${i.status||'pending'}">${i.status||'pending'}</span>
 <span class="ai-amount">${fmtCurrency(i.total)}</span>
 </div>`
 ).join('');
 return `<strong>You have ${unpaid.length} unpaid invoice${unpaid.length>1?'s':''}</strong><br>
 <div class="ai-stat-big">${fmtCurrency(totalDue)}</div>
 <div class="ai-stat-breakdown">Pending to collect</div>
 <div class="ai-list">${list}</div>
 ${unpaid.length > 5 ? `<div class="ai-more">+${unpaid.length-5} more...</div>` : ''}`;
 }

 // === TOP DEBTOR / CLIENT WHO OWES MOST ===
 if (/top debtor|owes me the most|biggest outstand|biggest pending/.test(query)) {
 const unpaid = invoices.filter(i => i.status !== 'paid');
 if (unpaid.length === 0) return `All invoices are paid. No outstanding dues! `;
 const debtMap = {};
 unpaid.forEach(i => {
 const name = i.clientName || i.client || 'Unknown';
 debtMap[name] = (debtMap[name] || 0) + (i.total || 0);
 });
 const sorted = Object.entries(debtMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
 const list = sorted.map(([name, amt], i) =>
 `<div class="ai-list-item">
 <span class="ai-rank">#${i+1}</span>
 <strong>${name}</strong>
 <span class="ai-amount ai-amount-red">${fmtCurrency(amt)}</span>
 </div>`
 ).join('');
 return `<strong><i class="fas fa-user-clock"></i>Top Debtors:</strong><br>
 <div class="ai-stat-big">${sorted[0][0]}</div>
 <div class="ai-stat-breakdown">owes you ${fmtCurrency(sorted[0][1])}</div>
 <div class="ai-list">${list}</div>`;
 }

 // === TOP CLIENTS BY REVENUE ===
 if (/top client|best client|biggest client|top customer/.test(query)) {
 const paid = invoices.filter(i => i.status === 'paid');
 if (paid.length === 0) return `No paid invoices yet. Start creating invoices to see top clients!`;
 const revMap = {};
 paid.forEach(i => {
 const name = i.clientName || i.client || 'Unknown';
 revMap[name] = (revMap[name] || 0) + (i.total || 0);
 });
 const sorted = Object.entries(revMap).sort((a,b) => b[1]-a[1]).slice(0, 5);
 const list = sorted.map(([name, amt], i) =>
 `<div class="ai-list-item">
 <span class="ai-rank">#${i+1}</span>
 <strong>${name}</strong>
 <span class="ai-amount ai-amount-green">${fmtCurrency(amt)}</span>
 </div>`
 ).join('');
 return `<strong>Top 5 Clients by Revenue:</strong><div class="ai-list">${list}</div>`;
 }

 // === HOW MANY INVOICES ===
 if (/how many invoice|invoice count|number of invoice/.test(query)) {
 let filtered = invoices;
 let period = 'total';
 if (/this week|week/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate) >= weekStart);
 period = 'this week';
 } else if (/this month|month/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate) >= monthStart);
 period = 'this month';
 } else if (/today/.test(query)) {
 filtered = filtered.filter(i => new Date(i.date || i.issueDate).toDateString() === now.toDateString());
 period = 'today';
 }
 return `<strong>Invoice Activity (${period}):</strong>
 <div class="ai-stat-big">${filtered.length}</div>
 <div class="ai-stat-breakdown">Paid: ${filtered.filter(i=>i.status==='paid').length}<br>
 ⏳ Pending: ${filtered.filter(i=>i.status!=='paid').length}
 </div>`;
 }

 // === CLIENT COUNT ===
 if (/how many client|total client|client count/.test(query)) {
 return `<strong>You have ${clients.length} clients</strong> in your database.`;
 }

 // === PRODUCTS ===
 if (/how many product|product count|stock/.test(query)) {
 const low = products.filter(p => (p.stock||0) < 10).length;
 return `<strong>Product Inventory:</strong>
 <div class="ai-stat-big">${products.length}</div>
 <div class="ai-stat-breakdown">
 ${low > 0 ? ` ${low} product(s) running low (< 10 units)` : ' All stock healthy'}
 </div>`;
 }

 // === BUSINESS HEALTH ===
 if (/health|how am i doing|business doing/.test(query)) {
 const score = HealthScore.calculate();
 return `<strong>Business Health Score:</strong>
 <div class="ai-stat-big" style="color:${score.color}">${score.score}/100</div>
 <div class="ai-stat-breakdown">${score.status}</div>
 <div class="ai-insights">${score.insights.slice(0,3).map(i=>`<div>• ${i}</div>`).join('')}</div>`;
 }

 // === DRAFT REMINDER / FOLLOW-UP EMAIL (record-aware, HubSpot Breeze-style) ===
 if (/draft|write|compose/.test(query) && /email|reminder|follow[\s-]?up/.test(query)) {
 const nameMatch = this._matchClientInQuery(query, clients, invoices);
 if (!nameMatch.client) {
 return `I can draft a payment reminder or follow-up email — just tell me who it's for, e.g. <em>"Draft a reminder email for Sharma Textiles"</em>.`;
 }
 const clientName = nameMatch.client;
 const clientInvoices = invoices.filter(i => (i.clientName||i.client||'') === clientName);
 const unpaidForClient = clientInvoices.filter(i => i.status !== 'paid');
 const overdueForClient = unpaidForClient.filter(i => i.status === 'overdue');
 const targetInv = overdueForClient[0] || unpaidForClient[0];
 const draft = this.draftEmail(clientName, targetInv, unpaidForClient);
 return draft;
 }

 // === SUMMARIZE A CLIENT / RECORD (HubSpot Breeze-style record summary) ===
 if (/summar/.test(query)) {
 const nameMatch = this._matchClientInQuery(query, clients, invoices);
 if (!nameMatch.client) {
 return `Tell me which client to summarize, e.g. <em>"Summarize Sharma Textiles"</em> or open their record and click the AI icon.`;
 }
 return this.summarizeClient(nameMatch.client, invoices, clients);
 }

 // === HELP ===
 if (/help|what can you|commands/.test(query)) {
 return `I can help you with:<br>
 <div class="ai-help-list">
 <strong>Revenue:</strong> "How much did I earn this month?"<br>
 <strong>Invoices:</strong> "Show unpaid invoices", "How many invoices this week?"<br>
 <i class="fas fa-users"></i> <strong>Clients:</strong> "Top 5 clients", "Who owes me the most?"<br>
 <strong>Products:</strong> "How many products?", "Low stock items"<br>
 <strong>Health:</strong> "How is my business doing?"<br>
 <strong>Summarize:</strong> "Summarize [client name]"<br>
 <strong>Draft email:</strong> "Draft a reminder email for [client name]"<br>
 <i class="fas fa-microphone"></i> <strong>Tip:</strong>Click the mic icon to speak your question.
 </div>`;
 }

 // === DEFAULT FALLBACK ===
 return `I'm not sure I understood that. Try asking:<br>
 <div class="ai-suggestions">
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('How much did I earn this month?')">Revenue this month</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('Show unpaid invoices')">Unpaid invoices</button>
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('help')">Help me</button>
 </div>`;
 },

 // ---- Helper: find a client name mentioned in a free-text query ----
 _matchClientInQuery(query, clients, invoices) {
 const names = clients.map(c => c.name).filter(Boolean);
 invoices.forEach(i => { const n = i.clientName || i.client; if (n && !names.includes(n)) names.push(n); });
 const lowerQ = query.toLowerCase();
 let best = null;
 names.forEach(n => {
 if (lowerQ.includes(n.toLowerCase())) {
 if (!best || n.length > best.length) best = n;
 }
 });
 return { client: best };
 },

 // ---- Record summary (HubSpot Breeze "summarize this record") ----
 summarizeClient(clientName, invoices, clients) {
 const clientInvoices = invoices.filter(i => (i.clientName || i.client || '') === clientName);
 const clientRecord = clients.find(c => c.name === clientName) || {};
 const paid = clientInvoices.filter(i => i.status === 'paid');
 const unpaid = clientInvoices.filter(i => i.status !== 'paid');
 const overdue = clientInvoices.filter(i => i.status === 'overdue');
 const totalPaid = paid.reduce((s,i) => s + (i.total||0), 0);
 const totalDue = unpaid.reduce((s,i) => s + (i.total||0), 0);
 const sorted = [...clientInvoices].sort((a,b) => new Date(b.date||b.issueDate||0) - new Date(a.date||a.issueDate||0));
 const last = sorted[0];
 const riskNote = overdue.length > 0
 ? ` <strong>${overdue.length} overdue invoice${overdue.length>1?'s':''}</strong> — worth a follow-up.`
 : (unpaid.length > 0 ? `${unpaid.length} invoice(s) still pending, not yet overdue.` : ` Fully paid up — no outstanding balance.`);
 return `<strong>Summary — ${clientName}</strong><br>
 <div class="ai-stat-breakdown">
 ${clientRecord.email ? ` ${clientRecord.email}<br>` : ''}
 ${clientRecord.phone ? ` ${clientRecord.phone}<br>` : ''}
 ${clientInvoices.length} invoice${clientInvoices.length!==1?'s':''} total, ${paid.length} paid
 </div>
 <div class="ai-stat-big">${fmtCurrency(totalPaid)}</div>
 <div class="ai-stat-breakdown">collected to date</div>
 ${totalDue > 0 ? `<div class="ai-stat-breakdown" style="margin-top:8px;">${fmtCurrency(totalDue)} currently outstanding</div>` : ''}
 <div class="ai-insights" style="margin-top:8px;">${riskNote}</div>
 ${last ? `<div class="ai-stat-breakdown" style="margin-top:8px;">Last invoice: ${last.invoiceNumber||last.number||'—'} on ${last.date||last.issueDate||'—'}</div>` : ''}
 ${unpaid.length > 0 ? `<div class="ai-suggestions" style="margin-top:10px;"><button class="ai-suggest-btn" onclick="AzolveAI.assistant.ask('Draft a reminder email for ${clientName.replace(/'/g,"\\'")}')"><i class="fas fa-envelope"></i>Draft reminder email</button></div>` : ''}`;
 },

 // ---- Email drafting (HubSpot Breeze "draft an email") ----
 draftEmail(clientName, invoice, unpaidForClient) {
 const company = DB.getObj('company');
 const senderName = company.name || 'our team';
 let subject, body;
 if (invoice) {
 const num = invoice.invoiceNumber || invoice.number || 'your invoice';
 const amt = fmtCurrency(invoice.total);
 const due = invoice.due || invoice.dueDate || 'the due date';
 const isOverdue = invoice.status === 'overdue';
 subject = isOverdue ? `Overdue: Invoice ${num}` : `Reminder: Invoice ${num} due soon`;
 body = `Hi ${clientName},<br><br>` +
 `${isOverdue
 ? `I wanted to flag that invoice <strong>${num}</strong> for <strong>${amt}</strong> is now past its due date (${due}).`
 : `Just a friendly reminder that invoice <strong>${num}</strong> for <strong>${amt}</strong> is due on ${due}.`}<br><br>` +
 `${unpaidForClient && unpaidForClient.length > 1 ? `You also have ${unpaidForClient.length - 1} other invoice(s) pending — happy to send a consolidated statement if that's easier.<br><br>` : ''}` +
 `Let me know if you have any questions, or if it's already been paid, please disregard this note.<br><br>` +
 `Best regards,<br>${senderName}`;
 } else {
 subject = `Checking in — ${clientName}`;
 body = `Hi ${clientName},<br><br>Just checking in — let me know if there's anything you need from us.<br><br>Best regards,<br>${senderName}`;
 }
 const draftId = 'aiDraft_' + Date.now();
 return `<strong>Email draft for ${clientName}</strong>
 <div class="ai-email-draft" id="${draftId}">
 <div class="ai-email-field"><span>Subject:</span> ${subject}</div>
 <div class="ai-email-body">${body}</div>
 </div>
 <div class="ai-suggestions" style="margin-top:8px;">
 <button class="ai-suggest-btn" onclick="AzolveAI.assistant.copyDraft('${draftId}','${subject.replace(/'/g,"\\'")}')"><i class="fas fa-copy"></i>Copy to clipboard</button>
 </div>
 <div class="ai-stat-breakdown" style="margin-top:6px;opacity:.7;">Review before sending — I drafted this from your invoice data, not sent automatically.</div>`;
 },

 copyDraft(draftId, subject) {
 const el = document.getElementById(draftId);
 if (!el) return;
 const bodyEl = el.querySelector('.ai-email-body');
 const text = 'Subject: ' + subject + '\n\n' + (bodyEl ? bodyEl.innerText : '');
 navigator.clipboard?.writeText(text).then(() => {
 if (typeof showToast === 'function') showToast('Email draft copied to clipboard', 'success');
 }).catch(() => {});
 }
 };

 // ============================================================
 // VOICE COMMANDS (English + Hindi)
 // ============================================================
 const Voice = {
 recognition: null,
 isListening: false,

 init() {
 const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
 if (!SpeechRecognition) {
 console.warn('Speech recognition not supported');
 return false;
 }
 if (this.recognition) {
 try {
 this.recognition.abort();
 } catch(e){}
 this.recognition = null;
 }
 this.recognition = new SpeechRecognition();
 this.recognition.continuous = false;
 this.recognition.interimResults = true;
 this.recognition.maxAlternatives = 3;
 return true;
 },

 start() {
 if (this.isListening) { this.stop(); return; }

 if (!this.init()) {
 alert('Voice input not supported on this browser. Please use Chrome/Edge on desktop or Android.');
 return;
 }

 // Auto-detect language from query context
 const lang = localStorage.getItem('azolve_voice_lang') || 'en-IN';
 this.recognition.lang = lang;

 this.showVoiceUI();

 this.recognition.onresult = (e) => {
 let transcript = '';
 let isFinal = false;
 for (let i = e.resultIndex; i < e.results.length; i++) {
 if (e.results[i].isFinal) {
 transcript = e.results[i][0].transcript;
 isFinal = true;
 } else {
 // Live interim results feedback in the UI!
 const interim = e.results[i][0].transcript;
 const textEl = document.querySelector('#voiceListening .voice-text');
 if (textEl) {
 textEl.innerHTML = `<span style="color:#f59e0b;font-weight:700">Hearing: "${interim}"</span>`;
 }
 }
 }
 if (isFinal && transcript) {
 this.stop();
 this.processCommand(transcript);
 }
 };
 this.recognition.onerror = (e) => {
 console.error('Speech recognition error:', e.error);
 this.stop();
 if (e.error === 'not-allowed') {
 if (window.showToast) window.showToast(' Microphone access denied. Please allow microphone in browser settings.', 'error');
 else alert('Microphone access denied. Please allow microphone access in browser settings.');
 } else if (e.error === 'no-speech') {
 if (window.showToast) window.showToast(' No speech detected. Tap mic and try again.', 'warning');
 } else if (e.error === 'network') {
 if (window.showToast) window.showToast(' Speech recognition network error. Check internet connection.', 'error');
 else alert('Speech recognition network error. Check internet connection.');
 } else if (e.error !== 'aborted') {
 if (window.showToast) window.showToast(' Voice error: ' + e.error, 'error');
 else alert('Voice error: ' + e.error);
 }
 };
 this.recognition.onend = () => {
 this.isListening = false;
 this.hideVoiceUI();
 };
 try {
 this.recognition.start();
 this.isListening = true;
 } catch(err) {
 console.error('Start err:', err);
 this.stop();
 }
 },

 stop() {
 if (this.recognition) {
 try {
 this.recognition.abort();
 } catch(e){}
 }
 this.isListening = false;
 this.hideVoiceUI();
 },

 showVoiceUI() {
 let ui = document.getElementById('voiceListening');
 if (!ui) {
 ui = document.createElement('div');
 ui.id = 'voiceListening';
 ui.className = 'voice-listening-ui';
 document.body.appendChild(ui);
 }

 let warningBanner = '';
 if (location.protocol === 'file:') {
 warningBanner = `
 <div style="margin:8px 0;padding:8px 12px;background:rgba(239,68,68,0.25);border:1px solid #f87171;border-radius:8px;color:#fecaca;font-size:12px;text-align:left;line-height:1.4;">
 <strong>File URL Detected:</strong>Browsers block microphone access on local files (file://). Please run the backend and open <a href="http://localhost:3000" style="color:#60a5fa;text-decoration:underline;">http://localhost:3000</a>.
 </div>
 `;
 } else if (!window.isSecureContext) {
 warningBanner = `
 <div style="margin:8px 0;padding:8px 12px;background:rgba(239,68,68,0.25);border:1px solid #f87171;border-radius:8px;color:#fecaca;font-size:12px;text-align:left;line-height:1.4;">
 <strong>Insecure Context:</strong>Voice input requires HTTPS or localhost.
 </div>
 `;
 }

 ui.innerHTML = `
 <div class="voice-pulse"></div>
 <div class="voice-icon"><i class="fas fa-microphone"></i></div>
 <div class="voice-text">Listening...</div>
 <div class="voice-hint">Speak clearly in English or Hindi</div>
 ${warningBanner}
 <div style="margin:12px 0;padding:12px 16px;background:rgba(255,255,255,0.15);border-radius:10px;font-size:13px;line-height:1.8;text-align:left;max-width:320px">
 <strong style="display:block;margin-bottom:6px;color:#e2e8f0;">Try saying (or click to simulate):</strong>
 <div style="display:flex;flex-direction:column;gap:6px;">
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Create invoice for Sharma 5000')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Create invoice for Sharma 5000"</button>
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Today\'s sales')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Today's sales"</button>
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Show unpaid invoices')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Show unpaid invoices"</button>
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Open clients')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Open clients"</button>
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Aaj ka sale kitna hua')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Aaj ka sale kitna hua"</button>
 <button class="ai-suggest-btn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 10px;text-align:left;border-radius:6px;cursor:pointer;font-size:12px;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" onclick="AzolveAI.voice.stop();AzolveAI.voice.processCommand('Sharma ka 5000 ka bill banao')"><i class="fas fa-comment-dots" style="margin-right:4px"></i>"Sharma ka 5000 ka bill banao"</button>
 </div>
 </div>
 <button onclick="AzolveAI.voice.stop()" class="voice-cancel"><i class="fas fa-xmark"></i>Cancel</button>
 `;
 ui.style.display = 'flex';
 },

 hideVoiceUI() {
 const ui = document.getElementById('voiceListening');
 if (ui) ui.style.display = 'none';
 },

 speak(text, lang='en-IN') {
 if (!window.speechSynthesis) return;
 const utter = new SpeechSynthesisUtterance(text);
 utter.lang = lang;
 utter.rate = 1.0;
 window.speechSynthesis.speak(utter);
 },

 processCommand(transcript) {
 const cmd = transcript.toLowerCase().trim();
 console.log('Voice command:', transcript);

 // Show recognition feedback
 if (window.showToast) window.showToast(`Heard: "${transcript}"`, 'info');

 // Check if Hindi (Devanagari script OR common Hindi words)
 const isHindi = /[\u0900-\u097F]/.test(transcript) ||
 /\b(banao|bana|kar|dikhao|batao|aaj|kitna|kitni|kitne|rupee|rupya|paisa|grahak|bechna)\b/i.test(cmd);

 // === HINDI COMMANDS ===
 if (isHindi) {
 localStorage.setItem('azolve_voice_lang', 'hi-IN');

 // "Aaj ka sale kitna hua"
 if (/(aaj|aaj ka).*(sale|bech|kitna|revenue)/.test(cmd)) {
 const todayStr = new Date().toDateString();
 const txns = DB.get('pos_transactions', []).filter(t => new Date(t.date).toDateString() === todayStr);
 const invPaid = DB.get('invoices', []).filter(i => i.status==='paid' && new Date(i.date).toDateString()===todayStr);
 const total = txns.reduce((s,t)=>s+(t.total||0),0) + invPaid.reduce((s,i)=>s+(i.total||0),0);
 const msg = `Aaj ka total sale Rs.${total.toLocaleString('en-IN')} hai. ${txns.length} POS transactions.`;
 this.speak(msg, 'hi-IN');
 this.voiceResult(msg);
 return;
 }

 // "Bill banao [name] ke liye [amount]" or "[name] ka [amount] ka bill banao"
 const hiBillMatch = cmd.match(/(?:bill|invoice).*?(?:banao|bana|banaao)[\s\S]*?(?:ke liye|liye|ke)?\s+([a-zA-Z\u0900-\u097F]+)[\s\S]*?(\d[\d,]*)/i) ||
 cmd.match(/([a-zA-Z\u0900-\u097F]+)\s+(?:ka|ke)\s+(?:liye\s+)?(\d[\d,]+)\s*(?:rupee|rupya|rs)?.*(?:bill|invoice)/i);
 if (hiBillMatch) {
 const name = hiBillMatch[1];
 const amt = hiBillMatch[2].replace(/,/g,'');
 const msg = `${name} ke liye Rs.${Number(amt).toLocaleString('en-IN')} ka invoice banaya.`;
 this.speak(msg, 'hi-IN');
 this.quickCreateInvoice(name, amt);
 return;
 }

 // "Kitne paid/unpaid invoices hain"
 if (/(kitne|kitna).*(paid|unpaid|pending|invoice|bill)/.test(cmd)) {
 const inv = DB.get('invoices',[]);
 const paid = inv.filter(i=>i.status==='paid').length;
 const unpaid = inv.filter(i=>i.status!=='paid').length;
 const msg = `Aapke paas ${paid} paid aur ${unpaid} unpaid invoices hain.`;
 this.speak(msg, 'hi-IN');
 this.voiceResult(msg);
 return;
 }

 // "Dashboard dikhao"
 if (/(dashboard|home|main).*dikhao|dikhao.*(dashboard|home)/.test(cmd)) {
 if(window.navigate) window.navigate('dashboard');
 this.speak('Dashboard khula.', 'hi-IN');
 return;
 }

 // Default Hindi
 this.speak('Samjha. AI Assistant mein bhej raha hoon.', 'hi-IN');
 AIAssistant.open();
 setTimeout(() =>AIAssistant.ask(transcript), 400);
 return;
 }

 // === ENGLISH COMMANDS ===

 // "Today's sales / revenue / earnings"
 if (/\b(today|today'?s)\b.*(sale|earn|revenue|total|income)|how much.*(today|did i make)/.test(cmd)) {
 const todayStr = new Date().toDateString();
 const txns = DB.get('pos_transactions',[]).filter(t => new Date(t.date).toDateString()===todayStr);
 const invPaid = DB.get('invoices',[]).filter(i => i.status==='paid' && new Date(i.date).toDateString()===todayStr);
 const total = txns.reduce((s,t)=>s+(t.total||0),0) + invPaid.reduce((s,i)=>s+(i.total||0),0);
 const msg = `Today's total: Rs.${total.toLocaleString('en-IN')} from ${txns.length} POS + ${invPaid.length} invoices.`;
 this.speak(msg);
 this.voiceResult(msg);
 return;
 }

 // "This month's revenue"
 if (/\b(this month|monthly)\b.*(sale|earn|revenue|total)/.test(cmd)) {
 const now = new Date();
 const inv = DB.get('invoices',[]).filter(i => {
 const d = new Date(i.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() && i.status==='paid';
 });
 const txns = DB.get('pos_transactions',[]).filter(t => {
 const d = new Date(t.date); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
 });
 const total = inv.reduce((s,i)=>s+(i.total||0),0) + txns.reduce((s,t)=>s+(t.total||0),0);
 const msg = `This month's revenue: Rs.${total.toLocaleString('en-IN')}`;
 this.speak(msg);
 this.voiceResult(msg);
 return;
 }

 // "Create / make / new invoice for [name] [amount]"
 const invoiceMatch = cmd.match(/(?:create|make|new|generate)\s+(?:an?\s+)?(?:invoice|bill)\s+(?:for\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:for\s+|of\s+|worth\s+|rs\.?\s*|rupees?\s*)?(\d[\d,]*)/i) ||
 cmd.match(/(?:invoice|bill)\s+(?:for\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:for\s+|of\s+)?(\d[\d,]*)/i);
 if (invoiceMatch) {
 const name = invoiceMatch[1].trim();
 const amt = invoiceMatch[2].replace(/,/g,'');
 this.speak(`Creating invoice for ${name}, amount Rs.${Number(amt).toLocaleString('en-IN')}`);
 this.quickCreateInvoice(name, amt);
 return;
 }

 // "Show / list unpaid / pending / overdue invoices"
 if (/\b(show|list|display|get)\b.*(unpaid|pending|overdue|due)\b/.test(cmd) ||
 /\b(unpaid|pending|overdue)\b.*(?:invoice|bill)/.test(cmd)) {
 if(window.navigate) window.navigate('invoices');
 if(window.filterInvoiceStatus) window.filterInvoiceStatus('pending');
 this.speak('Showing pending invoices.');
 if(window.showToast) window.showToast('Showing pending invoices', 'info');
 return;
 }

 // "Show all invoices"
 if (/\b(show|list|open)\b.*\b(all\s+)?invoice/.test(cmd)) {
 if(window.navigate) window.navigate('invoices');
 this.speak('Opening invoices.');
 return;
 }

 // "Open / go to / show [page]"
 const pageMatch = cmd.match(/(?:open|go to|show|navigate to|take me to)\s+(?:the\s+)?(\w+)/);
 if (pageMatch) {
 const pageMap = {
 dashboard:'dashboard', home:'dashboard',
 invoice:'invoices', invoices:'invoices', bills:'invoices',
 client:'clients', clients:'clients', customers:'clients',
 product:'products', products:'products', inventory:'products',
 pos:'pos', terminal:'pos',
 report:'pos-reports', reports:'pos-reports',
 lead:'leads', leads:'leads',
 task:'tasks', tasks:'tasks',
 chat:'chat', whatsapp:'whatsapp',
 settings:'settings', setting:'settings'
 };
 const page = pageMap[pageMatch[1].toLowerCase()];
 if (page && window.navigate) {
 window.navigate(page);
 this.speak(`Opening ${pageMatch[1]}`);
 return;
 }
 }

 // "How many clients / products / invoices"
 if (/how many.*(client|customer|product|invoice|lead)/.test(cmd)) {
 const counts = {
 clients: DB.get('clients',[]).length,
 products: DB.get('products',[]).length,
 invoices: DB.get('invoices',[]).length,
 leads: DB.get('leads',[]).length
 };
 const msg = `You have ${counts.clients} clients, ${counts.products} products, ${counts.invoices} invoices, ${counts.leads} leads.`;
 this.speak(msg);
 this.voiceResult(msg);
 return;
 }

 // "Business health score"
 if (/health.*(score|status)|business.*(health|score)/.test(cmd)) {
 if(window.AzolveAI) AzolveAI.healthScore.open();
 this.speak('Opening business health score.');
 return;
 }

 // Default - send to AI Assistant
 AIAssistant.open();
 setTimeout(() =>AIAssistant.ask(transcript), 400);
 },

 // Show a non-blocking result popup
 voiceResult(msg) {
 const d = document.createElement('div');
 d.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#fff;padding:16px 24px;border-radius:12px;font-size:15px;z-index:99999;max-width:90vw;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.3)';
 d.innerHTML = '<i class="fas fa-microphone"></i> ' + msg;
 document.body.appendChild(d);
 setTimeout(() => d.remove(), 5000);
 },

 quickCreateInvoice(customerName, amount) {
 try {
 const genId = window.genId || (() =>Date.now().toString(36) + Math.random().toString(36).substr(2,5));
 const todayFn = window.today || (() => new Date().toISOString().split('T')[0]);
 const invoices = DB.get('invoices', []);
 const company = DB.get('company', {});
 const prefix = company.invPrefix || 'INV-';
 const num = prefix + String(invoices.length + 1).padStart(4, '0');

 // Try to find existing client by name
 const clients = DB.get('clients', []);
 const nameLower = customerName.toLowerCase();
 const matchedClient = clients.find(c =>
 (c.name||'').toLowerCase().includes(nameLower) ||
 (c.company||'').toLowerCase().includes(nameLower)
 );

 const amt = parseFloat(String(amount).replace(/,/g,'')) || 0;
 const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
 const dueDateStr = dueDate.toISOString().split('T')[0];
 const displayName = matchedClient
 ? (matchedClient.company || matchedClient.name)
 : (customerName.charAt(0).toUpperCase() + customerName.slice(1));

 const newInv = {
 id: genId(),
 number: num,
 clientId: matchedClient ? matchedClient.id : '',
 clientName: displayName,
 clientEmail: matchedClient ? matchedClient.email : '',
 clientPhone: matchedClient ? matchedClient.phone : '',
 date: todayFn(),
 due: dueDateStr,
 items: [{ desc: 'Service', qty: 1, price: amt, discount: 0, taxRate: 18, total: parseFloat((amt * 1.18).toFixed(2)) }],
 subtotal: amt,
 discount: 0,
 tax: parseFloat((amt * 0.18).toFixed(2)),
 total: parseFloat((amt * 1.18).toFixed(2)),
 paid: 0,
 status: 'pending',
 template: 'default',
 notes: 'Created via Voice Command',
 createdAt: todayFn()
 };

 invoices.push(newInv);
 DB.set('invoices', invoices);

 // Navigate to invoices and refresh
 if (window.navigate) window.navigate('invoices');
 setTimeout(() => {
 if (window.renderInvoices) window.renderInvoices();
 if (window.updateInvoiceBadge) window.updateInvoiceBadge();
 }, 300);

 if (window.showToast) window.showToast(`Invoice ${num} created for ${displayName} (Rs.${(amt*1.18).toLocaleString('en-IN')})`, 'success');
 this.voiceResult(`Invoice ${num} created for ${displayName}!`);

 } catch(err) {
 console.error('quickCreateInvoice error:', err);
 if (window.showToast) window.showToast('Could not create invoice: ' + err.message, 'error');
 }
 }
 };

 // ============================================================
 // BUSINESS HEALTH SCORE
 // ============================================================
 const HealthScore = {
 calculate() {
 const invoices = DB.get('invoices', []);
 const clients = DB.get('clients', []);
 const products = DB.get('products', []);
 const txns = DB.get('pos_transactions', []);

 let score = 50; // Base
 const insights = [];

 // Factor 1: Cash collection rate (30 points)
 const paidInv = invoices.filter(i => i.status === 'paid');
 const totalInv = invoices.length;
 const collectionRate = totalInv ? paidInv.length / totalInv : 0;
 score += collectionRate * 30;

 if (collectionRate > 0.8) insights.push(' Excellent payment collection rate');
 else if (collectionRate > 0.5) insights.push(' Good collection but can improve');
 else if (totalInv > 0) insights.push(' Too many unpaid invoices - follow up urgently');

 // Factor 2: Activity (20 points)
 const now = new Date();
 const last30Days = new Date(now - 30*24*60*60*1000);
 const recentActivity = invoices.filter(i => new Date(i.date || i.issueDate) >= last30Days).length +
 txns.filter(t => new Date(t.date) >= last30Days).length;
 if (recentActivity > 30) { score += 20; insights.push(' Very active business in last 30 days'); }
 else if (recentActivity > 10) { score += 15; insights.push(' Good activity levels'); }
 else if (recentActivity > 3) { score += 10; insights.push(' Moderate activity'); }
 else { insights.push(' Low activity - time to make calls'); }

 // Factor 3: Diversification (10 points)
 const uniqueClients = new Set(invoices.map(i => i.clientName || i.client).filter(Boolean)).size;
 if (uniqueClients >= 10) { score += 10; insights.push(` Healthy client diversity (${uniqueClients} clients)`); }
 else if (uniqueClients >= 3) { score += 5; insights.push(` ${uniqueClients} active clients`); }
 else if (uniqueClients > 0) insights.push(` Only ${uniqueClients} clients - risk of over-dependence`);

 // Factor 4: Product catalog (10 points)
 if (products.length >= 10) score += 10;
 else if (products.length >= 3) score += 5;
 const lowStock = products.filter(p => (p.stock||0) < 10 && (p.stock||0) > 0).length;
 if (lowStock > 0) insights.push(` ${lowStock} product(s) running low on stock`);

 score = Math.min(100, Math.max(0, Math.round(score)));

 let status, color, emoji;
 if (score >= 80) { status = 'Excellent'; color = '#10b981'; emoji = ''; }
 else if (score >= 65) { status = 'Healthy'; color = '#3b82f6'; emoji = ''; }
 else if (score >= 50) { status = 'Fair'; color = '#f59e0b'; emoji = ''; }
 else if (score >= 30) { status = 'Needs Attention'; color = '#ef4444'; emoji = ''; }
 else { status = 'Critical'; color = '#991b1b'; emoji = ''; }

 // Always give at least 1 insight
 if (insights.length === 0) insights.push('Add some invoices to get personalized insights');

 return { score, status, color, emoji, insights };
 },

 renderWidget() {
 const data = this.calculate();
 return `
 <div class="health-widget">
 <div class="health-header">
 <div class="health-title">
 <span class="health-emoji">${data.emoji}</span>
 <span>Business Health Score</span>
 </div>
 <button class="health-refresh" onclick="AzolveAI.healthScore.updateWidget()" title="Refresh"></button>
 </div>
 <div class="health-circle-wrap">
 <svg viewBox="0 0 120 120" class="health-svg">
 <circle cx="60" cy="60" r="52" stroke="#e2e8f0" stroke-width="8" fill="none"/>
 <circle cx="60" cy="60" r="52" stroke="${data.color}" stroke-width="8" fill="none"
 stroke-dasharray="${(data.score/100) * 326.7} 326.7"
 stroke-dashoffset="0"
 transform="rotate(-90 60 60)"
 stroke-linecap="round"
 style="transition: stroke-dasharray 1s ease"/>
 </svg>
 <div class="health-score-text">
 <div class="health-number" style="color:${data.color}">${data.score}</div>
 <div class="health-label">/ 100</div>
 </div>
 </div>
 <div class="health-status" style="color:${data.color}">${data.status}</div>
 <div class="health-insights">
 ${data.insights.slice(0,3).map(i => `<div class="health-insight">${i}</div>`).join('')}
 </div>
 </div>
 `;
 },

 updateWidget() {
 const container = document.getElementById('healthScoreWidget');
 if (container) container.innerHTML = this.renderWidget();
 },

 inject() {
 // Try to inject into dashboard
 const tryInject = () => {
 const existing = document.getElementById('healthScoreWidget');
 if (existing) return this.updateWidget();

 // Find a good spot - look for dashboard/stats area
 const dashSection = document.querySelector('.dashboard-stats, .stats-grid, .section.active .card, main');
 if (!dashSection) return false;

 const widget = document.createElement('div');
 widget.id = 'healthScoreWidget';
 widget.innerHTML = this.renderWidget();
 dashSection.prepend(widget);
 return true;
 };
 if (!tryInject()) setTimeout(tryInject, 1000);
 },

 open() {
 const data = this.calculate();
 const d = document.createElement('div');
 d.innerHTML = '<div id="hsModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()"><div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;overflow:auto"><div style="padding:24px;background:linear-gradient(135deg,#ef4444,#f59e0b);color:#fff;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0">Business Health Score</h2><p style="margin:4px 0 0;opacity:0.9">Your overall business health at a glance</p></div><button onclick="document.getElementById(\'hsModal\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer">×</button></div><div style="padding:24px" id="hsBody"></div></div></div>';
 document.body.appendChild(d.firstElementChild);
 const body = document.getElementById('hsBody');
 const insightsHtml = (data.insights && data.insights.length)
 ? data.insights.map(i => '<div style="padding:8px 0;border-bottom:1px solid #f3f4f6">'+i+'</div>').join('')
 : '<div style="color:#6b7280">Add more data (invoices, clients, products) to see insights.</div>';
 body.innerHTML = this.renderWidget() + '<div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:10px"><h4 style="margin:0 0 12px">Insights & Recommendations</h4>' + insightsHtml + '</div>';
 }
 };

 // ============================================================
 // SMART PREDICTIONS
 // ============================================================
 const Predictions = {
 generate() {
 const invoices = DB.get('invoices', []);
 const txns = DB.get('pos_transactions', []);
 const products = DB.get('products', []);
 const predictions = [];

 const now = new Date();
 const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
 const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
 const daysPassed = now.getDate();
 const daysRemaining = daysInMonth - daysPassed;

 // 1. Revenue prediction
 const thisMonthPaid = invoices
 .filter(i => i.status === 'paid' && new Date(i.date || i.issueDate) >= monthStart)
 .reduce((s, i) => s + (i.total || 0), 0);
 const thisMonthPOS = txns
 .filter(t => new Date(t.date) >= monthStart)
 .reduce((s, t) => s + (t.total || 0), 0);
 const totalThisMonth = thisMonthPaid + thisMonthPOS;

 if (totalThisMonth > 0 && daysPassed > 3) {
 const dailyAvg = totalThisMonth / daysPassed;
 const projected = dailyAvg * daysInMonth;
 predictions.push({
 icon: '',
 title: 'Monthly Revenue Forecast',
 text: `At current pace, you'll hit <strong>${fmtCurrency(projected)}</strong> by month end`,
 detail: `${fmtCurrency(totalThisMonth)} so far • ${daysRemaining} days remaining`,
 color: '#3b82f6'
 });
 }

 // 2. Late paying clients
 const unpaid = invoices.filter(i => i.status !== 'paid');
 const clientPayHistory = {};
 invoices.forEach(i => {
 const name = i.clientName || i.client || 'Unknown';
 if (!clientPayHistory[name]) clientPayHistory[name] = {paid:0, total:0};
 clientPayHistory[name].total++;
 if (i.status === 'paid') clientPayHistory[name].paid++;
 });

 const latePayers = Object.entries(clientPayHistory)
 .filter(([_, stats]) => stats.total >= 2 && (stats.paid / stats.total) < 0.5)
 .map(([name]) => name);

 if (latePayers.length > 0) {
 predictions.push({
 icon: '',
 title: 'Late Payment Alert',
 text: `<strong>${latePayers[0]}</strong> historically pays late - follow up proactively`,
 detail: latePayers.length > 1 ? `+${latePayers.length-1} other late-payers detected` : 'Pattern detected from history',
 color: '#f59e0b'
 });
 }

 // 3. Low stock prediction
 const lowStock = products.filter(p => (p.stock||0) < 10 && (p.stock||0) > 0);
 if (lowStock.length > 0) {
 predictions.push({
 icon: '',
 title: 'Restock Alert',
 text: `<strong>${lowStock[0].name}</strong> running low (${lowStock[0].stock} left)`,
 detail: lowStock.length > 1 ? `+${lowStock.length-1} more items need restocking` : 'Order soon to avoid stockouts',
 color: '#ef4444'
 });
 }

 // 4. Best day of week
 const dayStats = [0,0,0,0,0,0,0];
 txns.forEach(t => {
 const d = new Date(t.date).getDay();
 dayStats[d] += t.total || 0;
 });
 const bestDay = dayStats.indexOf(Math.max(...dayStats));
 const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 if (dayStats[bestDay] > 0) {
 predictions.push({
 icon: '',
 title: 'Best Performing Day',
 text: `<strong>${days[bestDay]}s</strong> are your best sales days`,
 detail: `${fmtCurrency(dayStats[bestDay])} total - plan promotions accordingly`,
 color: '#10b981'
 });
 }

 // 5. Growth tip
 if (invoices.length < 5) {
 predictions.push({
 icon: '',
 title: 'Quick Tip',
 text: 'Add more clients to unlock better insights',
 detail: 'AI predictions get smarter with more data',
 color: '#8b5cf6'
 });
 }

 return predictions;
 },

 renderWidget() {
 const preds = this.generate();
 if (preds.length === 0) return '';

 return `
 <div class="predictions-widget">
 <div class="predictions-header">
 <span class="predictions-title">Smart Insights</span>
 <span class="predictions-badge">AI Powered</span>
 </div>
 <div class="predictions-list">
 ${preds.map(p => `
 <div class="prediction-card" style="border-left-color:${p.color}">
 <div class="pred-icon" style="background:${p.color}22;color:${p.color}">${p.icon}</div>
 <div class="pred-content">
 <div class="pred-title">${p.title}</div>
 <div class="pred-text">${p.text}</div>
 <div class="pred-detail">${p.detail}</div>
 </div>
 </div>
 `).join('')}
 </div>
 </div>
 `;
 },

 inject() {
 const tryInject = () => {
 const existing = document.getElementById('predictionsWidget');
 if (existing) { existing.innerHTML = this.renderWidget(); return true; }

 const healthWidget = document.getElementById('healthScoreWidget');
 if (!healthWidget) return false;

 const widget = document.createElement('div');
 widget.id = 'predictionsWidget';
 widget.innerHTML = this.renderWidget();
 healthWidget.after(widget);
 return true;
 };
 if (!tryInject()) setTimeout(tryInject, 1500);
 },

 open() {
 const d = document.createElement('div');
 d.innerHTML = '<div id="predModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()"><div style="background:#fff;border-radius:16px;max-width:720px;width:100%;max-height:90vh;overflow:auto"><div style="padding:24px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center"><div><h2 style="margin:0">Smart Predictions</h2><p style="margin:4px 0 0;opacity:0.9">AI-powered business forecasts & insights</p></div><button onclick="document.getElementById(\'predModal\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer">×</button></div><div style="padding:24px">' + this.renderWidget() + '</div></div></div>';
 document.body.appendChild(d.firstElementChild);
 }
 };

 // ============================================================
 // WHATSAPP INVOICE SENDING
 // ============================================================
 const WhatsAppSend = {
 sendInvoice(invoice) {
 if (!invoice) return;

 let phone = invoice.clientPhone || invoice.phone || '';
 if (!phone) {
 phone = prompt('Enter customer WhatsApp number (with country code, e.g., 9876543210):');
 if (!phone) return;
 }

 // Clean and normalize phone
 phone = phone.replace(/\D/g, '');
 if (phone.length === 10) phone = '91' + phone;

 const company = DB.getObj('company', {});
 const companyName = company.name || 'Our Business';

 // Build WhatsApp message
 let msg = ` *INVOICE FROM ${companyName.toUpperCase()}*\n\n`;
 msg += `Invoice #: ${invoice.invoiceNumber || invoice.number}\n`;
 msg += `Date: ${new Date(invoice.date || invoice.issueDate).toLocaleDateString('en-IN')}\n`;
 msg += `Client: ${invoice.clientName || invoice.client}\n\n`;

 if (invoice.items && invoice.items.length) {
 msg += `*Items:*\n`;
 invoice.items.forEach(item => {
 msg += `• ${item.name || item.description} × ${item.quantity || 1} = ${fmtCurrency(item.total || item.amount)}\n`;
 });
 msg += '\n';
 }

 msg += `Subtotal: ${fmtCurrency(invoice.subtotal || invoice.total)}\n`;
 if (invoice.tax) msg += `Tax: ${fmtCurrency(invoice.tax)}\n`;
 if (invoice.discount) msg += `Discount: -${fmtCurrency(invoice.discount)}\n`;
 msg += `\n*TOTAL: ${fmtCurrency(invoice.total)}*\n\n`;

 if (invoice.status !== 'paid') {
 msg += ` *Payment Due*\n`;
 if (invoice.dueDate) msg += `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}\n`;
 } else {
 msg += ` *PAID*\n`;
 }

 msg += `\nThank you for your business! `;

 // Open WhatsApp
 const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
 window.open(url, '_blank');
 },

 // Send POS receipt
 sendReceipt(txn) {
 if (!txn) return;
 let phone = txn.customer?.phone || '';
 if (!phone) {
 phone = prompt('Enter customer WhatsApp number:');
 if (!phone) return;
 }
 phone = phone.replace(/\D/g, '');
 if (phone.length === 10) phone = '91' + phone;

 const company = DB.getObj('company', {});
 let msg = ` *RECEIPT - ${company.name || 'AZOLVE'}*\n\n`;
 msg += `Receipt #${txn.receiptNo}\n`;
 msg += `Date: ${new Date(txn.date).toLocaleString('en-IN')}\n\n`;
 msg += `*Items:*\n`;
 txn.items.forEach(item => {
 msg += `• ${item.name} × ${item.qty} = ${fmtCurrency(item.price * item.qty)}\n`;
 });
 msg += `\n*TOTAL: ${fmtCurrency(txn.total)}*\n`;
 msg += `Payment: ${txn.paymentMethod}\n`;
 msg += `Status: PAID\n\n`;
 msg += `Thank you! Come again `;

 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
 }
 };

 // ============================================================
 // AI RECEIPT SCANNER (using Tesseract.js OCR)
 // ============================================================
 const ReceiptScanner = {
 open() {
 let modal = document.getElementById('scannerModal');
 if (!modal) {
 modal = this.createModal();
 document.body.appendChild(modal);
 }
 modal.style.display = 'flex';
 },

 close() {
 const modal = document.getElementById('scannerModal');
 if (modal) modal.style.display = 'none';
 },

 createModal() {
 const modal = document.createElement('div');
 modal.id = 'scannerModal';
 modal.className = 'ai-modal-overlay';
 modal.innerHTML = `
 <div class="ai-modal" style="max-width:520px">
 <div class="ai-header">
 <div class="ai-avatar"><i class="fas fa-camera"></i></div>
 <div class="ai-header-info">
 <div class="ai-title">Receipt Scanner</div>
 <div class="ai-status">Extract items from paper bills</div>
 </div>
 <button class="ai-close" onclick="AzolveAI.scanner.close()"><i class="fas fa-xmark"></i></button>
 </div>
 <div style="padding:24px">
 <div id="scannerUpload" class="scanner-upload-area">
 <div style="font-size:60px"></div>
 <h3 style="margin:12px 0">Snap or Upload Receipt</h3>
 <p style="color:#64748b;font-size:14px">Take a photo or upload an image of a paper bill/receipt</p>
 <input type="file" id="scannerFile" accept="image/*" capture="environment" style="display:none" onchange="AzolveAI.scanner.processFile(event)">
 <button class="btn btn-primary" onclick="document.getElementById('scannerFile').click()" style="margin-top:16px">Select / Take Photo
 </button>
 <div style="margin-top:16px;font-size:12px;color:#94a3b8">Powered by OCR + AI
 </div>
 </div>
 <div id="scannerProcessing" style="display:none;text-align:center;padding:40px">
 <div class="spinner-big"></div>
 <h3 style="margin:20px 0 8px">Processing Receipt...</h3>
 <div id="scannerStatus" style="color:#64748b;font-size:14px">Analyzing image</div>
 </div>
 <div id="scannerResult" style="display:none"></div>
 </div>
 </div>
 `;
 return modal;
 },

 async processFile(event) {
 const file = event.target.files[0];
 if (!file) return;

 document.getElementById('scannerUpload').style.display = 'none';
 document.getElementById('scannerProcessing').style.display = 'block';
 document.getElementById('scannerResult').style.display = 'none';

 // Load Tesseract.js dynamically if not loaded
 if (!window.Tesseract) {
 document.getElementById('scannerStatus').textContent = 'Loading OCR engine...';
 await this.loadTesseract();
 }

 document.getElementById('scannerStatus').textContent = 'Reading receipt text...';

 try {
 const result = await window.Tesseract.recognize(file, 'eng', {
 logger: (m) => {
 if (m.status === 'recognizing text') {
 document.getElementById('scannerStatus').textContent =
 `Reading... ${Math.round(m.progress * 100)}%`;
 }
 }
 });

 const text = result.data.text;
 const extracted = this.extractData(text);
 this.showResult(extracted, text);
 } catch (err) {
 console.error('OCR error:', err);
 alert('Could not read receipt. Please try a clearer image.');
 document.getElementById('scannerUpload').style.display = 'block';
 document.getElementById('scannerProcessing').style.display = 'none';
 }
 },

 loadTesseract() {
 return new Promise((resolve, reject) => {
 const script = document.createElement('script');
 script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
 script.onload = resolve;
 script.onerror = reject;
 document.head.appendChild(script);
 });
 },

 extractData(text) {
 const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
 const extracted = {
 vendor: '',
 date: '',
 total: 0,
 items: [],
 rawText: text
 };

 // Try vendor (first meaningful line)
 extracted.vendor = lines[0] || 'Unknown Vendor';

 // Find date
 const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
 if (dateMatch) extracted.date = dateMatch[0];

 // Find total - look for "total" keyword + largest amount
 const amountPattern = /[₹$€£]?\s*(\d+[,.]?\d*\.?\d{0,2})/g;
 const totalLine = lines.find(l => /total|grand|amount|payable/i.test(l) && !/sub/i.test(l));
 if (totalLine) {
 const matches = totalLine.match(/\d+\.\d{2}|\d+/g);
 if (matches) extracted.total = parseFloat(matches[matches.length - 1]);
 }

 // If no total found, get the largest amount
 if (!extracted.total) {
 const allAmounts = [];
 text.replace(/\d+\.\d{2}/g, m => { allAmounts.push(parseFloat(m)); return m; });
 if (allAmounts.length) extracted.total = Math.max(...allAmounts);
 }

 // Extract items - lines with text + amount
 lines.forEach(line => {
 const itemMatch = line.match(/^(.+?)\s+[₹$€£]?\s*(\d+\.\d{2})\s*$/);
 if (itemMatch && !/total|tax|subtotal|gst|vat/i.test(line)) {
 const name = itemMatch[1].trim();
 const price = parseFloat(itemMatch[2]);
 if (name.length > 2 && name.length < 50 && price > 0 && price < extracted.total) {
 extracted.items.push({name, price, quantity: 1});
 }
 }
 });

 return extracted;
 },

 showResult(data, rawText) {
 document.getElementById('scannerProcessing').style.display = 'none';
 const resultDiv = document.getElementById('scannerResult');
 resultDiv.style.display = 'block';

 const itemsHtml = data.items.length
 ? data.items.map((it, i) => `
 <div class="scan-item">
 <input type="text" value="${it.name}" class="scan-input" id="scanItem_${i}_name">
 <input type="number" value="${it.price}" class="scan-input" style="max-width:100px" id="scanItem_${i}_price">
 </div>
 `).join('')
 : '<div style="padding:12px;color:#94a3b8;text-align:center">No items detected. You can add them manually as an expense.</div>';

 resultDiv.innerHTML = `
 <div class="scan-result">
 <h3 style="margin-bottom:16px">Extracted Data</h3>
 <div class="scan-field">
 <label>Vendor</label>
 <input type="text" id="scanVendor" value="${this.escape(data.vendor)}" class="scan-input">
 </div>
 <div class="scan-field">
 <label>Date</label>
 <input type="text" id="scanDate" value="${data.date || new Date().toLocaleDateString()}" class="scan-input">
 </div>
 <div class="scan-field">
 <label>Total Amount</label>
 <input type="number" id="scanTotal" value="${data.total}" class="scan-input" style="font-size:18px;font-weight:700;color:#714B67">
 </div>
 ${data.items.length ? `<div style="margin-top:16px"><label style="font-weight:600;margin-bottom:8px;display:block">Items Detected</label>${itemsHtml}</div>` : ''}
 <div style="display:flex;gap:10px;margin-top:20px">
 <button class="btn btn-outline" onclick="AzolveAI.scanner.reset()" style="flex:1">Scan Another</button>
 <button class="btn btn-primary" onclick="AzolveAI.scanner.saveAsExpense()" style="flex:2">Save as Expense</button>
 </div>
 <details style="margin-top:16px">
 <summary style="cursor:pointer;color:#64748b;font-size:12px">View raw OCR text</summary>
 <pre style="font-size:11px;color:#64748b;background:#f8fafc;padding:10px;border-radius:8px;overflow:auto;max-height:150px;white-space:pre-wrap">${this.escape(rawText)}</pre>
 </details>
 </div>
 `;
 },

 reset() {
 document.getElementById('scannerFile').value = '';
 document.getElementById('scannerUpload').style.display = 'block';
 document.getElementById('scannerProcessing').style.display = 'none';
 document.getElementById('scannerResult').style.display = 'none';
 },

 saveAsExpense() {
 const expense = {
 id: Date.now().toString(36),
 vendor: document.getElementById('scanVendor').value,
 date: document.getElementById('scanDate').value || new Date().toISOString(),
 amount: parseFloat(document.getElementById('scanTotal').value) || 0,
 category: 'Scanned Receipt',
 createdAt: new Date().toISOString()
 };
 const expenses = DB.get('expenses', []);
 expenses.push(expense);
 DB.set('expenses', expenses);

 if (window.showToast) window.showToast(' Expense saved successfully!', 'success');
 this.close();
 this.reset();
 },

 escape(s) {
 return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
 }
 };

 // ============================================================
 // FLOATING ACTION BUTTON (Entry point for all features)
 // ============================================================
 const FAB = {
 inject() {
 if (document.getElementById('azolveFAB')) return;
 const fab = document.createElement('div');
 fab.id = 'azolveFAB';
 fab.className = 'azolve-fab-container';
 fab.innerHTML = `
 <div class="azolve-fab-menu" id="fabMenu">
 <button class="fab-action" onclick="AzolveAI.assistant.open();AzolveAI.fab.toggle()" title="AI Assistant">
 <span class="fab-icon"><i class="fas fa-robot"></i></span>
 <span class="fab-label">AI Assistant</span>
 </button>
 <button class="fab-action" onclick="AzolveAI.voice.start();AzolveAI.fab.toggle()" title="Voice Command">
 <span class="fab-icon"><i class="fas fa-microphone"></i></span>
 <span class="fab-label">Voice (Hi/En)</span>
 </button>
 <button class="fab-action" onclick="AzolveAI.scanner.open();AzolveAI.fab.toggle()" title="Scan Receipt">
 <span class="fab-icon"></span>
 <span class="fab-label">Scan Receipt</span>
 </button>
 </div>
 <button class="azolve-fab" onclick="AzolveAI.fab.toggle()">
 <span class="fab-main-icon"></span>
 </button>
 `;
 document.body.appendChild(fab);
 },

 toggle() {
 const menu = document.getElementById('fabMenu');
 if (menu) menu.classList.toggle('open');
 }
 };

 // ============================================================
 // PUBLIC API
 // ============================================================
 window.AzolveAI = {
 assistant: AIAssistant,
 voice: Voice,
 healthScore: HealthScore,
 predictions: Predictions,
 whatsapp: WhatsAppSend,
 scanner: ReceiptScanner,
 fab: FAB,

 init() {
 // Inject UI elements
 FAB.inject();

 // Inject widgets when dashboard is visible
 setTimeout(() => {
 HealthScore.inject();
 Predictions.inject();
 }, 1500);

 console.log('Azolve AI loaded successfully');
 }
 };

 // Auto-init
 if (document.readyState === 'complete' || document.readyState === 'interactive') {
 setTimeout(() => window.AzolveAI.init(), 500);
 } else {
 document.addEventListener('DOMContentLoaded', () => {
 setTimeout(() => window.AzolveAI.init(), 500);
 });
 }
})();