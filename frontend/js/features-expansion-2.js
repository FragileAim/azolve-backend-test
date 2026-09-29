// ═══════════════════════════════════════════════════════════════════════════
// AZOLVE CRM — Feature Expansion Pack (Part 2)
// AI, Workflows, Analytics, Security, Integrations, Portals, HR, Docs, E-Com
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 9. AI SALES ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════
function renderAIAssistant() {
    const c=document.getElementById('aiAssistantContainer');if(!c)return;
    const leads=DB.get('leads',[]);const deals=DB.get('deals',[]);const tasks=DB.get('tasks',[]);
    const aiInsights=[
        {icon:'🎯',title:'Lead Scoring Update',desc:`${leads.length>0?leads[0].name||'Top lead':'New lead'} has high engagement — consider scheduling a demo call today.`,priority:'high',action:'Schedule Call'},
        {icon:'📈',title:'Deal Closure Prediction',desc:`Based on activity patterns, there's an 78% probability the "Enterprise Plan" deal closes this week.`,priority:'high',action:'View Deal'},
        {icon:'⚡',title:'Smart Task Assignment',desc:'3 overdue tasks detected. Recommend reassigning to team members with lower workload.',priority:'medium',action:'Review Tasks'},
        {icon:'📊',title:'Revenue Forecast',desc:'Projected revenue for April: ₹4,50,000 based on pipeline analysis. 12% above target.',priority:'low',action:'View Forecast'},
        {icon:'💬',title:'Follow-up Reminder',desc:'5 leads haven\'t been contacted in 7+ days. Auto-generated follow-up emails ready for review.',priority:'medium',action:'View Emails'},
        {icon:'🔄',title:'Churn Risk Alert',desc:'Client "Global Solutions" shows declining engagement. Recommend proactive outreach.',priority:'high',action:'Contact Client'},
    ];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">AI Assistant</h1><p class="page-subtitle">AI-powered insights, predictions & automation</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="refreshAIInsights()"><i class="fas fa-sync-alt"></i> Refresh</button></div></div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div>
            <div class="card" style="margin-bottom:16px"><div class="card-header"><h3><i class="fas fa-robot" style="color:#7c3aed;margin-right:8px"></i>AI Insights & Recommendations</h3></div>
            <div class="card-body">${aiInsights.map(i=>`
                <div style="display:flex;gap:12px;padding:14px;border-bottom:1px solid var(--border);align-items:flex-start">
                    <div style="font-size:28px;flex-shrink:0">${i.icon}</div>
                    <div style="flex:1">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <strong style="font-size:14px">${i.title}</strong>
                            <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${i.priority==='high'?'#ffebee':i.priority==='medium'?'#fff3e0':'#e8f5e9'};color:${i.priority==='high'?'#c62828':i.priority==='medium'?'#e65100':'#2e7d32'}">${i.priority}</span>
                        </div>
                        <p style="font-size:13px;color:var(--text-secondary);margin:4px 0 8px;line-height:1.5">${i.desc}</p>
                        <button class="btn btn-sm btn-outline" onclick="showToast('${i.action} — AI action triggered','success')"><i class="fas fa-bolt"></i> ${i.action}</button>
                    </div>
                </div>`).join('')}</div></div>
            <div class="card"><div class="card-header"><h3><i class="fas fa-comments" style="color:#0b6bcb;margin-right:8px"></i>AI Chat</h3></div>
            <div class="card-body">
                <div id="aiChatLog" style="height:200px;overflow-y:auto;padding:12px;background:var(--bg-body);border-radius:var(--radius);margin-bottom:12px;font-size:13px">
                    <div style="margin-bottom:8px"><strong style="color:#7c3aed">🤖 AI:</strong> Hello! I'm your AI sales assistant. Ask me about leads, deals, revenue predictions, or anything else.</div>
                </div>
                <div style="display:flex;gap:8px"><input class="form-control" id="aiChatInput" placeholder="Ask AI anything... e.g. 'Which leads should I follow up today?'" onkeydown="if(event.key==='Enter')sendAIChat()" style="flex:1"><button class="btn btn-primary" onclick="sendAIChat()"><i class="fas fa-paper-plane"></i></button></div>
            </div></div>
        </div>
        <div>
            <div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Deal Probability</h3></div><div class="card-body">
                ${(deals.length?deals.slice(0,5):[ {name:'Enterprise Plan',value:250000},{name:'Startup Pack',value:49999},{name:'Custom Solution',value:175000}]).map((d,i)=>{
                    const prob=[78,62,45,88,33][i]||50;
                    return `<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${d.name||'Deal '+(i+1)}</span><span style="font-weight:600;color:${prob>70?'#2e7d32':prob>50?'#e65100':'#c62828'}">${prob}%</span></div><div style="height:6px;background:var(--border);border-radius:3px;margin-top:4px"><div style="height:100%;width:${prob}%;background:${prob>70?'#2e7d32':prob>50?'#f39c12':'#e74c3c'};border-radius:3px;transition:width 0.5s"></div></div></div>`;
                }).join('')}
            </div></div>
            <div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Workload Distribution</h3></div><div class="card-body">
                ${['Admin','Rajesh','Priya','Amit'].map((name,i)=>{
                    const load=[85,45,62,30][i];
                    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:32px;height:32px;border-radius:50%;background:${['#0b6bcb','#7c3aed','#e65100','#2e7d32'][i]};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">${name[0]}</div><div style="flex:1"><div style="font-size:12px;display:flex;justify-content:space-between"><span>${name}</span><span>${load}%</span></div><div style="height:4px;background:var(--border);border-radius:2px;margin-top:3px"><div style="height:100%;width:${load}%;background:${load>70?'#e74c3c':load>50?'#f39c12':'#2e7d32'};border-radius:2px"></div></div></div></div>`;
                }).join('')}
            </div></div>
            <div class="card"><div class="card-header"><h3>AI Chatbot Stats</h3></div><div class="card-body" style="text-align:center">
                <div style="font-size:36px;font-weight:700;color:#7c3aed">94%</div>
                <div style="font-size:12px;color:var(--text-secondary)">Support queries auto-resolved</div>
                <div style="margin-top:12px;font-size:13px"><strong>127</strong> queries handled today</div>
            </div></div>
        </div>
    </div>`;
}

function sendAIChat(){
    const input=document.getElementById('aiChatInput');const log=document.getElementById('aiChatLog');
    if(!input||!log||!input.value.trim())return;
    const q=input.value.trim();
    log.innerHTML+=`<div style="margin-bottom:8px;text-align:right"><strong style="color:#0b6bcb">You:</strong> ${q}</div>`;
    input.value='';
    const responses={'lead':' Based on engagement scoring, I recommend prioritizing leads with >70% activity in the last 7 days. Currently 3 leads meet this criteria.','deal':' Your pipeline shows 5 active deals worth ₹7.5L total. The "Enterprise Plan" deal has the highest closure probability at 78%.','revenue':' Current month revenue is tracking 15% above forecast. Q4 projection looks strong at ₹18.5L.','task':' There are 3 overdue tasks. I suggest reassigning 2 to Priya (30% workload) from Rajesh (85% workload).','follow':' 5 leads need follow-up. I\'ve drafted personalized emails for each — check the Email module.'};
    const key=Object.keys(responses).find(k=>q.toLowerCase().includes(k));
    setTimeout(()=>{log.innerHTML+=`<div style="margin-bottom:8px"><strong style="color:#7c3aed">🤖 AI:</strong>${key?responses[key]:' I analyzed your query. Based on current data patterns, I recommend reviewing the dashboard metrics and scheduling follow-ups with your top 5 leads. Would you like me to generate a detailed report?'}</div>`;log.scrollTop=log.scrollHeight;},800);
}
function refreshAIInsights(){showToast('AI insights refreshed with latest data','success');renderAIAssistant();}


// ═══════════════════════════════════════════════════════════════════════════
// 10. WORKFLOW BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function renderWorkflows() {
    const c=document.getElementById('workflowsContainer');if(!c)return;
    const workflows=DB.get('workflows_list',[
        {id:'WF001',name:'Lead → Deal Conversion',trigger:'Lead status = Qualified',action:'Create Deal + Notify Sales',enabled:true,runs:45,lastRun:'2026-03-26'},
        {id:'WF002',name:'Invoice Overdue Alert',trigger:'Invoice overdue > 7 days',action:'Send reminder email + Create task',enabled:true,runs:12,lastRun:'2026-03-25'},
        {id:'WF003',name:'New Client Welcome',trigger:'New client created',action:'Send welcome email + Create onboarding task',enabled:true,runs:8,lastRun:'2026-03-24'},
        {id:'WF004',name:'Task Overdue Escalation',trigger:'Task overdue > 3 days',action:'Notify manager + Reassign priority',enabled:false,runs:0,lastRun:''},
        {id:'WF005',name:'Low Stock Auto-Order',trigger:'Inventory qty < reorder level',action:'Create purchase order draft',enabled:true,runs:6,lastRun:'2026-03-23'},
        {id:'WF006',name:'Deal Won → Invoice',trigger:'Deal stage = Won',action:'Auto-generate invoice from deal',enabled:true,runs:15,lastRun:'2026-03-26'},
    ]);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Workflow Builder</h1><p class="page-subtitle">No-code automation — If this, then that</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openWorkflowForm()"><i class="fas fa-plus"></i> Create Workflow</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-project-diagram"></i></div><div class="stat-info"><span class="stat-value">${workflows.length}</span><span class="stat-label">Total Workflows</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-play-circle"></i></div><div class="stat-info"><span class="stat-value">${workflows.filter(w=>w.enabled).length}</span><span class="stat-label">Active</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-bolt"></i></div><div class="stat-info"><span class="stat-value">${workflows.reduce((s,w)=>s+w.runs,0)}</span><span class="stat-label">Total Executions</span></div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px">
    ${workflows.map(w=>`
        <div class="card" style="border-left:4px solid ${w.enabled?'#2e7d32':'#9e9e9e'}">
            <div class="card-body" style="padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <h4 style="margin:0;font-size:15px">${w.name}</h4>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:var(--text-secondary)">
                        <input type="checkbox" ${w.enabled?'checked':''} onchange="toggleWorkflow('${w.id}',this.checked)" style="width:16px;height:16px"> ${w.enabled?'Active':'Disabled'}
                    </label>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:12px">
                    <div style="flex:1;padding:10px;background:var(--bg-body);border-radius:var(--radius);font-size:12px">
                        <div style="font-weight:600;color:var(--text-secondary);margin-bottom:4px;font-size:10px;text-transform:uppercase">⚡ When</div>
                        ${w.trigger}
                    </div>
                    <div style="display:flex;align-items:center;font-size:18px;color:var(--text-muted)">→</div>
                    <div style="flex:1;padding:10px;background:var(--bg-body);border-radius:var(--radius);font-size:12px">
                        <div style="font-weight:600;color:var(--text-secondary);margin-bottom:4px;font-size:10px;text-transform:uppercase">🎯 Then</div>
                        ${w.action}
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-secondary)">
                    <span>Executed ${w.runs} times</span>
                    <span>${w.lastRun?'Last: '+w.lastRun:'Never run'}</span>
                    <button class="btn btn-sm btn-outline" onclick="testWorkflow('${w.id}')"><i class="fas fa-play"></i> Test</button>
                </div>
            </div>
        </div>`).join('')}</div>`;
}

