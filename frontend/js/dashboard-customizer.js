// ═══════════════════════════════════════════════════════════════════════════
// REAL DASHBOARD CUSTOMIZATION ENGINE
// Lets each user add/remove/resize/reorder widgets on their own home Dashboard,
// and show/hide whole sections. Everything here reads real data via DB.get()
// and persists per-browser via localStorage (per logged-in user key namespace
// is handled by the existing DB helper).
// ═══════════════════════════════════════════════════════════════════════════

let dashCustomizeMode = false;
let dashDragWidgetId = null;

// ---- Widget catalog: each widget knows how to compute its own live value ----
const DASH_WIDGET_DEFS = {
    revenue: {
        label: 'Total Revenue', icon: 'fa-dollar-sign', color: '#00b894', size: 'small',
        compute() {
            const inv = DB.get('invoices');
            const total = inv.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
            return { value: fmtMoney(total), sub: inv.filter(i => i.status === 'paid').length + ' paid invoices' };
        }
    },
    pending: {
        label: 'Pending Amount', icon: 'fa-clock', color: '#d68910', size: 'small',
        compute() {
            const inv = DB.get('invoices');
            const total = inv.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0);
            return { value: fmtMoney(total), sub: inv.filter(i => i.status === 'overdue').length + ' overdue' };
        }
    },
    clients: {
        label: 'Active Clients', icon: 'fa-users', color: '#714B67', size: 'small',
        compute() { const c = DB.get('clients'); return { value: c.length, sub: 'total clients' }; }
    },
    leads: {
        label: 'Open Leads', icon: 'fa-bullhorn', color: '#0984e3', size: 'small',
        compute() { const l = DB.get('leads'); return { value: l.length, sub: 'in pipeline' }; }
    },
    deals: {
        label: 'Open Deals', icon: 'fa-handshake', color: '#6c5ce7', size: 'small',
        compute() {
            const d = DB.get('deals');
            const open = d.filter(x => x.stage !== 'won' && x.stage !== 'lost');
            const value = open.reduce((s, x) => s + (x.value || 0), 0);
            return { value: fmtMoney(value), sub: open.length + ' deals in progress' };
        }
    },
    projects: {
        label: 'Active Projects', icon: 'fa-diagram-project', color: '#00A09D', size: 'small',
        compute() { const p = DB.get('projects'); return { value: p.filter(x => x.status === 'active').length, sub: p.length + ' total' }; }
    },
    tasks: {
        label: 'Open Tasks', icon: 'fa-tasks', color: '#e17055', size: 'small',
        compute() {
            const t = DB.get('tasks');
            const open = t.filter(x => x.status !== 'done');
            return { value: open.length, sub: open.filter(x => x.priority === 'high').length + ' high priority' };
        }
    },
    tickets: {
        label: 'Support Tickets', icon: 'fa-ticket', color: '#d63031', size: 'small',
        compute() {
            const tk = DB.get('tickets');
            const open = tk.filter(x => x.status === 'open');
            return { value: open.length, sub: tk.length + ' total' };
        }
    },
    employees: {
        label: 'Team Members', icon: 'fa-id-badge', color: '#2d3436', size: 'small',
        compute() { const e = DB.get('employees'); return { value: e.length, sub: 'employees on record' }; }
    },
    attendanceToday: {
        label: "Present Today", icon: 'fa-calendar-check', color: '#27ae60', size: 'small',
        compute() {
            const att = DB.get('attendance').filter(a => a.date === today());
            const present = att.filter(a => a.clockIn).length;
            return { value: present, sub: att.length ? present + ' / ' + att.length + ' checked in' : 'no records today' };
        }
    },
    miniRevenueChart: {
        label: 'Revenue (last 6 mo)', icon: 'fa-chart-column', color: '#0b6bcb', size: 'large', type: 'chart',
        computeSeries() {
            const inv = DB.get('invoices');
            const months = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                months.push({ key: d.getFullYear() + '-' + d.getMonth(), label: d.toLocaleDateString('en-US', { month: 'short' }) });
            }
            const sums = months.map(m => {
                const total = inv.filter(x => {
                    if (!x.date || x.status !== 'paid') return false;
                    const dt = new Date(x.date);
                    return (dt.getFullYear() + '-' + dt.getMonth()) === m.key;
                }).reduce((s, x) => s + (x.total || 0), 0);
                return { label: m.label, total };
            });
            const max = Math.max(1, ...sums.map(s => s.total));
            return { sums, max };
        }
    },
    topPendingInvoices: {
        label: 'Top Pending Invoices', icon: 'fa-file-invoice-dollar', color: '#e17055', size: 'medium', type: 'list',
        computeList() {
            const inv = DB.get('invoices').filter(i => i.status === 'pending' || i.status === 'overdue');
            return inv.sort((a, b) => (b.total - (b.paid||0)) - (a.total - (a.paid||0))).slice(0, 5);
        }
    }
};

