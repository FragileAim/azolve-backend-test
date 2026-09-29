/**
 * Azolve Payment & Subscription System
 * Cashfree Payment Gateway Integration
 * POS Lock Gate + Plan Enforcement
 */

// ─── Config ────────────────────────────────────────────────────────────────
const PAYMENT_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api/payments'
  : 'https://azolve-api.onrender.com/api/payments';

// Plan definitions (mirrored from backend)
const AZV_PLANS = {
  free: {
    name: 'Free',
    badge: '🆓',
    color: '#6c757d',
    monthly: 0,
    yearly: 0,
    features: { maxUsers: 5, hasPOS: false, hasAdvancedReports: false, hasWhatsApp: false, maxStorage: 512 },
    highlights: ['5 Users', '512 MB Storage', 'Basic CRM', 'Invoicing', 'Limited Reports'],
    cta: 'Current Plan',
  },
  starter: {
    name: 'Starter',
    badge: '🚀',
    color: '#0984e3',
    monthly: 999,
    yearly: 9990,
    features: { maxUsers: 10, hasPOS: false, hasAdvancedReports: false, hasWhatsApp: false, maxStorage: 1024 },
    highlights: ['10 Users', '1 GB Storage', 'Full CRM', 'Invoicing + GST', 'Email Support', 'Advanced Analytics'],
    cta: 'Upgrade to Starter',
  },
  professional: {
    name: 'Professional',
    badge: '⭐',
    color: '#714B67',
    monthly: 2499,
    yearly: 24990,
    popular: true,
    features: { maxUsers: 25, hasPOS: false, hasAdvancedReports: true, hasWhatsApp: true, maxStorage: 5120 },
    highlights: ['25 Users', '5 GB Storage', 'Everything in Starter', 'WhatsApp Integration', 'Advanced Reports', 'Priority Support'],
    cta: 'Upgrade to Pro',
  },
  enterprise: {
    name: 'Enterprise',
    badge: '👑',
    color: '#e17055',
    monthly: 4999,
    yearly: 49990,
    features: { maxUsers: 100, hasPOS: true, hasAdvancedReports: true, hasWhatsApp: true, maxStorage: 20480 },
    highlights: ['100 Users', '20 GB Storage', 'Everything in Pro', 'POS Terminal Included', 'Custom Integrations', 'Dedicated Support'],
    cta: 'Upgrade to Enterprise',
  },
};

const AZV_ADDONS = {
  pos_addon: {
    name: 'POS Add-on',
    badge: '🏪',
    color: '#00A09D',
    monthly: 799,
    yearly: 7990,
    description: 'Add POS Terminal to any plan. Full Point-of-Sale with receipt printing, inventory & reports.',
    highlights: ['Touchscreen POS', 'Thermal Receipt Printing', 'Barcode Scanner Support', 'Daily Sales Reports', 'Inventory Management'],
    cta: 'Add POS Terminal',
  },
};

// ─── Plan Guard: Check if company has POS access ───────────────────────────
function azv_hasPOS() {
  const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
  const plan = company.plan || 'free';
  // Enterprise includes POS; otherwise check pos_addon
  if (plan === 'enterprise') return true;
  return company.hasPOS === true || company.features?.hasPOS === true;
}

function azv_getPlan() {
  const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
  return company.plan || 'free';
}

function azv_isPlanActive() {
  const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
  if (!company.planExpiry) return company.plan === 'free'; // free never expires
  return new Date(company.planExpiry) > new Date();
}

// ─── POS Lock: called before rendering any POS page ───────────────────────
function azv_checkPOSAccess() {
  if (azv_hasPOS()) return true;
  azv_showPOSLockedModal();
  return false;
}

