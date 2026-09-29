/**
 * AZOLVE UNIQUE FEATURES — ADVANCED
 * =================================
 * Quote→Invoice Chain + Contract Analyzer + Supplier Portal
 * + OKR Tracker + Multi-Business Dashboard
 */
(function(global){
'use strict';
var AUF = global.AUF = global.AUF || {};
var u = AUF.util;

// ========================================================================
// FEATURE 12: SMART QUOTATION → INVOICE → PO CHAIN
// ========================================================================
AUF.chain = {
    renderPage: function(){
        var sample = [
            {step:'Quotation', icon:'fa-file-alt', status:'done', date:'15 Apr 2026', detail:'Sent to Acme Corp — ₹50,000'},
            {step:'E-Approval', icon:'fa-signature', status:'done', date:'16 Apr 2026', detail:'Approved via OTP on WhatsApp'},
            {step:'Invoice', icon:'fa-file-invoice', status:'done', date:'17 Apr 2026', detail:'INV-2026-012 auto-created'},
            {step:'Payment', icon:'fa-credit-card', status:'active', date:'Pending', detail:'UPI link sent, awaiting payment'},
            {step:'Delivery', icon:'fa-truck', status:'', date:'Pending', detail:'Will auto-create on payment'},
            {step:'Receipt', icon:'fa-receipt', status:'', date:'Pending', detail:'Auto-generated on delivery'}
        ];
        var chainHTML = sample.map(function(s, i){
            var icon = '<i class="fas '+s.icon+'"></i>';
            var cls = s.status;
            var check = s.status==='done' ? '<div style="position:absolute;top:-6px;right:-6px;background:#10b981;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px"><i class="fas fa-check"></i></div>' : s.status==='active' ? '<div style="position:absolute;top:-6px;right:-6px;background:#f59e0b;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px"><i class="fas fa-clock"></i></div>' : '';
            return '<div class="auf-chain-step '+cls+'">'+check+icon+'<div style="font-weight:700;font-size:13px;margin-top:6px">'+s.step+'</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px">'+s.date+'</div></div>' + (i<sample.length-1 ? '<div class="auf-chain-arrow"><i class="fas fa-chevron-right"></i></div>' : '');
        }).join('');

        var recentChains = [
            {quote:'Q-2026-008', client:'Acme Corp', amount:50000, progress:3, total:6, status:'Payment Pending'},
            {quote:'Q-2026-007', client:'TechStart', amount:35000, progress:6, total:6, status:'✅ Complete'},
            {quote:'Q-2026-006', client:'Global Solutions', amount:80000, progress:4, total:6, status:'Delivery Pending'},
            {quote:'Q-2026-005', client:'Design Hub', amount:15000, progress:2, total:6, status:'Approval Pending'}
        ];
        var recentHTML = recentChains.map(function(r){
            return '<div class="auf-rule" style="margin-bottom:8px">' +
                '<div style="flex:1"><strong>'+r.quote+'</strong> · '+r.client+'<br><span style="font-size:11px;color:var(--text-muted)">'+u.fmt(r.amount)+' · '+r.status+'</span></div>' +
                '<div style="display:flex;align-items:center;gap:2px">'+Array.from({length:r.total}).map(function(_,i){return '<div style="width:8px;height:8px;border-radius:50%;background:'+(i<r.progress?'#10b981':'#e5e7eb')+'"></div>';}).join('')+'</div>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">' +
                '<div class="auf-hero-badge">🔗 AUTOMATED CHAIN</div>' +
                '<h1>Smart Document Chain</h1>' +
                '<p>Quote → Invoice → PO → Delivery → Receipt. The entire business workflow automated end-to-end with e-signatures and approvals.</p>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3>📊 Active Chain: Acme Corp Deal</h3></div><div class="card-body">' +
                '<div class="auf-chain">'+chainHTML+'</div>' +
                '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-primary" onclick="AUF.util.toast(\'Chain advanced to next step! Payment notification sent to client.\',\'success\')"><i class="fas fa-forward"></i> Advance to Next Step</button><button class="btn btn-outline" onclick="AUF.util.toast(\'Audit trail: Quote → Approval → Invoice → Payment Pending\',\'info\')"><i class="fas fa-history"></i> View Audit Trail</button></div>' +
            '</div></div>' +
            '<div class="auf-grid-2" style="margin-top:16px">' +
                '<div class="card"><div class="card-header"><h3>📋 Recent Document Chains</h3></div><div class="card-body">'+recentHTML+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>⚙️ Chain Automation Rules</h3></div><div class="card-body">' +
                    '<div style="font-size:13px;line-height:2">' +
                        '✅ Quote approved → Auto-create Invoice<br>' +
                        '✅ Invoice paid → Auto-generate Delivery Note<br>' +
                        '✅ Delivery confirmed → Auto-create Receipt<br>' +
                        '✅ Receipt generated → Auto-send Thank You<br>' +
                        '✅ Full audit trail maintained<br>' +
                        '✅ E-signature via OTP on WhatsApp' +
                    '</div>' +
                '</div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 15: AI CONTRACT ANALYZER
// ========================================================================
AUF.contract = {
    _sampleAnalysis: {
        risks: [
            {level:'high', clause:'Auto-renewal clause', text:'This contract auto-renews for 12 months unless cancelled 90 days before expiry.', advice:'⚠️ Set reminder 100 days before expiry to review.'},
            {level:'medium', clause:'Unlimited liability', text:'Vendor holds unlimited liability for damages.', advice:'Consider negotiating a cap (e.g. 1x annual fees).'},
            {level:'low', clause:'Late payment penalty', text:'2% per month on overdue payments.', advice:'Standard rate, acceptable.'}
        ],
        keyTerms: [
            {label:'Contract Value', value:'₹5,00,000'},
            {label:'Duration', value:'12 months'},
            {label:'Payment Terms', value:'Net 30 days'},
            {label:'Renewal', value:'Auto-renew (90 days notice)'},
            {label:'Termination', value:'60 days written notice'},
            {label:'Jurisdiction', value:'Mumbai, Maharashtra'}
        ],
        deadlines: [
            {event:'First payment due', date:'15 May 2026', days:28},
            {event:'Contract expires', date:'15 Apr 2027', days:363},
            {event:'Renewal decision deadline', date:'15 Jan 2027', days:270}
        ],
        score: 72
    },
    renderPage: function(){
        var sa = this._sampleAnalysis;
        var risksHTML = sa.risks.map(function(r){
            var color = r.level==='high'?'#ef4444':r.level==='medium'?'#f59e0b':'#10b981';
            var bg = r.level==='high'?'#fee2e2':r.level==='medium'?'#fef3c7':'#dcfce7';
            return '<div style="padding:14px;background:'+bg+';border-left:4px solid '+color+';border-radius:8px;margin-bottom:10px">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong>'+r.clause+'</strong><span style="font-size:10px;padding:2px 8px;background:'+color+';color:#fff;border-radius:10px;text-transform:uppercase;font-weight:700">'+r.level+' RISK</span></div>' +
                '<div style="font-size:12px;margin-bottom:6px">"'+r.text+'"</div>' +
                '<div style="font-size:12px;font-weight:600">💡 '+r.advice+'</div>' +
            '</div>';
        }).join('');
        var termsHTML = sa.keyTerms.map(function(t){
            return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text-muted)">'+t.label+'</span><strong>'+t.value+'</strong></div>';
        }).join('');
        var deadlinesHTML = sa.deadlines.map(function(d){
            var urgent = d.days < 30 ? '#ef4444' : d.days < 90 ? '#f59e0b' : '#10b981';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--bg-secondary,#f8fafc);border-radius:8px;margin-bottom:6px"><div><strong style="font-size:13px">'+d.event+'</strong><br><span style="font-size:11px;color:var(--text-muted)">'+d.date+'</span></div><span style="padding:4px 10px;background:'+urgent+';color:#fff;border-radius:12px;font-size:11px;font-weight:700">'+d.days+' days</span></div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#dc2626,#ea580c)">' +
                '<div class="auf-hero-badge">🤖 AI CONTRACT INTELLIGENCE</div>' +
                '<h1>AI Contract Analyzer</h1>' +
                '<p>Upload any contract. AI highlights risky clauses, extracts key terms, tracks deadlines, and gives plain-English summaries.</p>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div><div class="card" style="margin-bottom:16px"><div class="card-body" style="text-align:center;padding:30px">' +
                    '<div style="width:200px;height:260px;border:3px dashed #cbd5e1;border-radius:14px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#f8fafc" onclick="AUF.util.toast(\'Demo mode — sample contract analyzed\',\'info\')">' +
                        '<i class="fas fa-file-contract" style="font-size:48px;color:#94a3b8;margin-bottom:12px"></i>' +
                        '<div style="font-weight:700">Upload Contract</div>' +
                        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">PDF, DOC, DOCX supported</div>' +
                    '</div>' +
                    '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><span class="auf-badge-pill">🇬🇧 English</span><span class="auf-badge-pill">🇮🇳 Hindi</span><span class="auf-badge-pill">Regional</span></div>' +
                '</div></div>' +
                '<div class="card"><div class="card-header"><h3>📊 Contract Health Score</h3></div><div class="card-body" style="text-align:center">' +
                    '<div class="auf-health-ring" style="width:140px;height:140px">' +
                        '<svg class="auf-health-svg" viewBox="0 0 200 200">' +
                            '<defs><linearGradient id="contGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs>' +
                            '<circle class="auf-health-bg" cx="100" cy="100" r="85"/>' +
                            '<circle cx="100" cy="100" r="85" fill="none" stroke="url(#contGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="534" stroke-dashoffset="'+(534-(534*sa.score/100))+'"/>' +
                        '</svg>' +
                        '<div class="auf-health-text"><div class="auf-health-num" style="font-size:36px">'+sa.score+'</div><div class="auf-health-label">/ 100</div></div>' +
                    '</div>' +
                    '<div style="margin-top:14px;font-weight:700">Moderate Risk</div>' +
                    '<div style="font-size:12px;color:var(--text-muted);max-width:280px;margin:6px auto 0">2 risks identified. Review the auto-renewal clause carefully.</div>' +
                '</div></div></div>' +
                '<div><div class="card" style="margin-bottom:16px"><div class="card-header"><h3>⚠️ Risk Analysis</h3></div><div class="card-body">'+risksHTML+'</div></div>' +
                '<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>📋 Key Terms Extracted</h3></div><div class="card-body">'+termsHTML+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>📅 Critical Deadlines</h3></div><div class="card-body">'+deadlinesHTML+'</div></div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 16: VENDOR/SUPPLIER PORTAL
// ========================================================================
AUF.supplierPortal = {
    renderPage: function(){
        var suppliers = [
            {name:'Reliance Industries', email:'po@reliance.com', pending:3, paid:12, amount:285000, status:'active'},
            {name:'Tata Steel Ltd', email:'accounts@tatasteel.com', pending:1, paid:8, amount:192000, status:'active'},
            {name:'HDFC Bank', email:'billing@hdfc.com', pending:0, paid:24, amount:450000, status:'active'},
            {name:'Office Depot', email:'invoice@officedepot.in', pending:2, paid:4, amount:32000, status:'active'},
            {name:'Swiggy for Business', email:'b2b@swiggy.in', pending:1, paid:15, amount:68000, status:'active'}
        ];
        var sHTML = suppliers.map(function(s){
            return '<div class="auf-rule" style="margin-bottom:8px">' +
                '<div style="flex:1"><strong>'+s.name+'</strong><br><span style="font-size:11px;color:var(--text-muted)">'+s.email+' · '+s.paid+' paid, '+s.pending+' pending</span></div>' +
                '<div style="text-align:right"><div style="font-weight:800">'+u.fmtCompact(s.amount)+'</div><div style="font-size:10px;color:var(--text-muted)">YTD spend</div></div>' +
                '<button class="btn btn-sm btn-outline"><i class="fas fa-link"></i></button>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#0891b2,#06b6d4)">' +
                '<div class="auf-hero-badge">🏭 VENDOR PORTAL</div>' +
                '<h1>Supplier Self-Service Portal</h1>' +
                '<p>Suppliers submit invoices, track payments & communicate directly. Reduces your accounts payable workload by 60%.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Active Suppliers</div><div class="auf-metric-value">'+suppliers.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Pending Invoices</div><div class="auf-metric-value" style="color:#f59e0b">'+suppliers.reduce(function(s,x){return s+x.pending;},0)+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">YTD Spend</div><div class="auf-metric-value">'+u.fmtCompact(suppliers.reduce(function(s,x){return s+x.amount;},0))+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Avg Payment Time</div><div class="auf-metric-value">12 days</div><div class="auf-metric-sub" style="color:#10b981">Better than avg</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>🏢 Your Suppliers</h3><button class="btn btn-primary btn-sm" onclick="AUF.util.toast(\'Supplier invitation sent! They will receive an email to join the portal.\',\'success\')"><i class="fas fa-plus"></i> Invite Supplier</button></div><div class="card-body">'+sHTML+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>✨ Portal Features</h3></div><div class="card-body">' +
                    '<div style="display:grid;gap:8px;font-size:13px">' +
                        '<div style="padding:10px;background:#f0f9ff;border-radius:8px">📨 Suppliers submit invoices directly</div>' +
                        '<div style="padding:10px;background:#f0fdf4;border-radius:8px">🔄 Auto-match invoices with Purchase Orders</div>' +
                        '<div style="padding:10px;background:#fef3c7;border-radius:8px">👁️ Real-time payment status tracking</div>' +
                        '<div style="padding:10px;background:#fce7f3;border-radius:8px">💬 Direct messaging with suppliers</div>' +
                        '<div style="padding:10px;background:#ede9fe;border-radius:8px">📜 Digital contract storage</div>' +
                        '<div style="padding:10px;background:#ffe4e6;border-radius:8px">⭐ Supplier rating & performance</div>' +
                    '</div>' +
                '</div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 19: OKR & GOAL TRACKER
// ========================================================================
AUF.okr = {
    defaultGoals: [
        {id:'g1', title:'Collect ₹10L this month', target:1000000, current:720000, unit:'revenue', owner:'Finance Team', deadline:'30 Apr 2026', type:'company'},
        {id:'g2', title:'Close 5 new deals this week', target:5, current:3, unit:'deals', owner:'Sales Team', deadline:'25 Apr 2026', type:'team'},
        {id:'g3', title:'Zero overdue invoices', target:0, current:3, unit:'invert', owner:'Accounts', deadline:'30 Apr 2026', type:'team'},
        {id:'g4', title:'Onboard 10 new clients', target:10, current:6, unit:'clients', owner:'Business Dev', deadline:'30 Apr 2026', type:'company'},
        {id:'g5', title:'Achieve 95% attendance', target:95, current:88, unit:'%', owner:'HR', deadline:'30 Apr 2026', type:'team'},
        {id:'g6', title:'Reduce expenses by 15%', target:15, current:8, unit:'% reduction', owner:'Operations', deadline:'30 Apr 2026', type:'company'}
    ],
    getGoals: function(){
        var g = u.get('auf_goals', null);
        if(!g) { u.set('auf_goals', this.defaultGoals); g = this.defaultGoals; }
        return g;
    },
    _addGoalModal: function(type){
        if(typeof openModalRaw !== 'function') return AUF.util.toast('Add goal feature coming soon!','info');
        openModalRaw('<div class="modal-header"><h3>Add '+(type==='company'?'Company':'Team')+' Goal</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Goal Title</label><input class="form-control" id="goalTitle" placeholder="e.g. Collect ₹10L this month"></div>' +
            '<div class="form-group"><label>Target Value</label><input class="form-control" type="number" id="goalTarget" placeholder="e.g. 1000000"></div>' +
            '<div class="form-group"><label>Unit</label><select class="form-control" id="goalUnit"><option value="revenue">Revenue (₹)</option><option value="deals">Deals</option><option value="clients">Clients</option><option value="%">Percentage (%)</option><option value="count">Count</option></select></div>' +
            '<div class="form-group"><label>Owner / Team</label><input class="form-control" id="goalOwner" placeholder="e.g. Sales Team"></div>' +
            '<div class="form-group"><label>Deadline</label><input class="form-control" type="date" id="goalDeadline"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="AUF.okr._saveGoal(\''+type+'\')">Add Goal</button></div>');
    },
    _saveGoal: function(type){
        var title = document.getElementById('goalTitle');
        var target = document.getElementById('goalTarget');
        var unit = document.getElementById('goalUnit');
        var owner = document.getElementById('goalOwner');
        var deadline = document.getElementById('goalDeadline');
        if(!title||!title.value.trim()){ AUF.util.toast('Please enter a goal title','warning'); return; }
        var goals = this.getGoals();
        goals.push({
            id: 'g'+Date.now(),
            title: title.value.trim(),
            target: parseFloat(target?target.value:100)||100,
            current: 0,
            unit: unit?unit.value:'count',
            owner: owner?owner.value.trim():'Team',
            deadline: deadline?deadline.value:'30 Apr 2026',
            type: type
        });
        u.set('auf_goals', goals);
        closeModal();
        AUF.util.toast('Goal added!','success');
        setTimeout(function(){ AUF.renderPage('auf-okr'); }, 300);
    },
    renderPage: function(){
        var goals = this.getGoals();
        var companyGoals = goals.filter(function(g){return g.type==='company';});
        var teamGoals = goals.filter(function(g){return g.type==='team';});

        var renderGoal = function(g){
            var progress = g.unit==='invert' ? (g.target === g.current ? 100 : Math.max(0, 100 - (g.current*20))) : Math.min(100, (g.current/g.target)*100);
            var color = progress>=80?'#10b981':progress>=50?'#3b82f6':progress>=30?'#f59e0b':'#ef4444';
            var status = progress>=100?'🎉 Achieved':progress>=80?'✅ On Track':progress>=50?'👍 Progressing':'⚠️ At Risk';
            var display = g.unit==='revenue' ? u.fmtCompact(g.current)+' / '+u.fmtCompact(g.target) :
                         g.unit==='invert' ? g.current+' remaining' :
                         g.current + (g.unit==='%'||g.unit==='% reduction' ? '%' : '') + ' / ' + g.target + (g.unit==='%'||g.unit==='% reduction' ? '%' : '');
            return '<div class="auf-goal">' +
                '<div class="auf-goal-head"><div class="auf-goal-title">'+g.title+'</div><div class="auf-goal-meta">'+g.owner+' · '+g.deadline+'</div></div>' +
                '<div class="auf-goal-progress"><div class="auf-goal-bar" style="width:'+progress+'%;background:linear-gradient(90deg,'+color+',#764ba2)"></div></div>' +
                '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px"><span style="color:var(--text-muted)">'+display+'</span><span style="color:'+color+';font-weight:700">'+status+' · '+Math.round(progress)+'%</span></div>' +
            '</div>';
        };

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#16a34a,#10b981)">' +
                '<div class="auf-hero-badge">🎯 OKR TRACKER</div>' +
                '<h1>Goals & Objectives Tracker</h1>' +
                '<p>Set company goals that automatically track progress from your actual business data. No manual updates needed.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Active Goals</div><div class="auf-metric-value">'+goals.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">On Track</div><div class="auf-metric-value" style="color:#10b981">4</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">At Risk</div><div class="auf-metric-value" style="color:#f59e0b">1</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Achieved</div><div class="auf-metric-value" style="color:#10b981">1</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>🏢 Company Goals</h3><button class="btn btn-primary btn-sm" onclick="AUF.okr._addGoalModal(\'company\')"><i class="fas fa-plus"></i> Add Goal</button></div><div class="card-body" id="aufCompanyGoals">'+companyGoals.map(renderGoal).join('')+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>👥 Team Goals</h3><button class="btn btn-outline btn-sm" onclick="AUF.okr._addGoalModal(\'team\')"><i class="fas fa-plus"></i> Add Team Goal</button></div><div class="card-body" id="aufTeamGoals">'+teamGoals.map(renderGoal).join('')+'</div></div>' +
            '</div>' +
            '<div class="card" style="margin-top:16px"><div class="card-header"><h3>🤖 Auto-Tracking Sources</h3></div><div class="card-body">' +
                '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:12px">' +
                    '<div style="padding:12px;background:#f0fdf4;border-radius:8px"><strong>💰 Revenue Goals</strong><br>Auto-tracked from paid invoices</div>' +
                    '<div style="padding:12px;background:#f0f9ff;border-radius:8px"><strong>🎯 Deal Goals</strong><br>Auto-tracked from CRM deals</div>' +
                    '<div style="padding:12px;background:#fef3c7;border-radius:8px"><strong>👥 Client Goals</strong><br>Auto-tracked from new clients</div>' +
                    '<div style="padding:12px;background:#fce7f3;border-radius:8px"><strong>⏰ Attendance Goals</strong><br>Auto-tracked from HR system</div>' +
                    '<div style="padding:12px;background:#ede9fe;border-radius:8px"><strong>💸 Expense Goals</strong><br>Auto-tracked from expenses</div>' +
                    '<div style="padding:12px;background:#ffe4e6;border-radius:8px"><strong>🎧 Support Goals</strong><br>Auto-tracked from tickets</div>' +
                '</div>' +
            '</div></div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 20: MULTI-BUSINESS DASHBOARD
// ========================================================================
AUF.multiBusiness = {
    _businesses: [
        {id:'b1', name:'Azolve Infotech Pvt Ltd', logo:'🖥️', industry:'IT Services', revenue:2850000, employees:24, gstin:'27AABCA1234Z1Z5', status:'active', color:'#6366f1'},
        {id:'b2', name:'Azolve Retail LLP', logo:'🛍️', industry:'Retail', revenue:1250000, employees:12, gstin:'27AABCA5678Z2Z3', status:'active', color:'#ec4899'},
        {id:'b3', name:'Azolve Consulting', logo:'💼', industry:'Consulting', revenue:850000, employees:6, gstin:'27AABCA9012Z3Z1', status:'active', color:'#10b981'}
    ],
    getBusinesses: function(){
        var saved = u.get('auf_businesses', null);
        if(!saved){ u.set('auf_businesses', this._businesses); saved = this._businesses; }
        return saved;
    },
    renderPage: function(){
        var businesses = this.getBusinesses();
        var totalRev = businesses.reduce(function(s,b){return s+b.revenue;},0);
        var totalEmp = businesses.reduce(function(s,b){return s+b.employees;},0);

        var bizHTML = businesses.map(function(b){
            var revShare = Math.round((b.revenue/totalRev)*100);
            return '<div class="card" style="border-left:4px solid '+b.color+';cursor:pointer" onclick="AUF.multiBusiness.switchTo(\''+b.id+'\')">' +
                '<div class="card-body">' +
                    '<div style="display:flex;gap:14px;align-items:center">' +
                        '<div style="width:60px;height:60px;background:'+b.color+'22;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:32px">'+b.logo+'</div>' +
                        '<div style="flex:1">' +
                            '<div style="font-weight:800;font-size:16px">'+b.name+'</div>' +
                            '<div style="font-size:11px;color:var(--text-muted)">'+b.industry+' · '+b.gstin+'</div>' +
                            '<div style="display:flex;gap:12px;margin-top:8px;font-size:12px">' +
                                '<span>💰 <strong>'+u.fmtCompact(b.revenue)+'</strong></span>' +
                                '<span>👥 <strong>'+b.employees+'</strong> employees</span>' +
                                '<span>📊 <strong>'+revShare+'%</strong> of total</span>' +
                            '</div>' +
                        '</div>' +
                        '<button class="btn btn-primary btn-sm">Open <i class="fas fa-arrow-right"></i></button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#7c3aed,#ec4899)">' +
                '<div class="auf-hero-badge">🏢 MULTI-BUSINESS</div>' +
                '<h1>Multi-Business Dashboard</h1>' +
                '<p>Manage all your companies from one login. Separate GST, invoicing, HR for each — consolidated view when you need it.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Businesses</div><div class="auf-metric-value">'+businesses.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Consolidated Revenue</div><div class="auf-metric-value">'+u.fmtCompact(totalRev)+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Employees</div><div class="auf-metric-value">'+totalEmp+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Active GSTINs</div><div class="auf-metric-value">'+businesses.filter(function(b){return b.status==='active';}).length+'</div></div>' +
            '</div>' +
            '<div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">' +
                '<h3 style="margin:0">Your Businesses</h3>' +
                '<button class="btn btn-primary" onclick="AUF.multiBusiness._addModal()"><i class="fas fa-plus"></i> Add New Business</button>' +
            '</div>' +
            '<div style="display:grid;gap:14px">'+bizHTML+'</div>' +
            '<div class="card" style="margin-top:20px"><div class="card-header"><h3>🎯 Why Multi-Business?</h3></div><div class="card-body">' +
                '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;font-size:13px">' +
                    '<div style="padding:14px;background:#ede9fe;border-radius:10px"><strong>🔐 Single Login</strong><br>One email to manage all companies</div>' +
                    '<div style="padding:14px;background:#fce7f3;border-radius:10px"><strong>📊 Consolidated P&L</strong><br>See total health across businesses</div>' +
                    '<div style="padding:14px;background:#f0f9ff;border-radius:10px"><strong>👥 Shared Employees</strong><br>Staff can work for multiple companies</div>' +
                    '<div style="padding:14px;background:#f0fdf4;border-radius:10px"><strong>🧾 Separate GST Filings</strong><br>Each company files independently</div>' +
                    '<div style="padding:14px;background:#fef3c7;border-radius:10px"><strong>⚡ One-Click Switch</strong><br>Jump between businesses instantly</div>' +
                    '<div style="padding:14px;background:#ffe4e6;border-radius:10px"><strong>🔒 Strict Data Isolation</strong><br>Complete separation for compliance</div>' +
                '</div>' +
            '</div></div>' +
        '</div>';
    },
    switchTo: function(id){
        var b = this.getBusinesses().find(function(x){return x.id===id;});
        if(!b) return;
        AUF.util.toast('Switched to: '+b.name+' (demo mode)', 'success');
    },
    _addModal: function(){
        if(typeof openModalRaw !== 'function') return AUF.util.toast('Add business feature coming soon!','info');
        openModalRaw('<div class="modal-header"><h3>Add New Business</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>' +
            '<div class="modal-body">' +
            '<div class="form-group"><label>Business Name</label><input class="form-control" id="newBizName" placeholder="e.g. Acme Pvt Ltd"></div>' +
            '<div class="form-group"><label>Industry</label><select class="form-control" id="newBizIndustry"><option>IT Services</option><option>Retail</option><option>Consulting</option><option>Manufacturing</option><option>Healthcare</option><option>Education</option><option>Other</option></select></div>' +
            '<div class="form-group"><label>GSTIN (optional)</label><input class="form-control" id="newBizGst" placeholder="27AABCA1234Z1Z5"></div>' +
            '</div>' +
            '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button>' +
            '<button class="btn btn-primary" onclick="AUF.multiBusiness._saveNewBiz()">Add Business</button></div>');
    },
    _saveNewBiz: function(){
        var name = document.getElementById('newBizName');
        var ind = document.getElementById('newBizIndustry');
        var gst = document.getElementById('newBizGst');
        if(!name || !name.value.trim()){ AUF.util.toast('Please enter a business name','warning'); return; }
        var businesses = this.getBusinesses();
        var icons = ['🏢','🏪','🏭','🏬','💼','🛒'];
        var colors = ['#6366f1','#ec4899','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
        var newBiz = {
            id: 'b'+Date.now(),
            name: name.value.trim(),
            logo: icons[businesses.length % icons.length],
            industry: ind ? ind.value : 'Other',
            revenue: 0, employees: 0,
            gstin: gst ? gst.value.trim() : '',
            status: 'active',
            color: colors[businesses.length % colors.length]
        };
        businesses.push(newBiz);
        u.set('auf_businesses', businesses);
        closeModal();
        AUF.util.toast('Business added: '+newBiz.name, 'success');
        setTimeout(function(){ AUF.renderPage('auf-multibiz'); }, 300);
    }
};

// ========================================================================
// MAIN ROUTER - All unique feature pages
// ========================================================================
AUF.labels = {
    'auf-health': 'Business Health Score',
    'auf-whatsapp': 'WhatsApp Commands',
    'auf-voice': 'Voice-to-Invoice',
    'auf-upi': 'UPI Payment Links',
    'auf-cashflow': 'AI Cash Flow Predictor',
    'auf-profitability': 'Client 360° Profitability',
    'auf-autopilot': 'Smart Follow-Up Autopilot',
    'auf-gst': 'GST Auto-Filing',
    'auf-gamify': 'Team Leaderboard',
    'auf-ocr': 'Receipt OCR Scanner',
    'auf-clientportal': 'Client Self-Service Portal',
    'auf-chain': 'Quote→Invoice Chain',
    'auf-fieldsales': 'Field Sales Tracker',
    'auf-command': 'Mobile Command Center',
    'auf-contract': 'AI Contract Analyzer',
    'auf-supplier': 'Supplier Portal',
    'auf-benchmark': 'Industry Benchmark',
    'auf-okr': 'Goals & OKRs',
    'auf-multibiz': 'Multi-Business Dashboard'
};

AUF.renderPage = function(page){
    var el = document.getElementById('page-'+page);
    if(!el) return false;
    // Update breadcrumb with a pretty label if present
    var bc = document.getElementById('breadcrumbPage');
    if(bc && AUF.labels[page]){ bc.textContent = AUF.labels[page]; }
    var map = {
        'auf-health': function(){ el.innerHTML = AUF.health.renderPage(); },
        'auf-whatsapp': function(){ el.innerHTML = AUF.whatsapp.renderPage(); },
        'auf-voice': function(){ el.innerHTML = AUF.voice.renderPage(); },
        'auf-upi': function(){ el.innerHTML = AUF.upi.renderPage(); },
        'auf-cashflow': function(){ el.innerHTML = AUF.cashflow.renderPage(); setTimeout(function(){AUF.cashflow.renderChart();}, 100); },
        'auf-profitability': function(){ el.innerHTML = AUF.profitability.renderPage(); },
        'auf-autopilot': function(){ el.innerHTML = AUF.autopilot.renderPage(); },
        'auf-gst': function(){ el.innerHTML = AUF.gst.renderPage(); },
        'auf-gamify': function(){ el.innerHTML = AUF.gamify.renderPage(); },
        'auf-ocr': function(){ el.innerHTML = AUF.ocr.renderPage(); },
        'auf-clientportal': function(){ el.innerHTML = AUF.clientPortal.renderPage(); },
        'auf-chain': function(){ el.innerHTML = AUF.chain.renderPage(); },
        'auf-fieldsales': function(){ el.innerHTML = AUF.fieldSales.renderPage(); },
        'auf-command': function(){ el.innerHTML = AUF.commandCenter.renderPage(); },
        'auf-contract': function(){ el.innerHTML = AUF.contract.renderPage(); },
        'auf-supplier': function(){ el.innerHTML = AUF.supplierPortal.renderPage(); },
        'auf-benchmark': function(){ el.innerHTML = AUF.benchmark.renderPage(); },
        'auf-okr': function(){ el.innerHTML = AUF.okr.renderPage(); },
        'auf-multibiz': function(){ el.innerHTML = AUF.multiBusiness.renderPage(); }
    };
    if(map[page]){ map[page](); return true; }
    return false;
};

// ========================================================================
// AUTO-INJECT: Business Health Widget on Main Dashboard
// ========================================================================
AUF.injectDashboardWidget = function(){
    var dashStats = document.getElementById('dashboardStats');
    if(!dashStats) return;
    var existing = document.getElementById('aufDashHealth');
    if(existing) return;
    var container = document.createElement('div');
    container.id = 'aufDashHealth';
    container.innerHTML = AUF.health.renderDashWidget();
    dashStats.parentNode.insertBefore(container, dashStats);
};

// ========================================================================
// AUTO-HOOK: Extend navigate() to handle auf-* pages
// ========================================================================
(function hookNavigate(){
    var tries = 0;
    var checkReady = function(){
        tries++;
        if(typeof window.renderPage === 'function' && !window._aufHooked){
            window._aufHooked = true;
            var origRenderPage = window.renderPage;
            window.renderPage = function(page){
                if(page && page.indexOf('auf-')===0){
                    return AUF.renderPage(page);
                }
                return origRenderPage(page);
            };
            // Also inject dashboard widget
            setTimeout(function(){
                if(document.getElementById('dashboardStats')) AUF.injectDashboardWidget();
            }, 500);
        } else if(tries < 40){
            setTimeout(checkReady, 200);
        }
    };
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', checkReady);
    } else {
        checkReady();
    }
})();

})(window);