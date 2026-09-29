/**
 * Azolve i18n — Lightweight client-side translation system
 * Usage:
 *   <script src="/js/azolve-i18n.js"></script>
 *   <script>
 *     await AzolveI18n.init('hi');         // load Hindi
 *     AzolveI18n.t('common.save');         // → "सहेजें"
 *     AzolveI18n.applyToDOM();             // translate all [data-i18n] elements
 *   </script>
 *
 * HTML markup:
 *   <button data-i18n="common.save">Save</button>
 *   <input data-i18n-attr="placeholder:common.search" />
 */
(function (global) {
  const STORAGE_KEY = 'azolve_locale';
  const DEFAULT_LOCALE = 'en';
  const LOCALES_PATH = '/locales';

  const SUPPORTED = [
    { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  ];

  const cache = {};
  let currentLocale = DEFAULT_LOCALE;
  let currentDict = {};
  const listeners = [];

  function get(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : null, obj);
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
  }

  async function loadLocale(code) {
    if (cache[code]) return cache[code];
    try {
      const res = await fetch(`${LOCALES_PATH}/${code}.json`);
      if (!res.ok) throw new Error(`Failed to load ${code}`);
      cache[code] = await res.json();
      return cache[code];
    } catch (e) {
      console.warn(`[i18n] ${code} failed, using ${DEFAULT_LOCALE}`, e);
      if (code !== DEFAULT_LOCALE) return loadLocale(DEFAULT_LOCALE);
      return {};
    }
  }

  const I18n = {
    SUPPORTED,

    async init(locale) {
      const loc = locale || localStorage.getItem(STORAGE_KEY) || navigator.language?.slice(0, 2) || DEFAULT_LOCALE;
      const supported = SUPPORTED.find(l => l.code === loc) ? loc : DEFAULT_LOCALE;
      currentLocale = supported;
      currentDict = await loadLocale(supported);
      // Pre-load English fallback
      if (supported !== DEFAULT_LOCALE) await loadLocale(DEFAULT_LOCALE);
      document.documentElement.lang = supported;
      document.documentElement.dir = currentDict._meta?.dir || 'ltr';
      localStorage.setItem(STORAGE_KEY, supported);
      this.applyToDOM();
      listeners.forEach(fn => { try { fn(supported); } catch (_) {} });
      return supported;
    },

    async setLocale(code) { return this.init(code); },
    getLocale() { return currentLocale; },
    onChange(fn) { listeners.push(fn); },

    t(key, vars) {
      const val = get(currentDict, key) ?? get(cache[DEFAULT_LOCALE] || {}, key) ?? key;
      return typeof val === 'string' ? interpolate(val, vars) : val;
    },

    applyToDOM(root = document) {
      // <el data-i18n="key">
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const txt = this.t(key);
        if (txt && txt !== key) el.textContent = txt;
      });
      // <el data-i18n-attr="placeholder:key,title:key2">
      root.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const spec = el.getAttribute('data-i18n-attr');
        spec.split(',').forEach(pair => {
          const [attr, key] = pair.split(':').map(s => s.trim());
          if (attr && key) {
            const txt = this.t(key);
            if (txt && txt !== key) el.setAttribute(attr, txt);
          }
        });
      });
      // <el data-i18n-html="key">  (HTML content)
      root.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        const txt = this.t(key);
        if (txt && txt !== key) el.innerHTML = txt;
      });
    },

    /**
     * Format number using locale (Indian numbering: 1,00,000)
     */
    formatNumber(n, opts = {}) {
      try { return new Intl.NumberFormat(currentLocale === 'en' ? 'en-IN' : currentLocale + '-IN', opts).format(n); }
      catch (_) { return String(n); }
    },

    formatCurrency(n, currency = 'INR') {
      return this.formatNumber(n, { style: 'currency', currency, maximumFractionDigits: 2 });
    },

    formatDate(date, opts = { dateStyle: 'medium' }) {
      try { return new Intl.DateTimeFormat(currentLocale + '-IN', opts).format(new Date(date)); }
      catch (_) { return String(date); }
    },

    /**
     * Render language switcher dropdown
     */
    renderSwitcher(container) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) return;
      el.innerHTML = `
        <div class="azolve-lang-switcher">
          <button class="azolve-lang-btn" id="azolveLangBtn">
            <span class="lang-flag">${SUPPORTED.find(l => l.code === currentLocale)?.flag || '🌐'}</span>
            <span class="lang-name">${SUPPORTED.find(l => l.code === currentLocale)?.native || currentLocale}</span>
            <span class="lang-arrow">▼</span>
          </button>
          <div class="azolve-lang-menu" id="azolveLangMenu">
            ${SUPPORTED.map(l => `
              <button class="azolve-lang-item ${l.code === currentLocale ? 'active' : ''}" data-locale="${l.code}">
                <span>${l.flag}</span>
                <span>${l.native}</span>
                <small>${l.name}</small>
              </button>
            `).join('')}
          </div>
        </div>`;
      const btn = el.querySelector('#azolveLangBtn');
      const menu = el.querySelector('#azolveLangMenu');
      btn.addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
      document.addEventListener('click', () => menu.classList.remove('open'));
      el.querySelectorAll('.azolve-lang-item').forEach(item => {
        item.addEventListener('click', async () => {
          await I18n.setLocale(item.dataset.locale);
          location.reload();
        });
      });
    },
  };

  // Inject minimal CSS for switcher
  if (typeof document !== 'undefined' && !document.getElementById('azolve-i18n-styles')) {
    const style = document.createElement('style');
    style.id = 'azolve-i18n-styles';
    style.textContent = `
      .azolve-lang-switcher{position:relative;display:inline-block;font-family:inherit}
      .azolve-lang-btn{display:flex;gap:8px;align-items:center;padding:8px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:14px;color:#111}
      .azolve-lang-btn:hover{background:#f9fafb}
      .azolve-lang-arrow{font-size:10px;color:#6b7280}
      .azolve-lang-menu{position:absolute;top:calc(100% + 6px);right:0;min-width:220px;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:6px;display:none;z-index:9999}
      .azolve-lang-menu.open{display:block}
      .azolve-lang-item{display:flex;gap:10px;align-items:center;width:100%;padding:8px 12px;background:none;border:0;border-radius:6px;cursor:pointer;font-size:14px;text-align:left;color:#111}
      .azolve-lang-item:hover{background:#f3f4f6}
      .azolve-lang-item.active{background:#eef2ff;color:#4338ca;font-weight:600}
      .azolve-lang-item small{margin-left:auto;color:#9ca3af;font-size:11px}
    `;
    document.head.appendChild(style);
  }

  global.AzolveI18n = I18n;
})(typeof window !== 'undefined' ? window : globalThis);