function azv_showPOSLockedModal() {
  const html = `
  <div class="modal-header" style="background:linear-gradient(135deg,#00A09D,#714B67);color:#fff;border-radius:12px 12px 0 0;padding:20px 24px;">
    <h3 style="margin:0;font-size:18px;">🏪 POS Terminal — Premium Feature</h3>
    <button class="modal-close" onclick="closeModal()" style="color:#fff;font-size:22px;background:none;border:none;cursor:pointer;">&times;</button>
  </div>
  <div class="modal-body" style="padding:28px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:64px;margin-bottom:12px;">🔒</div>
      <h3 style="font-size:20px;color:var(--text-primary);margin-bottom:8px;">POS Terminal is Locked</h3>
      <p style="color:var(--text-secondary);font-size:14px;line-height:1.6;max-width:400px;margin:0 auto;">
        The Point of Sale system is a premium add-on. Upgrade to <strong>Enterprise</strong> or add the 
        <strong>POS Add-on</strong> to unlock the full POS Terminal with receipt printing, inventory and sales reports.
      </p>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <!-- POS Add-on Card -->
      <div style="border:2px solid #00A09D;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;" 
           onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,160,157,0.2)'"
           onmouseout="this.style.transform='none';this.style.boxShadow='none'">
        <div style="font-size:36px;margin-bottom:8px;">🏪</div>
        <div style="font-weight:700;font-size:15px;color:#00A09D;margin-bottom:4px;">POS Add-on</div>
        <div style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">₹799<span style="font-size:12px;font-weight:400;color:var(--text-muted)">/month</span></div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">or ₹7,990/year (save ₹1,598)</div>
        <ul style="text-align:left;font-size:12px;color:var(--text-secondary);list-style:none;padding:0;margin-bottom:16px;">
          <li style="padding:3px 0;">✅ Full POS Terminal</li>
          <li style="padding:3px 0;">✅ Receipt Printing</li>
          <li style="padding:3px 0;">✅ Sales Reports</li>
          <li style="padding:3px 0;">✅ Inventory Mgmt</li>
        </ul>
        <button onclick="closeModal();navigate('subscriptions');azv_initCheckout('pos_addon','monthly')" 
                style="width:100%;background:#00A09D;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer;">
          Add POS Add-on
        </button>
      </div>
      
      <!-- Enterprise Card -->
      <div style="border:2px solid #e17055;border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;"
           onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(225,112,85,0.2)'"
           onmouseout="this.style.transform='none';this.style.boxShadow='none'">
        <div style="font-size:36px;margin-bottom:8px;">👑</div>
        <div style="font-weight:700;font-size:15px;color:#e17055;margin-bottom:4px;">Enterprise</div>
        <div style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">₹4,999<span style="font-size:12px;font-weight:400;color:var(--text-muted)">/month</span></div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px;">or ₹49,990/year (save ₹9,998)</div>
        <ul style="text-align:left;font-size:12px;color:var(--text-secondary);list-style:none;padding:0;margin-bottom:16px;">
          <li style="padding:3px 0;">✅ POS Included</li>
          <li style="padding:3px 0;">✅ 100 Users</li>
          <li style="padding:3px 0;">✅ All Features</li>
          <li style="padding:3px 0;">✅ WhatsApp + AI</li>
        </ul>
        <button onclick="closeModal();navigate('subscriptions');azv_initCheckout('enterprise','monthly')"
                style="width:100%;background:#e17055;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer;">
          Upgrade to Enterprise
        </button>
      </div>
    </div>
    
    <div style="text-align:center;">
      <button onclick="closeModal();navigate('subscriptions')" 
              style="background:none;border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:8px 20px;font-size:13px;cursor:pointer;">
        View All Plans
      </button>
    </div>
  </div>`;
  
  if (typeof openModalRaw === 'function') openModalRaw(html);
}

