// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AZOLVE CRM — Invoice Template Manager UI (Custom Templates)
// Note: renderTemplateManager() is defined in invoice-template-builder.js
// This file handles custom template editing, preview, and management
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function previewTemplate(templateId) {
    var template = getTemplate(templateId);
    var company = DB.getObj('company');
    
    // Sample invoice for preview
    var sampleInvoice = {
        number: 'INV-' + Date.now().toString().slice(-6),
        date: today(),
        due: today(),
        status: 'paid',
        clientName: 'Sample Client Pvt Ltd',
        clientAddress: {
            street: '123 Business Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            zip: '400001'
        },
        clientGST: '27AABCU9603R1ZN',
        items: [
            { name: 'Web Development Services', description: 'Complete website development including design and deployment', quantity: 1, rate: 25000, gst: 18 },
            { name: 'Annual Maintenance', description: '12 months of technical support and updates', quantity: 1, rate: 12000, gst: 18 }
        ],
        terms: 'Payment due within 15 days. Late payment may attract interest at 18% per annum.',
        templateId: templateId
    };
    
    var html = generateInvoiceHTML(sampleInvoice, template);
    
    var modalHtml = '<div class="modal-header"><h3><i class="fas fa-eye" style="color:#714b67;margin-right:8px"></i>Template Preview — ' + template.name + '</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>';
    modalHtml += '<div class="modal-body" style="padding:0;background:#f0f0f0;max-height:500px;overflow-y:auto"><iframe id="templatePreviewFrame" style="width:100%;min-height:600px;border:none"></iframe></div>';
    modalHtml += '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button>';
    var activeTemplateId = DB.get('active_template', 'default');
    if(template.id !== activeTemplateId) {
        modalHtml += '<button class="btn btn-outline" onclick="selectTemplate(\'' + template.id + '\');closeModal();"><i class="fas fa-check"></i> Set as Active</button>';
    }
    modalHtml += '<button class="btn btn-primary" onclick="openTemplateEditor(\'' + template.id + '\')"><i class="fas fa-edit"></i> Customize Template</button></div>';
    
    openModalRaw(modalHtml);
    
    setTimeout(function() {
        var frame = document.getElementById('templatePreviewFrame');
        if(frame) {
            frame.contentDocument.open();
            frame.contentDocument.write(html);
            frame.contentDocument.close();
        }
    }, 100);
}

// Show template switcher
function showTemplateSwitcher() {
    var templates = getTemplates();
    var activeId = DB.get('active_template', 'default');
    
    var html = '<div class="modal-header"><h3><i class="fas fa-exchange-alt" style="color:#714b67;margin-right:8px"></i>Switch Active Template</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body">';
    html += '<p style="margin-bottom:16px;color:#666">Select a template to use for all new invoices:</p>';
    
    templates.forEach(function(t) {
        var isActive = t.id === activeId;
        html += '<div style="padding:12px;border:2px solid ' + (isActive ? t.colors.accent : '#e0e0e0') + ';border-radius:8px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;gap:12px" onclick="selectTemplate(\'' + t.id + '\');closeModal();">';
        html += '<div style="width:40px;height:40px;border-radius:6px;background:' + t.colors.headerBg + ';display:flex;align-items:center;justify-content:center"><i class="fas fa-file-invoice" style="color:' + t.colors.accent + '"></i></div>';
        html += '<div style="flex:1"><div style="font-weight:600">' + t.name + '</div><div style="font-size:12px;color:#666">' + (t.description || '') + '</div></div>';
        if(isActive) html += '<span style="padding:4px 8px;background:' + t.colors.accent + ';color:white;border-radius:4px;font-size:12px">Active</span>';
        html += '</div>';
    });
    
    html += '</div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button></div>';
    openModalRaw(html);
}