function dashGetWidgets() {
    return DB.get('dashboard_widgets', []);
}
function dashSaveWidgets(arr) { DB.set('dashboard_widgets', arr); }

function dashGetSections() {
    return DB.getObj ? DB.getObj('dashboard_sections', { charts: true, tasks: true, activity: true })
                      : (DB.get('dashboard_sections', null) || { charts: true, tasks: true, activity: true });
}
function dashSaveSections(s) { DB.set('dashboard_sections', s); }

function toggleDashboardCustomize() {
    dashCustomizeMode = !dashCustomizeMode;
    const bar = document.getElementById('dashCustomizeBar');
    const btn = document.getElementById('dashCustomizeBtn');
    if (bar) bar.style.display = dashCustomizeMode ? 'flex' : 'none';
    if (btn) btn.classList.toggle('btn-primary', dashCustomizeMode);
    if (btn) btn.classList.toggle('btn-outline', !dashCustomizeMode);
    renderCustomDashboardWidgets();
}

function renderCustomDashboardWidgets() {
    const grid = document.getElementById('dashCustomWidgetsGrid');
    if (!grid) return;
    const widgets = dashGetWidgets();

    if (!widgets.length) {
        grid.style.gridTemplateColumns = '1fr';
        grid.innerHTML = `<div class="card" style="padding:24px;text-align:center;border:2px dashed var(--border);box-shadow:none;">
            <i class="fas fa-th-large" style="font-size:28px;color:var(--text-muted);margin-bottom:10px;display:block;"></i>
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">No custom widgets yet. Add the metrics that matter to you.</p>
            <button class="btn btn-primary btn-sm" onclick="openAddWidgetModal()"><i class="fas fa-plus"></i> Add Widget</button>
        </div>`;
        return;
    }

    grid.style.gridTemplateColumns = 'repeat(4,1fr)';
    grid.innerHTML = widgets.map(w => {
        const def = DASH_WIDGET_DEFS[w.type];
        if (!def) return '';
        const span = w.size === 'large' ? 4 : w.size === 'medium' ? 2 : 1;
        const dragHandle = dashCustomizeMode ? `<span class="dash-drag-handle" style="cursor:grab;color:var(--text-muted);margin-right:8px;"><i class="fas fa-grip-vertical"></i></span>` : '';
        const controls = dashCustomizeMode ? `<div style="position:absolute;top:8px;right:8px;display:flex;gap:4px;">
                <button title="Resize" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;" onclick="cycleDashboardWidgetSize('${w.id}')"><i class="fas fa-expand-alt"></i></button>
                <button title="Remove" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:12px;" onclick="removeDashboardWidget('${w.id}')"><i class="fas fa-times"></i></button>
            </div>` : '';

        let body = '';
        if (def.type === 'chart') {
            const { sums, max } = def.computeSeries();
            body = `<h4 style="margin:0 0 14px;font-size:14px;">${dragHandle}${def.label}</h4>
                <div style="display:flex;align-items:flex-end;gap:8px;height:120px;">
                    ${sums.map(s => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                        <div style="width:100%;height:${Math.max(4, Math.round(s.total / max * 100))}px;background:linear-gradient(to top,${def.color},#42a5f5);border-radius:3px 3px 0 0;" title="${fmtMoney(s.total)}"></div>
                        <span style="font-size:10px;color:var(--text-muted);">${s.label}</span>
                    </div>`).join('')}
                </div>`;
        } else if (def.type === 'list') {
            const list = def.computeList();
            body = `<h4 style="margin:0 0 12px;font-size:14px;">${dragHandle}${def.label}</h4>
                <div style="font-size:12px;color:var(--text-secondary);">
                    ${list.length ? list.map(i => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">
                        <span>${i.clientName || i.number}</span><strong>${fmtMoney((i.total||0)-(i.paid||0))}</strong>
                    </div>`).join('') : '<div style="padding:8px 0;color:var(--text-muted);">Nothing pending — nice!</div>'}
                </div>`;
        } else {
            const { value, sub } = def.compute();
            body = `<div style="display:flex;align-items:center;gap:14px;">
                <div style="width:44px;height:44px;border-radius:10px;background:${def.color}22;color:${def.color};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;"><i class="fas ${def.icon}"></i></div>
                <div><div style="font-size:24px;font-weight:700;line-height:1.2;">${value}</div><div style="font-size:12px;color:var(--text-secondary);">${dragHandle}${def.label}</div><div style="font-size:11px;color:var(--text-muted);">${sub}</div></div>
            </div>`;
        }

        return `<div class="card dash-widget-card" data-widget-id="${w.id}" style="grid-column:span ${span};padding:20px;position:relative;${dashCustomizeMode ? 'cursor:move;border:1.5px dashed var(--primary-light);' : ''}"
                ${dashCustomizeMode ? `draggable="true" ondragstart="dashOnDragStart(event,'${w.id}')" ondragover="dashOnDragOver(event)" ondrop="dashOnDrop(event,'${w.id}')"` : ''}>
            ${controls}${body}
        </div>`;
    }).join('');
}

