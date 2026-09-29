// Azolve Canva Studio — real Canva integration (Canva Connect API)
// Replaces the old fake "Design Studio" clone. Every action here talks to
// the real Canva account the user connects (OAuth), via backend/routes/canva.js.
(function () {
    if (typeof document === 'undefined') return;

    // ---------------------------------------------------------------
    // API helper (mirrors the pattern used by office-common.js)
    // ---------------------------------------------------------------
    function getToken() {
        return localStorage.getItem('authToken')
            || localStorage.getItem('azolve_token')
            || localStorage.getItem('token')
            || '';
    }

    const API_BASE = window.AZOLVE_API_BASE || (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://azolve-api.onrender.com/api'
    );

    async function apiFetch(path, opts = {}) {
        const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
        const tok = getToken();
        if (tok) headers.Authorization = 'Bearer ' + tok;
        const r = await fetch(API_BASE + path, { ...opts, headers });
        let data;
        try { data = await r.json(); } catch { data = {}; }
        if (!r.ok) {
            const e = new Error(data.message || `Request failed (${r.status})`);
            e.code = data.code;
            e.status = r.status;
            throw e;
        }
        return data;
    }

    async function apiUpload(path, file) {
        const tok = getToken();
        const form = new FormData();
        form.append('file', file);
        const r = await fetch(API_BASE + path, {
            method: 'POST',
            headers: tok ? { Authorization: 'Bearer ' + tok } : {},
            body: form,
        });
        let data;
        try { data = await r.json(); } catch { data = {}; }
        if (!r.ok) throw new Error(data.message || `Upload failed (${r.status})`);
        return data;
    }

    window.CanvaAPI = {
        status: () => apiFetch('/canva/status'),
        disconnect: () => apiFetch('/canva/disconnect', { method: 'POST' }),
        listDesigns: (query = '', continuation = '') => {
            const qs = new URLSearchParams();
            if (query) qs.set('query', query);
            if (continuation) qs.set('continuation', continuation);
            return apiFetch('/canva/designs?' + qs.toString());
        },
        createDesign: (payload) => apiFetch('/canva/designs', { method: 'POST', body: JSON.stringify(payload) }),
        getDesign: (id) => apiFetch('/canva/designs/' + id),
        createExport: (id, payload) => apiFetch(`/canva/designs/${id}/export`, { method: 'POST', body: JSON.stringify(payload) }),
        getExportJob: (jobId) => apiFetch('/canva/exports/' + jobId),
        uploadAsset: (file) => apiUpload('/canva/assets/upload', file),
        getUploadJob: (jobId) => apiFetch('/canva/assets/upload/' + jobId),
    };

    // ---------------------------------------------------------------
    // Design presets
    // Canva's Create Design API only accepts 4 named presets. Everything
    // else (social sizes, posters, etc.) is a pixel width/height — that's
    // how Canva's own API works, there's no "instagram_post" preset name.
    // ---------------------------------------------------------------
    const PRESETS = [
        { key: 'doc', label: 'Canva Doc', iconClass: 'fas fa-file-alt', kind: 'preset', name: 'doc' },
        { key: 'presentation', label: 'Presentation', iconClass: 'fas fa-desktop', kind: 'preset', name: 'presentation' },
        { key: 'whiteboard', label: 'Whiteboard', iconClass: 'fas fa-chalkboard', kind: 'preset', name: 'whiteboard' },
        { key: 'email', label: 'Email', iconClass: 'fas fa-envelope', kind: 'preset', name: 'email' },
        { key: 'ig_post', label: 'Instagram Post', iconClass: 'fab fa-instagram', kind: 'custom', width: 1080, height: 1080 },
        { key: 'ig_story', label: 'Instagram Story', iconClass: 'fab fa-instagram', kind: 'custom', width: 1080, height: 1920 },
        { key: 'fb_post', label: 'Facebook Post', iconClass: 'fab fa-facebook', kind: 'custom', width: 1200, height: 630 },
        { key: 'yt_thumb', label: 'YouTube Thumbnail', iconClass: 'fab fa-youtube', kind: 'custom', width: 1280, height: 720 },
        { key: 'poster', label: 'Poster (A3)', iconClass: 'fas fa-image', kind: 'custom', width: 1587, height: 2245 },
        { key: 'custom', label: 'Custom size…', iconClass: 'fas fa-ruler-combined', kind: 'ask' },
    ];

    const EXPORT_FORMATS = [
        { key: 'pdf', label: 'PDF' },
        { key: 'png', label: 'PNG' },
        { key: 'jpg', label: 'JPG' },
        { key: 'pptx', label: 'PowerPoint' },
        { key: 'gif', label: 'GIF' },
        { key: 'mp4', label: 'MP4 (video designs)' },
    ];

    let state = {
        connected: null,   // null = unknown, true/false once checked
        profile: null,
        designs: [],
        continuation: '',
        loadingDesigns: false,
        query: '',
        openMenuId: null,
    };

    function initCanvaStudio() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;
        if (document.getElementById('page-canva-studio')) return;

        injectStyles();

        const section = document.createElement('div');
        section.className = 'page-section';
        section.id = 'page-canva-studio';
        section.innerHTML = `
            <div class="cs-wrap">
                <div class="cs-header">
                    <div>
                        <h2><i class="fas fa-palette"></i> Canva Studio</h2>
                        <p class="cs-sub">Create, edit, and export real Canva designs — right from Azolve.</p>
                    </div>
                    <div id="cs-header-actions" class="cs-header-actions"></div>
                </div>
                <div id="cs-body" class="cs-body">
                    <div class="cs-loading"><i class="fas fa-spinner fa-spin"></i> Loading Canva Studio…</div>
                </div>
            </div>
        `;
        pageContent.appendChild(section);

        refreshStatus();
    }

    // ---------------------------------------------------------------
    // Status / connect / disconnect
    // ---------------------------------------------------------------
    async function refreshStatus() {
        try {
            const res = await window.CanvaAPI.status();
            state.connected = !!res.connected;
            state.profile = res.connected ? res : null;
        } catch (err) {
            state.connected = false;
        }
        renderHeaderActions();
        if (state.connected) {
            renderConnectedShell();
            loadDesigns(true);
        } else {
            renderDisconnectedView();
        }
    }

    function renderHeaderActions() {
        const el = document.getElementById('cs-header-actions');
        if (!el) return;
        if (state.connected) {
            el.innerHTML = `
                <div class="cs-profile-chip">
                    <i class="fas fa-check-circle" style="color:#00b894"></i>
                    <span>${escapeHtml(state.profile?.displayName || 'Canva connected')}</span>
                </div>
                <button class="cs-btn cs-btn-ghost" id="cs-disconnect-btn"><i class="fas fa-unlink"></i> Disconnect</button>
            `;
            document.getElementById('cs-disconnect-btn').onclick = disconnectCanva;
        } else {
            el.innerHTML = '';
        }
    }

    function openOAuthPopup() {
        const token = getToken();
        if (!token) { toast('Please log in again.', 'error'); return; }
        const url = `${API_BASE}/canva/connect?token=${encodeURIComponent(token)}`;
        const w = window.open(url, 'canva_oauth', 'width=520,height=720,menubar=no,toolbar=no,location=no');
        if (!w) { toast('Popup blocked — please allow popups for this site.', 'error'); return; }

        let handled = false;
        function onMessage(ev) {
            if (!ev.data || ev.data.source !== 'azolve-canva') return;
            handled = true;
            window.removeEventListener('message', onMessage);
            if (ev.data.type === 'canva-connected') {
                toast('Canva connected!', 'success');
                refreshStatus();
            } else {
                toast(ev.data.message || 'Could not connect Canva.', 'error');
            }
        }
        window.addEventListener('message', onMessage);

        // Fallback: if the popup closes without posting a message, re-check status anyway.
        const poll = setInterval(() => {
            if (w.closed) {
                clearInterval(poll);
                window.removeEventListener('message', onMessage);
                if (!handled) refreshStatus();
            }
        }, 800);
    }

    async function disconnectCanva() {
        if (!confirm('Disconnect your Canva account from Azolve? You can reconnect any time.')) return;
        try {
            await window.CanvaAPI.disconnect();
            state.connected = false;
            state.designs = [];
            toast('Canva disconnected.', 'success');
            renderHeaderActions();
            renderDisconnectedView();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    // ---------------------------------------------------------------
    // Disconnected view
    // ---------------------------------------------------------------
    function renderDisconnectedView() {
        const body = document.getElementById('cs-body');
        if (!body) return;
        body.innerHTML = `
            <div class="cs-connect-card">
                <div class="cs-connect-icon"><i class="fas fa-palette"></i></div>
                <h3>Connect your Canva account</h3>
                <p>Link your real Canva account to create, edit, and export designs without leaving Azolve. Your login and designs stay in Canva — Azolve only gets permission to manage designs on your behalf.</p>
                <button class="cs-btn cs-btn-primary cs-btn-lg" id="cs-connect-btn"><i class="fas fa-link"></i> Connect to Canva</button>
                <ul class="cs-connect-list">
                    <li><i class="fas fa-check"></i> Create Instagram posts, presentations, docs, whiteboards &amp; more</li>
                    <li><i class="fas fa-check"></i> Edit designs in the real Canva editor</li>
                    <li><i class="fas fa-check"></i> Export to PDF, PNG, JPG, PPTX, GIF or MP4</li>
                    <li><i class="fas fa-check"></i> Upload your logo/photos as Canva assets</li>
                </ul>
            </div>
        `;
        document.getElementById('cs-connect-btn').onclick = openOAuthPopup;
    }

    // ---------------------------------------------------------------
    // Connected view — toolbar + grid
    // ---------------------------------------------------------------
    function renderConnectedShell() {
        const body = document.getElementById('cs-body');
        if (!body) return;
        body.innerHTML = `
            <div class="cs-toolbar">
                <div class="cs-new-wrap">
                    <button class="cs-btn cs-btn-primary" id="cs-new-btn"><i class="fas fa-plus"></i> New design</button>
                    <div class="cs-new-menu" id="cs-new-menu"></div>
                </div>
                <div class="cs-search">
                    <i class="fas fa-search"></i>
                    <input type="text" id="cs-search-input" placeholder="Search your Canva designs…" value="${escapeHtml(state.query)}">
                </div>
                <button class="cs-btn cs-btn-ghost" id="cs-upload-asset-btn"><i class="fas fa-upload"></i> Upload asset</button>
                <button class="cs-btn cs-btn-ghost" id="cs-refresh-btn"><i class="fas fa-rotate"></i></button>
                <input type="file" id="cs-asset-file-input" accept="image/*,video/*" style="display:none">
            </div>
            <div id="cs-grid" class="cs-grid"></div>
            <div id="cs-grid-footer" class="cs-grid-footer"></div>
        `;

        const newMenu = document.getElementById('cs-new-menu');
        newMenu.innerHTML = PRESETS.map(p => `
            <div class="cs-new-item" data-key="${p.key}"><i class="${p.iconClass}"></i> ${p.label}</div>
        `).join('');
        newMenu.querySelectorAll('.cs-new-item').forEach(item => {
            item.onclick = () => handlePresetClick(item.dataset.key);
        });

        document.getElementById('cs-new-btn').onclick = () => newMenu.classList.toggle('open');
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.cs-new-wrap')) newMenu.classList.remove('open');
        });

        document.getElementById('cs-refresh-btn').onclick = () => loadDesigns(true);
        document.getElementById('cs-upload-asset-btn').onclick = () => document.getElementById('cs-asset-file-input').click();
        document.getElementById('cs-asset-file-input').onchange = (e) => {
            if (e.target.files[0]) handleAssetUpload(e.target.files[0]);
            e.target.value = '';
        };

        let searchDebounce;
        document.getElementById('cs-search-input').oninput = (e) => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                state.query = e.target.value;
                loadDesigns(true);
            }, 400);
        };
    }

    async function handlePresetClick(key) {
        const preset = PRESETS.find(p => p.key === key);
        if (!preset) return;
        document.getElementById('cs-new-menu').classList.remove('open');

        let payload;
        if (preset.kind === 'preset') {
            payload = { presetType: preset.name };
        } else if (preset.kind === 'custom') {
            payload = { width: preset.width, height: preset.height };
        } else if (preset.kind === 'ask') {
            const w = prompt('Width in pixels (40–8000):', '1080');
            if (!w) return;
            const h = prompt('Height in pixels (40–8000):', '1080');
            if (!h) return;
            payload = { width: parseInt(w, 10), height: parseInt(h, 10) };
        }
        payload.title = `${preset.label} — ${new Date().toLocaleDateString()}`;

        toast('Creating your design…', 'info');
        try {
            const res = await window.CanvaAPI.createDesign(payload);
            toast('Design created — opening in Canva…', 'success');
            if (res.design?.urls?.edit_url) window.open(res.design.urls.edit_url, '_blank');
            loadDesigns(true);
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    async function handleAssetUpload(file) {
        toast(`Uploading ${file.name}…`, 'info');
        try {
            const { job } = await window.CanvaAPI.uploadAsset(file);
            const asset = await pollJob(job.id, (id) => window.CanvaAPI.getUploadJob(id));
            if (asset?.status === 'success' && asset.asset) {
                toast('Asset uploaded! Creating a design with it…', 'success');
                const res = await window.CanvaAPI.createDesign({ assetId: asset.asset.id, title: file.name });
                if (res.design?.urls?.edit_url) window.open(res.design.urls.edit_url, '_blank');
                loadDesigns(true);
            } else {
                toast(asset?.error?.message || 'Asset upload failed.', 'error');
            }
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    // Generic job poller: calls fetchFn(jobId) every 1.5s until status leaves in_progress.
    async function pollJob(jobId, fetchFn, maxTries = 30) {
        for (let i = 0; i < maxTries; i++) {
            const { job } = await fetchFn(jobId);
            if (job.status !== 'in_progress') return job;
            await new Promise(r => setTimeout(r, 1500));
        }
        throw new Error('Timed out waiting for Canva.');
    }

    async function loadDesigns(reset) {
        if (state.connected === false) return;
        if (reset) {
            state.designs = [];
            state.continuation = '';
        }
        state.loadingDesigns = true;
        renderGrid();
        try {
            const res = await window.CanvaAPI.listDesigns(state.query, reset ? '' : state.continuation);
            state.designs = reset ? (res.items || []) : state.designs.concat(res.items || []);
            state.continuation = res.continuation || '';
        } catch (err) {
            if (err.code === 'NOT_CONNECTED') {
                state.connected = false;
                renderDisconnectedView();
                return;
            }
            toast(err.message, 'error');
        }
        state.loadingDesigns = false;
        renderGrid();
    }

    function renderGrid() {
        const grid = document.getElementById('cs-grid');
        const footer = document.getElementById('cs-grid-footer');
        if (!grid) return;

        if (state.loadingDesigns && state.designs.length === 0) {
            grid.innerHTML = `<div class="cs-loading" style="grid-column:1/-1"><i class="fas fa-spinner fa-spin"></i> Loading your designs…</div>`;
            if (footer) footer.innerHTML = '';
            return;
        }

        if (state.designs.length === 0) {
            grid.innerHTML = `
                <div class="cs-empty" style="grid-column:1/-1">
                    <i class="fas fa-swatchbook"></i>
                    <p>No designs yet. Click <strong>New design</strong> above to create your first one in Canva.</p>
                </div>`;
            if (footer) footer.innerHTML = '';
            return;
        }

        grid.innerHTML = state.designs.map(cardHtml).join('');

        state.designs.forEach(d => {
            const card = grid.querySelector(`[data-design-id="${d.id}"]`);
            if (!card) return;
            card.querySelector('.cs-card-thumb')?.addEventListener('click', () => openEditor(d));
            card.querySelector('.cs-edit-btn')?.addEventListener('click', () => openEditor(d));
            card.querySelector('.cs-export-btn')?.addEventListener('click', (e) => toggleExportMenu(e, d));
            card.querySelectorAll('.cs-export-option').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    startExport(d, opt.dataset.format);
                });
            });
            card.querySelector('.cs-refresh-thumb-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                refreshSingleDesign(d.id);
            });
        });

        if (footer) {
            footer.innerHTML = state.continuation
                ? `<button class="cs-btn cs-btn-ghost" id="cs-load-more">Load more designs</button>`
                : '';
            const btn = document.getElementById('cs-load-more');
            if (btn) btn.onclick = () => loadDesigns(false);
        }
    }

    function cardHtml(d) {
        const thumb = d.thumbnail?.url;
        const updated = d.updated_at ? new Date(d.updated_at * 1000).toLocaleDateString() : '';
        const type = (d.design_types && d.design_types[0]) || 'design';
        return `
            <div class="cs-card" data-design-id="${d.id}">
                <div class="cs-card-thumb" style="${thumb ? `background-image:url('${thumb}')` : ''}">
                    ${thumb ? '' : '<i class="fas fa-file-image"></i>'}
                    <button class="cs-refresh-thumb-btn" title="Refresh thumbnail"><i class="fas fa-rotate"></i></button>
                </div>
                <div class="cs-card-body">
                    <div class="cs-card-title" title="${escapeHtml(d.title || 'Untitled design')}">${escapeHtml(d.title || 'Untitled design')}</div>
                    <div class="cs-card-meta"><span class="cs-tag">${escapeHtml(type)}</span> ${updated ? `· updated ${updated}` : ''}</div>
                </div>
                <div class="cs-card-actions">
                    <button class="cs-btn cs-btn-sm cs-btn-primary cs-edit-btn"><i class="fas fa-pen"></i> Edit in Canva</button>
                    <div class="cs-export-wrap">
                        <button class="cs-btn cs-btn-sm cs-btn-ghost cs-export-btn"><i class="fas fa-download"></i></button>
                        <div class="cs-export-menu">
                            ${EXPORT_FORMATS.map(f => `<div class="cs-export-option" data-format="${f.key}">${f.label}</div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="cs-export-status" style="display:none"></div>
            </div>
        `;
    }

    function openEditor(design) {
        if (design.urls?.edit_url) {
            window.open(design.urls.edit_url, '_blank');
        } else {
            toast('No edit link available — try refreshing.', 'error');
        }
    }

    function toggleExportMenu(e, design) {
        e.stopPropagation();
        const menu = e.currentTarget.parentElement.querySelector('.cs-export-menu');
        document.querySelectorAll('.cs-export-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
        menu.classList.toggle('open');
        const closeOnOutside = (ev) => {
            if (!ev.target.closest('.cs-export-wrap')) {
                menu.classList.remove('open');
                document.removeEventListener('click', closeOnOutside);
            }
        };
        setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
    }

    async function startExport(design, format) {
        const card = document.querySelector(`[data-design-id="${design.id}"]`);
        const statusEl = card?.querySelector('.cs-export-status');
        document.querySelectorAll('.cs-export-menu.open').forEach(m => m.classList.remove('open'));
        if (statusEl) { statusEl.style.display = 'block'; statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exporting as ${format.toUpperCase()}…`; }

        try {
            const { job } = await window.CanvaAPI.createExport(design.id, { format });
            const finished = await pollJob(job.id, (id) => window.CanvaAPI.getExportJob(id));
            if (finished.status === 'success' && finished.urls?.length) {
                if (statusEl) {
                    statusEl.innerHTML = finished.urls.map((u, i) =>
                        `<a href="${u}" target="_blank" rel="noopener" class="cs-download-link"><i class="fas fa-download"></i> Download ${finished.urls.length > 1 ? `page ${i + 1}` : format.toUpperCase()}</a>`
                    ).join(' ');
                }
                toast('Export ready!', 'success');
            } else {
                const msg = finished.error?.message || 'Export failed.';
                if (statusEl) statusEl.innerHTML = `<span class="cs-error-text"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(msg)}</span>`;
                toast(msg, 'error');
            }
        } catch (err) {
            if (statusEl) statusEl.innerHTML = `<span class="cs-error-text"><i class="fas fa-triangle-exclamation"></i> ${escapeHtml(err.message)}</span>`;
            toast(err.message, 'error');
        }
    }

    async function refreshSingleDesign(id) {
        try {
            const { design } = await window.CanvaAPI.getDesign(id);
            const idx = state.designs.findIndex(d => d.id === id);
            if (idx > -1) state.designs[idx] = design;
            renderGrid();
        } catch (err) {
            toast(err.message, 'error');
        }
    }

    // ---------------------------------------------------------------
    // Small utilities
    // ---------------------------------------------------------------
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function toast(message, type = 'info') {
        if (typeof window.showToast === 'function') { window.showToast(message, type); return; }
        let container = document.getElementById('cs-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'cs-toast-container';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        const colors = { success: '#00b894', error: '#d63031', info: '#0984e3' };
        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.2);max-width:320px;`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #page-canva-studio{ padding:24px; }
            #page-canva-studio .cs-wrap{ max-width:1400px; margin:0 auto; }
            #page-canva-studio .cs-header{ display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:20px; }
            #page-canva-studio .cs-header h2{ margin:0 0 4px; font-size:22px; color:var(--text-primary,#2d3436); display:flex; align-items:center; gap:10px; }
            #page-canva-studio .cs-header h2 i{ color:#8b3dff; }
            #page-canva-studio .cs-sub{ margin:0; color:var(--text-secondary,#636e72); font-size:14px; }
            #page-canva-studio .cs-header-actions{ display:flex; align-items:center; gap:10px; }
            #page-canva-studio .cs-profile-chip{ display:flex; align-items:center; gap:6px; background:#f0ecfa; color:#5b21b6; padding:6px 12px; border-radius:20px; font-size:13px; font-weight:600; }
            #page-canva-studio .cs-btn{ border:none; border-radius:var(--radius-sm,8px); padding:9px 16px; font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:var(--transition,all .2s); }
            #page-canva-studio .cs-btn-primary{ background:linear-gradient(135deg,#8b3dff,#6a1fd0); color:#fff; }
            #page-canva-studio .cs-btn-primary:hover{ opacity:.92; transform:translateY(-1px); }
            #page-canva-studio .cs-btn-ghost{ background:var(--bg-card,#fff); color:var(--text-primary,#2d3436); border:1px solid var(--border,#e9ecef); }
            #page-canva-studio .cs-btn-ghost:hover{ background:#f8f7fb; }
            #page-canva-studio .cs-btn-sm{ padding:6px 12px; font-size:12px; }
            #page-canva-studio .cs-btn-lg{ padding:13px 28px; font-size:15px; }

            #page-canva-studio .cs-connect-card{ max-width:520px; margin:60px auto; text-align:center; background:var(--bg-card,#fff); border:1px solid var(--border,#e9ecef); border-radius:var(--radius-lg,16px); padding:48px 36px; box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.08)); }
            #page-canva-studio .cs-connect-icon{ width:72px; height:72px; margin:0 auto 20px; border-radius:20px; background:linear-gradient(135deg,#8b3dff,#00c4cc); display:flex; align-items:center; justify-content:center; font-size:30px; color:#fff; }
            #page-canva-studio .cs-connect-card h3{ margin:0 0 10px; font-size:20px; color:var(--text-primary,#2d3436); }
            #page-canva-studio .cs-connect-card p{ color:var(--text-secondary,#636e72); font-size:14px; line-height:1.6; margin:0 0 24px; }
            #page-canva-studio .cs-connect-list{ list-style:none; padding:0; margin:24px 0 0; text-align:left; display:inline-block; }
            #page-canva-studio .cs-connect-list li{ padding:6px 0; font-size:13px; color:var(--text-secondary,#636e72); }
            #page-canva-studio .cs-connect-list i{ color:#00b894; margin-right:8px; }

            #page-canva-studio .cs-toolbar{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; position:relative; }
            #page-canva-studio .cs-new-wrap{ position:relative; }
            #page-canva-studio .cs-new-menu{ display:none; position:absolute; top:calc(100% + 6px); left:0; background:var(--bg-card,#fff); border:1px solid var(--border,#e9ecef); border-radius:var(--radius-md,10px); box-shadow:var(--shadow-lg,0 8px 30px rgba(0,0,0,.12)); min-width:220px; z-index:50; overflow:hidden; }
            #page-canva-studio .cs-new-menu.open{ display:block; }
            #page-canva-studio .cs-new-item{ padding:10px 16px; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:10px; color:var(--text-primary,#2d3436); }
            #page-canva-studio .cs-new-item:hover{ background:#f8f7fb; }
            #page-canva-studio .cs-new-item i{ width:16px; color:#8b3dff; }
            #page-canva-studio .cs-search{ flex:1; min-width:220px; display:flex; align-items:center; gap:8px; background:var(--bg-card,#fff); border:1px solid var(--border,#e9ecef); border-radius:var(--radius-sm,8px); padding:8px 14px; }
            #page-canva-studio .cs-search i{ color:var(--text-muted,#b2bec3); }
            #page-canva-studio .cs-search input{ border:none; outline:none; flex:1; font-size:13px; background:transparent; }

            #page-canva-studio .cs-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:18px; }
            #page-canva-studio .cs-card{ background:var(--bg-card,#fff); border:1px solid var(--border,#e9ecef); border-radius:var(--radius-md,10px); overflow:hidden; box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.08)); transition:var(--transition,all .2s); display:flex; flex-direction:column; }
            #page-canva-studio .cs-card:hover{ box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.1)); transform:translateY(-2px); }
            #page-canva-studio .cs-card-thumb{ height:150px; background-size:cover; background-position:center; background-color:#f3f0fa; display:flex; align-items:center; justify-content:center; color:#c4b5fd; font-size:32px; cursor:pointer; position:relative; }
            #page-canva-studio .cs-refresh-thumb-btn{ position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:50%; border:none; background:rgba(0,0,0,.45); color:#fff; cursor:pointer; opacity:0; transition:opacity .15s; }
            #page-canva-studio .cs-card-thumb:hover .cs-refresh-thumb-btn{ opacity:1; }
            #page-canva-studio .cs-card-body{ padding:12px 14px 4px; flex:1; }
            #page-canva-studio .cs-card-title{ font-size:13.5px; font-weight:600; color:var(--text-primary,#2d3436); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            #page-canva-studio .cs-card-meta{ font-size:11.5px; color:var(--text-muted,#b2bec3); margin-top:4px; text-transform:capitalize; }
            #page-canva-studio .cs-tag{ background:#f0ecfa; color:#7c3aed; padding:1px 8px; border-radius:10px; font-size:10.5px; font-weight:600; }
            #page-canva-studio .cs-card-actions{ display:flex; gap:8px; padding:10px 14px 14px; align-items:center; }
            #page-canva-studio .cs-export-wrap{ position:relative; }
            #page-canva-studio .cs-export-menu{ display:none; position:absolute; bottom:calc(100% + 6px); right:0; background:var(--bg-card,#fff); border:1px solid var(--border,#e9ecef); border-radius:var(--radius-sm,8px); box-shadow:var(--shadow-lg,0 8px 30px rgba(0,0,0,.12)); min-width:170px; z-index:40; overflow:hidden; }
            #page-canva-studio .cs-export-menu.open{ display:block; }
            #page-canva-studio .cs-export-option{ padding:8px 14px; font-size:12.5px; cursor:pointer; color:var(--text-primary,#2d3436); }
            #page-canva-studio .cs-export-option:hover{ background:#f8f7fb; }
            #page-canva-studio .cs-export-status{ padding:0 14px 12px; font-size:12px; }
            #page-canva-studio .cs-download-link{ color:#00b894; font-weight:600; text-decoration:none; margin-right:10px; }
            #page-canva-studio .cs-error-text{ color:#d63031; }

            #page-canva-studio .cs-grid-footer{ text-align:center; margin-top:20px; }
            #page-canva-studio .cs-loading, #page-canva-studio .cs-empty{ text-align:center; color:var(--text-secondary,#636e72); padding:60px 20px; font-size:14px; }
            #page-canva-studio .cs-empty i{ font-size:36px; color:#d3c8f5; display:block; margin-bottom:12px; }
        `;
        document.head.appendChild(style);
    }

    initCanvaStudio();
})();
