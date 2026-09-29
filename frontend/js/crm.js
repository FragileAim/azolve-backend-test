// CRM App - Leads Management (localStorage-first)
let leads = [];
let editingLeadId = null;

function loadLeads() {
    const stored = localStorage.getItem('crm_leads');
    leads = stored ? JSON.parse(stored) : getSampleLeads();
    if (!stored) localStorage.setItem('crm_leads', JSON.stringify(leads));
    renderLeadsTable();
    updateCrmStats();
}

function getSampleLeads() {
    return [
        { _id: 'lead_1', firstName: 'Alice', lastName: 'Johnson', email: 'alice@techcorp.com', phone: '+1 555 0101', company: 'TechCorp Inc.', status: 'qualified', value: 12500, notes: 'Interested in Enterprise plan', createdAt: new Date(Date.now()-5*86400000).toISOString() },
        { _id: 'lead_2', firstName: 'Bob', lastName: 'Martinez', email: 'bob@startup.io', phone: '+1 555 0102', company: 'StartupX', status: 'contacted', value: 4800, notes: 'Needs demo session', createdAt: new Date(Date.now()-3*86400000).toISOString() },
        { _id: 'lead_3', firstName: 'Carol', lastName: 'White', email: 'carol@mediagroup.com', phone: '+1 555 0103', company: 'MediaGroup', status: 'converted', value: 8500, notes: 'Closed successfully', createdAt: new Date(Date.now()-8*86400000).toISOString() },
        { _id: 'lead_4', firstName: 'David', lastName: 'Kim', email: 'david@retailpro.com', phone: '+1 555 0104', company: 'RetailPro', status: 'new', value: 3200, notes: 'Inbound from website', createdAt: new Date(Date.now()-1*86400000).toISOString() },
        { _id: 'lead_5', firstName: 'Emma', lastName: 'Davis', email: 'emma@financehub.com', phone: '+1 555 0105', company: 'FinanceHub', status: 'proposal', value: 22000, notes: 'Sent proposal v2', createdAt: new Date(Date.now()-2*86400000).toISOString() }
    ];
}

function getLeadName(lead) {
    if (lead.firstName || lead.lastName) return (lead.firstName + ' ' + (lead.lastName || '')).trim();
    return lead.name || 'Unknown';
}

