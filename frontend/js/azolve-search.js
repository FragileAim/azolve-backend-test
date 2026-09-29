/**
 * Universal Search (Cmd+K / Ctrl+K)
 * Drop-in module — include this script + CSS, that's it.
 * Press ⌘K (Mac) or Ctrl+K (Win/Linux) to open.
 */
(function () {
  'use strict';

  const API_BASE = window.AZOLVE_API_BASE || (
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:3000/api'
      : 'https://azolve-api.onrender.com/api'
  );
  const STATE = {
    open: false,
    query: '',
    results: [],
    shortcuts: [],
    selectedIndex: 0,
    loading: false,
    debounceTimer: null,
  };

  // ============== STYLES ==============
  const css = `
    .azv-search-overlay { position: fixed; inset: 0; background: rgba(3, 7, 18, 0.7); backdrop-filter: blur(8px); z-index: 99999; display: none; align-items: flex-start; justify-content: center; padding-top: 12vh; animation: azv-fade-in 0.15s ease-out; }
    .azv-search-overlay.open { display: flex; }
    @keyframes azv-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .azv-search-panel { width: 92%; max-width: 640px; background: #0f172a; border: 1px solid rgba(255,153,0,0.15); border-radius: 16px; box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset; overflow: hidden; animation: azv-slide-down 0.2s ease-out; }
    @keyframes azv-slide-down { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .azv-search-input-wrap { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .azv-search-icon { font-size: 18px; opacity: 0.5; flex-shrink: 0; }
    .azv-search-input { flex: 1; background: transparent; border: none; outline: none; color: #e0e6f0; font-size: 16px; font-family: inherit; }
    .azv-search-input::placeholder { color: #475569; }
    .azv-search-kbd { padding: 3px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 11px; color: #94a3b8; font-family: 'SF Mono', monospace; }
    .azv-search-results { max-height: 60vh; overflow-y: auto; padding: 8px 0; }
    .azv-search-results::-webkit-scrollbar { width: 6px; }
    .azv-search-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    .azv-search-section { padding: 8px 0; }
    .azv-search-section-title { padding: 8px 20px 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 600; }
    .azv-search-item { display: flex; align-items: center; gap: 14px; padding: 12px 20px; cursor: pointer; transition: background 0.1s; border-left: 2px solid transparent; }
    .azv-search-item.active { background: rgba(255,153,0,0.08); border-left-color: #ff9900; }
    .azv-search-item:hover { background: rgba(255,255,255,0.03); }
    .azv-search-item-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border-radius: 8px; font-size: 16px; flex-shrink: 0; }
    .azv-search-item-content { flex: 1; min-width: 0; }
    .azv-search-item-title { font-size: 14px; font-weight: 600; color: #e0e6f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .azv-search-item-subtitle { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .azv-search-item-badge { padding: 2px 8px; background: rgba(255,153,0,0.1); color: #ff9900; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
    .azv-search-item-arrow { color: #475569; opacity: 0; transition: opacity 0.1s; }
    .azv-search-item.active .azv-search-item-arrow { opacity: 1; }
    .azv-search-empty { padding: 48px 20px; text-align: center; color: #475569; font-size: 14px; }
    .azv-search-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }
    .azv-search-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #475569; }
    .azv-search-footer-hints { display: flex; gap: 16px; }
    .azv-search-hint { display: flex; align-items: center; gap: 4px; }
    .azv-search-hint kbd { padding: 2px 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; font-size: 10px; }
    .azv-search-loading { display: flex; align-items: center; justify-content: center; padding: 32px; color: #64748b; }
    .azv-search-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,153,0,0.2); border-top-color: #ff9900; border-radius: 50%; animation: azv-spin 0.6s linear infinite; }
    @keyframes azv-spin { to { transform: rotate(360deg); } }
  `;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ============== MARKUP ==============
  const overlay = document.createElement('div');
  overlay.className = 'azv-search-overlay';
  overlay.innerHTML = `
    <div class="azv-search-panel" role="dialog" aria-label="Universal search">
      <div class="azv-search-input-wrap">
        <span class="azv-search-icon">🔍</span>
        <input type="text" class="azv-search-input" placeholder="Search clients, invoices, leads, products… or type a command" autocomplete="off" spellcheck="false">
        <span class="azv-search-kbd">ESC</span>
      </div>
      <div class="azv-search-results"></div>
      <div class="azv-search-footer">
        <div class="azv-search-footer-hints">
          <span class="azv-search-hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span class="azv-search-hint"><kbd>↵</kbd> Open</span>
          <span class="azv-search-hint"><kbd>ESC</kbd> Close</span>
        </div>
        <div>Azolve Universal Search</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.azv-search-input');
  const resultsEl = overlay.querySelector('.azv-search-results');

  // ============== OPEN / CLOSE ==============
  function open() {
    STATE.open = true;
    overlay.classList.add('open');
    setTimeout(() => input.focus(), 50);
    if (!STATE.query) showInitialState();
  }

  function close() {
    STATE.open = false;
    overlay.classList.remove('open');
    input.value = '';
    STATE.query = '';
    STATE.results = [];
    STATE.shortcuts = [];
  }

  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // ============== KEYBOARD SHORTCUT ==============
  document.addEventListener('keydown', (e) => {
    // ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      STATE.open ? close() : open();
      return;
    }

    if (!STATE.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activateSelection();
    }
  });

  // ============== INPUT HANDLER ==============
  input.addEventListener('input', (e) => {
    STATE.query = e.target.value;
    STATE.selectedIndex = 0;
    clearTimeout(STATE.debounceTimer);

    if (!STATE.query.trim()) {
      showInitialState();
      return;
    }

    STATE.loading = true;
    renderLoading();

    STATE.debounceTimer = setTimeout(() => doSearch(STATE.query), 200);
  });

  // ============== SEARCH ==============
  async function doSearch(q) {
    try {
      const token = localStorage.getItem('azolve_token') || localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        STATE.results = data.data.results || [];
        STATE.shortcuts = data.data.shortcuts || [];
        STATE.loading = false;
        renderResults();
      }
    } catch (err) {
      console.error('Search failed:', err);
      STATE.loading = false;
      renderError();
    }
  }

  // ============== RENDER ==============
  function showInitialState() {
    resultsEl.innerHTML = `
      <div class="azv-search-empty">
        <div class="azv-search-empty-icon">⌘</div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px; font-weight: 500;">Search anything in Azolve</div>
        <div style="font-size: 12px;">Try "invoice", "ramesh", "₹50000", "new client"…</div>
      </div>
    `;
  }

  function renderLoading() {
    resultsEl.innerHTML = `<div class="azv-search-loading"><div class="azv-search-spinner"></div></div>`;
  }

  function renderError() {
    resultsEl.innerHTML = `<div class="azv-search-empty"><div class="azv-search-empty-icon">⚠️</div><div>Search failed. Please try again.</div></div>`;
  }

  function renderResults() {
    const all = [...STATE.shortcuts, ...STATE.results];

    if (all.length === 0) {
      resultsEl.innerHTML = `
        <div class="azv-search-empty">
          <div class="azv-search-empty-icon">🔍</div>
          <div>No results for "<strong>${escapeHtml(STATE.query)}</strong>"</div>
        </div>
      `;
      return;
    }

    let html = '';

    if (STATE.shortcuts.length > 0) {
      html += `<div class="azv-search-section">
        <div class="azv-search-section-title">Quick Actions</div>
        ${STATE.shortcuts.map((s, i) => renderItem(s, i)).join('')}
      </div>`;
    }

    if (STATE.results.length > 0) {
      // Group results by type
      const grouped = {};
      STATE.results.forEach(r => {
        if (!grouped[r.type]) grouped[r.type] = [];
        grouped[r.type].push(r);
      });

      let idx = STATE.shortcuts.length;
      for (const [type, items] of Object.entries(grouped)) {
        html += `<div class="azv-search-section">
          <div class="azv-search-section-title">${pluralize(type)}</div>
          ${items.map(r => renderItem(r, idx++)).join('')}
        </div>`;
      }
    }

    resultsEl.innerHTML = html;
    bindItemClicks();
  }

  function renderItem(item, index) {
    const active = index === STATE.selectedIndex;
    return `
      <div class="azv-search-item ${active ? 'active' : ''}" data-index="${index}" data-url="${escapeHtml(item.url || '')}">
        <div class="azv-search-item-icon">${item.icon || '📄'}</div>
        <div class="azv-search-item-content">
          <div class="azv-search-item-title">${escapeHtml(item.title || '')}</div>
          ${item.subtitle ? `<div class="azv-search-item-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
        </div>
        ${item.badge ? `<div class="azv-search-item-badge">${escapeHtml(item.badge)}</div>` : ''}
        <div class="azv-search-item-arrow">↵</div>
      </div>
    `;
  }

  function bindItemClicks() {
    resultsEl.querySelectorAll('.azv-search-item').forEach(el => {
      el.addEventListener('click', () => {
        STATE.selectedIndex = parseInt(el.dataset.index);
        activateSelection();
      });
      el.addEventListener('mouseenter', () => {
        STATE.selectedIndex = parseInt(el.dataset.index);
        updateActiveState();
      });
    });
  }

  function moveSelection(delta) {
    const total = STATE.shortcuts.length + STATE.results.length;
    if (total === 0) return;
    STATE.selectedIndex = (STATE.selectedIndex + delta + total) % total;
    updateActiveState();
  }

  function updateActiveState() {
    resultsEl.querySelectorAll('.azv-search-item').forEach((el, i) => {
      el.classList.toggle('active', parseInt(el.dataset.index) === STATE.selectedIndex);
    });
    // Scroll active into view
    const active = resultsEl.querySelector('.azv-search-item.active');
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function activateSelection() {
    const all = [...STATE.shortcuts, ...STATE.results];
    const item = all[STATE.selectedIndex];
    if (!item) return;

    if (item.url === '#logout') {
      if (confirm('Logout from Azolve?')) {
        localStorage.clear();
        window.location.href = '/login.html';
      }
      return;
    }

    if (item.url) {
      close();
      window.location.href = item.url;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function pluralize(t) {
    const map = { client: 'Clients', invoice: 'Invoices', lead: 'Leads', deal: 'Deals', product: 'Products', project: 'Projects', task: 'Tasks', employee: 'Employees', ticket: 'Tickets' };
    return map[t] || t.charAt(0).toUpperCase() + t.slice(1) + 's';
  }

  // ============== EXPOSE GLOBAL API ==============
  window.AzolveSearch = { open, close, toggle: () => STATE.open ? close() : open() };

  console.log('✅ Azolve Universal Search loaded — Press Cmd+K / Ctrl+K to open');
})();