// ─── renderSubscriptions — Main Plans Page ─────────────────────────────────
function renderSubscriptions() {
  const currentPlan = azv_getPlan();
  const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
  const planExpiry = company.planExpiry ? new Date(company.planExpiry) : null;
  const hasPOS = azv_hasPOS();

  let billingCycle = 'monthly'; // default toggle state

  const container = document.getElementById('subscriptionsContainer');
  if (!container) return;

  function renderContent() {
    const isYearly = billingCycle === 'yearly';

    container.innerHTML = `
    <style>
    .sub-page { padding: 24px; max-width: 1200px; }
    .sub-hero { background: linear-gradient(135deg, #714B67 0%, #00A09D 100%); border-radius: 20px; padding: 36px; margin-bottom: 32px; color: #fff; text-align: center; position: relative; overflow: hidden; }
    .sub-hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 250px; height: 250px; border-radius: 50%; background: rgba(255,255,255,.07); }
    .sub-hero::after { content: ''; position: absolute; bottom: -40px; left: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.05); }
    .sub-hero-title { font-size: 28px; font-weight: 900; margin-bottom: 8px; position: relative; z-index: 1; }
    .sub-hero-sub { font-size: 15px; opacity: .85; margin-bottom: 20px; position: relative; z-index: 1; }
    .billing-toggle { display: inline-flex; background: rgba(255,255,255,.15); border-radius: 50px; padding: 4px; position: relative; z-index: 1; }
    .billing-btn { padding: 8px 24px; border-radius: 50px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all .2s; }
    .billing-btn.active { background: #fff; color: #714B67; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .billing-btn.inactive { background: transparent; color: rgba(255,255,255,.8); }
    .yearly-badge { background: #00b894; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; font-weight: 700; }
    .current-plan-banner { background: var(--bg-card); border: 2px solid var(--primary); border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .plans-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
    @media (max-width: 1100px) { .plans-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .plans-grid { grid-template-columns: 1fr; } }
    .plan-card { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; position: relative; transition: all .25s; }
    .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,.12); }
    .plan-card.popular { border-color: #714B67; box-shadow: 0 4px 20px rgba(113,75,103,.15); }
    .plan-card.current { border-color: #00A09D; background: linear-gradient(135deg, rgba(0,160,157,.05), rgba(113,75,103,.05)); }
    .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #714B67, #00A09D); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 20px; white-space: nowrap; }
    .plan-name { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
    .plan-price { font-size: 32px; font-weight: 900; margin: 12px 0 4px; }
    .plan-price sup { font-size: 16px; font-weight: 600; vertical-align: super; }
    .plan-price-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 16px; }
    .plan-features { list-style: none; padding: 0; margin: 0 0 20px; }
    .plan-features li { font-size: 13px; color: var(--text-secondary); padding: 5px 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); }
    .plan-features li:last-child { border-bottom: none; }
    .plan-cta { width: 100%; padding: 11px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .2s; }
    .plan-cta:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
    .addons-section { margin-bottom: 32px; }
    .addons-section h2 { font-size: 20px; font-weight: 800; margin-bottom: 16px; color: var(--text-primary); }
    .addon-card { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
    .addon-card.active-addon { border-color: #00A09D; background: linear-gradient(135deg, rgba(0,160,157,.05), #fff); }
    .addon-icon { font-size: 48px; flex-shrink: 0; }
    .addon-info { flex: 1; min-width: 200px; }
    .addon-name { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
    .addon-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.5; }
    .addon-features { display: flex; flex-wrap: wrap; gap: 8px; }
    .addon-feature-tag { background: var(--primary-light); color: var(--primary); font-size: 11px; padding: 4px 10px; border-radius: 20px; font-weight: 600; }
    .addon-price-block { text-align: center; flex-shrink: 0; min-width: 160px; }
    .payment-history-section h2 { font-size: 20px; font-weight: 800; margin-bottom: 16px; color: var(--text-primary); }
    .guarantee-strip { background: linear-gradient(135deg, #00b894, #00A09D); color: #fff; border-radius: 12px; padding: 16px 24px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    </style>

    <div class="sub-page">
      <!-- Hero -->
      <div class="sub-hero">
        <div class="sub-hero-title">Choose Your Azolve Plan</div>
        <div class="sub-hero-sub">Scale your business with the right tools. Upgrade or downgrade anytime.</div>
        <div class="billing-toggle">
          <button class="billing-btn ${!isYearly ? 'active' : 'inactive'}" onclick="azv_setBilling('monthly')">Monthly</button>
          <button class="billing-btn ${isYearly ? 'active' : 'inactive'}" onclick="azv_setBilling('yearly')">
            Yearly <span class="yearly-badge">Save 17%</span>
          </button>
        </div>
      </div>

      <!-- Current Plan Banner -->
      <div class="current-plan-banner">
        <div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Current Plan</div>
          <div style="font-size:20px;font-weight:800;color:var(--text-primary);">
            ${AZV_PLANS[currentPlan]?.badge || ''} ${AZV_PLANS[currentPlan]?.name || 'Free'}
            ${hasPOS && currentPlan !== 'enterprise' ? '<span style="background:#00A09D;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:8px;">+ POS Add-on</span>' : ''}
          </div>
          ${planExpiry ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Valid until: ${planExpiry.toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>` : ''}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="azv_refreshPlanFromAPI()" style="background:none;border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">
            <i class="fas fa-sync"></i> Refresh Status
          </button>
          ${currentPlan !== 'free' ? `<button onclick="azv_viewPaymentHistory()" style="background:var(--primary-light);border:none;color:var(--primary);border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600;">
            <i class="fas fa-history"></i> Payment History
          </button>` : ''}
        </div>
      </div>

      <!-- Plans Grid -->
      <div class="plans-grid">
        ${Object.entries(AZV_PLANS).map(([key, plan]) => {
          const isCurrent = key === currentPlan;
          const price = isYearly ? plan.yearly : plan.monthly;
          const yearlyPerMonth = plan.yearly ? Math.round(plan.yearly / 12) : 0;
          return `
          <div class="plan-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}">
            ${plan.popular ? '<div class="popular-badge">⭐ Most Popular</div>' : ''}
            ${isCurrent ? '<div style="position:absolute;top:12px;right:12px;background:#00A09D;color:#fff;font-size:10px;padding:3px 10px;border-radius:10px;font-weight:700;">ACTIVE</div>' : ''}
            <div class="plan-name" style="color:${plan.color}">${plan.badge} ${plan.name}</div>
            <div class="plan-price">
              ${price === 0 ? '<span style="font-size:24px;">Free</span>' : `<sup>₹</sup>${isYearly ? yearlyPerMonth.toLocaleString('en-IN') : price.toLocaleString('en-IN')}`}
            </div>
            <div class="plan-price-sub">
              ${price === 0 ? 'No credit card required' : isYearly ? `₹${plan.yearly.toLocaleString('en-IN')}/year billed annually` : 'per month, billed monthly'}
            </div>
            <ul class="plan-features">
              ${plan.highlights.map(h => `<li>✅ ${h}</li>`).join('')}
            </ul>
            <button class="plan-cta" 
              style="background:${isCurrent ? '#e9ecef' : plan.color};color:${isCurrent ? 'var(--text-muted)' : '#fff'};"
              ${isCurrent ? 'disabled' : `onclick="azv_initCheckout('${key}','${billingCycle}')"`}
              ${isCurrent ? 'style="cursor:not-allowed;"' : ''}>
              ${isCurrent ? '✓ Current Plan' : plan.cta}
            </button>
          </div>`;
        }).join('')}
      </div>

      <!-- POS Add-on -->
      <div class="addons-section">
        <h2>🧩 Add-ons</h2>
        <div class="addon-card ${hasPOS ? 'active-addon' : ''}">
          <div class="addon-icon">🏪</div>
          <div class="addon-info">
            <div class="addon-name" style="color:#00A09D;">POS Terminal Add-on</div>
            <div class="addon-desc">Add a full-featured Point of Sale system to any plan. Perfect for retail businesses that need invoicing + POS together.</div>
            <div class="addon-features">
              ${AZV_ADDONS.pos_addon.highlights.map(h => `<span class="addon-feature-tag">✅ ${h}</span>`).join('')}
            </div>
          </div>
          <div class="addon-price-block">
            <div style="font-size:28px;font-weight:900;color:#00A09D;">₹${isYearly ? Math.round(AZV_ADDONS.pos_addon.yearly/12).toLocaleString('en-IN') : AZV_ADDONS.pos_addon.monthly.toLocaleString('en-IN')}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">${isYearly ? `₹${AZV_ADDONS.pos_addon.yearly.toLocaleString('en-IN')}/year` : '/month'}</div>
            ${hasPOS ? 
              `<div style="background:#00b894;color:#fff;border-radius:8px;padding:10px 20px;font-weight:700;font-size:13px;">✅ Active</div>` :
              (currentPlan === 'enterprise' ? 
                `<div style="background:#e9ecef;color:var(--text-muted);border-radius:8px;padding:10px 20px;font-size:13px;">Included in Enterprise</div>` :
                `<button onclick="azv_initCheckout('pos_addon','${billingCycle}')" style="background:#00A09D;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-weight:700;font-size:13px;cursor:pointer;width:100%;transition:all .2s;" onmouseover="this.style.background='#008a87'" onmouseout="this.style.background='#00A09D'">
                  Add POS Add-on
                </button>`
              )
            }
          </div>
        </div>
      </div>

      <!-- Guarantee Strip -->
      <div class="guarantee-strip">
        <div style="font-size:28px;">🛡️</div>
        <div>
          <div style="font-weight:700;font-size:15px;">Secure Payments via Cashfree</div>
          <div style="font-size:13px;opacity:.85;">All transactions are encrypted and processed securely. Supports UPI, Net Banking, Credit/Debit Cards and Wallets.</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
          <img src="https://www.cashfree.com/images/cashfree-logo.svg" alt="Cashfree" style="height:28px;background:#fff;padding:4px 8px;border-radius:6px;" onerror="this.style.display='none'">
          <div style="font-size:11px;opacity:.7;">256-bit SSL Encryption</div>
        </div>
      </div>

      <!-- Payment History placeholder -->
      <div id="azv_payHistContainer"></div>
    </div>`;
  }

  renderContent();

  // expose billing toggle globally
  window.azv_setBilling = function(cycle) {
    billingCycle = cycle;
    renderContent();
    // Re-attach checkout button if was pre-selected
    if (window._azv_pendingCheckout) {
      azv_initCheckout(window._azv_pendingCheckout.plan, billingCycle);
      window._azv_pendingCheckout = null;
    }
  };
}

// ─── Checkout Flow ─────────────────────────────────────────────────────────

// ──── Server Wake-up Helper (Progressive Polling) ─────────────────────────────
// Pings the backend repeatedly until it responds (handles Render free-tier cold starts)
// maxWaitMs: total time to keep trying (default 120s)
// onProgress: optional callback(attempt, maxAttempts) for UI updates
async function azv_wakeUpServer(maxWaitMs = 120000, onProgress = null) {
  const PING_INTERVAL = 5000; // Try every 5 seconds
  const PING_TIMEOUT = 8000;  // 8s per ping attempt
  const maxAttempts = Math.ceil(maxWaitMs / PING_INTERVAL);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (onProgress) onProgress(attempt, maxAttempts);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
      const resp = await fetch(`${PAYMENT_API}/ping`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        console.log('Payment server awake after attempt ' + attempt);
        return true;
      }
    } catch (e) {
      // Expected: server is still waking up, will retry
      console.log('Wake-up ping ' + attempt + '/' + maxAttempts + ' - server not ready yet');
    }
    
    // Wait before next ping (except after last attempt)
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, PING_INTERVAL));
    }
  }
  
  console.warn('Server wake-up failed after all attempts');
  return false;
}

// Simple one-shot wake-up (for background pre-warming when subscriptions page loads)
async function azv_wakeUpServerSimple() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s for cold start
    const resp = await fetch(`${PAYMENT_API}/ping`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return resp.ok;
  } catch (e) {
    return false;
  }
}

// ──── Fetch with Retry (Enhanced) ────────────────────────────────────────────
// Retries fetch on network errors (handles cold starts, transient failures)
// maxRetries: number of retries after the first attempt (default 3)
// Per-attempt timeout: 60 seconds
// Progressive delay between retries: 5s, 8s, 11s...
async function azv_fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s per attempt
      const resp = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return resp; // Return even if !resp.ok - let caller handle HTTP errors
    } catch (err) {
      lastError = err;
      console.warn('Fetch attempt ' + (attempt + 1) + '/' + (maxRetries + 1) + ' failed:', err.message || err.name);
      if (attempt < maxRetries) {
        // Progressive delay: 5s, 8s, 11s...
        const delay = 5000 + (attempt * 3000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError;
}

// ──── Checkout Flow ──────────────────────────────────────────────────────────
async function azv_initCheckout(plan, cycle = 'monthly') {
  const token = localStorage.getItem('authToken');
  if (!token) {
    showToast('Please log in to upgrade your plan', 'error');
    return;
  }

  const planInfo = AZV_PLANS[plan] || AZV_ADDONS[plan];
  if (!planInfo) { showToast('Invalid plan selected', 'error'); return; }

  const amount = cycle === 'yearly' ? planInfo.yearly : planInfo.monthly;
  const planName = planInfo.name;

  // Pre-wake the server in the background when checkout modal opens
  azv_wakeUpServerSimple();

  // Show checkout confirmation modal
  const html = `
  <div class="modal-header">
    <h3>💳 Confirm Your Order</h3>
    <button class="modal-close" onclick="closeModal()">&times;</button>
  </div>
  <div class="modal-body" style="padding:24px;">
    <div style="background:linear-gradient(135deg,#714B67,#00A09D);border-radius:12px;padding:20px;color:#fff;margin-bottom:20px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">${planInfo.badge || '💳'}</div>
      <div style="font-size:20px;font-weight:800;">${planName}</div>
      <div style="font-size:13px;opacity:.85;margin-top:4px;">${cycle === 'yearly' ? 'Annual Billing' : 'Monthly Billing'}</div>
      <div style="font-size:36px;font-weight:900;margin:12px 0;">₹${amount.toLocaleString('en-IN')}</div>
      <div style="font-size:12px;opacity:.7;">${cycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}</div>
    </div>
    
    <div style="background:var(--bg-secondary);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text-primary);">What you get:</div>
      ${(planInfo.highlights || []).map(h => `<div style="font-size:13px;color:var(--text-secondary);padding:3px 0;">✅ ${h}</div>`).join('')}
    </div>

    <div style="display:flex;gap:8px;align-items:center;background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#856404;">
      <i class="fas fa-shield-alt" style="font-size:16px;"></i>
      <span>Secure payment via <strong>Cashfree</strong>. Supports UPI, Cards, Net Banking & Wallets.</span>
    </div>

    <div style="display:flex;gap:10px;">
      <button onclick="closeModal()" id="azv_cancelBtn" style="flex:1;background:none;border:1px solid var(--border);color:var(--text-secondary);border-radius:8px;padding:12px;font-size:14px;cursor:pointer;">Cancel</button>
      <button onclick="azv_proceedPayment('${plan}','${cycle}')" id="azv_payBtn" style="flex:2;background:linear-gradient(135deg,#714B67,#00A09D);color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">
        <i class="fas fa-lock"></i> Pay ₹${amount.toLocaleString('en-IN')} Securely
      </button>
    </div>
  </div>`;

  if (typeof openModalRaw === 'function') openModalRaw(html);
}

async function azv_proceedPayment(plan, cycle) {
  const btn = document.getElementById('azv_payBtn');
  const cancelBtn = document.getElementById('azv_cancelBtn');
  
  // Disable both buttons during processing
  if (btn) { btn.disabled = true; }
  if (cancelBtn) { cancelBtn.disabled = true; }

  try {
    // Step 1: Wake up the server with PROGRESSIVE POLLING
    // This will ping every 5s for up to 120s, with real-time status updates
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waking up server...'; }
    
    const awake = await azv_wakeUpServer(120000, (attempt, maxAttempts) => {
      if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waking server (' + attempt + '/' + maxAttempts + ')...';
      }
    });

    if (awake) {
      if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Server ready! Creating order...'; }
    } else {
      // Server didn't respond after ALL polling attempts
      // Try the actual request anyway as a last resort
      console.warn('Server wake-up polling exhausted, attempting create-order as last resort...');
      if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Retrying order creation...'; }
    }

    // Step 2: Create the order with retry logic (3 retries, 60s each)
    const token = localStorage.getItem('authToken');
    const resp = await azv_fetchWithRetry(`${PAYMENT_API}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ plan, billingCycle: cycle }),
    }, 3);

    const data = await resp.json();

    if (!data.success) {
      showToast(data.message || 'Payment error. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely'; }
      if (cancelBtn) { cancelBtn.disabled = false; }
      return;
    }

    // Store order info for post-payment verification
    localStorage.setItem('azv_pending_order', JSON.stringify({
      orderId: data.data.orderId,
      plan,
      cycle,
      amount: data.data.amount,
    }));

    // Load Cashfree JS SDK and open payment
    closeModal();
    azv_openCashfreeCheckout(data.data.sessionId, data.data.orderId, plan, cycle);

  } catch (err) {
    console.error('Payment error:', err);
    let userMessage = '';
    if (err.name === 'AbortError') {
      userMessage = 'The server is taking too long to wake up. This happens occasionally on our free tier. Please try again in 60 seconds \u2014 the server will be ready by then.';
    } else if (err.message && err.message.includes('Failed to fetch')) {
      userMessage = 'Could not connect to the payment server. Your internet may be down, or the server is restarting. Please check your connection and try again.';
    } else if (err.message && err.message.includes('NetworkError')) {
      userMessage = 'A network error occurred. Please check your internet connection and try again.';
    } else {
      userMessage = 'Something went wrong while connecting to the payment server. Please try again in a moment.';
    }
    showToast(userMessage, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely'; }
    if (cancelBtn) { cancelBtn.disabled = false; }
  }
}