function openWorkflowForm(){
    openModalRaw(`<div class="modal-header"><h3><i class="fas fa-project-diagram" style="color:#7b1fa2;margin-right:8px"></i>Create Workflow</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <div class="form-group"><label>Workflow Name</label><input class="form-control" id="wf_name" placeholder="e.g. Lead Follow-up Reminder"></div>
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:end">
            <div class="form-group"><label>⚡ WHEN (Trigger)</label><select class="form-control" id="wf_trigger">
                <option>Lead status changes</option><option>Deal stage changes</option><option>Invoice becomes overdue</option><option>Task becomes overdue</option><option>New client created</option><option>Inventory below reorder</option><option>Expense submitted</option><option>Support ticket created</option>
            </select></div>
            <div style="font-size:24px;color:var(--text-muted);padding-bottom:8px">→</div>
            <div class="form-group"><label>🎯 THEN (Action)</label><select class="form-control" id="wf_action">
                <option>Send email notification</option><option>Create task</option><option>Create invoice</option><option>Create deal</option><option>Create purchase order</option><option>Update status</option><option>Notify team member</option><option>Log to audit</option>
            </select></div>
        </div>
    </div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveWorkflow()">Create Workflow</button></div>`);
}

function saveWorkflow(){
    const name=document.getElementById('wf_name').value.trim();if(!name){showToast('Name required','error');return;}
    const list=DB.get('workflows_list',[]);
    list.push({id:'WF'+genId(),name,trigger:document.getElementById('wf_trigger').value,action:document.getElementById('wf_action').value,enabled:true,runs:0,lastRun:''});
    DB.set('workflows_list',list);closeModal();showToast('Workflow created','success');addAuditEntry('created','Workflows',name);renderWorkflows();
}

function toggleWorkflow(id,enabled){const list=DB.get('workflows_list',[]);const w=list.find(x=>x.id===id);if(w){w.enabled=enabled;DB.set('workflows_list',list);showToast(`Workflow ${enabled?'activated':'disabled'}`,'info');}}
function testWorkflow(id){const list=DB.get('workflows_list',[]);const w=list.find(x=>x.id===id);if(w){w.runs++;w.lastRun=new Date().toISOString().split('T')[0];DB.set('workflows_list',list);showToast('Workflow executed successfully! ✅','success');renderWorkflows();}}


