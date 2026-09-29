// Azolve Environment Detection — auto localhost vs production
// Include this BEFORE other JS files so they can use window.AZOLVE_API_BASE
(function () {
  var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  window.AZOLVE_API_BASE = isLocal
    ? 'http://localhost:3000/api'
    : 'https://azolve-api.onrender.com/api';
  window.AZOLVE_BACKEND_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://azolve-api.onrender.com';
})();
