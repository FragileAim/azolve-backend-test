/* ============================================================
   Azolve Founder Panel — JavaScript Engine
   ============================================================ */

// ─── DATA STORE ───────────────────────────────────────────────
const FDB = {
  save(k,v){ localStorage.setItem('fp_'+k, JSON.stringify(v)); },
  load(k,d){ try{ const v=localStorage.getItem('fp_'+k); return v?JSON.parse(v):d; }catch(e){return d;} }
};

// ─── SEED DATA ────────────────────────────────────────────────
function getApprovedFounderTeam(){
  return [
    {id:'t1',name:'Abhishek Trivedi',email:'abhishek@azolve.io',role:'Founder and MD',dept:'Leadership',phone:'',status:'active',color:'#6366f1',joined:'2025-01-01',perms:['all']},
    {id:'t2',name:'Rinku Singh',email:'rinku@azolve.io',role:'Director',dept:'Leadership',phone:'',status:'active',color:'#10b981',joined:'2025-01-01',perms:['all']},
    {id:'t3',name:'Dhyan Thaker',email:'dhyan@azolve.io',role:'Social Media Marketing',dept:'Marketing',phone:'',status:'active',color:'#f59e0b',joined:'2025-01-01',perms:['marketing','announcements','feedback']},
  ];
}

function readLocalJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(raw === null || raw === undefined || raw === '') return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  }catch(e){
    return fallback;
  }
}

