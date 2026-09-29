/* Azolve V2 Dashboard Integration
 * Makes new V2 features visible inside the existing dashboard.
 */
(function () {
  'use strict';

  function addStyles() {
    if (document.getElementById('azv-v2-dash-style')) return;
    const s = document.createElement('style');
    s.id = 'azv-v2-dash-style';
    s.textContent = `
      .azv-v2-badge{margin-left:auto;background:var(--primary-light,#f1e9ee);color:var(--primary-dark,#5a3a51);font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;letter-spacing:.4px;border:1px solid rgba(113,75,103,.15)}
      .azv-v2-panel{background:#fff;border:1px solid var(--border,#e5e9f0);border-radius:var(--radius-md,10px);padding:16px 18px;margin:0 0 20px;position:relative}
      .azv-v2-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
      .azv-v2-panel-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-primary,#1a1a2e)}
      .azv-v2-panel-title i{color:var(--primary,#714B67);font-size:13px}
      .azv-v2-panel-desc{font-size:12px;color:var(--text-muted,#8697A8);margin:2px 0 14px}
      .azv-v2-dismiss{background:none;border:none;color:var(--text-muted,#8697A8);cursor:pointer;font-size:13px;padding:4px 6px;border-radius:5px;line-height:1}
      .azv-v2-dismiss:hover{background:var(--bg-body,#f5f6fa);color:var(--text-primary,#1a1a2e)}
      .azv-v2-quick-panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
      .azv-v2-card{background:var(--bg-body,#f8f9fb);border:1px solid var(--border,#e5e9f0);border-radius:8px;padding:12px 14px;text-decoration:none;transition:var(--transition,.15s ease);display:flex;gap:10px;align-items:flex-start}
      .azv-v2-card:hover{border-color:var(--primary,#714B67);background:#fff;box-shadow:var(--shadow-md,0 2px 8px rgba(0,0,0,.06))}
      .azv-v2-icon{flex-shrink:0;width:30px;height:30px;border-radius:7px;background:var(--primary-light,#f1e9ee);color:var(--primary,#714B67);display:flex;align-items:center;justify-content:center;font-size:13px}
      .azv-v2-title{font-weight:600;font-size:12.5px;margin-bottom:2px;color:var(--text-primary,#1a1a2e)}
      .azv-v2-desc{font-size:11px;color:var(--text-muted,#8697A8);line-height:1.4}
      @media(max-width:768px){.azv-v2-quick-panel{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  const features = [
    ['fa-robot','AI Co-Pilot','Chat with your business in English/Hindi','javascript:window.AzolveCopilotOpen?window.AzolveCopilotOpen():document.querySelector(\'.azv-cp-fab\')?.click()'],
    ['fa-magnifying-glass','Universal Search','Press Ctrl/⌘ + K to search everything','javascript:document.dispatchEvent(new KeyboardEvent(\'keydown\',{key:\'k\',ctrlKey:true,bubbles:true}))'],
    ['fa-clipboard-list','Audit Logs','See complete activity tracking','pages/audit-logs.html'],
    ['fa-chart-line','Churn Alerts','Predict customers at risk','pages/churn-dashboard.html'],
    ['fa-file-invoice','e-Invoicing','IRN + QR invoice tools','pages/einvoicing.html'],
    ['fa-diagram-project','Workflow Builder','Automate trigger → action flows','pages/workflow-builder.html'],
    ['fa-building-columns','Bank Import','Upload bank statements and reconcile','pages/bank-import.html'],
    ['fa-whatsapp','WhatsApp Business','Message customers via WhatsApp API','pages/whatsapp.html'],
    ['fa-plug','API + Webhooks','Public API keys and webhook delivery','pages/webhooks.html']
  ];

  function addSidebarMenu() {
    const sidebar = document.querySelector('.sidebar-menu') || document.querySelector('.sidebar nav') || document.querySelector('.sidebar');
    if (!sidebar || document.getElementById('azv-v2-sidebar-menu')) return;
    const wrap = document.createElement('div');
    wrap.id = 'azv-v2-sidebar-menu';
    wrap.className = 'menu-category';
    wrap.innerHTML = `<span class="menu-category-title">Azolve V2</span>` + features.map(f => {
      const href = f[3].startsWith('javascript:') ? '#' : f[3];
      const onclick = f[3].startsWith('javascript:') ? f[3].replace(/^javascript:/,'') + ';return false;' : `window.open('${f[3]}','_blank');return false;`;
      return `<div class="menu-item" onclick="${onclick}"><i class="fas ${f[0]}"></i><span class="menu-text">${f[1]}</span><span class="azv-v2-badge">NEW</span></div>`;
    }).join('');
    const firstMain = sidebar.querySelector('.menu-category:nth-child(2)');
    if (firstMain && firstMain.parentNode) firstMain.parentNode.insertBefore(wrap, firstMain.nextSibling);
    else sidebar.appendChild(wrap);
  }

  function addDashboardCards() {
    if (localStorage.getItem('azv_v2_panel_dismissed') === '1') return;
    const main = document.querySelector('.main-content') || document.querySelector('#mainContent') || document.querySelector('.content') || document.body;
    if (!main || document.getElementById('azv-v2-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'azv-v2-panel';
    panel.className = 'azv-v2-panel';
    panel.innerHTML = `
      <div class="azv-v2-panel-head">
        <div class="azv-v2-panel-title"><i class="fas fa-circle-info"></i> What's new in Azolve</div>
        <button class="azv-v2-dismiss" title="Dismiss" onclick="document.getElementById('azv-v2-panel').remove();localStorage.setItem('azv_v2_panel_dismissed','1')"><i class="fas fa-xmark"></i></button>
      </div>
      <p class="azv-v2-panel-desc">AI, automation, e-invoicing, workflows, bank import, WhatsApp, and audit logs are now available.</p>
      <div class="azv-v2-quick-panel">${features.map(f => {
        const href = f[3].startsWith('javascript:') ? '#' : f[3];
        const onclick = f[3].startsWith('javascript:') ? f[3].replace(/^javascript:/,'') + ';return false;' : '';
        return `<a class="azv-v2-card" href="${href}" ${onclick ? `onclick="${onclick}"` : 'target="_blank"'}><span class="azv-v2-icon"><i class="fas ${f[0]}"></i></span><div><div class="azv-v2-title">${f[1]}</div><div class="azv-v2-desc">${f[2]}</div></div></a>`;
      }).join('')}</div>`;
    const anchor = main.querySelector('.dashboard-grid,.stats-grid,.kpi-grid,.kpi-hero-row,.page-header') || main.firstElementChild;
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    } else {
      main.prepend(panel);
    }
  }

  function initNotificationMount() {
    if (!window.AzolveNotifications || document.getElementById('azv-notif-inline')) return;
    const top = document.querySelector('.topbar-right') || document.querySelector('.topbar-actions') || document.querySelector('.header-actions') || document.querySelector('.navbar-actions');
    if (!top) return;
    const mount = document.getElementById('azv-notif-inline') || document.createElement('span');
    mount.id = 'azv-notif-inline';
    if (!document.getElementById('azv-notif-inline')) top.prepend(mount);
    const _apiBase = (typeof api !== 'undefined') ? `${api.baseUrl}/notifications` :
      ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api/notifications'
        : 'https://azolve-api.onrender.com/api/notifications');
    window.AzolveNotifications.init({
      mount,
      apiBase: _apiBase,
      socket: (typeof socketService !== 'undefined') ? socketService : null,
      authToken: localStorage.getItem('azolve_token'),
    });
  }

  function boot() {
    addStyles();
    addSidebarMenu();
    addDashboardCards();
    initNotificationMount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 1500);
  setTimeout(boot, 3500);
})();