// Open template editor with full customization
function openTemplateEditor(templateId) {
    var template = templateId ? getTemplate(templateId) : JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
    template.id = template.id || genId();
    
    var modalHtml = '<div class="modal-header"><h3><i class="fas fa-palette" style="color:#714b67;margin-right:8px"></i>' + (templateId ? 'Edit' : 'Create') + ' Template</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>';
    modalHtml += '<div class="modal-body" style="max-height:600px;overflow-y:auto">';
    
    // Basic Info
    modalHtml += '<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px"><h4 style="margin:0 0 12px">Basic Information</h4>';
    modalHtml += '<div class="form-group"><label>Template Name</label><input class="form-control" id="tpl_name" value="' + template.name + '" placeholder="e.g., Professional GST Invoice"></div>';
    modalHtml += '<div class="form-group"><label>Description</label><input class="form-control" id="tpl_desc" value="' + (template.description || '') + '" placeholder="Brief description of this template"></div>';
    modalHtml += '</div>';
    
    // Color Scheme
    modalHtml += '<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px"><h4 style="margin:0 0 12px">Color Scheme</h4>';
    modalHtml += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">';
    modalHtml += '<div class="form-group"><label>Primary Color</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_primary" value="' + template.colors.primary + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + template.colors.primary + '" readonly style="flex:1"></div></div>';
    modalHtml += '<div class="form-group"><label>Accent Color</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_accent" value="' + template.colors.accent + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + template.colors.accent + '" readonly style="flex:1"></div></div>';
    modalHtml += '<div class="form-group"><label>Text Color</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_text" value="' + template.colors.text + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + template.colors.text + '" readonly style="flex:1"></div></div>';
    modalHtml += '<div class="form-group"><label>Header Background</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_header" value="' + (template.colors.headerBg || '#f8f9fa') + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + (template.colors.headerBg || '#f8f9fa') + '" readonly style="flex:1"></div></div>';
    modalHtml += '<div class="form-group"><label>Table Header</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_table" value="' + template.colors.tableHeader + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + template.colors.tableHeader + '" readonly style="flex:1"></div></div>';
    modalHtml += '<div class="form-group"><label>Table Text</label><div style="display:flex;gap:8px"><input type="color" id="tpl_color_tabletext" value="' + template.colors.tableHeaderText + '" style="width:50px;height:40px;border:none;cursor:pointer"><input type="text" class="form-control" value="' + template.colors.tableHeaderText + '" readonly style="flex:1"></div></div>';
    modalHtml += '</div></div>';
    
    // Sections Toggle
    modalHtml += '<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px"><h4 style="margin:0 0 12px">Sections to Include</h4>';
    modalHtml += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">';
    var sectionOptions = [
        { key: 'showLogo', label: 'Company Logo', icon: 'fa-image' },
        { key: 'showInvoiceDetails', label: 'Invoice Details (No, Date)', icon: 'fa-info-circle' },
        { key: 'showBillTo', label: 'Bill To Section', icon: 'fa-user' },
        { key: 'showShipTo', label: 'Ship To Section', icon: 'fa-truck' },
        { key: 'showGSTDetails', label: 'GST/Tax Details', icon: 'fa-percent' },
        { key: 'showBankDetails', label: 'Bank Details', icon: 'fa-university' },
        { key: 'showTerms', label: 'Terms & Conditions', icon: 'fa-file-alt' },
        { key: 'showSignature', label: 'Signature Area', icon: 'fa-signature' }
    ];
    sectionOptions.forEach(function(opt) {
        modalHtml += '<label style="display:flex;align-items:center;gap:8px;padding:8px;background:white;border-radius:6px;cursor:pointer;border:1px solid #e0e0e0">';
        modalHtml += '<input type="checkbox" id="tpl_sec_' + opt.key + '" ' + (template.sections[opt.key] ? 'checked' : '') + '>';
        modalHtml += '<i class="fas ' + opt.icon + '" style="color:#714b67;width:20px"></i>';
        modalHtml += '<span>' + opt.label + '</span>';
        modalHtml += '</label>';
    });
    modalHtml += '</div></div>';
    
    // Table Columns
    modalHtml += '<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px"><h4 style="margin:0 0 12px">Table Columns</h4>';
    modalHtml += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">';
    var colOptions = [
        { key: 'showHSN', label: 'HSN/SAC Code' },
        { key: 'showGST', label: 'GST Rate %' },
        { key: 'showQuantity', label: 'Quantity' },
        { key: 'showRate', label: 'Rate/Unit Price' },
        { key: 'showCGST', label: 'CGST Column' },
        { key: 'showSGST', label: 'SGST Column' },
        { key: 'showTotal', label: 'Total Column' }
    ];
    colOptions.forEach(function(opt) {
        modalHtml += '<label style="display:flex;align-items:center;gap:8px;padding:8px;background:white;border-radius:6px;cursor:pointer;border:1px solid #e0e0e0">';
        modalHtml += '<input type="checkbox" id="tpl_col_' + opt.key + '" ' + (template.columns[opt.key] ? 'checked' : '') + '>';
        modalHtml += '<span>' + opt.label + '</span>';
        modalHtml += '</label>';
    });
    modalHtml += '</div></div>';
    
    // Typography
    modalHtml += '<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin-bottom:16px"><h4 style="margin:0 0 12px">Typography</h4>';
    modalHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    modalHtml += '<div class="form-group"><label>Font Family</label><select class="form-control" id="tpl_font">';
    modalHtml += '<option value="Arial" ' + (template.styling.fontFamily === 'Arial' ? 'selected' : '') + '>Arial</option>';
    modalHtml += '<option value="Times New Roman" ' + (template.styling.fontFamily === 'Times New Roman' ? 'selected' : '') + '>Times New Roman</option>';
    modalHtml += '<option value="Georgia" ' + (template.styling.fontFamily === 'Georgia' ? 'selected' : '') + '>Georgia</option>';
    modalHtml += '<option value="Verdana" ' + (template.styling.fontFamily === 'Verdana' ? 'selected' : '') + '>Verdana</option>';
    modalHtml += '</select></div>';
    modalHtml += '<div class="form-group"><label>Font Size (pt)</label><input type="number" class="form-control" id="tpl_fontsize" value="' + template.styling.fontSize + '" min="8" max="14"></div>';
    modalHtml += '</div></div>';
    
    modalHtml += '</div>';
    
    // Footer actions
    modalHtml += '<div class="modal-footer">';
    modalHtml += '<button class="btn btn-outline" onclick="closeModal()">Cancel</button>';
    modalHtml += '<button class="btn btn-outline" onclick="previewTemplateInEditor()"><i class="fas fa-eye"></i> Preview</button>';
    modalHtml += '<button class="btn btn-primary" onclick="saveTemplateFromEditor(\'' + template.id + '\')"><i class="fas fa-save"></i> Save Template</button>';
    modalHtml += '</div>';
    
    // Add color input sync script
    modalHtml += '<script>';
    modalHtml += 'document.addEventListener("DOMContentLoaded", function(){';
    modalHtml += '["primary","accent","text","header","table","tabletext"].forEach(function(k){';
    modalHtml += 'var colorInput = document.getElementById("tpl_color_"+k);';
    modalHtml += 'var textInput = colorInput.nextElementSibling;';
    modalHtml += 'colorInput.addEventListener("input", function(){textInput.value = this.value;});';
    modalHtml += '});';
    modalHtml += '});';
    modalHtml += '<\/script>';
    
    openModalRaw(modalHtml);
}