function writeLocalJSON(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

const OLD_DEMO_COMPANY_NAMES = [
  'TechNova Pvt Ltd','GreenLeaf Solutions','UrbanFin Inc','BrightMed Clinics','SwiftLogix',
  'NexaRetail','CloudSync Tech','FoodieFlow','EduSpark Academy','PropEase Realty'
];
const OLD_DEMO_COMPANY_EMAILS = [
  'rahul@technova.io','priya@greenleaf.com','amit@urbanfin.in','meena@brightmed.in','ravi@swiftlogix.com',
  'kavya@nexaretail.io','arun@cloudsync.dev','sneha@foodieflow.in','vijay@eduspark.io','ananya@propease.in'
];
const SAMPLE_IDS = /^(inv|lead|deal|task|proj)_\d+$/i;

function isFounderDemoCompany(c){
  const name = (c && c.name || '').trim();
  const email = (c && c.email || '').trim().toLowerCase();
  return OLD_DEMO_COMPANY_NAMES.includes(name) || OLD_DEMO_COMPANY_EMAILS.includes(email);
}
function isKnownSampleRecord(r){
  if(!r) return false;
  const id = String(r.id || r._id || '');
  const sampleCompanies = ['TechCorp Inc.','StartupX','MediaGroup','RetailPro','FinanceHub'];
  return SAMPLE_IDS.test(id) || sampleCompanies.includes(r.company) || sampleCompanies.includes(r.client);
}
function realArray(key){
  const arr = readLocalJSON(key, []);
  return Array.isArray(arr) ? arr.filter(x => !isKnownSampleRecord(x)) : [];
}
function normalizeStage(stage){
  const s = String(stage || 'new').toLowerCase().replace('_','-');
  if(s === 'closed_won') return 'closed-won';
  if(s === 'closed_lost') return 'closed-lost';
  if(s === 'converted') return 'closed-won';
  if(s === 'prospecting') return 'lead';
  return s;
}
function getCurrentBusinessProfile(){
  const company = readLocalJSON('azolve_company', {});
  const user = readLocalJSON('user', {});
  const companyId = localStorage.getItem('companyId') || company.id || company._id || '';
  const name = company.name || company.companyName || company.businessName || user.company || user.companyName || '';
  if(!name || /demo/i.test(String(companyId)) || /demo/i.test(String(name))) return null;
  return {company, user, companyId, name};
}
function deriveCompanyFromUsage(){
  const profile = getCurrentBusinessProfile();
  if(!profile) return null;
  const invoices = realArray('azolve_invoices');
  const clients = realArray('azolve_clients');
  const products = realArray('azolve_products');
  const txns = realArray('azolve_pos_transactions');
  const tasks = realArray('azolve_tasks');
  const meetings = realArray('azolve_meetings').concat(realArray('azolve_scheduled_meetings'));
  const company = profile.company || {};
  const user = profile.user || {};
  const plan = company.plan || company.subscriptionPlan || company.package || 'Starter';
  const paidInvoices = invoices.filter(i => String(i.status || '').toLowerCase() === 'paid');
  const paidTotal = paidInvoices.reduce((s,i)=>s + Number(i.total || i.amount || i.grandTotal || 0), 0);
  const activityScore = invoices.length + clients.length + products.length + txns.length + tasks.length + meetings.length;
  return {
    id: profile.companyId || company.id || company._id || 'local-company',
    name: profile.name,
    owner: user.name || company.owner || company.ownerName || company.contactName || 'Account Owner',
    email: user.email || company.email || company.ownerEmail || '',
    phone: user.phone || company.phone || company.mobile || '',
    plan,
    users: Number(company.users || company.teamSize || 1),
    mrr: Number(company.mrr || company.monthlyRevenue || (paidTotal ? Math.round(paidTotal/Math.max(1, Math.ceil(invoices.length/3))) : 0)),
    status: company.status || (localStorage.getItem('authToken') ? 'active' : 'pending'),
    registered: company.createdAt || company.registered || company.created || user.createdAt || new Date().toISOString().split('T')[0],
    industry: company.industry || 'Not specified',
    country: company.country || 'India',
    notes: `Usage: ${invoices.length} invoices, ${clients.length} clients, ${products.length} products, ${txns.length} POS transactions, ${tasks.length} tasks, ${meetings.length} meetings.`,
    onboardStage: activityScore > 0 ? 'active-usage' : 'setup'
  };
}
function deriveTicketsFromSupportUsage(){
  const existing = FDB.load('tickets', []);
  return Array.isArray(existing) ? existing.filter(t => t && !OLD_DEMO_COMPANY_NAMES.includes(t.company)) : [];
}
function deriveFeedbackFromUsage(){
  const existing = FDB.load('feedback', []);
  return Array.isArray(existing) ? existing.filter(f => f && !OLD_DEMO_COMPANY_NAMES.includes(f.company)) : [];
}
function deriveActivityFromUsage(){
  const activity = [];
  const profile = getCurrentBusinessProfile();
  const companyName = profile ? profile.name : 'Current workspace';
  const invoices = realArray('azolve_invoices');
  const clients = realArray('azolve_clients');
  const products = realArray('azolve_products');
  const txns = realArray('azolve_pos_transactions');
  const tasks = realArray('azolve_tasks');
  const projects = realArray('azolve_projects');
  const meetings = realArray('azolve_meetings').concat(realArray('azolve_scheduled_meetings'));
  const add = (action, count) => { if(count > 0) activity.push({id:genId(),member:'System',action,target:`${count} ${action}`,ip:'local',time:new Date().toLocaleString('en-IN')}); };
  add('invoices recorded', invoices.length);
  add('clients saved', clients.length);
  add('products/items saved', products.length);
  add('POS transactions recorded', txns.length);
  add('projects created', projects.length);
  add('tasks created', tasks.length);
  add('meetings scheduled/held', meetings.length);
  if(profile) activity.unshift({id:genId(),member:'System',action:'Loaded real company usage',target:companyName,ip:'local',time:new Date().toLocaleString('en-IN')});
  return activity.slice(0, 20);
}
function syncFounderPanelRealUsage(){
  const team = getApprovedFounderTeam();
  FDB.save('team', team);

  const currentCompanies = FDB.load('companies', []);
  const cleanedCompanies = Array.isArray(currentCompanies) ? currentCompanies.filter(c => c && !isFounderDemoCompany(c)) : [];
  const usageCompany = deriveCompanyFromUsage();
  let companies = cleanedCompanies;
  if(usageCompany){
    const idx = companies.findIndex(c => String(c.id) === String(usageCompany.id) || (c.email && usageCompany.email && c.email === usageCompany.email) || c.name === usageCompany.name);
    if(idx >= 0) companies[idx] = {...companies[idx], ...usageCompany};
    else companies.push(usageCompany);
  }
  FDB.save('companies', companies);

  FDB.save('tickets', deriveTicketsFromSupportUsage());
  FDB.save('feedback', deriveFeedbackFromUsage());

  const oldActivity = FDB.load('activityLog', []);
  const realManualActivity = Array.isArray(oldActivity) ? oldActivity.filter(a => a && !OLD_DEMO_COMPANY_NAMES.some(n => String(a.target || '').includes(n))) : [];
  const usageActivity = deriveActivityFromUsage();
  FDB.save('activityLog', [...usageActivity, ...realManualActivity].slice(0, 50));

  const anns = FDB.load('announcements', []);
  FDB.save('announcements', Array.isArray(anns) ? anns.filter(a => a && !/^an\d+$/.test(String(a.id || ''))) : []);

  if(!Array.isArray(FDB.load('flags', null))){
    FDB.save('flags', [
      {id:'f1',name:'ai_assistant',label:'AI Assistant',desc:'Enable AI Assistant for users',global:false},
      {id:'f2',name:'whatsapp_integration',label:'WhatsApp Integration',desc:'Enable WhatsApp module',global:false},
      {id:'f3',name:'pos_terminal',label:'POS Terminal',desc:'Enable POS Terminal module',global:false},
      {id:'f4',name:'advanced_reports',label:'Advanced Reports',desc:'Enable advanced analytics',global:false},
      {id:'f5',name:'api_access',label:'API Access',desc:'Enable API key generation',global:false},
      {id:'f6',name:'multi_currency',label:'Multi-Currency',desc:'Enable multi-currency support',global:false},
    ]);
  }
  FDB.save('seeded', true);
  FDB.save('realDataMode', true);
}

// Keep the old entry-point name, but it now syncs real usage instead of adding demo records.
function seedData(){
  syncFounderPanelRealUsage();
}

// ─── AUTH ──────────────────────────────────────────────────────
const USERS = [
  {email:'abhishek@azolve.io', pass:'Abhishek@2025', name:'Abhishek Trivedi', role:'Founder and MD', color:'#6366f1', type:'founder'},
  {email:'rinku@azolve.io',    pass:'Rinku@2025',    name:'Rinku Singh',      role:'Director',       color:'#10b981', type:'founder'},
  {email:'dhyan@azolve.io',    pass:'Dhyan@2025',    name:'Dhyan Thaker',     role:'Social Media Marketing', color:'#f59e0b', type:'marketing'},
];

// Role-based permissions - what each role can access
const ROLE_PERMISSIONS = {
  founder: {
    label: 'Founder & CEO',
    pages: ['dashboard','analytics','revenue','companies','subscriptions','onboarding','tickets','livechat','feedback','team','roles','activity','features','health','announcements','api','plans','settings'],
    canSeeRevenue: true,
    canManageTeam: true,
    canDeleteCompanies: true,
    canChangePlans: true,
    canBroadcast: true,
    canAccessSettings: true,
  },
  cto: {
    label: 'CTO',
    pages: ['dashboard','companies','tickets','features','health','api','activity','devtasks','bugqueue','deploys'],
    canSeeRevenue: false,
    canManageTeam: false,
    canDeleteCompanies: false,
    canChangePlans: false,
    canBroadcast: false,
    canAccessSettings: false,
    showDevTasks: true,
  },
  sales: {
    label: 'Sales',
    pages: ['dashboard','companies','subscriptions','onboarding','revenue','plans','feedback','pipeline','leads','deals'],
    canSeeRevenue: true,
    canManageTeam: false,
    canDeleteCompanies: false,
    canChangePlans: true,
    canBroadcast: false,
    canAccessSettings: false,
  },
  developer: {
    label: 'Developer',
    pages: ['dashboard','tickets','features','health','api','devtasks','bugqueue','deploys'],
    canSeeRevenue: false,
    canManageTeam: false,
    canDeleteCompanies: false,
    canChangePlans: false,
    canBroadcast: false,
    canAccessSettings: false,
    showDevTasks: true,
  },
  marketing: {
    label: 'Social Media Marketing',
    pages: ['dashboard','feedback','announcements','activity'],
    canSeeRevenue: false,
    canManageTeam: false,
    canDeleteCompanies: false,
    canChangePlans: false,
    canBroadcast: true,
    canAccessSettings: false,
  },
  support: {
    label: 'Support',
    pages: ['dashboard','tickets','livechat','feedback'],
    canSeeRevenue: false,
    canManageTeam: false,
    canDeleteCompanies: false,
    canChangePlans: false,
    canBroadcast: false,
    canAccessSettings: false,
  }
};

// Get current user's permissions
function getUserPermissions() {
  if(!currentUser) return ROLE_PERMISSIONS.founder;
  return ROLE_PERMISSIONS[currentUser.type] || ROLE_PERMISSIONS.support;
}

// Check if user has access to a page
function canAccessPage(page) {
  const perms = getUserPermissions();
  return perms.pages.includes(page);
}

// Check specific permissions
function canDo(action) {
  const perms = getUserPermissions();
  return perms[action] === true;
}

let currentUser = FDB.load('currentUser', null);

// Reset Founder Panel access/team data in existing browsers to the approved Azolve team.
const ALLOWED_USER_EMAILS = USERS.map(u => u.email);
function resetFounderPanelTeamAccess(){
  const desiredTeam = getApprovedFounderTeam();
  const existingTeam = FDB.load('team', []);
  const needsReset = !existingTeam.length || existingTeam.some(m => !ALLOWED_USER_EMAILS.includes((m.email||'').toLowerCase()));
  if(needsReset) FDB.save('team', desiredTeam);
  if(currentUser && !ALLOWED_USER_EMAILS.includes((currentUser.email||'').toLowerCase())){
    FDB.save('currentUser', null);
    currentUser = null;
  }
}
resetFounderPanelTeamAccess();

function doLogin(){
  const email = document.getElementById('lEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('lPass').value;
  const user  = USERS.find(u => u.email === email && u.pass === pass);
  if(user){
    currentUser = user;
    FDB.save('currentUser', user);
    startApp();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function logout(){
  FDB.save('currentUser', null);
  currentUser = null;
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function startApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';
  document.getElementById('founderName').textContent = currentUser.name;
  document.getElementById('founderRole').textContent = currentUser.role;
  document.getElementById('founderAv').textContent = currentUser.name.charAt(0);
  document.getElementById('founderAv').style.background = `linear-gradient(135deg,${currentUser.color},${currentUser.color}99)`;
  seedData();
  
  // Apply role-based navigation filtering
  applyRolePermissions();
  
  go('dashboard');
  startClock();
}

// Apply role-based permissions to navigation
function applyRolePermissions(){
  const perms = getUserPermissions();
  
  // Hide navigation items based on permissions
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    const page = item.getAttribute('data-page');
    if(!perms.pages.includes(page)){
      item.style.display = 'none';
    } else {
      item.style.display = 'flex';
    }
  });
  
  // Add special sections for specific roles
  if(perms.showDevTasks){
    addDevTasksSection();
  }
  
  // Add Sales Pipeline for sales role
  if(currentUser && currentUser.type === 'sales'){
    addSalesPipelineSection();
  }
}

// Add Dev Tasks section for developers
function addDevTasksSection(){
  // Check if already added
  if(document.getElementById('devTasksNav')) return;
  
  const nav = document.querySelector('.sidebar-nav');
  const devSection = document.createElement('div');
  devSection.id = 'devTasksNav';
  devSection.innerHTML = `
    <div class="nav-section" style="padding:12px 12px 6px;color:var(--text3);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Dev Tasks</div>
    <div class="nav-item" data-page="devtasks" onclick="go('devtasks')"><span class="nav-icon"><i class="fas fa-code-branch"></i></span>My Tasks<span class="nav-badge yellow" id="devTaskBadge">0</span></div>
    <div class="nav-item" data-page="bugqueue" onclick="go('bugqueue')"><span class="nav-icon"><i class="fas fa-bug"></i></span>Bug Queue<span class="nav-badge" id="bugQueueBadge">0</span></div>
    <div class="nav-item" data-page="deploys" onclick="go('deploys')"><span class="nav-icon"><i class="fas fa-rocket"></i></span>Deployments<span class="nav-badge green" id="deployCountBadge">0</span></div>
  `;
  // Insert after features section
  const featuresItem = document.querySelector('.nav-item[data-page="features"]');
  if(featuresItem && featuresItem.parentElement){
    featuresItem.parentElement.insertBefore(devSection, featuresItem.nextSibling?.nextSibling || featuresItem.nextSibling);
  } else {
    nav.appendChild(devSection);
  }
}

// Add Sales Pipeline section for sales team
function addSalesPipelineSection(){
  const nav = document.querySelector('.sidebar-nav');
  const salesSection = document.createElement('div');
  salesSection.id = 'salesPipelineNav';
  salesSection.innerHTML = `
    <div class="nav-section" style="padding:12px 12px 6px;color:var(--text3);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Sales Tools</div>
    <div class="nav-item" data-page="pipeline" onclick="go('pipeline')"><span class="nav-icon"><i class="fas fa-funnel-dollar"></i></span>Sales Pipeline</div>
    <div class="nav-item" data-page="leads" onclick="go('leads')"><span class="nav-icon"><i class="fas fa-user-plus"></i></span>Lead Management<span class="nav-badge green" id="leadBadge">0</span></div>
    <div class="nav-item" data-page="deals" onclick="go('deals')"><span class="nav-icon"><i class="fas fa-handshake"></i></span>Deals<span class="nav-badge yellow" id="dealBadge">0</span></div>
  `;
  // Insert after companies section
  const companiesItem = document.querySelector('.nav-item[data-page="companies"]');
  if(companiesItem && companiesItem.parentElement){
    companiesItem.parentElement.insertBefore(salesSection, companiesItem.nextSibling);
  }
}

// ─── NAVIGATION ───────────────────────────────────────────────
const pageTitles = {
  dashboard:'Dashboard', analytics:'Analytics', revenue:'Revenue & MRR',
  companies:'All Companies', subscriptions:'Subscriptions', onboarding:'Onboarding Pipeline',
  tickets:'Ticket System', livechat:'Live Chat', feedback:'Feedback & NPS',
  team:'Azolve Team', roles:'Roles & Permissions', activity:'Activity Log',
  features:'Feature Flags', health:'System Health', announcements:'Announcements',
  api:'API Usage', plans:'Plans & Pricing', settings:'Platform Settings',
  // Dev pages
  devtasks:'Dev Tasks', bugqueue:'Bug Queue', deploys:'Deployments',
  // Sales pages
  pipeline:'Sales Pipeline', leads:'Lead Management', deals:'Deals'
};
const pageSubs = {
  dashboard:'Overview of all activity',
  companies:'Manage all registered companies',
  tickets:'Support ticket management',
  team:'Manage your Azolve team members',
  revenue:'MRR, ARR and transaction overview',
  features:'Control feature availability',
  health:'Monitor platform performance',
  announcements:'Broadcast messages to all companies',
  // Dev pages
  devtasks:'Your assigned development tasks',
  bugqueue:'Bugs requiring attention',
  deploys:'Recent and upcoming deployments',
  // Sales pages
  pipeline:'Track your sales pipeline',
  leads:'Manage potential customers',
  deals:'Close deals and track progress'
};

let currentPage = 'dashboard';

function go(page){
  // Check if user has permission to access this page
  if(!canAccessPage(page)){
    toast('You do not have access to this page', 'error');
    // Redirect to dashboard if no access
    if(page !== 'dashboard'){
      go('dashboard');
    }
    return;
  }
  
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  const ni = document.querySelector(`.nav-item[data-page="${page}"]`);
  if(ni) ni.classList.add('active');
  document.getElementById('topbarTitle').textContent = pageTitles[page] || page;
  document.getElementById('topbarSub').textContent = pageSubs[page] || '';
  currentPage = page;
  const renderers = {
    dashboard:renderDashboard, analytics:renderAnalytics, revenue:renderRevenue,
    companies:renderCompanies, subscriptions:renderSubscriptions, onboarding:renderOnboarding,
    tickets:renderTickets, livechat:renderLiveChat, feedback:renderFeedback,
    team:renderTeam, roles:renderRoles, activity:renderActivityLog,
    features:renderFeatureFlags, health:renderHealth, announcements:renderAnnouncements,
    api:renderAPI, plans:renderPlans, settings:()=>{},
    // Dev pages
    devtasks:renderDevTasks, bugqueue:renderBugQueue, deploys:renderDeploys,
    // Sales pages
    pipeline:renderPipeline, leads:renderLeads, deals:renderDeals
  };
  if(renderers[page]) renderers[page]();
}

function filterNav(val){
  val = val.toLowerCase();
  document.querySelectorAll('.nav-item').forEach(i => {
    i.style.display = i.textContent.toLowerCase().includes(val) ? 'flex' : 'none';
  });
}

// ─── CLOCK ────────────────────────────────────────────────────
function startClock(){
  function tick(){
    const now = new Date();
    document.getElementById('topClock').textContent =
      now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  tick(); setInterval(tick, 1000);
}

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type='success'){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = {success:'fa-check-circle',error:'fa-exclamation-circle',warning:'fa-exclamation-triangle'};
  t.innerHTML = `<i class="fas ${icons[type]||'fa-check-circle'}" style="color:${type==='error'?'#f87171':type==='warning'?'#fbbf24':'#34d399'}"></i>${msg}`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── MODAL ────────────────────────────────────────────────────
function openModal(html){
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
}
document.addEventListener('click', e => {
  if(e.target.id === 'modalOverlay') closeModal();
});

// ─── HELPERS ──────────────────────────────────────────────────
const avatarColors = ['#6366f1','#a855f7','#06b6d4','#10b981','#f59e0b','#ec4899','#ef4444','#f97316'];
function av(name, color){
  const c = color || avatarColors[name.charCodeAt(0)%avatarColors.length];
  return `<div class="avatar" style="background:linear-gradient(135deg,${c},${c}bb)">${name.charAt(0)}</div>`;
}
function fmtDate(d){ if(!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function planBadge(p){
  const m = {Starter:'badge-starter',Pro:'badge-pro',Enterprise:'badge-enterprise'};
  return `<span class="badge ${m[p]||'badge-pending'}">${p}</span>`;
}
function statusBadge(s){
  const m = {active:'badge-active',trial:'badge-trial',suspended:'badge-suspended',pending:'badge-pending',resolved:'badge-resolved',open:'badge-open'};
  return `<span class="badge dot ${m[s]||'badge-pending'}">${s}</span>`;
}
function priorityColor(p){ return p==='high'?'var(--red)':p==='medium'?'var(--yellow)':'var(--green)'; }
function genId(){ return Date.now().toString(36)+Math.random().toString(36).substr(2,5); }
function updateRealtimeBadges(){
  const set = (id, value) => { const el = document.getElementById(id); if(el) el.textContent = value; };
  const tickets = FDB.load('tickets', []);
  const openTickets = Array.isArray(tickets) ? tickets.filter(t => t.status !== 'resolved').length : 0;
  set('openTicketBadge', openTickets);
  set('devTaskBadge', realArray('azolve_tasks').filter(t => t.status !== 'done' && t.status !== 'completed').length);
  set('bugQueueBadge', getBugRecords ? getBugRecords().filter(b => b.status !== 'fixed').length : 0);
  set('deployCountBadge', getDeployRecords ? getDeployRecords().length : 0);
  const chats = FDB.load('liveChats', []);
  const ticketChats = Array.isArray(tickets) ? tickets.filter(t => t.messages || t.lastMessage || t.message).length : 0;
  set('liveChatBadge', (Array.isArray(chats) ? chats.length : 0) + ticketChats);
  set('leadBadge', getRealLeads ? getRealLeads().length : 0);
  set('dealBadge', getRealDeals ? getRealDeals().length : 0);
}

function emptyState(title, message, icon='fa-database'){
  return `<div style="text-align:center;padding:34px 20px;color:var(--text3)"><i class="fas ${icon}" style="font-size:30px;opacity:.45;margin-bottom:12px"></i><div style="font-weight:700;color:var(--text2);margin-bottom:6px">${title}</div><div style="font-size:13px;max-width:420px;margin:0 auto;line-height:1.5">${message}</div></div>`;
}

// ─── DASHBOARD ────────────────────────────────────────────────
function renderDashboard(){
  const companies = FDB.load('companies',[]);
  const tickets   = FDB.load('tickets',[]);
  const team      = FDB.load('team',[]);
  const active    = companies.filter(c=>c.status==='active').length;
  const trial     = companies.filter(c=>c.status==='trial').length;
  const totalMRR  = companies.reduce((s,c)=>s+(+c.mrr||0),0);
  const openTix   = tickets.filter(t=>t.status==='open').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-building"></i></div><div class="stat-value">${companies.length}</div><div class="stat-label">Total Companies</div><div class="stat-change up"><i class="fas fa-arrow-up"></i> +3 this month</div></div>
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-dollar-sign"></i></div><div class="stat-value">₹${(totalMRR/1000).toFixed(1)}K</div><div class="stat-label">Monthly Revenue (MRR)</div><div class="stat-change up"><i class="fas fa-arrow-up"></i> +18% vs last month</div></div>
    <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-ticket-alt"></i></div><div class="stat-value">${openTix}</div><div class="stat-label">Open Tickets</div><div class="stat-change down"><i class="fas fa-exclamation-circle"></i> ${tickets.filter(t=>t.priority==='high'&&t.status!=='resolved').length} high priority</div></div>
    <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-users"></i></div><div class="stat-value">${team.length}</div><div class="stat-label">Azolve Team Size</div><div class="stat-change up"><i class="fas fa-arrow-up"></i> ${active} companies active</div></div>
  `;

  const recent = [...companies].sort((a,b)=>new Date(b.registered)-new Date(a.registered)).slice(0,5);
  document.getElementById('dashCompanyTable').innerHTML = recent.length ? recent.map(c=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">${av(c.name)}<div><div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:var(--text2)">${c.email}</div></div></div></td>
      <td>${planBadge(c.plan)}</td>
      <td style="color:var(--text2)">${fmtDate(c.registered)}</td>
      <td>${statusBadge(c.status)}</td>
      <td><div style="display:flex;gap:6px"><button class="btn btn-outline btn-xs" onclick="viewCompany('${c.id}')"><i class="fas fa-eye"></i></button><button class="btn btn-danger btn-xs" onclick="confirmSuspend('${c.id}')"><i class="fas fa-ban"></i></button></div></td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text3)">No real companies/usage found yet</td></tr>';

  const openTickets = tickets.filter(t=>t.status!=='resolved').slice(0,4);
  document.getElementById('dashTickets').innerHTML = openTickets.length ? openTickets.map(t=>`
    <div class="ticket-card priority-${t.priority}" onclick="viewTicket('${t.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="font-weight:600;font-size:14px">${t.subject}</div>
        <span style="font-size:11px;font-weight:700;color:${priorityColor(t.priority)};text-transform:uppercase">${t.priority}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:4px">${t.company} • Assigned: ${t.assignee}</div>
    </div>`).join('') : emptyState('No open tickets','Tickets will appear here when real support tickets are created.','fa-ticket-alt');

  const sparkData = companies.length ? companies.slice(-7).map(c => Math.max(8, Math.min(100, Number(c.mrr || 0) / Math.max(1,totalMRR) * 100))) : [];
  document.getElementById('revenueSparkline').innerHTML = sparkData.length ? `<div class="sparkline">${sparkData.map(v=>`<div class="spark-bar" style="height:${v}%"></div>`).join('')}</div>` : emptyState('No revenue usage yet','Revenue will appear after real company billing or invoice activity is recorded.','fa-chart-line');

  document.getElementById('dashHealth').innerHTML = `
    <div class="health-item"><div class="health-dot ok"></div><div class="health-name">Frontend</div><div class="health-val">Loaded</div></div>
    <div class="health-item"><div class="health-dot ${localStorage.getItem('authToken')?'ok':'warn'}"></div><div class="health-name">User Session</div><div class="health-val">${localStorage.getItem('authToken')?'Authenticated':'No active client session'}</div></div>
    <div class="health-item"><div class="health-dot ${companies.length?'ok':'warn'}"></div><div class="health-name">Usage Data</div><div class="health-val">${companies.length?'Available':'Waiting for usage'}</div></div>
    <div class="health-item"><div class="health-dot ok"></div><div class="health-name">Local Data Store</div><div class="health-val">Ready</div></div>
  `;

  const activity = FDB.load('activityLog',[]).slice(0,5);
  const actColors = {'Abhishek Trivedi':'#6366f1','Rinku Singh':'#10b981','Dhyan Thaker':'#f59e0b'};
  document.getElementById('dashActivity').innerHTML = activity.length ? activity.map(a=>`
    <div class="activity-item">
      <div class="activity-dot" style="background:${actColors[a.member]||'#6366f1'}">${a.member.charAt(0)}</div>
      <div><div class="activity-text"><strong>${a.member}</strong> ${a.action}: <span style="color:var(--accent)">${a.target}</span></div><div class="activity-time">${a.time}</div></div>
    </div>`).join('') : emptyState('No real activity yet','Usage activity will appear after customers create invoices, clients, tasks, meetings, leads, or deals.','fa-history');

  document.getElementById('openTicketBadge').textContent = openTix;
  updateRealtimeBadges();
}

// ─── COMPANIES ────────────────────────────────────────────────
let compPage = 1; const compPerPage = 8;

function renderCompanies(){
  const companies = FDB.load('companies',[]);
  const search    = (document.getElementById('companySearch')||{value:''}).value.toLowerCase();
  const statusF   = (document.getElementById('companyStatusFilter')||{value:''}).value;
  const planF     = (document.getElementById('companyPlanFilter')||{value:''}).value;
  let filtered    = companies.filter(c=>
    (!search || c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)) &&
    (!statusF || c.status===statusF) && (!planF || c.plan===planF)
  );
  const total = Math.ceil(filtered.length/compPerPage);
  if(compPage > total) compPage = 1;
  const slice = filtered.slice((compPage-1)*compPerPage, compPage*compPerPage);
  document.getElementById('companiesTableBody').innerHTML = slice.map(c=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">${av(c.name)}<div><div style="font-weight:600">${c.name}</div><div style="font-size:12px;color:var(--text2)">${c.industry}</div></div></div></td>
      <td><div style="font-size:13px">${c.owner}</div><div style="font-size:12px;color:var(--text2)">${c.email}</div></td>
      <td>${planBadge(c.plan)}</td>
      <td style="text-align:center;font-weight:600">${c.users}</td>
      <td style="color:var(--text2)">${fmtDate(c.registered)}</td>
      <td style="font-weight:700;color:var(--green)">₹${(+c.mrr).toLocaleString()}</td>
      <td>${statusBadge(c.status)}</td>
      <td><div style="display:flex;gap:5px">
        <button class="btn btn-outline btn-xs" onclick="viewCompany('${c.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-success btn-xs" onclick="changePlanModal('${c.id}')"><i class="fas fa-layer-group"></i></button>
        ${c.status==='suspended'?`<button class="btn btn-success btn-xs" onclick="toggleStatus('${c.id}')"><i class="fas fa-play"></i></button>`:`<button class="btn btn-danger btn-xs" onclick="confirmSuspend('${c.id}')"><i class="fas fa-ban"></i></button>`}
        <button class="btn btn-danger btn-xs" onclick="deleteCompany('${c.id}')"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text3)">No companies found</td></tr>';
  document.getElementById('companiesPager').innerHTML = `Showing ${slice.length} of ${filtered.length} companies — Page ${compPage}/${total||1}`;
}

function viewCompany(id){
  const c = FDB.load('companies',[]).find(x=>x.id===id);
  if(!c) return;
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-building" style="color:var(--primary);margin-right:8px"></i>${c.name}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">OWNER</div><div style="font-weight:600">${c.owner}</div></div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">EMAIL</div><div style="font-weight:600;color:var(--cyan)">${c.email}</div></div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">PLAN</div>${planBadge(c.plan)}</div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">STATUS</div>${statusBadge(c.status)}</div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">MRR</div><div style="font-weight:700;color:var(--green)">₹${(+c.mrr).toLocaleString()}</div></div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">USERS</div><div style="font-weight:600">${c.users}</div></div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">INDUSTRY</div><div style="font-weight:600">${c.industry}</div></div>
        <div style="background:var(--bg3);padding:14px;border-radius:10px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">REGISTERED</div><div style="font-weight:600">${fmtDate(c.registered)}</div></div>
      </div>
      ${c.notes?`<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);padding:12px;border-radius:10px;font-size:13px;color:var(--yellow)"><i class="fas fa-sticky-note"></i> ${c.notes}</div>`:''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
      <button class="btn btn-success" onclick="closeModal();changePlanModal('${c.id}')"><i class="fas fa-layer-group"></i> Change Plan</button>
      ${c.status==='suspended'?`<button class="btn btn-success" onclick="toggleStatus('${c.id}');closeModal()"><i class="fas fa-play"></i> Activate</button>`:`<button class="btn btn-danger" onclick="confirmSuspend('${c.id}');closeModal()"><i class="fas fa-ban"></i> Suspend</button>`}
    </div>`);
}

function confirmSuspend(id){
  const c = FDB.load('companies',[]).find(x=>x.id===id);
  if(!c) return;
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-ban" style="color:var(--red);margin-right:8px"></i>Suspend Company</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p style="margin-bottom:14px">Are you sure you want to suspend <strong>${c.name}</strong>? They will lose access to the platform.</p>
      <div class="form-group"><label class="form-label">Reason</label><textarea class="form-control" id="suspendReason" rows="3" placeholder="Reason for suspension..."></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" onclick="doSuspend('${id}')"><i class="fas fa-ban"></i> Confirm Suspend</button>
    </div>`);
}

function doSuspend(id){
  const companies = FDB.load('companies',[]);
  const idx = companies.findIndex(c=>c.id===id);
  if(idx>=0){ companies[idx].status='suspended'; companies[idx].notes=document.getElementById('suspendReason').value||'Suspended by admin'; FDB.save('companies',companies); }
  logActivity(`Suspended company`, companies[idx]?.name||id);
  closeModal(); renderCompanies(); toast('Company suspended','warning');
}

function toggleStatus(id){
  const companies = FDB.load('companies',[]);
  const idx = companies.findIndex(c=>c.id===id);
  if(idx>=0){ companies[idx].status = companies[idx].status==='suspended'?'active':'suspended'; FDB.save('companies',companies); }
  renderCompanies(); toast('Company status updated');
}

function deleteCompany(id){
  if(!confirm('Delete this company permanently?')) return;
  const companies = FDB.load('companies',[]).filter(c=>c.id!==id);
  FDB.save('companies',companies);
  logActivity('Deleted company', id);
  renderCompanies(); toast('Company deleted','warning');
}

function changePlanModal(id){
  const c = FDB.load('companies',[]).find(x=>x.id===id);
  if(!c) return;
  openModal(`
    <div class="modal-header"><h3>Change Plan — ${c.name}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Current Plan</label><div style="margin-top:4px">${planBadge(c.plan)}</div></div>
      <div class="form-group"><label class="form-label">New Plan</label>
        <select class="form-control" id="newPlan">
          <option ${c.plan==='Starter'?'selected':''}>Starter</option>
          <option ${c.plan==='Pro'?'selected':''}>Pro</option>
          <option ${c.plan==='Enterprise'?'selected':''}>Enterprise</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Reason / Note</label><input class="form-control" id="planNote" placeholder="Optional reason..."></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doChangePlan('${id}')"><i class="fas fa-check"></i> Update Plan</button>
    </div>`);
}

function doChangePlan(id){
  const companies = FDB.load('companies',[]);
  const idx = companies.findIndex(c=>c.id===id);
  const newPlan = document.getElementById('newPlan').value;
  const mrrMap = {Starter:999, Pro:4999, Enterprise:14999};
  if(idx>=0){ companies[idx].plan=newPlan; companies[idx].mrr=mrrMap[newPlan]||999; FDB.save('companies',companies); }
  logActivity(`Changed plan to ${newPlan}`, companies[idx]?.name||id);
  closeModal(); renderCompanies(); toast(`Plan updated to ${newPlan}`);
}

function showAddCompanyModal(){
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-plus" style="color:var(--primary);margin-right:8px"></i>Add New Company</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Company Name *</label><input class="form-control" id="nc_name" placeholder="Company Ltd."></div>
        <div class="form-group"><label class="form-label">Owner Name *</label><input class="form-control" id="nc_owner" placeholder="Enter full name"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email *</label><input type="email" class="form-control" id="nc_email" placeholder="owner@company.com"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="nc_phone" placeholder="+91 98765 00000"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Plan</label><select class="form-control" id="nc_plan"><option>Starter</option><option>Pro</option><option>Enterprise</option></select></div>
        <div class="form-group"><label class="form-label">Industry</label><input class="form-control" id="nc_industry" placeholder="Technology"></div>
      </div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="nc_notes" rows="2" placeholder="Optional notes..."></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doAddCompany()"><i class="fas fa-plus"></i> Add Company</button>
    </div>`);
}

function doAddCompany(){
  const name = document.getElementById('nc_name').value.trim();
  const owner = document.getElementById('nc_owner').value.trim();
  const email = document.getElementById('nc_email').value.trim();
  if(!name||!owner||!email){ toast('Fill required fields','error'); return; }
  const companies = FDB.load('companies',[]);
  const mrrMap = {Starter:999,Pro:4999,Enterprise:14999};
  const plan = document.getElementById('nc_plan').value;
  companies.push({id:genId(),name,owner,email,phone:document.getElementById('nc_phone').value,plan,users:1,mrr:mrrMap[plan],status:'trial',registered:new Date().toISOString().split('T')[0],industry:document.getElementById('nc_industry').value,country:'India',notes:document.getElementById('nc_notes').value,onboardStage:'setup'});
  FDB.save('companies',companies);
  logActivity('Added new company', name);
  closeModal(); renderCompanies(); toast('Company added!');
}

function exportCompanies(){
  const companies = FDB.load('companies',[]);
  const csv = ['Company,Owner,Email,Plan,Users,MRR,Status,Registered',
    ...companies.map(c=>`"${c.name}","${c.owner}","${c.email}","${c.plan}","${c.users}","${c.mrr}","${c.status}","${c.registered}"`)
  ].join('\n');
  const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='azolve_companies.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast('Companies exported!');
}

// ─── ANALYTICS ────────────────────────────────────────────────
let chartsInit = {};
function renderAnalytics(){
  const companies = FDB.load('companies',[]);
  const feedback = FDB.load('feedback',[]);
  const active  = companies.filter(c=>c.status==='active').length;
  const trial   = companies.filter(c=>c.status==='trial').length;
  const users   = companies.reduce((s,c)=>s+(+c.users||0),0);
  const activeRate = companies.length ? Math.round(active/companies.length*100) : 0;
  document.getElementById('analyticsStats').innerHTML = `
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-chart-line"></i></div><div class="stat-value">${companies.length}</div><div class="stat-label">Real Companies</div><div class="stat-change up"><i class="fas fa-database"></i> From actual usage</div></div>
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-value">${active}</div><div class="stat-label">Active Companies</div><div class="stat-change up"><i class="fas fa-percentage"></i> ${activeRate}% active rate</div></div>
    <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div class="stat-value">${trial}</div><div class="stat-label">On Trial</div><div class="stat-change up"><i class="fas fa-arrow-right"></i> Based on saved status</div></div>
    <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-user-friends"></i></div><div class="stat-value">${users}</div><div class="stat-label">Total Platform Users</div><div class="stat-change up"><i class="fas fa-users"></i> Across real companies</div></div>
  `;
  setTimeout(()=>{
    const months = [];
    const counts = [];
    const now = new Date();
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const key = d.toLocaleString('en-IN',{month:'short'});
      months.push(key);
      counts.push(companies.filter(c => {
        const rd = new Date(c.registered || c.createdAt || c.created || '');
        return !isNaN(rd) && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      }).length);
    }
    const signupCanvas = document.getElementById('signupsChart');
    if(signupCanvas){
      if(chartsInit.signups) chartsInit.signups.destroy();
      chartsInit.signups = new Chart(signupCanvas,{type:'bar',data:{labels:months,datasets:[{label:'Real Signups',data:counts,backgroundColor:'rgba(99,102,241,0.7)',borderRadius:8}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8',precision:0}},x:{grid:{display:false},ticks:{color:'#94a3b8'}}}}});
    }
    const planCanvas = document.getElementById('planChart');
    if(planCanvas){
      if(chartsInit.plan) chartsInit.plan.destroy();
      const plans = {Starter:companies.filter(c=>c.plan==='Starter').length,Pro:companies.filter(c=>c.plan==='Pro').length,Enterprise:companies.filter(c=>c.plan==='Enterprise').length};
      chartsInit.plan = new Chart(planCanvas,{type:'doughnut',data:{labels:['Starter','Pro','Enterprise'],datasets:[{data:[plans.Starter,plans.Pro,plans.Enterprise],backgroundColor:['#06b6d4','#6366f1','#ec4899'],borderWidth:0}]},options:{cutout:'70%',plugins:{legend:{position:'right',labels:{color:'#94a3b8',font:{size:12}}}}}});
    }
  },100);
  const industries = {};
  companies.forEach(c=>{ const key = c.industry || 'Not specified'; industries[key]=(industries[key]||0)+1; });
  const industryRows = Object.entries(industries).sort((a,b)=>b[1]-a[1]);
  document.getElementById('topIndustries').innerHTML = industryRows.length ? industryRows.map(([k,v])=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13.5px;font-weight:500">${k}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="progress" style="width:80px"><div class="progress-fill" style="width:${companies.length ? v/companies.length*100 : 0}%;background:linear-gradient(90deg,#6366f1,#a855f7)"></div></div>
        <span style="font-size:12px;color:var(--text2)">${v}</span>
      </div>
    </div>`).join('') : emptyState('No industry data','Industry analytics will appear when real companies are available.','fa-industry');
  const promoters  = feedback.filter(f=>Number(f.score)>=9).length;
  const passives   = feedback.filter(f=>Number(f.score)>=7&&Number(f.score)<9).length;
  const detractors = feedback.filter(f=>Number(f.score)<7).length;
  const nps = feedback.length ? Math.round(((promoters-detractors)/feedback.length)*100) : 0;
  document.getElementById('geoStats').innerHTML = feedback.length ? `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:56px;font-weight:800;color:var(--green)">${nps}</div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:16px">Net Promoter Score</div>
      <div style="display:flex;justify-content:center;gap:20px">
        <div style="text-align:center"><div style="font-weight:700;color:var(--green)">${promoters}</div><div style="font-size:11px;color:var(--text3)">Promoters</div></div>
        <div style="text-align:center"><div style="font-weight:700;color:var(--yellow)">${passives}</div><div style="font-size:11px;color:var(--text3)">Passives</div></div>
        <div style="text-align:center"><div style="font-weight:700;color:var(--red)">${detractors}</div><div style="font-size:11px;color:var(--text3)">Detractors</div></div>
      </div>
    </div>` : emptyState('No NPS feedback yet','Customer feedback will appear here after real ratings are recorded.','fa-star');
  const riskCompanies = companies.filter(c => c.status === 'suspended' || c.status === 'pending' || Number(c.mrr || 0) === 0);
  document.getElementById('churnRisk').innerHTML = riskCompanies.length ? riskCompanies.map(c=>{
    const risk = c.status === 'suspended' ? ['High','red'] : Number(c.mrr||0) === 0 ? ['Medium','yellow'] : ['Low','green'];
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13.5px;font-weight:500">${c.name}</span>
      <span style="font-size:12px;font-weight:700;color:var(--${risk[1]})">${risk[0]}</span>
    </div>`;
  }).join('') : emptyState('No churn risk detected','Risk list is based on real suspended, pending, or zero-revenue companies.','fa-shield-alt');
}


// ─── REVENUE// ─── REVENUE ──────────────────────────────────────────────────
function renderRevenue(){
  const companies = FDB.load('companies',[]);
  const invoices = realArray('azolve_invoices');
  const totalMRR  = companies.reduce((s,c)=>s+(+c.mrr||0),0);
  const paidInvoices = invoices.filter(i => String(i.status || '').toLowerCase() === 'paid');
  const paidTotal = paidInvoices.reduce((s,i)=>s + Number(i.total || i.amount || i.grandTotal || 0),0);
  const arpu = companies.length ? Math.round(totalMRR/companies.length) : 0;
  const churnCount = companies.filter(c => c.status === 'suspended').length;
  const churnRate = companies.length ? ((churnCount/companies.length)*100).toFixed(1) : '0.0';
  document.getElementById('revenueStats').innerHTML = `
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-chart-line"></i></div><div class="stat-value">₹${(totalMRR/1000).toFixed(1)}K</div><div class="stat-label">MRR</div><div class="stat-change up"><i class="fas fa-database"></i> From real company data</div></div>
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-calendar-check"></i></div><div class="stat-value">₹${(totalMRR*12/1000).toFixed(0)}K</div><div class="stat-label">ARR (Annualized)</div><div class="stat-change up"><i class="fas fa-calculator"></i> Projected from MRR</div></div>
    <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-user-plus"></i></div><div class="stat-value">₹${arpu.toLocaleString()}</div><div class="stat-label">ARPU</div><div class="stat-change up"><i class="fas fa-building"></i> Per company</div></div>
    <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-user-minus"></i></div><div class="stat-value">${churnRate}%</div><div class="stat-label">Churn Risk</div><div class="stat-change down"><i class="fas fa-user-slash"></i> ${churnCount} suspended</div></div>
  `;
  setTimeout(()=>{
    const mrrCanvas = document.getElementById('mrrChart');
    if(mrrCanvas){
      if(chartsInit.mrr) chartsInit.mrr.destroy();
      const mrrData = [0,0,0,0,0,totalMRR];
      chartsInit.mrr=new Chart(mrrCanvas,{type:'line',data:{labels:['M-5','M-4','M-3','M-2','M-1','Current'],datasets:[{label:'MRR',data:mrrData,fill:true,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.1)',tension:0.4,pointBackgroundColor:'#10b981'}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8',callback:v=>'₹'+(v/1000).toFixed(0)+'K'}},x:{grid:{display:false},ticks:{color:'#94a3b8'}}}}});
    }
    const revPlanCanvas = document.getElementById('revPlanChart');
    if(revPlanCanvas){
      if(chartsInit.revPlan) chartsInit.revPlan.destroy();
      const plans={Starter:companies.filter(c=>c.plan==='Starter').reduce((s,c)=>s+Number(c.mrr||0),0),Pro:companies.filter(c=>c.plan==='Pro').reduce((s,c)=>s+Number(c.mrr||0),0),Enterprise:companies.filter(c=>c.plan==='Enterprise').reduce((s,c)=>s+Number(c.mrr||0),0)};
      chartsInit.revPlan=new Chart(revPlanCanvas,{type:'bar',data:{labels:['Starter','Pro','Enterprise'],datasets:[{data:[plans.Starter,plans.Pro,plans.Enterprise],backgroundColor:['#06b6d4','#6366f1','#ec4899'],borderRadius:10}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#94a3b8',callback:v=>'₹'+(v/1000).toFixed(0)+'K'}},x:{grid:{display:false},ticks:{color:'#94a3b8'}}}}});
    }
  },100);
  const txns = paidInvoices.map(i => ({
    c: i.client || i.customer || i.company || getCurrentBusinessProfile()?.name || 'Customer',
    p: i.plan || 'Invoice',
    a: Number(i.total || i.amount || i.grandTotal || 0),
    d: i.paidAt || i.issueDate || i.date || i.createdAt,
    s: i.status || 'paid'
  }));
  document.getElementById('revenueTable').innerHTML = txns.length ? txns.map(t=>`<tr><td>${t.c}</td><td><span class="badge badge-pending">${t.p}</span></td><td style="font-weight:700;color:var(--green)">₹${t.a.toLocaleString()}</td><td style="color:var(--text2)">${fmtDate(t.d)}</td><td>${statusBadge(String(t.s).toLowerCase()==='paid'?'active':'pending')}</td></tr>`).join('') : `<tr><td colspan="5">${emptyState('No real payments yet','Paid invoices or billing records will appear here when available.','fa-receipt')}</td></tr>`;
}


// ─── TICKETS// ─── TICKETS ──────────────────────────────────────────────────
function renderTickets(search=''){
  const tickets = FDB.load('tickets',[]);
  const statusF  = (document.getElementById('ticketStatusFilter')||{value:''}).value;
  const priorityF= (document.getElementById('ticketPriorityFilter')||{value:''}).value;
  let filtered = tickets.filter(t=>
    (!search||t.subject.toLowerCase().includes(search)||t.company.toLowerCase().includes(search))&&
    (!statusF||t.status===statusF)&&(!priorityF||t.priority===priorityF)
  );
  document.getElementById('ticketsList').innerHTML = filtered.map(t=>`
    <div class="ticket-card priority-${t.priority}" onclick="viewTicket('${t.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="font-weight:700;font-size:14px">${t.subject}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:11px;font-weight:700;color:${priorityColor(t.priority)};text-transform:uppercase;background:${priorityColor(t.priority)}22;padding:2px 8px;border-radius:4px">${t.priority}</span>
          ${statusBadge(t.status)}
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:6px;display:flex;gap:14px">
        <span><i class="fas fa-building"></i> ${t.company}</span>
        <span><i class="fas fa-user"></i> ${t.assignee}</span>
        <span><i class="fas fa-calendar"></i> ${fmtDate(t.created)}</span>
      </div>
    </div>`).join('') || '<div style="text-align:center;padding:40px;color:var(--text3)"><i class="fas fa-ticket-alt" style="font-size:32px;margin-bottom:10px;display:block;opacity:0.3"></i>No tickets found</div>';

  const stats = tickets.reduce((acc,t)=>{acc[t.status]=(acc[t.status]||0)+1;return acc;},{});
  document.getElementById('ticketStats').innerHTML = `
    ${Object.entries({open:'red',pending:'yellow',resolved:'green'}).map(([s,c])=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13.5px;font-weight:500;text-transform:capitalize">${s}</span>
      <span style="font-size:20px;font-weight:800;color:var(--${c})">${stats[s]||0}</span>
    </div>`).join('')}`;

  const assignees = {};
  tickets.forEach(t=>{ if(t.assignee) assignees[t.assignee]=(assignees[t.assignee]||0)+1; });
  document.getElementById('ticketAssignees').innerHTML = Object.entries(assignees).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      ${av(n)} <span style="flex:1;font-size:13px;font-weight:500">${n}</span>
      <span style="font-weight:700;color:var(--primary)">${v}</span>
    </div>`).join('');
}

function viewTicket(id){
  const t = FDB.load('tickets',[]).find(x=>x.id===id);
  if(!t) return;
  const team = FDB.load('team',[]);
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-ticket-alt" style="color:var(--primary);margin-right:8px"></i>Ticket #${t.id}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div style="margin-bottom:16px">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">${t.subject}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${statusBadge(t.status)}
          <span style="font-size:11px;font-weight:700;color:${priorityColor(t.priority)};background:${priorityColor(t.priority)}22;padding:3px 10px;border-radius:99px">${t.priority} priority</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg3);padding:12px;border-radius:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">COMPANY</div><div style="font-weight:600">${t.company}</div></div>
        <div style="background:var(--bg3);padding:12px;border-radius:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">ASSIGNED TO</div><div style="font-weight:600">${t.assignee}</div></div>
      </div>
      <div style="background:var(--bg3);padding:14px;border-radius:10px;margin-bottom:16px;font-size:13.5px;color:var(--text2)">${t.desc}</div>
      <div class="form-group"><label class="form-label">Reply / Update</label><textarea class="form-control" id="ticketReply" rows="3" placeholder="Type reply..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="ticketStatus"><option ${t.status==='open'?'selected':''}>open</option><option ${t.status==='pending'?'selected':''}>pending</option><option ${t.status==='resolved'?'selected':''}>resolved</option></select></div>
        <div class="form-group"><label class="form-label">Assign To</label><select class="form-control" id="ticketAssign">${team.map(m=>`<option ${m.name===t.assignee?'selected':''}>${m.name}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doUpdateTicket('${t.id}')"><i class="fas fa-paper-plane"></i> Update Ticket</button>
    </div>`);
}

function doUpdateTicket(id){
  const tickets = FDB.load('tickets',[]);
  const idx = tickets.findIndex(t=>t.id===id);
  if(idx>=0){
    tickets[idx].status = document.getElementById('ticketStatus').value;
    tickets[idx].assignee = document.getElementById('ticketAssign').value;
    FDB.save('tickets',tickets);
  }
  logActivity(`Updated ticket #${id}`, tickets[idx]?.company||'');
  closeModal(); renderTickets(); toast('Ticket updated!');
}

function showAddTicketModal(){
  const companies = FDB.load('companies',[]);
  const team = FDB.load('team',[]);
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-plus" style="color:var(--primary);margin-right:8px"></i>New Ticket</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Company</label><select class="form-control" id="nt_company"><option value="">Select...</option>${companies.map(c=>`<option>${c.name}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Subject *</label><input class="form-control" id="nt_subject" placeholder="Ticket subject..."></div>
      <div class="form-group"><label class="form-label">Description</label><textarea class="form-control" id="nt_desc" rows="3" placeholder="Describe the issue..."></textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Priority</label><select class="form-control" id="nt_priority"><option>low</option><option selected>medium</option><option>high</option></select></div>
        <div class="form-group"><label class="form-label">Assign To</label><select class="form-control" id="nt_assign">${team.map(m=>`<option>${m.name}</option>`).join('')}</select></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doAddTicket()"><i class="fas fa-plus"></i> Create Ticket</button>
    </div>`);
}

function doAddTicket(){
  const subject = document.getElementById('nt_subject').value.trim();
  if(!subject){toast('Enter a subject','error');return;}
  const tickets = FDB.load('tickets',[]);
  tickets.push({id:'tk'+genId(),company:document.getElementById('nt_company').value||'Unknown',subject,desc:document.getElementById('nt_desc').value,priority:document.getElementById('nt_priority').value,status:'open',assignee:document.getElementById('nt_assign').value,created:new Date().toISOString().split('T')[0],msgs:[]});
  FDB.save('tickets',tickets);
  closeModal(); renderTickets(); toast('Ticket created!');
}

// ─── LIVE CHAT ────────────────────────────────────────────────
function renderLiveChat(){
  const savedChats = FDB.load('liveChats', []);
  const tickets = FDB.load('tickets', []);
  const chats = Array.isArray(savedChats) && savedChats.length ? savedChats : tickets.filter(t => Array.isArray(t.msgs) && t.msgs.length).map(t => {
    const last = t.msgs[t.msgs.length-1] || {};
    return {id:t.id,from:t.company,msg:last.text || t.subject,time:last.time || fmtDate(t.created),unread:t.status === 'open' ? 1 : 0};
  });
  document.getElementById('chatList').innerHTML = chats.length ? chats.map(c=>`
    <div style="display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;border-radius:10px" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
      ${av(c.from)} <div style="flex:1"><div style="display:flex;justify-content:space-between"><div style="font-weight:600;font-size:14px">${c.from}</div><div style="font-size:12px;color:var(--text3)">${c.time || ''}</div></div><div style="font-size:13px;color:var(--text2);margin-top:2px">${c.msg || 'No message text'}</div></div>
      ${c.unread?`<div style="background:var(--primary);color:#fff;border-radius:99px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${c.unread}</div>`:''}
    </div>`).join('') : emptyState('No live chats yet','Customer chat conversations will appear when real chats or ticket messages are recorded.','fa-comments');
}


// ─── FEEDBACK// ─── FEEDBACK ────────────────────────────────────────────────
function renderFeedback(){
  const fb = FDB.load('feedback',[]);
  const promoters  = fb.filter(f=>f.score>=9).length;
  const passives   = fb.filter(f=>f.score>=7&&f.score<9).length;
  const detractors = fb.filter(f=>f.score<7).length;
  const nps = Math.round(((promoters-detractors)/fb.length)*100);
  document.getElementById('feedbackStats').innerHTML = `
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-smile"></i></div><div class="stat-value">${nps}</div><div class="stat-label">NPS Score</div><div class="stat-change up"><i class="fas fa-star"></i> Excellent</div></div>
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-thumbs-up"></i></div><div class="stat-value">${promoters}</div><div class="stat-label">Promoters (9-10)</div></div>
    <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-meh"></i></div><div class="stat-value">${passives}</div><div class="stat-label">Passives (7-8)</div></div>
    <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-frown"></i></div><div class="stat-value">${detractors}</div><div class="stat-label">Detractors (0-6)</div></div>
  `;
  const scoreColor = s => s>=9?'var(--green)':s>=7?'var(--yellow)':'var(--red)';
  document.getElementById('feedbackTable').innerHTML = fb.map(f=>`
    <tr>
      <td style="font-weight:600">${f.company}</td>
      <td><span style="font-size:18px;font-weight:800;color:${scoreColor(f.score)}">${f.score}</span><span style="font-size:12px;color:var(--text3)">/10</span></td>
      <td><span class="badge ${f.category==='Promoter'?'badge-active':f.category==='Passive'?'badge-trial':'badge-suspended'}">${f.category}</span></td>
      <td style="font-size:13px;color:var(--text2);max-width:240px">${f.comment}</td>
      <td style="color:var(--text2)">${fmtDate(f.date)}</td>
    </tr>`).join('');
}

// ─── TEAM ─────────────────────────────────────────────────────
function renderTeam(search=''){
  const team = FDB.load('team',[]);
  const roleF = (document.getElementById('teamRoleFilter')||{value:''}).value;
  let filtered = team.filter(m=>(!search||m.name.toLowerCase().includes(search)||m.email.toLowerCase().includes(search))&&(!roleF||m.role===roleF));
  document.getElementById('teamGrid').innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${filtered.map(m=>`
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center;transition:border-color 0.2s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
      <div class="avatar" style="background:linear-gradient(135deg,${m.color},${m.color}99);width:56px;height:56px;border-radius:16px;font-size:22px;margin:0 auto 12px">${m.name.charAt(0)}</div>
      <div style="font-weight:700;font-size:15px;margin-bottom:3px">${m.name}</div>
      <div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:6px">${m.role}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:4px">${m.dept}</div>
      <div style="font-size:12px;color:var(--cyan);margin-bottom:12px">${m.email}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Joined ${fmtDate(m.joined)}</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-outline btn-xs" onclick="editTeamMember('${m.id}')"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn btn-danger btn-xs" onclick="removeTeamMember('${m.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>`).join('')}</div>`;
}

function showAddTeamModal(){
  openModal(`
    <div class="modal-header"><h3><i class="fas fa-user-plus" style="color:var(--primary);margin-right:8px"></i>Add Team Member</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="tm_name" placeholder="Enter full name"></div>
        <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="tm_email" placeholder="john@azolve.io"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Role</label><select class="form-control" id="tm_role"><option>Founder and MD</option><option>Director</option><option>Social Media Marketing</option></select></div>
        <div class="form-group"><label class="form-label">Department</label><input class="form-control" id="tm_dept" placeholder="Engineering"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="tm_phone" placeholder="+91 99999 00000"></div>
        <div class="form-group"><label class="form-label">Password *</label><input type="password" class="form-control" id="tm_pass" placeholder="••••••••"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doAddTeam()"><i class="fas fa-plus"></i> Add Member</button>
    </div>`);
}

function doAddTeam(){
  const name = document.getElementById('tm_name').value.trim();
  const email = document.getElementById('tm_email').value.trim();
  if(!name||!email){toast('Fill required fields','error');return;}
  const team = FDB.load('team',[]);
  team.push({id:genId(),name,email,role:document.getElementById('tm_role').value,dept:document.getElementById('tm_dept').value,phone:document.getElementById('tm_phone').value,status:'active',color:avatarColors[team.length%avatarColors.length],joined:new Date().toISOString().split('T')[0],perms:[]});
  FDB.save('team',team);
  USERS.push({email:email.toLowerCase(),pass:document.getElementById('tm_pass').value||'azolve123',name,role:document.getElementById('tm_role').value,color:avatarColors[team.length%avatarColors.length]});
  logActivity('Added team member', name);
  closeModal(); renderTeam(); toast('Team member added!');
}

function editTeamMember(id){
  const m = FDB.load('team',[]).find(x=>x.id===id);
  if(!m) return;
  openModal(`
    <div class="modal-header"><h3>Edit Team Member</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Name</label><input class="form-control" id="et_name" value="${m.name}"></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="et_email" value="${m.email}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Role</label><input class="form-control" id="et_role" value="${m.role}"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-control" id="et_phone" value="${m.phone||''}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doEditTeam('${id}')"><i class="fas fa-save"></i> Save</button>
    </div>`);
}

function doEditTeam(id){
  const team = FDB.load('team',[]);
  const idx = team.findIndex(m=>m.id===id);
  if(idx>=0){team[idx].name=document.getElementById('et_name').value;team[idx].email=document.getElementById('et_email').value;team[idx].role=document.getElementById('et_role').value;team[idx].phone=document.getElementById('et_phone').value;FDB.save('team',team);}
  closeModal(); renderTeam(); toast('Team member updated!');
}

function removeTeamMember(id){
  if(!confirm('Remove this team member?')) return;
  const team = FDB.load('team',[]).filter(m=>m.id!==id);
  FDB.save('team',team);
  renderTeam(); toast('Team member removed','warning');
}

// ─── ROLES ────────────────────────────────────────────────────
function renderRoles(){
  const roles = [
    {name:'Founder',color:'#6366f1',perms:['All Permissions']},
    {name:'CTO',color:'#a855f7',perms:['Companies','Tickets','Features','Health','API']},
    {name:'Support Lead',color:'#06b6d4',perms:['Tickets','View Companies','Live Chat']},
    {name:'Sales Head',color:'#10b981',perms:['Companies','Revenue','Subscriptions','Plans']},
    {name:'Developer',color:'#f59e0b',perms:['Features','Health','API','Activity Log']},
    {name:'Support',color:'#ec4899',perms:['Tickets','Live Chat','Feedback']},
  ];
  document.getElementById('rolesList').innerHTML = roles.map(r=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,${r.color},${r.color}99);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff">${r.name.charAt(0)}</div>
        <div><div style="font-weight:600;font-size:14px">${r.name}</div><div style="font-size:12px;color:var(--text2)">${r.perms.slice(0,2).join(', ')}${r.perms.length>2?'...':''}</div></div>
      </div>
      <button class="btn btn-outline btn-xs"><i class="fas fa-edit"></i></button>
    </div>`).join('');
  const perms = ['Dashboard','Companies','Revenue','Tickets','Live Chat','Team','Feature Flags','System Health','Analytics','Announcements','API Usage','Plans','Settings','Activity Log'];
  document.getElementById('permMatrix').innerHTML = `<div style="overflow-x:auto"><table style="font-size:12px"><thead><tr><th>Permission</th><th>Founder</th><th>CTO</th><th>Support</th><th>Sales</th></tr></thead><tbody>${perms.map(p=>{
    const f=true,c=['Companies','Tickets','Features','Health','API'].some(x=>p.includes(x)),s=['Tickets','Live Chat'].some(x=>p.includes(x)),sa=['Companies','Revenue','Plans'].some(x=>p.includes(x));
    const ic=(v)=>v?`<span style="color:var(--green)"><i class="fas fa-check"></i></span>`:`<span style="color:var(--red)"><i class="fas fa-times"></i></span>`;
    return `<tr><td style="font-weight:500">${p}</td><td style="text-align:center">${ic(f)}</td><td style="text-align:center">${ic(c)}</td><td style="text-align:center">${ic(s)}</td><td style="text-align:center">${ic(sa)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function showAddRoleModal(){
  openModal(`<div class="modal-header"><h3>New Role</h3><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Role Name</label><input class="form-control" placeholder="e.g., Marketing"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="closeModal();toast('Role created!')"><i class="fas fa-plus"></i> Create</button></div>`);
}

// ─── ACTIVITY LOG ────────────────────────────────────────────
function renderActivityLog(search=''){
  const logs = FDB.load('activityLog',[]);
  const filtered = search ? logs.filter(l=>l.member.toLowerCase().includes(search)||l.action.toLowerCase().includes(search)||l.target.toLowerCase().includes(search)) : logs;
  document.getElementById('activityLogTable').innerHTML = filtered.map(a=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px">${av(a.member)}<span style="font-weight:500">${a.member}</span></div></td>
      <td style="color:var(--text2)">${a.action}</td>
      <td style="color:var(--accent)">${a.target}</td>
      <td style="font-size:12px;color:var(--text3);font-family:monospace">${a.ip}</td>
      <td style="color:var(--text2)">${a.time}</td>
    </tr>`).join('');
}

function exportActivity(){
  const logs = FDB.load('activityLog',[]);
  const csv = ['Member,Action,Target,IP,Time',...logs.map(a=>`"${a.member}","${a.action}","${a.target}","${a.ip}","${a.time}"`)].join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download='activity_log.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);
  toast('Activity log exported!');
}

function logActivity(action, target){
  const logs = FDB.load('activityLog',[]);
  logs.unshift({id:genId(),member:currentUser?.name||'Admin',action,target,ip:'103.12.45.'+Math.floor(Math.random()*50+10),time:new Date().toLocaleString('en-IN')});
  FDB.save('activityLog', logs.slice(0,100));
}

// ─── FEATURE FLAGS ────────────────────────────────────────────
function renderFeatureFlags(){
  const flags = FDB.load('flags',[]);
  const companies = FDB.load('companies',[]);
  document.getElementById('globalFlags').innerHTML = flags.map(f=>`
    <div class="flag-row">
      <div class="flag-info"><h4>${f.label}</h4><p>${f.desc}</p></div>
      <div class="toggle ${f.global?'on':''}" onclick="toggleFlag('${f.id}',this)"></div>
    </div>`).join('');
  document.getElementById('companyFlags').innerHTML = companies.slice(0,6).map(c=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:10px">${av(c.name)}<div><div style="font-weight:500;font-size:13.5px">${c.name}</div><div style="font-size:11px;color:var(--text2)">${c.plan}</div></div></div>
      <button class="btn btn-outline btn-xs" onclick="toast('Feature overrides for ${c.name}')"><i class="fas fa-sliders-h"></i> Configure</button>
    </div>`).join('');
}

function toggleFlag(id, el){
  el.classList.toggle('on');
  const flags = FDB.load('flags',[]);
  const idx = flags.findIndex(f=>f.id===id);
  if(idx>=0){flags[idx].global=el.classList.contains('on');FDB.save('flags',flags);}
  toast(`Feature flag ${el.classList.contains('on')?'enabled':'disabled'}`);
}

function showAddFlagModal(){
  openModal(`<div class="modal-header"><h3>Add Feature Flag</h3><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Flag Name (key)</label><input class="form-control" id="ff_name" placeholder="feature_name"></div><div class="form-group"><label class="form-label">Label</label><input class="form-control" id="ff_label" placeholder="Feature Label"></div><div class="form-group"><label class="form-label">Description</label><input class="form-control" id="ff_desc" placeholder="What does this enable?"></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddFlag()"><i class="fas fa-plus"></i> Add</button></div>`);
}

function doAddFlag(){
  const name=document.getElementById('ff_name').value.trim(),label=document.getElementById('ff_label').value.trim();
  if(!name||!label){toast('Fill all fields','error');return;}
  const flags=FDB.load('flags',[]);flags.push({id:genId(),name,label,desc:document.getElementById('ff_desc').value,global:false});FDB.save('flags',flags);
  closeModal();renderFeatureFlags();toast('Feature flag added!');
}

// ─── SYSTEM HEALTH ────────────────────────────────────────────
function renderHealth(){
  document.getElementById('healthStats').innerHTML = `
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-server"></i></div><div class="stat-value">99.9%</div><div class="stat-label">Uptime (30 days)</div></div>
    <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-tachometer-alt"></i></div><div class="stat-value">124ms</div><div class="stat-label">Avg API Response</div></div>
    <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-database"></i></div><div class="stat-value">38%</div><div class="stat-label">Storage Used</div></div>
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-users"></i></div><div class="stat-value">247</div><div class="stat-label">Active Sessions</div></div>
  `;
  const services=[{n:'API Server',s:'ok',v:'99.9% uptime'},{n:'Database (PostgreSQL)',s:'ok',v:'12ms avg query'},{n:'Redis Cache',s:'ok',v:'98% hit rate'},{n:'Email Service (Mailgun)',s:'warn',v:'~2 min delay'},{n:'WhatsApp Gateway',s:'ok',v:'Connected'},{n:'File Storage (S3)',s:'ok',v:'38% used'},{n:'Payment Gateway',s:'ok',v:'100% success rate'},{n:'SSL Certificate',s:'ok',v:'Valid till Dec 2025'}];
  document.getElementById('serviceList').innerHTML = services.map(s=>`
    <div class="health-item"><div class="health-dot ${s.s}"></div><div class="health-name">${s.n}</div><div class="health-val">${s.v}</div></div>`).join('');
  document.getElementById('perfStats').innerHTML = `
    ${[{l:'CPU Usage',v:42,c:'#10b981'},{l:'Memory',v:67,c:'#6366f1'},{l:'Bandwidth',v:28,c:'#06b6d4'},{l:'Disk I/O',v:15,c:'#f59e0b'}].map(p=>`
    <div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13.5px;font-weight:500">${p.l}</span><span style="font-size:13px;font-weight:700;color:${p.c}">${p.v}%</span></div>
      <div class="progress"><div class="progress-fill" style="width:${p.v}%;background:${p.c}"></div></div>
    </div>`).join('')}`;
}

// ─── ANNOUNCEMENTS ────────────────────────────────────────────
function renderAnnouncements(){
  const anns = FDB.load('announcements',[]);
  const icons = {'New Feature':'🚀','Scheduled':'⚠️','Billing':'💳','Update':'✨'};
  document.getElementById('announcementsList').innerHTML = anns.map(a=>`
    <div class="ann-card">
      <div class="ann-icon">${Object.entries(icons).find(([k])=>a.title.includes(k))?.[1]||'📢'}</div>
      <div style="flex:1"><div class="ann-title">${a.title}</div><div class="ann-text">${a.text}</div><div style="font-size:11px;color:var(--text3);margin-top:6px">${a.audience} • ${a.channel}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><div class="ann-date">${fmtDate(a.date)}</div><button class="btn btn-danger btn-xs" onclick="deleteAnn('${a.id}')"><i class="fas fa-trash"></i></button></div>
    </div>`).join('');
}

function showAddAnnouncementModal(){
  openModal(`<div class="modal-header"><h3>New Announcement</h3><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body"><div class="form-group"><label class="form-label">Title</label><input class="form-control" id="an_title" placeholder="Announcement title..."></div><div class="form-group"><label class="form-label">Message</label><textarea class="form-control" id="an_text" rows="3" placeholder="Announcement message..."></textarea></div><div class="form-row"><div class="form-group"><label class="form-label">Audience</label><select class="form-control" id="an_audience"><option>All Companies</option><option>Pro Plan Only</option><option>Enterprise Only</option><option>Trial Users</option></select></div><div class="form-group"><label class="form-label">Channel</label><input class="form-control" id="an_channel" value="in-app"></div></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddAnn()"><i class="fas fa-bullhorn"></i> Publish</button></div>`);
}

function doAddAnn(){
  const title=document.getElementById('an_title').value.trim();
  if(!title){toast('Enter a title','error');return;}
  const anns=FDB.load('announcements',[]);
  anns.unshift({id:genId(),title,text:document.getElementById('an_text').value,date:new Date().toISOString().split('T')[0],audience:document.getElementById('an_audience').value,channel:document.getElementById('an_channel').value});
  FDB.save('announcements',anns);closeModal();renderAnnouncements();toast('Announcement published!');
}

function deleteAnn(id){
  FDB.save('announcements',FDB.load('announcements',[]).filter(a=>a.id!==id));
  renderAnnouncements(); toast('Announcement deleted','warning');
}

function sendBroadcast(){
  const subj=document.getElementById('bcast_subject').value.trim();
  const msg=document.getElementById('bcast_msg').value.trim();
  if(!subj||!msg){toast('Fill subject and message','error');return;}
  const companies=FDB.load('companies',[]);
  toast(`Broadcast sent to ${companies.length} companies! 🎉`);
  document.getElementById('bcast_subject').value='';
  document.getElementById('bcast_msg').value='';
  logActivity('Sent broadcast',subj);
}

// ─── API USAGE ────────────────────────────────────────────────
function renderAPI(){
  const companies=FDB.load('companies',[]);
  document.getElementById('apiStats').innerHTML=`
    <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-code"></i></div><div class="stat-value">1.2M</div><div class="stat-label">API Calls Today</div></div>
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-chart-bar"></i></div><div class="stat-value">38.4M</div><div class="stat-label">API Calls This Month</div></div>
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-value">99.2%</div><div class="stat-label">Success Rate</div></div>
    <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-exclamation"></i></div><div class="stat-value">124ms</div><div class="stat-label">Avg Response Time</div></div>
  `;
  const usages=[98,72,45,88,23,61,42,95,31,68];
  document.getElementById('apiTable').innerHTML=companies.slice(0,8).map((c,i)=>{
    const daily=Math.floor(Math.random()*5000+500);const monthly=daily*30;const limit=c.plan==='Enterprise'?500000:c.plan==='Pro'?100000:25000;const pct=Math.min(Math.round(monthly/limit*100),100);
    return`<tr><td style="font-weight:600">${c.name}</td><td>${daily.toLocaleString()}</td><td>${monthly.toLocaleString()}</td><td>${limit.toLocaleString()}</td><td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:80px"><div class="progress-fill" style="width:${pct}%;background:${pct>90?'var(--red)':pct>70?'var(--yellow)':'var(--green)'}"></div></div><span style="font-size:12px">${pct}%</span></div></td><td>${pct>90?statusBadge('suspended'):statusBadge('active')}</td></tr>`;
  }).join('');
}

// ─── PLANS ────────────────────────────────────────────────────
function renderPlans(){
  const companies=FDB.load('companies',[]);
  document.getElementById('planCards').innerHTML=`
    <div class="card"><div style="text-align:center;padding:24px"><div class="stat-icon cyan" style="margin:0 auto 12px"><i class="fas fa-rocket"></i></div><div style="font-size:20px;font-weight:800;margin-bottom:4px">Starter</div><div style="font-size:32px;font-weight:800;color:var(--cyan)">₹999<span style="font-size:14px;color:var(--text2)">/mo</span></div><div style="font-size:12px;color:var(--text2);margin-top:8px">${companies.filter(c=>c.plan==='Starter').length} companies</div></div></div>
    <div class="card" style="border-color:var(--primary)"><div style="text-align:center;padding:24px"><div class="stat-icon purple" style="margin:0 auto 12px"><i class="fas fa-star"></i></div><div style="font-size:20px;font-weight:800;margin-bottom:4px">Pro</div><div style="font-size:32px;font-weight:800;color:var(--primary)">₹4,999<span style="font-size:14px;color:var(--text2)">/mo</span></div><div style="font-size:12px;color:var(--text2);margin-top:8px">${companies.filter(c=>c.plan==='Pro').length} companies</div></div></div>
    <div class="card"><div style="text-align:center;padding:24px"><div class="stat-icon pink" style="margin:0 auto 12px"><i class="fas fa-crown"></i></div><div style="font-size:20px;font-weight:800;margin-bottom:4px">Enterprise</div><div style="font-size:32px;font-weight:800;color:var(--pink)">₹14,999<span style="font-size:14px;color:var(--text2)">/mo</span></div><div style="font-size:12px;color:var(--text2);margin-top:8px">${companies.filter(c=>c.plan==='Enterprise').length} companies</div></div></div>
  `;
  document.getElementById('planAssignTable').innerHTML=companies.map(c=>`
    <tr>
      <td style="font-weight:600">${c.name}</td>
      <td>${planBadge(c.plan)}</td>
      <td style="color:var(--text2)">${fmtDate(c.registered)}</td>
      <td style="color:var(--text2)">${fmtDate(new Date(new Date(c.registered).setFullYear(new Date(c.registered).getFullYear()+1)).toISOString())}</td>
      <td style="font-weight:700;color:var(--green)">₹${(+c.mrr).toLocaleString()}</td>
      <td><button class="btn btn-outline btn-xs" onclick="changePlanModal('${c.id}')"><i class="fas fa-exchange-alt"></i> Change</button></td>
    </tr>`).join('');
}

function showChangePlanModal(){ toast('Select a company first'); }

// ─── SUBSCRIPTIONS ────────────────────────────────────────────
function renderSubscriptions(){
  const companies=FDB.load('companies',[]);
  const active=companies.filter(c=>c.status==='active').length;
  const trial=companies.filter(c=>c.status==='trial').length;
  const totalMRR=companies.reduce((s,c)=>s+(+c.mrr||0),0);
  document.getElementById('subStats').innerHTML=`
    <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-value">${active}</div><div class="stat-label">Active Subscriptions</div></div>
    <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div class="stat-value">${trial}</div><div class="stat-label">On Free Trial</div></div>
    <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-dollar-sign"></i></div><div class="stat-value">₹${(totalMRR/1000).toFixed(1)}K</div><div class="stat-label">Total MRR</div></div>
    <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-times-circle"></i></div><div class="stat-value">${companies.filter(c=>c.status==='suspended').length}</div><div class="stat-label">Suspended</div></div>
  `;
  document.getElementById('subTable').innerHTML=companies.map(c=>`
    <tr>
      <td style="font-weight:600">${c.name}</td>
      <td>${planBadge(c.plan)}</td>
      <td style="color:var(--text2)">${fmtDate(c.registered)}</td>
      <td style="color:var(--text2)">${fmtDate(new Date(new Date(c.registered).setMonth(new Date(c.registered).getMonth()+1)).toISOString())}</td>
      <td style="font-weight:700;color:var(--green)">₹${(+c.mrr).toLocaleString()}</td>
      <td>${statusBadge(c.status)}</td>
      <td><button class="btn btn-outline btn-xs" onclick="changePlanModal('${c.id}')"><i class="fas fa-edit"></i></button></td>
    </tr>`).join('');
}

// ─── ONBOARDING ───────────────────────────────────────────────
function renderOnboarding(){
  const companies=FDB.load('companies',[]);
  document.getElementById('ob-reg').textContent=companies.length;
  document.getElementById('ob-setup').textContent=companies.filter(c=>c.onboardStage==='setup').length;
  document.getElementById('ob-trial').textContent=companies.filter(c=>c.onboardStage==='trial').length;
  document.getElementById('ob-conv').textContent=companies.filter(c=>c.onboardStage==='converted').length;
  const stages={setup:15,trial:45,converted:100};
  document.getElementById('onboardTable').innerHTML=companies.map(c=>`
    <tr>
      <td style="font-weight:600">${c.name}</td>
      <td>${c.owner}</td>
      <td style="color:var(--text2)">${fmtDate(c.registered)}</td>
      <td><span style="font-size:12px;font-weight:600;text-transform:capitalize;color:${c.onboardStage==='converted'?'var(--green)':c.onboardStage==='trial'?'var(--cyan)':'var(--yellow)'}">${c.onboardStage}</span></td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:80px"><div class="progress-fill" style="width:${stages[c.onboardStage]||10}%;background:linear-gradient(90deg,#6366f1,#a855f7)"></div></div><span style="font-size:12px;color:var(--text2)">${stages[c.onboardStage]||10}%</span></div></td>
      <td><button class="btn btn-outline btn-xs" onclick="viewCompany('${c.id}')"><i class="fas fa-eye"></i></button></td>
    </tr>`).join('');
}

// ─── INIT ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// DEV TASKS (Developer Role)
// ─────────────────────────────────────────────────────────────────────────────
function renderDevTasks(){
  const tasks = [
    {id:'d1', title:'Fix invoice PDF download bug', priority:'high', status:'in-progress', due:'2025-03-28', ticket:'tk1'},
    {id:'d2', title:'Implement WhatsApp QR refresh', priority:'medium', status:'pending', due:'2025-03-30', ticket:'tk4'},
    {id:'d3', title:'Optimize dashboard load time', priority:'low', status:'completed', due:'2025-03-25', ticket:'tk5'},
    {id:'d4', title:'Add multi-currency support', priority:'medium', status:'in-progress', due:'2025-04-02', ticket:null},
    {id:'d5', title:'API rate limiting improvements', priority:'high', status:'pending', due:'2025-03-29', ticket:null},
  ];
  
  const inProgress = tasks.filter(t => t.status === 'in-progress');
  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');
  
  document.getElementById('devTasksContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-spinner"></i></div><div class="stat-value">${inProgress.length}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-clock"></i></div><div class="stat-value">${pending.length}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check"></i></div><div class="stat-value">${completed.length}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-tasks"></i></div><div class="stat-value">${tasks.length}</div><div class="stat-label">Total Tasks</div></div>
    </div>
    
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fas fa-code-branch" style="color:var(--primary);margin-right:8px"></i>My Assigned Tasks</h3>
        <button class="btn btn-primary btn-sm" onclick="toast('Task created!')"><i class="fas fa-plus"></i> Add Task</button>
      </div>
      <div style="padding:20px">
        ${tasks.map(t => `
          <div class="ticket-card priority-${t.priority}" style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:11px;font-weight:700;color:${t.status==='completed'?'var(--green)':t.status==='in-progress'?'var(--yellow)':'var(--text2)'};background:${t.status==='completed'?'rgba(16,185,129,0.1)':t.status==='in-progress'?'rgba(245,158,11,0.1)':'var(--bg3)'};padding:4px 10px;border-radius:6px;text-transform:uppercase">${t.status}</span>
                <span style="font-weight:600">${t.title}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                ${t.ticket ? `<span style="font-size:12px;color:var(--accent)">#${t.ticket}</span>` : ''}
                <span style="font-size:12px;color:var(--text2)">Due: ${fmtDate(t.due)}</span>
                <span style="font-size:11px;font-weight:700;color:${priorityColor(t.priority)};text-transform:uppercase">${t.priority}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getBugRecords(){
  const stored = FDB.load('bugs', []);
  if(Array.isArray(stored) && stored.length) return stored;
  const tickets = FDB.load('tickets', []);
  return Array.isArray(tickets) ? tickets.filter(t => t.status !== 'resolved' && (t.priority === 'high' || /bug|error|crash|not working|failed|issue/i.test(t.subject || t.desc || ''))).map(t => ({
    id:'bug_'+t.id,
    title:t.subject,
    severity:t.priority === 'high' ? 'high' : 'medium',
    reported:t.created,
    company:t.company,
    assigned:t.assignee || 'Unassigned',
    status:'open',
    sourceTicket:t.id
  })) : [];
}
function saveBugRecords(bugs){ FDB.save('bugs', bugs); }
function fixBug(id){
  const bugs = getBugRecords().map(b => b.id === id ? {...b,status:'fixed',fixedAt:new Date().toISOString().split('T')[0]} : b);
  saveBugRecords(bugs);
  logActivity('Fixed bug', id);
  renderBugQueue();
  toast('Bug marked as fixed');
}
function renderBugQueue(){
  const bugs = getBugRecords();
  const openBugs = bugs.filter(b => b.status !== 'fixed');
  const severityColor = s => s === 'critical' ? 'var(--red)' : s === 'high' ? 'var(--yellow)' : 'var(--cyan)';
  document.getElementById('bugQueueContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-value">${openBugs.filter(b => b.severity === 'critical').length}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-exclamation-circle"></i></div><div class="stat-value">${openBugs.filter(b => b.severity === 'high').length}</div><div class="stat-label">High</div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-info-circle"></i></div><div class="stat-value">${openBugs.filter(b => b.severity === 'medium').length}</div><div class="stat-label">Medium</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-bug"></i></div><div class="stat-value">${openBugs.length}</div><div class="stat-label">Open Bugs</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fas fa-bug" style="color:var(--red);margin-right:8px"></i>Bug Queue</h3>
        <button class="btn btn-primary btn-sm" onclick="showAddBugModal()"><i class="fas fa-plus"></i> Add Bug</button>
      </div>
      ${openBugs.length ? `<table class="data-table">
        <thead><tr><th>Bug</th><th>Severity</th><th>Company</th><th>Reported</th><th>Assigned</th><th>Action</th></tr></thead>
        <tbody>
          ${openBugs.map(b => `
            <tr>
              <td style="font-weight:600">${b.title}</td>
              <td><span style="font-size:11px;font-weight:700;color:${severityColor(b.severity)};background:${severityColor(b.severity)}22;padding:3px 10px;border-radius:4px;text-transform:uppercase">${b.severity}</span></td>
              <td>${b.company || 'Internal'}</td>
              <td style="color:var(--text2)">${fmtDate(b.reported)}</td>
              <td>${b.assigned || 'Unassigned'}</td>
              <td><button class="btn btn-success btn-xs" onclick="fixBug('${b.id}')"><i class="fas fa-check"></i> Fix</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : emptyState('No real bugs reported','Bug records will appear from high-priority support tickets or bugs added by the team.','fa-bug')}
    </div>
  `;
}
function showAddBugModal(){
  const companies = FDB.load('companies', []);
  openModal(`
    <div class="modal-header"><h3>Add Bug</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Bug title *</label><input class="form-control" id="bug_title" placeholder="Describe the issue"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Severity</label><select class="form-control" id="bug_sev"><option>medium</option><option>high</option><option>critical</option></select></div>
        <div class="form-group"><label class="form-label">Company</label><select class="form-control" id="bug_company"><option value="">Internal</option>${companies.map(c=>`<option>${c.name}</option>`).join('')}</select></div>
      </div>
      <div class="form-group"><label class="form-label">Assigned to</label><input class="form-control" id="bug_assigned" value="${currentUser?.name || ''}"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddBug()">Add Bug</button></div>`);
}
function doAddBug(){
  const title = document.getElementById('bug_title').value.trim();
  if(!title){ toast('Bug title is required','error'); return; }
  const bugs = getBugRecords();
  bugs.unshift({id:genId(),title,severity:document.getElementById('bug_sev').value,company:document.getElementById('bug_company').value || 'Internal',reported:new Date().toISOString().split('T')[0],assigned:document.getElementById('bug_assigned').value || currentUser?.name || 'Unassigned',status:'open'});
  saveBugRecords(bugs);
  logActivity('Added bug', title);
  closeModal(); renderBugQueue(); toast('Bug added');
}

function getDeployRecords(){ return FDB.load('deploys', []); }
function saveDeployRecords(deploys){ FDB.save('deploys', deploys); }
function startNewDeploy(){
  const deploys = getDeployRecords();
  deploys.unshift({id:genId(),version:'manual-'+new Date().toISOString().slice(0,10),env:'Production',status:'pending',time:new Date().toLocaleString('en-IN'),by:currentUser?.name || 'Founder Panel'});
  saveDeployRecords(deploys);
  logActivity('Started deployment','Production');
  renderDeploys();
  toast('Deployment entry created');
}
function completeDeploy(id, status){
  const deploys = getDeployRecords().map(d => d.id === id ? {...d,status,time:new Date().toLocaleString('en-IN')} : d);
  saveDeployRecords(deploys);
  logActivity(`Marked deployment ${status}`, id);
  renderDeploys();
}
function renderDeploys(){
  const deploys = getDeployRecords();
  const statusIcon = s => s === 'success' ? '<i class="fas fa-check-circle" style="color:var(--green)"></i>' : s === 'failed' ? '<i class="fas fa-times-circle" style="color:var(--red)"></i>' : '<i class="fas fa-clock" style="color:var(--yellow)"></i>';
  document.getElementById('deploysContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-value">${deploys.filter(d => d.status === 'success').length}</div><div class="stat-label">Successful</div></div>
      <div class="stat-card red"><div class="stat-icon red"><i class="fas fa-times-circle"></i></div><div class="stat-value">${deploys.filter(d => d.status === 'failed').length}</div><div class="stat-label">Failed</div></div>
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-clock"></i></div><div class="stat-value">${deploys.filter(d => d.status === 'pending').length}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-rocket"></i></div><div class="stat-value">${deploys.length}</div><div class="stat-label">Total Deployments</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fas fa-rocket" style="color:var(--accent);margin-right:8px"></i>Deployment History</h3>
        <button class="btn btn-primary btn-sm" onclick="startNewDeploy()"><i class="fas fa-play"></i> New Deploy</button>
      </div>
      ${deploys.length ? `<table class="data-table">
        <thead><tr><th>Version</th><th>Environment</th><th>Status</th><th>Time</th><th>Deployed By</th><th>Action</th></tr></thead>
        <tbody>
          ${deploys.map(d => `
            <tr>
              <td style="font-weight:600;font-family:monospace">${d.version}</td>
              <td><span class="badge ${d.env === 'Production' ? 'badge-pro' : 'badge-trial'}">${d.env}</span></td>
              <td>${statusIcon(d.status)} <span style="margin-left:6px;text-transform:capitalize">${d.status}</span></td>
              <td style="color:var(--text2)">${d.time}</td>
              <td>${d.by}</td>
              <td>${d.status === 'pending' ? `<button class="btn btn-success btn-xs" onclick="completeDeploy('${d.id}','success')">Success</button> <button class="btn btn-danger btn-xs" onclick="completeDeploy('${d.id}','failed')">Failed</button>` : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : emptyState('No deployments recorded','Create a deployment record when a real deployment is started.','fa-rocket')}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// SALES PAGES (real localStorage-backed)
// ─────────────────────────────────────────────────────────────
function getRealLeads(){
  const crm = realArray('crm_leads');
  const az = realArray('azolve_leads');
  const fp = FDB.load('leads', []);
  const all = []
    .concat(Array.isArray(crm) ? crm : [])
    .concat(Array.isArray(az) ? az : [])
    .concat(Array.isArray(fp) ? fp : []);
  const seen = new Set();
  return all.filter(l => {
    const id = l.id || l._id || `${l.email || ''}-${l.company || ''}`;
    if(seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
function getRealDeals(){
  const appDeals = realArray('azolve_deals');
  const fpDeals = FDB.load('deals', []);
  return []
    .concat(Array.isArray(appDeals) ? appDeals : [])
    .concat(Array.isArray(fpDeals) ? fpDeals : [])
    .filter(d => d && !isKnownSampleRecord(d));
}
function getLeadNameFP(l){
  return (l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.contact || 'Unknown Lead');
}
function leadValue(l){ return Number(l.value || l.potential || 0); }
function dealValue(d){ return Number(d.value || d.amount || 0); }
function renderPipeline(){
  const leads = getRealLeads();
  const deals = getRealDeals();
  const stages = [
    {stage:'Lead', key:'lead', value:leads.reduce((s,l)=>s+leadValue(l),0), count:leads.length, color:'#06b6d4'},
    {stage:'Qualified', key:'qualified', value:deals.filter(d=>normalizeStage(d.stage)==='qualified').reduce((s,d)=>s+dealValue(d),0), count:deals.filter(d=>normalizeStage(d.stage)==='qualified').length, color:'#6366f1'},
    {stage:'Proposal', key:'proposal', value:deals.filter(d=>normalizeStage(d.stage)==='proposal').reduce((s,d)=>s+dealValue(d),0), count:deals.filter(d=>normalizeStage(d.stage)==='proposal').length, color:'#a855f7'},
    {stage:'Negotiation', key:'negotiation', value:deals.filter(d=>normalizeStage(d.stage)==='negotiation').reduce((s,d)=>s+dealValue(d),0), count:deals.filter(d=>normalizeStage(d.stage)==='negotiation').length, color:'#ec4899'},
    {stage:'Closed Won', key:'closed-won', value:deals.filter(d=>normalizeStage(d.stage)==='closed-won').reduce((s,d)=>s+dealValue(d),0), count:deals.filter(d=>normalizeStage(d.stage)==='closed-won').length, color:'#10b981'},
  ];
  const total = stages.reduce((s,p)=>s+p.value,0);
  document.getElementById('pipelineContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-trophy"></i></div><div class="stat-value">₹${(total/100000).toFixed(1)}L</div><div class="stat-label">Total Pipeline Value</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-chart-line"></i></div><div class="stat-value">₹${(stages[4].value/100000).toFixed(1)}L</div><div class="stat-label">Closed Won</div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-user-plus"></i></div><div class="stat-value">${stages[0].count}</div><div class="stat-label">New Leads</div></div>
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-handshake"></i></div><div class="stat-value">${stages[3].count}</div><div class="stat-label">Negotiating</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3><i class="fas fa-funnel-dollar" style="color:var(--green);margin-right:8px"></i>Sales Pipeline Stages</h3></div>
      ${total || leads.length || deals.length ? `<div style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">
          ${stages.map(p => `
            <div style="background:var(--bg3);border-radius:12px;padding:20px;text-align:center;border-top:4px solid ${p.color}">
              <div style="font-size:12px;color:var(--text3);text-transform:uppercase;margin-bottom:8px">${p.stage}</div>
              <div style="font-size:24px;font-weight:800;color:${p.color}">₹${(p.value/1000).toFixed(0)}K</div>
              <div style="font-size:14px;color:var(--text2);margin-top:4px">${p.count} records</div>
            </div>
          `).join('')}
        </div>
      </div>` : emptyState('No real pipeline data','Lead and deal pipeline values will appear after real CRM leads or sales deals are added.','fa-funnel-dollar')}
    </div>`;
}
function renderLeads(){
  const leads = getRealLeads();
  const statusBadgeLead = s => {
    const m = {new:'badge-trial',contacted:'badge-pending',qualified:'badge-pro',proposal:'badge-pending',converted:'badge-active',lost:'badge-suspended'};
    return '<span class="badge '+(m[s]||'badge-pending')+'">'+(s || 'new')+'</span>';
  };
  document.getElementById('leadsContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-user-plus"></i></div><div class="stat-value">${leads.filter(l => (l.status || 'new') === 'new').length}</div><div class="stat-label">New Leads</div></div>
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-phone"></i></div><div class="stat-value">${leads.filter(l => l.status === 'contacted').length}</div><div class="stat-label">Contacted</div></div>
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-value">${leads.filter(l => l.status === 'qualified' || l.status === 'converted').length}</div><div class="stat-label">Qualified/Converted</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-rupee-sign"></i></div><div class="stat-value">₹${(leads.reduce((s,l) => s + leadValue(l), 0)/100000).toFixed(1)}L</div><div class="stat-label">Total Potential</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fas fa-users" style="color:var(--cyan);margin-right:8px"></i>Lead Management</h3>
        <button class="btn btn-primary btn-sm" onclick="showAddLeadModalFP()"><i class="fas fa-plus"></i> Add Lead</button>
      </div>
      ${leads.length ? `<table class="data-table">
        <thead><tr><th>Company</th><th>Contact</th><th>Source</th><th>Status</th><th>Potential</th><th>Created</th><th>Action</th></tr></thead>
        <tbody>
          ${leads.map(l => `
            <tr>
              <td><div style="font-weight:600">${l.company || '—'}</div><div style="font-size:12px;color:var(--text2)">${l.email || ''}</div></td>
              <td>${getLeadNameFP(l)}</td>
              <td><span class="badge badge-pending">${l.source || 'Manual'}</span></td>
              <td>${statusBadgeLead(l.status || 'new')}</td>
              <td style="font-weight:700;color:var(--green)">₹${leadValue(l).toLocaleString()}</td>
              <td style="color:var(--text2)">${fmtDate(l.created || l.createdAt)}</td>
              <td><button class="btn btn-outline btn-xs" onclick="convertLeadFP('${l.id || l._id}')"><i class="fas fa-arrow-right"></i> Convert</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : emptyState('No real leads yet','Add leads in CRM or from this Founder Panel. Only records created from real usage are shown.','fa-user-plus')}
    </div>`;
}
function showAddLeadModalFP(){
  openModal(`<div class="modal-header"><h3>Add Lead</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-row"><div class="form-group"><label class="form-label">Company</label><input class="form-control" id="fp_lead_company"></div><div class="form-group"><label class="form-label">Contact</label><input class="form-control" id="fp_lead_contact"></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Email</label><input class="form-control" id="fp_lead_email"></div><div class="form-group"><label class="form-label">Potential ₹</label><input type="number" class="form-control" id="fp_lead_value" value="0"></div></div>
      <div class="form-group"><label class="form-label">Source</label><input class="form-control" id="fp_lead_source" value="Founder Panel"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddLeadFP()">Add Lead</button></div>`);
}
function doAddLeadFP(){
  const lead = {id:genId(),company:document.getElementById('fp_lead_company').value.trim(),contact:document.getElementById('fp_lead_contact').value.trim(),email:document.getElementById('fp_lead_email').value.trim(),source:document.getElementById('fp_lead_source').value.trim(),status:'new',potential:Number(document.getElementById('fp_lead_value').value || 0),created:new Date().toISOString().split('T')[0]};
  if(!lead.company && !lead.contact){ toast('Add company or contact name','error'); return; }
  const leads = FDB.load('leads', []); leads.unshift(lead); FDB.save('leads', leads);
  logActivity('Added lead', lead.company || lead.contact);
  closeModal(); renderLeads(); toast('Lead added');
}
function convertLeadFP(id){
  const leads = FDB.load('leads', []);
  const idx = leads.findIndex(l => String(l.id || l._id) === String(id));
  if(idx >= 0){ leads[idx].status = 'converted'; FDB.save('leads', leads); }
  toast('Lead marked converted');
  renderLeads();
}
function renderDeals(){
  const deals = getRealDeals();
  const stageBadgeDeal = s => {
    const m = {'qualified':'badge-trial','proposal':'badge-pending','negotiation':'badge-pro','closed-won':'badge-active','closed-lost':'badge-suspended','lead':'badge-trial'};
    return '<span class="badge '+(m[normalizeStage(s)]||'badge-pending')+'">'+normalizeStage(s)+'</span>';
  };
  document.getElementById('dealsContent').innerHTML = `
    <div class="stats-row">
      <div class="stat-card green"><div class="stat-icon green"><i class="fas fa-trophy"></i></div><div class="stat-value">₹${(deals.filter(d => normalizeStage(d.stage) === 'closed-won').reduce((s,d) => s + dealValue(d), 0)/1000).toFixed(0)}K</div><div class="stat-label">Closed Won</div></div>
      <div class="stat-card yellow"><div class="stat-icon yellow"><i class="fas fa-handshake"></i></div><div class="stat-value">₹${(deals.filter(d => normalizeStage(d.stage) === 'negotiation').reduce((s,d) => s + dealValue(d), 0)/1000).toFixed(0)}K</div><div class="stat-label">Negotiation</div></div>
      <div class="stat-card cyan"><div class="stat-icon cyan"><i class="fas fa-file-alt"></i></div><div class="stat-value">₹${(deals.filter(d => normalizeStage(d.stage) === 'proposal').reduce((s,d) => s + dealValue(d), 0)/1000).toFixed(0)}K</div><div class="stat-label">Proposal</div></div>
      <div class="stat-card purple"><div class="stat-icon purple"><i class="fas fa-percentage"></i></div><div class="stat-value">${Math.round(deals.filter(d => normalizeStage(d.stage) !== 'closed-won' && normalizeStage(d.stage) !== 'closed-lost').reduce((s,d) => s + dealValue(d) * Number(d.probability || 0) / 100, 0)/1000)}K</div><div class="stat-label">Weighted Pipeline</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header">
        <h3><i class="fas fa-handshake" style="color:var(--accent);margin-right:8px"></i>Active Deals</h3>
        <button class="btn btn-primary btn-sm" onclick="showAddDealModalFP()"><i class="fas fa-plus"></i> Add Deal</button>
      </div>
      ${deals.length ? `<table class="data-table">
        <thead><tr><th>Deal</th><th>Company</th><th>Value</th><th>Stage</th><th>Probability</th><th>Close Date</th><th>Action</th></tr></thead>
        <tbody>
          ${deals.map(d => `
            <tr>
              <td><div style="font-weight:600">${d.title || d.name || 'Untitled deal'}</div><div style="font-size:12px;color:var(--text2)">${d.owner || d.contact || currentUser?.name || ''}</div></td>
              <td>${d.company || '—'}</td>
              <td style="font-weight:700;color:var(--green)">₹${dealValue(d).toLocaleString()}</td>
              <td>${stageBadgeDeal(d.stage)}</td>
              <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:60px"><div class="progress-fill" style="width:${Number(d.probability || 0)}%;background:var(--green)"></div></div>${Number(d.probability || 0)}%</div></td>
              <td style="color:var(--text2)">${fmtDate(d.closeDate)}</td>
              <td><button class="btn btn-outline btn-xs" onclick="advanceDealFP('${d.id || d._id}')"><i class="fas fa-arrow-up"></i> Advance</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : emptyState('No real deals yet','Add deals in Sales or from this Founder Panel. Only records created from real usage are shown.','fa-handshake')}
    </div>`;
}
function showAddDealModalFP(){
  openModal(`<div class="modal-header"><h3>Add Deal</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-row"><div class="form-group"><label class="form-label">Deal Title</label><input class="form-control" id="fp_deal_title"></div><div class="form-group"><label class="form-label">Company</label><input class="form-control" id="fp_deal_company"></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Value ₹</label><input type="number" class="form-control" id="fp_deal_value" value="0"></div><div class="form-group"><label class="form-label">Stage</label><select class="form-control" id="fp_deal_stage"><option>qualified</option><option>proposal</option><option>negotiation</option><option>closed-won</option><option>closed-lost</option></select></div></div>
      <div class="form-row"><div class="form-group"><label class="form-label">Probability %</label><input type="number" class="form-control" id="fp_deal_probability" value="40"></div><div class="form-group"><label class="form-label">Close Date</label><input type="date" class="form-control" id="fp_deal_close"></div></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddDealFP()">Add Deal</button></div>`);
}
function doAddDealFP(){
  const deal = {id:genId(),title:document.getElementById('fp_deal_title').value.trim(),company:document.getElementById('fp_deal_company').value.trim(),value:Number(document.getElementById('fp_deal_value').value || 0),stage:document.getElementById('fp_deal_stage').value,probability:Number(document.getElementById('fp_deal_probability').value || 0),closeDate:document.getElementById('fp_deal_close').value,owner:currentUser?.name || 'Founder Panel'};
  if(!deal.title && !deal.company){ toast('Add deal title or company','error'); return; }
  const deals = FDB.load('deals', []); deals.unshift(deal); FDB.save('deals', deals);
  logActivity('Added deal', deal.title || deal.company);
  closeModal(); renderDeals(); toast('Deal added');
}
function advanceDealFP(id){
  const order = ['qualified','proposal','negotiation','closed-won'];
  const deals = FDB.load('deals', []);
  const idx = deals.findIndex(d => String(d.id || d._id) === String(id));
  if(idx >= 0){
    const current = normalizeStage(deals[idx].stage);
    deals[idx].stage = order[Math.min(order.length-1, Math.max(0, order.indexOf(current))+1)];
    deals[idx].probability = deals[idx].stage === 'closed-won' ? 100 : Math.max(Number(deals[idx].probability || 0), 60);
    FDB.save('deals', deals);
    logActivity('Advanced deal', deals[idx].title || deals[idx].company);
  }
  renderDeals();
  toast('Deal advanced');
}

window.addEventListener('DOMContentLoaded', ()=>{
  if(currentUser){
    startApp();
  }
});