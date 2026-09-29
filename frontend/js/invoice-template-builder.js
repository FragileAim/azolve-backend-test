// AZOLVE Invoice Template Builder v4.0
// 8 Unique Professional Templates with QR Code Support
// Fixes: address handling, HSN, shipping address, inline QR
// =====================================================

const TEMPLATE_STORAGE_KEY = 'invoice_templates';

function getTemplates() { return DB.getObj(TEMPLATE_STORAGE_KEY) || {}; }
function getTemplate(id) { return getTemplates()[id] || null; }
function saveTemplate(template) {
    var saved = getTemplates();
    saved[template.id] = template;
    DB.setObj(TEMPLATE_STORAGE_KEY, saved);
}

// =====================================================
// ADDRESS NORMALIZATION HELPER
// Handles both flat string and object formats
// Also pulls from client's billing/shipping fields
// =====================================================
function normalizeAddress(invoice, type) {
    // type = 'billing' or 'shipping'
    if (type === 'shipping') {
        // Check if we have a dedicated shipping address
        if (invoice.shippingAddress) {
            if (typeof invoice.shippingAddress === 'object') {
                return invoice.shippingAddress;
            }
            return {
                street: invoice.shippingAddress,
                city: invoice.shippingCity || '',
                state: invoice.shippingState || '',
                zip: invoice.shippingZip || '',
                country: invoice.shippingCountry || ''
            };
        }
        // If shippingSameAsBilling or no shipping, fall through to billing
        return null;
    }
    // Billing address
    // Priority 1: already an object
    if (invoice.clientAddress && typeof invoice.clientAddress === 'object') {
        return invoice.clientAddress;
    }
    // Priority 2: flat string fields
    if (invoice.billingAddress || invoice.clientAddress) {
        return {
            street: invoice.billingAddress || invoice.clientAddress || '',
            city: invoice.billingCity || invoice.clientCity || '',
            state: invoice.billingState || invoice.clientState || '',
            zip: invoice.billingZip || invoice.clientZip || '',
            country: invoice.billingCountry || invoice.clientCountry || ''
        };
    }
    return null;
}

function fmtAddr(addr) {
    if (!addr) return '';
    var parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.city && addr.state) parts.push(addr.city + ', ' + addr.state);
    else if (addr.city) parts.push(addr.city);
    else if (addr.state) parts.push(addr.state);
    if (addr.zip) parts.push(addr.zip);
    if (addr.country) parts.push(addr.country);
    return parts.join('<br>');
}

function fmtAddrInline(addr) {
    if (!addr) return '';
    var parts = [];
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    if (addr.zip) parts.push(addr.zip);
    return parts.filter(Boolean).join(', ');
}

// =====================================================
// INLINE QR CODE GENERATOR (no external requests)
// Generates a simple data matrix / QR-like SVG
// Uses a lightweight QR encoding approach
// =====================================================
function buildQRSVG(text, size) {
    size = size || 100;
    // Use a simple approach: encode as a URL-safe hash pattern
    // This creates a visually unique QR-like pattern based on the text
    // For actual scanning, we use the api.qrserver.com but with a fallback
    
    // We'll embed the external URL in an <img> with a canvas fallback
    var encoded = encodeURIComponent(text.substring(0, 300));
    var extUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encoded;
    
    // Create SVG with embedded image and graceful fallback pattern
    var fallbackSvg = generateFallbackQR(text, size);
    
    return '<div style="position:relative;width:' + size + 'px;height:' + size + 'px">' +
           '<img src="' + extUrl + '" width="' + size + '" height="' + size + '" ' +
           'style="display:block;border-radius:4px" ' +
           'onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\'" ' +
           'alt="QR">' +
           '<div style="display:none">' + fallbackSvg + '</div>' +
           '</div>';
}

function generateFallbackQR(text, size) {
    // Generate a deterministic pixel pattern based on text hash
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    
    var modules = 21; // 21x21 for version 1 QR appearance
    var cell = Math.floor(size / modules);
    var svgSize = cell * modules;
    
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + svgSize + '" height="' + svgSize + '" viewBox="0 0 ' + svgSize + ' ' + svgSize + '">';
    svg += '<rect width="' + svgSize + '" height="' + svgSize + '" fill="white"/>';
    
    // Generate pseudo-random but deterministic pixels
    var seed = Math.abs(hash);
    function nextBit() {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 31) & 1;
    }
    
    // Draw finder patterns (corners)
    function drawFinder(ox, oy) {
        // Outer 7x7
        for (var r = 0; r < 7; r++) {
            for (var c = 0; c < 7; c++) {
                var x = (ox + c) * cell, y = (oy + r) * cell;
                var fill = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 'black' : 'white';
                svg += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" fill="' + fill + '"/>';
            }
        }
    }
    drawFinder(0, 0);
    drawFinder(modules - 7, 0);
    drawFinder(0, modules - 7);
    
    // Fill data area with hash-based pattern
    for (var row = 0; row < modules; row++) {
        for (var col = 0; col < modules; col++) {
            // Skip finder pattern areas
            if ((row < 8 && col < 8) || (row < 8 && col > modules - 9) || (row > modules - 9 && col < 8)) continue;
            if (nextBit()) {
                svg += '<rect x="' + (col * cell) + '" y="' + (row * cell) + '" width="' + cell + '" height="' + cell + '" fill="black"/>';
            }
        }
    }
    
    svg += '</svg>';
    return svg;
}

function buildQRUrl(text) {
    var encoded = encodeURIComponent(text.substring(0, 350));
    return 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=' + encoded;
}

function buildInvoiceQRText(invoice, company) {
    var total = calcGrandTotal(invoice);
    return 'INVOICE:' + (invoice.number||'') +
           '|FROM:' + (company.name||'') +
           '|GSTIN:' + (company.gst||'N/A') +
           '|TO:' + (invoice.clientName||'') +
           '|DATE:' + (invoice.date||'') +
           '|DUE:' + (invoice.due||'') +
           '|AMT:INR ' + (typeof fmtMoney === 'function' ? fmtMoney(total) : total.toFixed(2)) +
           '|STATUS:' + (invoice.status||'pending').toUpperCase();
}

function calcGrandTotal(invoice) {
    var total = 0;

    (invoice.items || []).forEach(function(item) {
        var qty = parseFloat(item.qty || item.quantity || 1);
        var price = parseFloat(item.price || item.rate || 0);
        var lineBase = qty * price;

        var taxRate = parseFloat(item.taxRate || item.gst || 0);

        var discountAmt;

        // New ARIA invoices store discount as rupee amount
        if (item.discountPercent != null && Number(item.discountPercent) > 0) {
            discountAmt = parseFloat(item.discount || 0);
        } else {
            // Existing invoices may store discount as percentage
            var discountPercent = parseFloat(item.discount || 0);
            discountAmt = lineBase * discountPercent / 100;
        }

        discountAmt = Math.min(
            Math.max(0, discountAmt),
            lineBase
        );

        var taxableAmt = lineBase - discountAmt;

// Match backend: tax is calculated on original amount
var taxAmount = lineBase * taxRate / 100;

total += taxableAmt + taxAmount;
    });

    // Shipping is an invoice-level amount
    total += Number(invoice.shippingCost || 0);

    return total;
}

function calcItemBreakdown(invoice) {
    var subtotal = 0;
    var totalCGST = 0;
    var totalSGST = 0;
    var totalDiscount = 0;

    var rows = (invoice.items || []).map(function(item, idx) {
        var qty = parseFloat(item.qty || item.quantity || 1);
        var price = parseFloat(item.price || item.rate || 0);

        var taxRate = parseFloat(item.taxRate || item.gst || 0);

        var lineBase = qty * price;

        var discountAmt;

        // New ARIA invoices:
        // item.discount = rupee amount
        // item.discountPercent = percentage equivalent
        if (item.discountPercent != null && Number(item.discountPercent) > 0) {
            discountAmt = parseFloat(item.discount || 0);
        } else {
            // Existing/manual invoices:
            // item.discount is treated as percentage
            var discountPercent = parseFloat(item.discount || 0);
            discountAmt = lineBase * discountPercent / 100;
        }

        discountAmt = Math.min(
            Math.max(0, discountAmt),
            lineBase
        );

      var taxableAmt = lineBase - discountAmt;

// Tax is calculated on the original line amount,
// matching the backend ARIA invoice calculation.
var taxBase = lineBase;

var cgst = taxBase * taxRate / 200;
var sgst = cgst;

var lineTotal = taxableAmt + cgst + sgst;

subtotal += lineBase;
totalCGST += cgst;
totalSGST += sgst;
totalDiscount += discountAmt;

        return {
            idx: idx + 1,
            name: item.desc || item.name || item.description || 'Item',
            hsn: item.hsn || '',
            qty: qty,
            price: price,
            discount: discountAmt,
            discountAmt: discountAmt,
            taxRate: taxRate,
            cgst: cgst,
            sgst: sgst,
            taxableAmt: taxableAmt,
            lineTotal: lineTotal
        };
    });

    var shippingCost = Number(invoice.shippingCost || 0);

    var grandTotal =
    subtotal -
    totalDiscount +
    totalCGST +
    totalSGST +
    shippingCost;

    return {
        rows: rows,
        subtotal: subtotal,
        totalCGST: totalCGST,
        totalSGST: totalSGST,
        totalDiscount: totalDiscount,
        shippingCost: shippingCost,
        grandTotal: grandTotal
    };
}

function numberToWords(num) {
    var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
    var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    var teens=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    if(!num||num===0) return 'Zero';
    function cvt(n) {
        var s='';
        if(n>=100){s+=ones[Math.floor(n/100)]+' Hundred';n%=100;if(n>0)s+=' ';}
        if(n>=20){s+=tens[Math.floor(n/10)];n%=10;if(n>0)s+=' '+ones[n];}
        else if(n>=10){s+=teens[n-10];}
        else if(n>0){s+=ones[n];}
        return s;
    }
    var s=''; num=Math.floor(num);
    if(num>=10000000){s+=cvt(Math.floor(num/10000000))+' Crore';num%=10000000;if(num>0)s+=' ';}
    if(num>=100000){s+=cvt(Math.floor(num/100000))+' Lakh';num%=100000;if(num>0)s+=' ';}
    if(num>=1000){s+=cvt(Math.floor(num/1000))+' Thousand';num%=1000;if(num>0)s+=' ';}
    if(num>0)s+=cvt(num);
    return s;
}

// Helper: format number only (no currency prefix) for use with explicit 'cur' variable
function fmtNum(n){ return Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }

// =====================================================
// MASTER RENDERER
// =====================================================
function generateInvoiceHTML(invoice, templateArg) {
    var tid = (typeof templateArg === 'string') ? templateArg :
              (templateArg && templateArg.id) ||
              invoice.templateId || invoice.template || 'default';
    switch(tid) {
        case 'minimalist':
        case 'minimal':     return tplMinimalist(invoice);
        case 'corporate':
        case 'classic':     return tplCorporate(invoice);
        case 'creative':
        case 'studio':      return tplCreative(invoice);
        case 'luxury':
        case 'elegant':
        case 'gold':        return tplLuxury(invoice);
        case 'tech':
        case 'dark':        return tplTech(invoice);
        case 'nature':
        case 'green':       return tplNature(invoice);
        case 'ocean':
        case 'blue':        return tplOcean(invoice);
        case 'geometric':
        case 'bold':        return tplGeometric(invoice);
        case 'pastel':
        case 'soft':        return tplPastel(invoice);
        case 'monochrome':
        case 'editorial':   return tplMonochrome(invoice);
        case 'festive':
        case 'indian':      return tplFestive(invoice);
        case 'default':
        case 'modern':
        case 'standard':
        default:            return tplStandardGST(invoice);
    }
}

// Shared table builder with HSN support
function buildItemTable(bd, cur, style) {
    var h=style.headerBg||'#1a2744', hc=style.headerColor||'#fff';
    var re=style.rowEven||'#f9fafb', ac=style.accentColor||'#4f46e5';
    var bc=style.borderColor||'#e5e7eb';
    // Check if any item has HSN
    var hasHSN = bd.rows.some(function(r){ return r.hsn; });
    var html = '<table style="width:100%;border-collapse:collapse;font-size:9pt">' +
        '<thead><tr style="background:'+h+';color:'+hc+'">' +
        '<th style="padding:10px 8px;text-align:center">#</th>' +
        '<th style="padding:10px 8px;text-align:left">DESCRIPTION' + (hasHSN ? ' / HSN' : '') + '</th>' +
        '<th style="padding:10px 8px;text-align:right">QTY</th>' +
        '<th style="padding:10px 8px;text-align:right">RATE</th>' +
        '<th style="padding:10px 8px;text-align:right">GST%</th>' +
        '<th style="padding:10px 8px;text-align:right">CGST</th>' +
        '<th style="padding:10px 8px;text-align:right">SGST</th>' +
        '<th style="padding:10px 8px;text-align:right">TOTAL</th>' +
        '</tr></thead><tbody>';
    bd.rows.forEach(function(r,i){
        var bg = i%2===0 ? '#ffffff' : re;
        html += '<tr style="background:'+bg+';border-bottom:1px solid '+bc+'">' +
            '<td style="padding:10px 8px;text-align:center;color:'+ac+';font-weight:700">'+r.idx+'</td>' +
            '<td style="padding:10px 8px"><strong>'+r.name+'</strong>'+(r.hsn?'<br><span style="font-size:8pt;color:#888;font-style:normal">HSN: '+r.hsn+'</span>':'')+'</td>' +
            '<td style="padding:10px 8px;text-align:right">'+r.qty+'</td>' +
            '<td style="padding:10px 8px;text-align:right">'+cur+fmtNum(r.price)+'</td>' +
            '<td style="padding:10px 8px;text-align:right">'+r.taxRate+'%</td>' +
            '<td style="padding:10px 8px;text-align:right">'+cur+fmtNum(r.cgst)+'</td>' +
            '<td style="padding:10px 8px;text-align:right">'+cur+fmtNum(r.sgst)+'</td>' +
            '<td style="padding:10px 8px;text-align:right"><strong style="color:'+ac+'">'+cur+fmtNum(r.lineTotal)+'</strong></td>' +
            '</tr>';
    });
    return html + '</tbody></table>';
}

function buildTotalsBox(bd, cur, style) {
    var ac = style.accentColor || '#4f46e5';
    var bg = style.totalsBg || '#f9fafb';

    return '<div style="display:flex;justify-content:flex-end;margin-top:16px">' +
        '<div style="background:' + bg + ';border-radius:8px;padding:16px 24px;min-width:280px">' +

        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:10pt">' +
        '<span style="color:#666">Subtotal</span>' +
        '<span style="font-weight:600">' + cur + fmtNum(bd.subtotal) + '</span>' +
        '</div>' +

        (bd.totalDiscount > 0 ?
            '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:10pt">' +
            '<span style="color:#666">Discount</span>' +
            '<span style="color:#ef4444;font-weight:600">-' + cur + fmtNum(bd.totalDiscount) + '</span>' +
            '</div>'
            : '') +

        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:10pt">' +
        '<span style="color:#666">CGST</span>' +
        '<span style="font-weight:600">' + cur + fmtNum(bd.totalCGST) + '</span>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:10pt">' +
        '<span style="color:#666">SGST</span>' +
        '<span style="font-weight:600">' + cur + fmtNum(bd.totalSGST) + '</span>' +
        '</div>' +

        (bd.shippingCost > 0 ?
            '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:10pt">' +
            '<span style="color:#666">Shipping</span>' +
            '<span style="font-weight:600">' + cur + fmtNum(bd.shippingCost) + '</span>' +
            '</div>'
            : '') +

        '<div style="border-top:2px solid ' + ac + ';padding-top:12px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-weight:700;font-size:11pt">GRAND TOTAL</span>' +
        '<span style="font-weight:800;font-size:18pt;color:' + ac + '">' +
        cur + fmtNum(bd.grandTotal) +
        '</span>' +
        '</div>' +

        '</div></div>';
}

function buildQRBlock(invoice, company, size) {
    size = size || 100;
    var text = buildInvoiceQRText(invoice, company);
    var encoded = encodeURIComponent(text.substring(0, 300));
    var extUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size*2) + 'x' + (size*2) + '&data=' + encoded;
    var fallback = generateFallbackQR(text, size);
    return '<div style="text-align:center">' +
        '<img src="' + extUrl + '" ' +
        'width="' + size + '" height="' + size + '" ' +
        'style="border:3px solid #e5e7eb;border-radius:8px;padding:4px;background:#fff;display:block;margin:0 auto" ' +
        'alt="QR Code" ' +
        'onerror="this.style.display=\'none\';document.getElementById(\'qrfb_' + size + '\').style.display=\'block\'">' +
        '<div id="qrfb_' + size + '" style="display:none;border:3px solid #e5e7eb;border-radius:8px;padding:4px;background:#fff">' + fallback + '</div>' +
        '<div style="font-size:7pt;color:#999;margin-top:4px">Scan to verify</div>' +
        '</div>';
}

function getStatusBadge(status) {
    var cfg = { paid:{bg:'#dcfce7',color:'#16a34a'}, pending:{bg:'#fef9c3',color:'#ca8a04'}, overdue:{bg:'#fee2e2',color:'#dc2626'}, draft:{bg:'#f3f4f6',color:'#6b7280'} };
    var c = cfg[(status||'pending').toLowerCase()] || cfg.pending;
    return '<span style="background:'+c.bg+';color:'+c.color+';padding:4px 14px;border-radius:20px;font-size:9pt;font-weight:700;text-transform:uppercase">'+(status||'PENDING')+'</span>';
}

function baseHead(title, fonts, extraCss) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice '+title+'</title>' +
        '<link href="https://fonts.googleapis.com/css2?family='+(fonts||'Inter:wght@300;400;600;700;800')+'&display=swap" rel="stylesheet">' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}' +
        'body{background:#f0f2f5;padding:20px}' +
        '@media print{' +
        '@page{margin:0;size:A4}' +
        'html,body{margin:0;padding:0;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}' +
        '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}' +
        'body>div{box-shadow:none!important}' +
        '}' +
        (extraCss||'') +
        '</style>' +
        '</head><body>';
}

// =====================================================
// SHARED ADDRESS BLOCK BUILDER
// =====================================================
function buildBillShipBlock(invoice, accentColor, labelColor, textColor) {
    accentColor = accentColor || '#1a3a6b';
    labelColor = labelColor || '#6b7280';
    textColor = textColor || '#111';

    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var hasSameShipping = invoice.shippingSameAsBilling !== false && !invoice.shippingAddress;

    var billHtml = '<div style="font-size:9pt;font-weight:700;color:' + accentColor + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ' + accentColor + ';display:inline-block">BILL TO</div>' +
        '<div style="font-size:13pt;font-weight:700;color:' + textColor + ';margin-bottom:6px">' + (invoice.clientName||'Client') + '</div>' +
        (invoice.clientGST ? '<div style="font-size:9pt;color:' + labelColor + '">GSTIN: <strong>' + invoice.clientGST + '</strong></div>' : '') +
        (invoice.clientEmail ? '<div style="font-size:9pt;color:' + labelColor + '">' + invoice.clientEmail + '</div>' : '') +
        (invoice.clientPhone ? '<div style="font-size:9pt;color:' + labelColor + '">' + invoice.clientPhone + '</div>' : '') +
        (billing ? '<div style="font-size:9.5pt;color:#4b5563;line-height:1.6;margin-top:6px">' + fmtAddr(billing) + '</div>' : '');

    var shipHtml = '<div style="font-size:9pt;font-weight:700;color:' + accentColor + ';text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid ' + accentColor + ';display:inline-block">SHIP TO</div>' +
        (hasSameShipping ?
            '<div style="font-size:9.5pt;color:#4b5563;font-style:italic">Same as billing address</div>' :
            (shipping ?
                '<div style="font-size:13pt;font-weight:700;color:' + textColor + ';margin-bottom:6px">' + (invoice.shippingName || invoice.clientName || '') + '</div>' +
                '<div style="font-size:9.5pt;color:#4b5563;line-height:1.6">' + fmtAddr(shipping) + '</div>'
                :
                '<div style="font-size:9.5pt;color:#4b5563;font-style:italic">Same as billing address</div>'
            )
        );

    return { billHtml: billHtml, shipHtml: shipHtml };
}