// ═══════════════════════════════════════════════════════════════════════════
// 11. ADVANCED ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════
function renderAnalytics() {
    const c=document.getElementById('analyticsContainer');if(!c)return;
    const invoices=DB.get('invoices',[]);const leads=DB.get('leads',[]);const expenses=DB.get('expenses_list',[]);
    const revenue=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.total||i.amount||0),0);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Advanced Analytics</h1><p class="page-subtitle">Forecasting, cohort analysis & KPI tracking</p></div>
    <div class="page-actions">
        <select class="form-control" style="width:auto;display:inline-block" onchange="showToast('Period changed to '+this.value,'info')"><option>This Month</option><option>This Quarter</option><option>This Year</option><option>Custom Range</option></select>
        <button class="btn btn-outline btn-sm" onclick="exportAnalyticsExcel()"><i class="fas fa-file-excel"></i> Export</button>
        <button class="btn btn-outline btn-sm" onclick="exportAnalyticsPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
    </div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(revenue)}</span><span class="stat-label">Total Revenue</span><span style="font-size:11px;color:#2e7d32">↑ 12% vs last month</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-chart-line"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(Math.round(revenue*1.15))}</span><span class="stat-label">Revenue Forecast (Next Month)</span><span style="font-size:11px;color:#1565c0">AI Predicted</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-funnel-dollar"></i></div><div class="stat-info"><span class="stat-value">${leads.length||8}</span><span class="stat-label">Conversion Rate</span><span style="font-size:11px;color:#e65100">23.5% this month</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-user-friends"></i></div><div class="stat-info"><span class="stat-value">₹${Math.round(revenue/Math.max(1,invoices.length)/1000)}K</span><span class="stat-label">Avg Deal Size</span><span style="font-size:11px;color:#7b1fa2">↑ 8% growth</span></div></div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card"><div class="card-header"><h3>📈 Revenue Forecast (12 Months)</h3></div><div class="card-body">
            <div style="display:flex;align-items:flex-end;gap:6px;height:180px;padding-top:20px">
            ${months.map((m,i)=>{
                const val=Math.round(revenue/12*(0.7+Math.random()*0.6));
                const h=Math.max(10,Math.min(160,val/1000));
                const isFuture=i>2;
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:${h}px;background:${isFuture?'linear-gradient(to top,#bbdefb,#e3f2fd)':'linear-gradient(to top,#0b6bcb,#42a5f5)'};border-radius:4px 4px 0 0;position:relative;${isFuture?'border:1px dashed #90caf9':''}"><div style="position:absolute;top:-18px;width:100%;text-align:center;font-size:9px;font-weight:600">${Math.round(val/1000)}K</div></div><div style="font-size:9px;color:var(--text-secondary)">${m}</div></div>`;
            }).join('')}
            </div>
            <div style="display:flex;gap:16px;margin-top:12px;font-size:11px"><span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#0b6bcb;border-radius:2px"></span>Actual</span><span style="display:flex;align-items:center;gap:4px"><span style="width:12px;height:12px;background:#bbdefb;border:1px dashed #90caf9;border-radius:2px"></span>Forecast</span></div>
        </div></div>
        <div class="card"><div class="card-header"><h3>🎯 KPI Dashboard</h3></div><div class="card-body">
            ${[{name:'Customer Satisfaction',val:92,color:'#2e7d32'},{name:'Lead Response Time',val:78,color:'#f39c12'},{name:'Invoice Payment Rate',val:85,color:'#1565c0'},{name:'Employee Productivity',val:88,color:'#7b1fa2'}].map(k=>`
                <div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>${k.name}</span><strong style="color:${k.color}">${k.val}%</strong></div><div style="height:6px;background:var(--border);border-radius:3px"><div style="height:100%;width:${k.val}%;background:${k.color};border-radius:3px"></div></div></div>
            `).join('')}
        </div></div>
    </div>
    <div class="card"><div class="card-header"><h3>📊 Cohort Analysis — Customer Retention</h3></div><div class="card-body">
        <table class="data-table" style="font-size:11px"><thead><tr><th>Cohort</th><th>Month 0</th><th>Month 1</th><th>Month 2</th><th>Month 3</th><th>Month 4</th><th>Month 5</th></tr></thead>
        <tbody>
        ${['Jan 2026','Feb 2026','Mar 2026'].map((cohort,ci)=>{
            const vals=[100,88-ci*3,76-ci*5,68-ci*4,61-ci*3,55-ci*2];
            return `<tr><td><strong>${cohort}</strong></td>${vals.map((v,i)=>`<td style="background:rgba(11,107,203,${v/100*0.4});text-align:center;font-weight:${i===0?'600':'400'}">${v}%</td>`).join('')}</tr>`;
        }).join('')}
        </tbody></table>
    </div></div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 12. DASHBOARD BUILDER
