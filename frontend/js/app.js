/* ═══════════════════════════════════════════════════════════
   AZOLVE SaaS - Unified App Engine
   All routing, modals, CRUD, rendering in one file.
   localStorage-first, zero backend dependency.
   ═══════════════════════════════════════════════════════════ */

// ═══════════ GLOBALS ═══════════
let currentView = 'dashboard';
let currentGenericModule = '';
let invoiceLines = [];

// ═══════════ DATA STORE ═══════════
const STORE_KEYS = {
    lead: 'azolve_leads',
    employee: 'azolve_employees',
    deal: 'azolve_deals',
    invoice: 'azolve_invoices',
    transaction: 'azolve_transactions',
    project: 'azolve_projects',
    purchase: 'azolve_purchases',
    product: 'azolve_products',
    generic: 'azolve_generic'
};

function getData(type) {
    const key = STORE_KEYS[type] || ('azolve_' + type);
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    
    // Check if this is a fresh registration (no demo data)
    const freshStart = localStorage.getItem('azolve_fresh_start');
    if (freshStart === 'true') {
        // Return empty array for new companies - no demo data
        return [];
    }
    
    // Only return sample data for existing/demo accounts
    const samples = getSampleData(type);
    localStorage.setItem(key, JSON.stringify(samples));
    return samples;
}

function setData(type, data) {
    const key = STORE_KEYS[type] || ('azolve_' + type);
    localStorage.setItem(key, JSON.stringify(data));
}

// ═══════════ SAMPLE DATA ═══════════
function getSampleData(type) {
    const now = new Date();
    const d = (days) => new Date(now.getTime() + days * 86400000).toISOString().split('T')[0];
    switch(type) {
        case 'lead': return [
            { _id:'l1', firstName:'Sarah', lastName:'Connor', email:'sarah@techcorp.com', phone:'+1 555 0101', company:'TechCorp', status:'qualified', value:45000, source:'website', notes:'Enterprise lead' },
            { _id:'l2', firstName:'John', lastName:'Smith', email:'john@startup.io', phone:'+1 555 0102', company:'Startup.io', status:'new', value:12000, source:'referral', notes:'' },
            { _id:'l3', firstName:'Emily', lastName:'Davis', email:'emily@media.com', phone:'+1 555 0103', company:'MediaGroup', status:'contacted', value:28000, source:'social', notes:'Follow up next week' },
            { _id:'l4', firstName:'Michael', lastName:'Brown', email:'michael@retail.com', phone:'+1 555 0104', company:'RetailPro', status:'converted', value:8400, source:'cold', notes:'Closed deal' },
            { _id:'l5', firstName:'Lisa', lastName:'Johnson', email:'lisa@finance.com', phone:'+1 555 0105', company:'FinanceHub', status:'new', value:65000, source:'website', notes:'High value prospect' },
        ];
        case 'employee': return [
            { _id:'e1', firstName:'James', lastName:'Wilson', email:'james@company.com', phone:'+1 555 1001', department:'Engineering', position:'Senior Developer', status:'active', salary:8500 },
            { _id:'e2', firstName:'Maria', lastName:'Garcia', email:'maria@company.com', phone:'+1 555 1002', department:'Marketing', position:'Marketing Manager', status:'active', salary:7200 },
            { _id:'e3', firstName:'Robert', lastName:'Chen', email:'robert@company.com', phone:'+1 555 1003', department:'Sales', position:'Sales Executive', status:'active', salary:6800 },
            { _id:'e4', firstName:'Sofia', lastName:'Patel', email:'sofia@company.com', phone:'+1 555 1004', department:'HR', position:'HR Coordinator', status:'on_leave', salary:5500 },
            { _id:'e5', firstName:'Kevin', lastName:'Brown', email:'kevin@company.com', phone:'+1 555 1005', department:'Finance', position:'Financial Analyst', status:'active', salary:7800 },
        ];
        case 'deal': return [
            { _id:'d1', name:'Enterprise License - TechCorp', contact:'Alice Johnson', company:'TechCorp Inc.', value:45000, stage:'proposal', probability:65, closeDate:d(14) },
            { _id:'d2', name:'SaaS Subscription - StartupX', contact:'Bob Martinez', company:'StartupX', value:12000, stage:'qualified', probability:40, closeDate:d(30) },
            { _id:'d3', name:'Consulting Project - MediaGroup', contact:'Carol White', company:'MediaGroup', value:28000, stage:'negotiation', probability:80, closeDate:d(7) },
            { _id:'d4', name:'Support Contract - RetailPro', contact:'David Kim', company:'RetailPro', value:8400, stage:'closed_won', probability:100, closeDate:d(-2) },
            { _id:'d5', name:'Platform Upgrade - FinanceHub', contact:'Emma Davis', company:'FinanceHub', value:65000, stage:'prospecting', probability:20, closeDate:d(45) },
        ];
        case 'invoice': return [
            { _id:'i1', number:'INV-2026-001', client:'TechCorp Inc.', clientEmail:'billing@techcorp.com', status:'paid', issueDate:d(-30), dueDate:d(-15), taxRate:10, lines:[{desc:'Enterprise License',qty:1,price:45000}], notes:'Paid on time' },
            { _id:'i2', number:'INV-2026-002', client:'StartupX', clientEmail:'pay@startupx.com', status:'sent', issueDate:d(-10), dueDate:d(20), taxRate:10, lines:[{desc:'SaaS Subscription - Annual',qty:1,price:12000}], notes:'Net 30' },
            { _id:'i3', number:'INV-2026-003', client:'MediaGroup', clientEmail:'accounts@media.com', status:'draft', issueDate:d(0), dueDate:d(30), taxRate:10, lines:[{desc:'Consulting Phase 1',qty:40,price:350},{desc:'Setup Fee',qty:1,price:2000}], notes:'' },
            { _id:'i4', number:'INV-2026-004', client:'RetailPro', clientEmail:'finance@retailpro.com', status:'overdue', issueDate:d(-45), dueDate:d(-15), taxRate:10, lines:[{desc:'Support Contract Q1',qty:1,price:8400}], notes:'Overdue - follow up' },
        ];
        case 'transaction': return [
            { _id:'t1', description:'Client Payment - TechCorp', type:'income', amount:45000, category:'Sales', date:d(-5) },
            { _id:'t2', description:'Office Rent', type:'expense', amount:4500, category:'Rent', date:d(-3) },
            { _id:'t3', description:'SaaS Subscription Income', type:'income', amount:12000, category:'Subscription', date:d(-2) },
            { _id:'t4', description:'Employee Salaries', type:'expense', amount:35800, category:'Salary', date:d(-1) },
            { _id:'t5', description:'Marketing Campaign', type:'expense', amount:3200, category:'Marketing', date:d(0) },
            { _id:'t6', description:'Consulting Revenue', type:'income', amount:16000, category:'Services', date:d(0) },
        ];
        case 'project': return [
            { _id:'p1', name:'Website Redesign', description:'Complete overhaul of company website', status:'in_progress', dueDate:d(30), budget:25000, color:'#00A09D', tasks:[
                {_id:'tk1',title:'Design Mockups',status:'done',priority:'high'},{_id:'tk2',title:'Frontend Development',status:'in_progress',priority:'high'},{_id:'tk3',title:'Backend API',status:'todo',priority:'medium'}
            ]},
            { _id:'p2', name:'Mobile App V2', description:'Next version of mobile application', status:'planning', dueDate:d(60), budget:45000, color:'#007bff', tasks:[
                {_id:'tk4',title:'Requirements Gathering',status:'in_progress',priority:'high'},{_id:'tk5',title:'UI/UX Design',status:'todo',priority:'medium'}
            ]},
            { _id:'p3', name:'CRM Integration', description:'Integrate CRM with existing tools', status:'completed', dueDate:d(-10), budget:12000, color:'#28a745', tasks:[
                {_id:'tk6',title:'API Integration',status:'done',priority:'high'},{_id:'tk7',title:'Testing',status:'done',priority:'high'}
            ]},
        ];
        case 'purchase': return [
            { _id:'po1', number:'PO-001', vendor:'Dell Technologies', items:'Laptop x5, Monitor x10', total:18500, status:'received', date:d(-20) },
            { _id:'po2', number:'PO-002', vendor:'AWS Services', items:'Cloud Hosting - Annual', total:24000, status:'approved', date:d(-5) },
            { _id:'po3', number:'PO-003', vendor:'Office Depot', items:'Office Supplies Q1', total:2300, status:'pending', date:d(0) },
        ];
        case 'product': return [
            { _id:'pr1', name:'Enterprise Suite', sku:'ENT-001', category:'Software', price:4500, stock:999, status:'active', desc:'Full enterprise solution' },
            { _id:'pr2', name:'Basic Plan', sku:'BAS-001', category:'Subscription', price:29, stock:999, status:'active', desc:'Monthly subscription' },
            { _id:'pr3', name:'Pro Plan', sku:'PRO-001', category:'Subscription', price:99, stock:999, status:'active', desc:'Professional monthly plan' },
            { _id:'pr4', name:'Setup Service', sku:'SVC-001', category:'Service', price:500, stock:50, status:'active', desc:'One-time setup service' },
            { _id:'pr5', name:'USB Hub', sku:'HW-001', category:'Hardware', price:45, stock:3, status:'active', desc:'4-port USB hub' },
        ];
        default: return [];
    }
}

