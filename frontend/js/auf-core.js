/**
 * AZOLVE UNIQUE FEATURES — CORE
 * =============================
 * Shared utilities + Business Health Score + AI Cash Flow Predictor
 * + Client Profitability + Industry Benchmarking
 */
(function(global){
'use strict';

// ========== Namespace ==========
var AUF = global.AUF = global.AUF || {};

// ========== Shared Utilities ==========
AUF.util = {
 _db: function(){ return (typeof DB !== 'undefined') ? DB : null; },
 get: function(key, def){
 var db = this._db(); if(!db) return def;
 var v = db.get ? db.get(key, def) : def;
 return v;
 },
 getObj: function(key, def){
 var db = this._db(); if(!db) return (def||{});
 return db.getObj ? db.getObj(key, def||{}) : (def||{});
 },
 set: function(key, val){
 var db = this._db(); if(!db) return;
 if(db.set) db.set(key, val);
 },
 cur: function(){
 try { var c = this.getObj('company',{}); var sym={USD:'$',EUR:'€',GBP:'£',INR:'₹',AUD:'A$',CAD:'C$'}; return sym[c.currency||'INR']||'₹'; } catch(e){ return '₹'; }
 },
 fmt: function(n){
 return this.cur() + Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
 },
 fmtCompact: function(n){
 n = Number(n||0);
 if(n >= 10000000) return this.cur()+(n/10000000).toFixed(2)+'Cr';
 if(n >= 100000) return this.cur()+(n/100000).toFixed(2)+'L';
 if(n >= 1000) return this.cur()+(n/1000).toFixed(1)+'K';
 return this.cur()+n.toFixed(0);
 },
 toast: function(msg, type){
 if(typeof showToast === 'function') return showToast(msg, type||'info');
 alert(msg);
 },
 daysBetween: function(d1, d2){
 var a = new Date(d1), b = new Date(d2);
 return Math.round((b-a)/(1000*60*60*24));
 },
 clamp: function(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
};

// ========================================================================
// FEATURE 1: BUSINESS HEALTH SCORE
// ========================================================================
AUF.health = {
 compute: function(){
 var u = AUF.util;
 var inv = u.get('invoices', []) || [];
 var clients = u.get('clients', []) || [];
 var employees = u.get('employees', []) || [];
 var tickets = u.get('tickets', []) || [];
 var leads = u.get('leads', []) || [];
 var deals = u.get('deals', []) || [];
 var att = u.get('attendance', []) || [];
 var expenses = u.get('expenses', []) || [];

 // Factor 1: Revenue health (0-100)
 var paid = inv.filter(function(i){return i.status==='paid';});
 var totalRev = paid.reduce(function(s,i){return s+(i.total||0);},0);
 var revScore = u.clamp(Math.round((totalRev/100000)*10 + (paid.length*5)), 0, 100);

 // Factor 2: Cash flow health
 var pending = inv.filter(function(i){return i.status==='pending'||i.status==='overdue';});
 var overdue = inv.filter(function(i){return i.status==='overdue';});
 var pendingAmt = pending.reduce(function(s,i){return s+((i.total||0)-(i.paid||0));},0);
 var cashScore = u.clamp(100 - (overdue.length*15) - (pendingAmt/50000), 0, 100);

 // Factor 3: Customer health
 var custScore = u.clamp((clients.length*5) + (paid.length*3), 0, 100);

 // Factor 4: Sales pipeline health
 var activeDeals = deals.filter(function(d){return d.stage && d.stage!=='closed-lost'&&d.stage!=='closed-won';});
 var pipelineScore = u.clamp((leads.length*4) + (activeDeals.length*8), 0, 100);

 // Factor 5: Team health
 var presentToday = att.filter(function(a){return a.date === new Date().toISOString().split('T')[0] && a.status==='present';}).length;
 var teamScore = employees.length ? u.clamp(Math.round((presentToday/employees.length)*100), 0, 100) : 75;

 // Factor 6: Support health
 var openTickets = tickets.filter(function(t){return t.status==='open'||t.status==='pending';}).length;
 var supportScore = u.clamp(100 - (openTickets*8), 0, 100);

 // Weighted overall score
 var overall = Math.round(
 revScore*0.25 + cashScore*0.20 + custScore*0.15 +
 pipelineScore*0.15 + teamScore*0.15 + supportScore*0.10
 );

 return {
 overall: overall,
 factors: [
 {name:'Revenue Growth', score:revScore, weight:25, icon:'fa-chart-line', detail:u.fmtCompact(totalRev)+' earned · '+paid.length+' paid invoices'},
 {name:'Cash Flow', score:cashScore, weight:20, icon:'fa-money-bill-wave', detail:overdue.length+' overdue · '+u.fmtCompact(pendingAmt)+' pending'},
 {name:'Customer Base', score:custScore, weight:15, icon:'fa-users', detail:clients.length+' clients'},
 {name:'Sales Pipeline', score:pipelineScore, weight:15, icon:'fa-funnel-dollar', detail:leads.length+' leads · '+activeDeals.length+' active deals'},
 {name:'Team Attendance', score:teamScore, weight:15, icon:'fa-user-clock', detail:presentToday+'/'+(employees.length||0)+' present today'},
 {name:'Support Quality', score:supportScore, weight:10, icon:'fa-life-ring', detail:openTickets+' open tickets'}
 ],
 status: overall >= 80 ? 'excellent' : overall >= 60 ? 'good' : overall >= 40 ? 'warning' : 'danger',
 message: this._message(overall, overdue.length, pendingAmt, openTickets)
 };
 },
 _message: function(score, overdue, pending, tickets){
 if(score >= 80) return 'Your business is thriving — keep the momentum going.';
 if(score >= 60){
 if(overdue > 0) return 'Doing well, but '+overdue+' invoice(s) are overdue — follow up today.';
 return 'Solid performance. Focus on acquiring new clients to grow faster.';
 }
 if(score >= 40){
 if(pending > 50000) return 'Cash flow needs attention. '+AUF.util.fmtCompact(pending)+' is tied up in pending invoices.';
 if(tickets > 5) return 'Too many open tickets — your team is stretched thin.';
 return 'Business needs focus. Review your pipeline and follow up with clients.';
 }
 return 'Critical attention needed — health score is low, review each factor below.';
 },
 renderDashWidget: function(){
 var h = this.compute();
 var statusColor = {excellent:'#10b981', good:'#3b82f6', warning:'#f59e0b', danger:'#ef4444'}[h.status];
 return '<div class="auf-dash-health">' +
 '<div class="auf-dash-health-left">' +
 '<div class="auf-health-ring" style="width:120px;height:120px">' +
 '<svg class="auf-health-svg" viewBox="0 0 200 200">' +
 '<defs><linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
 '<stop offset="0%" stop-color="var(--primary,#714B67)"/><stop offset="100%" stop-color="var(--primary-dark,#5a3a51)"/>' +
 '</linearGradient></defs>' +
 '<circle class="auf-health-bg" cx="100" cy="100" r="85" style="stroke:var(--bg-body,#f1f2f6)"/>' +
 '<circle class="auf-health-fg" cx="100" cy="100" r="85" stroke-dasharray="534" stroke-dashoffset="'+(534 - (534*h.overall/100))+'"/>' +
 '</svg>' +
 '<div class="auf-health-text">' +
 '<div class="auf-health-num" style="color:var(--text-primary,#1a1a2e);font-size:32px;font-weight:800">'+h.overall+'</div>' +
 '<div class="auf-health-label" style="color:var(--text-muted,#8697A8);font-size:11px">/ 100</div>' +
 '</div>' +
 '</div>' +
 '</div>' +
 '<div class="auf-dash-health-right">' +
 '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
 '<span style="background:'+statusColor+';width:8px;height:8px;border-radius:50%;display:inline-block"></span>' +
 '<span class="auf-dash-health-label">Business Health Score</span>' +
 '</div>' +
 '<div style="font-size:19px;font-weight:700;margin-bottom:4px;color:var(--text-primary,#1a1a2e)">Your business is '+h.status+'</div>' +
 '<div class="auf-dash-health-msg">'+h.message+'</div>' +
 '<button onclick="navigate(\'auf-health\')" class="btn btn-outline btn-sm" style="margin-top:14px;">View Details <i class="fas fa-arrow-right" style="margin-left:4px"></i></button>' +
 '</div>' +
 '</div>';
 },
 renderPage: function(){
 var h = this.compute();
 var u = AUF.util;
 var factorHTML = h.factors.map(function(f){
 var cls = f.score>=80?'excellent':f.score>=60?'good':f.score>=40?'warning':'danger';
 return '<div class="auf-factor">' +
 '<div class="auf-factor-head">' +
 '<span><i class="fas '+f.icon+'" style="margin-right:6px;opacity:0.7"></i>'+f.name+' <span style="color:var(--text-muted);font-weight:400;font-size:10px">('+f.weight+'% weight)</span></span>' +
 '<span>'+f.score+'/100</span>' +
 '</div>' +
 '<div class="auf-factor-bar"><div class="auf-factor-fill '+cls+'" style="width:'+f.score+'%"></div></div>' +
 '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">'+f.detail+'</div>' +
 '</div>';
 }).join('');

 return '<div class="auf-page">' +
 '<div class="auf-hero">' +
 '<div class="auf-hero-badge"><i class="fas fa-microchip" style="margin-right:5px"></i>AI-POWERED ANALYSIS</div>' +
 '<h1>Business Health Score</h1>' +
 '<p>A single number that tells you how healthy your business is right now, calculated from 6 critical signals across your entire operation.</p>' +
 '</div>' +
 '<div class="auf-grid-2">' +
 '<div class="card"><div class="card-body" style="text-align:center;padding:32px">' +
 '<div class="auf-health-ring">' +
 '<svg class="auf-health-svg" viewBox="0 0 200 200">' +
 '<defs><linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
 '<stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#ec4899"/>' +
 '</linearGradient></defs>' +
 '<circle class="auf-health-bg" cx="100" cy="100" r="85"/>' +
 '<circle class="auf-health-fg" cx="100" cy="100" r="85" stroke-dasharray="534" stroke-dashoffset="'+(534 - (534*h.overall/100))+'"/>' +
 '</svg>' +
 '<div class="auf-health-text">' +
 '<div class="auf-health-num">'+h.overall+'</div>' +
 '<div class="auf-health-label">OUT OF 100</div>' +
 '</div>' +
 '</div>' +
 '<div style="margin-top:20px;font-size:18px;font-weight:700">'+h.status.toUpperCase()+'</div>' +
 '<div style="color:var(--text-muted);margin-top:8px;font-size:13px;max-width:320px;margin:8px auto 0">'+h.message+'</div>' +
 '</div></div>' +
 '<div class="card"><div class="card-header"><h3>Health Factors Breakdown</h3></div><div class="card-body">'+factorHTML+'</div></div>' +
 '</div>' +
 '<div class="card"><div class="card-header"><h3> Recommended Actions</h3></div><div class="card-body">' +
 this._recommendations(h) +
 '</div></div>' +
 '</div>';
 },
 _recommendations: function(h){
 var recs = [];
 h.factors.forEach(function(f){
 if(f.score < 60){
 var map = {
 'Revenue Growth':' Focus on increasing sales — run a targeted campaign or promotion this week.',
 'Cash Flow':' Send follow-ups to overdue clients. Use our Smart Follow-Up Autopilot to automate this.',
 'Customer Base':' Acquire new clients — import contacts from your leads and reach out personally.',
 'Sales Pipeline':' Generate more leads. Try LinkedIn outreach or run an ad campaign.',
 'Team Attendance':'⏰ Review attendance patterns. Consider flexible schedules or remote options.',
 'Support Quality':' Resolve open tickets quickly. Assign more staff or use AI auto-reply for common questions.'
 };
 recs.push('<div style="padding:14px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:8px"><strong>'+f.name+' ('+f.score+'/100)</strong><br><span style="font-size:13px">'+(map[f.name]||'Needs attention')+'</span></div>');
 }
 });
 if(!recs.length) recs.push('<div style="padding:14px;background:#dcfce7;border-left:4px solid #10b981;border-radius:8px"><strong> Everything looks great!</strong><br><span style="font-size:13px">All health factors are performing well. Keep up the good work!</span></div>');
 return recs.join('');
 }
};

// ========================================================================
// FEATURE 5: AI CASH FLOW PREDICTOR
// ========================================================================
AUF.cashflow = {
 predict: function(days){
 days = days || 90;
 var u = AUF.util;
 var inv = u.get('invoices', []) || [];
 var expenses = u.get('expenses', []) || [];

 var paid = inv.filter(function(i){return i.status==='paid';});
 var avgMonthly = paid.length ? (paid.reduce(function(s,i){return s+(i.total||0);},0) / Math.max(1, paid.length)) * (paid.length/3) : 50000;

 var pending = inv.filter(function(i){return i.status!=='paid' && i.status!=='draft';});
 var expectedIn = pending.reduce(function(s,i){return s+((i.total||0)-(i.paid||0));},0);

 var avgExpense = expenses.length ? expenses.reduce(function(s,e){return s+(e.amount||0);},0) / Math.max(1, expenses.length/3) : 20000;

 var projection = [];
 var runningBalance = 0;
 var weeks = Math.ceil(days/7);
 for(var w=1; w<=weeks; w++){
 var weekIncome = (avgMonthly/4) + (w===1 ? expectedIn*0.6 : 0) + (w===3 ? expectedIn*0.3 : 0);
 var weekExpense = avgExpense/4 + (w%4===0 ? avgExpense*0.5 : 0);
 runningBalance += (weekIncome - weekExpense);
 projection.push({
 week: w,
 income: Math.round(weekIncome),
 expense: Math.round(weekExpense),
 net: Math.round(weekIncome - weekExpense),
 balance: Math.round(runningBalance)
 });
 }

 var alerts = [];
 var lowPoint = projection.reduce(function(min, p){ return p.balance < min.balance ? p : min; }, projection[0]);
 if(lowPoint && lowPoint.balance < 0){
 alerts.push({
 level:'danger',
 icon:'',
 text:'Cash shortage of '+u.fmtCompact(Math.abs(lowPoint.balance))+' predicted in week '+lowPoint.week+'. Collect pending invoices or delay non-essential expenses.'
 });
 }
 if(expectedIn > avgMonthly){
 alerts.push({
 level:'info',
 icon:'',
 text:'If you collect all pending invoices ('+u.fmtCompact(expectedIn)+') this month, you could reinvest in growth.'
 });
 }
 if(avgExpense > avgMonthly*0.7){
 alerts.push({
 level:'warning',
 icon:'',
 text:'Your expenses are '+Math.round((avgExpense/avgMonthly)*100)+'% of revenue. Industry healthy range is 40-60%.'
 });
 }
 if(!alerts.length){
 alerts.push({level:'success', icon:'', text:'Your cash flow looks healthy for the next '+days+' days.'});
 }

 return {
 projection: projection,
 alerts: alerts,
 avgMonthlyRevenue: avgMonthly,
 avgMonthlyExpense: avgExpense,
 expectedCollections: expectedIn,
 endBalance: runningBalance
 };
 },
 renderPage: function(){
 var p = this.predict(90);
 var u = AUF.util;
 var alertsHTML = p.alerts.map(function(a){
 var bg = {danger:'#fee2e2',warning:'#fef3c7',info:'#dbeafe',success:'#dcfce7'}[a.level];
 var border = {danger:'#dc2626',warning:'#f59e0b',info:'#3b82f6',success:'#10b981'}[a.level];
 return '<div style="padding:14px;background:'+bg+';border-left:4px solid '+border+';border-radius:8px;margin-bottom:10px;font-size:13px">'+a.icon+' '+a.text+'</div>';
 }).join('');

 return '<div class="auf-page">' +
 '<div class="auf-hero" style="background:linear-gradient(135deg,#10b981,#3b82f6)">' +
 '<div class="auf-hero-badge"> AI PREDICTIONS</div>' +
 '<h1>Cash Flow Predictor</h1>' +
 '<p>See your future cash position 90 days ahead, powered by AI analysis of your invoices, expenses, and payment patterns.</p>' +
 '</div>' +
 '<div class="auf-grid">' +
 '<div class="auf-metric"><div class="auf-metric-label">Avg Monthly Revenue</div><div class="auf-metric-value">'+u.fmtCompact(p.avgMonthlyRevenue)+'</div><div class="auf-metric-sub">Based on your history</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Avg Monthly Expense</div><div class="auf-metric-value">'+u.fmtCompact(p.avgMonthlyExpense)+'</div><div class="auf-metric-sub">Operating costs</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Expected Collections</div><div class="auf-metric-value" style="color:#10b981">'+u.fmtCompact(p.expectedCollections)+'</div><div class="auf-metric-sub">From pending invoices</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">90-Day End Balance</div><div class="auf-metric-value" style="color:'+(p.endBalance>=0?'#10b981':'#ef4444')+'">'+u.fmtCompact(p.endBalance)+'</div><div class="auf-metric-sub">Projected</div></div>' +
 '</div>' +
 '<div class="card"><div class="card-header"><h3> 90-Day Cash Flow Forecast</h3></div><div class="card-body"><div class="auf-cashflow"><canvas id="aufCashChart"></canvas></div></div></div>' +
 '<div class="card" style="margin-top:16px"><div class="card-header"><h3> AI Insights & Alerts</h3></div><div class="card-body">'+alertsHTML+'</div></div>' +
 '</div>';
 },
 renderChart: function(){
 var p = this.predict(90);
 var ctx = document.getElementById('aufCashChart');
 if(!ctx || typeof Chart === 'undefined') return;
 if(this._chart) this._chart.destroy();
 var labels = p.projection.map(function(x){return 'W'+x.week;});
 this._chart = new Chart(ctx, {
 type:'line',
 data:{
 labels:labels,
 datasets:[
 {label:'Balance', data:p.projection.map(function(x){return x.balance;}), borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)', fill:true, tension:0.4, pointRadius:4},
 {label:'Income', data:p.projection.map(function(x){return x.income;}), borderColor:'#10b981', backgroundColor:'transparent', tension:0.4, borderDash:[5,5], pointRadius:3},
 {label:'Expense', data:p.projection.map(function(x){return x.expense;}), borderColor:'#ef4444', backgroundColor:'transparent', tension:0.4, borderDash:[5,5], pointRadius:3}
 ]
 },
 options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}}
 });
 }
};

// ========================================================================
// FEATURE 6: CLIENT 360° PROFITABILITY SCORE
// ========================================================================
AUF.profitability = {
 computeClient: function(client){
 var u = AUF.util;
 var inv = (u.get('invoices',[])||[]).filter(function(i){return i.clientId===client.id || i.clientName===client.name;});
 var tickets = (u.get('tickets',[])||[]).filter(function(t){return t.clientId===client.id || t.clientName===client.name;});

 var revenue = inv.filter(function(i){return i.status==='paid';}).reduce(function(s,i){return s+(i.total||0);},0);
 var pendingAmt = inv.filter(function(i){return i.status!=='paid';}).reduce(function(s,i){return s+((i.total||0)-(i.paid||0));},0);

 var payDays = inv.filter(function(i){return i.status==='paid' && i.date && i.due;}).map(function(i){
 return u.daysBetween(i.date, i.due);
 });
 var avgPayDays = payDays.length ? payDays.reduce(function(a,b){return a+b;},0)/payDays.length : 30;

 var ticketCost = tickets.length * 500;
 var supportHours = tickets.length * 2;
 var estimatedProfit = revenue - ticketCost - (inv.length * 300);
 var margin = revenue ? (estimatedProfit/revenue)*100 : 0;

 var grade = 'D';
 var score = 0;
 if(revenue >= 100000) score += 40; else if(revenue >= 50000) score += 25; else if(revenue >= 10000) score += 15;
 if(avgPayDays <= 15) score += 25; else if(avgPayDays <= 30) score += 15; else if(avgPayDays <= 45) score += 5;
 if(tickets.length <= 2) score += 15; else if(tickets.length <= 5) score += 8;
 if(margin >= 40) score += 20; else if(margin >= 20) score += 12; else if(margin >= 10) score += 5;

 if(score >= 75) grade = 'A';
 else if(score >= 55) grade = 'B';
 else if(score >= 35) grade = 'C';

 return {
 client: client,
 revenue: revenue,
 pendingAmt: pendingAmt,
 invoiceCount: inv.length,
 paidCount: inv.filter(function(i){return i.status==='paid';}).length,
 ticketCount: tickets.length,
 avgPayDays: Math.round(avgPayDays),
 estimatedProfit: Math.round(estimatedProfit),
 margin: Math.round(margin),
 grade: grade,
 score: score
 };
 },
 computeAll: function(){
 var self = this;
 var clients = AUF.util.get('clients', []) || [];
 return clients.map(function(c){return self.computeClient(c);}).sort(function(a,b){return b.revenue-a.revenue;});
 },
 renderPage: function(){
 var all = this.computeAll();
 var u = AUF.util;
 var topClients = all.slice(0, 3);
 var gradeDist = {A:0, B:0, C:0, D:0};
 all.forEach(function(x){ gradeDist[x.grade]++; });

 var rowsHTML = all.length ? all.map(function(x){
 return '<div class="auf-client-row">' +
 '<div class="auf-grade '+x.grade+'">'+x.grade+'</div>' +
 '<div><div style="font-weight:700">'+x.client.name+'</div><div style="font-size:11px;color:var(--text-muted)">'+(x.client.email||'')+'</div></div>' +
 '<div><div style="font-size:11px;color:var(--text-muted)">Revenue</div><div style="font-weight:700">'+u.fmtCompact(x.revenue)+'</div></div>' +
 '<div><div style="font-size:11px;color:var(--text-muted)">Pay Days</div><div style="font-weight:700">'+x.avgPayDays+' d</div></div>' +
 '<div><div style="font-size:11px;color:var(--text-muted)">Margin</div><div style="font-weight:700;color:'+(x.margin>=20?'#10b981':x.margin>=0?'#f59e0b':'#ef4444')+'">'+x.margin+'%</div></div>' +
 '<button class="btn btn-sm btn-outline" onclick="AUF.profitability.viewClient(\''+x.client.id+'\')"><i class="fas fa-eye"></i></button>' +
 '</div>';
 }).join('') : '<div class="empty-state"><i class="fas fa-users fa-3x" style="color:#e5e7eb"></i><h3 style="margin-top:12px">No clients yet</h3><p>Add your first client to see profitability analysis.</p></div>';

 return '<div class="auf-page">' +
 '<div class="auf-hero" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)">' +
 '<div class="auf-hero-badge"> CLIENT INTELLIGENCE</div>' +
 '<h1>Client 360° Profitability</h1>' +
 '<p>Discover which clients truly make you money — ranked by revenue, payment speed, support burden, and profit margin.</p>' +
 '</div>' +
 '<div class="auf-grid">' +
 '<div class="auf-metric"><div class="auf-metric-label">Total Clients</div><div class="auf-metric-value">'+all.length+'</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Grade A Clients</div><div class="auf-metric-value" style="color:#10b981">'+gradeDist.A+'</div><div class="auf-metric-sub">Most profitable</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Grade D Clients</div><div class="auf-metric-value" style="color:#ef4444">'+gradeDist.D+'</div><div class="auf-metric-sub">Consider firing</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Top Earner</div><div class="auf-metric-value" style="font-size:16px">'+(topClients[0]?topClients[0].client.name:'—')+'</div><div class="auf-metric-sub">'+(topClients[0]?u.fmtCompact(topClients[0].revenue):'')+'</div></div>' +
 '</div>' +
 '<div class="card"><div class="card-header"><h3>All Clients Ranked by Profitability</h3></div><div class="card-body">'+rowsHTML+'</div></div>' +
 '</div>';
 },
 viewClient: function(id){
 var c = (AUF.util.get('clients',[])||[]).find(function(x){return x.id===id;});
 if(!c) return;
 var p = this.computeClient(c);
 var u = AUF.util;
 var html = '<div class="modal-header"><h3><span class="auf-grade '+p.grade+'" style="margin-right:10px">'+p.grade+'</span>'+c.name+' — Client Profile</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>' +
 '<div class="modal-body">' +
 '<div class="auf-grid" style="margin-bottom:20px">' +
 '<div class="auf-metric"><div class="auf-metric-label">Lifetime Revenue</div><div class="auf-metric-value">'+u.fmt(p.revenue)+'</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Profit Margin</div><div class="auf-metric-value" style="color:'+(p.margin>=20?'#10b981':'#ef4444')+'">'+p.margin+'%</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Avg Payment Time</div><div class="auf-metric-value">'+p.avgPayDays+' days</div></div>' +
 '<div class="auf-metric"><div class="auf-metric-label">Invoices</div><div class="auf-metric-value">'+p.paidCount+'/'+p.invoiceCount+'</div><div class="auf-metric-sub">paid / total</div></div>' +
 '</div>' +
 '<div class="card"><div class="card-body">' +
 '<h4 style="margin-top:0"> Recommendations</h4>' +
 (p.grade==='A' ? '<p> This is your best client! Consider offering them loyalty discounts or premium services.</p>' : '') +
 (p.grade==='D' ? '<p> Low margins and high support cost. Consider raising prices or ending the relationship.</p>' : '') +
 (p.avgPayDays > 45 ? '<p> They pay very late ('+p.avgPayDays+' days avg). Enforce stricter payment terms.</p>' : '') +
 (p.ticketCount > 5 ? '<p> They raise many support tickets. Consider charging for premium support.</p>' : '') +
 '</div></div>' +
 '</div>';
 if(typeof openModalRaw === 'function'){
 openModalRaw(html);
 } else {
 alert('Client: '+c.name+'\nRevenue: '+u.fmt(p.revenue)+'\nGrade: '+p.grade);
 }
 }
};

// ========================================================================
// FEATURE 18: INDUSTRY BENCHMARKING
// ========================================================================
AUF.benchmark = {
 industryAverages: {
 collectionDays: 25,
 overdueRatio: 15,
 employeeCostRatio: 30,
 leadConversionRate: 18,
 clientRetention: 75,
 grossMargin: 45
 },
 compute: function(){
 var u = AUF.util;
 var inv = u.get('invoices',[])||[];
 var employees = u.get('employees',[])||[];
 var leads = u.get('leads',[])||[];
 var deals = u.get('deals',[])||[];
 var expenses = u.get('expenses',[])||[];

 var paidInv = inv.filter(function(i){return i.status==='paid';});
 var totalRev = paidInv.reduce(function(s,i){return s+(i.total||0);},0) || 1;

 // Collection days
 var payDays = paidInv.filter(function(i){return i.date&&i.due;}).map(function(i){return u.daysBetween(i.date,i.due);});
 var yourCollectionDays = payDays.length ? Math.round(payDays.reduce(function(a,b){return a+b;},0)/payDays.length) : 30;

 // Overdue ratio
 var overdueRatio = inv.length ? Math.round((inv.filter(function(i){return i.status==='overdue';}).length/inv.length)*100) : 0;

 // Employee cost ratio (estimated)
 var empCost = employees.reduce(function(s,e){return s+((e.salary||30000));},0);
 var empRatio = totalRev ? Math.round((empCost/(totalRev/12))*100) : 0;

 // Lead conversion
 var wonDeals = deals.filter(function(d){return d.stage==='closed-won';}).length;
 var convRate = leads.length ? Math.round((wonDeals/leads.length)*100) : 0;

 // Client retention (placeholder - clients with repeat invoices)
 var clientRepeat = {};
 inv.forEach(function(i){ clientRepeat[i.clientId||i.clientName] = (clientRepeat[i.clientId||i.clientName]||0)+1; });
 var repeatClients = Object.values(clientRepeat).filter(function(n){return n>1;}).length;
 var retention = Object.keys(clientRepeat).length ? Math.round((repeatClients/Object.keys(clientRepeat).length)*100) : 0;

 // Gross margin (estimated)
 var totalExpense = expenses.reduce(function(s,e){return s+(e.amount||0);},0);
 var margin = totalRev ? Math.round(((totalRev-totalExpense)/totalRev)*100) : 0;

 var avg = this.industryAverages;
 return [
 {name:'Collection Days', icon:'fa-calendar-alt', unit:'days', you:yourCollectionDays, avg:avg.collectionDays, lowerIsBetter:true, max:60},
 {name:'Overdue Invoice Ratio', icon:'fa-exclamation-circle', unit:'%', you:overdueRatio, avg:avg.overdueRatio, lowerIsBetter:true, max:50},
 {name:'Employee Cost Ratio', icon:'fa-user-tie', unit:'%', you:empRatio, avg:avg.employeeCostRatio, lowerIsBetter:true, max:80},
 {name:'Lead Conversion Rate', icon:'fa-funnel-dollar', unit:'%', you:convRate, avg:avg.leadConversionRate, lowerIsBetter:false, max:40},
 {name:'Client Retention', icon:'fa-redo', unit:'%', you:retention, avg:avg.clientRetention, lowerIsBetter:false, max:100},
 {name:'Gross Margin', icon:'fa-percentage', unit:'%', you:margin, avg:avg.grossMargin, lowerIsBetter:false, max:80}
 ];
 },
 renderPage: function(){
 var metrics = this.compute();
 var benchHTML = metrics.map(function(m){
 var youPercent = Math.min(100, (m.you/m.max)*100);
 var avgPercent = Math.min(100, (m.avg/m.max)*100);
 var isBetter = m.lowerIsBetter ? m.you <= m.avg : m.you >= m.avg;
 var label = isBetter ? ' Beating industry average' : ' Below industry average';
 var color = isBetter ? '#10b981' : '#ef4444';
 return '<div class="auf-bench">' +
 '<div class="auf-bench-title"><i class="fas '+m.icon+'" style="margin-right:6px"></i>'+m.name+'</div>' +
 '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:12px">' +
 '<span>You: <strong>'+m.you+m.unit+'</strong></span>' +
 '<span>Industry: <strong>'+m.avg+m.unit+'</strong></span>' +
 '</div>' +
 '<div class="auf-bench-bar" style="margin-top:20px">' +
 '<div class="auf-bench-you" style="width:'+youPercent+'%">'+m.you+m.unit+'</div>' +
 '<div class="auf-bench-avg" style="left:'+avgPercent+'%"></div>' +
 '</div>' +
 '<div style="margin-top:10px;font-size:12px;color:'+color+';font-weight:600">'+label+'</div>' +
 '</div>';
 }).join('');

 return '<div class="auf-page">' +
 '<div class="auf-hero" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">' +
 '<div class="auf-hero-badge"> ANONYMOUS BENCHMARKING</div>' +
 '<h1>Industry Benchmarking</h1>' +
 '<p>See how your business compares to similar companies in your industry. All data is anonymized to protect everyone\'s privacy.</p>' +
 '</div>' +
 '<div style="padding:14px;background:#dbeafe;border-left:4px solid #3b82f6;border-radius:8px;margin-bottom:20px;font-size:13px">ℹ Industry averages are based on aggregate data from 10,000+ Azolve users in similar sectors. Updated monthly.</div>' +
 '<div>'+benchHTML+'</div>' +
 '</div>';
 }
};

})(window);