function azv_openCashfreeCheckout(sessionId, orderId, plan, cycle) {
  // Show loading overlay
  const overlay = document.createElement('div');
  overlay.id = 'azv_payOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:32px;text-align:center;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <div style="font-size:48px;margin-bottom:16px;">💳</div>
      <div style="font-size:18px;font-weight:800;margin-bottom:8px;color:#1a1a2e;">Opening Payment Gateway</div>
      <div style="font-size:13px;color:#666;margin-bottom:20px;">Please complete your payment in the new window. Do not close this page.</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:#00A09D;font-size:14px;font-weight:600;">
        <i class="fas fa-spinner fa-spin"></i> Processing...
      </div>
      <div style="margin-top:16px;font-size:11px;color:#999;">Secured by Cashfree Payments</div>
    </div>`;
  document.body.appendChild(overlay);

  // Dynamically load Cashfree SDK
  if (!window.Cashfree) {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => azv_launchCashfree(sessionId, orderId, plan, cycle);
    script.onerror = () => {
      // Fallback: redirect to payment status page
      const ov = document.getElementById('azv_payOverlay');
      if (ov) ov.remove();
      window.location.href = `${window.location.origin}/payment-status.html?order_id=${orderId}&plan=${plan}&cycle=${cycle}`;
    };
    document.head.appendChild(script);
  } else {
    azv_launchCashfree(sessionId, orderId, plan, cycle);
  }
}

function azv_launchCashfree(sessionId, orderId, plan, cycle) {
  try {
    const cashfree = window.Cashfree({ mode: 'production' });
    cashfree.checkout({
      paymentSessionId: sessionId,
      returnUrl: `${window.location.origin}/payment-status.html?order_id=${orderId}&plan=${plan}&cycle=${cycle}`,
      redirectTarget: '_self',
    });
  } catch (e) {
    console.error('Cashfree SDK error:', e);
    // Remove overlay and redirect as fallback
    const ov = document.getElementById('azv_payOverlay');
    if (ov) ov.remove();
    window.location.href = `${window.location.origin}/payment-status.html?order_id=${orderId}&plan=${plan}&cycle=${cycle}`;
  }
}

// ──── Post-Payment Verification ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function azv_verifyPayment(orderId) {
  const token = localStorage.getItem('authToken');
  try {
    const resp = await azv_fetchWithRetry(`${PAYMENT_API}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ orderId }),
    }, 1);
    return await resp.json();
  } catch (e) {
    if (e.name === 'AbortError') {
      return { success: false, message: 'Server is waking up, please try again in 10 seconds.' };
    }
    return { success: false, message: 'Network error during verification. Please refresh the page.' };
  }
}

