// Invoice Module - Full Invoice Management (localStorage-first)
let invoices = [];
let invoiceLineItems = [];
let editingInvoiceId = null;

async function initInvoiceApp() {
    try {
        const res = await api.getInvoices();
        if (res && res.success) {
            invoices = res.data.map(i => ({...i, _id: i._id || i.id}));
        } else {
            invoices = getSampleInvoices();
        }
    } catch(e) {
        console.error(e);
        invoices = getSampleInvoices();
    }
    renderInvoicesTable();
    updateInvoiceStats();
}

function getSampleInvoices() {
    return [
        {
            _id: 'inv_1', number: 'INV-001', client: 'TechCorp Inc.', clientEmail: 'billing@techcorp.com',
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now()+14*86400000).toISOString().split('T')[0],
            status: 'paid', notes: 'Thank you for your business.',
            items: [
                { description: 'Software License (Annual)', qty: 1, rate: 4500, amount: 4500 },
                { description: 'Implementation Services', qty: 10, rate: 150, amount: 1500 }
            ],
            subtotal: 6000, tax: 480, total: 6480
        },
        {
            _id: 'inv_2', number: 'INV-002', client: 'MediaGroup', clientEmail: 'accounts@mediagroup.com',
            issueDate: new Date(Date.now()-7*86400000).toISOString().split('T')[0],
            dueDate: new Date(Date.now()+7*86400000).toISOString().split('T')[0],
            status: 'sent', notes: 'Payment due within 14 days.',
            items: [
                { description: 'Consulting Services (20 hrs)', qty: 20, rate: 120, amount: 2400 },
                { description: 'Travel Expenses', qty: 1, rate: 350, amount: 350 }
            ],
            subtotal: 2750, tax: 220, total: 2970
        },
        {
            _id: 'inv_3', number: 'INV-003', client: 'StartupX', clientEmail: 'finance@startup.io',
            issueDate: new Date(Date.now()-3*86400000).toISOString().split('T')[0],
            dueDate: new Date(Date.now()+11*86400000).toISOString().split('T')[0],
            status: 'draft', notes: '',
            items: [
                { description: 'Monthly SaaS Subscription', qty: 3, rate: 299, amount: 897 }
            ],
            subtotal: 897, tax: 71.76, total: 968.76
        },
        {
            _id: 'inv_4', number: 'INV-004', client: 'RetailPro', clientEmail: 'billing@retailpro.com',
            issueDate: new Date(Date.now()-30*86400000).toISOString().split('T')[0],
            dueDate: new Date(Date.now()-16*86400000).toISOString().split('T')[0],
            status: 'overdue', notes: 'Please remit payment immediately.',
            items: [
                { description: 'Support Contract Q1', qty: 1, rate: 1800, amount: 1800 }
            ],
            subtotal: 1800, tax: 144, total: 1944
        }
    ];
}