// Preview template from editor
function previewTemplateInEditor() {
    var template = getCurrentEditorTemplate();
    previewTemplate(template.id);
}

// Get current template from editor
function getCurrentEditorTemplate() {
    var activeId = DB.get('active_template', 'default');
    var template = getTemplate(activeId);
    
    // Read all editor values
    template.name = document.getElementById('tpl_name').value;
    template.description = document.getElementById('tpl_desc').value;
    template.colors.primary = document.getElementById('tpl_color_primary').value;
    template.colors.accent = document.getElementById('tpl_color_accent').value;
    template.colors.text = document.getElementById('tpl_color_text').value;
    template.colors.headerBg = document.getElementById('tpl_color_header').value;
    template.colors.tableHeader = document.getElementById('tpl_color_table').value;
    template.colors.tableHeaderText = document.getElementById('tpl_color_tabletext').value;
    
    // Sections
    sectionOptions.forEach(function(opt) {
        var el = document.getElementById('tpl_sec_' + opt.key);
        if(el) template.sections[opt.key] = el.checked;
    });
    
    // Columns
    colOptions.forEach(function(opt) {
        var el = document.getElementById('tpl_col_' + opt.key);
        if(el) template.columns[opt.key] = el.checked;
    });
    
    // Typography
    template.styling.fontFamily = document.getElementById('tpl_font').value;
    template.styling.fontSize = parseInt(document.getElementById('tpl_fontsize').value);
    
    return template;
}

// Save template from editor
function saveTemplateFromEditor(id) {
    var template = getCurrentEditorTemplate();
    template.id = id;
    saveTemplate(template);
    closeModal();
    renderTemplateManager();
}

// Initialize template system
sectionOptions = [
    { key: 'showLogo', label: 'Company Logo', icon: 'fa-image' },
    { key: 'showInvoiceDetails', label: 'Invoice Details', icon: 'fa-info-circle' },
    { key: 'showBillTo', label: 'Bill To Section', icon: 'fa-user' },
    { key: 'showShipTo', label: 'Ship To Section', icon: 'fa-truck' },
    { key: 'showGSTDetails', label: 'GST/Tax Details', icon: 'fa-percent' },
    { key: 'showBankDetails', label: 'Bank Details', icon: 'fa-university' },
    { key: 'showTerms', label: 'Terms & Conditions', icon: 'fa-file-alt' },
    { key: 'showSignature', label: 'Signature Area', icon: 'fa-signature' }
];

colOptions = [
    { key: 'showHSN', label: 'HSN/SAC Code' },
    { key: 'showGST', label: 'GST Rate %' },
    { key: 'showQuantity', label: 'Quantity' },
    { key: 'showRate', label: 'Rate/Unit Price' },
    { key: 'showCGST', label: 'CGST Column' },
    { key: 'showSGST', label: 'SGST Column' },
    { key: 'showTotal', label: 'Total Column' }
];

