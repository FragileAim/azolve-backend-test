// Azolve Office Suite — Shared API helper
(function () {
  function getToken() {
    return localStorage.getItem('authToken')
        || localStorage.getItem('azolve_token')
        || localStorage.getItem('token')
        || '';
  }
  const API_BASE = (
    window.location.hostname === 'azolve.io' ||
    window.location.hostname.endsWith('.pages.dev') ||
    window.location.hostname.includes('super.myninja.ai')
  ) ? 'https://azolve-api.onrender.com/api'
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';

  async function _fetch(path, opts = {}, anon = false) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const tok = getToken();
    if (tok && !anon) headers.Authorization = 'Bearer ' + tok;
    const r = await fetch(API_BASE + path, { ...opts, headers });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`${r.status}: ${txt.slice(0, 200)}`);
    }
    return r.json();
  }

  window.OfficeAPI = {
    list:   (filter = {}) => _fetch('/office?' + new URLSearchParams(filter)),
    stats:  () => _fetch('/office/stats'),
    get:    (id) => _fetch('/office/' + id),
    create: (type, title, content) =>
      _fetch('/office', { method: 'POST', body: JSON.stringify({ type, title, content }) }),
    update: (id, payload) =>
      _fetch('/office/' + id, { method: 'PUT', body: JSON.stringify(payload) }),
    duplicate: (id) => _fetch('/office/' + id + '/duplicate', { method: 'POST' }),
    remove: (id) => _fetch('/office/' + id, { method: 'DELETE' }),
    share:  (id, enabled, permission = 'view') =>
      _fetch('/office/' + id + '/share', { method: 'POST', body: JSON.stringify({ enabled, permission }) }),
    publicGet: (token) => _fetch('/office/share/' + token, {}, true),
    publicUpdate: (token, payload) =>
      _fetch('/office/share/' + token, { method: 'PUT', body: JSON.stringify(payload) }, true),
  };

  window.OfficeUtils = {
    fmtDate(d) {
      const dt = new Date(d), now = new Date(), diff = (now - dt) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 7 * 86400) return Math.floor(diff / 86400) + 'd ago';
      return dt.toLocaleDateString();
    },
    escape(s) { return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); },
  };
})();