function renderInvoicesTable() {
    const tbody = document.getElementById('invoicesTableBody');
    if (!tbody) return;

    const searchVal = document.getElementById('invSearchInput')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('invStatusFilter')?.value || '';

    let filtered = invoices;
    if (statusFilter) filtered = filtered.filter(inv => inv.status === statusFilter);
    if (searchVal) filtered = filtered.filter(inv =>
        (inv.number||'').toLowerCase().includes(searchVal) ||
        (inv.client||'').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#888;">
            <i class="fas fa-file-invoice" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>
            No invoices found. <a href="#" onclick="openInvoiceModal()" style="color:#17a2b8;">Create your first invoice!</a></td></tr>`;
        return;
    }

    const statusColors = { draft:'secondary', sent:'info', paid:'success', overdue:'danger', cancelled:'dark' };
    const statusLabels = { draft:'Draft', sent:'Sent', paid:'Paid', overdue:'Overdue', cancelled:'Cancelled' };

    tbody.innerHTML = filtered.map(inv => {
        const badge = statusColors[inv.status] || 'secondary';
        const label = statusLabels[inv.status] || inv.status;
        const issueDate = inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '-';
        const dueDate = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '-';
        const isOverdue = inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
        return `
        <tr>
            <td><strong style="color:#17a2b8;">${inv.number}</strong></td>
            <td>
                <div style="font-weight:600;color:#2c3e50;">${inv.client}</div>
                <div style="font-size:11px;color:#888;">${inv.clientEmail || ''}</div>
            </td>
            <td style="font-size:13px;color:#666;">${issueDate}</td>
            <td style="font-size:13px;color:${isOverdue ? '#dc3545' : '#666'};">${dueDate}${isOverdue ? ' <i class="fas fa-exclamation-circle" title="Overdue"></i>' : ''}</td>
            <td style="font-weight:700;color:#2c3e50;">$${Number(inv.total||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td><span class="badge badge-${badge}">${label}</span></td>
            <td>
                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <button class="btn-icon" onclick="openInvoiceModal('${inv._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="viewInvoice('${inv._id}')" title="View/Print"><i class="fas fa-eye"></i></button>
                    ${inv.status === 'draft' ? `<button class="btn-icon" style="color:#17a2b8;" onclick="markInvoiceSent('${inv._id}')" title="Mark Sent"><i class="fas fa-paper-plane"></i></button>` : ''}
                    ${inv.status !== 'paid' ? `<button class="btn-icon" style="color:#28a745;" onclick="markInvoicePaid('${inv._id}')" title="Mark Paid"><i class="fas fa-check-circle"></i></button>` : ''}
                    <button class="btn-icon danger" onclick="deleteInvoice('${inv._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateInvoiceStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const total = invoices.reduce((s,i) => s+(i.total||0), 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((s,i) => s+(i.total||0), 0);
    const outstanding = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s,i) => s+(i.total||0), 0);
    const overdue = invoices.filter(i => i.status === 'overdue').length;

    setEl('invTotalInvoices', invoices.length);
    setEl('invTotalBilled', '$' + total.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
    setEl('invTotalPaid', '$' + paid.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
    setEl('invOutstanding', '$' + outstanding.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
    setEl('invOverdue', overdue);
}

function searchInvoices() { renderInvoicesTable(); }
function filterInvoices() { renderInvoicesTable(); }

// ── LINE ITEM MANAGEMENT ──────────────────────────────────────
function addInvoiceLineItem() {
    const id = 'li_' + Date.now();
    invoiceLineItems.push({ id, description: '', qty: 1, rate: 0, amount: 0 });
    renderInvoiceLineItems();
}

function removeLineItem(id) {
    invoiceLineItems = invoiceLineItems.filter(li => li.id !== id);
    renderInvoiceLineItems();
    calcInvoiceTotals();
}

function updateLineItem(id, field, value) {
    const li = invoiceLineItems.find(li => li.id === id);
    if (!li) return;
    li[field] = field === 'description' ? value : parseFloat(value) || 0;
    if (field === 'qty' || field === 'rate') {
        li.amount = li.qty * li.rate;
        const amountEl = document.getElementById('li_amount_' + id);
        if (amountEl) amountEl.textContent = '$' + li.amount.toFixed(2);
    }
    calcInvoiceTotals();
}

function renderInvoiceLineItems() {
    const container = document.getElementById('invoiceLineItems');
    if (!container) return;
    if (invoiceLineItems.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:#aaa;padding:20px;font-size:13px;">No items yet. Click "Add Item" to get started.</div>`;
        calcInvoiceTotals();
        return;
    }
    container.innerHTML = invoiceLineItems.map((li, idx) => `
        <div style="display:grid;grid-template-columns:1fr 80px 100px 90px 36px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
            <input type="text" class="form-control" style="font-size:13px;" placeholder="Item description" value="${li.description}" oninput="updateLineItem('${li.id}','description',this.value)">
            <input type="number" class="form-control" style="font-size:13px;text-align:center;" min="1" value="${li.qty}" oninput="updateLineItem('${li.id}','qty',this.value)">
            <input type="number" class="form-control" style="font-size:13px;text-align:right;" min="0" step="0.01" placeholder="0.00" value="${li.rate}" oninput="updateLineItem('${li.id}','rate',this.value)">
            <div id="li_amount_${li.id}" style="font-size:13px;font-weight:700;color:#2c3e50;text-align:right;padding:0 4px;">$${li.amount.toFixed(2)}</div>
            <button class="btn-icon danger" onclick="removeLineItem('${li.id}')" title="Remove"><i class="fas fa-times"></i></button>
        </div>`).join('');
    calcInvoiceTotals();
}

function calcInvoiceTotals() {
    const subtotal = invoiceLineItems.reduce((s,li) => s+li.amount, 0);
    const taxRate = parseFloat(document.getElementById('invTaxRate')?.value) || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('invSubtotalDisplay', '$' + subtotal.toFixed(2));
    setEl('invTaxDisplay', '$' + tax.toFixed(2) + ` (${taxRate}%)`);
    setEl('invTotalDisplay', '$' + total.toFixed(2));
}

// ── MODAL ────────────────────────────────────────────────────
function openInvoiceModal(invoiceId) {
    invoiceId = invoiceId || null;
    editingInvoiceId = invoiceId;
    const modal = document.getElementById('invoiceModal');
    if (!modal) return;
    const title = document.getElementById('invoiceModalTitle');

    // Clear form
    invoiceLineItems = [];
    ['invClient','invClientEmail','invClientAddress','invNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusEl = document.getElementById('invStatus');
    if (statusEl) statusEl.value = 'draft';
    const taxEl = document.getElementById('invTaxRate');
    if (taxEl) taxEl.value = '8';
    const editIdEl = document.getElementById('invEditId');
    if (editIdEl) editIdEl.value = '';

    // Set dates
    const issueDateEl = document.getElementById('invIssueDate');
    const dueDateEl = document.getElementById('invDueDate');
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now()+30*86400000).toISOString().split('T')[0];
    if (issueDateEl) issueDateEl.value = today;
    if (dueDateEl) dueDateEl.value = in30;

    // Set invoice number
    const numEl = document.getElementById('invNumber');
    if (numEl) numEl.value = generateInvoiceNumber();

    if (invoiceId) {
        const inv = invoices.find(i => i._id === invoiceId);
        if (!inv) return;
        if (title) title.textContent = 'Edit Invoice';
        if (editIdEl) editIdEl.value = inv._id;
        if (numEl) numEl.value = inv.number || '';
        if (document.getElementById('invClient')) document.getElementById('invClient').value = inv.client || '';
        if (document.getElementById('invClientEmail')) document.getElementById('invClientEmail').value = inv.clientEmail || '';
        if (document.getElementById('invClientAddress')) document.getElementById('invClientAddress').value = inv.clientAddress || '';
        if (issueDateEl) issueDateEl.value = inv.issueDate || today;
        if (dueDateEl) dueDateEl.value = inv.dueDate || in30;
        if (statusEl) statusEl.value = inv.status || 'draft';
        if (taxEl) taxEl.value = inv.taxRate || '8';
        if (document.getElementById('invNotes')) document.getElementById('invNotes').value = inv.notes || '';
        // Load line items
        invoiceLineItems = (inv.items || []).map((item, idx) => ({ ...item, id: 'li_' + Date.now() + idx }));
    } else {
        if (title) title.textContent = 'New Invoice';
        // Default one empty line item
        invoiceLineItems = [{ id: 'li_' + Date.now(), description: '', qty: 1, rate: 0, amount: 0 }];
    }

    renderInvoiceLineItems();
    modal.classList.add('active');
}

function closeInvoiceModal() {
    const modal = document.getElementById('invoiceModal');
    if (modal) modal.classList.remove('active');
    editingInvoiceId = null;
    invoiceLineItems = [];
}

function saveInvoice() {
    const clientEl = document.getElementById('invClient');
    if (!clientEl || !clientEl.value.trim()) { showToast('Client name is required', 'error'); return; }
    if (invoiceLineItems.length === 0) { showToast('Add at least one line item', 'error'); return; }

    // Check all items have descriptions
    const emptyItems = invoiceLineItems.filter(li => !li.description.trim());
    if (emptyItems.length > 0) { showToast('All items need a description', 'error'); return; }

    const taxRate = parseFloat(document.getElementById('invTaxRate')?.value) || 0;
    const subtotal = invoiceLineItems.reduce((s,li) => s+li.amount, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const invData = {
        number: document.getElementById('invNumber')?.value || generateInvoiceNumber(),
        client: clientEl.value.trim(),
        clientEmail: (document.getElementById('invClientEmail')?.value || '').trim(),
        clientAddress: (document.getElementById('invClientAddress')?.value || '').trim(),
        issueDate: document.getElementById('invIssueDate')?.value || new Date().toISOString().split('T')[0],
        dueDate: document.getElementById('invDueDate')?.value || '',
        status: document.getElementById('invStatus')?.value || 'draft',
        taxRate,
        notes: (document.getElementById('invNotes')?.value || '').trim(),
        items: invoiceLineItems.map(li => ({ description: li.description, qty: li.qty, rate: li.rate, amount: li.amount })),
        subtotal,
        tax,
        total
    };

    // Update overdue status automatically
    if (invData.status !== 'paid' && invData.dueDate && new Date(invData.dueDate) < new Date()) {
        invData.status = 'overdue';
    }

    const currentEditId = document.getElementById('invEditId')?.value || editingInvoiceId;

    try {
        if (currentEditId) {
            await api.updateInvoice(currentEditId, invData);
            showToast('Invoice updated!', 'success');
        } else {
            await api.createInvoice(invData);
            showToast('Invoice created!', 'success');
        }
        await initInvoiceApp();
        closeInvoiceModal();
    } catch (e) {
        showToast('Error saving invoice', 'error');
    }
}

function generateInvoiceNumber() {
    const count = invoices.length + 1;
    return 'INV-' + String(count).padStart(3, '0');
}

async function markInvoiceSent(id) {
    try {
        await api.updateInvoiceStatus(id, 'sent');
        await initInvoiceApp();
        showToast('Invoice marked as sent!', 'success');
    } catch (e) {
        showToast('Error', 'error');
    }
}

async function markInvoicePaid(id) {
    try {
        await api.updateInvoiceStatus(id, 'paid');
        await initInvoiceApp();
        showToast('Invoice marked as paid! 🎉', 'success');
    } catch (e) {
        showToast('Error', 'error');
    }
}

async function deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return;
    try {
        await api.deleteInvoice(id);
        await initInvoiceApp();
        showToast('Invoice deleted', 'success');
    } catch (e) {
        showToast('Error deleting invoice', 'error');
    }
}

// ── VIEW / PRINT INVOICE ─────────────────────────────────────
function viewInvoice(id) {
    const inv = invoices.find(i => i._id === id);
    if (!inv) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const companyName = user.company || 'Your Company';

    const statusColors = { draft:'#6c757d', sent:'#17a2b8', paid:'#28a745', overdue:'#dc3545', cancelled:'#343a40' };
    const statusColor = statusColors[inv.status] || '#6c757d';

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${inv.number} - Invoice</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#2c3e50;background:#fff;padding:40px;}
.invoice-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;}
.company-name{font-size:28px;font-weight:800;color:#714B67;}
.invoice-badge{padding:6px 16px;border-radius:20px;font-size:14px;font-weight:700;color:#fff;background:${statusColor};}
.invoice-number{font-size:20px;font-weight:700;color:#2c3e50;margin-bottom:8px;}
.section{margin-bottom:28px;}
.label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;}
.value{font-size:14px;color:#2c3e50;}
.bill-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:32px;margin-bottom:32px;}
table{width:100%;border-collapse:collapse;}
thead th{background:#f8f9fa;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #e9ecef;}
tbody td{padding:12px;border-bottom:1px solid #f0f0f0;font-size:13px;}
.text-right{text-align:right;}
.totals{margin-top:20px;display:flex;justify-content:flex-end;}
.totals-box{width:280px;}
.totals-row{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px solid #f0f0f0;}
.totals-total{display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:700;border-top:2px solid #714B67;color:#714B67;}
.notes{margin-top:32px;padding:16px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#666;}
.footer{margin-top:40px;text-align:center;font-size:12px;color:#aaa;border-top:1px solid #f0f0f0;padding-top:16px;}
@media print{body{padding:20px;} .no-print{display:none;}}
</style>
</head>
<body>
<div class="invoice-header">
  <div>
    <div class="company-name">${companyName}</div>
    <div style="font-size:12px;color:#888;margin-top:4px;">Invoice Management System</div>
  </div>
  <div style="text-align:right;">
    <div class="invoice-number">${inv.number}</div>
    <span class="invoice-badge">${(inv.status||'draft').toUpperCase()}</span>
  </div>
</div>

<div class="bill-grid">
  <div>
    <div class="label">Bill To</div>
    <div class="value" style="font-weight:700;font-size:16px;">${inv.client}</div>
    ${inv.clientEmail ? `<div class="value">${inv.clientEmail}</div>` : ''}
    ${inv.clientAddress ? `<div class="value" style="color:#888;">${inv.clientAddress}</div>` : ''}
  </div>
  <div>
    <div class="label">Issue Date</div>
    <div class="value">${inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '-'}</div>
    <div class="label" style="margin-top:12px;">Due Date</div>
    <div class="value" style="color:${inv.status==='overdue'?'#dc3545':'inherit'};">${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : '-'}</div>
  </div>
  <div style="text-align:right;">
    <div class="label">Amount Due</div>
    <div style="font-size:28px;font-weight:800;color:#714B67;">$${Number(inv.total||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Rate</th><th class="text-right">Amount</th></tr></thead>
  <tbody>
    ${(inv.items||[]).map(item => `<tr>
      <td>${item.description}</td>
      <td class="text-right">${item.qty}</td>
      <td class="text-right">$${Number(item.rate||0).toFixed(2)}</td>
      <td class="text-right" style="font-weight:600;">$${Number(item.amount||0).toFixed(2)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals">
  <div class="totals-box">
    <div class="totals-row"><span>Subtotal</span><span>$${Number(inv.subtotal||0).toFixed(2)}</span></div>
    <div class="totals-row"><span>Tax (${inv.taxRate||0}%)</span><span>$${Number(inv.tax||0).toFixed(2)}</span></div>
    <div class="totals-total"><span>Total</span><span>$${Number(inv.total||0).toFixed(2)}</span></div>
  </div>
</div>

${inv.upiString ? `<div style="text-align:right; margin-top:20px;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(inv.upiString)}" alt="UPI QR Code" />
    <div style="font-size:11px;color:#888;margin-top:4px;">Scan to pay with UPI</div>
</div>` : ''}

${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}

<div class="footer">Generated by AZOLVE · ${companyName} · ${new Date().toLocaleDateString()}</div>

<div class="no-print" style="margin-top:24px;text-align:center;">
  <button onclick="window.print()" style="background:#714B67;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;margin-right:8px;"><i class="fas fa-print"></i> Print / Save PDF</button>
  <button onclick="window.close()" style="background:#f0f0f0;color:#333;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">Close</button>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
    if (win) {
        win.document.write(html);
        win.document.close();
    } else {
        showToast('Please allow popups to view invoice', 'error');
    }
}