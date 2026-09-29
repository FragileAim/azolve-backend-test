// AZOLVE App Store - Industry-Filtered Add-On Manager
// Depends on addons.js (ALL_ADDONS, ADDON_CATEGORIES, INDUSTRY_APPS)

let currentCategory = 'all';

// Get the current user's industry from localStorage
function getUserIndustry() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.industry || 'other';
    } catch(e) { return 'other'; }
}

// Get apps relevant to current industry
function getIndustryApps() {
    const industry = getUserIndustry();
    const relevantIds = INDUSTRY_APPS[industry] || INDUSTRY_APPS['other'];
    return relevantIds.map(id => ALL_ADDONS.find(a => a.id === id)).filter(Boolean);
}

// Render the App Store
function renderApps(searchQuery = '') {
    const container = document.getElementById('appsGrid');
    if (!container) return;

    const installed = JSON.parse(localStorage.getItem('installedApps') || '["crm","hrm"]');
    const industryApps = getIndustryApps();

    let filtered = industryApps;

    // Filter by category tab
    if (currentCategory !== 'all') {
        filtered = filtered.filter(a => a.cat === currentCategory);
    }

    // Filter by search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.desc.toLowerCase().includes(q)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">
            <i class="fas fa-search" style="font-size:40px;display:block;margin-bottom:16px;opacity:.3;"></i>
            <p style="font-size:15px;">No apps found matching your search.</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(app => {
        const isInstalled = installed.includes(app.id);
        return `
        <div class="app-card ${isInstalled ? 'installed' : ''}">
            <div class="app-card-header">
                <div class="app-card-icon" style="background:${app.bg};color:${app.color};">
                    <i class="${app.icon}"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div class="app-card-name">${app.name}</div>
                    <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px;">${getCatLabel(app.cat)}</div>
                </div>
                ${isInstalled ? '<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">✓ Installed</span>' : ''}
            </div>
            <div class="app-card-desc">${app.desc}</div>
            <div class="app-card-footer">
                <div style="font-size:12px;color:#888;">
                    <i class="${app.icon}" style="color:${app.color};margin-right:4px;"></i>
                    ${app.name}
                </div>
                ${isInstalled
                    ? `<button class="btn btn-secondary btn-sm" onclick="uninstallApp('${app.id}')"><i class="fas fa-minus"></i> Remove</button>`
                    : `<button class="btn btn-primary btn-sm" onclick="installApp('${app.id}')"><i class="fas fa-plus"></i> Install</button>`
                }
            </div>
        </div>`;
    }).join('');
}

// Get category label by id
function getCatLabel(catId) {
    const cat = ADDON_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.label : catId;
}

// Build category filter tabs (only categories present in industry's apps)
function buildCategoryTabs() {
    const tabsContainer = document.getElementById('appFilterTabs');
    if (!tabsContainer) return;

    const industryApps = getIndustryApps();
    const presentCats = [...new Set(industryApps.map(a => a.cat))];

    let tabs = `<button class="filter-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterApps('all')">
        <i class="fas fa-th-large"></i> All Apps
        <span class="tab-count">${industryApps.length}</span>
    </button>`;

    ADDON_CATEGORIES.forEach(cat => {
        if (!presentCats.includes(cat.id)) return;
        const count = industryApps.filter(a => a.cat === cat.id).length;
        tabs += `<button class="filter-tab ${currentCategory === cat.id ? 'active' : ''}" onclick="filterApps('${cat.id}')">
            <i class="${cat.icon}"></i> ${cat.label}
            <span class="tab-count">${count}</span>
        </button>`;
    });

    tabsContainer.innerHTML = tabs;
}

// Filter apps by category
function filterApps(category, searchQuery = '') {
    currentCategory = category !== null ? category : currentCategory;
    // Rebuild tabs to reflect active state
    buildCategoryTabs();
    const query = searchQuery || document.getElementById('appStoreSearch')?.value || '';
    renderApps(query);
}

// Install an app
function installApp(appId) {
    const installed = JSON.parse(localStorage.getItem('installedApps') || '["crm","hrm"]');
    if (!installed.includes(appId)) {
        installed.push(appId);
        localStorage.setItem('installedApps', JSON.stringify(installed));
    }
    const app = ALL_ADDONS.find(a => a.id === appId);
    showToast(`${app?.name || appId} installed successfully!`, 'success');
    renderApps(document.getElementById('appStoreSearch')?.value || '');
    if (typeof updateInstalledAppsList === 'function') updateInstalledAppsList();
    const el = document.getElementById('totalApps');
    if (el) el.textContent = installed.length;
}

// Uninstall an app
function uninstallApp(appId) {
    const coreApps = ['crm', 'hrm'];
    if (coreApps.includes(appId)) {
        showToast('Core apps cannot be removed', 'error');
        return;
    }
    let installed = JSON.parse(localStorage.getItem('installedApps') || '["crm","hrm"]');
    installed = installed.filter(id => id !== appId);
    localStorage.setItem('installedApps', JSON.stringify(installed));
    const app = ALL_ADDONS.find(a => a.id === appId);
    showToast(`${app?.name || appId} removed`, 'success');
    renderApps(document.getElementById('appStoreSearch')?.value || '');
    if (typeof updateInstalledAppsList === 'function') updateInstalledAppsList();
    const el = document.getElementById('totalApps');
    if (el) el.textContent = installed.length;
}

// Initialize the App Store view
function initAppStore() {
    currentCategory = 'all';
    buildCategoryTabs();
    renderApps();

    // Industry badge
    const industryBadge = document.getElementById('industryBadge');
    if (industryBadge) {
        const industry = getUserIndustry();
        const labels = {
            technology:'Technology', healthcare:'Healthcare', education:'Education',
            finance:'Finance', retail:'Retail', manufacturing:'Manufacturing',
            hospitality:'Hospitality', legal:'Legal', realestate:'Real Estate',
            nonprofit:'Non-Profit', media:'Media', agriculture:'Agriculture',
            logistics:'Logistics', construction:'Construction', beauty:'Beauty',
            sports:'Sports', automotive:'Automotive', other:'General'
        };
        industryBadge.textContent = '🏢 ' + (labels[industry] || 'General');
        industryBadge.style.display = 'inline-block';
    }
}