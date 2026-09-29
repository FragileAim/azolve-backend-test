/* ==========================================================================
   AZOLVE MARKETING SITE — shared nav + footer partial
   Injected into #site-header / #site-footer on every page so all 9 pages
   stay in sync from one source of truth. Set window.AZOLVE_PAGE before
   this script runs to highlight the current nav item.
   ========================================================================== */
(function(){
  const PAGE = window.AZOLVE_PAGE || '';

  const PRODUCTS = [
    { id:'crm', name:'CRM & Pipeline', desc:'Leads, deals, follow-ups', icon:'fa-users', color:'linear-gradient(135deg,#714B67,#9a6f8f)', href:'product-crm.html' },
    { id:'invoicing', name:'Invoicing & GST', desc:'GST invoices, reminders, e-invoicing', icon:'fa-file-invoice', color:'linear-gradient(135deg,#00A09D,#1dc4c0)', href:'product-invoicing.html' },
    { id:'hrm', name:'HRM & Payroll', desc:'Attendance, leave, payroll', icon:'fa-id-badge', color:'linear-gradient(135deg,#714B67,#4f3447)', href:'product-hrm.html' },
    { id:'ai', name:'AI Copilot', desc:'Plain-language business commands', icon:'fa-robot', color:'linear-gradient(135deg,#16161f,#5a5a72)', href:'product-ai.html' },
  ];

  const headerHTML = `
  <nav class="topnav" id="topnav">
    <div class="topnav-inner">
      <a href="index.html" class="brand"><img src="assets/logo-navbar.png" alt="Azolve"></a>
      <div class="navlinks">
        <a href="index.html" class="${PAGE==='home'?'current':''}">Home</a>
        <div class="navitem">
          <button class="navtrigger">Products <i class="fas fa-chevron-down"></i></button>
          <div class="megamenu">
            <div class="megamenu-grid">
              ${PRODUCTS.map(p => `
                <a href="${p.href}" class="megamenu-item">
                  <div class="megamenu-ic" style="background:${p.color}"><i class="fas ${p.icon}"></i></div>
                  <div><h5>${p.name}</h5><p>${p.desc}</p></div>
                </a>`).join('')}
            </div>
            <div class="megamenu-foot">
              <span style="font-size:12.5px;color:var(--ink-faint)">10+ modules, one suite</span>
              <a href="products.html">View all products <i class="fas fa-arrow-right" style="font-size:11px"></i></a>
            </div>
          </div>
        </div>
        <a href="pricing.html" class="${PAGE==='pricing'?'current':''}">Pricing</a>
        <a href="industries.html" class="${PAGE==='industries'?'current':''}">Industries</a>
        <a href="about.html" class="${PAGE==='about'?'current':''}">About</a>
        <a href="contact.html" class="${PAGE==='contact'?'current':''}">Contact</a>
      </div>
      <div class="navcta">
        <a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>
        <a href="register.html" class="btn btn-primary btn-sm"><span>Start free</span></a>
        <button class="navburger" id="burger" aria-label="Open menu"><i class="fas fa-bars"></i></button>
      </div>
    </div>
  </nav>

  <div class="mobnav" id="mobnav">
    <div class="mobnav-top">
      <img src="assets/logo-navbar.png" alt="Azolve" style="height:30px">
      <button class="mobnav-close" id="mobClose" aria-label="Close menu"><i class="fas fa-times"></i></button>
    </div>
    <a href="index.html">Home</a>
    <a href="products.html">Products</a>
    <a href="industries.html">Industries</a>
    <a href="pricing.html">Pricing</a>
    <a href="about.html">About</a>
    <a href="help.html">Help</a>
    <a href="contact.html">Contact</a>
    <a href="login.html" class="btn btn-ghost btn-block" style="margin-top:14px">Sign in</a>
    <a href="register.html" class="btn btn-primary btn-block"><span>Start free</span></a>
  </div>`;

  const footerHTML = `
  <footer class="site-footer">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="assets/logo-white.png" alt="Azolve">
        <p>All-in-one business management software for growing Indian businesses. CRM, invoicing, HRM, finance and an AI copilot — one platform, one bill.</p>
        <div class="footer-social">
          <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
          <a href="#" aria-label="Twitter / X"><i class="fab fa-twitter"></i></a>
          <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Products</h4>
        <a href="product-crm.html">CRM</a>
        <a href="product-invoicing.html">Invoicing & GST</a>
        <a href="product-hrm.html">HRM & Payroll</a>
        <a href="product-ai.html">AI Copilot</a>
        <a href="products.html">All products</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="about.html">About</a>
        <a href="industries.html">Industries</a>
        <a href="pricing.html">Pricing</a>
        <a href="contact.html">Contact</a>
        <a href="help.html">Help Center</a>
        <a href="register.html">Start free</a>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <a href="terms.html">Terms of Service</a>
        <a href="privacy.html">Privacy Policy</a>
        <a href="refund.html">Refund Policy</a>
      </div>
      <div class="footer-col">
        <h4>Stay updated</h4>
        <p style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:14px;line-height:1.6">Product news, occasionally. No spam.</p>
        <form class="footer-newsletter" onsubmit="event.preventDefault(); this.querySelector('button').innerHTML='<i class=&quot;fas fa-check&quot;></i>'; this.querySelector('input').value='Thanks — you\\'re on the list';">
          <input type="email" placeholder="you@company.com" required>
          <button type="submit" aria-label="Subscribe"><i class="fas fa-arrow-right"></i></button>
        </form>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Azolve Infotech Private Limited. All rights reserved.</span>
      <div>
        <a href="terms.html">Terms</a>
        <a href="privacy.html">Privacy</a>
        <a href="refund.html">Refund</a>
      </div>
    </div>
  </footer>`;

  function mount(){
    const h = document.getElementById('site-header');
    const f = document.getElementById('site-footer');
    if (h) h.innerHTML = headerHTML;
    if (f) f.innerHTML = footerHTML;

    // Nav scroll state
    const topnav = document.getElementById('topnav');
    if (topnav){
      window.addEventListener('scroll', () => topnav.classList.toggle('scrolled', window.scrollY > 8), {passive:true});
    }
    // Mobile nav
    const burger = document.getElementById('burger'), mobnav = document.getElementById('mobnav'), mobClose = document.getElementById('mobClose');
    if (burger && mobnav){
      burger.addEventListener('click', () => mobnav.classList.add('open'));
      mobClose.addEventListener('click', () => mobnav.classList.remove('open'));
      mobnav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobnav.classList.remove('open')));
    }
    document.dispatchEvent(new CustomEvent('azolve:chrome-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
