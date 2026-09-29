/**
 * AZOLVE UNIQUE FEATURES — ENGAGEMENT & PORTALS
 * =============================================
 * Gamification + Client Portal + Field Sales + OKRs
 * + Multi-Business + Command Center Widget
 */
(function(global){
'use strict';
var AUF = global.AUF = global.AUF || {};
var u = AUF.util;

// ========================================================================
// FEATURE 9: EMPLOYEE GAMIFICATION & LEADERBOARDS
// ========================================================================
AUF.gamify = {
    getPoints: function(empId){
        var pts = u.get('auf_points', {}) || {};
        return pts[empId] || { total: 0, badges: [], streak: 0, achievements: [] };
    },
    _seedDemo: function(employees){
        var existing = u.get('auf_points', null);
        if(existing) return;
        var demo = {};
        var names = ['Rajesh Kumar','Priya Sharma','Amit Patel','Sneha Desai','Vikram Singh'];
        (employees.length ? employees : names.map(function(n,i){return{id:'emp_'+i, name:n};})).forEach(function(e,i){
            demo[e.id] = {
                total: [2450, 1980, 1720, 1340, 980, 750, 520][i] || Math.floor(Math.random()*2000+300),
                badges: i===0 ? ['🏆 Top Closer','🔥 Hot Streak','💎 Elite'] : i===1 ? ['⚡ Speed Demon','🎯 On Target'] : i===2 ? ['🌟 Rising Star'] : [],
                streak: [32, 28, 15, 22, 8, 5, 2][i] || 0,
                achievements: []
            };
        });
        u.set('auf_points', demo);
    },
    getLeaderboard: function(){
        var employees = u.get('employees', []) || [];
        if(employees.length === 0){
            employees = [
                {id:'emp_1', name:'Rajesh Kumar', designation:'Sales Manager', department:'Sales'},
                {id:'emp_2', name:'Priya Sharma', designation:'Senior Sales Executive', department:'Sales'},
                {id:'emp_3', name:'Amit Patel', designation:'Support Lead', department:'Support'},
                {id:'emp_4', name:'Sneha Desai', designation:'Account Manager', department:'Sales'},
                {id:'emp_5', name:'Vikram Singh', designation:'Sales Executive', department:'Sales'}
            ];
        }
        this._seedDemo(employees);
        var points = u.get('auf_points', {}) || {};
        var self = this;
        return employees.map(function(e){
            var p = points[e.id] || self.getPoints(e.id);
            return Object.assign({}, e, p);
        }).sort(function(a,b){return b.total - a.total;});
    },
    renderPage: function(){
        var lb = this.getLeaderboard();
        var rowsHTML = lb.map(function(e, i){
            var rankCls = i===0?'r1':i===1?'r2':i===2?'r3':'rn';
            var rankLabel = i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1);
            var badges = (e.badges||[]).slice(0,3).map(function(b){return '<span class="auf-lb-badge">'+b+'</span>';}).join('');
            var streak = e.streak>0 ? '<span class="auf-streak">🔥 '+e.streak+' day streak</span>' : '';
            return '<div class="auf-lb-row">' +
                '<div class="auf-lb-rank '+rankCls+'">'+rankLabel+'</div>' +
                '<div><div class="auf-lb-name">'+e.name+'</div><div class="auf-lb-stats">'+(e.designation||'Employee')+' · '+(e.department||'')+'</div><div style="margin-top:4px">'+badges+' '+streak+'</div></div>' +
                '<div style="text-align:right"><div class="auf-lb-points">'+e.total.toLocaleString()+'</div><div style="font-size:10px;color:var(--text-muted)">points</div></div>' +
            '</div>';
        }).join('');

        var top3 = lb.slice(0,3);
        var podiumHTML = top3.length>=3 ? (
            '<div style="display:flex;justify-content:center;align-items:flex-end;gap:14px;padding:30px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:16px;margin-bottom:24px">' +
                '<div style="text-align:center">' +
                    '<div style="width:80px;height:80px;border-radius:50%;background:#cbd5e1;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;margin:0 auto 8px;color:#fff">2</div>' +
                    '<div style="font-weight:700;font-size:13px">'+top3[1].name+'</div>' +
                    '<div style="font-size:11px;color:#64748b">'+top3[1].total.toLocaleString()+' pts</div>' +
                    '<div style="width:100px;height:80px;background:#cbd5e1;margin-top:10px;border-radius:8px 8px 0 0"></div>' +
                '</div>' +
                '<div style="text-align:center">' +
                    '<div style="font-size:28px;margin-bottom:4px">👑</div>' +
                    '<div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;margin:0 auto 8px;color:#fff;box-shadow:0 8px 20px rgba(245,158,11,0.4)">1</div>' +
                    '<div style="font-weight:800;font-size:14px">'+top3[0].name+'</div>' +
                    '<div style="font-size:12px;color:#92400e;font-weight:600">'+top3[0].total.toLocaleString()+' pts</div>' +
                    '<div style="width:120px;height:110px;background:linear-gradient(180deg,#fbbf24,#f59e0b);margin-top:10px;border-radius:8px 8px 0 0"></div>' +
                '</div>' +
                '<div style="text-align:center">' +
                    '<div style="width:70px;height:70px;border-radius:50%;background:#f97316;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;margin:0 auto 8px;color:#fff">3</div>' +
                    '<div style="font-weight:700;font-size:13px">'+top3[2].name+'</div>' +
                    '<div style="font-size:11px;color:#64748b">'+top3[2].total.toLocaleString()+' pts</div>' +
                    '<div style="width:90px;height:60px;background:#f97316;margin-top:10px;border-radius:8px 8px 0 0"></div>' +
                '</div>' +
            '</div>'
        ) : '';

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#f59e0b,#ec4899)">' +
                '<div class="auf-hero-badge">🏆 GAMIFICATION</div>' +
                '<h1>Employee Leaderboards & Rewards</h1>' +
                '<p>Make work fun! Earn points, unlock badges, build streaks. Monthly winners get real rewards.</p>' +
            '</div>' +
            podiumHTML +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Players</div><div class="auf-metric-value">'+lb.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Points Earned</div><div class="auf-metric-value">'+lb.reduce(function(s,e){return s+e.total;},0).toLocaleString()+'</div><div class="auf-metric-sub">This month</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Longest Streak</div><div class="auf-metric-value" style="color:#ef4444">🔥 '+(lb[0]?lb[0].streak:0)+'</div><div class="auf-metric-sub">'+(lb[0]?lb[0].name:'')+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Badges Unlocked</div><div class="auf-metric-value">'+lb.reduce(function(s,e){return s+(e.badges||[]).length;},0)+'</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>🏅 Full Leaderboard</h3></div><div class="card-body">'+rowsHTML+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>🎯 How to Earn Points</h3></div><div class="card-body">' +
                    '<div style="display:grid;gap:8px;font-size:13px">' +
                        '<div style="padding:10px;background:#f0fdf4;border-radius:8px;display:flex;justify-content:space-between"><span>💰 Close a deal</span><strong>+100 pts</strong></div>' +
                        '<div style="padding:10px;background:#f0f9ff;border-radius:8px;display:flex;justify-content:space-between"><span>📄 Send invoice</span><strong>+10 pts</strong></div>' +
                        '<div style="padding:10px;background:#fef3c7;border-radius:8px;display:flex;justify-content:space-between"><span>✅ Resolve ticket</span><strong>+25 pts</strong></div>' +
                        '<div style="padding:10px;background:#fce7f3;border-radius:8px;display:flex;justify-content:space-between"><span>🎯 Convert a lead</span><strong>+75 pts</strong></div>' +
                        '<div style="padding:10px;background:#ede9fe;border-radius:8px;display:flex;justify-content:space-between"><span>⏰ On-time attendance</span><strong>+5 pts/day</strong></div>' +
                        '<div style="padding:10px;background:#ffe4e6;border-radius:8px;display:flex;justify-content:space-between"><span>🔥 Keep daily streak</span><strong>+2x multiplier</strong></div>' +
                    '</div>' +
                '</div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 11: CLIENT SELF-SERVICE PORTAL
// ========================================================================
AUF.clientPortal = {
    renderPage: function(){
        var clients = u.get('clients',[])||[];
        var clientsHTML = clients.slice(0,5).map(function(c){
            var token = btoa((c.id||c.name)+':'+Date.now()).substring(0,20);
            return '<div class="auf-rule">' +
                '<div style="flex:1"><strong>'+c.name+'</strong><br><span style="font-size:11px;color:var(--text-muted)">'+(c.email||'')+'</span></div>' +
                '<button class="btn btn-sm btn-outline" onclick="navigator.clipboard&&navigator.clipboard.writeText(\'https://azolve.io/portal/'+token+'\');AUF.util.toast(\'Portal link copied!\',\'success\')"><i class="fas fa-link"></i> Copy Link</button>' +
                '<button class="btn btn-sm btn-primary" onclick="AUF.clientPortal.preview(\''+(c.id||c.name)+'\')"><i class="fas fa-eye"></i> Preview</button>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#0ea5e9,#3b82f6)">' +
                '<div class="auf-hero-badge">🌐 CLIENT PORTAL</div>' +
                '<h1>Client Self-Service Portal</h1>' +
                '<p>Give each client their own login. They can see invoices, download receipts, raise tickets & track projects — without calling you.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Client Logins</div><div class="auf-metric-value">'+clients.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Active This Month</div><div class="auf-metric-value">'+Math.floor(clients.length*0.7)+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Tickets Raised via Portal</div><div class="auf-metric-value">12</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Invoices Downloaded</div><div class="auf-metric-value">47</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>👥 Client Portal Access</h3></div><div class="card-body">'+(clientsHTML||'<p style="color:var(--text-muted)">Add clients to enable portal access</p>')+'</div></div>' +
                '<div class="card"><div class="card-header"><h3>✨ Portal Features</h3></div><div class="card-body">' +
                    '<div style="display:grid;gap:8px;font-size:13px">' +
                        '<div style="padding:10px;background:#f0f9ff;border-radius:8px"><i class="fas fa-file-invoice" style="color:#0284c7;margin-right:8px"></i>View all invoices & payment history</div>' +
                        '<div style="padding:10px;background:#f0fdf4;border-radius:8px"><i class="fas fa-download" style="color:#16a34a;margin-right:8px"></i>Download any invoice/receipt PDF</div>' +
                        '<div style="padding:10px;background:#fef3c7;border-radius:8px"><i class="fas fa-credit-card" style="color:#d97706;margin-right:8px"></i>Pay outstanding invoices online</div>' +
                        '<div style="padding:10px;background:#fce7f3;border-radius:8px"><i class="fas fa-life-ring" style="color:#db2777;margin-right:8px"></i>Raise support tickets directly</div>' +
                        '<div style="padding:10px;background:#ede9fe;border-radius:8px"><i class="fas fa-tasks" style="color:#7c3aed;margin-right:8px"></i>Track project progress real-time</div>' +
                        '<div style="padding:10px;background:#ffe4e6;border-radius:8px"><i class="fas fa-folder-open" style="color:#e11d48;margin-right:8px"></i>Access shared documents</div>' +
                    '</div>' +
                '</div></div>' +
            '</div>' +
        '</div>';
    },
    preview: function(clientId){
        var c = (u.get('clients',[])||[]).find(function(x){return x.id===clientId||x.name===clientId;});
        if(!c) c = {name:'Demo Client'};
        var inv = (u.get('invoices',[])||[]).filter(function(i){return i.clientId===clientId || i.clientName===c.name;}).slice(0,3);
        var invHTML = inv.map(function(i){
            var sc = {paid:'#10b981',pending:'#f59e0b',overdue:'#ef4444',draft:'#94a3b8'}[i.status]||'#94a3b8';
            return '<div style="padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center"><div><strong>'+i.number+'</strong><br><span style="font-size:11px;color:#64748b">'+(i.date||'')+'</span></div><div style="text-align:right"><div style="font-weight:700">'+u.fmt(i.total)+'</div><div style="font-size:10px;color:'+sc+';text-transform:uppercase;font-weight:700">'+i.status+'</div></div></div>';
        }).join('') || '<p style="color:#94a3b8">No invoices yet</p>';

        var win = window.open('', '_blank', 'width=900,height=700');
        if(!win) return AUF.util.toast('Popup blocked — please allow popups', 'warning');
        win.document.write('<html><head><title>Client Portal Preview</title><style>body{font-family:system-ui;margin:0;background:#f1f5f9}.hdr{background:linear-gradient(135deg,#0ea5e9,#3b82f6);color:#fff;padding:24px}.main{max-width:900px;margin:20px auto;padding:0 16px}.card{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05)}</style></head><body>' +
            '<div class="hdr"><h1 style="margin:0;font-size:22px">Welcome back, '+c.name+' 👋</h1><p style="margin:4px 0 0;opacity:0.9;font-size:13px">Your self-service portal</p></div>' +
            '<div class="main">' +
                '<div class="card"><h3 style="margin-top:0">💳 Your Invoices</h3>'+invHTML+'</div>' +
                '<div class="card"><h3 style="margin-top:0">🎧 Need Help?</h3><button style="background:#3b82f6;color:#fff;padding:10px 16px;border:none;border-radius:8px;font-weight:600;cursor:pointer" onclick="if(typeof navigate===\'function\'){win.close();navigate(\'support\');}">Raise Support Ticket</button></div>' +
                '<div class="card"><h3 style="margin-top:0">📁 Shared Documents</h3><p style="color:#94a3b8">No documents shared yet</p></div>' +
            '</div></body></html>');
        win.document.close();
    }
};

// ========================================================================
// FEATURE 13: LIVE FIELD SALES TRACKER
// ========================================================================
AUF.fieldSales = {
    _reps: [
        {id:'f1', name:'Rajesh Kumar', status:'online', lastCheckIn:'Acme Corp HQ, Mumbai', time:'10:45 AM', visits:4, left:'120 km', earned:3200, x:25, y:35},
        {id:'f2', name:'Priya Sharma', status:'online', lastCheckIn:'TechStart Office, Pune', time:'11:20 AM', visits:3, left:'85 km', earned:2100, x:45, y:55},
        {id:'f3', name:'Amit Patel', status:'online', lastCheckIn:'Global Solutions, Mumbai', time:'09:30 AM', visits:5, left:'140 km', earned:4800, x:30, y:45},
        {id:'f4', name:'Sneha Desai', status:'offline', lastCheckIn:'Design Hub, Pune', time:'Yesterday 5:30 PM', visits:2, left:'60 km', earned:1500, x:60, y:70},
        {id:'f5', name:'Vikram Singh', status:'online', lastCheckIn:'Cloud Nine, Bangalore', time:'12:15 PM', visits:6, left:'180 km', earned:5600, x:75, y:25}
    ],
    renderPage: function(){
        var online = this._reps.filter(function(r){return r.status==='online';}).length;
        var totalVisits = this._reps.reduce(function(s,r){return s+r.visits;},0);
        var totalDistance = this._reps.reduce(function(s,r){return s+parseInt(r.left);},0);

        var pinsHTML = this._reps.map(function(r){
            return '<div class="auf-pin '+r.status+'" style="left:'+r.x+'%;top:'+r.y+'%" title="'+r.name+'" onclick="AUF.fieldSales.viewRep(\''+r.id+'\')"><i class="fas fa-user"></i></div>';
        }).join('');

        var repsHTML = this._reps.map(function(r){
            var sc = r.status==='online' ? '#10b981' : '#94a3b8';
            return '<div class="auf-rule" style="margin-bottom:8px">' +
                '<div style="flex:1"><strong>'+r.name+'</strong> <span style="display:inline-block;width:8px;height:8px;background:'+sc+';border-radius:50%;margin-left:6px"></span><br><span style="font-size:11px;color:var(--text-muted)"><i class="fas fa-map-marker-alt"></i> '+r.lastCheckIn+' · '+r.time+'</span></div>' +
                '<div style="text-align:right;font-size:11px;color:var(--text-muted)"><div>'+r.visits+' visits</div><div>'+r.left+'</div></div>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#059669,#10b981)">' +
                '<div class="auf-hero-badge">🗺️ FIELD FORCE</div>' +
                '<h1>Live Field Sales Tracker</h1>' +
                '<p>See where every sales rep is in real-time. Track client visits, auto-calculate travel expenses from GPS.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Online Reps</div><div class="auf-metric-value" style="color:#10b981">'+online+'/'+this._reps.length+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Visits Today</div><div class="auf-metric-value">'+totalVisits+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Distance Covered</div><div class="auf-metric-value">'+totalDistance+' km</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Revenue Generated</div><div class="auf-metric-value" style="color:#10b981">'+u.fmtCompact(this._reps.reduce(function(s,r){return s+r.earned;},0))+'</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>🗺️ Live Rep Locations</h3></div><div class="card-body">' +
                    '<div class="auf-map">' +
                        '<div style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,0.9);padding:6px 10px;border-radius:6px;font-size:11px;font-weight:700;backdrop-filter:blur(10px)">📍 India Region</div>' +
                        pinsHTML +
                        '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><line x1="25%" y1="35%" x2="30%" y2="45%" stroke="#6366f1" stroke-width="2" stroke-dasharray="4 4"/></svg>' +
                    '</div>' +
                    '<div style="display:flex;gap:12px;margin-top:12px;font-size:11px;color:var(--text-muted)">' +
                        '<span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:50%;margin-right:4px"></span>Online</span>' +
                        '<span><span style="display:inline-block;width:10px;height:10px;background:#94a3b8;border-radius:50%;margin-right:4px"></span>Offline</span>' +
                        '<span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;margin-right:4px"></span>Alert</span>' +
                    '</div>' +
                '</div></div>' +
                '<div class="card"><div class="card-header"><h3>👥 Reps Status</h3></div><div class="card-body">'+repsHTML+'</div></div>' +
            '</div>' +
            '<div class="card" style="margin-top:16px"><div class="card-header"><h3>🚨 Smart Alerts</h3></div><div class="card-body">' +
                '<div style="padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:8px;font-size:13px">⚠️ <strong>Sneha Desai</strong> hasn\'t checked in for 18 hours. Contact her or assign backup.</div>' +
                '<div style="padding:12px;background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;margin-bottom:8px;font-size:13px">🚨 <strong>Vikram Singh</strong> covered 180 km today — unusual travel. Verify route.</div>' +
                '<div style="padding:12px;background:#dcfce7;border-left:4px solid #10b981;border-radius:8px;font-size:13px">✅ <strong>Amit Patel</strong> hit daily visit target (5 visits). Auto-awarded 50 points 🏆</div>' +
            '</div></div>' +
        '</div>';
    },
    viewRep: function(id){
        var r = this._reps.find(function(x){return x.id===id;});
        if(!r) return;
        AUF.util.toast(r.name+' is at '+r.lastCheckIn, 'info');
    }
};

// ========================================================================
// FEATURE 14: BUSINESS COMMAND CENTER (Mobile Widget preview)
// ========================================================================
AUF.commandCenter = {
    renderPage: function(){
        var inv = u.get('invoices',[])||[];
        var todayRev = inv.filter(function(i){return i.status==='paid' && (i.date||'').substring(0,7)===new Date().toISOString().substring(0,7);}).reduce(function(s,i){return s+i.total;},0);
        var dueToday = inv.filter(function(i){return i.due === new Date().toISOString().split('T')[0];}).length;
        var overdue = inv.filter(function(i){return i.status==='overdue';}).length;

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#1e293b,#475569)">' +
                '<div class="auf-hero-badge">📱 MOBILE COMMAND CENTER</div>' +
                '<h1>Business at a Glance</h1>' +
                '<p>Home screen widget for iOS & Android. See your entire business pulse without opening the app.</p>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-body" style="text-align:center;padding:40px">' +
                    '<div style="display:inline-block;width:320px;height:640px;background:#000;border-radius:40px;padding:12px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3)">' +
                        '<div style="background:linear-gradient(135deg,#667eea,#764ba2);height:100%;border-radius:30px;padding:16px;overflow:hidden">' +
                            '<div style="text-align:center;color:#fff;font-size:11px;opacity:0.7;margin-bottom:10px">9:41 AM · Monday</div>' +
                            '<div class="auf-cc-widget">' +
                                '<div class="auf-cc-title">Azolve Business Pulse</div>' +
                                '<div class="auf-cc-grid">' +
                                    '<div class="auf-cc-stat"><div class="auf-cc-stat-label">Today Revenue</div><div class="auf-cc-stat-val" style="color:#10b981">'+u.fmtCompact(todayRev)+'</div></div>' +
                                    '<div class="auf-cc-stat"><div class="auf-cc-stat-label">Due Today</div><div class="auf-cc-stat-val">'+dueToday+'</div></div>' +
                                    '<div class="auf-cc-stat"><div class="auf-cc-stat-label">Overdue</div><div class="auf-cc-stat-val" style="color:#ef4444">'+overdue+'</div></div>' +
                                    '<div class="auf-cc-stat"><div class="auf-cc-stat-label">Pending Approvals</div><div class="auf-cc-stat-val">3</div></div>' +
                                '</div>' +
                            '</div>' +
                            '<div style="background:rgba(255,255,255,0.95);border-radius:14px;padding:16px;margin-top:14px">' +
                                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
                                    '<button style="padding:12px;border:none;border-radius:10px;background:#6366f1;color:#fff;font-weight:700;font-size:12px" onclick="if(typeof openModal===\'function\')openModal(\'createInvoice\')">+ New Invoice</button>' +
                                    '<button style="padding:12px;border:none;border-radius:10px;background:#10b981;color:#fff;font-weight:700;font-size:12px" onclick="AUF.util.toast(\'Record payment: go to Invoices → mark as paid\',\'info\')">💰 Record Pay</button>' +
                                    '<button style="padding:12px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;font-size:12px" onclick="if(typeof navigate===\'function\')navigate(\'auf-ocr\')">📸 Scan Bill</button>' +
                                    '<button style="padding:12px;border:none;border-radius:10px;background:#ec4899;color:#fff;font-weight:700;font-size:12px" onclick="if(typeof navigate===\'function\')navigate(\'auf-voice\')">🎤 Voice Cmd</button>' +
                                '</div>' +
                            '</div>' +
                            '<div style="color:rgba(255,255,255,0.9);font-size:11px;text-align:center;margin-top:20px">Tap widget to open Azolve</div>' +
                        '</div>' +
                        '<div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);width:80px;height:22px;background:#000;border-radius:0 0 15px 15px"></div>' +
                    '</div>' +
                    '<div style="margin-top:20px;display:flex;gap:10px;justify-content:center"><button class="btn btn-primary" onclick="AUF.util.toast(\'iOS Widget coming soon! Follow us on App Store for updates.\',\'info\')"><i class="fab fa-apple"></i> iOS Widget</button><button class="btn btn-primary" style="background:#3ddc84" onclick="AUF.util.toast(\'Android Widget coming soon! Follow us on Play Store for updates.\',\'info\')"><i class="fab fa-google-play"></i> Android Widget</button></div>' +
                '</div></div>' +
                '<div><div class="card"><div class="card-header"><h3>🎯 What\'s On The Widget</h3></div><div class="card-body">' +
                    '<div style="display:grid;gap:10px;font-size:13px">' +
                        '<div style="padding:12px;background:#f0fdf4;border-radius:8px"><strong>💰 Today\'s Revenue</strong><br><span style="font-size:12px;color:var(--text-muted)">Live revenue counter — updates in real-time</span></div>' +
                        '<div style="padding:12px;background:#fef3c7;border-radius:8px"><strong>⏰ Invoices Due Today</strong><br><span style="font-size:12px;color:var(--text-muted)">Quick view of what needs collecting</span></div>' +
                        '<div style="padding:12px;background:#fee2e2;border-radius:8px"><strong>🚨 Overdue Alerts</strong><br><span style="font-size:12px;color:var(--text-muted)">Red flag for payments late 7+ days</span></div>' +
                        '<div style="padding:12px;background:#ede9fe;border-radius:8px"><strong>✅ Pending Approvals</strong><br><span style="font-size:12px;color:var(--text-muted)">Expenses, leaves, orders awaiting you</span></div>' +
                        '<div style="padding:12px;background:#fce7f3;border-radius:8px"><strong>⚡ Quick Actions</strong><br><span style="font-size:12px;color:var(--text-muted)">One-tap to create invoice, scan bill, or voice command</span></div>' +
                    '</div>' +
                '</div></div></div>' +
            '</div>' +
        '</div>';
    }
};

})(window);