// ═══════════ TOAST ═══════════
function showToast(msg, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
    toast.innerHTML = '<i class="fas ' + (icons[type]||'fa-info-circle') + '"></i>' + msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ═══════════ SIDEBAR ═══════════
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) { sb.classList.toggle('mobile-open'); }
    else { sb.classList.toggle('collapsed'); }
}

function toggleSubNav(linkEl) {
    const item = linkEl.closest('.nav-item');
    item.classList.toggle('open');
}

function filterSidebarMenu() {
    const q = document.getElementById('sidebarSearch').value.toLowerCase();
    document.querySelectorAll('#sidebarNav .nav-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? '' : 'none';
        if (q && text.includes(q)) item.classList.add('open');
    });
}

// ═══════════ NAVIGATION ═══════════
const VIEW_MAP = {
    dashboard:'dashboard', crm:'crm', leads:'crm', contacts:'crm', deals:'sales',
    hrm:'hrm', employees:'hrm', departments:'hrm', attendance:'hrm', payroll:'hrm', leaves:'hrm',
    sales:'sales', salesreport:'sales',
    invoice:'invoice', revenue:'invoice', creditnote:'invoice',
    finance:'finance', chartofacc:'finance', journal:'finance',
    project:'project', tasks:'project', taskboard:'project',
    purchase:'purchase', vendorbills:'purchase', expenses:'purchase',
    products:'products', services:'products', categories:'products',
};

const MODULE_LABELS = {
    dashboard:'Account Dashboard', crm:'CRM - Leads', hrm:'HRM - Employees', sales:'Sales Pipeline',
    invoice:'Sales Invoices', finance:'Finance & Accounting', project:'Projects',
    purchase:'Purchase Orders', products:'Products & Services',
    users:'User Management', roles:'Roles & Permissions', proposal:'Proposals', quotation:'Quotations',
    retainer:'Retainers', retainerpay:'Retainer Payments', goal:'Goals', goaltrack:'Goal Tracking',
    budget:'Budget Planner', budgetreport:'Budget Reports', ledger:'Ledger', trialbal:'Trial Balance',
    balsheet:'Balance Sheet', performance:'Performance Reviews', kpi:'KPIs',
    training:'Training Programs', trainers:'Trainers', recruitment:'Job Postings', applicants:'Applicants',
    jobsearch:'Job Search', biometric:'Biometric Attendance', procurement:'Procurement', vendors:'Vendors',
    pos:'Point of Sale', posorders:'POS Orders', formbuilder:'Form Builder', assets:'Assets',
    assetcats:'Asset Categories', socialmedia:'Social Media Analytics',
    supportticket:'Support Tickets', helpdesk:'Helpdesk', calendar:'Calendar', appointment:'Appointments',
    inventory:'Inventory', notes:'Notes', todo:'To Do', timetracker:'Time Tracker', timesheet:'Timesheet',
    settings:'Settings', messenger:'Messenger', mailbox:'MailBox', newsletter:'Newsletter',
    feedback:'Feedback', filesharing:'File Sharing', workflow:'Workflow', planning:'Planning',
    knowledge:'Internal Knowledge', callhub:'Call Hub', queue:'Queue Management',
    roadmap:'RoadMap Central', teamworkload:'Team Workload', pettycash:'Petty Cash',
    activitylog:'Activity Log', visitors:'Visitors', documents:'Documents', blog:'Blog & Article',
    contract:'Contract', salesagent:'Sales Agent', warranty:'Warranty',
};

function navigateTo(page) {
    // Determine which view to show
    const viewId = VIEW_MAP[page] || null;
    const label = MODULE_LABELS[page] || page.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    // Update breadcrumb
    document.getElementById('breadcrumbPage').textContent = label;

    // Hide all views
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));

    if (viewId && document.getElementById('view_' + viewId)) {
        document.getElementById('view_' + viewId).classList.add('active');
        currentView = viewId;
        initModuleView(viewId);
    } else {
        // Use generic view for modules without dedicated views
        const gv = document.getElementById('view_generic');
        gv.classList.add('active');
        currentView = 'generic';
        currentGenericModule = page;
        setupGenericView(page, label);
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');
}

function setupGenericView(page, label) {
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    const iconMap = MODULE_LABELS[page] ? '<i class="fas fa-cube" style="color:#00A09D;margin-right:8px;"></i>' : '';
    document.getElementById('genericTitle').innerHTML = iconMap + label;
    document.getElementById('genericSubtitle').textContent = 'Manage ' + label.toLowerCase();
    document.getElementById('genericAddBtn').textContent = 'Add ' + label.split(' ')[0];
    document.getElementById('modal_generic_title').textContent = 'Add ' + label.split(' ')[0];

    // Load generic data for this module
    const key = 'azolve_gen_' + page;
    let data = JSON.parse(localStorage.getItem(key) || '[]');
    el('genTotal', data.length);
    el('genActive', data.filter(d => d.status === 'active').length);
    el('genPending', data.filter(d => d.status === 'pending').length);
    const thisMonth = new Date().getMonth();
    el('genThisMonth', data.filter(d => d.date && new Date(d.date).getMonth() === thisMonth).length);
    renderGenericTable(data);
}

