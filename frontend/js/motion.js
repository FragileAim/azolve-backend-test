/* ==========================================================================
   AZOLVE MARKETING SITE — shared motion utilities
   Scroll-reveal (IntersectionObserver) + animated count-up for stats.
   ========================================================================== */
(function(){
  function initReveal(){
    const els = document.querySelectorAll('.reveal, .reveal-scale');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px 80px 0px' });
    els.forEach((el, i) => { el.style.setProperty('--i', i % 8); io.observe(el); });
  }

  function initCountUp(){
    const els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const raw = el.getAttribute('data-count');
        const match = raw.match(/^([^\d]*)([\d.]+)(.*)$/);
        if (!match) { return; }
        const [, prefix, numStr, suffix] = match;
        const target = parseFloat(numStr);
        const decimals = (numStr.split('.')[1] || '').length;
        const dur = 1100;
        const start = performance.now();
        function tick(now){
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = (target * eased).toFixed(decimals);
          el.textContent = prefix + val + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  function init(){ initReveal(); initCountUp(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // Re-scan after chrome (nav/footer) mounts, in case it added reveal elements
  document.addEventListener('azolve:chrome-ready', init);
})();
