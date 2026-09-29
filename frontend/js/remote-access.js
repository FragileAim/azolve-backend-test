// Azolve Remote Access Suite — one-click launch into a client's AnyDesk /
// ConnectWise Control / TeamViewer session, with a mandatory reason and a
// full audit log of every access attempt.
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
        let t = document.getElementById('raToast');
        if (!t) { t = document.createElement('div'); t.id = 'raToast'; t.className = 'ra-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'ra-toast show' + (isError ? ' err' : '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3000);
    }
    function timeAgo(ts) {
        if (!ts) return '';
        const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    const TOOL_META = {
        anydesk: { label: 'AnyDesk', icon: 'fas fa-desktop', color: '#ef4b4b' },
        connectwise: { label: 'ConnectWise Control', icon: 'fas fa-satellite-dish', color: '#00539f' },
        teamviewer: { label: 'TeamViewer', icon: 'fas fa-tv', color: '#2266b3' },
        chrome_remote_desktop: { label: 'Chrome Remote Desktop', icon: 'fab fa-chrome', color: '#4285f4' },
        other: { label: 'Other', icon: 'fas fa-plug', color: '#714B67' },
    };

    function initRemoteAccess() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;
        if (document.getElementById('page-remote-access')) return;
        injectStyles();

        const section = document.createElement('div');
        section.className = 'page-section';
        section.id = 'page-remote-access';
        section.innerHTML = `
            <div class="page-header">
                <div>
                    <h1 class="page-title">Remote Access</h1>
                    <p class="page-subtitle">Launch into a client's AnyDesk, ConnectWise Control, or TeamViewer session — every access is logged</p>
                </div>
            </div>

            <div class="ra-stats" id="raStats"></div>

            <div class="ra-tabs">
                <button class="ra-tab active" data-tab="clients"><i class="fas fa-address-book"></i> Clients</button>
                <button class="ra-tab" data-tab="log"><i class="fas fa-clock-rotate-left"></i> Access Log</button>
            </div>

            <div class="ra-toolbar">
                <input type="text" id="raSearch" class="ra-search" placeholder="Search clients...">
            </div>

            <div id="raClientsPanel"></div>
            <div id="raLogPanel" style="display:none;"></div>
        `;
        pageContent.appendChild(section);

        section.querySelectorAll('.ra-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                section.querySelectorAll('.ra-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isClients = tab.dataset.tab === 'clients';
                document.getElementById('raClientsPanel').style.display = isClients ? '' : 'none';
                document.getElementById('raLogPanel').style.display = isClients ? 'none' : '';
                document.getElementById('raSearch').style.display = isClients ? '' : 'none';
                if (!isClients) loadLogs();
            });
        });

        section.querySelector('#raSearch').addEventListener('input', debounce(() => loadClients(), 300));

        loadStats();
        loadClients();
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    // ---------------------------------------------------------------
    // Stats
    // ---------------------------------------------------------------
    async function loadStats() {
        const el = document.getElementById('raStats');
        try {
            const res = await fetch(`${API_BASE}/remote-access/stats`, { headers: getHeaders() });
            const data = await res.json();
            if (!data.success) return;
            const s = data.data;
            el.innerHTML = `
                <div class="ra-stat-card"><div class="ra-stat-num">${s.configuredClients}</div><div class="ra-stat-label">Clients set up</div></div>
                <div class="ra-stat-card"><div class="ra-stat-num">${s.totalClients}</div><div class="ra-stat-label">Total active clients</div></div>
                <div class="ra-stat-card ${s.openSessions > 0 ? 'ra-stat-warn' : ''}"><div class="ra-stat-num">${s.openSessions}</div><div class="ra-stat-label">Open sessions</div></div>
                <div class="ra-stat-card"><div class="ra-stat-num">${s.sessionsThisMonth}</div><div class="ra-stat-label">Sessions this month</div></div>
            `;
        } catch (e) { /* stats are non-critical */ }
    }

    // ---------------------------------------------------------------
    // Clients panel
    // ---------------------------------------------------------------
    async function loadClients() {
        const panel = document.getElementById('raClientsPanel');
        panel.innerHTML = `<div class="ra-loading"><i class="fas fa-spinner fa-spin"></i> Loading clients…</div>`;
        const search = document.getElementById('raSearch').value.trim();
        try {
            const res = await fetch(`${API_BASE}/remote-access/profiles${search ? '?search=' + encodeURIComponent(search) : ''}`, { headers: getHeaders() });
            const data = await res.json();
            if (!data.success) { panel.innerHTML = `<div class="ra-empty">${escapeHtml(data.message || 'Could not load clients.')}</div>`; return; }
            renderClients(panel, data.data);
        } catch (e) {
            panel.innerHTML = `<div class="ra-empty">Connection error — couldn't reach the server.</div>`;
        }
    }

    function renderClients(panel, clients) {
        if (!clients.length) { panel.innerHTML = `<div class="ra-empty">No clients found.</div>`; return; }
        panel.innerHTML = `<div class="ra-client-grid">${clients.map(c => {
            const meta = c.tool ? TOOL_META[c.tool] : null;
            return `
            <div class="ra-client-card" data-id="${c.clientId}">
                <div class="ra-client-top">
                    <div class="ra-client-name">${escapeHtml(c.clientName)}</div>
                    ${meta ? `<span class="ra-tool-badge" style="background:${meta.color}22;color:${meta.color}"><i class="${meta.icon}"></i> ${meta.label}</span>` : '<span class="ra-tool-badge ra-tool-none">Not set up</span>'}
                </div>
                ${c.contactPerson ? `<div class="ra-client-sub">${escapeHtml(c.contactPerson)}${c.phone ? ' · ' + escapeHtml(c.phone) : ''}</div>` : ''}
                ${c.configured ? `<div class="ra-client-id"><i class="fas fa-fingerprint"></i> ${escapeHtml(c.identifier.length > 42 ? c.identifier.slice(0, 42) + '…' : c.identifier)}</div>` : ''}
                ${c.contactForAccess ? `<div class="ra-client-contact"><i class="fas fa-user-shield"></i> Access via: ${escapeHtml(c.contactForAccess)}</div>` : ''}
                <div class="ra-client-actions">
                    ${c.configured
                        ? `<button class="btn btn-primary btn-sm ra-connect-btn" data-id="${c.clientId}" data-name="${escapeHtml(c.clientName)}"><i class="fas fa-plug"></i> Connect</button>
                           <button class="btn btn-outline btn-sm ra-edit-btn" data-id="${c.clientId}"><i class="fas fa-pen"></i></button>`
                        : `<button class="btn btn-outline btn-sm ra-edit-btn" data-id="${c.clientId}"><i class="fas fa-plus"></i> Set up access</button>`}
                </div>
            </div>`;
        }).join('')}</div>`;

        panel.querySelectorAll('.ra-connect-btn').forEach(btn => btn.addEventListener('click', () => openConnectModal(btn.dataset.id, btn.dataset.name)));
        panel.querySelectorAll('.ra-edit-btn').forEach(btn => btn.addEventListener('click', () => openSetupModal(btn.closest('.ra-client-card').dataset.id, clients.find(c => c.clientId === btn.closest('.ra-client-card').dataset.id))));
    }

    // ---------------------------------------------------------------
    // Setup modal — save which tool + ID/link a client uses
    // ---------------------------------------------------------------
    function openSetupModal(clientId, existing) {
        document.getElementById('raModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'raModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:520px;">
                <div class="ra-modal-header">
                    <h3>Remote access setup — ${escapeHtml(existing?.clientName || '')}</h3>
                    <button class="btn-icon" id="raModalClose">&times;</button>
                </div>
                <div class="ra-modal-body">
                    <div class="ra-form-group">
                        <label>Tool</label>
                        <select id="raToolSelect">
                            ${Object.entries(TOOL_META).map(([k, m]) => `<option value="${k}" ${existing?.tool === k ? 'selected' : ''}>${m.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="ra-form-group">
                        <label id="raIdentifierLabel">Identifier</label>
                        <input type="text" id="raIdentifierInput" value="${escapeHtml(existing?.identifier || '')}" placeholder="e.g. 123 456 789">
                        <p class="ra-form-hint" id="raIdentifierHint"></p>
                    </div>
                    <div class="ra-form-group">
                        <label>Who to contact before connecting (optional)</label>
                        <input type="text" id="raContactInput" value="${escapeHtml(existing?.contactForAccess || '')}" placeholder="e.g. Ramesh, IT manager — call before connecting">
                    </div>
                    <div class="ra-form-group">
                        <label>Notes (optional)</label>
                        <textarea id="raNotesInput" rows="3" placeholder="Anything the tech should know before connecting">${escapeHtml(existing?.notes || '')}</textarea>
                    </div>
                </div>
                <div class="ra-modal-actions">
                    <button class="btn btn-primary" id="raSaveBtn"><i class="fas fa-save"></i> Save</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#raModalClose').addEventListener('click', () => modal.remove());

        const toolSelect = modal.querySelector('#raToolSelect');
        const hintEl = modal.querySelector('#raIdentifierHint');
        const identifierInput = modal.querySelector('#raIdentifierInput');
        const hints = {
            anydesk: 'The client\'s AnyDesk ID (found in their AnyDesk window, e.g. "123 456 789").',
            connectwise: 'Paste the full session/access URL from your ConnectWise Control instance.',
            teamviewer: 'The client\'s TeamViewer ID.',
            chrome_remote_desktop: 'Paste the support link, or the one-time support code (codes expire — you may need to update this each session).',
            other: 'A link, ID, or short instructions — whatever the tech needs to connect.',
        };
        const updateHint = () => { hintEl.textContent = hints[toolSelect.value] || ''; };
        toolSelect.addEventListener('change', updateHint);
        updateHint();

        modal.querySelector('#raSaveBtn').addEventListener('click', async () => {
            const tool = toolSelect.value;
            const identifier = identifierInput.value.trim();
            if (!identifier) { toast('Please enter an identifier', true); return; }
            const saveBtn = modal.querySelector('#raSaveBtn');
            saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try {
                const res = await fetch(`${API_BASE}/remote-access/profile/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getHeaders() },
                    body: JSON.stringify({
                        tool, identifier,
                        contactForAccess: modal.querySelector('#raContactInput').value.trim(),
                        notes: modal.querySelector('#raNotesInput').value.trim(),
                    }),
                });
                const data = await res.json();
                if (!data.success) { toast(data.message || 'Could not save', true); saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Save'; return; }
                toast('Remote access saved');
                modal.remove();
                loadClients(); loadStats();
            } catch (e) {
                toast('Connection error', true);
                saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }
        });
    }

    // ---------------------------------------------------------------
    // Connect modal — mandatory reason, then launch + log
    // ---------------------------------------------------------------
    function openConnectModal(clientId, clientName) {
        document.getElementById('raModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'raModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:460px;">
                <div class="ra-modal-header">
                    <h3><i class="fas fa-plug" style="color:#714B67;margin-right:8px;"></i>Connect to ${escapeHtml(clientName)}</h3>
                    <button class="btn-icon" id="raModalClose">&times;</button>
                </div>
                <div class="ra-modal-body">
                    <p class="ra-form-hint" style="margin-top:0;">This is logged to the access audit trail — every connection needs a reason.</p>
                    <div class="ra-form-group">
                        <label>Why are you connecting?</label>
                        <textarea id="raReasonInput" rows="3" placeholder="e.g. Investigating printer driver issue reported in ticket #245" autofocus></textarea>
                    </div>
                </div>
                <div class="ra-modal-actions">
                    <button class="btn btn-primary" id="raConnectGoBtn"><i class="fas fa-plug"></i> Connect now</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#raModalClose').addEventListener('click', () => modal.remove());
        modal.querySelector('#raReasonInput').focus();

        modal.querySelector('#raConnectGoBtn').addEventListener('click', async () => {
            const reason = modal.querySelector('#raReasonInput').value.trim();
            if (!reason) { toast('Please note why you\'re connecting', true); return; }
            const btn = modal.querySelector('#raConnectGoBtn');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            try {
                const res = await fetch(`${API_BASE}/remote-access/connect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getHeaders() },
                    body: JSON.stringify({ clientId, reason }),
                });
                const data = await res.json();
                if (!data.success) { toast(data.message || 'Could not connect', true); btn.disabled = false; btn.innerHTML = '<i class="fas fa-plug"></i> Connect now'; return; }
                modal.remove();
                handleConnectResult(data.data, clientName);
                loadStats();
            } catch (e) {
                toast('Connection error', true);
                btn.disabled = false; btn.innerHTML = '<i class="fas fa-plug"></i> Connect now';
            }
        });
    }

    function handleConnectResult(result, clientName) {
        if (result.contactForAccess) toast(`Reminder: contact ${result.contactForAccess} before connecting`, false);
        if (result.mode === 'protocol' || result.mode === 'link') {
            window.open(result.launchUrl, '_blank');
            toast(`Launching ${result.toolLabel} for ${clientName}`);
        } else {
            // 'manual' mode — we don't have a reliable deep link, show the value to copy
            showManualConnectInfo(result, clientName);
        }
    }

    function showManualConnectInfo(result, clientName) {
        document.getElementById('raModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'raModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:460px;">
                <div class="ra-modal-header">
                    <h3>Connect to ${escapeHtml(clientName)}</h3>
                    <button class="btn-icon" id="raModalClose">&times;</button>
                </div>
                <div class="ra-modal-body">
                    <p class="ra-form-hint" style="margin-top:0;">This tool doesn't support a one-click launch link — use the info below manually:</p>
                    <div class="ra-manual-box">${escapeHtml(result.manualValue || '')}</div>
                    <button class="btn btn-outline btn-sm" id="raManualCopyBtn" style="margin-top:10px;"><i class="fas fa-copy"></i> Copy</button>
                    ${result.launchUrl ? `<a href="${escapeHtml(result.launchUrl)}" target="_blank" class="btn btn-primary btn-sm" style="margin-top:10px;margin-left:8px;">Open ${escapeHtml(result.toolLabel)}</a>` : ''}
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#raModalClose').addEventListener('click', () => modal.remove());
        modal.querySelector('#raManualCopyBtn').addEventListener('click', () => {
            navigator.clipboard?.writeText(result.manualValue || '').then(() => toast('Copied')).catch(() => {});
        });
    }

    // ---------------------------------------------------------------
    // Access log panel
    // ---------------------------------------------------------------
    let logPage = 1;
    async function loadLogs(page) {
        logPage = page || 1;
        const panel = document.getElementById('raLogPanel');
        panel.innerHTML = `<div class="ra-loading"><i class="fas fa-spinner fa-spin"></i> Loading access log…</div>`;
        try {
            const res = await fetch(`${API_BASE}/remote-access/logs?page=${logPage}&limit=20`, { headers: getHeaders() });
            const data = await res.json();
            if (!data.success) { panel.innerHTML = `<div class="ra-empty">${escapeHtml(data.message || 'Could not load the log.')}</div>`; return; }
            renderLogs(panel, data);
        } catch (e) {
            panel.innerHTML = `<div class="ra-empty">Connection error — couldn't reach the server.</div>`;
        }
    }

    function renderLogs(panel, data) {
        const logs = data.data || [];
        if (!logs.length) { panel.innerHTML = `<div class="ra-empty">No access sessions logged yet.</div>`; return; }

        panel.innerHTML = `
            <div class="ra-log-table">
                <div class="ra-log-row ra-log-head">
                    <div>Client</div><div>Tool</div><div>By</div><div>Reason</div><div>When</div><div>Status</div><div></div>
                </div>
                ${logs.map(l => {
                    const meta = TOOL_META[l.tool] || TOOL_META.other;
                    return `
                    <div class="ra-log-row" data-id="${l._id}">
                        <div>${escapeHtml(l.client?.name || 'Unknown')}</div>
                        <div><span class="ra-tool-badge" style="background:${meta.color}22;color:${meta.color}"><i class="${meta.icon}"></i> ${meta.label}</span></div>
                        <div>${escapeHtml(l.initiatedBy?.name || l.initiatedBy?.email || 'Unknown')}</div>
                        <div class="ra-log-reason" title="${escapeHtml(l.reason)}">${escapeHtml(l.reason)}</div>
                        <div>${timeAgo(l.startedAt || l.createdAt)}</div>
                        <div><span class="ra-status-badge ${l.status}">${l.status === 'open' ? 'Open' : 'Completed'}</span></div>
                        <div>${l.status === 'open' ? `<button class="btn btn-outline btn-sm ra-end-btn" data-id="${l._id}">End session</button>` : ''}</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="ra-pagination">
                <button class="btn btn-outline btn-sm" id="raLogPrev" ${logPage <= 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                <span>Page ${logPage} of ${data.pages || 1}</span>
                <button class="btn btn-outline btn-sm" id="raLogNext" ${logPage >= (data.pages || 1) ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
            </div>
        `;
        panel.querySelector('#raLogPrev')?.addEventListener('click', () => loadLogs(logPage - 1));
        panel.querySelector('#raLogNext')?.addEventListener('click', () => loadLogs(logPage + 1));
        panel.querySelectorAll('.ra-end-btn').forEach(btn => btn.addEventListener('click', () => openEndSessionModal(btn.dataset.id)));
    }

    function openEndSessionModal(logId) {
        document.getElementById('raModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'raModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:460px;">
                <div class="ra-modal-header">
                    <h3>End session</h3>
                    <button class="btn-icon" id="raModalClose">&times;</button>
                </div>
                <div class="ra-modal-body">
                    <div class="ra-form-group">
                        <label>What was resolved? (optional)</label>
                        <textarea id="raResolutionInput" rows="3" placeholder="e.g. Reinstalled printer driver, issue resolved"></textarea>
                    </div>
                </div>
                <div class="ra-modal-actions">
                    <button class="btn btn-primary" id="raEndGoBtn"><i class="fas fa-check"></i> Mark completed</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#raModalClose').addEventListener('click', () => modal.remove());
        modal.querySelector('#raEndGoBtn').addEventListener('click', async () => {
            const resolutionNotes = modal.querySelector('#raResolutionInput').value.trim();
            try {
                const res = await fetch(`${API_BASE}/remote-access/log/${logId}/end`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', ...getHeaders() },
                    body: JSON.stringify({ resolutionNotes }),
                });
                const data = await res.json();
                if (!data.success) { toast(data.message || 'Could not end session', true); return; }
                toast('Session marked completed');
                modal.remove();
                loadLogs(logPage); loadStats();
            } catch (e) {
                toast('Connection error', true);
            }
        });
    }

    // ---------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('raStyles')) return;
        const style = document.createElement('style');
        style.id = 'raStyles';
        style.textContent = `
        .ra-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:20px 0;}
        .ra-stat-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;text-align:center;}
        .ra-stat-card.ra-stat-warn{border-color:#f5c6a5;background:#fff8f2;}
        .ra-stat-num{font-size:26px;font-weight:800;color:#1a1a1a;}
        .ra-stat-card.ra-stat-warn .ra-stat-num{color:#d97706;}
        .ra-stat-label{font-size:12px;color:#888;margin-top:2px;}

        .ra-tabs{display:flex;gap:8px;border-bottom:1px solid #eee;margin-bottom:14px;}
        .ra-tab{background:none;border:none;padding:12px 18px;font-size:14px;font-weight:600;color:#888;cursor:pointer;border-bottom:2px solid transparent;display:flex;align-items:center;gap:8px;}
        .ra-tab:hover{color:#714B67;}
        .ra-tab.active{color:#714B67;border-bottom-color:#714B67;}

        .ra-toolbar{margin-bottom:16px;}
        .ra-search{width:100%;max-width:320px;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;}

        .ra-loading,.ra-empty{padding:50px;text-align:center;color:#888;font-size:14px;}

        .ra-client-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
        .ra-client-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
        .ra-client-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;}
        .ra-client-name{font-weight:700;font-size:15px;color:#1a1a1a;}
        .ra-client-sub{font-size:12.5px;color:#888;margin-bottom:8px;}
        .ra-tool-badge{font-size:11px;font-weight:700;padding:4px 9px;border-radius:20px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;}
        .ra-tool-badge.ra-tool-none{background:#f4f2f5;color:#999;}
        .ra-client-id{font-size:12px;color:#555;background:#faf9fb;border-radius:6px;padding:6px 9px;margin:8px 0 4px;display:flex;align-items:center;gap:6px;font-family:monospace;}
        .ra-client-contact{font-size:11.5px;color:#b8860b;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
        .ra-client-actions{display:flex;gap:8px;margin-top:10px;}

        .ra-modal-header{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid #eee;}
        .ra-modal-header h3{margin:0;font-size:16px;}
        .ra-modal-header .btn-icon{background:none;border:none;font-size:18px;cursor:pointer;color:#888;}
        .ra-modal-body{padding:20px 22px;}
        .ra-modal-actions{display:flex;justify-content:flex-end;padding:16px 22px;border-top:1px solid #f2f2f2;}
        .ra-form-group{margin-bottom:16px;}
        .ra-form-group label{display:block;font-size:12.5px;font-weight:600;color:#555;margin-bottom:6px;}
        .ra-form-group input,.ra-form-group select,.ra-form-group textarea{width:100%;padding:9px 11px;border:1px solid #ddd;border-radius:8px;font-size:13.5px;box-sizing:border-box;font-family:inherit;}
        .ra-form-hint{font-size:11.5px;color:#999;margin:4px 0 0;line-height:1.4;}
        .ra-manual-box{background:#faf9fb;border:1px solid #eee;border-radius:8px;padding:12px;font-family:monospace;font-size:13px;word-break:break-all;}

        .ra-log-table{background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden;}
        .ra-log-row{display:grid;grid-template-columns:1.2fr 1.3fr 1fr 1.6fr 0.8fr 0.9fr 1fr;gap:10px;padding:12px 16px;align-items:center;border-bottom:1px solid #f5f5f5;font-size:13px;}
        .ra-log-row:last-child{border-bottom:none;}
        .ra-log-head{background:#faf9fb;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:.03em;}
        .ra-log-reason{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#555;}
        .ra-status-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;}
        .ra-status-badge.open{background:#fff4e5;color:#d97706;}
        .ra-status-badge.completed{background:#e8f9ee;color:#22a35a;}
        .ra-pagination{display:flex;align-items:center;justify-content:center;gap:14px;padding:16px;font-size:13px;color:#555;}

        .ra-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:99999;}
        .ra-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
        .ra-toast.err{background:#c0392b;}

        @media (max-width:900px){
            .ra-stats{grid-template-columns:repeat(2,1fr);}
            .ra-log-row{grid-template-columns:1fr;gap:4px;}
            .ra-log-head{display:none;}
        }
        `;
        document.head.appendChild(style);
    }

    initRemoteAccess();
})();