// ──── Refresh plan from API and update localStorage ──────────────────────────────────────────────────────────────────────────────────
async function azv_refreshPlanFromAPI() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    showToast('Refreshing plan status...', 'info');
    const resp = await azv_fetchWithRetry(`${PAYMENT_API}/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, 1);
    const data = await resp.json();
    if (data.success) {
      const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
      company.plan = data.data.plan;
      company.planExpiry = data.data.planExpiry;
      company.hasPOS = data.data.features?.hasPOS;
      company.features = data.data.features;
      localStorage.setItem('azolve_company', JSON.stringify(company));
      showToast('Plan status refreshed!', 'success');
      renderSubscriptions();
    }
  } catch (e) {
    showToast('Could not refresh plan status. Please try again.', 'error');
  }
}

// ──── Payment History ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function azv_viewPaymentHistory() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const resp = await azv_fetchWithRetry(`${PAYMENT_API}/history`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }, 1);
    const data = await resp.json();
    if (!data.success) { showToast('Could not load history', 'error'); return; }

    const payments = data.data;
    const html = `
    <div class="modal-header">
      <h3><i class="fas fa-history" style="color:var(--primary);margin-right:8px;"></i>Payment History</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="padding:0;">
      ${payments.length === 0 ? '<div style="padding:32px;text-align:center;color:var(--text-muted);">No payments yet</div>' :
        `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:var(--bg-secondary);">
            <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--text-secondary);">Order ID</th>
            <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--text-secondary);">Plan</th>
            <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--text-secondary);">Amount</th>
            <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--text-secondary);">Status</th>
            <th style="padding:12px 16px;text-align:left;font-weight:600;color:var(--text-secondary);">Date</th>
          </tr></thead>
          <tbody>
            ${payments.map(p => `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:12px 16px;font-family:monospace;font-size:11px;color:var(--text-muted);">${p.orderId}</td>
              <td style="padding:12px 16px;font-weight:600;">${(AZV_PLANS[p.plan] || AZV_ADDONS[p.plan])?.name || p.plan}</td>
              <td style="padding:12px 16px;font-weight:700;">₹${p.amount?.toLocaleString('en-IN')}</td>
              <td style="padding:12px 16px;">
                <span style="background:${p.status==='paid'?'#d4edda':p.status==='failed'?'#f8d7da':'#fff3cd'};
                             color:${p.status==='paid'?'#155724':p.status==='failed'?'#721c24':'#856404'};
                             padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;">
                  ${p.status.toUpperCase()}
                </span>
              </td>
              <td style="padding:12px 16px;color:var(--text-muted);font-size:12px;">
                ${new Date(p.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}
              </td>
            </tr>`).join('')}
          </tbody>
        </table></div>`
      }
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Close</button>
    </div>`;
    openModalRaw(html);
  } catch (e) {
    showToast('Error loading payment history', 'error');
  }
}

// ──── Check pending payment on page load ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
(function azv_checkPendingPayment() {
  const pending = JSON.parse(localStorage.getItem('azv_pending_order') || 'null');
  if (!pending) return;
  // Only verify if recent (within 1 hour)
  const token = localStorage.getItem('authToken');
  if (!token) return;
  // Auto-verify in background
  setTimeout(async () => {
    const result = await azv_verifyPayment(pending.orderId);
    if (result.success) {
      localStorage.removeItem('azv_pending_order');
      // Update company cache
      const company = JSON.parse(localStorage.getItem('azolve_company') || '{}');
      if (result.data) {
        company.plan = result.data.plan;
        company.planExpiry = result.data.planExpiry;
        company.features = result.data.features;
        company.hasPOS = result.data.features?.hasPOS;
        localStorage.setItem('azolve_company', JSON.stringify(company));
      }
    }
  }, 2000);
})();

// ──── Auto wake-up when subscriptions page loads ───────────────────────────
(function azv_autoWakeUp() {
  const container = document.getElementById('subscriptionsContainer');
  if (container) {
    // Page is likely the subscriptions page — wake up the server in background
    azv_wakeUpServerSimple().then(ok => {
      if (ok) console.log('✅ Payment server is awake');
      else console.warn('⚠️ Payment server wake-up ping failed (will retry on payment)');
    });
  }
})();

console.log('✅ Azolve Payments loaded');
