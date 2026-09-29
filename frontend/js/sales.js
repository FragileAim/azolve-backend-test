// Sales App - Deal Pipeline Management (localStorage-first)
let deals = [];
let editingDealId = null;

function initSalesApp() {
    const stored = localStorage.getItem('azolve_deals');
    deals = stored ? JSON.parse(stored) : getSampleDeals();
    if (!stored) localStorage.setItem('azolve_deals', JSON.stringify(deals));
    renderDealsTable();
    renderKanban();
    updateSalesStats();
    // Show pipeline view by default
    switchSalesView('pipeline');
}

function switchSalesView(view) {
    const pipelineBoard = document.getElementById('salesPipelineBoard');
    const tableWrap = document.getElementById('salesTableWrap');
    const btnPipeline = document.getElementById('salesViewPipeline');
    const btnTable = document.getElementById('salesViewTable');
    if (view === 'pipeline') {
        if (pipelineBoard) pipelineBoard.style.display = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (btnPipeline) { btnPipeline.classList.add('active'); }
        if (btnTable) { btnTable.classList.remove('active'); }
        renderKanban();
    } else {
        if (pipelineBoard) pipelineBoard.style.display = 'none';
        if (tableWrap) tableWrap.style.display = '';
        if (btnPipeline) { btnPipeline.classList.remove('active'); }
        if (btnTable) { btnTable.classList.add('active'); }
        renderDealsTable();
    }
}

function getSampleDeals() {
    return [
        { _id: 'deal_1', name: 'Enterprise License - TechCorp', contact: 'Alice Johnson', company: 'TechCorp Inc.', value: 45000, stage: 'proposal', probability: 65, closeDate: new Date(Date.now()+14*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-10*86400000).toISOString() },
        { _id: 'deal_2', name: 'SaaS Subscription - StartupX', contact: 'Bob Martinez', company: 'StartupX', value: 12000, stage: 'qualified', probability: 40, closeDate: new Date(Date.now()+30*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-5*86400000).toISOString() },
        { _id: 'deal_3', name: 'Consulting Project - MediaGroup', contact: 'Carol White', company: 'MediaGroup', value: 28000, stage: 'negotiation', probability: 80, closeDate: new Date(Date.now()+7*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-15*86400000).toISOString() },
        { _id: 'deal_4', name: 'Support Contract - RetailPro', contact: 'David Kim', company: 'RetailPro', value: 8400, stage: 'closed_won', probability: 100, closeDate: new Date(Date.now()-2*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-20*86400000).toISOString() },
        { _id: 'deal_5', name: 'Platform Upgrade - FinanceHub', contact: 'Emma Davis', company: 'FinanceHub', value: 65000, stage: 'prospecting', probability: 20, closeDate: new Date(Date.now()+45*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-2*86400000).toISOString() }
    ];
}

