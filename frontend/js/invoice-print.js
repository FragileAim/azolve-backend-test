/**
 * World-Class Professional Invoice Generator
 * Stunning, print-ready invoices that impress clients
 */

function generateProfessionalInvoiceHTML(inv) {
    // Get company info from DB (same as dashboard uses)
    const company = (function() {
        try {
            // Try DB.getObj first (used by the dashboard)
            if (typeof DB !== 'undefined') return DB.getObj('company') || {};
            // Fallback to direct localStorage
            const raw = localStorage.getItem('azolve_db');
            if (raw) { const db = JSON.parse(raw); return db.company || {}; }
            return {};
        } catch(e) { return {}; }
    })();

    const companyName    = company.name    || 'Your Company';
    const companyEmail   = company.email   || 'hello@yourcompany.com';
    const companyPhone   = company.phone   || '+1 (555) 000-0000';
    const companyAddress = company.address || '123 Business Avenue';
    const companyCity    = company.city    || 'New York, NY 10001';
    const companyWebsite = company.website || 'www.yourcompany.com';
    const companyTaxId   = company.taxId   || company.gst || '';
    const companyCurrency= company.currency|| 'USD';
    const currSymbols    = {'USD':'$','EUR':'€','GBP':'£','INR':'₹','AUD':'A$','CAD':'C$'};
    const cur            = currSymbols[companyCurrency] || '$';

    const items   = inv.items || [];
    const subtotal= items.reduce((s,it)=> s + ((+it.qty||1)*(+it.price||0)), 0);
    const taxAmt  = items.reduce((s,it)=> s + ((+it.qty||1)*(+it.price||0)*(+it.taxRate||0)/100), 0);
    const discAmt = items.reduce((s,it)=> s + ((+it.qty||1)*(+it.price||0)*(+it.discount||0)/100), 0);
    const total   = subtotal + taxAmt - discAmt;
    const paid    = +inv.paid || 0;
    const balance = total - paid;

    function fmt(n){ return cur + Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function fmtDate(d){
        if(!d) return '—';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
    }

    const statusColors = {
        paid:    { bg: '#dcfce7', color: '#16a34a', label: 'PAID' },
        pending: { bg: '#fef9c3', color: '#ca8a04', label: 'PENDING' },
        overdue: { bg: '#fee2e2', color: '#dc2626', label: 'OVERDUE' },
        draft:   { bg: '#f1f5f9', color: '#64748b', label: 'DRAFT'   }
    };
    const sc = statusColors[inv.status] || statusColors.draft;

    // Initials for logo
    const initials = companyName.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

    // Build items rows
    const itemRows = items.map((it, idx) => {
        const lineSubtotal = (+it.qty||1) * (+it.price||0);
        const lineTax      = lineSubtotal * (+it.taxRate||0) / 100;
        const lineDisc     = lineSubtotal * (+it.discount||0) / 100;
        const lineTotal    = lineSubtotal + lineTax - lineDisc;
        return `
        <tr class="item-row ${idx%2===1?'alt':''}">
            <td class="item-num">${idx+1}</td>
            <td class="item-desc-cell">
                <div class="item-title">${it.product || it.name || it.desc || 'Item'}</div>
                ${it.desc && it.product ? `<div class="item-sub">${it.desc}</div>` : ''}
            </td>
            <td class="center">${+it.qty||1}</td>
            <td class="right">${fmt(it.price||0)}</td>
            <td class="center">${it.taxRate||0}%</td>
            <td class="center">${it.discount||0}%</td>
            <td class="right bold">${fmt(lineTotal)}</td>
        </tr>`;
    }).join('');

    const isDraft = inv.status === 'draft';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Invoice ${inv.number} – ${companyName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

body{
    font-family:'Inter',system-ui,-apple-system,sans-serif;
    background:#e8ecf0;
    min-height:100vh;
    padding:40px 20px;
    color:#1e293b;
    -webkit-font-smoothing:antialiased;
    print-color-adjust:exact;
    -webkit-print-color-adjust:exact;
}

.page{
    background:#fff;
    max-width:794px;
    margin:0 auto;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 32px 64px -12px rgba(0,0,0,.22),0 0 0 1px rgba(0,0,0,.05);
    position:relative;
}

/* ─── TOP ACCENT BAR ─── */
.accent-bar{
    height:6px;
    background:linear-gradient(90deg,#6366f1 0%,#8b5cf6 35%,#a855f7 65%,#ec4899 100%);
}

/* ─── HEADER ─── */
.inv-header{
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    padding:40px 48px 32px;
    background:#fff;
}

.brand{display:flex;align-items:center;gap:18px;}

.logo-box{
    width:64px;height:64px;
    border-radius:16px;
    background:linear-gradient(135deg,#6366f1,#a855f7);
    display:flex;align-items:center;justify-content:center;
    font-size:24px;font-weight:800;color:#fff;
    flex-shrink:0;
    box-shadow:0 8px 20px rgba(99,102,241,.35);
}

.brand-info{}
.brand-name{font-size:22px;font-weight:700;color:#0f172a;line-height:1.2;}
.brand-tag{font-size:12px;color:#94a3b8;margin-top:3px;letter-spacing:.4px;}

.inv-id-block{text-align:right;}
.inv-word{font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;}
.inv-num{font-size:32px;font-weight:800;color:#6366f1;letter-spacing:-1px;line-height:1;}
.status-pill{
    display:inline-block;
    padding:5px 14px;border-radius:99px;
    font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;
    background:${sc.bg};color:${sc.color};
    margin-top:10px;border:1.5px solid ${sc.color}33;
}

/* ─── META STRIP ─── */
.meta-strip{
    display:flex;gap:0;
    background:#f8fafc;
    border-top:1px solid #e2e8f0;
    border-bottom:1px solid #e2e8f0;
    padding:0 48px;
}
.meta-item{
    flex:1;padding:18px 0;
    border-right:1px solid #e2e8f0;
}
.meta-item:last-child{border-right:none;}
.meta-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;}
.meta-value{font-size:14px;font-weight:600;color:#0f172a;}
.meta-value.accent{color:#6366f1;}

/* ─── ADDRESSES ─── */
.addresses{
    display:grid;grid-template-columns:1fr 1fr;
    gap:0;
    border-bottom:1px solid #e2e8f0;
}
.addr-block{padding:28px 48px;}
.addr-block:first-child{border-right:1px solid #e2e8f0;}
.addr-from{background:#fff;}
.addr-to{background:#fafbff;}
.addr-label{
    font-size:10px;font-weight:700;
    letter-spacing:1.5px;text-transform:uppercase;
    color:#6366f1;margin-bottom:12px;
    display:flex;align-items:center;gap:6px;
}
.addr-label::before{
    content:'';display:inline-block;
    width:18px;height:2px;
    background:linear-gradient(90deg,#6366f1,#a855f7);
    border-radius:2px;
}
.addr-name{font-size:17px;font-weight:700;color:#0f172a;margin-bottom:8px;}
.addr-line{font-size:13px;color:#64748b;line-height:1.7;}
.addr-line a{color:#6366f1;text-decoration:none;}

/* ─── ITEMS TABLE ─── */
.items-section{padding:32px 48px;}
.items-title{
    font-size:11px;font-weight:700;letter-spacing:1.5px;
    text-transform:uppercase;color:#94a3b8;margin-bottom:16px;
}

table.items{width:100%;border-collapse:collapse;}

table.items thead tr{
    background:linear-gradient(90deg,#6366f1,#a855f7);
    color:#fff;
}
table.items thead th{
    padding:13px 14px;
    font-size:11px;font-weight:600;letter-spacing:.6px;text-transform:uppercase;
}
table.items thead th:first-child{border-radius:8px 0 0 8px;padding-left:18px;}
table.items thead th:last-child{border-radius:0 8px 8px 0;padding-right:18px;}

table.items tbody .item-row td{
    padding:14px 14px;
    font-size:13.5px;
    border-bottom:1px solid #f1f5f9;
    vertical-align:top;
}
table.items tbody .item-row.alt td{background:#fafbff;}
table.items tbody .item-row td:first-child{padding-left:18px;border-radius:8px 0 0 8px;}
table.items tbody .item-row td:last-child{padding-right:18px;border-radius:0 8px 8px 0;}

.item-num{color:#94a3b8;font-size:12px;font-weight:500;width:30px;}
.item-desc-cell{min-width:200px;}
.item-title{font-weight:600;color:#0f172a;}
.item-sub{font-size:12px;color:#94a3b8;margin-top:3px;}
.center{text-align:center;color:#475569;}
.right{text-align:right;}
.bold{font-weight:700;color:#0f172a;}

/* ─── SUMMARY ─── */
.summary-section{
    display:flex;justify-content:flex-end;
    padding:0 48px 32px;
}
.summary-box{
    width:300px;
    background:#f8fafc;
    border-radius:12px;
    padding:20px 24px;
    border:1px solid #e2e8f0;
}
.sum-row{
    display:flex;justify-content:space-between;
    align-items:center;
    padding:8px 0;
    font-size:13.5px;
    border-bottom:1px solid #e2e8f0;
    color:#475569;
}
.sum-row:last-child{border-bottom:none;}
.sum-row.disc{color:#059669;}
.sum-row.total-row{
    padding:14px 0 0;
    border-top:2px solid #6366f1;
    border-bottom:none;
    margin-top:6px;
}
.sum-row.total-row .sum-label{font-size:15px;font-weight:700;color:#0f172a;}
.sum-row.total-row .sum-val{font-size:24px;font-weight:800;color:#6366f1;letter-spacing:-1px;}
.sum-row.balance-row .sum-val{color:#dc2626;font-weight:700;}
.sum-label{font-weight:500;}
.sum-val{font-weight:600;}

/* ─── NOTES / PAYMENT ─── */
.bottom-section{
    display:grid;grid-template-columns:1fr 1fr;
    gap:0;
    border-top:1px solid #e2e8f0;
}
.bottom-block{padding:24px 48px;}
.bottom-block:first-child{border-right:1px solid #e2e8f0;}
.bottom-title{
    font-size:10px;font-weight:700;letter-spacing:1.5px;
    text-transform:uppercase;color:#6366f1;margin-bottom:12px;
}
.bottom-text{font-size:13px;color:#64748b;line-height:1.7;}

/* ─── BANK / PAYMENT DETAILS ─── */
.bank-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;}
.bank-key{color:#94a3b8;font-weight:500;}
.bank-val{color:#0f172a;font-weight:600;}

/* ─── FOOTER ─── */
.inv-footer{
    background:linear-gradient(90deg,#6366f1,#a855f7);
    color:#fff;
    padding:20px 48px;
    display:flex;
    justify-content:space-between;
    align-items:center;
}
.footer-thanks{font-size:15px;font-weight:600;}
.footer-sub{font-size:12px;opacity:.8;margin-top:3px;}
.footer-contact{text-align:right;font-size:12px;opacity:.9;line-height:1.8;}

/* ─── DRAFT WATERMARK ─── */
${isDraft ? `
.draft-wm{
    position:absolute;top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(-30deg);
    font-size:130px;font-weight:900;
    color:rgba(100,116,139,.07);
    text-transform:uppercase;
    letter-spacing:12px;
    pointer-events:none;
    white-space:nowrap;
    z-index:0;
    user-select:none;
}` : ''}

/* ─── PRINT ─── */
@media print{
    @page{size:A4;margin:0;}
    html,body{margin:0;padding:0;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    *,*::before,*::after{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
    .page{box-shadow:none!important;border-radius:0;max-width:100%;}
    .no-print{display:none!important;}
    .accent-bar{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
}
</style>
</head>
<body>
<div class="page">
    ${isDraft ? '<div class="draft-wm">DRAFT</div>' : ''}

    <!-- Accent Bar -->
    <div class="accent-bar"></div>

    <!-- Header -->
    <div class="inv-header">
        <div class="brand">
            <div class="logo-box">${initials}</div>
            <div class="brand-info">
                <div class="brand-name">${companyName}</div>
                <div class="brand-tag">${companyWebsite}</div>
            </div>
        </div>
        <div class="inv-id-block">
            <div class="inv-word">Invoice</div>
            <div class="inv-num">${inv.number}</div>
            <div class="status-pill">${sc.label}</div>
        </div>
    </div>

    <!-- Meta Strip -->
    <div class="meta-strip">
        <div class="meta-item" style="padding-left:0">
            <div class="meta-label">Issue Date</div>
            <div class="meta-value">${fmtDate(inv.date)}</div>
        </div>
        <div class="meta-item" style="padding-left:24px">
            <div class="meta-label">Due Date</div>
            <div class="meta-value ${balance > 0 && inv.status!=='paid' ? 'accent' : ''}">${fmtDate(inv.due)}</div>
        </div>
        <div class="meta-item" style="padding-left:24px">
            <div class="meta-label">Amount Due</div>
            <div class="meta-value accent">${fmt(balance > 0 ? balance : total)}</div>
        </div>
        ${inv.paymentTerms ? `
        <div class="meta-item" style="padding-left:24px">
            <div class="meta-label">Payment Terms</div>
            <div class="meta-value">${inv.paymentTerms}</div>
        </div>` : ''}
    </div>

    <!-- Addresses -->
    <div class="addresses">
        <div class="addr-block addr-from">
            <div class="addr-label">From</div>
            <div class="addr-name">${companyName}</div>
            <div class="addr-line">
                ${companyAddress}<br>
                ${companyCity}<br>
                <a href="mailto:${companyEmail}">${companyEmail}</a><br>
                ${companyPhone}
                ${companyTaxId ? `<br><strong>GSTIN / Tax ID:</strong> ${companyTaxId}` : ''}
            </div>
        </div>
        <div class="addr-block addr-to">
            <div class="addr-label">Bill To</div>
            <div class="addr-name">${inv.clientName || '—'}</div>
            <div class="addr-line">
                ${inv.clientAddress ? inv.clientAddress+'<br>' : ''}
                ${inv.clientCity ? inv.clientCity+'<br>' : ''}
                ${inv.clientEmail ? `<a href="mailto:${inv.clientEmail}">${inv.clientEmail}</a><br>` : ''}
                ${inv.clientPhone ? inv.clientPhone : ''}
            </div>
        </div>
    </div>

    <!-- Items Table -->
    <div class="items-section">
        <div class="items-title">Invoice Items</div>
        <table class="items">
            <thead>
                <tr>
                    <th style="text-align:left;width:30px">#</th>
                    <th style="text-align:left">Description</th>
                    <th style="text-align:center;width:60px">Qty</th>
                    <th style="text-align:right;width:110px">Unit Price</th>
                    <th style="text-align:center;width:70px">Tax</th>
                    <th style="text-align:center;width:80px">Discount</th>
                    <th style="text-align:right;width:110px">Total</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>
    </div>

    <!-- Summary -->
    <div class="summary-section">
        <div class="summary-box">
            <div class="sum-row">
                <span class="sum-label">Subtotal</span>
                <span class="sum-val">${fmt(subtotal)}</span>
            </div>
            ${taxAmt > 0 ? `
            <div class="sum-row">
                <span class="sum-label">Tax</span>
                <span class="sum-val">${fmt(taxAmt)}</span>
            </div>` : ''}
            ${discAmt > 0 ? `
            <div class="sum-row disc">
                <span class="sum-label">Discount</span>
                <span class="sum-val">−${fmt(discAmt)}</span>
            </div>` : ''}
            ${paid > 0 ? `
            <div class="sum-row">
                <span class="sum-label">Amount Paid</span>
                <span class="sum-val" style="color:#059669">−${fmt(paid)}</span>
            </div>
            <div class="sum-row balance-row">
                <span class="sum-label">Balance Due</span>
                <span class="sum-val">${fmt(balance)}</span>
            </div>` : ''}
            <div class="sum-row total-row">
                <span class="sum-label">Total</span>
                <span class="sum-val">${fmt(total)}</span>
            </div>
        </div>
    </div>

    <!-- Notes & Payment -->
    <div class="bottom-section">
        <div class="bottom-block">
            ${inv.notes ? `
            <div class="bottom-title">Notes</div>
            <div class="bottom-text">${inv.notes}</div>` : `
            <div class="bottom-title">Thank You</div>
            <div class="bottom-text">We appreciate your business and look forward to working with you again. Please don't hesitate to contact us if you have any questions about this invoice.</div>`}
        </div>
        <div class="bottom-block">
            <div class="bottom-title">Payment Information</div>
            <div class="bank-row"><span class="bank-key">Pay to</span><span class="bank-val">${companyName}</span></div>
            <div class="bank-row"><span class="bank-key">Email</span><span class="bank-val">${companyEmail}</span></div>
            <div class="bank-row"><span class="bank-key">Phone</span><span class="bank-val">${companyPhone}</span></div>
            ${companyTaxId ? `<div class="bank-row"><span class="bank-key">Tax ID</span><span class="bank-val">${companyTaxId}</span></div>` : ''}
        </div>
    </div>

    <!-- Footer -->
    <div class="inv-footer">
        <div>
            <div class="footer-thanks">Thank you for your business! 🎉</div>
            <div class="footer-sub">Payment due by ${fmtDate(inv.due)}</div>
        </div>
        <div class="footer-contact">
            ${companyEmail}<br>
            ${companyPhone}<br>
            ${companyWebsite}
        </div>
    </div>
</div>

<script>
// Auto close after print
window.onafterprint = function(){ window.close(); };
<\/script>
</body>
</html>`;
}

function printProfessionalInvoice(id) {
    var invList = DB.get('invoices') || [];
    const inv = JSON.parse(JSON.stringify(invList.find(i => i.id === id) || {}));
    if (!inv || !inv.id) return;
    // Enrich with client data using shared enrichment function
    if (typeof _enrichInvoiceWithClientData === 'function') {
        _enrichInvoiceWithClientData(inv);
    } else {
        const clients = DB.get('clients') || [];
        const client  = clients.find(c => c.id === inv.clientId);
        if (client) {
            inv.clientEmail    = inv.clientEmail    || client.email    || '';
            inv.clientPhone    = inv.clientPhone    || client.phone    || '';
            inv.clientGST      = inv.clientGST      || client.taxNumber || client.gst || '';
            inv.billingAddress = inv.billingAddress || client.billingAddress || client.address || '';
            inv.billingCity    = inv.billingCity    || client.billingCity || client.city || '';
            inv.billingState   = inv.billingState   || client.billingState || client.state || '';
            inv.billingZip     = inv.billingZip     || client.billingZip || '';
        }
    }
    // Use active template (same as download)
    var activeTemplate = (typeof DB !== 'undefined') ? (DB.get('active_template', 'default') || 'default') : 'default';
    var tid = inv.template || inv.templateId || activeTemplate || 'default';
    inv.templateId = tid;
    var html = (typeof generateInvoiceHTML === 'function') ? generateInvoiceHTML(inv, tid) : generateProfessionalInvoiceHTML(inv);
    try {
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        var w = window.open(blobUrl, '_blank');
        if (w) {
            w.onload = function() { try { w.focus(); w.print(); } catch(e) {} setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000); };
        } else {
            var w2 = window.open('', '_blank', 'width=900,height=700');
            if (w2) { w2.document.write(html); w2.document.close(); w2.focus(); setTimeout(function(){ w2.print(); }, 800); }
        }
    } catch(e) {
        var w3 = window.open('', '_blank', 'width=900,height=700');
        if (w3) { w3.document.write(html); w3.document.close(); w3.focus(); setTimeout(function(){ w3.print(); }, 800); }
    }
}

function downloadProfessionalInvoice(id) {
    var invList = DB.get('invoices') || [];
    const inv = JSON.parse(JSON.stringify(invList.find(i => i.id === id) || {}));
    if (!inv || !inv.id) return;

    // Enrich invoice with client data using shared enrichment function
    if (typeof _enrichInvoiceWithClientData === 'function') {
        _enrichInvoiceWithClientData(inv);
    } else {
        const clients = DB.get('clients') || [];
        const client  = clients.find(c => c.id === inv.clientId);
        if (client) {
            inv.clientEmail    = inv.clientEmail    || client.email    || '';
            inv.clientPhone    = inv.clientPhone    || client.phone    || '';
            inv.clientGST      = inv.clientGST      || client.taxNumber || client.gst || '';
            inv.billingAddress = inv.billingAddress || client.billingAddress || client.address || '';
            inv.billingCity    = inv.billingCity    || client.billingCity || client.city || '';
            inv.billingState   = inv.billingState   || client.billingState || client.state || '';
            inv.billingZip     = inv.billingZip     || client.billingZip || '';
        }
    }

    // Use active template from template manager (3-tier fallback)
    var activeTemplate = (typeof DB !== 'undefined') ? (DB.get('active_template', 'default') || 'default') : 'default';
    var tid = inv.template || inv.templateId || activeTemplate || 'default';
    inv.templateId = tid;

    // Use the template-aware HTML generator if available, else fallback to built-in
    var html;
    if (typeof generateInvoiceHTML === 'function') {
        html = generateInvoiceHTML(inv, tid);
    } else {
        html = generateProfessionalInvoiceHTML(inv);
    }

    // Open in new tab using Blob URL (avoids popup blocker)
    try {
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var blobUrl = URL.createObjectURL(blob);
        var printWin = window.open(blobUrl, '_blank');
        if (printWin) {
            printWin.onload = function() {
                try { printWin.focus(); printWin.print(); } catch(e) {}
                setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000);
            };
            if(typeof showToast === 'function') showToast('Invoice opened — use Ctrl+P / Cmd+P to save as PDF', 'success');
        } else {
            // Popup blocked — download as .html file
            var a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'Invoice_' + (inv.number || id) + '.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 5000);
            if(typeof showToast === 'function') showToast('Invoice downloaded! Open the .html file and print to PDF', 'info');
        }
    } catch(e) {
        // Final fallback
        var w = window.open('', '_blank', 'width=960,height=840,scrollbars=yes');
        if (w) { w.document.write(html); w.document.close(); setTimeout(function(){ try{ w.print(); }catch(ex){} }, 500); }
        if(typeof showToast === 'function') showToast('Invoice opened — use Ctrl+P / Cmd+P to save as PDF', 'success');
    }
}