// Azolve SEO Suite — website SEO analyzer + social media caption optimizer.
// Reuses the same backend AI key already configured for the Co-Pilot (Gemini).
(function () {
    if (typeof document === 'undefined') return;

    const API_BASE = window.AZOLVE_API_BASE || (
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://azolve-api.onrender.com/api'
    );

    function getHeaders() {
        const token = localStorage.getItem('azolve_token') || localStorage.getItem('token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function toast(msg, isError) {
        let t = document.getElementById('seoToast');
        if (!t) { t = document.createElement('div'); t.id = 'seoToast'; t.className = 'seo-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'seo-toast show' + (isError ? ' err' : '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3000);
    }
    function scoreColor(score) {
        if (score >= 80) return '#22c55e';
        if (score >= 55) return '#eab308';
        return '#ef4444';
    }

    let clientsCache = null;

    function initSeoSuite() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;
        if (document.getElementById('page-seo-suite')) return;
        injectStyles();

        const section = document.createElement('div');
        section.className = 'page-section';
        section.id = 'page-seo-suite';
        section.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">SEO Suite</h1>
                    <p class="page-subtitle">Analyze a client's website and optimize social media captions — powered by ARIA</p>
                </div>
            </div>

            <div class="seo-tabs">
                <button class="seo-tab active" data-tab="website"><i class="fas fa-globe"></i> Website Analyzer</button>
                <button class="seo-tab" data-tab="social"><i class="fas fa-hashtag"></i> Social Post Optimizer</button>
            </div>

            <div class="seo-tab-panel" id="seoWebsitePanel"></div>
            <div class="seo-tab-panel" id="seoSocialPanel" style="display:none;"></div>
        `;
        pageContent.appendChild(section);

        section.querySelectorAll('.seo-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                section.querySelectorAll('.seo-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('seoWebsitePanel').style.display = tab.dataset.tab === 'website' ? '' : 'none';
                document.getElementById('seoSocialPanel').style.display = tab.dataset.tab === 'social' ? '' : 'none';
            });
        });

        renderWebsitePanel(document.getElementById('seoWebsitePanel'));
        renderSocialPanel(document.getElementById('seoSocialPanel'));
    }

    // ---------------------------------------------------------------
    // Website Analyzer
    // ---------------------------------------------------------------
    async function loadClients() {
        if (clientsCache) return clientsCache;
        try {
            const res = await fetch(`${API_BASE}/clients?limit=200`, { headers: getHeaders() });
            const data = await res.json();
            clientsCache = (data.success && data.data) ? data.data.filter(c => c.website) : [];
        } catch (e) {
            clientsCache = [];
        }
        return clientsCache;
    }

    function renderWebsitePanel(panel) {
        panel.innerHTML = `
            <div class="seo-card seo-input-card">
                <div class="seo-input-row">
                    <select id="seoClientSelect" class="seo-select">
                        <option value="">— Pick a client with a website on file —</option>
                    </select>
                    <div class="seo-or">or</div>
                    <input type="text" id="seoUrlInput" class="seo-url-input" placeholder="Paste any website URL, e.g. https://example.com">
                    <button class="btn btn-primary" id="seoAnalyzeBtn"><i class="fas fa-magnifying-glass-chart"></i> Analyze</button>
                </div>
            </div>
            <div id="seoWebsiteResults"></div>
        `;
        const select = panel.querySelector('#seoClientSelect');
        const urlInput = panel.querySelector('#seoUrlInput');
        loadClients().then(clients => {
            clients.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.website;
                opt.textContent = `${c.name} — ${c.website}`;
                select.appendChild(opt);
            });
        });
        select.addEventListener('change', () => { if (select.value) urlInput.value = select.value; });

        const runAnalysis = () => {
            const url = (urlInput.value || select.value || '').trim();
            if (!url) { toast('Enter a URL or pick a client first', true); return; }
            analyzeWebsite(url, panel.querySelector('#seoWebsiteResults'));
        };
        panel.querySelector('#seoAnalyzeBtn').addEventListener('click', runAnalysis);
        urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runAnalysis(); });
    }

    async function analyzeWebsite(url, resultsEl) {
        resultsEl.innerHTML = `<div class="seo-loading"><i class="fas fa-spinner fa-spin"></i> Fetching and analyzing ${escapeHtml(url)}…</div>`;
        try {
            const res = await fetch(`${API_BASE}/seo/analyze-website`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getHeaders() },
                body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (!data.success) {
                resultsEl.innerHTML = `<div class="seo-card seo-error"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(data.message || 'Something went wrong.')}</div>`;
                return;
            }
            renderWebsiteResults(resultsEl, data.data);
        } catch (err) {
            resultsEl.innerHTML = `<div class="seo-card seo-error"><i class="fas fa-triangle-exclamation"></i> Connection error — couldn't reach the server.</div>`;
        }
    }

    function renderWebsiteResults(el, d) {
        const color = scoreColor(d.score);
        el.innerHTML = `
            <div class="seo-card seo-score-card">
                <div class="seo-gauge" style="--seo-score:${d.score};--seo-color:${color}">
                    <div class="seo-gauge-inner"><span>${d.score}</span><small>/ 100</small></div>
                </div>
                <div class="seo-score-info">
                    <div class="seo-score-title">SEO Score for <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener">${escapeHtml(d.url)}</a></div>
                    <div class="seo-score-sub">${d.aiSummary ? escapeHtml(d.aiSummary) : `${d.checklist.filter(c => c.pass).length} of ${d.checklist.length} checks passed.`}</div>
                    ${!d.aiAvailable ? '<div class="seo-ai-note">AI-written suggestions need a GEMINI_API_KEY in backend/.env — showing rule-based checklist only.</div>' : ''}
                </div>
            </div>

            ${d.aiSuggestions && d.aiSuggestions.topFixes && d.aiSuggestions.topFixes.length ? `
            <div class="seo-card">
                <h3><i class="fas fa-list-check"></i> Top fixes, in priority order</h3>
                <ol class="seo-fix-list">
                    ${d.aiSuggestions.topFixes.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                </ol>
            </div>` : ''}

            ${d.aiSuggestions && d.aiSuggestions.rewrites && d.aiSuggestions.rewrites.length ? `
            <div class="seo-card">
                <h3><i class="fas fa-pen"></i> Suggested rewrites</h3>
                ${d.aiSuggestions.rewrites.map(r => `
                    <div class="seo-rewrite-row">
                        <span class="seo-rewrite-tag">${r.type === 'title' ? 'Title' : 'Meta description'}</span>
                        <span class="seo-rewrite-text">${escapeHtml(r.suggestion)}</span>
                        <button class="seo-copy-btn" data-copy="${escapeHtml(r.suggestion)}"><i class="fas fa-copy"></i></button>
                    </div>`).join('')}
            </div>` : ''}

            <div class="seo-card">
                <h3><i class="fas fa-clipboard-check"></i> Full checklist</h3>
                <div class="seo-checklist">
                    ${d.checklist.map(c => `
                        <div class="seo-check-row ${c.pass ? 'pass' : 'fail'}">
                            <i class="fas ${c.pass ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                            <div>
                                <div class="seo-check-label">${escapeHtml(c.label)}</div>
                                <div class="seo-check-detail">${escapeHtml(c.detail)}</div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>

            <div class="seo-card">
                <h3><i class="fas fa-key"></i> Top keywords found on the page</h3>
                <div class="seo-keyword-grid">
                    ${d.topKeywords.map(k => `<div class="seo-keyword-chip">${escapeHtml(k.word)} <span>${k.count}× · ${k.density}%</span></div>`).join('') || '<p class="seo-empty">Not enough text content to analyze.</p>'}
                </div>
            </div>
        `;
        el.querySelectorAll('.seo-copy-btn').forEach(btn => btn.addEventListener('click', () => {
            navigator.clipboard?.writeText(btn.dataset.copy).then(() => {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => { btn.innerHTML = original; }, 1200);
            }).catch(() => {});
        }));
    }

    // ---------------------------------------------------------------
    // Social Post Optimizer
    // ---------------------------------------------------------------
    function renderSocialPanel(panel) {
        panel.innerHTML = `
            <div class="seo-card seo-input-card">
                <div class="seo-social-input-grid">
                    <select id="seoPlatformSelect" class="seo-select">
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="twitter">X / Twitter</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="youtube">YouTube</option>
                    </select>
                    <input type="text" id="seoTopicInput" class="seo-url-input" placeholder="Topic or goal (optional) — e.g. 'promote our Diwali sale'">
                </div>
                <textarea id="seoCaptionInput" class="seo-caption-input" rows="5" placeholder="Paste your caption/post text here..."></textarea>
                <div class="seo-caption-footer">
                    <span id="seoCharCount" class="seo-char-count">0 characters</span>
                    <button class="btn btn-primary" id="seoOptimizeBtn"><i class="fas fa-wand-magic-sparkles"></i> Optimize</button>
                </div>
            </div>
            <div id="seoSocialResults"></div>
        `;
        const captionInput = panel.querySelector('#seoCaptionInput');
        const charCount = panel.querySelector('#seoCharCount');
        captionInput.addEventListener('input', () => { charCount.textContent = `${captionInput.value.length} characters`; });

        panel.querySelector('#seoOptimizeBtn').addEventListener('click', () => {
            const caption = captionInput.value.trim();
            const platform = panel.querySelector('#seoPlatformSelect').value;
            const topic = panel.querySelector('#seoTopicInput').value.trim();
            if (!caption) { toast('Paste a caption first', true); return; }
            optimizeSocial({ platform, caption, topic }, panel.querySelector('#seoSocialResults'));
        });
    }

    async function optimizeSocial(payload, resultsEl) {
        resultsEl.innerHTML = `<div class="seo-loading"><i class="fas fa-spinner fa-spin"></i> Optimizing your caption…</div>`;
        try {
            const res = await fetch(`${API_BASE}/seo/optimize-social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getHeaders() },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) {
                resultsEl.innerHTML = `<div class="seo-card seo-error"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(data.message || 'Something went wrong.')}</div>`;
                return;
            }
            renderSocialResults(resultsEl, data.data);
        } catch (err) {
            resultsEl.innerHTML = `<div class="seo-card seo-error"><i class="fas fa-triangle-exclamation"></i> Connection error — couldn't reach the server.</div>`;
        }
    }

    function renderSocialResults(el, d) {
        const color = scoreColor(d.score);
        el.innerHTML = `
            <div class="seo-card seo-score-card">
                <div class="seo-gauge" style="--seo-score:${d.score};--seo-color:${color}">
                    <div class="seo-gauge-inner"><span>${d.score}</span><small>/ 100</small></div>
                </div>
                <div class="seo-score-info">
                    <div class="seo-score-title">${escapeHtml(d.platform)} optimization score</div>
                    <div class="seo-score-sub">${d.aiSummary ? escapeHtml(d.aiSummary) : `${d.checklist.filter(c => c.pass).length} of ${d.checklist.length} checks passed.`}</div>
                    ${!d.aiAvailable ? '<div class="seo-ai-note">AI-written suggestions need a GEMINI_API_KEY in backend/.env — showing rule-based checklist only.</div>' : ''}
                </div>
            </div>

            ${d.improvedCaption ? `
            <div class="seo-card">
                <h3><i class="fas fa-sparkles"></i> Suggested rewrite</h3>
                <div class="seo-improved-caption">${escapeHtml(d.improvedCaption).replace(/\n/g, '<br>')}</div>
                <button class="btn btn-outline btn-sm seo-copy-full" data-copy="${escapeHtml(d.improvedCaption)}"><i class="fas fa-copy"></i> Copy this caption</button>
            </div>` : ''}

            ${d.suggestedHashtags && d.suggestedHashtags.length ? `
            <div class="seo-card">
                <h3><i class="fas fa-hashtag"></i> Suggested hashtags</h3>
                <div class="seo-keyword-grid">
                    ${d.suggestedHashtags.map(h => `<div class="seo-keyword-chip seo-hashtag-chip">${escapeHtml(h.startsWith('#') ? h : '#' + h)}</div>`).join('')}
                </div>
                <button class="btn btn-outline btn-sm seo-copy-full" style="margin-top:10px;" data-copy="${escapeHtml(d.suggestedHashtags.map(h => h.startsWith('#') ? h : '#' + h).join(' '))}"><i class="fas fa-copy"></i> Copy all hashtags</button>
            </div>` : ''}

            ${d.tips && d.tips.length ? `
            <div class="seo-card">
                <h3><i class="fas fa-lightbulb"></i> Tips</h3>
                <ul class="seo-fix-list">${d.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
            </div>` : ''}

            <div class="seo-card">
                <h3><i class="fas fa-clipboard-check"></i> Checklist</h3>
                <div class="seo-checklist">
                    ${d.checklist.map(c => `
                        <div class="seo-check-row ${c.pass ? 'pass' : 'fail'}">
                            <i class="fas ${c.pass ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                            <div>
                                <div class="seo-check-label">${escapeHtml(c.label)}</div>
                                <div class="seo-check-detail">${escapeHtml(c.detail)}</div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>
        `;
        el.querySelectorAll('.seo-copy-full').forEach(btn => btn.addEventListener('click', () => {
            navigator.clipboard?.writeText(btn.dataset.copy).then(() => toast('Copied to clipboard')).catch(() => {});
        }));
    }

    // ---------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('seoStyles')) return;
        const style = document.createElement('style');
        style.id = 'seoStyles';
        style.textContent = `
        .seo-tabs{display:flex;gap:8px;margin:20px 0 18px;border-bottom:1px solid #eee;}
        .seo-tab{background:none;border:none;padding:12px 18px;font-size:14px;font-weight:600;color:#888;cursor:pointer;border-bottom:2px solid transparent;display:flex;align-items:center;gap:8px;}
        .seo-tab:hover{color:#714B67;}
        .seo-tab.active{color:#714B67;border-bottom-color:#714B67;}

        .seo-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .seo-card h3{margin:0 0 12px;font-size:15px;color:#1a1a1a;display:flex;align-items:center;gap:8px;}
        .seo-card h3 i{color:#714B67;}

        .seo-input-card{display:flex;flex-direction:column;gap:12px;}
        .seo-input-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
        .seo-select{padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;min-width:220px;background:#fff;}
        .seo-or{color:#999;font-size:12px;}
        .seo-url-input{flex:1;min-width:220px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;}
        .seo-social-input-grid{display:flex;gap:10px;margin-bottom:4px;flex-wrap:wrap;}
        .seo-social-input-grid .seo-select{min-width:160px;}
        .seo-social-input-grid .seo-url-input{flex:1;min-width:220px;}
        .seo-caption-input{width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;resize:vertical;}
        .seo-caption-footer{display:flex;justify-content:space-between;align-items:center;}
        .seo-char-count{font-size:12px;color:#999;}

        .seo-loading{padding:40px;text-align:center;color:#888;font-size:14px;}
        .seo-error{color:#c0392b;display:flex;align-items:center;gap:10px;}

        .seo-score-card{display:flex;align-items:center;gap:24px;}
        .seo-gauge{position:relative;width:100px;height:100px;border-radius:50%;flex:none;background:conic-gradient(var(--seo-color) calc(var(--seo-score)*1%), #eee 0);display:flex;align-items:center;justify-content:center;}
        .seo-gauge-inner{width:76px;height:76px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .seo-gauge-inner span{font-size:24px;font-weight:800;color:#1a1a1a;line-height:1;}
        .seo-gauge-inner small{font-size:10px;color:#999;}
        .seo-score-title{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:6px;}
        .seo-score-title a{color:#714B67;text-decoration:none;}
        .seo-score-title a:hover{text-decoration:underline;}
        .seo-score-sub{font-size:13px;color:#555;line-height:1.5;}
        .seo-ai-note{margin-top:8px;font-size:11.5px;color:#b8860b;background:#fff8e6;padding:6px 10px;border-radius:6px;display:inline-block;}

        .seo-fix-list{margin:0;padding-left:20px;}
        .seo-fix-list li{margin:6px 0;font-size:13.5px;color:#333;line-height:1.5;}

        .seo-rewrite-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f2f2f2;}
        .seo-rewrite-row:last-child{border-bottom:none;}
        .seo-rewrite-tag{flex:none;font-size:11px;font-weight:700;color:#714B67;background:#f0ecfa;padding:4px 8px;border-radius:6px;text-transform:uppercase;}
        .seo-rewrite-text{flex:1;font-size:13.5px;color:#333;}
        .seo-copy-btn{flex:none;border:1px solid #ddd;background:#fff;border-radius:6px;width:30px;height:30px;cursor:pointer;color:#714B67;}
        .seo-copy-btn:hover{background:#f4f2f5;}

        .seo-checklist{display:flex;flex-direction:column;gap:2px;}
        .seo-check-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5;}
        .seo-check-row:last-child{border-bottom:none;}
        .seo-check-row.pass i{color:#22c55e;}
        .seo-check-row.fail i{color:#ef4444;}
        .seo-check-row i{margin-top:2px;flex:none;}
        .seo-check-label{font-size:13.5px;font-weight:600;color:#1a1a1a;}
        .seo-check-detail{font-size:12px;color:#888;margin-top:2px;}

        .seo-keyword-grid{display:flex;flex-wrap:wrap;gap:8px;}
        .seo-keyword-chip{background:#f4f2f5;border-radius:20px;padding:6px 12px;font-size:12.5px;color:#333;}
        .seo-keyword-chip span{color:#999;font-size:11px;margin-left:4px;}
        .seo-hashtag-chip{background:#e8f7f6;color:#00A09D;font-weight:600;}
        .seo-empty{color:#999;font-size:13px;}

        .seo-improved-caption{background:#faf9fb;border:1px solid #eee;border-radius:8px;padding:14px;font-size:14px;line-height:1.6;color:#1a1a1a;margin-bottom:10px;}

        .seo-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:99999;}
        .seo-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
        .seo-toast.err{background:#c0392b;}

        @media (max-width:700px){
            .seo-score-card{flex-direction:column;text-align:center;}
            .seo-input-row{flex-direction:column;align-items:stretch;}
        }
        `;
        document.head.appendChild(style);
    }

    initSeoSuite();
})();
