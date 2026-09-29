/**
 * Azolve Keyboard Shortcuts
 * Provides global shortcuts + a help overlay (press '?' to view)
 *
 * Usage:
 *   AzolveShortcuts.init();
 *   AzolveShortcuts.register('g i', () => location.href='/invoices', 'Go to Invoices');
 */
(function (global) {
  const STYLES = `
    .az-shortcut-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(4px);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px}
    .az-shortcut-overlay.open{display:flex}
    .az-shortcut-modal{width:560px;max-width:100%;max-height:85vh;background:#fff;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;font-family:inherit}
    .az-shortcut-header{padding:18px 22px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between}
    .az-shortcut-header h3{margin:0;font-size:16px;font-weight:700;color:#111}
    .az-shortcut-close{background:none;border:0;color:#6b7280;font-size:22px;cursor:pointer;line-height:1}
    .az-shortcut-body{padding:8px 22px 22px;overflow-y:auto}
    .az-shortcut-section{margin-top:18px}
    .az-shortcut-sectionttl{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.06em;margin-bottom:10px}
    .az-shortcut-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #f9fafb}
    .az-shortcut-row:last-child{border-bottom:0}
    .az-shortcut-label{font-size:14px;color:#374151}
    .az-shortcut-keys{display:flex;gap:4px}
    .az-shortcut-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;background:#f3f4f6;border:1px solid #e5e7eb;border-bottom-width:2px;border-radius:5px;font-family:'SF Mono',ui-monospace,monospace;font-size:11px;color:#374151;font-weight:600}
    .az-shortcut-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111827;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;z-index:99999;opacity:0;transition:opacity .2s;pointer-events:none}
    .az-shortcut-toast.show{opacity:.95}
  `;

  const Shortcuts = {
    bindings: [],
    sequenceTimeout: null,
    sequenceBuffer: '',
    enabled: true,

    init(opts = {}) {
      this._injectStyles();
      this._renderHelpModal();
      document.addEventListener('keydown', e => this._handle(e));
      this._registerDefaults();
    },

    _injectStyles() {
      if (document.getElementById('az-shortcut-styles')) return;
      const s = document.createElement('style');
      s.id = 'az-shortcut-styles'; s.textContent = STYLES;
      document.head.appendChild(s);
    },

    _registerDefaults() {
      this.register('?', () => this.showHelp(), 'Show this help', 'General');
      this.register('Escape', () => { this.hideHelp(); }, 'Close dialogs', 'General');
      this.register('mod+k', () => { window.AzolveSearch?.open(); }, 'Universal Search', 'General', true);
      this.register('mod+/', () => { window.AzolveSearch?.open(); }, 'Universal Search', 'General', true);

      // Navigation (g + key)
      this.register('g h', () => location.href = '/', 'Go to Home', 'Navigation');
      this.register('g d', () => location.href = '/dashboard', 'Go to Dashboard', 'Navigation');
      this.register('g i', () => location.href = '/invoices', 'Go to Invoices', 'Navigation');
      this.register('g c', () => location.href = '/clients', 'Go to Clients', 'Navigation');
      this.register('g l', () => location.href = '/leads', 'Go to Leads', 'Navigation');
      this.register('g p', () => location.href = '/products', 'Go to Products', 'Navigation');
      this.register('g t', () => location.href = '/tasks', 'Go to Tasks', 'Navigation');
      this.register('g e', () => location.href = '/employees', 'Go to Employees', 'Navigation');
      this.register('g r', () => location.href = '/reports', 'Go to Reports', 'Navigation');

      // Create new (n + key)
      this.register('n i', () => location.href = '/invoices/new', 'New Invoice', 'Create');
      this.register('n c', () => location.href = '/clients/new', 'New Client', 'Create');
      this.register('n l', () => location.href = '/leads/new', 'New Lead', 'Create');
      this.register('n t', () => location.href = '/tasks/new', 'New Task', 'Create');
      this.register('n p', () => location.href = '/products/new', 'New Product', 'Create');

      // Toggles
      this.register('mod+b', () => document.body.classList.toggle('sidebar-collapsed'), 'Toggle sidebar', 'Layout', true);
      this.register('mod+shift+d', () => document.body.classList.toggle('dark'), 'Toggle dark mode', 'Layout', true);
    },

    /**
     * @param keys: 'mod+k' or 'g i' (sequence)
     * @param handler: function
     * @param label, group, preventDefault
     */
    register(keys, handler, label = '', group = 'Custom', preventDefault = false) {
      this.bindings.push({ keys: keys.toLowerCase(), handler, label, group, preventDefault });
    },

    _matchSingle(e, pattern) {
      const parts = pattern.split('+').map(p => p.trim());
      const wantMod = parts.includes('mod') || parts.includes('ctrl') || parts.includes('cmd');
      const wantShift = parts.includes('shift');
      const wantAlt = parts.includes('alt');
      const key = parts.filter(p => !['mod','ctrl','cmd','shift','alt'].includes(p))[0];
      if (!key) return false;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const modPressed = isMac ? e.metaKey : e.ctrlKey;
      if (wantMod !== modPressed) return false;
      if (wantShift !== e.shiftKey) return false;
      if (wantAlt !== e.altKey) return false;

      return e.key.toLowerCase() === key.toLowerCase();
    },

    _handle(e) {
      if (!this.enabled) return;
      const tgt = e.target;
      const tag = tgt.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tgt.isContentEditable;

      // Single-key bindings (allow Escape and mod+ keys even in inputs)
      for (const b of this.bindings) {
        if (b.keys.includes(' ')) continue; // skip sequences here
        if (isInput && !b.keys.includes('mod') && b.keys !== 'escape') continue;
        if (this._matchSingle(e, b.keys)) {
          if (b.preventDefault) e.preventDefault();
          b.handler();
          return;
        }
      }

      if (isInput) return;

      // Sequence bindings: 'g i', 'n c'
      const k = e.key.toLowerCase();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (k.length !== 1) return;

      this.sequenceBuffer += (this.sequenceBuffer ? ' ' : '') + k;
      clearTimeout(this.sequenceTimeout);

      // Try match
      const match = this.bindings.find(b => b.keys === this.sequenceBuffer);
      if (match) {
        e.preventDefault();
        match.handler();
        this.sequenceBuffer = '';
        return;
      }
      // Partial?
      const partial = this.bindings.some(b => b.keys.startsWith(this.sequenceBuffer + ' '));
      if (partial) {
        this._toast(this.sequenceBuffer.toUpperCase());
        this.sequenceTimeout = setTimeout(() => { this.sequenceBuffer = ''; }, 1200);
      } else {
        this.sequenceBuffer = '';
      }
    },

    _toast(text) {
      let el = document.getElementById('azShortcutToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'azShortcutToast'; el.className = 'az-shortcut-toast';
        document.body.appendChild(el);
      }
      el.textContent = text;
      el.classList.add('show');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show'), 1000);
    },

    _renderHelpModal() {
      const wrap = document.createElement('div');
      wrap.className = 'az-shortcut-overlay'; wrap.id = 'azShortcutOverlay';
      wrap.innerHTML = `
        <div class="az-shortcut-modal">
          <div class="az-shortcut-header">
            <h3>⌨️ Keyboard Shortcuts</h3>
            <button class="az-shortcut-close" id="azShortcutClose">&times;</button>
          </div>
          <div class="az-shortcut-body" id="azShortcutBody"></div>
        </div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener('click', e => { if (e.target === wrap) this.hideHelp(); });
      wrap.querySelector('#azShortcutClose').addEventListener('click', () => this.hideHelp());
    },

    showHelp() {
      const body = document.getElementById('azShortcutBody');
      const groups = {};
      this.bindings.forEach(b => { (groups[b.group] = groups[b.group] || []).push(b); });
      body.innerHTML = Object.entries(groups).map(([g, items]) => `
        <div class="az-shortcut-section">
          <div class="az-shortcut-sectionttl">${g}</div>
          ${items.map(b => `
            <div class="az-shortcut-row">
              <div class="az-shortcut-label">${b.label}</div>
              <div class="az-shortcut-keys">${this._renderKeys(b.keys)}</div>
            </div>`).join('')}
        </div>
      `).join('');
      document.getElementById('azShortcutOverlay').classList.add('open');
    },

    hideHelp() {
      document.getElementById('azShortcutOverlay')?.classList.remove('open');
    },

    _renderKeys(keys) {
      return keys.split(' ').map(k => k.split('+').map(p => {
        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const display = ({ mod: isMac ? '⌘' : 'Ctrl', ctrl: 'Ctrl', cmd: '⌘',
                           shift: '⇧', alt: isMac ? '⌥' : 'Alt', escape: 'Esc' })[p] || p.toUpperCase();
        return `<span class="az-shortcut-kbd">${display}</span>`;
      }).join('')).join(' &nbsp; ');
    },
  };

  global.AzolveShortcuts = Shortcuts;
})(typeof window !== 'undefined' ? window : globalThis);