// ═══════════════════════════════════════════════════════════════════════════
function renderDashboardBuilder() {
    const c=document.getElementById('dashboardBuilderContainer');if(!c)return;
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Dashboard Builder</h1><p class="page-subtitle">Widget customization now lives on your home Dashboard</p></div></div>
    <div class="card" style="padding:32px;text-align:center;">
        <i class="fas fa-th-large" style="font-size:32px;color:var(--primary);margin-bottom:14px;display:block;"></i>
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:18px;max-width:480px;margin-left:auto;margin-right:auto;">
            You can now add, remove, resize and reorder real data widgets directly on the main Dashboard — your changes are saved automatically.
        </p>
        <button class="btn btn-primary" onclick="navigate('dashboard');setTimeout(()=>{if(!dashCustomizeMode)toggleDashboardCustomize();},50);"><i class="fas fa-sliders-h"></i> Go to Dashboard &amp; Customize</button>
    </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 13. ROLES & PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════
function renderRoles() {
    const c=document.getElementById('rolesContainer');if(!c)return;
    const roles=DB.get('roles_list',[
        {id:'R1',name:'Administrator',users:1,permissions:['all'],color:'#c62828',desc:'Full access to everything'},
        {id:'R2',name:'Sales Manager',users:3,permissions:['leads','deals','contacts','invoices','reports'],color:'#1565c0',desc:'Manage sales pipeline & invoicing'},
        {id:'R3',name:'HR Manager',users:2,permissions:['employees','attendance','leaves','payroll','recruitment'],color:'#7b1fa2',desc:'Human resource management'},
        {id:'R4',name:'Accountant',users:1,permissions:['invoices','accounting','expenses','gst','bank-recon'],color:'#2e7d32',desc:'Financial operations'},
        {id:'R5',name:'Support Agent',users:4,permissions:['support','chat','knowledge-base'],color:'#e65100',desc:'Customer support & tickets'},
        {id:'R6',name:'Viewer',users:2,permissions:['dashboard','reports'],color:'#616161',desc:'Read-only access to reports'},
    ]);
    const modules=['dashboard','invoices','clients','leads','deals','contacts','projects','tasks','employees','attendance','leaves','pos','products','support','chat','whatsapp','inventory','expenses','gst','payroll','reports','settings'];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Roles & Permissions</h1><p class="page-subtitle">Granular access control per module</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openRoleForm()"><i class="fas fa-plus"></i> Create Role</button></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-bottom:24px">
    ${roles.map(r=>`
        <div class="card" style="border-top:3px solid ${r.color}"><div class="card-body" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <h4 style="margin:0"><i class="fas fa-shield-alt" style="color:${r.color};margin-right:6px"></i>${r.name}</h4>
                <span style="font-size:11px;color:var(--text-secondary)">${r.users} users</span>
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">${r.desc}</p>
            <div style="display:flex;flex-wrap:wrap;gap:4px">${(r.permissions[0]==='all'?['All Modules']:r.permissions).map(p=>`<span style="font-size:10px;padding:2px 8px;background:${r.color}15;color:${r.color};border-radius:10px">${p}</span>`).join('')}</div>
            <div style="display:flex;gap:6px;margin-top:12px"><button class="btn btn-sm btn-outline" onclick="editRole('${r.id}')"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-outline" onclick="deleteItem('roles_list','${r.id}');renderRoles()"><i class="fas fa-trash"></i></button></div>
        </div></div>`).join('')}</div>
    <div class="card"><div class="card-header"><h3><i class="fas fa-lock" style="margin-right:8px"></i>Security Features</h3></div><div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div style="padding:16px;background:var(--bg-body);border-radius:var(--radius)">
                <h4 style="margin:0 0 8px;font-size:14px"><i class="fas fa-key" style="color:#f39c12;margin-right:6px"></i>Two-Factor Authentication</h4>
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Add an extra layer of security with TOTP-based 2FA</p>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" checked onchange="showToast('2FA '+(this.checked?'enabled':'disabled'),'info')"> Enable 2FA for all users</label>
            </div>
            <div style="padding:16px;background:var(--bg-body);border-radius:var(--radius)">
                <h4 style="margin:0 0 8px;font-size:14px"><i class="fas fa-shield-alt" style="color:#2e7d32;margin-right:6px"></i>Data Encryption</h4>
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">AES-256 encryption for all stored data</p>
                <div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;background:#2e7d32;border-radius:50%"></span><span style="font-size:12px;color:#2e7d32;font-weight:600">Active — All data encrypted</span></div>
            </div>
        </div>
    </div></div>`;
}

function openRoleForm(){openModalRaw(`<div class="modal-header"><h3>Create Role</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-group"><label>Role Name</label><input class="form-control" id="role_name"></div><div class="form-group"><label>Description</label><input class="form-control" id="role_desc"></div><div class="form-group"><label>Module Permissions</label><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px">${['Dashboard','Invoices','Clients','Leads','Deals','Contacts','Projects','Tasks','Employees','Attendance','Leaves','POS','Products','Support','Chat','WhatsApp','Inventory','Expenses','GST','Payroll','Reports','Settings'].map(m=>`<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" class="role_perm" value="${m.toLowerCase()}"> ${m}</label>`).join('')}</div></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveRole()">Create</button></div>`);}
function saveRole(){const name=document.getElementById('role_name').value.trim();if(!name){showToast('Name required','error');return;}const perms=Array.from(document.querySelectorAll('.role_perm:checked')).map(c=>c.value);const list=DB.get('roles_list',[]);list.push({id:'R'+genId(),name,users:0,permissions:perms,color:'#0b6bcb',desc:document.getElementById('role_desc').value});DB.set('roles_list',list);closeModal();showToast('Role created','success');addAuditEntry('created','Roles',name);renderRoles();}
function editRole(id){showToast('Edit role — permissions updated','info');}


// ═══════════════════════════════════════════════════════════════════════════
// 14. AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════
function renderAuditLog() {
    const c=document.getElementById('auditLogContainer');if(!c)return;
    const logs=DB.get('audit_logs',[
        {id:'1',user:'Admin',action:'login','module':'Auth',details:'Logged in from 192.168.1.1',ts:'2026-03-27T09:00:00Z'},
        {id:'2',user:'Admin',action:'created','module':'Invoices',details:'Invoice INV-006 created',ts:'2026-03-27T09:15:00Z'},
        {id:'3',user:'Rajesh',action:'updated','module':'Leads',details:'Lead status changed to Qualified',ts:'2026-03-27T09:30:00Z'},
        {id:'4',user:'Admin',action:'approved','module':'Expenses',details:'Expense E003 approved',ts:'2026-03-27T10:00:00Z'},
        {id:'5',user:'System',action:'workflow_run','module':'Workflows',details:'Workflow "Lead → Deal" executed',ts:'2026-03-27T10:15:00Z'},
        {id:'6',user:'Priya',action:'deleted','module':'Tasks',details:'Task "Old Review" deleted',ts:'2026-03-27T10:30:00Z'},
    ]);
    const actionColors={login:'#2e7d32',created:'#1565c0',updated:'#f39c12',deleted:'#c62828',approved:'#2e7d32',exported:'#7b1fa2',viewed:'#616161',workflow_run:'#e65100'};
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Audit Log</h1><p class="page-subtitle">Complete history of all system actions</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="exportAuditLog()"><i class="fas fa-download"></i> Export</button><button class="btn btn-outline btn-sm" onclick="clearAuditLog()"><i class="fas fa-trash"></i> Clear</button></div></div>
    <div class="card"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search audit log..." oninput="filterAuditLog(this.value)"></div>
    <div class="table-filters"><select onchange="filterAuditAction(this.value)"><option value="">All Actions</option>${Object.keys(actionColors).map(a=>`<option>${a}</option>`).join('')}</select></div></div>
    <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
    <tbody id="auditTableBody">${logs.map(l=>`<tr><td style="font-size:11px;white-space:nowrap">${new Date(l.ts).toLocaleString()}</td><td><strong>${l.user}</strong></td><td><span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${(actionColors[l.action]||'#616161')}15;color:${actionColors[l.action]||'#616161'};font-weight:600">${l.action}</span></td><td>${l.module}</td><td style="font-size:12px;color:var(--text-secondary)">${l.details}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function filterAuditLog(q){document.querySelectorAll('#auditTableBody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none');}
function filterAuditAction(v){document.querySelectorAll('#auditTableBody tr').forEach(r=>r.style.display=!v||r.cells[2].textContent.trim()===v?'':'none');}
function clearAuditLog(){if(confirm('Clear all audit logs?')){DB.set('audit_logs',[]);showToast('Audit log cleared','info');renderAuditLog();}}


// ═══════════════════════════════════════════════════════════════════════════
// 15. INTEGRATIONS HUB
// ═══════════════════════════════════════════════════════════════════════════
function renderIntegrations() {
    const c=document.getElementById('integrationsContainer');if(!c)return;
    const integrations=[
        {id:'INT01',name:'Stripe',icon:'fab fa-stripe',desc:'Accept online payments via Stripe',category:'Payment',status:'connected',color:'#635bff'},
        {id:'INT02',name:'Razorpay',icon:'fas fa-rupee-sign',desc:'Indian payment gateway integration',category:'Payment',status:'disconnected',color:'#0b6bcb'},
        {id:'INT03',name:'Gmail',icon:'fas fa-envelope',desc:'Sync emails with CRM contacts',category:'Email',status:'connected',color:'#ea4335'},
        {id:'INT04',name:'Outlook',icon:'fab fa-microsoft',desc:'Microsoft 365 email integration',category:'Email',status:'disconnected',color:'#0078d4'},
        {id:'INT05',name:'Google Calendar',icon:'fab fa-google',desc:'Two-way calendar sync',category:'Calendar',status:'connected',color:'#4285f4'},
        {id:'INT06',name:'Twilio SMS',icon:'fas fa-sms',desc:'Send SMS to clients & leads',category:'SMS',status:'disconnected',color:'#f22f46'},
        {id:'INT07',name:'Shopify',icon:'fab fa-shopify',desc:'Sync products & orders',category:'E-commerce',status:'disconnected',color:'#96bf48'},
        {id:'INT08',name:'WooCommerce',icon:'fab fa-wordpress',desc:'WordPress store integration',category:'E-commerce',status:'disconnected',color:'#96588a'},
        {id:'INT09',name:'Slack',icon:'fab fa-slack',desc:'Team notifications & alerts',category:'Communication',status:'connected',color:'#4a154b'},
        {id:'INT10',name:'Zapier',icon:'fas fa-bolt',desc:'Connect 5000+ apps',category:'Automation',status:'disconnected',color:'#ff4a00'},
        {id:'INT11',name:'WhatsApp Business API',icon:'fab fa-whatsapp',desc:'Official WhatsApp Business messaging',category:'Communication',status:'disconnected',color:'#25d366'},
        {id:'INT12',name:'Tally',icon:'fas fa-calculator',desc:'Accounting data sync with Tally',category:'Accounting',status:'disconnected',color:'#e44332'},
    ];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Integrations Hub</h1><p class="page-subtitle">Connect your favorite tools & services</p></div></div>
    <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-plug"></i></div><div class="stat-info"><span class="stat-value">${integrations.filter(i=>i.status==='connected').length}</span><span class="stat-label">Connected</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-puzzle-piece"></i></div><div class="stat-info"><span class="stat-value">${integrations.length}</span><span class="stat-label">Available</span></div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
    ${integrations.map(i=>`
        <div class="card" style="border-top:3px solid ${i.color}"><div class="card-body" style="padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:44px;height:44px;border-radius:10px;background:${i.color}15;color:${i.color};display:flex;align-items:center;justify-content:center;font-size:20px"><i class="${i.icon}"></i></div>
                <div><strong style="font-size:14px">${i.name}</strong><div style="font-size:11px;color:var(--text-secondary)">${i.category}</div></div>
                <span style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:10px;background:${i.status==='connected'?'#e8f5e9':'#f5f5f5'};color:${i.status==='connected'?'#2e7d32':'#9e9e9e'};font-weight:600">${i.status==='connected'?'✓ Connected':'Not Connected'}</span>
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.4">${i.desc}</p>
            <button class="btn btn-sm ${i.status==='connected'?'btn-outline':'btn-primary'}" style="${i.status==='connected'?'':'background:'+i.color}" onclick="toggleIntegration('${i.id}')">
                ${i.status==='connected'?'<i class="fas fa-unlink"></i> Disconnect':'<i class="fas fa-link"></i> Connect'}
            </button>
        </div></div>`).join('')}</div>`;
}

function toggleIntegration(id){showToast('Integration status updated! In production, this would open OAuth flow.','success');addAuditEntry('integration_toggled','Integrations',id);}


// ═══════════════════════════════════════════════════════════════════════════
// 16. CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════════════════
function renderCustomerPortal() {
    const c=document.getElementById('customerPortalContainer');if(!c)return;
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Customer Portal</h1><p class="page-subtitle">Self-service portal for your clients</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="copyPortalLink()"><i class="fas fa-link"></i> Copy Portal Link</button></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div class="card"><div class="card-header"><h3>Portal Configuration</h3></div><div class="card-body">
            <div style="margin-bottom:16px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" checked onchange="showToast('Setting updated','info')"> Allow clients to view invoices</label></div>
            <div style="margin-bottom:16px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" checked> Allow clients to track projects</label></div>
            <div style="margin-bottom:16px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox" checked> Allow clients to raise tickets</label></div>
            <div style="margin-bottom:16px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox"> Allow clients to chat with support</label></div>
            <div style="margin-bottom:16px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px"><input type="checkbox"> Enable file sharing</label></div>
            <button class="btn btn-primary" onclick="savePortalSettings()"><i class="fas fa-save"></i> Save Settings</button>
        </div></div>
        <div class="card"><div class="card-header"><h3>Portal Preview</h3></div><div class="card-body" style="text-align:center;padding:40px">
            <div style="width:100%;height:250px;background:linear-gradient(135deg,#0b6bcb,#42a5f5);border-radius:var(--radius);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:24px">
                <div style="font-size:24px;font-weight:700;margin-bottom:8px">Customer Portal</div>
                <p style="font-size:13px;opacity:0.8;margin-bottom:16px">Welcome back! Access your invoices, projects & support.</p>
                <div style="display:flex;gap:12px">
                    <div style="padding:12px 16px;background:rgba(255,255,255,0.15);border-radius:8px;font-size:12px"><i class="fas fa-file-invoice"></i> Invoices</div>
                    <div style="padding:12px 16px;background:rgba(255,255,255,0.15);border-radius:8px;font-size:12px"><i class="fas fa-project-diagram"></i> Projects</div>
                    <div style="padding:12px 16px;background:rgba(255,255,255,0.15);border-radius:8px;font-size:12px"><i class="fas fa-life-ring"></i> Support</div>
                </div>
            </div>
        </div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Active Portal Users</h3></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Client</th><th>Email</th><th>Last Login</th><th>Invoices Viewed</th><th>Tickets Raised</th><th>Status</th></tr></thead>
    <tbody>
        <tr><td><strong>Acme Corp</strong></td><td>john@acme.com</td><td>Today 10:30 AM</td><td>12</td><td>3</td><td><span class="status-badge status-active">Active</span></td></tr>
        <tr><td><strong>TechStart</strong></td><td>ceo@techstart.io</td><td>Yesterday</td><td>8</td><td>1</td><td><span class="status-badge status-active">Active</span></td></tr>
        <tr><td><strong>Design Hub</strong></td><td>lisa@designhub.co</td><td>Mar 24</td><td>5</td><td>0</td><td><span class="status-badge status-pending">Inactive</span></td></tr>
    </tbody></table></div></div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 17. KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════
function renderKnowledgeBase() {
    const c=document.getElementById('knowledgeBaseContainer');if(!c)return;
    const articles=DB.get('kb_articles',[
        {id:'KB001',title:'Getting Started with AZOLVE CRM',category:'Getting Started',views:245,helpful:89,updated:'2026-03-20'},
        {id:'KB002',title:'How to Create and Send Invoices',category:'Invoicing',views:189,helpful:72,updated:'2026-03-18'},
        {id:'KB003',title:'Setting Up WhatsApp Integration',category:'Integrations',views:156,helpful:64,updated:'2026-03-22'},
        {id:'KB004',title:'Managing Employee Attendance',category:'HR',views:134,helpful:58,updated:'2026-03-15'},
        {id:'KB005',title:'POS Terminal User Guide',category:'POS',views:112,helpful:45,updated:'2026-03-10'},
        {id:'KB006',title:'Understanding GST Compliance',category:'Finance',views:98,helpful:41,updated:'2026-03-12'},
    ]);
    const categories=[...new Set(articles.map(a=>a.category))];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Knowledge Base</h1><p class="page-subtitle">Internal documentation, guides & training</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openKBForm()"><i class="fas fa-plus"></i> New Article</button></div></div>
    <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary">All</button>
        ${categories.map(cat=>`<button class="btn btn-sm btn-outline" onclick="filterKB('${cat}')">${cat}</button>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px" id="kbGrid">
    ${articles.map(a=>`
        <div class="card" style="cursor:pointer" onclick="viewKBArticle('${a.id}')"><div class="card-body" style="padding:16px">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${a.category}</div>
            <h4 style="margin:0 0 8px;font-size:15px">${a.title}</h4>
            <div style="display:flex;gap:16px;font-size:11px;color:var(--text-secondary)">
                <span><i class="fas fa-eye"></i> ${a.views} views</span>
                <span><i class="fas fa-thumbs-up"></i> ${a.helpful}% helpful</span>
                <span><i class="fas fa-clock"></i> Updated ${a.updated}</span>
            </div>
        </div></div>`).join('')}</div>`;
}

function openKBForm(){openModalRaw(`<div class="modal-header"><h3>New Article</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-group"><label>Title</label><input class="form-control" id="kb_title"></div><div class="form-group"><label>Category</label><select class="form-control" id="kb_cat"><option>Getting Started</option><option>Invoicing</option><option>Integrations</option><option>HR</option><option>POS</option><option>Finance</option><option>General</option></select></div><div class="form-group"><label>Content</label><textarea class="form-control" id="kb_content" rows="8" placeholder="Write article content in Markdown..."></textarea></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveKBArticle()">Publish</button></div>`);}
function saveKBArticle(){const articles=DB.get('kb_articles',[]);articles.unshift({id:'KB'+genId(),title:document.getElementById('kb_title').value,category:document.getElementById('kb_cat').value,views:0,helpful:0,updated:new Date().toISOString().split('T')[0]});DB.set('kb_articles',articles);closeModal();showToast('Article published','success');renderKnowledgeBase();}
function viewKBArticle(id){const articles=DB.get('kb_articles',[]);const a=articles.find(x=>x.id===id);if(!a)return;openModalRaw(`<div class="modal-header"><h3>${a.title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">${a.category} · Updated ${a.updated} · ${a.views} views</div><div style="font-size:14px;line-height:1.8;color:var(--text-primary)"><p>This is a comprehensive guide covering all aspects of ${a.title.toLowerCase()}. In a production system, this would contain rich formatted content with images, videos, and step-by-step instructions.</p><h4>Key Points:</h4><ul><li>Step-by-step setup guide</li><li>Best practices and tips</li><li>Troubleshooting common issues</li><li>FAQ section</li></ul><p>For more help, contact our support team or use the AI Assistant.</p></div><div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);display:flex;gap:8px"><button class="btn btn-sm btn-outline" onclick="showToast('Marked as helpful!','success')"><i class="fas fa-thumbs-up"></i> Helpful</button><button class="btn btn-sm btn-outline" onclick="showToast('Article shared','info')"><i class="fas fa-share"></i> Share</button></div></div>`);}
function filterKB(cat){document.querySelectorAll('#kbGrid .card').forEach(c=>{const catText=c.querySelector('div').textContent;c.style.display=catText.includes(cat)?'':'none';});}


// ═══════════════════════════════════════════════════════════════════════════
// 18. PAYROLL
// ═══════════════════════════════════════════════════════════════════════════
function renderPayroll() {
    const c=document.getElementById('payrollContainer');if(!c)return;
    const employees=DB.get('payroll_data',[
        {id:'P001',name:'Rajesh Kumar',role:'Senior Developer',basic:60000,hra:24000,da:6000,pf:7200,tax:8500,deductions:15700,net:74300,status:'paid'},
        {id:'P002',name:'Priya Sharma',role:'HR Manager',basic:55000,hra:22000,da:5500,pf:6600,tax:7200,deductions:13800,net:68700,status:'paid'},
        {id:'P003',name:'Amit Patel',role:'Sales Lead',basic:50000,hra:20000,da:5000,pf:6000,tax:6500,deductions:12500,net:62500,status:'pending'},
        {id:'P004',name:'Sneha Reddy',role:'Designer',basic:45000,hra:18000,da:4500,pf:5400,tax:5800,deductions:11200,net:56300,status:'pending'},
    ]);
    const totalNet=employees.reduce((s,e)=>s+e.net,0);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Payroll Management</h1><p class="page-subtitle">Salary processing, deductions & payslips</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="exportPayrollCSV()"><i class="fas fa-download"></i> Export</button><button class="btn btn-primary" onclick="processPayroll()"><i class="fas fa-play"></i> Process Payroll</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-money-check-alt"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(totalNet)}</span><span class="stat-label">Total Net Salary</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-users"></i></div><div class="stat-info"><span class="stat-value">${employees.length}</span><span class="stat-label">Employees</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-clock"></i></div><div class="stat-info"><span class="stat-value">${employees.filter(e=>e.status==='pending').length}</span><span class="stat-label">Pending</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(employees.reduce((s,e)=>s+e.deductions,0))}</span><span class="stat-label">Total Deductions</span></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>March 2026 Payroll</h3></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Employee</th><th>Role</th><th>Basic</th><th>HRA</th><th>DA</th><th>PF</th><th>Tax</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${employees.map(e=>`<tr><td><strong>${e.name}</strong></td><td>${e.role}</td><td>${fmtMoney(e.basic)}</td><td>${fmtMoney(e.hra)}</td><td>${fmtMoney(e.da)}</td><td>${fmtMoney(e.pf)}</td><td>${fmtMoney(e.tax)}</td><td style="color:#c62828">${fmtMoney(e.deductions)}</td><td><strong style="color:#2e7d32">${fmtMoney(e.net)}</strong></td>
    <td><span class="status-badge status-${e.status==='paid'?'active':'pending'}">${e.status}</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="viewPayslip('${e.id}')"><i class="fas fa-file-alt"></i></button> ${e.status==='pending'?`<button class="btn btn-sm btn-outline" onclick="payEmployee('${e.id}')" style="color:#2e7d32"><i class="fas fa-check"></i></button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function processPayroll(){const list=DB.get('payroll_data',[]);list.forEach(e=>e.status='paid');DB.set('payroll_data',list);showToast('All salaries processed! ✅','success');addAuditEntry('processed','Payroll','All employees');renderPayroll();}
function payEmployee(id){const list=DB.get('payroll_data',[]);const e=list.find(x=>x.id===id);if(e){e.status='paid';DB.set('payroll_data',list);showToast(`Salary paid to ${e.name}`,'success');renderPayroll();}}
function viewPayslip(id){const list=DB.get('payroll_data',[]);const e=list.find(x=>x.id===id);if(!e)return;openModalRaw(`<div class="modal-header"><h3>Payslip — ${e.name}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div style="border:1px solid var(--border);border-radius:var(--radius);padding:24px"><div style="text-align:center;margin-bottom:16px"><h3 style="margin:0">AZOLVE INFOTECH PVT LTD</h3><p style="margin:4px 0;font-size:12px;color:var(--text-secondary)">Payslip for March 2026</p></div><hr><table style="width:100%;font-size:13px"><tr><td><strong>Employee:</strong> ${e.name}</td><td><strong>Role:</strong> ${e.role}</td></tr></table><hr><table style="width:100%;font-size:13px;margin-top:12px"><tr style="font-weight:600;background:var(--bg-body)"><td colspan="2" style="padding:8px">Earnings</td><td colspan="2" style="padding:8px">Deductions</td></tr><tr><td style="padding:4px 8px">Basic Salary</td><td style="padding:4px 8px">${fmtMoney(e.basic)}</td><td style="padding:4px 8px">PF</td><td style="padding:4px 8px">${fmtMoney(e.pf)}</td></tr><tr><td style="padding:4px 8px">HRA</td><td style="padding:4px 8px">${fmtMoney(e.hra)}</td><td style="padding:4px 8px">Income Tax</td><td style="padding:4px 8px">${fmtMoney(e.tax)}</td></tr><tr><td style="padding:4px 8px">DA</td><td style="padding:4px 8px">${fmtMoney(e.da)}</td><td></td><td></td></tr><tr style="font-weight:700;border-top:2px solid var(--border)"><td style="padding:8px">Total Earnings</td><td style="padding:8px">${fmtMoney(e.basic+e.hra+e.da)}</td><td style="padding:8px">Total Deductions</td><td style="padding:8px;color:#c62828">${fmtMoney(e.deductions)}</td></tr></table><div style="text-align:center;margin-top:16px;padding:12px;background:#e8f5e9;border-radius:var(--radius)"><strong style="font-size:18px;color:#2e7d32">Net Pay: ${fmtMoney(e.net)}</strong></div></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="downloadPayslipPDF()"><i class="fas fa-download"></i> Download PDF</button><button class="btn btn-outline" onclick="closeModal()">Close</button></div>`);}


// ═══════════════════════════════════════════════════════════════════════════
// 19. RECRUITMENT
// ═══════════════════════════════════════════════════════════════════════════
function renderRecruitment() {
    const c=document.getElementById('recruitmentContainer');if(!c)return;
    const jobs=DB.get('job_postings',[
        {id:'J001',title:'Senior Full-Stack Developer',department:'Engineering',type:'Full-time',location:'Remote',applicants:28,status:'active',posted:'2026-03-15'},
        {id:'J002',title:'Product Designer',department:'Design',type:'Full-time',location:'Bangalore',applicants:15,status:'active',posted:'2026-03-18'},
        {id:'J003',title:'Sales Executive',department:'Sales',type:'Full-time',location:'Mumbai',applicants:42,status:'active',posted:'2026-03-10'},
        {id:'J004',title:'HR Intern',department:'HR',type:'Internship',location:'Hybrid',applicants:67,status:'closed',posted:'2026-02-20'},
    ]);
    const pipeline=[{stage:'Applied',count:85,color:'#90caf9'},{stage:'Screening',count:32,color:'#64b5f6'},{stage:'Interview',count:18,color:'#42a5f5'},{stage:'Offer',count:5,color:'#1e88e5'},{stage:'Hired',count:3,color:'#1565c0'}];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Recruitment Pipeline</h1><p class="page-subtitle">Job postings, applicants & hiring pipeline</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openJobForm()"><i class="fas fa-plus"></i> Post Job</button></div></div>
    <div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Hiring Funnel</h3></div><div class="card-body">
        <div style="display:flex;align-items:center;gap:4px;height:60px">
        ${pipeline.map((p,i)=>`<div style="flex:${p.count};background:${p.color};height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;${i===0?'border-radius:8px 0 0 8px':''}${i===pipeline.length-1?'border-radius:0 8px 8px 0':''}">${p.stage} (${p.count})</div>`).join('')}
        </div>
    </div></div>
    <div class="card"><div class="card-header"><h3>Job Postings</h3></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Position</th><th>Department</th><th>Type</th><th>Location</th><th>Applicants</th><th>Posted</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${jobs.map(j=>`<tr><td><strong>${j.title}</strong></td><td>${j.department}</td><td>${j.type}</td><td>${j.location}</td><td><strong>${j.applicants}</strong></td><td>${j.posted}</td>
    <td><span class="status-badge status-${j.status==='active'?'active':'inactive'}">${j.status}</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="viewApplicants('${j.id}')"><i class="fas fa-users"></i></button> <button class="btn btn-sm btn-outline" onclick="editJob('${j.id}')"><i class="fas fa-edit"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function openJobForm(){openModalRaw(`<div class="modal-header"><h3>Post New Job</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-row"><div class="form-group"><label>Job Title</label><input class="form-control" id="job_title"></div><div class="form-group"><label>Department</label><select class="form-control" id="job_dept"><option>Engineering</option><option>Design</option><option>Sales</option><option>HR</option><option>Marketing</option><option>Finance</option></select></div></div><div class="form-row"><div class="form-group"><label>Type</label><select class="form-control" id="job_type"><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></div><div class="form-group"><label>Location</label><input class="form-control" id="job_loc" placeholder="Remote / City name"></div></div><div class="form-group"><label>Description</label><textarea class="form-control" rows="4" id="job_desc"></textarea></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveJob()">Post Job</button></div>`);}
function saveJob(){const jobs=DB.get('job_postings',[]);jobs.unshift({id:'J'+genId(),title:document.getElementById('job_title').value,department:document.getElementById('job_dept').value,type:document.getElementById('job_type').value,location:document.getElementById('job_loc').value,applicants:0,status:'active',posted:new Date().toISOString().split('T')[0]});DB.set('job_postings',jobs);closeModal();showToast('Job posted!','success');renderRecruitment();}


// ═══════════════════════════════════════════════════════════════════════════
// 20. PERFORMANCE REVIEWS
// ═══════════════════════════════════════════════════════════════════════════
function renderPerformance() {
    const c=document.getElementById('performanceContainer');if(!c)return;
    const reviews=DB.get('performance_reviews',[
        {id:'PR01',employee:'Rajesh Kumar',role:'Senior Developer',quarter:'Q1 2026',score:4.2,goals:5,completed:4,feedback:'Excellent technical skills. Consistent delivery.',status:'completed'},
        {id:'PR02',employee:'Priya Sharma',role:'HR Manager',quarter:'Q1 2026',score:4.5,goals:6,completed:6,feedback:'Outstanding people management and process improvements.',status:'completed'},
        {id:'PR03',employee:'Amit Patel',role:'Sales Lead',quarter:'Q1 2026',score:3.8,goals:4,completed:3,feedback:'Good numbers. Needs improvement in CRM documentation.',status:'in_progress'},
        {id:'PR04',employee:'Sneha Reddy',role:'Designer',quarter:'Q1 2026',score:4.0,goals:5,completed:4,feedback:'Creative and detail-oriented. Great collaboration.',status:'in_progress'},
    ]);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Performance Reviews</h1><p class="page-subtitle">Employee evaluations, goals & feedback</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="startReviewCycle()"><i class="fas fa-plus"></i> Start Review Cycle</button></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
    ${reviews.map(r=>`
        <div class="card"><div class="card-body" style="padding:16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:44px;height:44px;border-radius:50%;background:#0b6bcb;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600">${r.employee.split(' ').map(n=>n[0]).join('')}</div>
                <div><strong style="font-size:14px">${r.employee}</strong><div style="font-size:11px;color:var(--text-secondary)">${r.role} · ${r.quarter}</div></div>
                <span style="margin-left:auto" class="status-badge status-${r.status==='completed'?'active':'pending'}">${r.status.replace('_',' ')}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                <div style="text-align:center"><div style="font-size:28px;font-weight:700;color:${r.score>=4?'#2e7d32':r.score>=3.5?'#f39c12':'#c62828'}">${r.score}</div><div style="font-size:10px;color:var(--text-secondary)">Score / 5</div></div>
                <div style="text-align:center"><div style="font-size:28px;font-weight:700">${r.completed}/${r.goals}</div><div style="font-size:10px;color:var(--text-secondary)">Goals Met</div></div>
                <div style="text-align:center"><div style="font-size:28px;font-weight:700">${'★'.repeat(Math.round(r.score))}${'☆'.repeat(5-Math.round(r.score))}</div><div style="font-size:10px;color:var(--text-secondary)">Rating</div></div>
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;font-style:italic">"${r.feedback}"</p>
            <button class="btn btn-sm btn-outline" style="width:100%" onclick="viewFullReview('${r.id}')"><i class="fas fa-eye"></i> View Full Review</button>
        </div></div>`).join('')}</div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 21. DOCUMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function renderDocuments() {
    const c=document.getElementById('documentsContainer');if(!c)return;
    const docs=DB.get('documents_list',[
        {id:'D001',name:'Q1 2026 Financial Report.pdf',type:'pdf',size:'2.4 MB',folder:'Finance',uploadedBy:'Admin',date:'2026-03-25',version:3,signed:true},
        {id:'D002',name:'Employee Handbook v4.docx',type:'doc',size:'1.8 MB',folder:'HR',uploadedBy:'Priya',date:'2026-03-20',version:4,signed:false},
        {id:'D003',name:'Client Contract - Acme Corp.pdf',type:'pdf',size:'540 KB',folder:'Contracts',uploadedBy:'Admin',date:'2026-03-18',version:1,signed:true},
        {id:'D004',name:'Product Roadmap 2026.xlsx',type:'xls',size:'890 KB',folder:'Strategy',uploadedBy:'Admin',date:'2026-03-15',version:2,signed:false},
        {id:'D005',name:'Office Lease Agreement.pdf',type:'pdf',size:'1.2 MB',folder:'Legal',uploadedBy:'Admin',date:'2026-02-01',version:1,signed:true},
        {id:'D006',name:'Marketing Campaign Assets.zip',type:'zip',size:'15.6 MB',folder:'Marketing',uploadedBy:'Sneha',date:'2026-03-22',version:1,signed:false},
    ]);
    const icons={pdf:'fa-file-pdf',doc:'fa-file-word',xls:'fa-file-excel',zip:'fa-file-archive',img:'fa-file-image'};
    const colors={pdf:'#c62828',doc:'#1565c0',xls:'#2e7d32',zip:'#f39c12',img:'#7b1fa2'};
    const folders=[...new Set(docs.map(d=>d.folder))];
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Document Manager</h1><p class="page-subtitle">File storage, version control & e-signatures</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="openOCRScan()"><i class="fas fa-camera"></i> OCR Scan</button><button class="btn btn-primary" onclick="openDocUpload()"><i class="fas fa-upload"></i> Upload</button></div></div>
    <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap">
        ${folders.map(f=>`<div style="padding:12px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;display:flex;align-items:center;gap:8px" onclick="openDocFolder('${f}')"><i class="fas fa-folder" style="color:#f39c12;font-size:18px"></i><div><div style="font-size:13px;font-weight:600">${f}</div><div style="font-size:11px;color:var(--text-secondary)">${docs.filter(d=>d.folder===f).length} files</div></div></div>`).join('')}
    </div>
    <div class="card"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search documents..." oninput="filterDocs(this.value)"></div></div>
    <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Name</th><th>Folder</th><th>Size</th><th>Version</th><th>Uploaded By</th><th>Date</th><th>Signed</th><th>Actions</th></tr></thead>
    <tbody id="docsTableBody">${docs.map(d=>`<tr><td><i class="fas ${icons[d.type]||'fa-file'}" style="color:${colors[d.type]||'#616161'};margin-right:8px"></i><strong>${d.name}</strong></td><td>${d.folder}</td><td>${d.size}</td><td>v${d.version}</td><td>${d.uploadedBy}</td><td>${d.date}</td>
    <td>${d.signed?'<i class="fas fa-check-circle" style="color:#2e7d32"></i> Signed':'<button class="btn btn-sm btn-outline" onclick="showToast(\'E-signature request sent\',\'success\')" style="font-size:10px"><i class="fas fa-pen-nib"></i> Sign</button>'}</td>
    <td><button class="btn btn-sm btn-outline" onclick="downloadDocument('${d.id}')"><i class="fas fa-download"></i></button> <button class="btn btn-sm btn-outline" onclick="viewDocVersions('${d.id}')"><i class="fas fa-history"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function filterDocs(q){document.querySelectorAll('#docsTableBody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none');}


// ═══════════════════════════════════════════════════════════════════════════
// 22. E-COMMERCE
// ═══════════════════════════════════════════════════════════════════════════
function renderEcommerce() {
    const c=document.getElementById('ecommerceContainer');if(!c)return;
    const orders=DB.get('ecom_orders',[
        {id:'ORD-001',customer:'John Doe',email:'john@example.com',items:3,total:12499,payment:'Card',status:'delivered',date:'2026-03-25'},
        {id:'ORD-002',customer:'Sarah Smith',email:'sarah@example.com',items:1,total:3999,payment:'UPI',status:'shipped',date:'2026-03-26'},
        {id:'ORD-003',customer:'Mike Wilson',email:'mike@example.com',items:2,total:7998,payment:'Card',status:'processing',date:'2026-03-27'},
        {id:'ORD-004',customer:'Lisa Chen',email:'lisa@example.com',items:5,total:24995,payment:'COD',status:'pending',date:'2026-03-27'},
    ]);
    const totalRev=orders.reduce((s,o)=>s+o.total,0);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">E-Commerce</h1><p class="page-subtitle">Online store, orders & payment tracking</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="viewEcomStore()"><i class="fas fa-external-link-alt"></i> View Store</button><button class="btn btn-primary" onclick="openEcomProductForm()"><i class="fas fa-plus"></i> Add Product</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><span class="stat-value">${orders.length}</span><span class="stat-label">Total Orders</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(totalRev)}</span><span class="stat-label">Revenue</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-truck"></i></div><div class="stat-info"><span class="stat-value">${orders.filter(o=>o.status==='shipped').length}</span><span class="stat-label">In Transit</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-star"></i></div><div class="stat-info"><span class="stat-value">4.7</span><span class="stat-label">Avg Rating</span></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Recent Orders</h3></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${orders.map(o=>`<tr><td><strong>${o.id}</strong></td><td>${o.customer}<br><span style="font-size:11px;color:var(--text-secondary)">${o.email}</span></td><td>${o.items}</td><td>${fmtMoney(o.total)}</td><td>${o.payment}</td><td>${o.date}</td>
    <td><span class="status-badge status-${o.status==='delivered'?'active':o.status==='shipped'||o.status==='processing'?'pending':'inactive'}">${o.status}</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="viewEcomOrder('${o.id}')"><i class="fas fa-eye"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// 23. API & DEVELOPER PLATFORM
// ═══════════════════════════════════════════════════════════════════════════
function renderAPIDocs() {
    const c=document.getElementById('apiDocsContainer');if(!c)return;
    const endpoints=[
        {method:'GET',path:'/api/v1/leads',desc:'List all leads',auth:true},
        {method:'POST',path:'/api/v1/leads',desc:'Create a new lead',auth:true},
        {method:'GET',path:'/api/v1/invoices',desc:'List all invoices',auth:true},
        {method:'POST',path:'/api/v1/invoices',desc:'Create invoice',auth:true},
        {method:'GET',path:'/api/v1/clients',desc:'List clients',auth:true},
        {method:'GET',path:'/api/v1/deals',desc:'List deals pipeline',auth:true},
        {method:'PUT',path:'/api/v1/deals/:id',desc:'Update deal stage',auth:true},
        {method:'GET',path:'/api/v1/tasks',desc:'List tasks',auth:true},
        {method:'POST',path:'/api/v1/webhooks',desc:'Register webhook',auth:true},
        {method:'DELETE',path:'/api/v1/webhooks/:id',desc:'Remove webhook',auth:true},
    ];
    const webhooks=DB.get('webhooks_list',[
        {id:'WH1',url:'https://hooks.slack.com/services/xxx',event:'invoice.paid',status:'active'},
        {id:'WH2',url:'https://api.example.com/webhook',event:'lead.created',status:'active'},
    ]);
    const methodColors={GET:'#2e7d32',POST:'#1565c0',PUT:'#f39c12',DELETE:'#c62828',PATCH:'#7b1fa2'};
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">API & Developer Platform</h1><p class="page-subtitle">REST API, webhooks & developer documentation</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="regenerateAPIKey()"><i class="fas fa-key"></i> Regenerate Key</button></div></div>
    <div class="card" style="margin-bottom:16px"><div class="card-header"><h3><i class="fas fa-key" style="margin-right:8px"></i>API Authentication</h3></div><div class="card-body">
        <div style="display:flex;gap:12px;align-items:center">
            <div style="flex:1"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">API Key</label><input class="form-control" value="azv_live_sk_7f8g9h0j1k2l3m4n5o6p7q8r" readonly style="font-family:monospace;font-size:12px"></div>
            <button class="btn btn-outline" onclick="copyAPIKey()" style="margin-top:20px"><i class="fas fa-copy"></i> Copy</button>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-secondary)">Base URL: <code>https://api.azolve.com/v1</code> · Rate Limit: 1000 req/min · Auth: Bearer Token</div>
    </div></div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
        <div class="card"><div class="card-header"><h3>API Endpoints</h3></div><div class="card-body" style="padding:0">
            ${endpoints.map(e=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);font-size:13px">
                <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:${methodColors[e.method]}15;color:${methodColors[e.method]};min-width:50px;text-align:center">${e.method}</span>
                <code style="font-size:12px;color:var(--text-primary)">${e.path}</code>
                <span style="flex:1;font-size:12px;color:var(--text-secondary)">${e.desc}</span>
                ${e.auth?'<i class="fas fa-lock" style="font-size:10px;color:var(--text-muted)" title="Requires auth"></i>':''}
            </div>`).join('')}
        </div></div>
        <div>
            <div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Webhooks</h3><button class="btn btn-sm btn-primary" onclick="openWebhookForm()"><i class="fas fa-plus"></i></button></div><div class="card-body">
                ${webhooks.map(w=>`<div style="padding:8px;background:var(--bg-body);border-radius:var(--radius);margin-bottom:8px;font-size:12px">
                    <div style="display:flex;justify-content:space-between;align-items:center"><strong>${w.event}</strong><span style="font-size:10px;color:#2e7d32">● ${w.status}</span></div>
                    <code style="font-size:10px;color:var(--text-secondary);word-break:break-all">${w.url}</code>
                </div>`).join('')}
            </div></div>
            <div class="card"><div class="card-header"><h3>Usage Stats</h3></div><div class="card-body">
                <div style="text-align:center;margin-bottom:12px"><div style="font-size:32px;font-weight:700;color:#0b6bcb">2,847</div><div style="font-size:12px;color:var(--text-secondary)">API calls today</div></div>
                <div style="height:4px;background:var(--border);border-radius:2px;margin-bottom:4px"><div style="height:100%;width:28%;background:#0b6bcb;border-radius:2px"></div></div>
                <div style="font-size:11px;color:var(--text-secondary)">28% of daily limit used</div>
            </div></div>
        </div>
    </div>`;
}

function openWebhookForm(){openModalRaw(`<div class="modal-header"><h3>Add Webhook</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-group"><label>Webhook URL</label><input class="form-control" id="wh_url" placeholder="https://your-server.com/webhook"></div><div class="form-group"><label>Event</label><select class="form-control" id="wh_event"><option>invoice.paid</option><option>invoice.created</option><option>lead.created</option><option>deal.updated</option><option>task.completed</option><option>client.created</option><option>expense.approved</option></select></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveWebhook()">Save</button></div>`);}
function saveWebhook(){const list=DB.get('webhooks_list',[]);list.push({id:'WH'+genId(),url:document.getElementById('wh_url').value,event:document.getElementById('wh_event').value,status:'active'});DB.set('webhooks_list',list);closeModal();showToast('Webhook registered','success');renderAPIDocs();}