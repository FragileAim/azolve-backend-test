// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AZOLVE INTEGRATIONS — UPI Auto-Reconciliation & WhatsApp Business API
// Production-ready skeletons with setup guides + local simulation mode
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  'use strict';

  const LS = {
    get(k, def){ try{ const v = localStorage.getItem(k); return v===null? def : JSON.parse(v); }catch(e){ return def; } },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };

  // ═════════════════════════════════════════════════════════════════════
  // UPI AUTO-RECONCILIATION
  // ═════════════════════════════════════════════════════════════════════
  // Flow:
  //  1. Customer pays via UPI to merchant VPA
  //  2. Bank/PSP sends webhook → backend → stored in localStorage here (demo)
  //  3. Engine matches payment amount + ref to open invoices
  //  4. Auto-marks matched invoices as PAID
  //
  // Real integration options:
  //  • Razorpay UPI (easiest): https://razorpay.com/docs/payments/payment-gateway/upi/
  //  • Cashfree Payments: https://www.cashfree.com/docs/payments
  //  • BharatPe / PhonePe for Business: merchant webhooks
  //  • Direct bank SMS parsing (Android): using AzolveAI.sms scanner
  // ═════════════════════════════════════════════════════════════════════

  const UPI = {
    settings: {
      get(){ return LS.get('azolve_upi_settings', { vpa:'', enabled:false, autoMatch:true, tolerance:0 }); },
      set(s){ LS.set('azolve_upi_settings', s); }
    },

    // Simulated incoming payments inbox
    inbox: {
      get(){ return LS.get('azolve_upi_inbox', []); },
      set(l){ LS.set('azolve_upi_inbox', l); },
      add(p){
        const list = this.get();
        list.unshift({
          id: 'upi_' + Date.now(),
          ref: p.ref || ('TXN' + Math.floor(Math.random()*1e9)),
          amount: Number(p.amount) || 0,
          payerName: p.payerName || 'Unknown',
          payerVpa: p.payerVpa || '',
          note: p.note || '',
          receivedAt: new Date().toISOString(),
          status: 'pending',         // pending | matched | manual
          matchedInvoiceId: null
        });
        this.set(list);
      }
    },

    // Core matching engine
    match(payment){
      const invoices = LS.get('azolve_invoices', []);
      const open = invoices.filter(i => (i.status==='pending' || i.status==='overdue') && Number(i.total) > 0);

      // 1. Exact ref match (note contains invoice number)
      const note = (payment.note||'').toLowerCase();
      let match = open.find(i => note.includes(String(i.number||'').toLowerCase()));

      // 2. Exact amount match
      if(!match){
        const exact = open.filter(i => Math.round(i.total)===Math.round(payment.amount));
        if(exact.length === 1) match = exact[0];
      }

      // 3. Amount + client-name fuzzy match
      if(!match && payment.payerName){
        const pn = payment.payerName.toLowerCase();
        match = open.find(i => Math.round(i.total)===Math.round(payment.amount)
                            && (i.clientName||'').toLowerCase().split(' ').some(w => w && pn.includes(w)));
      }

      return match || null;
    },

    // Process all pending payments in inbox
    reconcile(){
      const inbox = this.inbox.get();
      const invoices = LS.get('azolve_invoices', []);
      let matched = 0;

      inbox.forEach(p => {
        if(p.status !== 'pending') return;
        const inv = this.match(p);
        if(inv){
          const idx = invoices.findIndex(i => i.id === inv.id);
          if(idx >= 0){
            invoices[idx].status = 'paid';
            invoices[idx].paid = invoices[idx].total;
            invoices[idx].paidAt = p.receivedAt;
            invoices[idx].paymentRef = p.ref;
            invoices[idx].paymentMode = 'UPI';
            p.status = 'matched';
            p.matchedInvoiceId = inv.id;
            matched++;
          }
        }
      });

      LS.set('azolve_invoices', invoices);
      this.inbox.set(inbox);
      return { matched, total: inbox.length };
    },

    // Manually link a payment to an invoice
    linkManually(paymentId, invoiceId){
      const inbox = this.inbox.get();
      const p = inbox.find(x => x.id === paymentId);
      if(!p) return false;

      const invoices = LS.get('azolve_invoices', []);
      const idx = invoices.findIndex(i => i.id === invoiceId);
      if(idx < 0) return false;

      invoices[idx].status = 'paid';
      invoices[idx].paid = invoices[idx].total;
      invoices[idx].paidAt = p.receivedAt;
      invoices[idx].paymentRef = p.ref;
      invoices[idx].paymentMode = 'UPI';

      p.status = 'matched';
      p.matchedInvoiceId = invoiceId;

      LS.set('azolve_invoices', invoices);
      this.inbox.set(inbox);
      return true;
    },

    // Simulate a received UPI payment (for demo)
    simulate(amount, payerName, note){
      this.inbox.add({
        amount: Number(amount),
        payerName: payerName || 'Demo Customer',
        payerVpa: (payerName||'demo').toLowerCase().replace(/\s/g,'') + '@paytm',
        note: note || '',
        ref: 'SIM' + Math.floor(Math.random()*1e9)
      });
      return this.reconcile();
    },

    // UI
    openDashboard(){
      const s = this.settings.get();
      const inbox = this.inbox.get();
      const pending = inbox.filter(p => p.status==='pending');
      const matched = inbox.filter(p => p.status==='matched');

      const html = `
      <div id="upiDash" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">
        <div style="background:#fff;border-radius:16px;max-width:800px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25)">
          <div style="padding:24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#fff;border-radius:16px 16px 0 0">
            <div>
              <h2 style="margin:0;font-size:22px">⚡ UPI Auto-Reconciliation</h2>
              <p style="margin:4px 0 0;opacity:0.9;font-size:14px">Automatically match UPI payments to invoices</p>
            </div>
            <button onclick="document.getElementById('upiDash').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer">×</button>
          </div>

          <div style="padding:24px">

            <!-- Status -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
              <div style="padding:16px;background:#f0f9ff;border-radius:10px;border-left:4px solid #0ea5e9">
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">Pending</div>
                <div style="font-size:28px;font-weight:700;color:#0ea5e9">${pending.length}</div>
              </div>
              <div style="padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #22c55e">
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">Matched</div>
                <div style="font-size:28px;font-weight:700;color:#22c55e">${matched.length}</div>
              </div>
              <div style="padding:16px;background:#fef3c7;border-radius:10px;border-left:4px solid #f59e0b">
                <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600">Status</div>
                <div style="font-size:14px;font-weight:700;color:#92400e;margin-top:8px">${s.enabled ? '✓ Active' : '⚠ Setup needed'}</div>
              </div>
            </div>

            <!-- Setup -->
            <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:16px">
              <h3 style="margin:0 0 12px;font-size:15px">Merchant UPI ID (VPA)</h3>
              <div style="display:flex;gap:8px">
                <input id="upiVpa" value="${s.vpa}" placeholder="yourbusiness@paytm" style="flex:1;padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                <button onclick="AzolveIntegrations.upi.saveSettings()" class="btn btn-primary">Save</button>
              </div>
              <div style="font-size:12px;color:#6b7280;margin-top:8px">Share this VPA with customers. When they pay, we'll auto-match to open invoices.</div>
            </div>

            <!-- Simulator -->
            <div style="background:#eff6ff;border-radius:10px;padding:16px;margin-bottom:16px;border:1px dashed #3b82f6">
              <h3 style="margin:0 0 8px;font-size:15px">🧪 Test with Simulated Payment</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px">
                <input id="simAmt" type="number" placeholder="Amount" style="padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                <input id="simName" placeholder="Payer Name" style="padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                <input id="simNote" placeholder="Invoice # (optional)" style="padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                <button onclick="AzolveIntegrations.upi.runSim()" class="btn btn-primary">Send</button>
              </div>
            </div>

            <!-- Inbox -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h3 style="margin:0;font-size:15px">Payment Inbox</h3>
                <button onclick="AzolveIntegrations.upi.runReconcile()" class="btn btn-outline btn-sm">🔄 Reconcile Now</button>
              </div>
              ${inbox.length === 0 ? '<div style="text-align:center;padding:40px;color:#9ca3af">No payments yet. Use simulator above to test.</div>' :
                '<div style="max-height:250px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px">' +
                inbox.slice(0,20).map(p => `
                  <div style="padding:12px 16px;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <div style="font-weight:600">${p.payerName} • ₹${p.amount.toLocaleString('en-IN')}</div>
                      <div style="font-size:12px;color:#6b7280">${p.ref} • ${new Date(p.receivedAt).toLocaleString()}</div>
                    </div>
                    <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;${
                      p.status==='matched' ? 'background:#dcfce7;color:#166534' :
                      p.status==='manual' ? 'background:#fef3c7;color:#92400e' :
                      'background:#fee2e2;color:#991b1b'
                    }">${p.status.toUpperCase()}</span>
                  </div>
                `).join('') + '</div>'
              }
            </div>

            <!-- Setup guide -->
            <details style="margin-top:16px">
              <summary style="cursor:pointer;padding:10px;background:#fef3c7;border-radius:8px;font-weight:600">📖 Production Setup Guide</summary>
              <div style="padding:16px;background:#fffbeb;border-radius:0 0 8px 8px;font-size:13px;line-height:1.6">
                <p><strong>Option 1: Razorpay (Recommended)</strong></p>
                <ol style="padding-left:20px">
                  <li>Sign up at razorpay.com — free tier available</li>
                  <li>Create Payment Link or UPI Collect API</li>
                  <li>Setup webhook at: <code>https://azolve-api.onrender.com/api/webhooks/razorpay</code></li>
                  <li>Events to subscribe: <code>payment.captured</code></li>
                </ol>
                <p style="margin-top:12px"><strong>Option 2: Bank SMS Parsing (Android App)</strong></p>
                <ol style="padding-left:20px">
                  <li>Use the Android APK (already built)</li>
                  <li>Grant SMS read permission</li>
                  <li>App parses "Credited INR X from Y" messages automatically</li>
                </ol>
                <p style="margin-top:12px"><strong>Matching Rules (automatic):</strong></p>
                <ul style="padding-left:20px">
                  <li>✓ Note contains invoice number</li>
                  <li>✓ Exact amount match to single open invoice</li>
                  <li>✓ Amount + client name fuzzy match</li>
                </ul>
              </div>
            </details>

          </div>
        </div>
      </div>`;
      const d = document.createElement('div');
      d.innerHTML = html;
      document.body.appendChild(d.firstElementChild);
    },

    saveSettings(){
      const vpa = document.getElementById('upiVpa').value.trim();
      this.settings.set({ ...this.settings.get(), vpa, enabled: !!vpa });
      if(window.showToast) showToast('UPI VPA saved: ' + vpa, 'success');
      document.getElementById('upiDash').remove();
      this.openDashboard();
    },

    runSim(){
      const amt = document.getElementById('simAmt').value;
      const name = document.getElementById('simName').value;
      const note = document.getElementById('simNote').value;
      if(!amt){ alert('Enter amount'); return; }
      const r = this.simulate(amt, name, note);
      if(window.showToast) showToast(`Payment received. Matched ${r.matched} invoice(s)`, r.matched?'success':'info');
      document.getElementById('upiDash').remove();
      this.openDashboard();
      if(window.renderInvoices) window.renderInvoices();
    },

    runReconcile(){
      const r = this.reconcile();
      if(window.showToast) showToast(`Matched ${r.matched} payment(s)`, 'success');
      document.getElementById('upiDash').remove();
      this.openDashboard();
      if(window.renderInvoices) window.renderInvoices();
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // WHATSAPP BUSINESS API
  // ═════════════════════════════════════════════════════════════════════
  // Currently: wa.me deep links (works everywhere, no API needed)
  // Production: WhatsApp Cloud API (Meta, free up to 1000 convos/month)
  //   https://developers.facebook.com/docs/whatsapp/cloud-api
  // ═════════════════════════════════════════════════════════════════════

  const WA = {
    settings: {
      get(){ return LS.get('azolve_wa_settings', {
        mode: 'basic',                 // basic (wa.me links) | cloud (Meta API)
        phoneNumberId: '',
        accessToken: '',
        businessId: '',
        templates: {
          invoiceReminder: 'Hi {name}, this is a reminder for invoice {number} of ₹{amount} due on {due}. Please pay at your earliest convenience. Thank you!',
          paymentReceived: 'Hi {name}, we\'ve received your payment of ₹{amount} for invoice {number}. Thank you!',
          welcomeClient: 'Hi {name}, welcome to {company}! We\'re excited to work with you.',
          overdueAlert: 'Hi {name}, invoice {number} of ₹{amount} is {days} days overdue. Please clear the payment. Call us if any concerns.'
        }
      }); },
      set(s){ LS.set('azolve_wa_settings', s); }
    },

    // Message log
    log: {
      get(){ return LS.get('azolve_wa_log', []); },
      add(entry){
        const list = this.get();
        list.unshift({ id:'wa_'+Date.now(), sentAt:new Date().toISOString(), ...entry });
        LS.set('azolve_wa_log', list.slice(0,500));
      }
    },

    normalize(phone){
      const d = String(phone||'').replace(/\D/g,'');
      if(!d) return '';
      return d.length === 10 ? '91' + d : d;
    },

    // Core send function — basic or cloud
    async send(phone, message){
      const pn = this.normalize(phone);
      if(!pn) throw new Error('Invalid phone');
      const s = this.settings.get();

      this.log.add({ to: pn, message, mode: s.mode, status: 'sent' });

      if(s.mode === 'cloud' && s.accessToken && s.phoneNumberId){
        // Real WhatsApp Cloud API call
        try {
          const res = await fetch(`https://graph.facebook.com/v18.0/${s.phoneNumberId}/messages`, {
            method:'POST',
            headers:{
              'Authorization': 'Bearer ' + s.accessToken,
              'Content-Type':'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: pn,
              type: 'text',
              text: { body: message }
            })
          });
          const data = await res.json();
          return { ok: res.ok, data };
        } catch(e) {
          // Fallback to basic on error
          window.open(`https://wa.me/${pn}?text=${encodeURIComponent(message)}`, '_blank');
          return { ok: true, fallback: true };
        }
      } else {
        // Basic mode — wa.me link
        window.open(`https://wa.me/${pn}?text=${encodeURIComponent(message)}`, '_blank');
        return { ok: true, basic: true };
      }
    },

    // Render template with variables
    renderTemplate(tplKey, vars){
      const s = this.settings.get();
      let t = s.templates[tplKey] || '';
      Object.entries(vars).forEach(([k,v]) => { t = t.replace(new RegExp('\\{'+k+'\\}','g'), v); });
      return t;
    },

    // Bulk send to overdue invoices
    async sendOverdueReminders(){
      const invoices = LS.get('azolve_invoices', []);
      const today = new Date();
      const overdue = invoices.filter(i => {
        if(i.status === 'paid') return false;
        const due = new Date(i.due);
        return due < today;
      });

      const company = LS.get('azolve_company', {});
      let sent = 0, skipped = 0;

      for(const inv of overdue){
        if(!inv.clientPhone){ skipped++; continue; }
        const days = Math.floor((today - new Date(inv.due)) / (1000*60*60*24));
        const msg = this.renderTemplate('overdueAlert', {
          name: inv.clientName || 'Customer',
          number: inv.number,
          amount: Number(inv.total||0).toLocaleString('en-IN'),
          days,
          company: company.name || 'Our business'
        });
        await this.send(inv.clientPhone, msg);
        sent++;
        await new Promise(r => setTimeout(r, 600)); // rate limit
      }

      return { sent, skipped, total: overdue.length };
    },

    openDashboard(){
      const s = this.settings.get();
      const log = this.log.get();
      const today = new Date().toDateString();
      const todayCount = log.filter(l => new Date(l.sentAt).toDateString() === today).length;

      const html = `
      <div id="waDash" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">
        <div style="background:#fff;border-radius:16px;max-width:900px;width:100%;max-height:90vh;overflow:auto">
          <div style="padding:24px;background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);color:#fff;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:center">
            <div>
              <h2 style="margin:0;font-size:22px">💬 WhatsApp Business Hub</h2>
              <p style="margin:4px 0 0;opacity:0.9;font-size:14px">Send invoices, reminders & templates</p>
            </div>
            <button onclick="document.getElementById('waDash').remove()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer">×</button>
          </div>

          <div style="padding:24px">

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
              <div style="padding:16px;background:#dcfce7;border-radius:10px;border-left:4px solid #22c55e">
                <div style="font-size:12px;color:#64748b;font-weight:600">Sent Today</div>
                <div style="font-size:28px;font-weight:700;color:#166534">${todayCount}</div>
              </div>
              <div style="padding:16px;background:#ecfdf5;border-radius:10px;border-left:4px solid #10b981">
                <div style="font-size:12px;color:#64748b;font-weight:600">Total Sent</div>
                <div style="font-size:28px;font-weight:700;color:#047857">${log.length}</div>
              </div>
              <div style="padding:16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #16a34a">
                <div style="font-size:12px;color:#64748b;font-weight:600">Mode</div>
                <div style="font-size:16px;font-weight:700;color:#15803d;margin-top:6px">${s.mode === 'cloud' ? '☁ Cloud API' : '📱 Basic (wa.me)'}</div>
              </div>
            </div>

            <!-- Quick Actions -->
            <h3 style="margin:0 0 12px;font-size:15px">Quick Actions</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:24px">
              <button class="btn btn-primary" style="background:#25D366;border:none" onclick="AzolveIntegrations.wa.runBulkReminders()">
                📢 Send Overdue Reminders
              </button>
              <button class="btn btn-outline" onclick="AzolveIntegrations.wa.openComposer()">
                ✍ Compose Message
              </button>
              <button class="btn btn-outline" onclick="AzolveIntegrations.wa.editTemplates()">
                📝 Edit Templates
              </button>
            </div>

            <!-- Recent Log -->
            <h3 style="margin:0 0 12px;font-size:15px">Recent Messages</h3>
            ${log.length === 0 ? '<div style="text-align:center;padding:30px;color:#9ca3af;background:#f9fafb;border-radius:8px">No messages sent yet</div>' :
              '<div style="max-height:220px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px">' +
              log.slice(0,15).map(l => `
                <div style="padding:12px 16px;border-bottom:1px solid #f3f4f6">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <strong>+${l.to}</strong>
                    <span style="font-size:11px;color:#6b7280">${new Date(l.sentAt).toLocaleString()}</span>
                  </div>
                  <div style="font-size:13px;color:#4b5563">${(l.message||'').substring(0,120)}${(l.message||'').length>120?'...':''}</div>
                </div>
              `).join('') + '</div>'
            }

            <!-- Cloud API setup -->
            <details style="margin-top:20px">
              <summary style="cursor:pointer;padding:10px;background:#dcfce7;border-radius:8px;font-weight:600">⚙ Upgrade to WhatsApp Cloud API (1000 free/month)</summary>
              <div style="padding:16px;background:#f0fdf4;border-radius:0 0 8px 8px;font-size:13px;line-height:1.7">
                <p><strong>Benefits:</strong> Automated sending (no clicking), delivery receipts, templates, rich media.</p>
                <p><strong>Setup Steps:</strong></p>
                <ol style="padding-left:20px">
                  <li>Visit <a href="https://developers.facebook.com/apps" target="_blank">Meta for Developers</a></li>
                  <li>Create App → Business → WhatsApp</li>
                  <li>Get <strong>Phone Number ID</strong> and <strong>Access Token</strong> (permanent)</li>
                  <li>Add test number or verify business number</li>
                  <li>Fill credentials below and switch mode to "Cloud":</li>
                </ol>
                <div style="margin-top:12px;display:grid;gap:8px">
                  <input id="waPhoneId" value="${s.phoneNumberId||''}" placeholder="Phone Number ID" style="padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                  <input id="waToken" value="${s.accessToken||''}" placeholder="Access Token" type="password" style="padding:10px;border:1px solid #d1d5db;border-radius:8px"/>
                  <div style="display:flex;gap:8px">
                    <label style="display:flex;align-items:center;gap:6px">
                      <input type="radio" name="waMode" value="basic" ${s.mode==='basic'?'checked':''}/> Basic (wa.me links)
                    </label>
                    <label style="display:flex;align-items:center;gap:6px">
                      <input type="radio" name="waMode" value="cloud" ${s.mode==='cloud'?'checked':''}/> Cloud API
                    </label>
                  </div>
                  <button class="btn btn-primary" style="background:#25D366;border:none" onclick="AzolveIntegrations.wa.saveSettings()">Save Settings</button>
                </div>
              </div>
            </details>

          </div>
        </div>
      </div>`;
      const d = document.createElement('div');
      d.innerHTML = html;
      document.body.appendChild(d.firstElementChild);
    },

    saveSettings(){
      const s = this.settings.get();
      s.phoneNumberId = document.getElementById('waPhoneId').value.trim();
      s.accessToken = document.getElementById('waToken').value.trim();
      s.mode = document.querySelector('input[name="waMode"]:checked').value;
      this.settings.set(s);
      if(window.showToast) showToast('WhatsApp settings saved', 'success');
      document.getElementById('waDash').remove();
      this.openDashboard();
    },

    openComposer(){
      const phone = prompt('Enter phone number (10 digits or with country code):');
      if(!phone) return;
      const msg = prompt('Enter message:');
      if(!msg) return;
      this.send(phone, msg);
    },

    editTemplates(){
      const s = this.settings.get();
      const keys = Object.keys(s.templates);
      const html = keys.map(k => `
        <div style="margin-bottom:12px">
          <label style="font-size:13px;font-weight:600;color:#374151">${k}</label>
          <textarea id="tpl_${k}" rows="3" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;margin-top:4px;font-family:inherit">${s.templates[k]}</textarea>
        </div>
      `).join('');
      const d = document.createElement('div');
      d.innerHTML = `
        <div id="tplEd" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px" onclick="if(event.target===this)this.remove()">
          <div style="background:#fff;border-radius:12px;max-width:600px;width:100%;max-height:85vh;overflow:auto;padding:24px">
            <h3 style="margin:0 0 16px">Edit Message Templates</h3>
            <div style="font-size:12px;color:#6b7280;margin-bottom:16px">Use variables: {name}, {number}, {amount}, {due}, {days}, {company}</div>
            ${html}
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-outline" onclick="document.getElementById('tplEd').remove()">Cancel</button>
              <button class="btn btn-primary" onclick="AzolveIntegrations.wa.saveTemplates(${JSON.stringify(keys).replace(/"/g,'"')})">Save</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(d.firstElementChild);
    },

    saveTemplates(keys){
      const s = this.settings.get();
      keys.forEach(k => { s.templates[k] = document.getElementById('tpl_'+k).value; });
      this.settings.set(s);
      if(window.showToast) showToast('Templates saved', 'success');
      document.getElementById('tplEd').remove();
    },

    async runBulkReminders(){
      if(!confirm('Send WhatsApp reminders to all overdue invoices?')) return;
      const r = await this.sendOverdueReminders();
      if(window.showToast) showToast(`Sent ${r.sent}/${r.total} reminders (${r.skipped} skipped - no phone)`, 'success');
    }
  };

  // Expose globally
  window.AzolveIntegrations = { upi: UPI, wa: WA };

  console.log('✓ Azolve Integrations loaded — UPI + WhatsApp Business');
})();