function renderDealsTable() {
    const tbody = document.getElementById('salesTableBody') || document.getElementById('dealsTableBody');
    if (!tbody) return;

    const searchVal = document.getElementById('dealSearchInput')?.value?.toLowerCase() || '';
    const stageFilter = document.getElementById('dealStageFilter')?.value || 'all';

    let filtered = deals;
    if (stageFilter !== 'all') filtered = filtered.filter(d => d.stage === stageFilter);
    if (searchVal) filtered = filtered.filter(d =>
        (d.name||'').toLowerCase().includes(searchVal) ||
        (d.contact||'').toLowerCase().includes(searchVal) ||
        (d.company||'').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">
            <i class="fas fa-handshake" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>
            No deals found. <a href="#" onclick="openDealModal()" style="color:#28a745;">Add your first deal!</a></td></tr>`;
        return;
    }

    const stageColors = { prospecting:'secondary', qualified:'info', proposal:'warning', negotiation:'primary', closed_won:'success', closed_lost:'danger' };
    const stageLabels = { prospecting:'Prospecting', qualified:'Qualified', proposal:'Proposal', negotiation:'Negotiation', closed_won:'Won', closed_lost:'Lost' };

    tbody.innerHTML = filtered.map(deal => {
        const stageBadge = stageColors[deal.stage] || 'secondary';
        const stageLabel = stageLabels[deal.stage] || deal.stage;
        const date = deal.closeDate ? new Date(deal.closeDate).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '-';
        return `
        <tr>
            <td><div style="font-weight:700;color:#2c3e50;">${deal.name}</div></td>
            <td style="font-size:13px;">${deal.contact || '-'}</td>
            <td style="font-size:13px;">${deal.company || '-'}</td>
            <td style="font-weight:700;color:#28a745;">$${Number(deal.value||0).toLocaleString()}</td>
            <td><span class="badge badge-${stageBadge}">${stageLabel}</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${deal.probability||0}%;background:#28a745;border-radius:3px;"></div>
                    </div>
                    <span style="font-size:12px;color:#888;width:30px;">${deal.probability||0}%</span>
                </div>
            </td>
            <td style="font-size:12px;color:#888;">${date}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="openDealModal('${deal._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteDeal('${deal._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function renderKanban() {
    const board = document.getElementById('salesPipelineBoard');
    if (!board) return;

    const stages = ['prospecting','qualified','proposal','negotiation','closed_won','closed_lost'];
    const stageLabels = { prospecting:'Prospecting', qualified:'Qualified', proposal:'Proposal', negotiation:'Negotiation', closed_won:'Won ✓', closed_lost:'Lost ✗' };
    const stageColors = { prospecting:'#6c757d', qualified:'#17a2b8', proposal:'#ffc107', negotiation:'#007bff', closed_won:'#28a745', closed_lost:'#dc3545' };
    const stageBg = { prospecting:'#f8f9fa', qualified:'#e8f6f9', proposal:'#fffbec', negotiation:'#eef3fb', closed_won:'#eaf7ee', closed_lost:'#fdf0f0' };

    board.innerHTML = stages.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage);
        const stageTotal = stageDeals.reduce((s,d) => s+(d.value||0), 0);
        const cards = stageDeals.length === 0
            ? `<div style="text-align:center;color:#ccc;padding:20px;font-size:12px;">No deals</div>`
            : stageDeals.map(d => `
                <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1.5px solid #f0f0f0;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.04);transition:box-shadow .15s;" onmouseover="this.style.boxShadow='0 3px 10px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,.04)'" onclick="openDealModal('${d._id}')">
                    <div style="font-size:12px;font-weight:700;color:#2c3e50;margin-bottom:4px;line-height:1.3;">${d.name}</div>
                    <div style="font-size:11px;color:#888;margin-bottom:6px;">${d.contact||''}</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;font-weight:700;color:${stageColors[stage]};">$${Number(d.value||0).toLocaleString()}</span>
                        <span style="font-size:10px;color:#aaa;">${d.probability||0}%</span>
                    </div>
                </div>`).join('');
        return `
        <div style="flex:1;min-width:160px;background:${stageBg[stage]};border-radius:10px;padding:12px;border-top:3px solid ${stageColors[stage]};">
            <div style="font-size:12px;font-weight:700;color:${stageColors[stage]};margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">${stageLabels[stage]}</div>
            <div style="font-size:11px;color:#888;margin-bottom:10px;">${stageDeals.length} deal${stageDeals.length!==1?'s':''} &middot; $${stageTotal>=1000?(stageTotal/1000).toFixed(0)+'k':stageTotal.toLocaleString()}</div>
            <div id="kanban_${stage}" style="min-height:60px;">${cards}</div>
            <button onclick="openDealModal(null,'${stage}')" style="width:100%;margin-top:8px;padding:6px;border:1.5px dashed #ccc;border-radius:6px;background:transparent;color:#aaa;font-size:11px;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor='${stageColors[stage]}';this.style.color='${stageColors[stage]}'" onmouseout="this.style.borderColor='#ccc';this.style.color='#aaa'">+ Add Deal</button>
        </div>`;
    }).join('');
}

function updateSalesStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const activeDeals = deals.filter(d => !['closed_won','closed_lost'].includes(d.stage));
    const wonDeals = deals.filter(d => d.stage === 'closed_won');
    const totalPipeline = activeDeals.reduce((s,d) => s+(d.value||0), 0);
    const wonRevenue = wonDeals.reduce((s,d) => s+(d.value||0), 0);
    const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.filter(d => ['closed_won','closed_lost'].includes(d.stage)).length || 0) * 100) : 0;

    setEl('salesTotalDeals', deals.length);
    // HTML IDs: salesPipelineValue, salesWonValue
    setEl('salesPipelineValue', '$' + (totalPipeline >= 1000 ? (totalPipeline/1000).toFixed(0)+'k' : totalPipeline.toLocaleString()));
    setEl('salesWonValue', '$' + (wonRevenue >= 1000 ? (wonRevenue/1000).toFixed(0)+'k' : wonRevenue.toLocaleString()));
    setEl('salesWinRate', (isNaN(winRate) ? 0 : winRate) + '%');
    // Legacy IDs (keep for safety)
    setEl('salesPipeline', '$' + (totalPipeline >= 1000 ? (totalPipeline/1000).toFixed(0)+'k' : totalPipeline.toLocaleString()));
    setEl('salesWonDeals', wonDeals.length);
}

function searchDeals() { renderDealsTable(); }
function filterDeals() { renderDealsTable(); }

function openDealModal(dealId, defaultStage) {
    dealId = dealId || null;
    defaultStage = defaultStage || 'prospecting';
    editingDealId = dealId;
    const modal = document.getElementById('dealModal');
    if (!modal) return;
    const title = document.getElementById('dealModalTitle');

    // Clear form
    ['dealName','dealContact','dealCompany'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const valueEl = document.getElementById('dealValue');
    if (valueEl) valueEl.value = '';
    const stageEl = document.getElementById('dealStage');
    if (stageEl) stageEl.value = defaultStage;
    const probEl = document.getElementById('dealProbability');
    if (probEl) probEl.value = '20';
    const closeDateEl = document.getElementById('dealCloseDate');
    if (closeDateEl) closeDateEl.value = '';
    const editIdEl = document.getElementById('dealEditId');
    if (editIdEl) editIdEl.value = '';

    if (dealId) {
        const deal = deals.find(d => d._id === dealId);
        if (!deal) return;
        if (title) title.textContent = 'Edit Deal';
        if (editIdEl) editIdEl.value = deal._id;
        if (document.getElementById('dealName')) document.getElementById('dealName').value = deal.name || '';
        if (document.getElementById('dealContact')) document.getElementById('dealContact').value = deal.contact || '';
        if (document.getElementById('dealCompany')) document.getElementById('dealCompany').value = deal.company || '';
        if (valueEl) valueEl.value = deal.value || '';
        if (stageEl) stageEl.value = deal.stage || 'prospecting';
        if (probEl) probEl.value = deal.probability || '20';
        if (closeDateEl) closeDateEl.value = deal.closeDate || '';
    } else {
        if (title) title.textContent = 'Add New Deal';
    }
    modal.classList.add('active');
}

function closeDealModal() {
    const modal = document.getElementById('dealModal');
    if (modal) modal.classList.remove('active');
    editingDealId = null;
}

function saveDeal() {
    const nameEl = document.getElementById('dealName');
    if (!nameEl || !nameEl.value.trim()) { showToast('Deal name is required', 'error'); return; }

    const dealData = {
        name: nameEl.value.trim(),
        contact: (document.getElementById('dealContact')?.value || '').trim(),
        company: (document.getElementById('dealCompany')?.value || '').trim(),
        value: parseFloat(document.getElementById('dealValue')?.value) || 0,
        stage: document.getElementById('dealStage')?.value || 'prospecting',
        probability: parseInt(document.getElementById('dealProbability')?.value) || 0,
        closeDate: document.getElementById('dealCloseDate')?.value || ''
    };

    const currentEditId = document.getElementById('dealEditId')?.value || editingDealId;

    if (currentEditId) {
        const idx = deals.findIndex(d => d._id === currentEditId);
        if (idx !== -1) { deals[idx] = { ...deals[idx], ...dealData }; showToast('Deal updated!', 'success'); }
    } else {
        deals.unshift({ ...dealData, _id: 'deal_' + Date.now(), createdAt: new Date().toISOString() });
        showToast('Deal added!', 'success');
    }

    localStorage.setItem('azolve_deals', JSON.stringify(deals));
    closeDealModal();
    renderDealsTable();
    renderKanban();
    updateSalesStats();
}

function deleteDeal(dealId) {
    if (!confirm('Delete this deal?')) return;
    deals = deals.filter(d => d._id !== dealId);
    localStorage.setItem('azolve_deals', JSON.stringify(deals));
    renderDealsTable();
    renderKanban();
    updateSalesStats();
    showToast('Deal deleted', 'success');
}