// AZOLVE Main Platform JavaScript
// Depends on addons.js for ALL_ADDONS data

let currentApp = null;
let installedApps = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadInstalledApps();
    updateInstalledAppsList();
    updateStats();
});

// Check Authentication
function checkAuthentication() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }
        } else {
            const payload = JSON.parse(atob(token));
            if (payload.exp && payload.exp < Date.now()) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                return;
            }
        }
    } catch(e) { /* Token parsing failed - still allow if present */ }

    // Load user data
    try {
        const userData = JSON.parse(user);
        const nameEl = document.getElementById('userName');
        const emailEl = document.getElementById('userEmail');
        const avatarEl = document.getElementById('userAvatar');
        const welcomeEl = document.getElementById('welcomeName');

        if (nameEl) nameEl.textContent = userData.name || 'User';
        if (emailEl) emailEl.textContent = userData.email || '';
        if (avatarEl) avatarEl.textContent = getInitials(userData.name || 'User');
        if (welcomeEl) welcomeEl.textContent = (userData.name || 'User').split(' ')[0];
    } catch(e) {}
}

function getInitials(name) {
    return name.split(' ').map(w => w.charAt(0).toUpperCase()).slice(0, 2).join('');
}

// Load Installed Apps
function loadInstalledApps() {
    const stored = localStorage.getItem('installedApps');
    installedApps = stored ? JSON.parse(stored) : ['crm', 'hrm'];
    if (!stored) localStorage.setItem('installedApps', JSON.stringify(installedApps));
}

function updateStats() {
    const el = document.getElementById('totalApps');
    if (el) el.textContent = installedApps.length;
}

// Get app config from ALL_ADDONS or fallback
function getAddonConfig(appId) {
    if (typeof ALL_ADDONS !== 'undefined') {
        const found = ALL_ADDONS.find(a => a.id === appId);
        if (found) return { name: found.name, icon: found.icon, color: found.color };
    }
    // Fallback built-in config
    const fallback = {
        'crm':           { name:'CRM',           icon:'fas fa-users',        color:'#714B67' },
        'hrm':           { name:'HRM',            icon:'fas fa-id-card',      color:'#00A09D' },
        'project':       { name:'Projects',       icon:'fas fa-rocket',       color:'#fd7e14' },
        'cms':           { name:'CMS',            icon:'fas fa-file-alt',     color:'#6f42c1' },
        'sales':         { name:'Sales',          icon:'fas fa-chart-line',   color:'#28a745' },
        'finance':       { name:'Finance',        icon:'fas fa-wallet',       color:'#fd7e14' },
        'accounting':    { name:'Accounting',     icon:'fas fa-calculator',   color:'#17a2b8' },
        'stripe':        { name:'Stripe',         icon:'fab fa-stripe-s',     color:'#635BFF' },
        'paypal':        { name:'PayPal',         icon:'fab fa-paypal',       color:'#003087' },
        'pos':           { name:'POS',            icon:'fas fa-cash-register',color:'#e83e8c' },
        'inventory':     { name:'Inventory',      icon:'fas fa-boxes',        color:'#fd7e14' },
        'ecommerce':     { name:'eCommerce',      icon:'fas fa-shopping-cart',color:'#ff6b35' },
        'invoice':       { name:'Invoices',       icon:'fas fa-file-invoice-dollar', color:'#17a2b8' },
    };
    return fallback[appId] || { name: appId.charAt(0).toUpperCase() + appId.slice(1), icon: 'fas fa-cube', color: '#714B67' };
}

// Update Installed Apps List in Drawer
function updateInstalledAppsList() {
    const container = document.getElementById('installedApps');
    if (!container) return;
    loadInstalledApps();

    let html = `
    <a href="#" class="app-item ${!currentApp ? 'active' : ''}" onclick="showHome(); return false;">
        <div class="app-item-icon" style="background:rgba(255,255,255,.15);">
            <i class="fas fa-home"></i>
        </div>
        <div class="app-item-text">Dashboard</div>
    </a>`;

    installedApps.forEach(appId => {
        const config = getAddonConfig(appId);
        const isActive = currentApp === appId;
        html += `
        <a href="#" class="app-item ${isActive ? 'active' : ''}" onclick="openApp('${appId}'); return false;">
            <div class="app-item-icon" style="background:rgba(255,255,255,.1);">
                <i class="${config.icon}" style="color:${config.color};"></i>
            </div>
            <div class="app-item-text">${config.name}</div>
        </a>`;
    });

    html += `
    <a href="#" class="app-item ${currentApp === 'appstore' ? 'active' : ''}" onclick="openAppStore(); return false;" style="margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px;">
        <div class="app-item-icon" style="background:rgba(255,255,255,.1);">
            <i class="fas fa-store"></i>
        </div>
        <div class="app-item-text">App Store</div>
    </a>`;

    container.innerHTML = html;
}