function renderGenericTable(data) {
    const tbody = document.getElementById('genTableBody');
    if (!tbody) return;
    const search = (document.getElementById('genSearchInput')?.value || '').toLowerCase();
    let filtered = data;
    if (search) filtered = filtered.filter(d => (d.name||'').toLowerCase().includes(search) || (d.type||'').toLowerCase().includes(search));

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i><p>No records yet. Click Add to get started!</p></td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(d => `<tr>
        <td style="font-weight:600;color:#2c3e50;">${d.name||'-'}</td>
        <td>${d.type||'-'}</td>
        <td><span class="badge badge-${d.status==='active'?'success':d.status==='pending'?'warning':d.status==='completed'?'info':'secondary'}">${d.status||'-'}</span></td>
        <td style="font-size:12px;color:#888;">${d.date||'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editGenericRecord('${d._id}')" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteGenericRecord('${d._id}')" title="Delete"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join('');
}

// ═══════════ MODULE INIT ═══════════
function initModuleView(viewId) {
    switch(viewId) {
        case 'dashboard': initDashboard(); break;
        case 'crm': renderModule('crm'); break;
        case 'hrm': renderModule('hrm'); break;
        case 'sales': renderModule('sales'); break;
        case 'invoice': renderModule('invoice'); break;
        case 'finance': renderModule('finance'); break;
        case 'project': renderModule('project'); break;
        case 'purchase': renderModule('purchase'); break;
        case 'products': renderModule('products'); break;
    }
}

// ═══════════ DASHBOARD ═══════════
function initDashboard() {
    // Customer payment chart
    const custData = [0, 2000, 15000, 120000, 450000, 445508];
    const vendData = [0, 500, 800, 1200, 18000, 17872];
    const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];
    renderBarChart('custPayChart', custData, months, '#28a745');
    renderBarChart('vendPayChart', vendData, months, '#dc3545');

    // Recent revenue & expenses
    const txs = getData('transaction');
    const income = txs.filter(t => t.type === 'income').slice(0, 5);
    const expense = txs.filter(t => t.type === 'expense').slice(0, 5);

    const revEl = document.getElementById('recentRevenue');
    if (revEl) revEl.innerHTML = income.length === 0 ? '<div style="color:#aaa;text-align:center;">No recent revenue</div>' :
        income.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
            <div><div style="font-weight:600;font-size:13px;">${t.description||'No description'}</div><div style="font-size:11px;color:#888;">${t.category||'Uncategorized'}</div></div>
            <div style="font-weight:700;color:#28a745;">$${Number(t.amount).toLocaleString()}</div>
        </div>`).join('');

    const expEl = document.getElementById('recentExpenses');
    if (expEl) expEl.innerHTML = expense.length === 0 ? '<div style="color:#aaa;text-align:center;">No recent expenses</div>' :
        expense.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
            <div><div style="font-weight:600;font-size:13px;">${t.description||'No description'}</div><div style="font-size:11px;color:#888;">${t.category||'Uncategorized'}</div></div>
            <div style="font-weight:700;color:#dc3545;">$${Number(t.amount).toLocaleString()}</div>
        </div>`).join('');

    // Update dashboard stats
    const leads = getData('lead');
    const emps = getData('employee');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('dashTotalClients', leads.length);
    el('dashTotalVendors', getData('purchase').length + 10);
    const totalCustPay = txs.filter(t=>t.type==='income').reduce((s,t)=>s+(t.amount||0),0);
    const totalVendPay = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.amount||0),0);
    el('dashCustPayment', '$' + totalCustPay.toLocaleString());
    el('dashVendorPayment', '$' + totalVendPay.toLocaleString());
}

function renderBarChart(containerId, data, labels, color) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const max = Math.max(...data, 1);
    el.innerHTML = data.map((val, i) => {
        const pct = Math.max((val / max) * 100, 2);
        return `<div class="chart-bar-wrap">
            <div class="chart-value">${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}</div>
            <div class="chart-bar" style="height:${pct}%;background:${color};"></div>
            <div class="chart-label">${labels[i]}</div>
        </div>`;
    }).join('');
}

// ═══════════ RENDER MODULES ═══════════
function renderModule(mod) {
    switch(mod) {
        case 'crm': renderCRM(); break;
        case 'hrm': renderHRM(); break;
        case 'sales': renderSales(); break;
        case 'invoice': renderInvoices(); break;
        case 'invoice-templates': renderTemplateManager(); break;
        case 'finance': renderFinance(); break;
        case 'project': renderProjects(); break;
        case 'purchase': renderPurchases(); break;
        case 'products': renderProducts(); break;
        case 'generic': { const key='azolve_gen_'+currentGenericModule; renderGenericTable(JSON.parse(localStorage.getItem(key)||'[]')); break; }
    }
}

// ── CRM ──
function renderCRM() {
    const data = getData('lead');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('crmTotalLeads', data.length);
    el('crmConverted', data.filter(d=>d.status==='converted').length);
    el('crmInProgress', data.filter(d=>['contacted','qualified'].includes(d.status)).length);
    const pv = data.filter(d=>d.status!=='lost'&&d.status!=='converted').reduce((s,d)=>s+(d.value||0),0);
    el('crmPipelineVal', '$' + (pv>=1000?(pv/1000).toFixed(0)+'k':pv.toLocaleString()));

    const tbody = document.getElementById('crmTableBody'); if(!tbody) return;
    const search = (document.getElementById('leadSearchInput')?.value||'').toLowerCase();
    const filter = document.getElementById('leadStatusFilter')?.value||'';
    let filtered = data;
    if (filter) filtered = filtered.filter(d=>d.status===filter);
    if (search) filtered = filtered.filter(d=>(d.firstName+' '+d.lastName+' '+d.email+' '+d.company).toLowerCase().includes(search));

    const statusBadge = {new:'info',contacted:'warning',qualified:'primary',converted:'success',lost:'danger'};
    tbody.innerHTML = filtered.length === 0 ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No leads found. <a href="#" onclick="openModal(\'lead\')">Add your first lead!</a></p></div></td></tr>' :
    filtered.map(d => {
        const name = (d.firstName||'')+ ' ' + (d.lastName||'');
        const initials = name.trim().split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
        return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00A09D,#00C9C6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${initials}</div><div style="font-weight:600;">${name}</div></div></td>
        <td style="font-size:13px;">${d.email||'-'}</td><td style="font-size:13px;">${d.phone||'-'}</td><td style="font-size:13px;">${d.company||'-'}</td>
        <td><span class="badge badge-${statusBadge[d.status]||'secondary'}">${d.status||'-'}</span></td>
        <td style="font-weight:700;color:#00A09D;">${d.value?'$'+Number(d.value).toLocaleString():'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('lead','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('lead','${d._id}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
    }).join('');
}

// ── HRM ──
function renderHRM() {
    const data = getData('employee');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('hrmTotal', data.length);
    el('hrmActive', data.filter(d=>d.status==='active').length);
    el('hrmDepts', [...new Set(data.map(d=>d.department).filter(Boolean))].length);
    const payroll = data.filter(d=>d.status==='active').reduce((s,d)=>s+(d.salary||0),0);
    el('hrmPayroll', '$' + (payroll>=1000?(payroll/1000).toFixed(0)+'k':payroll.toLocaleString()));

    const tbody = document.getElementById('hrmTableBody'); if(!tbody) return;
    const search = (document.getElementById('hrmSearchInput')?.value||'').toLowerCase();
    const deptFilter = document.getElementById('hrmDeptFilter')?.value||'';
    let filtered = data;
    if (deptFilter) filtered = filtered.filter(d=>d.department===deptFilter);
    if (search) filtered = filtered.filter(d=>(d.firstName+' '+d.lastName+' '+d.email+' '+d.position).toLowerCase().includes(search));

    const statusBadge = {active:'success',on_leave:'warning',inactive:'danger'};
    const statusLabel = {active:'Active',on_leave:'On Leave',inactive:'Inactive'};
    tbody.innerHTML = filtered.length === 0 ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>No employees found. <a href="#" onclick="openModal(\'employee\')">Add first employee!</a></p></div></td></tr>' :
    filtered.map(d => {
        const name = (d.firstName||'')+ ' ' + (d.lastName||'');
        const initials = name.trim().split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
        return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px;"><div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#714B67,#9b6b8f);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${initials}</div><div><div style="font-weight:600;">${name}</div><div style="font-size:11px;color:#888;">${d.phone||''}</div></div></div></td>
        <td style="font-size:13px;">${d.email||'-'}</td><td style="font-size:13px;">${d.department||'-'}</td><td style="font-size:13px;">${d.position||'-'}</td>
        <td><span class="badge badge-${statusBadge[d.status]||'secondary'}">${statusLabel[d.status]||d.status}</span></td>
        <td style="font-weight:700;color:#00A09D;">${d.salary?'$'+Number(d.salary).toLocaleString()+'/mo':'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('employee','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('employee','${d._id}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
    }).join('');
}

// ── SALES ──
let salesViewMode = 'pipeline';
function switchSalesView(mode) {
    salesViewMode = mode;
    const board = document.getElementById('salesPipelineBoard');
    const table = document.getElementById('salesTableWrap');
    const btnP = document.getElementById('salesBtnPipeline');
    const btnT = document.getElementById('salesBtnTable');
    if (mode==='pipeline') { if(board)board.style.display=''; if(table)table.style.display='none'; btnP?.classList.add('active'); btnT?.classList.remove('active'); }
    else { if(board)board.style.display='none'; if(table)table.style.display=''; btnP?.classList.remove('active'); btnT?.classList.add('active'); }
    renderSales();
}

function renderSales() {
    const data = getData('deal');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    const active = data.filter(d=>!['closed_won','closed_lost'].includes(d.stage));
    const won = data.filter(d=>d.stage==='closed_won');
    const totalPipeline = active.reduce((s,d)=>s+(d.value||0),0);
    const wonRev = won.reduce((s,d)=>s+(d.value||0),0);
    const closed = data.filter(d=>['closed_won','closed_lost'].includes(d.stage));
    const winRate = closed.length>0 ? Math.round(won.length/closed.length*100) : 0;

    el('salesTotalDeals', data.length);
    el('salesPipelineValue', '$'+(totalPipeline>=1000?(totalPipeline/1000).toFixed(0)+'k':totalPipeline.toLocaleString()));
    el('salesWonValue', '$'+(wonRev>=1000?(wonRev/1000).toFixed(0)+'k':wonRev.toLocaleString()));
    el('salesWinRate', winRate+'%');

    // Pipeline board
    const board = document.getElementById('salesPipelineBoard');
    if (board && salesViewMode==='pipeline') {
        const stages = ['prospecting','qualified','proposal','negotiation','closed_won','closed_lost'];
        const labels = {prospecting:'Prospecting',qualified:'Qualified',proposal:'Proposal',negotiation:'Negotiation',closed_won:'Won ✓',closed_lost:'Lost ✗'};
        const colors = {prospecting:'#6c757d',qualified:'#17a2b8',proposal:'#ffc107',negotiation:'#007bff',closed_won:'#28a745',closed_lost:'#dc3545'};
        const bgs = {prospecting:'#f8f9fa',qualified:'#e8f6f9',proposal:'#fffbec',negotiation:'#eef3fb',closed_won:'#eaf7ee',closed_lost:'#fdf0f0'};

        board.innerHTML = stages.map(stage => {
            const sd = data.filter(d=>d.stage===stage);
            const total = sd.reduce((s,d)=>s+(d.value||0),0);
            const cards = sd.length===0 ? '<div style="text-align:center;color:#ccc;padding:20px;font-size:12px;">No deals</div>' :
                sd.map(d=>`<div class="pipeline-card" onclick="editRecord('deal','${d._id}')">
                    <div style="font-size:12px;font-weight:700;color:#2c3e50;margin-bottom:4px;">${d.name}</div>
                    <div style="font-size:11px;color:#888;margin-bottom:6px;">${d.contact||''}</div>
                    <div style="display:flex;justify-content:space-between;"><span style="font-size:12px;font-weight:700;color:${colors[stage]};">$${Number(d.value||0).toLocaleString()}</span><span style="font-size:10px;color:#aaa;">${d.probability||0}%</span></div>
                </div>`).join('');
            return `<div class="pipeline-col" style="border-top:3px solid ${colors[stage]};background:${bgs[stage]};">
                <div class="pipeline-col-header" style="color:${colors[stage]};">${labels[stage]}</div>
                <div class="pipeline-col-sub">${sd.length} deal${sd.length!==1?'s':''} · $${total>=1000?(total/1000).toFixed(0)+'k':total.toLocaleString()}</div>
                ${cards}
                <button onclick="openDealModalWithStage('${stage}')" style="width:100%;margin-top:8px;padding:6px;border:1.5px dashed #ccc;border-radius:6px;background:transparent;color:#aaa;font-size:11px;cursor:pointer;">+ Add Deal</button>
            </div>`;
        }).join('');
    }

    // Table view
    const tbody = document.getElementById('salesTableBody'); if(!tbody) return;
    const search = (document.getElementById('dealSearchInput')?.value||'').toLowerCase();
    const stageFilter = document.getElementById('dealStageFilter')?.value||'';
    let filtered = data;
    if (stageFilter) filtered = filtered.filter(d=>d.stage===stageFilter);
    if (search) filtered = filtered.filter(d=>(d.name+' '+d.contact+' '+d.company).toLowerCase().includes(search));

    const stageColors = {prospecting:'secondary',qualified:'info',proposal:'warning',negotiation:'primary',closed_won:'success',closed_lost:'danger'};
    const stageLabels = {prospecting:'Prospecting',qualified:'Qualified',proposal:'Proposal',negotiation:'Negotiation',closed_won:'Won',closed_lost:'Lost'};
    tbody.innerHTML = filtered.length===0 ? '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-handshake"></i><p>No deals found. <a href="#" onclick="openModal(\'deal\')">Add first deal!</a></p></div></td></tr>' :
    filtered.map(d=>`<tr>
        <td style="font-weight:600;color:#2c3e50;">${d.name}</td><td style="font-size:13px;">${d.contact||'-'}</td><td style="font-size:13px;">${d.company||'-'}</td>
        <td style="font-weight:700;color:#28a745;">$${Number(d.value||0).toLocaleString()}</td>
        <td><span class="badge badge-${stageColors[d.stage]||'secondary'}">${stageLabels[d.stage]||d.stage}</span></td>
        <td><div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;"><div style="height:100%;width:${d.probability||0}%;background:#28a745;border-radius:3px;"></div></div><span style="font-size:11px;color:#888;">${d.probability||0}%</span></div></td>
        <td style="font-size:12px;color:#888;">${d.closeDate||'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('deal','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('deal','${d._id}')"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join('');
}

function openDealModalWithStage(stage) { openModal('deal'); document.getElementById('deal_stage').value = stage; }

// ── INVOICES ──
function renderInvoices() {
    const data = getData('invoice');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    const calcTotal = inv => { const sub=(inv.lines||[]).reduce((s,l)=>s+(l.qty||0)*(l.price||0),0); return sub + sub*(inv.taxRate||0)/100; };
    el('invTotalInvoices', data.length);
    el('invTotalBilled', '$'+data.reduce((s,d)=>s+calcTotal(d),0).toLocaleString());
    el('invTotalPaid', '$'+data.filter(d=>d.status==='paid').reduce((s,d)=>s+calcTotal(d),0).toLocaleString());
    el('invOutstanding', '$'+data.filter(d=>d.status!=='paid').reduce((s,d)=>s+calcTotal(d),0).toLocaleString());

    const tbody = document.getElementById('invTableBody'); if(!tbody) return;
    const search = (document.getElementById('invSearchInput')?.value||'').toLowerCase();
    const filter = document.getElementById('invStatusFilter')?.value||'';
    let filtered = data;
    if (filter) filtered = filtered.filter(d=>d.status===filter);
    if (search) filtered = filtered.filter(d=>(d.number+' '+d.client).toLowerCase().includes(search));

    const statusBadge = {draft:'secondary',sent:'info',paid:'success',overdue:'danger'};
    tbody.innerHTML = filtered.length===0 ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-file-invoice"></i><p>No invoices yet. <a href="#" onclick="openModal(\'invoice\')">Create first invoice!</a></p></div></td></tr>' :
    filtered.map(d=>{
        const total = calcTotal(d);
        return `<tr>
        <td style="font-weight:600;color:#2c3e50;">${d.number}</td><td style="font-size:13px;">${d.client||'-'}</td>
        <td style="font-weight:700;color:#00A09D;">$${total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
        <td style="font-size:12px;">${d.issueDate||'-'}</td><td style="font-size:12px;">${d.dueDate||'-'}</td>
        <td><span class="badge badge-${statusBadge[d.status]||'secondary'}">${d.status}</span></td>
        <td><div style="display:flex;gap:6px;">
            <button class="btn-icon" onclick="viewInvoiceWithTemplate('${d._id}')" title="View" style="color:#00A09D;"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" onclick="editRecord('invoice','${d._id}')" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" onclick="viewInvoicePrint('${d._id}')" title="Print/PDF"><i class="fas fa-print"></i></button>
            ${d.status==='draft'?`<button class="btn-icon" onclick="markInvoice('${d._id}','sent')" title="Mark Sent"><i class="fas fa-paper-plane"></i></button>`:''}
            ${d.status==='sent'||d.status==='overdue'?`<button class="btn-icon" onclick="markInvoice('${d._id}','paid')" title="Mark Paid"><i class="fas fa-check"></i></button>`:''}
            <button class="btn-icon danger" onclick="deleteRecord('invoice','${d._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div></td></tr>`;
    }).join('');
}

function markInvoice(id, status) {
    let data = getData('invoice');
    const idx = data.findIndex(d=>d._id===id);
    if (idx!==-1) { data[idx].status = status; setData('invoice', data); showToast('Invoice marked as '+status, 'success'); renderInvoices(); }
}

function viewInvoicePrint(id) {
    const data = getData('invoice');
    const inv = data.find(d=>d._id===id);
    if (!inv) return;
    const sub = (inv.lines||[]).reduce((s,l)=>s+(l.qty||0)*(l.price||0),0);
    const tax = sub * (inv.taxRate||0) / 100;
    const total = sub + tax;
    const linesHtml = (inv.lines||[]).map(l=>`<tr><td style="padding:8px;border-bottom:1px solid #eee;">${l.desc||''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${l.qty||0}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${Number(l.price||0).toFixed(2)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${((l.qty||0)*(l.price||0)).toFixed(2)}</td></tr>`).join('');
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${inv.number}</title><style>body{font-family:Inter,sans-serif;margin:40px;color:#333;}table{width:100%;border-collapse:collapse;}h1{color:#00A09D;}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;"><div><h1>AZOLVE</h1><p style="color:#888;">Enterprise Business Suite</p></div><div style="text-align:right;"><h2 style="margin:0;color:#1a2b4d;">INVOICE</h2><p style="font-size:18px;color:#00A09D;font-weight:700;">${inv.number}</p></div></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:30px;"><div><strong>Bill To:</strong><br>${inv.client||''}<br>${inv.clientEmail||''}</div><div style="text-align:right;"><strong>Issue Date:</strong> ${inv.issueDate||''}<br><strong>Due Date:</strong> ${inv.dueDate||''}<br><span class="badge" style="background:${inv.status==='paid'?'#d4edda':inv.status==='overdue'?'#f8d7da':'#d1ecf1'};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">${inv.status.toUpperCase()}</span></div></div>
    <table><thead><tr style="background:#f8f9fa;"><th style="padding:10px;text-align:left;">Description</th><th style="padding:10px;text-align:center;">Qty</th><th style="padding:10px;text-align:right;">Price</th><th style="padding:10px;text-align:right;">Total</th></tr></thead><tbody>${linesHtml}</tbody></table>
    <div style="text-align:right;margin-top:20px;"><div style="margin:4px 0;">Subtotal: <strong>$${sub.toFixed(2)}</strong></div><div style="margin:4px 0;">Tax (${inv.taxRate||0}%): <strong>$${tax.toFixed(2)}</strong></div><div style="margin-top:8px;padding-top:8px;border-top:2px solid #00A09D;font-size:20px;color:#00A09D;font-weight:700;">Total: $${total.toFixed(2)}</div></div>
    ${inv.notes?'<div style="margin-top:30px;padding:16px;background:#f8f9fa;border-radius:8px;"><strong>Notes:</strong><br>'+inv.notes+'</div>':''}
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
}

// ── FINANCE ──
function renderFinance() {
    const data = getData('transaction');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    const income = data.filter(d=>d.type==='income').reduce((s,d)=>s+(d.amount||0),0);
    const expense = data.filter(d=>d.type==='expense').reduce((s,d)=>s+(d.amount||0),0);
    el('finTotalIncome', '$'+income.toLocaleString());
    el('finTotalExpenses', '$'+expense.toLocaleString());
    el('finNetBalance', '$'+(income-expense).toLocaleString());
    el('finTxCount', data.length);

    const tbody = document.getElementById('finTableBody'); if(!tbody) return;
    const search = (document.getElementById('finSearchInput')?.value||'').toLowerCase();
    const filter = document.getElementById('finTypeFilter')?.value||'';
    let filtered = data;
    if (filter) filtered = filtered.filter(d=>d.type===filter);
    if (search) filtered = filtered.filter(d=>(d.description+' '+d.category).toLowerCase().includes(search));

    tbody.innerHTML = filtered.length===0 ? '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-wallet"></i><p>No transactions. <a href="#" onclick="openModal(\'transaction\')">Add first transaction!</a></p></div></td></tr>' :
    filtered.map(d=>`<tr>
        <td style="font-weight:600;">${d.description||'-'}</td>
        <td><span class="badge badge-${d.type==='income'?'success':'danger'}">${d.type}</span></td>
        <td style="font-size:13px;">${d.category||'-'}</td>
        <td style="font-weight:700;color:${d.type==='income'?'#28a745':'#dc3545'};">$${Number(d.amount||0).toLocaleString()}</td>
        <td style="font-size:12px;color:#888;">${d.date||'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('transaction','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('transaction','${d._id}')"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join('');
}

// ── PROJECTS ──
function renderProjects() {
    const data = getData('project');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    const allTasks = data.flatMap(p=>p.tasks||[]);
    el('projTotalProjects', data.length);
    el('projCompleted', data.filter(d=>d.status==='completed').length);
    el('projInProgress', data.filter(d=>d.status==='in_progress').length);
    el('projTotalTasks', allTasks.length);

    const container = document.getElementById('projectsList'); if(!container) return;
    container.innerHTML = data.length===0 ? '<div class="empty-state"><i class="fas fa-project-diagram"></i><p>No projects yet. <a href="#" onclick="openModal(\'project\')">Create first project!</a></p></div>' :
    data.map(p => {
        const tasks = p.tasks||[];
        const done = tasks.filter(t=>t.status==='done').length;
        const pct = tasks.length>0?Math.round(done/tasks.length*100):0;
        const statusColors = {planning:'info',in_progress:'warning',completed:'success',on_hold:'secondary'};
        const statusLabels = {planning:'Planning',in_progress:'In Progress',completed:'Completed',on_hold:'On Hold'};
        return `<div class="card" style="margin-bottom:16px;">
            <div class="card-header" style="border-left:4px solid ${p.color||'#00A09D'};">
                <div><h3 style="display:flex;align-items:center;gap:8px;">${p.name} <span class="badge badge-${statusColors[p.status]||'secondary'}">${statusLabels[p.status]||p.status}</span></h3>
                <div style="font-size:12px;color:#888;margin-top:2px;">${p.description||''}</div></div>
                <div style="display:flex;gap:8px;"><button class="btn-icon" onclick="editRecord('project','${p._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('project','${p._id}')"><i class="fas fa-trash"></i></button></div>
            </div>
            <div class="card-body">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <div style="flex:1;height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${p.color||'#00A09D'};border-radius:4px;transition:width .5s;"></div></div>
                    <span style="font-size:12px;font-weight:700;color:${p.color||'#00A09D'};">${pct}%</span>
                </div>
                <div style="display:flex;gap:16px;font-size:12px;color:#888;">
                    <span><i class="fas fa-tasks"></i> ${tasks.length} tasks</span><span><i class="fas fa-check-circle"></i> ${done} done</span>
                    ${p.dueDate?'<span><i class="fas fa-calendar"></i> Due: '+p.dueDate+'</span>':''}
                    ${p.budget?'<span><i class="fas fa-dollar-sign"></i> Budget: $'+Number(p.budget).toLocaleString()+'</span>':''}
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── PURCHASES ──
function renderPurchases() {
    const data = getData('purchase');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('poTotal', data.length);
    el('poReceived', data.filter(d=>d.status==='received').length);
    el('poPending', data.filter(d=>d.status==='pending').length);
    el('poSpent', '$'+data.reduce((s,d)=>s+(d.total||0),0).toLocaleString());

    const tbody = document.getElementById('poTableBody'); if(!tbody) return;
    const search = (document.getElementById('poSearchInput')?.value||'').toLowerCase();
    let filtered = data;
    if (search) filtered = filtered.filter(d=>(d.number+' '+d.vendor+' '+d.items).toLowerCase().includes(search));

    const statusBadge = {pending:'warning',approved:'info',received:'success',cancelled:'danger'};
    tbody.innerHTML = filtered.length===0 ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-shopping-cart"></i><p>No purchase orders. <a href="#" onclick="openModal(\'purchase\')">Create one!</a></p></div></td></tr>' :
    filtered.map(d=>`<tr>
        <td style="font-weight:600;">${d.number||'-'}</td><td style="font-size:13px;">${d.vendor||'-'}</td><td style="font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${d.items||'-'}</td>
        <td style="font-weight:700;color:#dc3545;">$${Number(d.total||0).toLocaleString()}</td>
        <td><span class="badge badge-${statusBadge[d.status]||'secondary'}">${d.status}</span></td>
        <td style="font-size:12px;color:#888;">${d.date||'-'}</td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('purchase','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('purchase','${d._id}')"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join('');
}

// ── PRODUCTS ──
function renderProducts() {
    const data = getData('product');
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('prodTotal', data.length);
    el('prodInStock', data.filter(d=>d.stock>10).length);
    el('prodLowStock', data.filter(d=>d.stock>0&&d.stock<=10).length);
    el('prodCategories', [...new Set(data.map(d=>d.category).filter(Boolean))].length);

    const tbody = document.getElementById('prodTableBody'); if(!tbody) return;
    const search = (document.getElementById('prodSearchInput')?.value||'').toLowerCase();
    let filtered = data;
    if (search) filtered = filtered.filter(d=>(d.name+' '+d.sku+' '+d.category).toLowerCase().includes(search));

    const statusBadge = {active:'success',draft:'secondary',discontinued:'danger'};
    tbody.innerHTML = filtered.length===0 ? '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-box"></i><p>No products. <a href="#" onclick="openModal(\'product\')">Add first product!</a></p></div></td></tr>' :
    filtered.map(d=>`<tr>
        <td style="font-weight:600;">${d.name||'-'}</td><td style="font-size:13px;">${d.sku||'-'}</td><td style="font-size:13px;">${d.category||'-'}</td>
        <td style="font-weight:700;color:#00A09D;">$${Number(d.price||0).toLocaleString()}</td>
        <td>${d.stock<=10&&d.stock>0?'<span style="color:#dc3545;font-weight:700;">'+d.stock+'</span>':d.stock}</td>
        <td><span class="badge badge-${statusBadge[d.status]||'secondary'}">${d.status||'active'}</span></td>
        <td><div style="display:flex;gap:6px;"><button class="btn-icon" onclick="editRecord('product','${d._id}')"><i class="fas fa-edit"></i></button><button class="btn-icon danger" onclick="deleteRecord('product','${d._id}')"><i class="fas fa-trash"></i></button></div></td>
    </tr>`).join('');
}


// ═══════════ MODAL SYSTEM ═══════════
function openModal(type) {
    const overlay = document.getElementById('modal_' + type);
    if (!overlay) return;
    // Reset form
    clearModalFields(type);
    const titleEl = document.getElementById('modal_' + type + '_title');
    if (titleEl) {
        const labels = {lead:'Add Lead',employee:'Add Employee',deal:'Add Deal',invoice:'New Invoice',transaction:'Add Transaction',project:'New Project',purchase:'New Purchase Order',product:'Add Product',generic:'Add Item'};
        titleEl.textContent = labels[type] || 'Add Item';
    }
    // Invoice lines
    if (type === 'invoice') {
        invoiceLines = [{desc:'',qty:1,price:0}];
        renderInvoiceLines();
        document.getElementById('inv_number').value = 'INV-' + new Date().getFullYear() + '-' + String(getData('invoice').length + 1).padStart(3,'0');
        document.getElementById('inv_issueDate').value = new Date().toISOString().split('T')[0];
        const due = new Date(); due.setDate(due.getDate()+30);
        document.getElementById('inv_dueDate').value = due.toISOString().split('T')[0];
    }
    overlay.classList.add('active');
}

function closeModal(type) {
    const overlay = document.getElementById('modal_' + type);
    if (overlay) overlay.classList.remove('active');
}

function clearModalFields(type) {
    const prefixes = {lead:'lead_',employee:'emp_',deal:'deal_',invoice:'inv_',transaction:'tx_',project:'proj_',purchase:'po_',product:'prod_',generic:'gen_'};
    const prefix = prefixes[type] || (type + '_');
    const modal = document.getElementById('modal_' + type);
    if (!modal) return;
    modal.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type === 'hidden') el.value = '';
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type === 'color') el.value = '#00A09D';
        else if (el.type === 'number' && el.id.includes('taxRate')) el.value = '10';
        else if (el.type === 'number' && el.id.includes('probability')) el.value = '20';
        else el.value = '';
    });
}

// Close modal when clicking overlay
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ═══════════ SAVE RECORD ═══════════
function saveRecord(type) {
    switch(type) {
        case 'lead': return saveLead();
        case 'employee': return saveEmployee();
        case 'deal': return saveDeal();
        case 'invoice': return saveInvoice();
        case 'transaction': return saveTransaction();
        case 'project': return saveProject();
        case 'purchase': return savePurchase();
        case 'product': return saveProduct();
        case 'generic': return saveGeneric();
    }
}

function saveLead() {
    const fn = document.getElementById('lead_firstName')?.value?.trim();
    if (!fn) { showToast('First name is required','error'); return; }
    const data = getData('lead');
    const editId = document.getElementById('lead_editId')?.value;
    const record = {
        firstName: fn, lastName: document.getElementById('lead_lastName')?.value?.trim()||'',
        email: document.getElementById('lead_email')?.value?.trim()||'',
        phone: document.getElementById('lead_phone')?.value?.trim()||'',
        company: document.getElementById('lead_company')?.value?.trim()||'',
        value: parseFloat(document.getElementById('lead_value')?.value)||0,
        status: document.getElementById('lead_status')?.value||'new',
        source: document.getElementById('lead_source')?.value||'website',
        notes: document.getElementById('lead_notes')?.value?.trim()||'',
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Lead updated!','success'); }
    else { record._id = 'l_'+Date.now(); data.unshift(record); showToast('Lead added!','success'); }
    setData('lead', data); closeModal('lead'); renderModule('crm');
}

function saveEmployee() {
    const fn = document.getElementById('emp_firstName')?.value?.trim();
    if (!fn) { showToast('First name is required','error'); return; }
    const data = getData('employee');
    const editId = document.getElementById('emp_editId')?.value;
    const record = {
        firstName: fn, lastName: document.getElementById('emp_lastName')?.value?.trim()||'',
        email: document.getElementById('emp_email')?.value?.trim()||'',
        phone: document.getElementById('emp_phone')?.value?.trim()||'',
        department: document.getElementById('emp_department')?.value||'Engineering',
        position: document.getElementById('emp_position')?.value?.trim()||'',
        status: document.getElementById('emp_status')?.value||'active',
        salary: parseFloat(document.getElementById('emp_salary')?.value)||0,
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Employee updated!','success'); }
    else { record._id = 'e_'+Date.now(); data.unshift(record); showToast('Employee added!','success'); }
    setData('employee', data); closeModal('employee'); renderModule('hrm');
}

function saveDeal() {
    const name = document.getElementById('deal_name')?.value?.trim();
    if (!name) { showToast('Deal name is required','error'); return; }
    const data = getData('deal');
    const editId = document.getElementById('deal_editId')?.value;
    const record = {
        name, contact: document.getElementById('deal_contact')?.value?.trim()||'',
        company: document.getElementById('deal_company')?.value?.trim()||'',
        value: parseFloat(document.getElementById('deal_value')?.value)||0,
        stage: document.getElementById('deal_stage')?.value||'prospecting',
        probability: parseInt(document.getElementById('deal_probability')?.value)||0,
        closeDate: document.getElementById('deal_closeDate')?.value||'',
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Deal updated!','success'); }
    else { record._id = 'd_'+Date.now(); data.unshift(record); showToast('Deal added!','success'); }
    setData('deal', data); closeModal('deal'); renderModule('sales');
}

function saveInvoice() {
    const client = document.getElementById('inv_client')?.value?.trim();
    if (!client) { showToast('Client name is required','error'); return; }
    const data = getData('invoice');
    const editId = document.getElementById('inv_editId')?.value;
    const record = {
        number: document.getElementById('inv_number')?.value?.trim()||'INV-'+Date.now(),
        client, clientEmail: document.getElementById('inv_clientEmail')?.value?.trim()||'',
        status: document.getElementById('inv_status')?.value||'draft',
        issueDate: document.getElementById('inv_issueDate')?.value||'',
        dueDate: document.getElementById('inv_dueDate')?.value||'',
        taxRate: parseFloat(document.getElementById('inv_taxRate')?.value)||0,
        lines: invoiceLines.filter(l=>l.desc||l.price),
        notes: document.getElementById('inv_notes')?.value?.trim()||'',
        template: document.getElementById('inv_template')?.value||'modern',
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Invoice updated!','success'); }
    else { record._id = 'i_'+Date.now(); data.unshift(record); showToast('Invoice created!','success'); }
    setData('invoice', data); closeModal('invoice'); renderModule('invoice');
}

function saveTransaction() {
    const desc = document.getElementById('tx_description')?.value?.trim();
    if (!desc) { showToast('Description is required','error'); return; }
    const data = getData('transaction');
    const editId = document.getElementById('tx_editId')?.value;
    const record = {
        description: desc, type: document.getElementById('tx_type')?.value||'income',
        amount: parseFloat(document.getElementById('tx_amount')?.value)||0,
        category: document.getElementById('tx_category')?.value||'Other',
        date: document.getElementById('tx_date')?.value||new Date().toISOString().split('T')[0],
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Transaction updated!','success'); }
    else { record._id = 't_'+Date.now(); data.unshift(record); showToast('Transaction added!','success'); }
    setData('transaction', data); closeModal('transaction'); renderModule('finance');
}

function saveProject() {
    const name = document.getElementById('proj_name')?.value?.trim();
    if (!name) { showToast('Project name is required','error'); return; }
    const data = getData('project');
    const editId = document.getElementById('proj_editId')?.value;
    const record = {
        name, description: document.getElementById('proj_description')?.value?.trim()||'',
        status: document.getElementById('proj_status')?.value||'planning',
        dueDate: document.getElementById('proj_dueDate')?.value||'',
        budget: parseFloat(document.getElementById('proj_budget')?.value)||0,
        color: document.getElementById('proj_color')?.value||'#00A09D',
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Project updated!','success'); }
    else { record._id = 'p_'+Date.now(); record.tasks=[]; data.unshift(record); showToast('Project created!','success'); }
    setData('project', data); closeModal('project'); renderModule('project');
}

function savePurchase() {
    const vendor = document.getElementById('po_vendor')?.value?.trim();
    if (!vendor) { showToast('Vendor is required','error'); return; }
    const data = getData('purchase');
    const editId = document.getElementById('po_editId')?.value;
    const record = {
        number: document.getElementById('po_number')?.value?.trim()||'PO-'+String(data.length+1).padStart(3,'0'),
        vendor, items: document.getElementById('po_items')?.value?.trim()||'',
        total: parseFloat(document.getElementById('po_total')?.value)||0,
        status: document.getElementById('po_status')?.value||'pending',
        date: document.getElementById('po_date')?.value||new Date().toISOString().split('T')[0],
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Purchase updated!','success'); }
    else { record._id = 'po_'+Date.now(); data.unshift(record); showToast('Purchase order created!','success'); }
    setData('purchase', data); closeModal('purchase'); renderModule('purchase');
}

function saveProduct() {
    const name = document.getElementById('prod_name')?.value?.trim();
    if (!name) { showToast('Product name is required','error'); return; }
    const data = getData('product');
    const editId = document.getElementById('prod_editId')?.value;
    const record = {
        name, sku: document.getElementById('prod_sku')?.value?.trim()||'',
        category: document.getElementById('prod_category')?.value||'Other',
        price: parseFloat(document.getElementById('prod_price')?.value)||0,
        stock: parseInt(document.getElementById('prod_stock')?.value)||0,
        status: document.getElementById('prod_prodStatus')?.value||'active',
        desc: document.getElementById('prod_desc')?.value?.trim()||'',
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Product updated!','success'); }
    else { record._id = 'pr_'+Date.now(); data.unshift(record); showToast('Product added!','success'); }
    setData('product', data); closeModal('product'); renderModule('products');
}

function saveGeneric() {
    const name = document.getElementById('gen_name')?.value?.trim();
    if (!name) { showToast('Name is required','error'); return; }
    const key = 'azolve_gen_' + currentGenericModule;
    let data = JSON.parse(localStorage.getItem(key) || '[]');
    const editId = document.getElementById('gen_editId')?.value;
    const record = {
        name, type: document.getElementById('gen_type')?.value?.trim()||'',
        status: document.getElementById('gen_status')?.value||'active',
        description: document.getElementById('gen_description')?.value?.trim()||'',
        date: document.getElementById('gen_date')?.value||new Date().toISOString().split('T')[0],
    };
    if (editId) { const idx=data.findIndex(d=>d._id===editId); if(idx!==-1){data[idx]={...data[idx],...record};} showToast('Updated!','success'); }
    else { record._id = 'gen_'+Date.now(); data.unshift(record); showToast('Added!','success'); }
    localStorage.setItem(key, JSON.stringify(data));
    closeModal('generic'); setupGenericView(currentGenericModule, MODULE_LABELS[currentGenericModule] || currentGenericModule);
}

// ═══════════ EDIT RECORD ═══════════
function editRecord(type, id) {
    const data = getData(type);
    const record = data.find(d => d._id === id);
    if (!record) return;

    openModal(type);
    const titleEl = document.getElementById('modal_' + type + '_title');

    switch(type) {
        case 'lead':
            if(titleEl) titleEl.textContent = 'Edit Lead';
            document.getElementById('lead_editId').value = id;
            document.getElementById('lead_firstName').value = record.firstName||'';
            document.getElementById('lead_lastName').value = record.lastName||'';
            document.getElementById('lead_email').value = record.email||'';
            document.getElementById('lead_phone').value = record.phone||'';
            document.getElementById('lead_company').value = record.company||'';
            document.getElementById('lead_value').value = record.value||'';
            document.getElementById('lead_status').value = record.status||'new';
            document.getElementById('lead_source').value = record.source||'website';
            document.getElementById('lead_notes').value = record.notes||'';
            break;
        case 'employee':
            if(titleEl) titleEl.textContent = 'Edit Employee';
            document.getElementById('emp_editId').value = id;
            document.getElementById('emp_firstName').value = record.firstName||'';
            document.getElementById('emp_lastName').value = record.lastName||'';
            document.getElementById('emp_email').value = record.email||'';
            document.getElementById('emp_phone').value = record.phone||'';
            document.getElementById('emp_department').value = record.department||'Engineering';
            document.getElementById('emp_position').value = record.position||'';
            document.getElementById('emp_status').value = record.status||'active';
            document.getElementById('emp_salary').value = record.salary||'';
            break;
        case 'deal':
            if(titleEl) titleEl.textContent = 'Edit Deal';
            document.getElementById('deal_editId').value = id;
            document.getElementById('deal_name').value = record.name||'';
            document.getElementById('deal_contact').value = record.contact||'';
            document.getElementById('deal_company').value = record.company||'';
            document.getElementById('deal_value').value = record.value||'';
            document.getElementById('deal_stage').value = record.stage||'prospecting';
            document.getElementById('deal_probability').value = record.probability||20;
            document.getElementById('deal_closeDate').value = record.closeDate||'';
            break;
        case 'invoice':
            if(titleEl) titleEl.textContent = 'Edit Invoice';
            document.getElementById('inv_editId').value = id;
            document.getElementById('inv_number').value = record.number||'';
            document.getElementById('inv_client').value = record.client||'';
            document.getElementById('inv_clientEmail').value = record.clientEmail||'';
            document.getElementById('inv_status').value = record.status||'draft';
            document.getElementById('inv_issueDate').value = record.issueDate||'';
            document.getElementById('inv_dueDate').value = record.dueDate||'';
            document.getElementById('inv_taxRate').value = record.taxRate||10;
            document.getElementById('inv_notes').value = record.notes||'';
            invoiceLines = (record.lines && record.lines.length > 0) ? JSON.parse(JSON.stringify(record.lines)) : [{desc:'',qty:1,price:0}];
            renderInvoiceLines();
            break;
        case 'transaction':
            if(titleEl) titleEl.textContent = 'Edit Transaction';
            document.getElementById('tx_editId').value = id;
            document.getElementById('tx_description').value = record.description||'';
            document.getElementById('tx_type').value = record.type||'income';
            document.getElementById('tx_amount').value = record.amount||'';
            document.getElementById('tx_category').value = record.category||'Other';
            document.getElementById('tx_date').value = record.date||'';
            break;
        case 'project':
            if(titleEl) titleEl.textContent = 'Edit Project';
            document.getElementById('proj_editId').value = id;
            document.getElementById('proj_name').value = record.name||'';
            document.getElementById('proj_description').value = record.description||'';
            document.getElementById('proj_status').value = record.status||'planning';
            document.getElementById('proj_dueDate').value = record.dueDate||'';
            document.getElementById('proj_budget').value = record.budget||'';
            document.getElementById('proj_color').value = record.color||'#00A09D';
            break;
        case 'purchase':
            if(titleEl) titleEl.textContent = 'Edit Purchase Order';
            document.getElementById('po_editId').value = id;
            document.getElementById('po_number').value = record.number||'';
            document.getElementById('po_vendor').value = record.vendor||'';
            document.getElementById('po_items').value = record.items||'';
            document.getElementById('po_total').value = record.total||'';
            document.getElementById('po_status').value = record.status||'pending';
            document.getElementById('po_date').value = record.date||'';
            break;
        case 'product':
            if(titleEl) titleEl.textContent = 'Edit Product';
            document.getElementById('prod_editId').value = id;
            document.getElementById('prod_name').value = record.name||'';
            document.getElementById('prod_sku').value = record.sku||'';
            document.getElementById('prod_category').value = record.category||'Software';
            document.getElementById('prod_price').value = record.price||'';
            document.getElementById('prod_stock').value = record.stock||'';
            document.getElementById('prod_prodStatus').value = record.status||'active';
            document.getElementById('prod_desc').value = record.desc||'';
            break;
    }
}

function editGenericRecord(id) {
    const key = 'azolve_gen_' + currentGenericModule;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const record = data.find(d => d._id === id);
    if (!record) return;
    openModal('generic');
    document.getElementById('modal_generic_title').textContent = 'Edit Item';
    document.getElementById('gen_editId').value = id;
    document.getElementById('gen_name').value = record.name||'';
    document.getElementById('gen_type').value = record.type||'';
    document.getElementById('gen_status').value = record.status||'active';
    document.getElementById('gen_description').value = record.description||'';
    document.getElementById('gen_date').value = record.date||'';
}

// ═══════════ DELETE RECORD ═══════════
function deleteRecord(type, id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    let data = getData(type);
    data = data.filter(d => d._id !== id);
    setData(type, data);
    showToast('Record deleted', 'success');
    // Re-render current module
    const viewMap = {lead:'crm',employee:'hrm',deal:'sales',invoice:'invoice',transaction:'finance',project:'project',purchase:'purchase',product:'products'};
    renderModule(viewMap[type] || currentView);
}

function deleteGenericRecord(id) {
    if (!confirm('Delete this record?')) return;
    const key = 'azolve_gen_' + currentGenericModule;
    let data = JSON.parse(localStorage.getItem(key) || '[]');
    data = data.filter(d => d._id !== id);
    localStorage.setItem(key, JSON.stringify(data));
    showToast('Deleted', 'success');
    setupGenericView(currentGenericModule, MODULE_LABELS[currentGenericModule] || currentGenericModule);
}

// ═══════════ INVOICE LINE ITEMS ═══════════
function addInvoiceLine() {
    invoiceLines.push({desc:'',qty:1,price:0});
    renderInvoiceLines();
}

function removeInvoiceLine(idx) {
    invoiceLines.splice(idx, 1);
    if (invoiceLines.length === 0) invoiceLines.push({desc:'',qty:1,price:0});
    renderInvoiceLines();
}

function updateInvoiceLine(idx, field, val) {
    if (field === 'qty') invoiceLines[idx].qty = parseInt(val) || 0;
    else if (field === 'price') invoiceLines[idx].price = parseFloat(val) || 0;
    else invoiceLines[idx].desc = val;
    calcInvoiceTotals();
}

function renderInvoiceLines() {
    const tbody = document.getElementById('invLinesBody');
    if (!tbody) return;
    tbody.innerHTML = invoiceLines.map((l, i) => `<tr>
        <td><input type="text" value="${l.desc||''}" onchange="updateInvoiceLine(${i},'desc',this.value)" placeholder="Item description"></td>
        <td class="qty-col"><input type="number" value="${l.qty||1}" onchange="updateInvoiceLine(${i},'qty',this.value)" min="1"></td>
        <td class="price-col"><input type="number" value="${l.price||0}" onchange="updateInvoiceLine(${i},'price',this.value)" min="0" step="0.01"></td>
        <td class="total-col">$${((l.qty||0)*(l.price||0)).toFixed(2)}</td>
        <td class="del-col"><button class="btn-icon danger btn-sm" onclick="removeInvoiceLine(${i})"><i class="fas fa-times"></i></button></td>
    </tr>`).join('');
    calcInvoiceTotals();
}

function calcInvoiceTotals() {
    const sub = invoiceLines.reduce((s,l) => s + (l.qty||0)*(l.price||0), 0);
    const taxRate = parseFloat(document.getElementById('inv_taxRate')?.value) || 0;
    const tax = sub * taxRate / 100;
    const el = (id,v) => { const e=document.getElementById(id); if(e)e.textContent=v; };
    el('invSubtotal', '$' + sub.toFixed(2));
    el('invTaxAmt', '$' + tax.toFixed(2));
    el('invTotal', '$' + (sub+tax).toFixed(2));
}


// ═══════════ INIT ON LOAD ═══════════
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});