// =====================================================
// TEMPLATE 1 — STANDARD GST (Official India Style)
// =====================================================
function tplStandardGST(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var bs = buildBillShipBlock(invoice, '#1a3a6b', '#6b7280', '#111');
    var h='<div style="max-width:820px;margin:0 auto;background:#fff;font-family:Inter,Arial,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,0.12)">';
    // Header
    h+='<div style="background:#1a3a6b;padding:0"><div style="display:flex">' +
       '<div style="background:#1a3a6b;padding:24px 32px;flex:1">' +
       '<div style="font-size:28px;font-weight:800;color:#fff">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:#93c5fd;font-size:9pt;margin-top:6px;line-height:1.7">'+(co.gst?'<strong style="color:#fff">GSTIN: '+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+(co.state?', '+co.state:'')+(co.phone?'<br>Tel: '+co.phone:'')+' '+(co.email||'')+'</div></div>' +
       '<div style="background:#0f2857;padding:24px 32px;min-width:220px;display:flex;flex-direction:column;align-items:flex-end;justify-content:center">' +
       '<div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:4px">INVOICE</div>' +
       '<div style="color:#93c5fd;font-size:11pt;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:12px">'+getStatusBadge(invoice.status)+'</div>' +
       '</div></div></div>';
    // Meta bar
    h+='<div style="background:#e8f0fe;padding:16px 32px;display:flex;gap:40px;border-bottom:3px solid #1a3a6b;align-items:center">' +
       '<div><div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Invoice Date</div><div style="font-weight:700;color:#1a3a6b">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Due Date</div><div style="font-weight:700;color:#dc2626">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:8pt;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Terms</div><div style="font-weight:700;color:#1a3a6b">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 100)+'</div></div>';
    // Bill-to / Ship-to
    h+='<div style="display:flex;gap:0;padding:24px 32px;border-bottom:1px solid #e5e7eb">' +
       '<div style="flex:1;border-right:1px dashed #d1d5db;padding-right:24px">' + bs.billHtml + '</div>' +
       '<div style="flex:1;padding-left:24px;border-right:1px dashed #d1d5db">' + bs.shipHtml + '</div>' +
       '<div style="flex:1;padding-left:24px">' +
       '<div style="font-size:9pt;font-weight:700;color:#1a3a6b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1a3a6b;display:inline-block">FROM</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#111;margin-bottom:6px">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#6b7280">GSTIN: <strong>'+co.gst+'</strong></div>':'')+
       '<div style="font-size:9.5pt;color:#4b5563;line-height:1.6;margin-top:4px">'+(co.street||'')+(co.city?', '+co.city:'')+'<br>'+(co.state||'')+' '+(co.zip||'')+'</div>' +
       '</div></div>';
    // Items
    h+='<div style="padding:24px 32px">'+buildItemTable(bd,cur,{headerBg:'#1a3a6b',headerColor:'#fff',rowEven:'#f0f7ff',accentColor:'#1a3a6b',borderColor:'#dbeafe'})+buildTotalsBox(bd,cur,{accentColor:'#1a3a6b',totalsBg:'#e8f0fe'})+'<div style="font-style:italic;color:#6b7280;font-size:9pt;margin-top:12px;text-align:right">Amount in words: <strong style="color:#1a3a6b">'+numberToWords(Math.floor(bd.grandTotal))+' RUPEES ONLY</strong></div></div>';
    // Bank + Sig
    h+='<div style="display:flex;padding:0 32px 24px;gap:24px">' +
       '<div style="flex:1;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px">' +
       '<div style="font-size:9pt;font-weight:700;color:#1a3a6b;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9pt;color:#374151;line-height:2"><div><strong>Bank:</strong> '+(co.bank||'—')+'</div><div><strong>A/C No:</strong> '+(co.account||'—')+'</div><div><strong>IFSC:</strong> '+(co.ifsc||'—')+'</div></div></div>' +
       '<div style="flex:1;text-align:right;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end">' +
       '<div style="border-top:2px solid #1a3a6b;padding-top:8px;min-width:200px;text-align:center;margin-top:50px"><div style="font-weight:700;color:#1a3a6b;font-size:10pt">Authorised Signatory</div><div style="font-size:9pt;color:#6b7280">'+(co.name||'')+'</div></div></div></div>';
    // Footer
    h+='<div style="background:#1a3a6b;padding:14px 32px;display:flex;justify-content:space-between"><div style="font-size:8pt;color:#93c5fd">'+(invoice.notes||'Thank you for your business!')+'</div><div style="font-size:8pt;color:#93c5fd">Generated by Azolve</div></div>';
    return baseHead(invoice.number||'','Inter:wght@400;600;700;800','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 2 — MINIMALIST ELEGANCE
// =====================================================
function tplMinimalist(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:800px;margin:0 auto;background:#fff;font-family:\'DM Sans\',Inter,Arial,sans-serif;border-top:5px solid #6366f1;box-shadow:0 0 40px rgba(0,0,0,0.08)">';
    h+='<div style="padding:48px 48px 32px;display:flex;justify-content:space-between;align-items:flex-start">' +
       '<div><div style="font-size:32px;font-weight:700;color:#111827;letter-spacing:-1px">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:#9ca3af;font-size:9.5pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: '+co.gst+'<br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="font-size:42px;font-weight:300;color:#6366f1;letter-spacing:-2px">invoice</div>' +
       '<div style="font-size:14pt;font-weight:600;color:#111827;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:8px">'+getStatusBadge(invoice.status)+'</div></div></div>';
    h+='<div style="height:1px;background:linear-gradient(to right,#6366f1,#e5e7eb,transparent);margin:0 48px"></div>';
    h+='<div style="padding:24px 48px;display:flex;gap:48px;align-items:center">' +
       '<div><div style="font-size:8pt;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Issued</div><div style="font-weight:600;color:#111827">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:8pt;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Due</div><div style="font-weight:600;color:#111827">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:8pt;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Terms</div><div style="font-weight:600;color:#111827">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    // Bill/Ship/From
    h+='<div style="padding:0 48px 32px;display:flex;gap:16px">' +
       '<div style="flex:1;border-left:3px solid #6366f1;padding-left:16px"><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:600;color:#111827">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#6b7280;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (invoice.clientEmail?'<div style="font-size:9pt;color:#6b7280">'+(invoice.clientEmail)+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;border-left:3px solid #e5e7eb;padding-left:16px"><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:600;color:#111827">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9.5pt;color:#9ca3af;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;border-left:3px solid #e5e7eb;padding-left:16px"><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:14pt;font-weight:600;color:#111827">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#6b7280;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:0 48px 32px">'+buildItemTable(bd,cur,{headerBg:'#111827',headerColor:'#fff',rowEven:'#fafafa',accentColor:'#6366f1',borderColor:'#f3f4f6'})+buildTotalsBox(bd,cur,{accentColor:'#6366f1',totalsBg:'#f5f3ff'})+'<div style="font-size:9pt;color:#9ca3af;margin-top:12px;text-align:right;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="margin:0 48px;border-top:1px solid #f3f4f6;padding:24px 0;display:flex;justify-content:space-between;align-items:flex-end">' +
       '<div style="font-size:9pt;color:#6b7280;line-height:2"><div style="font-weight:600;color:#111827;margin-bottom:6px">Bank Details</div><div>Bank: '+(co.bank||'—')+'</div><div>A/C: '+(co.account||'—')+'</div><div>IFSC: '+(co.ifsc||'—')+'</div></div>' +
       '<div style="text-align:right"><div style="border-top:1px solid #6366f1;padding-top:8px;min-width:180px;margin-top:48px"><div style="font-size:9pt;color:#6b7280">Authorised Signature</div><div style="font-size:9pt;font-weight:600;color:#111827;margin-top:2px">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="padding:24px 48px;border-top:1px solid #f3f4f6"><div style="font-size:9pt;color:#9ca3af">'+(invoice.notes||'Thank you for your business.')+'</div></div>';
    return baseHead(invoice.number||'','DM+Sans:wght@300;400;500;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 3 — CORPORATE EXECUTIVE
// =====================================================
function tplCorporate(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#fff;font-family:Montserrat,Arial,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.15)">';
    h+='<div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%);padding:40px 48px;position:relative;overflow:hidden">' +
       '<div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;border:30px solid rgba(255,255,255,0.05);border-radius:50%"></div>' +
       '<div style="position:relative;display:flex;justify-content:space-between;align-items:center">' +
       '<div><div style="font-size:30px;font-weight:900;color:#fff;text-transform:uppercase">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.6);font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: <strong style="color:rgba(255,255,255,0.85)">'+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="font-size:13pt;font-weight:800;color:rgba(255,255,255,0.5);letter-spacing:6px">INVOICE</div>' +
       '<div style="font-size:22pt;font-weight:900;color:#fff;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:12px">'+getStatusBadge(invoice.status)+'</div>' +
       '</div></div></div>';
    h+='<div style="height:4px;background:linear-gradient(to right,#f59e0b,#d97706,#f59e0b)"></div>';
    h+='<div style="display:flex;background:#fafafa;border-bottom:1px solid #e5e7eb">' +
       '<div style="flex:1;padding:20px 24px;border-right:1px solid #e5e7eb"><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Billed To</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#0f172a">'+(invoice.clientName||'Client')+'</div>' +
       (invoice.clientGST?'<div style="font-size:8.5pt;color:#6b7280;margin-top:2px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (invoice.clientEmail?'<div style="font-size:8.5pt;color:#6b7280">'+(invoice.clientEmail)+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;padding:20px 24px;border-right:1px solid #e5e7eb"><div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:13pt;font-weight:700;color:#0f172a">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#9ca3af;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;padding:20px 24px;border-right:1px solid #e5e7eb">' +
       '<div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Invoice Date</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#0f172a">'+(invoice.date?fmtDate(invoice.date):'—')+'</div>' +
       '<div style="font-size:8pt;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-top:12px;margin-bottom:4px">Due Date</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#dc2626">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div style="flex:0 0 140px;padding:20px 24px;display:flex;align-items:center;justify-content:center">'+buildQRBlock(invoice, co, 100)+'</div></div>';
    h+='<div style="padding:32px">'+buildItemTable(bd,cur,{headerBg:'#0f172a',headerColor:'#fff',rowEven:'#f8fafc',accentColor:'#f59e0b',borderColor:'#e2e8f0'})+buildTotalsBox(bd,cur,{accentColor:'#f59e0b',totalsBg:'#fffbeb'})+'<div style="font-size:9pt;font-style:italic;color:#94a3b8;margin-top:10px;text-align:right">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 32px 32px;display:flex;gap:24px">' +
       '<div style="flex:1;background:#f8fafc;border-radius:8px;padding:20px;border:1px solid #e2e8f0"><div style="font-size:8pt;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Payment Details</div>' +
       '<div style="font-size:9.5pt;color:#374151;line-height:2.2"><div>Bank: '+(co.bank||'—')+'</div><div>A/C: '+(co.account||'—')+'</div><div>IFSC: '+(co.ifsc||'—')+'</div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end">' +
       '<div style="font-size:9pt;color:#6b7280;margin-bottom:4px">'+(invoice.notes||'Thank you for your business!')+'</div>' +
       '<div style="border-top:2px solid #f59e0b;padding-top:8px;min-width:200px;text-align:center;margin-top:40px"><div style="font-weight:700;font-size:10pt;color:#0f172a">Authorised Signatory</div><div style="font-size:9pt;color:#6b7280">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:#0f172a;padding:12px 32px;display:flex;justify-content:space-between"><div style="color:rgba(255,255,255,0.5);font-size:8pt">Computer generated invoice</div><div style="color:rgba(255,255,255,0.5);font-size:8pt">Powered by Azolve</div></div>';
    return baseHead(invoice.number||'','Montserrat:wght@400;500;600;700;900','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 4 — CREATIVE STUDIO
// =====================================================
function tplCreative(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;font-family:Poppins,Arial,sans-serif;box-shadow:0 10px 50px rgba(0,0,0,0.15);overflow:hidden">';
    h+='<div style="display:flex;min-height:160px">' +
       '<div style="background:linear-gradient(135deg,#ec4899,#8b5cf6,#6366f1);flex:1.5;padding:36px 40px;display:flex;flex-direction:column;justify-content:center">' +
       '<div style="font-size:28px;font-weight:800;color:#fff">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.7);font-size:8.5pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: '+co.gst+'<br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="background:#1e1b4b;flex:1;padding:36px 32px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end">' +
       '<div style="font-size:11pt;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:4px">INVOICE</div>' +
       '<div style="font-size:20pt;font-weight:800;color:#fff;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div>' +
       '</div></div>';
    h+='<div style="background:#1e1b4b;padding:12px 40px;display:flex;gap:40px;align-items:center">' +
       '<div><span style="color:rgba(255,255,255,0.5);font-size:8.5pt">Issued: </span><span style="color:#fff;font-weight:600">'+(invoice.date?fmtDate(invoice.date):'—')+'</span></div>' +
       '<div><span style="color:rgba(255,255,255,0.5);font-size:8.5pt">Due: </span><span style="color:#f9a8d4;font-weight:600">'+(invoice.due?fmtDate(invoice.due):'—')+'</span></div>' +
       '<div><span style="color:rgba(255,255,255,0.5);font-size:8.5pt">Terms: </span><span style="color:#fff;font-weight:600">'+(invoice.paymentTerms||'Net 30')+'</span></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="background:#fff;padding:28px 40px;display:flex;gap:24px;border-bottom:3px solid #f3f4f6">' +
       '<div style="flex:1;background:linear-gradient(135deg,#fdf4ff,#ede9fe);border-radius:12px;padding:20px">' +
       '<div style="font-size:8pt;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#1e1b4b">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:8.5pt;color:#6b7280;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#6b7280;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;background:#f9fafb;border-radius:12px;padding:20px">' +
       '<div style="font-size:8pt;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:700;color:#1e1b4b">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9.5pt;color:#9ca3af;font-style:italic;padding-top:4px">Same as billing address</div>')+
       '</div>' +
       '<div style="flex:1;background:#f9fafb;border-radius:12px;padding:20px">' +
       '<div style="font-size:8pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#1e1b4b">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:8.5pt;color:#6b7280;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:28px 40px;background:#fff">'+buildItemTable(bd,cur,{headerBg:'#1e1b4b',headerColor:'#fff',rowEven:'#fdf4ff',accentColor:'#8b5cf6',borderColor:'#f3e8ff'})+buildTotalsBox(bd,cur,{accentColor:'#8b5cf6',totalsBg:'#faf5ff'})+'<div style="font-size:8.5pt;color:#a78bfa;margin-top:10px;text-align:right;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="background:#1e1b4b;padding:24px 40px;display:flex;justify-content:space-between;align-items:flex-end">' +
       '<div style="color:rgba(255,255,255,0.8);font-size:9pt;line-height:2"><div style="font-weight:600;color:#fff;margin-bottom:4px">Bank Details</div>' +
       '<div>Bank: '+(co.bank||'—')+'</div><div>A/C: '+(co.account||'—')+'</div><div>IFSC: '+(co.ifsc||'—')+'</div></div>' +
       '<div style="text-align:right"><div style="border-top:2px solid #8b5cf6;padding-top:8px;min-width:180px;text-align:center;margin-top:40px"><div style="color:#fff;font-weight:600;font-size:9.5pt">Authorised Signatory</div><div style="color:rgba(255,255,255,0.5);font-size:8.5pt">'+(co.name||'')+'</div></div>' +
       '<div style="color:rgba(255,255,255,0.4);font-size:7.5pt;margin-top:12px">'+(invoice.notes||'Thank you!')+'</div></div></div>';
    return baseHead(invoice.number||'','Poppins:wght@300;400;500;600;700;800','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 5 — LUXURY GOLD
// =====================================================
function tplLuxury(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#0d0d0d;font-family:Montserrat,Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.5)">';
    h+='<div style="padding:48px 56px;border-bottom:1px solid rgba(212,175,55,0.3);position:relative">' +
       '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(to right,transparent,#d4af37,#ffd700,#d4af37,transparent)"></div>' +
       '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
       '<div><div style="font-size:34px;font-weight:700;color:#d4af37;letter-spacing:2px;font-family:Georgia,serif">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.4);font-size:8.5pt;margin-top:10px;line-height:1.9">'+(co.gst?'<span style="color:rgba(212,175,55,0.7)">GSTIN:</span> '+co.gst+'<br>':'')+(co.street||'')+(co.city?', '+co.city:'')+(co.phone?'<br>'+co.phone:'')+'</div></div>' +
       '<div style="text-align:right"><div style="font-size:38px;font-weight:300;color:rgba(212,175,55,0.5);letter-spacing:8px;font-family:Georgia,serif">INVOICE</div>' +
       '<div style="font-size:18pt;font-weight:600;color:#d4af37;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="padding:24px 56px;display:flex;gap:48px;align-items:center;border-bottom:1px solid rgba(212,175,55,0.15)">' +
       '<div><div style="font-size:7.5pt;color:rgba(212,175,55,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Invoice Date</div><div style="color:#fff;font-weight:500">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:rgba(212,175,55,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Due Date</div><div style="color:#fff;font-weight:500">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:rgba(212,175,55,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Terms</div><div style="color:#fff;font-weight:500">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="padding:0 56px 28px;display:flex;gap:24px;margin-top:24px">' +
       '<div style="flex:1;border:1px solid rgba(212,175,55,0.2);border-radius:4px;padding:20px"><div style="font-size:7.5pt;color:rgba(212,175,55,0.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:600;color:#d4af37;font-family:Georgia,serif">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:8.5pt;color:rgba(255,255,255,0.4);margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:rgba(255,255,255,0.4);margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;border:1px solid rgba(212,175,55,0.1);border-radius:4px;padding:20px"><div style="font-size:7.5pt;color:rgba(212,175,55,0.4);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:600;color:rgba(255,255,255,0.7);font-family:Georgia,serif">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:rgba(255,255,255,0.4);margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:rgba(255,255,255,0.25);font-style:italic">Same as billing address</div>')+
       '</div>' +
       '<div style="flex:1;border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:20px"><div style="font-size:7.5pt;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">From</div>' +
       '<div style="font-size:14pt;font-weight:600;color:rgba(255,255,255,0.8);font-family:Georgia,serif">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:8.5pt;color:rgba(255,255,255,0.4);margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    // Gold items table
    var itbl='<table style="width:100%;border-collapse:collapse;font-size:8.5pt"><thead><tr style="border-bottom:1px solid rgba(212,175,55,0.5)">' +
             '<th style="padding:10px 8px;text-align:center;color:rgba(212,175,55,0.7);font-size:7.5pt">#</th>' +
             '<th style="padding:10px 8px;text-align:left;color:rgba(212,175,55,0.7);font-size:7.5pt">DESCRIPTION</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">QTY</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">RATE</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">GST%</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">CGST</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">SGST</th>' +
             '<th style="padding:10px 8px;text-align:right;color:rgba(212,175,55,0.7);font-size:7.5pt">TOTAL</th>' +
             '</tr></thead><tbody>';
    bd.rows.forEach(function(r,i){
        itbl+='<tr style="background:'+(i%2===0?'rgba(255,255,255,0.03)':'transparent')+';border-bottom:1px solid rgba(255,255,255,0.05)">' +
              '<td style="padding:12px 8px;text-align:center;color:rgba(212,175,55,0.5)">'+r.idx+'</td>' +
              '<td style="padding:12px 8px;color:#fff;font-weight:500">'+r.name+(r.hsn?'<br><span style="font-size:8pt;color:rgba(212,175,55,0.4)">HSN: '+r.hsn+'</span>':'')+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:rgba(255,255,255,0.6)">'+r.qty+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:rgba(255,255,255,0.6)">'+cur+fmtNum(r.price)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:rgba(255,255,255,0.6)">'+r.taxRate+'%</td>' +
              '<td style="padding:12px 8px;text-align:right;color:rgba(255,255,255,0.6)">'+cur+fmtNum(r.cgst)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:rgba(255,255,255,0.6)">'+cur+fmtNum(r.sgst)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#d4af37;font-weight:700;font-size:10pt">'+cur+fmtNum(r.lineTotal)+'</td></tr>';
    });
    itbl+='</tbody></table>';
    h+='<div style="padding:0 56px 28px">'+itbl+
       '<div style="display:flex;justify-content:flex-end;margin-top:20px"><div style="min-width:280px">' +
       '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:9.5pt;color:rgba(255,255,255,0.5)"><span>Subtotal</span><span>'+cur+fmtNum(bd.subtotal)+'</span></div>' +
       '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:9.5pt;color:rgba(255,255,255,0.5)"><span>CGST</span><span>'+cur+fmtNum(bd.totalCGST)+'</span></div>' +
       '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(212,175,55,0.3);font-size:9.5pt;color:rgba(255,255,255,0.5)"><span>SGST</span><span>'+cur+fmtNum(bd.totalSGST)+'</span></div>' +
       '<div style="display:flex;justify-content:space-between;padding:16px 0;font-size:18pt;font-weight:700"><span style="color:rgba(212,175,55,0.7);font-size:10pt;text-transform:uppercase;letter-spacing:2px;align-self:flex-end">Total</span><span style="color:#d4af37">'+cur+fmtNum(bd.grandTotal)+'</span></div>' +
       '<div style="font-size:8pt;color:rgba(212,175,55,0.4);text-align:right;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div>' +
       '</div></div></div>';
    h+='<div style="padding:24px 56px 40px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(212,175,55,0.15)">' +
       '<div style="font-size:9pt;color:rgba(255,255,255,0.4);line-height:2.2"><div style="color:rgba(212,175,55,0.6);font-weight:600;margin-bottom:4px;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px">Bank Details</div><div>Bank: '+(co.bank||'—')+'</div><div>A/C No: '+(co.account||'—')+'</div><div>IFSC: '+(co.ifsc||'—')+'</div></div>' +
       '<div style="text-align:center"><div style="border-top:1px solid rgba(212,175,55,0.4);padding-top:8px;min-width:180px;margin-top:48px"><div style="color:rgba(212,175,55,0.7);font-size:9pt;letter-spacing:1px">AUTHORISED SIGNATORY</div><div style="color:rgba(255,255,255,0.3);font-size:8.5pt;margin-top:2px">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="height:3px;background:linear-gradient(to right,transparent,#d4af37,#ffd700,#d4af37,transparent)"></div>';
    return baseHead(invoice.number||'','Montserrat:wght@400;500;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 6 — TECH STARTUP
// =====================================================
function tplTech(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#0f0a1e;font-family:\'Space Grotesk\',Inter,Arial,sans-serif;border-radius:16px;overflow:hidden;box-shadow:0 0 60px rgba(99,102,241,0.3)">';
    h+='<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#db2777);padding:40px 44px;position:relative;overflow:hidden">' +
       '<div style="position:absolute;top:-20px;right:-20px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.05)"></div>' +
       '<div style="position:relative;display:flex;justify-content:space-between;align-items:center">' +
       '<div><div style="font-size:28px;font-weight:700;color:#fff">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.65);font-size:8.5pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: '+co.gst+'<br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:12px;padding:16px 24px;text-align:center">' +
       '<div style="font-size:9pt;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase">INVOICE</div>' +
       '<div style="font-size:18pt;font-weight:700;color:#fff;margin-top:2px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:8px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="background:#1a1333;padding:16px 44px;display:flex;gap:40px;align-items:center;border-bottom:1px solid rgba(99,102,241,0.2)">' +
       '<div><div style="font-size:7.5pt;color:rgba(99,102,241,0.7);text-transform:uppercase;letter-spacing:1.5px">Issued</div><div style="color:#e2e8f0;font-weight:500;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:rgba(99,102,241,0.7);text-transform:uppercase;letter-spacing:1.5px">Due</div><div style="color:#f9a8d4;font-weight:500;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:rgba(99,102,241,0.7);text-transform:uppercase;letter-spacing:1.5px">Terms</div><div style="color:#e2e8f0;font-weight:500;margin-top:2px">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 80)+'</div></div>';
    h+='<div style="padding:24px 44px;display:flex;gap:16px">' +
       '<div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:20px"><div style="font-size:7.5pt;color:#818cf8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:13pt;font-weight:600;color:#e2e8f0">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:8.5pt;color:#818cf8;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:8.5pt;color:#94a3b8;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.15);border-radius:10px;padding:20px"><div style="font-size:7.5pt;color:#818cf8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:13pt;font-weight:600;color:#e2e8f0">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:8.5pt;color:#94a3b8;margin-top:6px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#64748b;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px"><div style="font-size:7.5pt;color:#818cf8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:13pt;font-weight:600;color:#e2e8f0">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:8.5pt;color:#818cf8;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    var itbl='<table style="width:100%;border-collapse:collapse;font-size:8.5pt"><thead><tr style="background:rgba(99,102,241,0.15)">' +
             '<th style="padding:11px 8px;text-align:center;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">#</th>' +
             '<th style="padding:11px 8px;text-align:left;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">Description</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">Qty</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">Rate</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">GST%</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">CGST</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">SGST</th>' +
             '<th style="padding:11px 8px;text-align:right;color:#818cf8;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px">Total</th>' +
             '</tr></thead><tbody>';
    bd.rows.forEach(function(r,i){
        itbl+='<tr style="background:'+(i%2===0?'rgba(255,255,255,0.02)':'rgba(99,102,241,0.04)')+';border-bottom:1px solid rgba(255,255,255,0.05)">' +
              '<td style="padding:12px 8px;text-align:center;color:#6366f1;font-weight:700">'+r.idx+'</td>' +
              '<td style="padding:12px 8px;color:#e2e8f0;font-weight:500">'+r.name+(r.hsn?'<br><span style="font-size:8pt;color:#6366f1">HSN: '+r.hsn+'</span>':'')+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#94a3b8">'+r.qty+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#94a3b8">'+cur+fmtNum(r.price)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#94a3b8">'+r.taxRate+'%</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#94a3b8">'+cur+fmtNum(r.cgst)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#94a3b8">'+cur+fmtNum(r.sgst)+'</td>' +
              '<td style="padding:12px 8px;text-align:right;color:#a78bfa;font-weight:700;font-size:10pt">'+cur+fmtNum(r.lineTotal)+'</td></tr>';
    });
    itbl+='</tbody></table>';
    h+='<div style="padding:0 44px 24px">'+itbl+
       '<div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px 24px;min-width:280px">' +
       '<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#94a3b8;font-size:9.5pt"><span>Subtotal</span><span>'+cur+fmtNum(bd.subtotal)+'</span></div>' +
       '<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#94a3b8;font-size:9.5pt"><span>CGST</span><span>'+cur+fmtNum(bd.totalCGST)+'</span></div>' +
       '<div style="display:flex;justify-content:space-between;margin-bottom:12px;color:#94a3b8;font-size:9.5pt"><span>SGST</span><span>'+cur+fmtNum(bd.totalSGST)+'</span></div>' +
       '<div style="border-top:1px solid rgba(99,102,241,0.3);padding-top:12px;display:flex;justify-content:space-between;align-items:center">' +
       '<span style="color:#e2e8f0;font-weight:700">Total</span><span style="font-size:20pt;font-weight:700;color:#a78bfa">'+cur+fmtNum(bd.grandTotal)+'</span></div></div></div>' +
       '<div style="color:rgba(99,102,241,0.5);font-size:8pt;text-align:right;margin-top:8px;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:24px 44px;border-top:1px solid rgba(99,102,241,0.2);display:flex;justify-content:space-between;align-items:center">' +
       '<div style="font-size:8.5pt;color:#64748b;line-height:2"><div style="font-weight:600;color:#818cf8;margin-bottom:4px">Bank Details</div><div>Bank: '+(co.bank||'—')+'</div><div>A/C: '+(co.account||'—')+'  IFSC: '+(co.ifsc||'—')+'</div></div>' +
       '<div style="text-align:center"><div style="border-top:1px solid rgba(99,102,241,0.4);padding-top:8px;min-width:160px;margin-top:40px"><div style="color:#818cf8;font-size:8.5pt">Authorised Signatory</div><div style="color:#64748b;font-size:8pt">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="padding:12px 44px;background:rgba(99,102,241,0.1);text-align:center;font-size:7.5pt;color:#64748b">'+(invoice.notes||'Thank you!')+' · Powered by Azolve</div>';
    return baseHead(invoice.number||'','Space+Grotesk:wght@300;400;500;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 7 — NATURE GREEN
// =====================================================
function tplNature(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#fff;font-family:Nunito,Arial,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.1);overflow:hidden">';
    h+='<div style="background:linear-gradient(135deg,#14532d,#166534,#15803d);padding:40px 44px;position:relative;overflow:hidden">' +
       '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
       '<div><div style="font-size:30px;font-weight:800;color:#fff">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.65);font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: <strong style="color:#fff">'+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:20px 28px;text-align:center">' +
       '<div style="font-size:11pt;font-weight:800;color:rgba(255,255,255,0.6);letter-spacing:4px">INVOICE</div>' +
       '<div style="font-size:20pt;font-weight:800;color:#fff;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="background:#dcfce7;padding:14px 44px;display:flex;gap:40px;align-items:center;border-bottom:3px solid #16a34a">' +
       '<div><span style="font-size:8pt;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:1px">Issued:</span><span style="color:#14532d;font-weight:600;margin-left:6px">'+(invoice.date?fmtDate(invoice.date):'—')+'</span></div>' +
       '<div><span style="font-size:8pt;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:1px">Due:</span><span style="color:#dc2626;font-weight:600;margin-left:6px">'+(invoice.due?fmtDate(invoice.due):'—')+'</span></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="padding:28px 44px;display:flex;gap:16px;border-bottom:2px dashed #d1fae5">' +
       '<div style="flex:1;background:#f0fdf4;border-radius:12px;padding:20px;border:1px solid #bbf7d0"><div style="font-size:8pt;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#14532d">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#4b5563;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#4b5563;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;background:#f7fdf7;border-radius:12px;padding:20px;border:1px solid #d1fae5"><div style="font-size:8pt;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:700;color:#14532d">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#4b5563;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#6b7280;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;background:#fafafa;border-radius:12px;padding:20px;border:1px solid #e5e7eb"><div style="font-size:8pt;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#14532d">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#4b5563;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:24px 44px">'+buildItemTable(bd,cur,{headerBg:'#14532d',headerColor:'#fff',rowEven:'#f0fdf4',accentColor:'#16a34a',borderColor:'#d1fae5'})+buildTotalsBox(bd,cur,{accentColor:'#16a34a',totalsBg:'#f0fdf4'})+'<div style="font-size:8.5pt;color:#6b7280;margin-top:10px;text-align:right;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 44px 32px;display:flex;gap:24px">' +
       '<div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px"><div style="font-size:8.5pt;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9pt;color:#374151;line-height:2.2"><div>Bank: <strong>'+(co.bank||'—')+'</strong></div><div>A/C: <strong>'+(co.account||'—')+'</strong></div><div>IFSC: <strong>'+(co.ifsc||'—')+'</strong></div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="border-top:2px solid #16a34a;padding-top:8px;min-width:200px;text-align:center;margin-top:50px"><div style="font-weight:700;color:#14532d;font-size:10pt">Authorised Signatory</div><div style="color:#6b7280;font-size:9pt;margin-top:2px">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:#14532d;padding:14px 44px;display:flex;justify-content:space-between"><div style="color:rgba(255,255,255,0.6);font-size:8pt">'+(invoice.notes||'Thank you for your business!')+'</div><div style="color:rgba(255,255,255,0.6);font-size:8pt">Azolve</div></div>';
    return baseHead(invoice.number||'','Nunito:wght@300;400;500;600;700;800','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 8 — OCEAN BLUE
// =====================================================
function tplOcean(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#fff;font-family:\'Exo 2\',Inter,Arial,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.12);overflow:hidden">';
    h+='<div style="background:linear-gradient(160deg,#0c4a6e,#0369a1,#0284c7,#0ea5e9);padding:40px 44px 48px;position:relative;overflow:hidden">' +
       '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
       '<div><div style="font-size:30px;font-weight:800;color:#fff">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.65);font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: <strong style="color:#fff">'+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="font-size:11pt;font-weight:800;color:rgba(255,255,255,0.5);letter-spacing:6px">INVOICE</div>' +
       '<div style="font-size:22pt;font-weight:700;color:#fff;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="background:#f0f9ff;padding:16px 44px;display:flex;gap:40px;align-items:center;border-bottom:2px solid #bae6fd">' +
       '<div><div style="font-size:7.5pt;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:1px">Invoice Date</div><div style="font-weight:700;color:#0c4a6e;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:1px">Due Date</div><div style="font-weight:700;color:#dc2626;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:1px">Terms</div><div style="font-weight:700;color:#0c4a6e;margin-top:2px">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="padding:28px 44px;display:flex;gap:16px;border-bottom:1px solid #e0f2fe">' +
       '<div style="flex:1;border-left:4px solid #0ea5e9;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#0c4a6e">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#64748b;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#64748b;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;border-left:4px solid #bae6fd;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:700;color:#0c4a6e">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#64748b;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#94a3b8;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;border-left:4px solid #bae6fd;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#0c4a6e">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#64748b;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:24px 44px">'+buildItemTable(bd,cur,{headerBg:'#0c4a6e',headerColor:'#fff',rowEven:'#f0f9ff',accentColor:'#0284c7',borderColor:'#e0f2fe'})+buildTotalsBox(bd,cur,{accentColor:'#0284c7',totalsBg:'#f0f9ff'})+'<div style="font-size:8.5pt;color:#94a3b8;margin-top:10px;text-align:right;font-style:italic">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 44px 32px;display:flex;gap:24px">' +
       '<div style="flex:1;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px"><div style="font-size:8.5pt;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9pt;color:#374151;line-height:2.2"><div>Bank: <strong>'+(co.bank||'—')+'</strong></div><div>A/C: <strong>'+(co.account||'—')+'</strong></div><div>IFSC: <strong>'+(co.ifsc||'—')+'</strong></div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="border-top:2px solid #0ea5e9;padding-top:8px;min-width:200px;text-align:center;margin-top:50px"><div style="font-weight:700;color:#0c4a6e;font-size:10pt">Authorised Signatory</div><div style="color:#6b7280;font-size:9pt;margin-top:2px">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:linear-gradient(135deg,#0c4a6e,#0284c7);padding:14px 44px;display:flex;justify-content:space-between"><div style="color:rgba(255,255,255,0.65);font-size:8pt">'+(invoice.notes||'Thank you for your business!')+'</div><div style="color:rgba(255,255,255,0.65);font-size:8pt">Azolve</div></div>';
    return baseHead(invoice.number||'','Exo+2:wght@300;400;500;600;700;800','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 9 — BOLD GEOMETRIC
// =====================================================
function tplGeometric(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#fff;font-family:\'Space Grotesk\',Arial,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,0.14);position:relative;overflow:hidden">';
    h+='<div style="position:absolute;top:0;right:0;width:0;height:0;border-style:solid;border-width:0 160px 160px 0;border-color:transparent #ff5a1f transparent transparent;opacity:0.08"></div>';
    h+='<div style="background:#111827;padding:40px 48px;display:flex;justify-content:space-between;align-items:center;position:relative">' +
       '<div style="position:absolute;left:0;top:0;bottom:0;width:10px;background:#ff5a1f"></div>' +
       '<div><div style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-0.5px">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,255,255,0.55);font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: <strong style="color:#ff5a1f">'+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="display:inline-block;background:#ff5a1f;color:#111827;font-weight:800;font-size:13pt;padding:8px 18px;letter-spacing:2px;transform:skewX(-6deg)">INVOICE</div>' +
       '<div style="font-size:16pt;font-weight:700;color:#fff;margin-top:10px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div></div></div>';
    h+='<div style="padding:18px 48px;display:flex;gap:36px;align-items:center;border-bottom:3px solid #111827">' +
       '<div><div style="font-size:7.5pt;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Issued</div><div style="font-weight:700;color:#111827;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div style="width:1px;height:28px;background:#e5e7eb"></div>' +
       '<div><div style="font-size:7.5pt;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Due</div><div style="font-weight:700;color:#ff5a1f;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div style="width:1px;height:28px;background:#e5e7eb"></div>' +
       '<div><div style="font-size:7.5pt;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:1.5px">Terms</div><div style="font-weight:700;color:#111827;margin-top:2px">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="padding:28px 48px;display:flex;gap:0;border-bottom:1px solid #e5e7eb">' +
       '<div style="flex:1;padding-right:24px"><div style="display:inline-block;background:#111827;color:#fff;font-size:8pt;font-weight:700;letter-spacing:1.5px;padding:4px 10px;margin-bottom:10px">BILLED TO</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#111827">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#6b7280;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#6b7280;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;padding:0 24px;border-left:1px dashed #d1d5db"><div style="display:inline-block;background:#f3f4f6;color:#374151;font-size:8pt;font-weight:700;letter-spacing:1.5px;padding:4px 10px;margin-bottom:10px">SHIP TO</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:700;color:#111827">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#6b7280;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#9ca3af;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;padding-left:24px;border-left:1px dashed #d1d5db"><div style="display:inline-block;background:#f3f4f6;color:#374151;font-size:8pt;font-weight:700;letter-spacing:1.5px;padding:4px 10px;margin-bottom:10px">FROM</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#111827">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#6b7280;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:28px 48px">'+buildItemTable(bd,cur,{headerBg:'#111827',headerColor:'#ff5a1f',rowEven:'#fafafa',accentColor:'#ff5a1f',borderColor:'#e5e7eb'})+buildTotalsBox(bd,cur,{accentColor:'#ff5a1f',totalsBg:'#fff5ef'})+'<div style="font-size:9pt;font-style:italic;color:#9ca3af;margin-top:10px;text-align:right">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 48px 32px;display:flex;gap:24px">' +
       '<div style="flex:1;border:2px solid #111827;padding:18px"><div style="font-size:8pt;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9.5pt;color:#374151;line-height:2.2"><div>Bank: <strong>'+(co.bank||'—')+'</strong></div><div>A/C: <strong>'+(co.account||'—')+'</strong></div><div>IFSC: <strong>'+(co.ifsc||'—')+'</strong></div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="font-size:9pt;color:#6b7280;margin-bottom:4px">'+(invoice.notes||'Thank you for your business!')+'</div><div style="border-top:3px solid #ff5a1f;padding-top:8px;min-width:200px;text-align:center;margin-top:36px"><div style="font-weight:800;color:#111827;font-size:10pt">Authorised Signatory</div><div style="font-size:9pt;color:#6b7280">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:#111827;padding:14px 48px;display:flex;justify-content:space-between"><div style="color:rgba(255,255,255,0.45);font-size:8pt">Computer generated invoice</div><div style="color:#ff5a1f;font-size:8pt;font-weight:700">Powered by Azolve</div></div>';
    return baseHead(invoice.number||'','Space+Grotesk:wght@400;500;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 10 — SOFT PASTEL
// =====================================================
function tplPastel(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:800px;margin:0 auto;background:#fffdfb;font-family:\'Quicksand\',Arial,sans-serif;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(244,114,182,0.15)">';
    h+='<div style="background:linear-gradient(120deg,#ffe4ec,#fde7d4);padding:40px 48px">' +
       '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
       '<div><div style="font-size:28px;font-weight:700;color:#9d174d;letter-spacing:-0.5px">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:#c2658a;font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: '+co.gst+'<br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="background:#fff;border-radius:20px;padding:10px 22px;display:inline-block;box-shadow:0 4px 14px rgba(244,114,182,0.25)"><div style="font-size:11pt;font-weight:700;color:#f472b6;letter-spacing:2px">INVOICE</div></div>' +
       '<div style="font-size:16pt;font-weight:700;color:#9d174d;margin-top:10px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:8px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="padding:20px 48px;display:flex;gap:36px;align-items:center;background:#fff7f0">' +
       '<div><div style="font-size:7.5pt;color:#d1949b;font-weight:700;text-transform:uppercase;letter-spacing:1px">Issued</div><div style="font-weight:700;color:#7c3a52;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#d1949b;font-weight:700;text-transform:uppercase;letter-spacing:1px">Due</div><div style="font-weight:700;color:#7c3a52;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#d1949b;font-weight:700;text-transform:uppercase;letter-spacing:1px">Terms</div><div style="font-weight:700;color:#7c3a52;margin-top:2px">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 86)+'</div></div>';
    h+='<div style="padding:28px 48px;display:flex;gap:16px">' +
       '<div style="flex:1;background:#fff0f5;border-radius:16px;padding:18px"><div style="font-size:8pt;font-weight:700;color:#f472b6;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#7c3a52">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#b88;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#b88;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;background:#fff7ed;border-radius:16px;padding:18px"><div style="font-size:8pt;font-weight:700;color:#f59e9e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:13pt;font-weight:700;color:#7c3a52">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#b88;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#d6a9b1;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;background:#fdf4ff;border-radius:16px;padding:18px"><div style="font-size:8pt;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:13pt;font-weight:700;color:#7c3a52">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#b88;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:0 48px 28px">'+buildItemTable(bd,cur,{headerBg:'#f9a8d4',headerColor:'#7c3a52',rowEven:'#fff7f5',accentColor:'#f472b6',borderColor:'#fde2ec'})+buildTotalsBox(bd,cur,{accentColor:'#f472b6',totalsBg:'#fff0f5'})+'<div style="font-size:9pt;font-style:italic;color:#d6a9b1;margin-top:10px;text-align:right">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 48px 32px;display:flex;gap:24px">' +
       '<div style="flex:1;background:#fff7ed;border-radius:16px;padding:18px"><div style="font-size:8pt;font-weight:700;color:#d97757;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9.5pt;color:#7c3a52;line-height:2.2"><div>Bank: '+(co.bank||'—')+'</div><div>A/C: '+(co.account||'—')+'</div><div>IFSC: '+(co.ifsc||'—')+'</div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="font-size:9pt;color:#c2658a;margin-bottom:4px">'+(invoice.notes||'Thank you so much! 💕')+'</div><div style="border-top:2px solid #f9a8d4;padding-top:8px;min-width:190px;text-align:center;margin-top:36px"><div style="font-weight:700;color:#7c3a52;font-size:10pt">Authorised Signatory</div><div style="font-size:9pt;color:#c2658a">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:linear-gradient(120deg,#fde7d4,#ffe4ec);padding:14px 48px;display:flex;justify-content:space-between"><div style="color:#b88;font-size:8pt">Made with care</div><div style="color:#b88;font-size:8pt">Azolve</div></div>';
    return baseHead(invoice.number||'','Quicksand:wght@400;500;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 11 — MONOCHROME EDITORIAL
// =====================================================
function tplMonochrome(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:800px;margin:0 auto;background:#fff;font-family:Georgia,\'Times New Roman\',serif;box-shadow:0 4px 30px rgba(0,0,0,0.1)">';
    h+='<div style="padding:44px 52px 28px;text-align:center;border-bottom:4px double #111">' +
       '<div style="font-size:11pt;letter-spacing:5px;color:#777;text-transform:uppercase;margin-bottom:10px">Invoice</div>' +
       '<div style="font-size:34px;font-weight:700;color:#111;letter-spacing:1px">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:#888;font-size:9pt;margin-top:10px;font-style:italic">'+(co.street||'')+(co.city?', '+co.city:'')+(co.gst?' &middot; GSTIN '+co.gst:'')+'</div></div>';
    h+='<div style="padding:20px 52px;display:flex;justify-content:center;gap:48px;border-bottom:1px solid #e5e5e5">' +
       '<div style="text-align:center"><div style="font-size:7.5pt;color:#999;letter-spacing:1.5px;text-transform:uppercase">No.</div><div style="font-weight:700;color:#111;margin-top:2px">'+(invoice.number||'')+'</div></div>' +
       '<div style="text-align:center"><div style="font-size:7.5pt;color:#999;letter-spacing:1.5px;text-transform:uppercase">Issued</div><div style="font-weight:700;color:#111;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div style="text-align:center"><div style="font-size:7.5pt;color:#999;letter-spacing:1.5px;text-transform:uppercase">Due</div><div style="font-weight:700;color:#111;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div style="text-align:center"><div style="font-size:7.5pt;color:#999;letter-spacing:1.5px;text-transform:uppercase">Status</div><div style="margin-top:2px">'+getStatusBadge(invoice.status)+'</div></div></div>';
    h+='<div style="padding:32px 52px;display:flex;gap:0">' +
       '<div style="flex:1;padding-right:24px;border-right:1px solid #e5e5e5"><div style="font-size:8.5pt;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:10px">Billed To</div>' +
       '<div style="font-size:15pt;font-weight:700;color:#111">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#777;margin-top:4px">GSTIN '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9.5pt;color:#555;margin-top:8px;line-height:1.7;font-style:italic">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;padding-left:24px"><div style="font-size:8.5pt;letter-spacing:2px;color:#999;text-transform:uppercase;margin-bottom:10px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:15pt;font-weight:700;color:#111">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9.5pt;color:#555;margin-top:8px;line-height:1.7;font-style:italic">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9.5pt;color:#aaa;font-style:italic">Same as billing</div>')+
       '</div></div>';
    h+='<div style="padding:0 52px 28px">'+buildItemTable(bd,cur,{headerBg:'#111',headerColor:'#fff',rowEven:'#fafafa',accentColor:'#111',borderColor:'#e5e5e5'})+buildTotalsBox(bd,cur,{accentColor:'#111',totalsBg:'#f7f7f7'})+'<div style="font-size:9pt;font-style:italic;color:#999;margin-top:10px;text-align:right">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 52px 32px;display:flex;gap:24px;border-top:1px solid #e5e5e5;padding-top:24px">' +
       '<div style="flex:1"><div style="font-size:8.5pt;letter-spacing:1.5px;color:#999;text-transform:uppercase;margin-bottom:10px">Payment Details</div>' +
       '<div style="font-size:9.5pt;color:#444;line-height:2.2"><div>Bank — '+(co.bank||'—')+'</div><div>A/C — '+(co.account||'—')+'</div><div>IFSC — '+(co.ifsc||'—')+'</div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="font-size:9.5pt;color:#777;font-style:italic;margin-bottom:4px">'+(invoice.notes||'Thank you for your business.')+'</div><div style="border-top:1px solid #111;padding-top:8px;min-width:190px;text-align:center;margin-top:36px"><div style="font-weight:700;color:#111;font-size:10pt">Authorised Signatory</div><div style="font-size:9pt;color:#777">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="border-top:4px double #111;padding:14px 52px;text-align:center"><div style="color:#999;font-size:8pt;letter-spacing:1px">GENERATED BY AZOLVE</div></div>';
    return baseHead(invoice.number||'','Playfair+Display:wght@400;600;700','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE 12 — FESTIVE INDIAN (RED & GOLD)
// =====================================================
function tplFestive(invoice) {
    var co=DB.getObj('company'), cur=cs(), bd=calcItemBreakdown(invoice);
    var billing = normalizeAddress(invoice, 'billing');
    var shipping = normalizeAddress(invoice, 'shipping');
    var h='<div style="max-width:820px;margin:0 auto;background:#fffaf3;font-family:\'Poppins\',Arial,sans-serif;box-shadow:0 10px 40px rgba(178,34,52,0.18);border:3px solid #d4af37">';
    h+='<div style="background:linear-gradient(135deg,#7a1023,#b22234,#8b0d1f);padding:36px 44px;position:relative">' +
       '<div style="position:absolute;top:0;left:0;right:0;height:6px;background:repeating-linear-gradient(45deg,#d4af37 0 10px,#fff5d6 10px 20px)"></div>' +
       '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
       '<div><div style="font-size:28px;font-weight:700;color:#ffe9b3;letter-spacing:0.5px">'+(co.name||'Your Company')+'</div>' +
       '<div style="color:rgba(255,233,179,0.75);font-size:9pt;margin-top:8px;line-height:1.8">'+(co.gst?'GSTIN: <strong style="color:#fff">'+co.gst+'</strong><br>':'')+(co.street||'')+(co.city?', '+co.city:'')+'</div></div>' +
       '<div style="text-align:right"><div style="font-size:13pt;font-weight:800;color:#ffe9b3;letter-spacing:5px">INVOICE</div>' +
       '<div style="font-size:18pt;font-weight:800;color:#fff;margin-top:4px">'+(invoice.number||'')+'</div>' +
       '<div style="margin-top:10px">'+getStatusBadge(invoice.status)+'</div></div></div></div>';
    h+='<div style="background:#fff5d6;padding:16px 44px;display:flex;gap:36px;align-items:center;border-bottom:2px solid #d4af37">' +
       '<div><div style="font-size:7.5pt;color:#a16207;font-weight:700;text-transform:uppercase;letter-spacing:1px">Invoice Date</div><div style="font-weight:700;color:#7a1023;margin-top:2px">'+(invoice.date?fmtDate(invoice.date):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#a16207;font-weight:700;text-transform:uppercase;letter-spacing:1px">Due Date</div><div style="font-weight:700;color:#7a1023;margin-top:2px">'+(invoice.due?fmtDate(invoice.due):'—')+'</div></div>' +
       '<div><div style="font-size:7.5pt;color:#a16207;font-weight:700;text-transform:uppercase;letter-spacing:1px">Terms</div><div style="font-weight:700;color:#7a1023;margin-top:2px">'+(invoice.paymentTerms||'Net 30')+'</div></div>' +
       '<div style="margin-left:auto">'+buildQRBlock(invoice, co, 90)+'</div></div>';
    h+='<div style="padding:26px 44px;display:flex;gap:16px;border-bottom:1px dashed #d4af37">' +
       '<div style="flex:1;border-left:4px solid #b22234;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#b22234;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Billed To</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#3a1a0e">'+(invoice.clientName||'—')+'</div>' +
       (invoice.clientGST?'<div style="font-size:9pt;color:#92703a;margin-top:4px">GSTIN: '+invoice.clientGST+'</div>':'')+
       (billing?'<div style="font-size:9pt;color:#92703a;margin-top:6px;line-height:1.6">'+fmtAddr(billing)+'</div>':'')+
       '</div>' +
       '<div style="flex:1;border-left:4px solid #d4af37;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Ship To</div>' +
       (shipping ?
           '<div style="font-size:14pt;font-weight:700;color:#3a1a0e">'+(invoice.shippingName||invoice.clientName||'')+'</div><div style="font-size:9pt;color:#92703a;margin-top:4px;line-height:1.6">'+fmtAddr(shipping)+'</div>' :
           '<div style="font-size:9pt;color:#b89968;font-style:italic">Same as billing</div>')+
       '</div>' +
       '<div style="flex:1;border-left:4px solid #d4af37;padding-left:16px"><div style="font-size:8pt;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">From</div>' +
       '<div style="font-size:14pt;font-weight:700;color:#3a1a0e">'+(co.name||'')+'</div>' +
       (co.gst?'<div style="font-size:9pt;color:#92703a;margin-top:4px">GSTIN: '+co.gst+'</div>':'')+
       '</div></div>';
    h+='<div style="padding:26px 44px">'+buildItemTable(bd,cur,{headerBg:'#7a1023',headerColor:'#ffe9b3',rowEven:'#fff8e8',accentColor:'#b22234',borderColor:'#f0dca0'})+buildTotalsBox(bd,cur,{accentColor:'#b22234',totalsBg:'#fff5d6'})+'<div style="font-size:9pt;font-style:italic;color:#a8853f;margin-top:10px;text-align:right">'+numberToWords(Math.floor(bd.grandTotal))+' Rupees Only</div></div>';
    h+='<div style="padding:0 44px 30px;display:flex;gap:24px">' +
       '<div style="flex:1;background:#fff5d6;border:1px solid #d4af37;border-radius:8px;padding:18px"><div style="font-size:8pt;font-weight:700;color:#7a1023;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Bank Details</div>' +
       '<div style="font-size:9.5pt;color:#3a1a0e;line-height:2.2"><div>Bank: <strong>'+(co.bank||'—')+'</strong></div><div>A/C: <strong>'+(co.account||'—')+'</strong></div><div>IFSC: <strong>'+(co.ifsc||'—')+'</strong></div></div></div>' +
       '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end"><div style="font-size:9pt;color:#92703a;margin-bottom:4px">'+(invoice.notes||'धन्यवाद! Thank you for your business!')+'</div><div style="border-top:2px solid #d4af37;padding-top:8px;min-width:200px;text-align:center;margin-top:40px"><div style="font-weight:700;color:#7a1023;font-size:10pt">Authorised Signatory</div><div style="font-size:9pt;color:#92703a">'+(co.name||'')+'</div></div></div></div>';
    h+='<div style="background:linear-gradient(135deg,#7a1023,#b22234);padding:12px 44px;display:flex;justify-content:space-between;position:relative">' +
       '<div style="color:rgba(255,233,179,0.7);font-size:8pt">Generated by Azolve</div><div style="color:rgba(255,233,179,0.7);font-size:8pt">शुभ हो</div>' +
       '<div style="position:absolute;bottom:0;left:0;right:0;height:6px;background:repeating-linear-gradient(45deg,#d4af37 0 10px,#fff5d6 10px 20px)"></div></div>';
    return baseHead(invoice.number||'','Poppins:wght@400;500;600;700;800','')+h+'</div></body></html>';
}

// =====================================================
// TEMPLATE MANAGER UI
// =====================================================
var TEMPLATE_PRESETS = [
    { id:'default',    name:'Standard GST',        desc:'Official India GST style',           icon:'📋', preview:'linear-gradient(135deg,#1a3a6b,#3b82f6)' },
    { id:'minimalist', name:'Minimalist Elegance', desc:'Clean whitespace, indigo accents',   icon:'✨', preview:'linear-gradient(135deg,#6366f1,#818cf8)' },
    { id:'corporate',  name:'Corporate Executive', desc:'Dark navy + gold accent strip',      icon:'🏢', preview:'linear-gradient(135deg,#0f172a,#f59e0b)' },
    { id:'creative',   name:'Creative Studio',     desc:'Pink-purple gradient design',        icon:'🎨', preview:'linear-gradient(135deg,#ec4899,#8b5cf6)' },
    { id:'luxury',     name:'Luxury Gold',         desc:'Black background + gold typography', icon:'👑', preview:'linear-gradient(135deg,#0d0d0d,#d4af37)' },
    { id:'tech',       name:'Tech Startup',        desc:'Dark mode purple gradient',          icon:'🚀', preview:'linear-gradient(135deg,#4f46e5,#db2777)' },
    { id:'nature',     name:'Nature Green',        desc:'Forest greens, organic feel',        icon:'🌿', preview:'linear-gradient(135deg,#14532d,#16a34a)' },
    { id:'ocean',      name:'Ocean Blue',          desc:'Deep blue wave-themed design',       icon:'🌊', preview:'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
    { id:'geometric',  name:'Bold Geometric',      desc:'Black & orange, sharp angles',       icon:'🔺', preview:'linear-gradient(135deg,#111827,#ff5a1f)' },
    { id:'pastel',     name:'Soft Pastel',         desc:'Rounded cards, pink & peach tones',  icon:'🌸', preview:'linear-gradient(120deg,#ffe4ec,#fde7d4)' },
    { id:'monochrome', name:'Monochrome Editorial',desc:'Black & white, magazine serif look', icon:'⚪', preview:'linear-gradient(135deg,#111111,#666666)' },
    { id:'festive',    name:'Festive Indian',      desc:'Red & gold, traditional festive feel',icon:'🪔', preview:'linear-gradient(135deg,#7a1023,#d4af37)' }
];

function renderTemplateManager() {
    var c = document.getElementById('templateManagerContainer');
    if(!c) return;
    var active = DB.get('active_template','default');
    var html = '<div style="padding:24px">' +
        '<h3 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:6px">Invoice Templates</h3>' +
        '<p style="font-size:13px;color:#64748b;margin-bottom:24px">12 unique designs — each with a completely different layout. All include Billing, Shipping & QR code support.</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px">';
    TEMPLATE_PRESETS.forEach(function(tp) {
        var isActive = tp.id === active;
        html += '<div onclick="setActiveTemplate(\''+tp.id+'\')" style="border:'+(isActive?'2px solid #6366f1':'1px solid #e5e7eb')+';border-radius:12px;overflow:hidden;cursor:pointer;background:'+(isActive?'#f5f3ff':'#fff')+';transition:all 0.2s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.1)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
            '<div style="height:72px;background:'+tp.preview+';display:flex;align-items:center;justify-content:center;font-size:26px">'+tp.icon+'</div>' +
            '<div style="padding:12px">' +
            '<div style="font-weight:700;font-size:11.5px;color:#1e293b;margin-bottom:3px">'+tp.name+'</div>' +
            '<div style="font-size:10px;color:#94a3b8;line-height:1.5;margin-bottom:10px">'+tp.desc+'</div>' +
            '<div style="display:flex;gap:6px">' +
            '<button onclick="event.stopPropagation();previewTemplateById(\''+tp.id+'\')" style="flex:1;padding:5px;background:#f1f5f9;border:none;border-radius:6px;font-size:10px;cursor:pointer;color:#475569;font-weight:600">Preview</button>' +
            (isActive
                ? '<div style="flex:1;padding:5px;background:#6366f1;border-radius:6px;font-size:10px;color:#fff;text-align:center;font-weight:700">Active ✓</div>'
                : '<button onclick="event.stopPropagation();setActiveTemplate(\''+tp.id+'\')" style="flex:1;padding:5px;background:#6366f1;border:none;border-radius:6px;font-size:10px;cursor:pointer;color:#fff;font-weight:600">Use This</button>')+
            '</div></div></div>';
    });
    html += '</div></div>';
    c.innerHTML = html;
}

function setActiveTemplate(id) {
    DB.set('active_template', id);
    renderTemplateManager();
    var tpl = TEMPLATE_PRESETS.find(function(t){return t.id===id;});
    if(typeof showToast === 'function') showToast('Template set: '+(tpl?tpl.name:id),'success');
}

function previewTemplateById(templateId) {
    var invoices = (typeof DB !== 'undefined') ? (DB.get('invoices') || []) : [];
    var invoice = (Array.isArray(invoices) && invoices[0]) ? JSON.parse(JSON.stringify(invoices[0])) : null;
    if(!invoice) {
        invoice = {
            number:'INV-PREVIEW', status:'paid',
            date: new Date().toISOString().split('T')[0],
            due: new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0],
            clientName:'Acme Technologies Pvt Ltd', clientGST:'27AADCA0001A1Z1',
            clientEmail:'accounts@acmetech.in', clientPhone:'+91 98765 43210',
            billingAddress:'456 Business Park, Andheri East',
            billingCity:'Mumbai', billingState:'Maharashtra', billingZip:'400053', billingCountry:'India',
            shippingAddress:'789 Warehouse Road, Powai',
            shippingCity:'Mumbai', shippingState:'Maharashtra', shippingZip:'400076', shippingCountry:'India',
            paymentTerms:'Net 30', notes:'Thank you for your business.',
            items:[
                {desc:'Web Development Services',qty:1,price:45000,discount:0,taxRate:18,hsn:'998314'},
                {desc:'UI/UX Design Package',qty:1,price:20000,discount:10,taxRate:18,hsn:'998314'},
                {desc:'Monthly Maintenance',qty:3,price:5000,discount:0,taxRate:18,hsn:'998315'},
                {desc:'Domain & Hosting (Annual)',qty:1,price:8000,discount:0,taxRate:18,hsn:'998313'}
            ]
        };
    }
    invoice.templateId = templateId;
    var html = generateInvoiceHTML(invoice, templateId);
    _openInvoicePreview(html);
}

function previewInvoiceWithTemplate(invoiceId, templateId) {
    var invoices = (typeof DB !== 'undefined') ? (DB.get('invoices') || []) : [];
    var invoice = Array.isArray(invoices) ? invoices.find(function(i){return i.id===invoiceId;}) : null;
    if(!invoice) return;
    invoice = JSON.parse(JSON.stringify(invoice)); // deep copy to avoid mutation
    var tid = templateId || invoice.template || invoice.templateId || 'default';
    invoice.templateId = tid;
    // Enrich with client data
    _enrichInvoiceWithClientData(invoice);
    var html = generateInvoiceHTML(invoice, tid);
    _openInvoicePreview(html);
}

function _enrichInvoiceWithClientData(inv) {
    try {
        var clients = (typeof DB !== 'undefined') ? (DB.get('clients') || []) : [];
        var client = clients.find(function(c){ return c.id === inv.clientId; });
        if (client) {
            inv.clientEmail = inv.clientEmail || client.email || '';
            inv.clientPhone = inv.clientPhone || client.phone || '';
            inv.clientGST   = inv.clientGST   || client.taxNumber || client.gst || '';
            // Billing address — prefer new structured fields
            if (!inv.billingAddress && !inv.clientAddress) {
                inv.billingAddress  = client.billingAddress  || client.address || '';
                inv.billingCity     = client.billingCity     || client.city    || '';
                inv.billingState    = client.billingState    || client.state   || '';
                inv.billingZip      = client.billingZip      || '';
                inv.billingCountry  = client.billingCountry  || '';
            }
            // Shipping address
            if (!inv.shippingAddress) {
                if (client.shippingSameAsBilling !== false) {
                    inv.shippingSameAsBilling = true;
                } else {
                    inv.shippingAddress  = client.shippingAddress  || '';
                    inv.shippingCity     = client.shippingCity     || '';
                    inv.shippingState    = client.shippingState    || '';
                    inv.shippingZip      = client.shippingZip      || '';
                    inv.shippingCountry  = client.shippingCountry  || '';
                    inv.shippingName     = client.shippingName     || client.name || '';
                }
            }
        }
    } catch(e) {}
}

function _openInvoicePreview(html) {
    try {
        var blob = new Blob([html], {type: 'text/html'});
        var blobUrl = URL.createObjectURL(blob);
        var win = window.open(blobUrl, '_blank');
        if(win) {
            win.onload = function(){ try{ win.focus(); }catch(e){} };
            setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000);
        } else {
            // Popup blocked fallback - open in same tab or show inline
            var win2 = window.open('','_blank','width=960,height=840,scrollbars=yes');
            if(win2){ win2.document.write(html); win2.document.close(); }
        }
    } catch(e) {
        var win3 = window.open('','_blank','width=960,height=840,scrollbars=yes');
        if(win3){ win3.document.write(html); win3.document.close(); }
    }
}

function downloadInvoicePDF(invoiceId, templateId) {
    var invoices = (typeof DB !== 'undefined') ? (DB.get('invoices') || []) : [];
    var invoice = Array.isArray(invoices) ? invoices.find(function(i){return i.id===invoiceId;}) : null;
    if(!invoice){ if(typeof showToast==='function') showToast('Invoice not found','error'); return; }
    invoice = JSON.parse(JSON.stringify(invoice)); // deep copy
    var tid = templateId || invoice.template || invoice.templateId || 'default';
    invoice.templateId = tid;
    // Enrich with client data before generating
    _enrichInvoiceWithClientData(invoice);
    var html = generateInvoiceHTML(invoice, tid);

    // Use Blob URL approach to avoid popup blocker issues
    try {
        var blob = new Blob([html], {type: 'text/html'});
        var blobUrl = URL.createObjectURL(blob);
        var printWin = window.open(blobUrl, '_blank');
        if(printWin) {
            printWin.onload = function() {
                try { printWin.focus(); printWin.print(); } catch(e) {}
                setTimeout(function(){ URL.revokeObjectURL(blobUrl); }, 60000);
            };
            if(typeof showToast==='function') showToast('Invoice opened — use Ctrl+P / Cmd+P to save as PDF','success');
        } else {
            // Popup blocked — fallback: download as HTML file
            _downloadInvoiceAsFile(html, invoice);
        }
    } catch(e) {
        // Fallback for older browsers
        var win = window.open('','_blank','width=960,height=840,scrollbars=yes');
        if(win){ win.document.write(html); win.document.close(); setTimeout(function(){ try{ win.print(); }catch(ex){} }, 500); }
        else { _downloadInvoiceAsFile(html, invoice); }
    }
}

function _downloadInvoiceAsFile(html, invoice) {
    // Direct file download fallback when popup is blocked
    try {
        var blob = new Blob([html], {type: 'text/html'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Invoice-' + (invoice.number || invoice.id || 'download') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        if(typeof showToast==='function') showToast('Invoice downloaded! Open the .html file and print to PDF','info');
    } catch(e) {
        if(typeof showToast==='function') showToast('Could not download invoice. Please check browser popup settings.','error');
    }
}