function cycleDashboardWidgetSize(id) {
    const widgets = dashGetWidgets();
    const w = widgets.find(x => x.id === id);
    if (!w) return;
    const order = ['small', 'medium', 'large'];
    w.size = order[(order.indexOf(w.size) + 1) % order.length];
    dashSaveWidgets(widgets);
    renderCustomDashboardWidgets();
}

function removeDashboardWidget(id) {
    let widgets = dashGetWidgets();
    widgets = widgets.filter(w => w.id !== id);
    dashSaveWidgets(widgets);
    showToast('Widget removed', 'info');
    renderCustomDashboardWidgets();
}

function dashOnDragStart(ev, id) {
    dashDragWidgetId = id;
    ev.dataTransfer.effectAllowed = 'move';
}
function dashOnDragOver(ev) { ev.preventDefault(); }
function dashOnDrop(ev, targetId) {
    ev.preventDefault();
    if (!dashDragWidgetId || dashDragWidgetId === targetId) return;
    const widgets = dashGetWidgets();
    const fromIdx = widgets.findIndex(w => w.id === dashDragWidgetId);
    const toIdx = widgets.findIndex(w => w.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = widgets.splice(fromIdx, 1);
    widgets.splice(toIdx, 0, moved);
    dashSaveWidgets(widgets);
    dashDragWidgetId = null;
    renderCustomDashboardWidgets();
}

function openAddWidgetModal() {
    const existingTypes = dashGetWidgets().map(w => w.type);
    const options = Object.keys(DASH_WIDGET_DEFS).map(type => {
        const def = DASH_WIDGET_DEFS[type];
        const already = existingTypes.includes(type);
        return `<div style="padding:18px;border:1px solid var(--border);border-radius:var(--radius-md);text-align:center;cursor:${already ? 'default' : 'pointer'};opacity:${already ? '0.45' : '1'};transition:all .15s;"
            ${already ? '' : `onmouseover="this.style.borderColor='${def.color}'" onmouseout="this.style.borderColor='var(--border)'" onclick="addDashboardWidget('${type}')"`}>
            <i class="fas ${def.icon}" style="font-size:22px;color:${def.color};margin-bottom:8px;"></i>
            <div style="font-weight:600;font-size:13px;">${def.label}</div>
            <div style="font-size:11px;color:var(--text-muted);">${already ? 'Already added' : 'Live data'}</div>
        </div>`;
    }).join('');
    openModalRaw(`<div class="modal-header"><h3>Add Widget</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">${options}</div></div>`);
}

function addDashboardWidget(type) {
    const def = DASH_WIDGET_DEFS[type];
    if (!def) return;
    const widgets = dashGetWidgets();
    if (widgets.some(w => w.type === type)) { showToast('That widget is already on your dashboard', 'info'); return; }
    widgets.push({ id: 'DW' + genId(), type, size: def.size });
    dashSaveWidgets(widgets);
    closeModal();
    showToast('Widget added', 'success');
    if (!dashCustomizeMode) toggleDashboardCustomize(); else renderCustomDashboardWidgets();
}

function openSectionVisibilityModal() {
    const sections = dashGetSections();
    const labels = { charts: 'Revenue & Invoice Charts', tasks: 'Upcoming Tasks & Clock', activity: 'Recent Activity Feed' };
    openModalRaw(`<div class="modal-header"><h3>Dashboard Sections</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
            ${Object.keys(labels).map(key => `<div class="form-group" style="display:flex;align-items:center;justify-content:space-between;">
                <label style="margin:0;">${labels[key]}</label>
                <input type="checkbox" ${sections[key] !== false ? 'checked' : ''} onchange="setDashboardSection('${key}', this.checked)">
            </div>`).join('')}
        </div>
        <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Done</button></div>`);
}

function setDashboardSection(key, visible) {
    const sections = dashGetSections();
    sections[key] = visible;
    dashSaveSections(sections);
    applyDashboardSectionVisibility();
}

function applyDashboardSectionVisibility() {
    const sections = dashGetSections();
    const map = { charts: 'dashSection_charts', tasks: 'dashSection_tasks', activity: 'dashSection_activity' };
    Object.keys(map).forEach(key => {
        const el = document.getElementById(map[key]);
        if (el) el.style.display = sections[key] === false ? 'none' : '';
    });
}

function resetDashboardLayout() {
    if (!confirm('Reset your dashboard to the default layout? This removes your custom widgets and section choices.')) return;
    DB.remove('dashboard_widgets');
    DB.remove('dashboard_sections');
    renderCustomDashboardWidgets();
    applyDashboardSectionVisibility();
    showToast('Dashboard reset to default', 'success');
}
