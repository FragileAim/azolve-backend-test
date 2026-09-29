/**
 * Azolve Notifications Bell Widget
 * Drop-in floating bell with dropdown panel
 *
 * Usage:
 *   <script src="/js/azolve-notifications.js"></script>
 *   <script>AzolveNotifications.init({ apiBase: '/api/notifications', socket });</script>
 */
(function (global) {
  const STYLES = `
    .az-notif-wrap{position:relative;display:inline-block;font-family:Inter,system-ui,sans-serif}
    .az-notif-btn{position:relative;width:44px;height:44px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
    .az-notif-btn:hover{background:#f8fafc;transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
    .az-notif-badge{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;background:#ef4444;color:#fff;border-radius:999px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 7px;border:2px solid #fff}
    .az-notif-panel{position:absolute;top:calc(100% + 12px);right:0;width:400px;max-width:calc(100vw - 24px);max-height:560px;background:#fff;border:1px solid #e5e7eb;border-radius:18px;box-shadow:0 24px 44px rgba(15,23,42,.16);display:none;flex-direction:column;z-index:99999;overflow:hidden}
    .az-notif-panel.open{display:flex}
    .az-notif-header{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #f3f4f6}
    .az-notif-title{font-weight:700;font-size:15px;color:#111827}
    .az-notif-readall{background:none;border:0;color:#4f46e5;font-size:13px;cursor:pointer;font-weight:600;padding:6px 8px;border-radius:10px;transition:background .18s ease}
    .az-notif-readall:hover{background:rgba(79,70,229,.08)}
    .az-notif-filters{display:flex;gap:10px;align-items:center;padding:0 18px 14px}
    .az-notif-search,.az-notif-select{border:1px solid #e5e7eb;border-radius:12px;padding:10px 12px;background:#fff;color:#0f172a;font-size:13px;outline:none;transition:border-color .18s ease,box-shadow .18s ease;}
    .az-notif-search{flex:1;min-width:0;}
    .az-notif-search:focus,.az-notif-select:focus{border-color:#4f46e5;box-shadow:0 0 0 4px rgba(79,70,229,.08)}
    .az-notif-select{width:140px;}
    .az-notif-tabs{display:flex;border-bottom:1px solid #f3f4f6;padding:0 10px 8px 18px;gap:4px}
    .az-notif-tab{padding:10px 12px;background:none;border:0;color:#6b7280;font-size:13px;cursor:pointer;border-bottom:2px solid transparent;font-weight:600;transition:color .18s ease,border-color .18s ease}
    .az-notif-tab.active{color:#4f46e5;border-bottom-color:#4f46e5}
    .az-notif-list{flex:1;overflow-y:auto;background:#fff;scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}
    .az-notif-list::-webkit-scrollbar{width:8px}
    .az-notif-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px}
    .az-notif-list::-webkit-scrollbar-track{background:transparent}
    .az-notif-empty{padding:48px 20px;text-align:center;color:#9ca3af;font-size:13px}
    .az-notif-item{display:flex;gap:12px;padding:16px 18px;border-bottom:1px solid #f3f4f6;cursor:pointer;transition:background .15s ease,transform .15s ease;position:relative}
    .az-notif-item:hover{background:#f8fafc;transform:translateX(1px)}
    .az-notif-item.unread{background:#eff6ff}
    .az-notif-item.unread::before{content:'';position:absolute;left:12px;top:24px;width:8px;height:8px;border-radius:50%;background:#4f46e5}
    .az-notif-icon{width:38px;height:38px;border-radius:12px;background:#f8fafc;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;color:#111827}
    .az-notif-body{flex:1;min-width:0}
    .az-notif-itemtitle{font-weight:700;font-size:13px;color:#111827;margin-bottom:4px;line-height:1.4}
    .az-notif-msg{font-size:12px;color:#475569;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .az-notif-time{font-size:11px;color:#94a3b8;margin-top:8px}
    .az-notif-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .az-notif-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px 12px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;font-size:11px;color:#334155;text-decoration:none;transition:background .18s ease,border-color .18s ease,color .18s ease}
    .az-notif-action:hover{background:#f8fafc;border-color:#c7d2fe;color:#111827}
    .az-notif-action.primary{background:#4f46e5;border-color:#4f46e5;color:#fff}
    .az-notif-action.primary:hover{background:#4338ca}
    .az-notif-footer{padding:14px 18px;border-top:1px solid #f3f4f6;text-align:center;background:#fafbff}
    .az-notif-footer a{color:#4f46e5;font-size:13px;text-decoration:none;font-weight:700}
    .az-notif-footer a:hover{text-decoration:underline}
    .az-notif-priority-high{border-left:3px solid #f59e0b}
    .az-notif-priority-urgent{border-left:3px solid #ef4444}
    @media(max-width:520px){.az-notif-panel{right:8px;left:8px;width:auto;max-width:calc(100vw - 16px)}.az-notif-header,.az-notif-filters,.az-notif-footer{padding-left:14px;padding-right:14px}.az-notif-item{padding:14px}}
  `;

  function timeAgo(date) {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s/60) + 'm ago';
    if (s < 86400) return Math.floor(s/3600) + 'h ago';
    if (s < 2592000) return Math.floor(s/86400) + 'd ago';
    return new Date(date).toLocaleDateString();
  }

  const Bell = {
    apiBase: '/api/notifications',
    authToken: null,
    container: null, panel: null, btn: null, badge: null, list: null,
    items: [], unread: 0, currentTab: 'all', query: '', filterType: 'all',

    init(opts = {}) {
      this.apiBase = opts.apiBase || this.apiBase;
      this.authToken = opts.authToken || this.authToken;
      if (opts.socket) this.socket = opts.socket;

      if (!this.container) {
        this._injectStyles();
        const container = opts.container || opts.mount || document.body;
        this._render(container);
        this._bindSocket();
        this.refresh();
        // Poll every 60s as backup
        setInterval(() => this.refresh(), 60000);
      } else if (opts.socket) {
        this._bindSocket();
      }

      return this;
    },

    _getHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const token = this.authToken || localStorage.getItem('azolve_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      return headers;
    },

    _injectStyles() {
      if (document.getElementById('az-notif-styles')) return;
      const s = document.createElement('style');
      s.id = 'az-notif-styles'; s.textContent = STYLES;
      document.head.appendChild(s);
    },

    _render(target) {
      const wrap = document.createElement('div');
      wrap.className = 'az-notif-wrap';
      wrap.innerHTML = `
        <button class="az-notif-btn" id="azNotifBtn" aria-label="Notifications">
          🔔<span class="az-notif-badge" id="azNotifBadge" style="display:none">0</span>
        </button> 
        <div class="az-notif-panel" id="azNotifPanel">
          <div class="az-notif-header">
            <div class="az-notif-title">Notifications</div>
            <button class="az-notif-readall" id="azNotifReadAll">Mark all read</button>
          </div>
          <div class="az-notif-filters">
            <input type="search" id="azNotifSearch" class="az-notif-search" placeholder="Search notifications..." />
            <select id="azNotifTypeFilter" class="az-notif-select">
              <option value="all">All types</option>
              <option value="payment">Payments</option>
              <option value="invoice">Invoices</option>
              <option value="task">Tasks</option>
              <option value="lead">Leads</option>
              <option value="system">System</option>
              <option value="warning">Warnings</option>
            </select>
          </div>
          <div class="az-notif-tabs">
            <button class="az-notif-tab active" data-tab="all">All</button>
            <button class="az-notif-tab" data-tab="unread">Unread</button>
            <button class="az-notif-tab" data-tab="high">Important</button>
          </div>
          <div class="az-notif-list" id="azNotifList">
            <div class="az-notif-empty">No notifications yet</div>
          </div>
          <div class="az-notif-footer">
            <a href="/notifications">View all</a>
          </div>
        </div>`;
      if (typeof target === 'string') target = document.querySelector(target);
      target.appendChild(wrap);

      this.container = wrap;
      this.btn = wrap.querySelector('#azNotifBtn');
      this.badge = wrap.querySelector('#azNotifBadge');
      this.panel = wrap.querySelector('#azNotifPanel');
      this.list = wrap.querySelector('#azNotifList');

      this.btn.addEventListener('click', e => { e.stopPropagation(); this.toggle(); });
      document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) this.panel.classList.remove('open');
      });
      wrap.querySelector('#azNotifReadAll').addEventListener('click', () => this.markAllRead());
      wrap.querySelector('#azNotifSearch').addEventListener('input', (e) => {
        this.query = e.target.value.trim().toLowerCase();
        this.renderList();
      });
      wrap.querySelector('#azNotifTypeFilter').addEventListener('change', (e) => {
        this.filterType = e.target.value;
        this.renderList();
      });
      wrap.querySelectorAll('.az-notif-tab').forEach(t => t.addEventListener('click', () => {
        wrap.querySelectorAll('.az-notif-tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active'); this.currentTab = t.dataset.tab; this.renderList();
      }));
    },

    _bindSocket() {
      if (!this.socket || this._socketBound) return;
      this._socketBound = true;
      this.socket.on('notification:new', (n) => {
        const notification = { ...n, read: !!n.read };
        this.items.unshift(notification);
        this.unread = this.items.filter((item) => !item.read).length;
        this.renderBadge(); this.renderList();
        // Browser native notification
        this.maybeBrowserNotify(notification);
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'show-notification',
            title: notification.title,
            message: notification.message,
            url: notification.url,
          });
        }
      });
      this.socket.on('connect', () => {
        this.refresh();
      });
    },

    maybeBrowserNotify(n) {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(n.title, { body: n.message, icon: '/favicon.ico', data: { url: n.url } });
      }
    },

    requestPermission() {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },

    toggle() {
      this.panel.classList.toggle('open');
      if (this.panel.classList.contains('open')) {
        this.requestPermission();
        this.refresh();
      }
    },

    async refresh() {
      try {
        const res = await fetch(`${this.apiBase}?limit=30`, { headers: this._getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        this.items = data.data || [];
        this.unread = typeof data.unread === 'number' ? data.unread : this.items.filter(item => !item.read).length;
        this.renderBadge(); this.renderList();
      } catch (_) {}
    },

    renderBadge() {
      if (this.unread > 0) {
        this.badge.style.display = 'flex';
        this.badge.textContent = this.unread > 99 ? '99+' : this.unread;
      } else {
        this.badge.style.display = 'none';
      }
    },

    renderList() {
      let items = this.items;
      if (this.currentTab === 'unread') items = items.filter(i => !i.read);
      else if (this.currentTab === 'high') items = items.filter(i => ['high','urgent'].includes(i.priority));
      if (this.filterType !== 'all') items = items.filter(i => i.type === this.filterType);
      if (this.query) {
        items = items.filter(i => {
          const text = `${i.title} ${i.message} ${i.type}`.toLowerCase();
          return text.includes(this.query);
        });
      }

      if (!items.length) {
        this.list.innerHTML = '<div class="az-notif-empty">No notifications</div>';
        return;
      }
      this.list.innerHTML = items.map(n => `
        <div class="az-notif-item ${n.read ? '' : 'unread'} az-notif-priority-${n.priority||'normal'}" data-id="${n._id}" data-url="${n.url || ''}">
          <div class="az-notif-icon">${n.icon || iconFor(n.type)}</div>
          <div class="az-notif-body">
            <div class="az-notif-itemtitle">${escape(n.title)}</div>
            <div class="az-notif-msg">${escape(n.message)}</div>
            <div class="az-notif-time">${timeAgo(n.createdAt)}</div>
            ${(n.actions||[]).length ? `<div class="az-notif-actions">${n.actions.map(a =>
              `<a class="az-notif-action ${a.style==='primary'?'primary':''}" href="${a.url}">${escape(a.label)}</a>`
            ).join('')}</div>` : ''}
          </div>
        </div>
      `).join('');
      this.list.querySelectorAll('.az-notif-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id, url = el.dataset.url;
          this.markRead(id);
          if (url) location.href = url;
        });
      });
    },

    async markRead(id) {
      await fetch(`${this.apiBase}/${id}/read`, { method: 'POST', headers: this._getHeaders() });
      const n = this.items.find(x => x._id === id);
      if (n && !n.read) { n.read = true; this.unread = Math.max(0, this.unread - 1); }
      this.renderBadge(); this.renderList();
    },

    async markAllRead() {
      await fetch(`${this.apiBase}/read-all`, { method: 'POST', headers: this._getHeaders() });
      this.items.forEach(n => n.read = true);
      this.unread = 0;
      this.renderBadge(); this.renderList();
    },
  };

  function iconFor(type) {
    return ({ payment:'💰', invoice:'🧾', task:'📋', lead:'🎯', warning:'⚠️',
              error:'❌', success:'✅', system:'⚙️', churn:'📉', mention:'💬', reminder:'⏰' })[type] || '🔔';
  }
  function escape(s) {
    return String(s||'').replace(/[<>"&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]));
  }

  global.AzolveNotifications = Bell;
})(typeof window !== 'undefined' ? window : globalThis);