function renderLeadsTable() {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;

    const searchVal = document.getElementById('leadSearchInput')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('leadStatusFilter')?.value || '';

    let filtered = leads;
    if (statusFilter) filtered = filtered.filter(l => l.status === statusFilter);
    if (searchVal) filtered = filtered.filter(l =>
        getLeadName(l).toLowerCase().includes(searchVal) ||
        (l.email||'').toLowerCase().includes(searchVal) ||
        (l.company||'').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">
            <i class="fas fa-users" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>
            No leads found. <a href="#" onclick="openLeadModal()" style="color:#714B67;">Add your first lead!</a></td></tr>`;
        return;
    }

    const statusColors = { new:'info', contacted:'warning', qualified:'primary', proposal:'secondary', converted:'success', lost:'danger' };

    tbody.innerHTML = filtered.map(lead => {
        const name = getLeadName(lead);
        const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
        const date = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '-';
        const statusBadge = statusColors[lead.status] || 'secondary';
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#714B67,#9B6B8F);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${initials}</div>
                    <div>
                        <div style="font-weight:700;color:#2c3e50;">${name}</div>
                        ${lead.phone ? `<div style="font-size:12px;color:#888;">${lead.phone}</div>` : ''}
                    </div>
                </div>
            </td>
            <td style="font-size:13px;">${lead.email || '-'}</td>
            <td style="font-size:13px;">${lead.company || '-'}</td>
            <td><span class="badge badge-${statusBadge === 'primary' ? 'info' : statusBadge}">${(lead.status||'new').charAt(0).toUpperCase()+(lead.status||'new').slice(1)}</span></td>
            <td style="font-weight:700;color:#714B67;">${lead.value ? '$'+Number(lead.value).toLocaleString() : '-'}</td>
            <td style="font-size:12px;color:#888;">${date}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="openLeadModal('${lead._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteLead('${lead._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateCrmStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('crmTotalLeads', leads.length);
    setEl('crmConverted', leads.filter(l => l.status === 'converted').length);
    setEl('crmInProgress', leads.filter(l => !['converted','lost'].includes(l.status)).length);
    const pipeline = leads.filter(l => l.status !== 'lost').reduce((s,l) => s+(l.value||0), 0);
    setEl('crmPipelineVal', '$' + (pipeline >= 1000 ? (pipeline/1000).toFixed(0)+'k' : pipeline.toLocaleString()));
}

function searchLeads() { renderLeadsTable(); }
function filterLeads() { renderLeadsTable(); }

function openLeadModal(leadId) {
    leadId = leadId || null;
    editingLeadId = leadId;
    const modal = document.getElementById('leadModal');
    if (!modal) return;
    const title = document.getElementById('leadModalTitle');

    // Clear form
    ['leadFirstName','leadLastName','leadEmail','leadPhone','leadCompany','leadNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusEl = document.getElementById('leadStatus');
    if (statusEl) statusEl.value = 'new';
    const valueEl = document.getElementById('leadValue');
    if (valueEl) valueEl.value = '';
    const editIdEl = document.getElementById('leadEditId');
    if (editIdEl) editIdEl.value = '';

    if (leadId) {
        const lead = leads.find(l => l._id === leadId);
        if (!lead) return;
        if (title) title.textContent = 'Edit Lead';
        if (editIdEl) editIdEl.value = lead._id;
        const fn = document.getElementById('leadFirstName');
        const ln = document.getElementById('leadLastName');
        if (fn) fn.value = lead.firstName || (lead.name ? lead.name.split(' ')[0] : '');
        if (ln) ln.value = lead.lastName || (lead.name ? lead.name.split(' ').slice(1).join(' ') : '');
        if (document.getElementById('leadEmail')) document.getElementById('leadEmail').value = lead.email || '';
        if (document.getElementById('leadPhone')) document.getElementById('leadPhone').value = lead.phone || '';
        if (document.getElementById('leadCompany')) document.getElementById('leadCompany').value = lead.company || '';
        if (statusEl) statusEl.value = lead.status || 'new';
        if (valueEl) valueEl.value = lead.value || '';
        if (document.getElementById('leadNotes')) document.getElementById('leadNotes').value = lead.notes || '';
    } else {
        if (title) title.textContent = 'Add New Lead';
    }
    modal.classList.add('active');
}

function closeLeadModal() {
    const modal = document.getElementById('leadModal');
    if (modal) modal.classList.remove('active');
    editingLeadId = null;
}

function saveLead() {
    const firstName = (document.getElementById('leadFirstName')?.value || '').trim();
    const lastName = (document.getElementById('leadLastName')?.value || '').trim();
    const email = (document.getElementById('leadEmail')?.value || '').trim();

    if (!firstName) { showToast('First name is required', 'error'); return; }
    if (!email) { showToast('Email is required', 'error'); return; }

    const leadData = {
        firstName,
        lastName,
        name: (firstName + ' ' + lastName).trim(),
        email,
        phone: (document.getElementById('leadPhone')?.value || '').trim(),
        company: (document.getElementById('leadCompany')?.value || '').trim(),
        status: document.getElementById('leadStatus')?.value || 'new',
        value: parseFloat(document.getElementById('leadValue')?.value) || 0,
        notes: (document.getElementById('leadNotes')?.value || '').trim()
    };

    const currentEditId = document.getElementById('leadEditId')?.value || editingLeadId;

    if (currentEditId) {
        const idx = leads.findIndex(l => l._id === currentEditId);
        if (idx !== -1) { leads[idx] = { ...leads[idx], ...leadData }; showToast('Lead updated!', 'success'); }
    } else {
        leads.unshift({ ...leadData, _id: 'lead_' + Date.now(), createdAt: new Date().toISOString() });
        showToast('Lead added!', 'success');
    }

    localStorage.setItem('crm_leads', JSON.stringify(leads));
    closeLeadModal();
    renderLeadsTable();
    updateCrmStats();
}

function deleteLead(leadId) {
    if (!confirm('Delete this lead?')) return;
    leads = leads.filter(l => l._id !== leadId);
    localStorage.setItem('crm_leads', JSON.stringify(leads));
    renderLeadsTable();
    updateCrmStats();
    showToast('Lead deleted', 'success');
}