// Toggle Drawer
function toggleDrawer() {
    const drawer = document.getElementById('appDrawer');
    const mainContent = document.getElementById('mainContent');
    if (window.innerWidth <= 1024) {
        drawer.classList.toggle('mobile-open');
    } else {
        drawer.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

// Open App Store
function openAppStore() {
    currentApp = 'appstore';
    hideAllViews();
    document.getElementById('appStoreView').classList.add('active');
    updateBreadcrumb('App Store');
    const labelEl = document.getElementById('topbarActionLabel');
    if (labelEl) labelEl.textContent = 'Browse';
    updateInstalledAppsList();
    if (typeof initAppStore === 'function') initAppStore();
}

// Determine which view category to use for a given appId
function getViewForApp(appId) {
    // Core dedicated views
    const coreViews = {
        'crm': 'crmView', 'hrm': 'hrmView', 'project': 'projectView',
        'cms': 'cmsView', 'sales': 'salesView', 'finance': 'financeView', 'invoice': 'invoiceView'
    };
    if (coreViews[appId]) return { viewId: coreViews[appId], type: 'core' };

    // Get addon category
    if (typeof ALL_ADDONS !== 'undefined') {
        const addon = ALL_ADDONS.find(a => a.id === appId);
        if (addon) {
            const catViewMap = {
                'core':          'crmView',
                'payment':       'paymentView',
                'ai':            'aiView',
                'calendar':      'calendarView',
                'communication': 'communicationView',
                'content':       'contentView',
                'customization': 'customizationView',
                'ecommerce':     'ecommerceView',
                'finance':       'financeAddonView',
                'hr':            'hrAddonView',
                'sales_mkt':     'salesMktView',
                'social':        'socialView',
                'integration':   'integrationView',
                'mobility':      'mobilityView',
                'operation':     'operationView',
                'security':      'securityView',
                'industrial':    'industrialView'
            };
            return { viewId: catViewMap[addon.cat] || 'genericView', type: addon.cat, addon: addon };
        }
    }
    return { viewId: 'genericView', type: 'generic' };
}

// Open Specific App
function openApp(appId) {
    currentApp = appId;
    hideAllViews();
    updateBreadcrumb(getAppName(appId));
    updateInstalledAppsList();
    document.getElementById('appDrawer')?.classList.remove('mobile-open');

    const labels = {
        crm:'Add Lead', hrm:'Add Employee', project:'Add Task',
        cms:'New Content', sales:'Add Deal', finance:'Add Transaction', invoice:'New Invoice'
    };
    const labelEl = document.getElementById('topbarActionLabel');
    if (labelEl) labelEl.textContent = labels[appId] || 'Add New';

    const { viewId, type, addon } = getViewForApp(appId);
    const viewEl = document.getElementById(viewId);
    if (viewEl) {
        viewEl.classList.add('active');

        // Set dynamic content for non-core category views
        if (type !== 'core' && addon) {
            populateCategoryView(viewId, addon, appId);
        }
    }

    // Init core app functions
    switch(appId) {
        case 'crm':     if (typeof loadLeads       === 'function') loadLeads();       break;
        case 'hrm':     if (typeof loadEmployees   === 'function') loadEmployees();   break;
        case 'project': if (typeof initProjectApp  === 'function') initProjectApp();  break;
        case 'cms':     if (typeof initCmsApp      === 'function') initCmsApp();      break;
        case 'sales':   if (typeof initSalesApp    === 'function') initSalesApp();    break;
        case 'finance': if (typeof initFinanceApp  === 'function') initFinanceApp();  break;
        case 'invoice': if (typeof initInvoiceApp  === 'function') initInvoiceApp();  break;
    }
}

// Populate a category view with addon-specific content
function populateCategoryView(viewId, addon, appId) {
    const titleEl = document.getElementById(viewId + '_title');
    const subtitleEl = document.getElementById(viewId + '_subtitle');
    const iconEl = document.getElementById(viewId + '_icon');

    if (titleEl) titleEl.textContent = addon.name;
    if (subtitleEl) subtitleEl.textContent = addon.desc;
    if (iconEl) {
        iconEl.className = addon.icon;
        iconEl.style.color = addon.color;
    }

    // Initialize module data
    initCategoryModule(viewId, addon, appId);
}

// Initialize data for category modules
function initCategoryModule(viewId, addon, appId) {
    const dataKey = 'azolve_' + appId.replace(/-/g, '_');
    const existing = localStorage.getItem(dataKey);

    // Trigger render for the specific view type
    const viewType = viewId.replace('View', '');
    if (typeof window['init_' + viewType] === 'function') {
        window['init_' + viewType](addon, appId);
    } else if (typeof window['render_' + viewType] === 'function') {
        window['render_' + viewType](addon, appId);
    }
}

// Hide All Views
function hideAllViews() {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
}

// Update Breadcrumb
function updateBreadcrumb(text) {
    const el = document.getElementById('breadcrumbCurrent');
    if (el) el.textContent = text;
}

// Get App Name
function getAppName(appId) {
    if (typeof ALL_ADDONS !== 'undefined') {
        const found = ALL_ADDONS.find(a => a.id === appId);
        if (found) return found.name;
    }
    const names = {
        crm:'CRM', hrm:'HRM', project:'Projects', cms:'CMS',
        sales:'Sales', finance:'Finance', appstore:'App Store'
    };
    return names[appId] || (appId.charAt(0).toUpperCase() + appId.slice(1).replace(/_/g,' '));
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;
    const toastIcon = toast.querySelector('.toast-icon');
    toast.className = `toast ${type}`;
    toastMessage.textContent = message;
    if (toastIcon) toastIcon.innerHTML = type === 'success'
        ? '<i class="fas fa-check"></i>'
        : '<i class="fas fa-exclamation-circle"></i>';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Close drawer when clicking outside on mobile
document.addEventListener('click', function(e) {
    const drawer = document.getElementById('appDrawer');
    const menuToggle = document.querySelector('.menu-toggle');
    if (!drawer || !menuToggle) return;
    if (window.innerWidth <= 1024) {
        if (!drawer.contains(e.target) && !menuToggle.contains(e.target)) {
            drawer.classList.remove('mobile-open');
        }
    }
});

window.addEventListener('resize', function() {
    const drawer = document.getElementById('appDrawer');
    if (drawer && window.innerWidth > 1024) drawer.classList.remove('mobile-open');
});