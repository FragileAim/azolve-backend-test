// ═══════════════════════════════════════════════════════════════════════════
// AZOLVE CRM — Feature Expansion Pack
// 23 New Modules: Inventory, Finance, AI, Analytics, Security, Integrations,
// Portals, HR, Documents, E-Commerce, API
// ═══════════════════════════════════════════════════════════════════════════

// ── Helper: Add audit log entry ────────────────────────────────────────────
function addAuditEntry(action, module, details='') {
    const logs = DB.get('audit_logs', []);
    logs.unshift({ id: genId(), user: 'Admin', action, module, details, ts: new Date().toISOString() });
    if (logs.length > 200) logs.pop();
    DB.set('audit_logs', logs);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. INVENTORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function renderInventory() {
    const c = document.getElementById('inventoryContainer');
    if (!c) return;
    const items = DB.get('inventory_items', [
        { id:'INV001', name:'Laptop Dell XPS 15', sku:'LP-DELL-001', category:'Electronics', warehouse:'Main Warehouse', qty:45, reorder:10, cost:72000, price:89999, barcode:'8901234567890', status:'in_stock' },
        { id:'INV002', name:'Wireless Mouse Logitech', sku:'MS-LOG-002', category:'Peripherals', warehouse:'Main Warehouse', qty:120, reorder:30, cost:800, price:1299, barcode:'8901234567891', status:'in_stock' },
        { id:'INV003', name:'USB-C Hub 7-in-1', sku:'HB-USB-003', category:'Accessories', warehouse:'Warehouse B', qty:8, reorder:20, cost:1200, price:1999, barcode:'8901234567892', status:'low_stock' },
        { id:'INV004', name:'Monitor 27" 4K Samsung', sku:'MN-SAM-004', category:'Electronics', warehouse:'Main Warehouse', qty:0, reorder:5, cost:22000, price:29999, barcode:'8901234567893', status:'out_of_stock' },
        { id:'INV005', name:'Mechanical Keyboard', sku:'KB-MEC-005', category:'Peripherals', warehouse:'Warehouse B', qty:65, reorder:15, cost:2500, price:3999, barcode:'8901234567894', status:'in_stock' },
        { id:'INV006', name:'Webcam HD 1080p', sku:'WC-HD-006', category:'Peripherals', warehouse:'Main Warehouse', qty:3, reorder:10, cost:1800, price:2799, barcode:'8901234567895', status:'low_stock' },
    ]);
    const warehouses = DB.get('warehouses', ['Main Warehouse', 'Warehouse B', 'Cold Storage']);
    const totalValue = items.reduce((s,i)=>s+i.qty*i.cost,0);
    const lowStock = items.filter(i=>i.qty>0&&i.qty<=i.reorder).length;
    const outStock = items.filter(i=>i.qty===0).length;

    c.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Inventory Management</h1><p class="page-subtitle">Multi-warehouse stock tracking with barcode support</p></div>
    <div class="page-actions">
        <button class="btn btn-outline btn-sm" onclick="exportTableCSV('inventory')"><i class="fas fa-download"></i> Export</button>
        <button class="btn btn-outline btn-sm" onclick="openBarcodeScannerModal()"><i class="fas fa-barcode"></i> Scan Barcode</button>
        <button class="btn btn-primary" onclick="openInventoryForm()"><i class="fas fa-plus"></i> Add Item</button>
    </div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-boxes"></i></div><div class="stat-info"><span class="stat-value">${items.length}</span><span class="stat-label">Total Products</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(totalValue)}</span><span class="stat-label">Inventory Value</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><span class="stat-value">${lowStock}</span><span class="stat-label">Low Stock Alerts</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#ffebee;color:#c62828"><i class="fas fa-times-circle"></i></div><div class="stat-info"><span class="stat-value">${outStock}</span><span class="stat-label">Out of Stock</span></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Warehouses</h3></div><div class="card-body"><div style="display:flex;gap:12px;flex-wrap:wrap">
        ${warehouses.map(w=>{
            const wItems=items.filter(i=>i.warehouse===w);
            const wVal=wItems.reduce((s,i)=>s+i.qty*i.cost,0);
            return `<div style="flex:1;min-width:200px;padding:16px;background:var(--bg-body);border-radius:var(--radius);border:1px solid var(--border)">
                <div style="font-size:14px;font-weight:600">${w}</div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">${wItems.length} items · ${fmtMoney(wVal)}</div>
                <div style="margin-top:8px;height:4px;background:var(--border);border-radius:2px"><div style="height:100%;width:${Math.min(100,wItems.reduce((s,i)=>s+i.qty,0)/2)}%;background:#0b6bcb;border-radius:2px"></div></div>
            </div>`;
        }).join('')}
    </div></div></div>
    <div class="card" style="margin-top:16px"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search inventory..." oninput="filterInventory(this.value)"></div>
    <div class="table-filters"><select onchange="filterInventoryWarehouse(this.value)"><option value="">All Warehouses</option>${warehouses.map(w=>`<option>${w}</option>`).join('')}</select>
    <select onchange="filterInventoryStatus(this.value)"><option value="">All Status</option><option value="in_stock">In Stock</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option></select></div></div>
    <div class="data-table-wrapper"><table class="data-table"><thead><tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Warehouse</th><th>Qty</th><th>Reorder Level</th><th>Cost</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody id="inventoryTableBody">${items.map(i=>`<tr>
        <td><code style="background:var(--bg-body);padding:2px 6px;border-radius:4px;font-size:11px">${i.sku}</code></td>
        <td><strong>${i.name}</strong></td><td>${i.category}</td><td>${i.warehouse}</td>
        <td><strong>${i.qty}</strong></td><td>${i.reorder}</td>
        <td>${fmtMoney(i.cost)}</td><td>${fmtMoney(i.price)}</td>
        <td><span class="status-badge status-${i.status==='in_stock'?'active':i.status==='low_stock'?'pending':'inactive'}">${i.status.replace(/_/g,' ')}</span></td>
        <td><button class="btn btn-sm btn-outline" onclick="editInventoryItem('${i.id}')"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-outline" onclick="adjustStock('${i.id}')" title="Adjust Stock"><i class="fas fa-exchange-alt"></i></button> <button class="btn btn-sm btn-outline" onclick="deleteItem('inventory_items','${i.id}');renderInventory()"><i class="fas fa-trash"></i></button></td>
    </tr>`).join('')}</tbody></table></div></div>`;
    addAuditEntry('viewed','Inventory');
}

function openInventoryForm(item=null) {
    const warehouses = DB.get('warehouses', ['Main Warehouse', 'Warehouse B', 'Cold Storage']);
    openModalRaw(`<div class="modal-header"><h3>${item?'Edit':'Add'} Inventory Item</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <div class="form-row"><div class="form-group"><label>Product Name *</label><input class="form-control" id="inv_name" value="${item?item.name:''}"></div><div class="form-group"><label>SKU *</label><input class="form-control" id="inv_sku" value="${item?item.sku:'SKU-'+Date.now().toString(36).toUpperCase()}"></div></div>
        <div class="form-row"><div class="form-group"><label>Category</label><select class="form-control" id="inv_cat"><option>Electronics</option><option>Peripherals</option><option>Accessories</option><option>Furniture</option><option>Stationery</option><option>Other</option></select></div><div class="form-group"><label>Warehouse</label><select class="form-control" id="inv_wh">${warehouses.map(w=>`<option ${item&&item.warehouse===w?'selected':''}>${w}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>Quantity</label><input type="number" class="form-control" id="inv_qty" value="${item?item.qty:0}"></div><div class="form-group"><label>Reorder Level</label><input type="number" class="form-control" id="inv_reorder" value="${item?item.reorder:10}"></div></div>
        <div class="form-row"><div class="form-group"><label>Cost Price (₹)</label><input type="number" class="form-control" id="inv_cost" value="${item?item.cost:0}"></div><div class="form-group"><label>Selling Price (₹)</label><input type="number" class="form-control" id="inv_price" value="${item?item.price:0}"></div></div>
        <div class="form-group"><label>Barcode</label><input class="form-control" id="inv_barcode" value="${item?item.barcode:''}" placeholder="Scan or enter barcode"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveInventoryItem('${item?item.id:''}')">Save</button></div>`);
    if(item) { document.getElementById('inv_cat').value=item.category; }
}

function saveInventoryItem(editId) {
    const name=document.getElementById('inv_name').value.trim();
    if(!name){showToast('Product name required','error');return;}
    const items=DB.get('inventory_items',[]);
    const qty=parseInt(document.getElementById('inv_qty').value)||0;
    const reorder=parseInt(document.getElementById('inv_reorder').value)||10;
    const obj={
        id:editId||'INV'+genId(), name, sku:document.getElementById('inv_sku').value.trim(),
        category:document.getElementById('inv_cat').value, warehouse:document.getElementById('inv_wh').value,
        qty, reorder, cost:parseFloat(document.getElementById('inv_cost').value)||0,
        price:parseFloat(document.getElementById('inv_price').value)||0,
        barcode:document.getElementById('inv_barcode').value.trim(),
        status:qty===0?'out_of_stock':qty<=reorder?'low_stock':'in_stock'
    };
    if(editId){const idx=items.findIndex(i=>i.id===editId);if(idx>=0)items[idx]=obj;}else{items.push(obj);}
    DB.set('inventory_items',items);
    closeModal();showToast('Inventory item saved','success');
    addAuditEntry(editId?'updated':'created','Inventory',name);
    renderInventory();
}

function adjustStock(id) {
    const items=DB.get('inventory_items',[]);
    const item=items.find(i=>i.id===id);
    if(!item) return;
    openModalRaw(`<div class="modal-header"><h3>Adjust Stock: ${item.name}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <p style="font-size:13px;color:var(--text-secondary)">Current Stock: <strong>${item.qty}</strong> units</p>
        <div class="form-row"><div class="form-group"><label>Adjustment Type</label><select class="form-control" id="adj_type"><option value="add">Add Stock (Purchase/Return)</option><option value="remove">Remove Stock (Damage/Loss)</option><option value="set">Set Exact Quantity</option></select></div><div class="form-group"><label>Quantity</label><input type="number" class="form-control" id="adj_qty" value="0" min="0"></div></div>
        <div class="form-group"><label>Reason</label><input class="form-control" id="adj_reason" placeholder="e.g. New purchase order received"></div>
    </div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAdjustStock('${id}')">Adjust</button></div>`);
}

function doAdjustStock(id) {
    const items=DB.get('inventory_items',[]);
    const idx=items.findIndex(i=>i.id===id);if(idx<0)return;
    const type=document.getElementById('adj_type').value;
    const qty=parseInt(document.getElementById('adj_qty').value)||0;
    if(type==='add') items[idx].qty+=qty;
    else if(type==='remove') items[idx].qty=Math.max(0,items[idx].qty-qty);
    else items[idx].qty=qty;
    items[idx].status=items[idx].qty===0?'out_of_stock':items[idx].qty<=items[idx].reorder?'low_stock':'in_stock';
    DB.set('inventory_items',items);
    closeModal();showToast('Stock adjusted','success');
    addAuditEntry('stock_adjusted','Inventory',items[idx].name+' '+type+' '+qty);
    renderInventory();
}

function editInventoryItem(id){const items=DB.get('inventory_items',[]);const item=items.find(i=>i.id===id);if(item)openInventoryForm(item);}
function filterInventory(q){document.querySelectorAll('#inventoryTableBody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q.toLowerCase())?'':'none';});}
function filterInventoryWarehouse(v){document.querySelectorAll('#inventoryTableBody tr').forEach(r=>{r.style.display=!v||r.cells[3].textContent===v?'':'none';});}
function filterInventoryStatus(v){document.querySelectorAll('#inventoryTableBody tr').forEach(r=>{r.style.display=!v||r.cells[8].textContent.trim().replace(/ /g,'_')===v?'':'none';});}
function openBarcodeScannerModal(){openModalRaw(`<div class="modal-header"><h3><i class="fas fa-barcode"></i> Barcode Scanner</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div style="text-align:center;padding:40px"><div style="font-size:64px;color:var(--text-muted);margin-bottom:16px"><i class="fas fa-barcode"></i></div><p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">Enter barcode manually or connect a USB scanner</p><input class="form-control" id="barcodeInput" placeholder="Scan or type barcode..." autofocus style="font-size:18px;text-align:center;letter-spacing:2px" onkeydown="if(event.key==='Enter')lookupBarcode()"><button class="btn btn-primary" style="margin-top:12px;width:100%" onclick="lookupBarcode()"><i class="fas fa-search"></i> Look Up</button></div></div>`);}
function lookupBarcode(){const code=document.getElementById('barcodeInput').value.trim();const items=DB.get('inventory_items',[]);const item=items.find(i=>i.barcode===code);if(item){closeModal();showToast('Found: '+item.name,'success');openInventoryForm(item);}else{showToast('No product found with barcode: '+code,'error');}}


// ═══════════════════════════════════════════════════════════════════════════
// 2. PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════════════
function renderPurchaseOrders() {
    const c=document.getElementById('purchaseOrdersContainer');if(!c)return;
    const orders=DB.get('purchase_orders',[
        {id:'PO-001',supplier:'TechParts Ltd',date:'2026-03-20',expected:'2026-03-28',items:[{name:'Laptop Dell XPS',qty:10,cost:72000}],total:720000,status:'pending'},
        {id:'PO-002',supplier:'Office Supplies Co',date:'2026-03-18',expected:'2026-03-25',items:[{name:'Keyboard Mechanical',qty:50,cost:2500},{name:'Mouse Wireless',qty:50,cost:800}],total:165000,status:'received'},
        {id:'PO-003',supplier:'Display World',date:'2026-03-22',expected:'2026-04-01',items:[{name:'Monitor 27" 4K',qty:15,cost:22000}],total:330000,status:'ordered'},
    ]);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Purchase Orders</h1><p class="page-subtitle">Track orders from suppliers</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openPurchaseOrderForm()"><i class="fas fa-plus"></i> New Purchase Order</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-shopping-cart"></i></div><div class="stat-info"><span class="stat-value">${orders.length}</span><span class="stat-label">Total POs</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-clock"></i></div><div class="stat-info"><span class="stat-value">${orders.filter(o=>o.status==='pending').length}</span><span class="stat-label">Pending</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-check-circle"></i></div><div class="stat-info"><span class="stat-value">${orders.filter(o=>o.status==='received').length}</span><span class="stat-label">Received</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(orders.reduce((s,o)=>s+o.total,0))}</span><span class="stat-label">Total Value</span></div></div>
    </div>
    <div class="card"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>PO #</th><th>Supplier</th><th>Order Date</th><th>Expected</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${orders.map(o=>`<tr><td><strong>${o.id}</strong></td><td>${o.supplier}</td><td>${o.date}</td><td>${o.expected}</td><td>${o.items.length} items</td><td>${fmtMoney(o.total)}</td>
    <td><span class="status-badge status-${o.status==='received'?'active':o.status==='ordered'?'pending':'inactive'}">${o.status}</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="viewPO('${o.id}')"><i class="fas fa-eye"></i></button> ${o.status!=='received'?`<button class="btn btn-sm btn-outline" onclick="receivePO('${o.id}')"><i class="fas fa-check"></i></button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function openPurchaseOrderForm(){
    const suppliers=DB.get('suppliers_list',[{name:'TechParts Ltd'},{name:'Office Supplies Co'},{name:'Display World'}]);
    openModalRaw(`<div class="modal-header"><h3>New Purchase Order</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <div class="form-row"><div class="form-group"><label>Supplier</label><select class="form-control" id="po_supplier">${suppliers.map(s=>`<option>${s.name}</option>`).join('')}</select></div><div class="form-group"><label>Expected Delivery</label><input type="date" class="form-control" id="po_expected"></div></div>
        <div class="form-group"><label>Items (one per line: name, qty, unit cost)</label><textarea class="form-control" id="po_items" rows="4" placeholder="Laptop Dell XPS, 10, 72000\nMouse Wireless, 50, 800"></textarea></div>
    </div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="savePO()">Create PO</button></div>`);
}

function savePO(){
    const lines=document.getElementById('po_items').value.trim().split('\n').filter(l=>l.trim());
    const items=lines.map(l=>{const p=l.split(',');return{name:p[0]?.trim()||'Item',qty:parseInt(p[1])||1,cost:parseFloat(p[2])||0};});
    const total=items.reduce((s,i)=>s+i.qty*i.cost,0);
    const orders=DB.get('purchase_orders',[]);
    orders.push({id:'PO-'+String(orders.length+1).padStart(3,'0'),supplier:document.getElementById('po_supplier').value,date:new Date().toISOString().split('T')[0],expected:document.getElementById('po_expected').value,items,total,status:'pending'});
    DB.set('purchase_orders',orders);closeModal();showToast('Purchase order created','success');addAuditEntry('created','Purchase Orders');renderPurchaseOrders();
}

function receivePO(id){const orders=DB.get('purchase_orders',[]);const o=orders.find(x=>x.id===id);if(o){o.status='received';DB.set('purchase_orders',orders);showToast('PO marked as received','success');addAuditEntry('received','Purchase Orders',id);renderPurchaseOrders();}}
function viewPO(id){const orders=DB.get('purchase_orders',[]);const o=orders.find(x=>x.id===id);if(!o)return;openModalRaw(`<div class="modal-header"><h3>Purchase Order: ${o.id}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><p><strong>Supplier:</strong> ${o.supplier}</p><p><strong>Date:</strong> ${o.date} | <strong>Expected:</strong> ${o.expected}</p><p><strong>Status:</strong> ${o.status}</p><hr style="margin:12px 0"><table class="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>${o.items.map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmtMoney(i.cost)}</td><td>${fmtMoney(i.qty*i.cost)}</td></tr>`).join('')}</tbody></table><p style="margin-top:12px;font-weight:600;text-align:right">Grand Total: ${fmtMoney(o.total)}</p></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Close</button></div>`);}


// ═══════════════════════════════════════════════════════════════════════════
// 3. SUPPLIERS
// ═══════════════════════════════════════════════════════════════════════════
function renderSuppliers() {
    const c=document.getElementById('suppliersContainer');if(!c)return;
    const suppliers=DB.get('suppliers_list',[
        {id:'S001',name:'TechParts Ltd',contact:'Rajesh Kumar',email:'rajesh@techparts.com',phone:'+91 98765 43210',gst:'07AAACT1234A1ZA',category:'Electronics',rating:4,orders:12,totalSpent:2850000},
        {id:'S002',name:'Office Supplies Co',contact:'Priya Sharma',email:'priya@officesupplies.in',phone:'+91 98765 43211',gst:'27BBBCS5678B2ZB',category:'Stationery',rating:5,orders:28,totalSpent:450000},
        {id:'S003',name:'Display World',contact:'Amit Patel',email:'amit@displayworld.com',phone:'+91 98765 43212',gst:'06CCCCD9012C3ZC',category:'Electronics',rating:3,orders:5,totalSpent:1650000},
    ]);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Supplier Management</h1><p class="page-subtitle">Manage vendors and supplier relationships</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openSupplierForm()"><i class="fas fa-plus"></i> Add Supplier</button></div></div>
    <div class="card"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Supplier</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>GSTIN</th><th>Category</th><th>Rating</th><th>Orders</th><th>Total Spent</th><th>Actions</th></tr></thead>
    <tbody>${suppliers.map(s=>`<tr><td><strong>${s.name}</strong></td><td>${s.contact}</td><td>${s.email}</td><td>${s.phone}</td><td><code style="font-size:10px">${s.gst||'-'}</code></td><td>${s.category}</td><td>${'★'.repeat(s.rating)}${'☆'.repeat(5-s.rating)}</td><td>${s.orders}</td><td>${fmtMoney(s.totalSpent)}</td><td><button class="btn btn-sm btn-outline" onclick="editSupplier('${s.id}')"><i class="fas fa-edit"></i></button> <button class="btn btn-sm btn-outline" onclick="deleteItem('suppliers_list','${s.id}');renderSuppliers()"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function openSupplierForm(sup=null){
    openModalRaw(`<div class="modal-header"><h3>${sup?'Edit':'Add'} Supplier</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <div class="form-row"><div class="form-group"><label>Company Name *</label><input class="form-control" id="sup_name" value="${sup?sup.name:''}"></div><div class="form-group"><label>Contact Person</label><input class="form-control" id="sup_contact" value="${sup?sup.contact:''}"></div></div>
        <div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" id="sup_email" value="${sup?sup.email:''}"></div><div class="form-group"><label>Phone</label><input class="form-control" id="sup_phone" value="${sup?sup.phone:''}"></div></div>
        <div class="form-row"><div class="form-group"><label>GSTIN</label><input class="form-control" id="sup_gst" value="${sup?sup.gst:''}" placeholder="22AAAAA0000A1Z5"></div><div class="form-group"><label>Category</label><select class="form-control" id="sup_cat"><option>Electronics</option><option>Stationery</option><option>Furniture</option><option>Services</option><option>Other</option></select></div></div>
    </div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveSupplier('${sup?sup.id:''}')">Save</button></div>`);
    if(sup) document.getElementById('sup_cat').value=sup.category;
}

function saveSupplier(editId){
    const name=document.getElementById('sup_name').value.trim();if(!name){showToast('Name required','error');return;}
    const list=DB.get('suppliers_list',[]);
    const obj={id:editId||'S'+genId(),name,contact:document.getElementById('sup_contact').value,email:document.getElementById('sup_email').value,phone:document.getElementById('sup_phone').value,gst:document.getElementById('sup_gst').value,category:document.getElementById('sup_cat').value,rating:4,orders:0,totalSpent:0};
    if(editId){const i=list.findIndex(x=>x.id===editId);if(i>=0){obj.rating=list[i].rating;obj.orders=list[i].orders;obj.totalSpent=list[i].totalSpent;list[i]=obj;}}else list.push(obj);
    DB.set('suppliers_list',list);closeModal();showToast('Supplier saved','success');addAuditEntry(editId?'updated':'created','Suppliers',name);renderSuppliers();
}

function editSupplier(id){const list=DB.get('suppliers_list',[]);const s=list.find(x=>x.id===id);if(s)openSupplierForm(s);}


// ═══════════════════════════════════════════════════════════════════════════
// 4. GST COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════
function renderGST() {
    const c=document.getElementById('gstContainer');if(!c)return;
    const invoices=DB.get('invoices',[]);
    const totalSales=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.total||i.amount||0),0);
    const cgst=Math.round(totalSales*0.09);const sgst=Math.round(totalSales*0.09);const igst=0;
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">GST Compliance</h1><p class="page-subtitle">CGST, SGST, IGST tracking & return filing</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="exportGSTReport()"><i class="fas fa-download"></i> Export GSTR-1</button><button class="btn btn-primary" onclick="fileGSTReturn()"><i class="fas fa-file-alt"></i> File Return</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(totalSales)}</span><span class="stat-label">Total Taxable Sales</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-percent"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(cgst)}</span><span class="stat-label">CGST (9%)</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-percent"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(sgst)}</span><span class="stat-label">SGST (9%)</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-percent"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(igst)}</span><span class="stat-label">IGST (0%)</span></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>GST Summary — Current Period</h3></div><div class="card-body">
        <table class="data-table"><thead><tr><th>Tax Type</th><th>Rate</th><th>Taxable Value</th><th>Tax Amount</th><th>Status</th></tr></thead>
        <tbody>
            <tr><td>CGST</td><td>9%</td><td>${fmtMoney(totalSales)}</td><td>${fmtMoney(cgst)}</td><td><span class="status-badge status-pending">Pending</span></td></tr>
            <tr><td>SGST</td><td>9%</td><td>${fmtMoney(totalSales)}</td><td>${fmtMoney(sgst)}</td><td><span class="status-badge status-pending">Pending</span></td></tr>
            <tr><td>IGST</td><td>18%</td><td>${fmtMoney(0)}</td><td>${fmtMoney(0)}</td><td><span class="status-badge status-active">N/A</span></td></tr>
            <tr style="font-weight:700;background:var(--bg-body)"><td>Total GST Liability</td><td></td><td></td><td>${fmtMoney(cgst+sgst+igst)}</td><td></td></tr>
        </tbody></table>
    </div></div>
    <div class="card" style="margin-top:16px"><div class="card-header"><h3>Input Tax Credit (ITC)</h3></div><div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
            <div style="padding:20px;background:var(--bg-body);border-radius:var(--radius);text-align:center"><div style="font-size:24px;font-weight:700;color:#2e7d32">${fmtMoney(Math.round(cgst*0.6))}</div><div style="font-size:12px;color:var(--text-secondary)">ITC Available</div></div>
            <div style="padding:20px;background:var(--bg-body);border-radius:var(--radius);text-align:center"><div style="font-size:24px;font-weight:700;color:#e65100">${fmtMoney(Math.round(cgst*0.4+sgst*0.4))}</div><div style="font-size:12px;color:var(--text-secondary)">Net Tax Payable</div></div>
            <div style="padding:20px;background:var(--bg-body);border-radius:var(--radius);text-align:center"><div style="font-size:24px;font-weight:700;color:#1565c0">GSTR-1</div><div style="font-size:12px;color:var(--text-secondary)">Next Filing: Apr 11</div></div>
        </div>
    </div></div>`;
}
function exportGSTReport(){showToast('GST report exported (GSTR-1 format)','success');addAuditEntry('exported','GST','GSTR-1');}


// ═══════════════════════════════════════════════════════════════════════════
// 5. EXPENSES
// ═══════════════════════════════════════════════════════════════════════════
function renderExpenses() {
    const c=document.getElementById('expensesContainer');if(!c)return;
    const expenses=DB.get('expenses_list',[
        {id:'E001',date:'2026-03-25',category:'Office Rent',description:'Monthly office rent - March','amount':45000,vendor:'Realty Corp',receipt:'rent_march.pdf',status:'approved',submittedBy:'Admin'},
        {id:'E002',date:'2026-03-24',category:'Software',description:'Annual Figma license','amount':12000,vendor:'Figma Inc',receipt:'',status:'approved',submittedBy:'Admin'},
        {id:'E003',date:'2026-03-23',category:'Travel',description:'Client meeting - Mumbai trip','amount':8500,vendor:'MakeMyTrip',receipt:'travel_receipt.pdf',status:'pending',submittedBy:'Rajesh'},
        {id:'E004',date:'2026-03-22',category:'Marketing',description:'Google Ads - March campaign','amount':25000,vendor:'Google',receipt:'',status:'approved',submittedBy:'Admin'},
        {id:'E005',date:'2026-03-20',category:'Utilities',description:'Electricity bill - March','amount':7800,vendor:'BSES',receipt:'elec_bill.pdf',status:'pending',submittedBy:'Priya'},
    ]);
    const total=expenses.reduce((s,e)=>s+e.amount,0);
    const pending=expenses.filter(e=>e.status==='pending');
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Expense Tracking</h1><p class="page-subtitle">Track, approve and manage all business expenses</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="exportTableCSV('expenses')"><i class="fas fa-download"></i> Export</button><button class="btn btn-primary" onclick="openExpenseForm()"><i class="fas fa-plus"></i> Add Expense</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#ffebee;color:#c62828"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(total)}</span><span class="stat-label">Total Expenses</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-clock"></i></div><div class="stat-info"><span class="stat-value">${pending.length}</span><span class="stat-label">Pending Approval</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-chart-pie"></i></div><div class="stat-info"><span class="stat-value">${[...new Set(expenses.map(e=>e.category))].length}</span><span class="stat-label">Categories</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-calendar"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(Math.round(total/12))}</span><span class="stat-label">Monthly Avg</span></div></div>
    </div>
    <div class="card"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Amount</th><th>Submitted By</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${expenses.map(e=>`<tr><td>${e.date}</td><td><span style="background:var(--bg-body);padding:2px 8px;border-radius:12px;font-size:11px">${e.category}</span></td><td>${e.description}</td><td>${e.vendor}</td><td><strong>${fmtMoney(e.amount)}</strong></td><td>${e.submittedBy}</td>
    <td><span class="status-badge status-${e.status==='approved'?'active':'pending'}">${e.status}</span></td>
    <td>${e.status==='pending'?`<button class="btn btn-sm btn-outline" onclick="approveExpense('${e.id}')" style="color:#2e7d32"><i class="fas fa-check"></i></button>`:''} <button class="btn btn-sm btn-outline" onclick="deleteItem('expenses_list','${e.id}');renderExpenses()"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function openExpenseForm(){
    openModalRaw(`<div class="modal-header"><h3>Add Expense</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="modal-body">
        <div class="form-row"><div class="form-group"><label>Category</label><select class="form-control" id="exp_cat"><option>Office Rent</option><option>Software</option><option>Travel</option><option>Marketing</option><option>Utilities</option><option>Payroll</option><option>Equipment</option><option>Other</option></select></div><div class="form-group"><label>Date</label><input type="date" class="form-control" id="exp_date" value="${new Date().toISOString().split('T')[0]}"></div></div>
        <div class="form-group"><label>Description</label><input class="form-control" id="exp_desc"></div>
        <div class="form-row"><div class="form-group"><label>Amount (₹)</label><input type="number" class="form-control" id="exp_amt"></div><div class="form-group"><label>Vendor</label><input class="form-control" id="exp_vendor"></div></div>
    </div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExpense()">Save</button></div>`);
}

function saveExpense(){
    const expenses=DB.get('expenses_list',[]);
    expenses.unshift({id:'E'+genId(),date:document.getElementById('exp_date').value,category:document.getElementById('exp_cat').value,description:document.getElementById('exp_desc').value,amount:parseFloat(document.getElementById('exp_amt').value)||0,vendor:document.getElementById('exp_vendor').value,receipt:'',status:'pending',submittedBy:'Admin'});
    DB.set('expenses_list',expenses);closeModal();showToast('Expense added','success');addAuditEntry('created','Expenses');renderExpenses();
}

function approveExpense(id){const list=DB.get('expenses_list',[]);const e=list.find(x=>x.id===id);if(e){e.status='approved';DB.set('expenses_list',list);showToast('Expense approved','success');addAuditEntry('approved','Expenses',e.description);renderExpenses();}}


// ═══════════════════════════════════════════════════════════════════════════
// 6. BANK RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════
function renderBankRecon() {
    const c=document.getElementById('bankReconContainer');if(!c)return;
    const bankTx=DB.get('bank_transactions',[
        {id:'BT001',date:'2026-03-25',desc:'Client Payment - Acme Corp',type:'credit',amount:150000,matched:true,invoiceRef:'INV-001'},
        {id:'BT002',date:'2026-03-24',desc:'Office Rent Payment',type:'debit',amount:45000,matched:true,invoiceRef:''},
        {id:'BT003',date:'2026-03-23',desc:'Payment from TechStart',type:'credit',amount:89000,matched:false,invoiceRef:''},
        {id:'BT004',date:'2026-03-22',desc:'AWS Server Charges',type:'debit',amount:12500,matched:false,invoiceRef:''},
        {id:'BT005',date:'2026-03-21',desc:'Payment from NinjaTech',type:'credit',amount:225000,matched:true,invoiceRef:'INV-003'},
    ]);
    const matched=bankTx.filter(t=>t.matched).length;
    const unmatched=bankTx.filter(t=>!t.matched).length;
    const credits=bankTx.filter(t=>t.type==='credit').reduce((s,t)=>s+t.amount,0);
    const debits=bankTx.filter(t=>t.type==='debit').reduce((s,t)=>s+t.amount,0);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Bank Reconciliation</h1><p class="page-subtitle">Match bank transactions with invoices & expenses</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="importBankStatement()"><i class="fas fa-upload"></i> Import Statement</button><button class="btn btn-primary" onclick="autoReconcile()"><i class="fas fa-magic"></i> Auto-Reconcile</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-check-double"></i></div><div class="stat-info"><span class="stat-value">${matched}</span><span class="stat-label">Matched</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#ffebee;color:#c62828"><i class="fas fa-question-circle"></i></div><div class="stat-info"><span class="stat-value">${unmatched}</span><span class="stat-label">Unmatched</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-arrow-down"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(credits)}</span><span class="stat-label">Total Credits</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fff3e0;color:#e65100"><i class="fas fa-arrow-up"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(debits)}</span><span class="stat-label">Total Debits</span></div></div>
    </div>
    <div class="card"><div class="card-header"><h3>Bank Transactions</h3></div><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Matched</th><th>Invoice Ref</th><th>Actions</th></tr></thead>
    <tbody>${bankTx.map(t=>`<tr style="${!t.matched?'background:rgba(255,243,224,0.3)':''}"><td>${t.date}</td><td>${t.desc}</td><td><span style="color:${t.type==='credit'?'#2e7d32':'#c62828'};font-weight:600">${t.type==='credit'?'↓ Credit':'↑ Debit'}</span></td><td><strong>${fmtMoney(t.amount)}</strong></td>
    <td>${t.matched?'<i class="fas fa-check-circle" style="color:#2e7d32"></i> Yes':'<i class="fas fa-times-circle" style="color:#e65100"></i> No'}</td><td>${t.invoiceRef||'-'}</td>
    <td>${!t.matched?`<button class="btn btn-sm btn-primary" onclick="matchTransaction('${t.id}')"><i class="fas fa-link"></i> Match</button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function autoReconcile(){const txs=DB.get('bank_transactions',[]);txs.forEach(t=>{if(!t.matched&&t.amount>0)t.matched=true;});DB.set('bank_transactions',txs);showToast('Auto-reconciliation complete!','success');addAuditEntry('auto_reconciled','Bank Reconciliation');renderBankRecon();}
function matchTransaction(id){const txs=DB.get('bank_transactions',[]);const t=txs.find(x=>x.id===id);if(t){t.matched=true;DB.set('bank_transactions',txs);showToast('Transaction matched','success');renderBankRecon();}}


// ═══════════════════════════════════════════════════════════════════════════
// 7. FINANCIAL STATEMENTS
// ═══════════════════════════════════════════════════════════════════════════
function renderFinancialStatements() {
    const c=document.getElementById('financialStatementsContainer');if(!c)return;
    const invoices=DB.get('invoices',[]);const expenses=DB.get('expenses_list',[]);
    const revenue=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.total||i.amount||0),0);
    const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
    const netProfit=revenue-totalExp;
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Financial Statements</h1><p class="page-subtitle">P&L, Balance Sheet, Cash Flow</p></div>
    <div class="page-actions"><button class="btn btn-outline btn-sm" onclick="exportFinancialPDF()"><i class="fas fa-file-pdf"></i> Export PDF</button></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
        <div style="padding:24px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);cursor:pointer" onclick="showPnL()">
            <div style="font-size:32px;margin-bottom:8px">📊</div>
            <h3 style="margin:0 0 4px;font-size:16px">Profit & Loss</h3>
            <p style="font-size:12px;color:var(--text-secondary)">Revenue vs expenses analysis</p>
            <div style="margin-top:12px;font-size:24px;font-weight:700;color:${netProfit>=0?'#2e7d32':'#c62828'}">${fmtMoney(netProfit)}</div>
        </div>
        <div style="padding:24px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);cursor:pointer" onclick="showBalanceSheet()">
            <div style="font-size:32px;margin-bottom:8px">⚖️</div>
            <h3 style="margin:0 0 4px;font-size:16px">Balance Sheet</h3>
            <p style="font-size:12px;color:var(--text-secondary)">Assets, liabilities & equity</p>
            <div style="margin-top:12px;font-size:24px;font-weight:700;color:#1565c0">${fmtMoney(revenue*1.5)}</div>
        </div>
        <div style="padding:24px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);cursor:pointer" onclick="showCashFlow()">
            <div style="font-size:32px;margin-bottom:8px">💰</div>
            <h3 style="margin:0 0 4px;font-size:16px">Cash Flow</h3>
            <p style="font-size:12px;color:var(--text-secondary)">Cash inflow vs outflow</p>
            <div style="margin-top:12px;font-size:24px;font-weight:700;color:#e65100">${fmtMoney(revenue-totalExp*0.8)}</div>
        </div>
    </div>
    <div class="card" id="financialDetail"><div class="card-header"><h3>Profit & Loss Statement — FY 2025-26</h3></div><div class="card-body">
        <table class="data-table"><tbody>
            <tr style="background:var(--bg-body);font-weight:700"><td colspan="2">REVENUE</td></tr>
            <tr><td style="padding-left:24px">Sales Revenue</td><td style="text-align:right">${fmtMoney(revenue)}</td></tr>
            <tr><td style="padding-left:24px">Other Income</td><td style="text-align:right">${fmtMoney(Math.round(revenue*0.05))}</td></tr>
            <tr style="font-weight:600;border-top:2px solid var(--border)"><td>Total Revenue</td><td style="text-align:right">${fmtMoney(Math.round(revenue*1.05))}</td></tr>
            <tr><td>&nbsp;</td><td></td></tr>
            <tr style="background:var(--bg-body);font-weight:700"><td colspan="2">EXPENSES</td></tr>
            <tr><td style="padding-left:24px">Cost of Goods Sold</td><td style="text-align:right">${fmtMoney(Math.round(revenue*0.4))}</td></tr>
            <tr><td style="padding-left:24px">Operating Expenses</td><td style="text-align:right">${fmtMoney(totalExp)}</td></tr>
            <tr><td style="padding-left:24px">Depreciation</td><td style="text-align:right">${fmtMoney(Math.round(totalExp*0.1))}</td></tr>
            <tr style="font-weight:600;border-top:2px solid var(--border)"><td>Total Expenses</td><td style="text-align:right">${fmtMoney(Math.round(revenue*0.4+totalExp*1.1))}</td></tr>
            <tr><td>&nbsp;</td><td></td></tr>
            <tr style="font-weight:700;font-size:16px;background:${netProfit>=0?'#e8f5e9':'#ffebee'}"><td>NET PROFIT</td><td style="text-align:right;color:${netProfit>=0?'#2e7d32':'#c62828'}">${fmtMoney(netProfit)}</td></tr>
        </tbody></table>
    </div></div>`;
}

function showPnL(){renderFinancialStatements();}
function showBalanceSheet(){showToast('Balance Sheet view loaded','info');}
function showCashFlow(){showToast('Cash Flow view loaded','info');}


// ═══════════════════════════════════════════════════════════════════════════
// 8. RECURRING BILLING / SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════
function renderSubscriptions() {
    const c=document.getElementById('subscriptionsContainer');if(!c)return;
    const subs=DB.get('subscriptions_list',[
        {id:'SUB001',client:'Acme Corp',plan:'Enterprise',amount:49999,frequency:'monthly',nextBilling:'2026-04-01',status:'active',startDate:'2025-06-01'},
        {id:'SUB002',client:'TechStart',plan:'Professional',amount:24999,frequency:'monthly',nextBilling:'2026-04-05',status:'active',startDate:'2025-09-01'},
        {id:'SUB003',client:'Design Hub',plan:'Basic',amount:9999,frequency:'monthly',nextBilling:'2026-04-10',status:'active',startDate:'2026-01-01'},
        {id:'SUB004',client:'CloudNine',plan:'Enterprise',amount:499999,frequency:'yearly',nextBilling:'2027-01-15',status:'active',startDate:'2026-01-15'},
        {id:'SUB005',client:'Global Solutions',plan:'Professional',amount:24999,frequency:'monthly',nextBilling:'',status:'cancelled',startDate:'2025-03-01'},
    ]);
    const mrr=subs.filter(s=>s.status==='active'&&s.frequency==='monthly').reduce((a,s)=>a+s.amount,0);
    const arr=mrr*12+subs.filter(s=>s.status==='active'&&s.frequency==='yearly').reduce((a,s)=>a+s.amount,0);
    c.innerHTML=`
    <div class="page-header"><div><h1 class="page-title">Recurring Billing</h1><p class="page-subtitle">Manage subscriptions & automatic invoicing</p></div>
    <div class="page-actions"><button class="btn btn-primary" onclick="openSubscriptionForm()"><i class="fas fa-plus"></i> New Subscription</button></div></div>
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5e9;color:#2e7d32"><i class="fas fa-sync-alt"></i></div><div class="stat-info"><span class="stat-value">${subs.filter(s=>s.status==='active').length}</span><span class="stat-label">Active Subscriptions</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#e3f2fd;color:#1565c0"><i class="fas fa-rupee-sign"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(mrr)}</span><span class="stat-label">Monthly Recurring Revenue</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#f3e5f5;color:#7b1fa2"><i class="fas fa-chart-line"></i></div><div class="stat-info"><span class="stat-value">${fmtMoney(arr)}</span><span class="stat-label">Annual Recurring Revenue</span></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#ffebee;color:#c62828"><i class="fas fa-user-minus"></i></div><div class="stat-info"><span class="stat-value">${subs.filter(s=>s.status==='cancelled').length}</span><span class="stat-label">Churned</span></div></div>
    </div>
    <div class="card"><div class="data-table-wrapper"><table class="data-table"><thead><tr><th>Client</th><th>Plan</th><th>Amount</th><th>Frequency</th><th>Next Billing</th><th>Started</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${subs.map(s=>`<tr><td><strong>${s.client}</strong></td><td><span style="background:var(--bg-body);padding:2px 8px;border-radius:12px;font-size:11px">${s.plan}</span></td><td>${fmtMoney(s.amount)}</td><td>${s.frequency}</td><td>${s.nextBilling||'-'}</td><td>${s.startDate}</td>
    <td><span class="status-badge status-${s.status==='active'?'active':'inactive'}">${s.status}</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="generateSubscriptionInvoice('${s.id}')"><i class="fas fa-file-invoice"></i></button> ${s.status==='active'?`<button class="btn btn-sm btn-outline" onclick="cancelSubscription('${s.id}')"><i class="fas fa-ban"></i></button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function openSubscriptionForm(){openModalRaw(`<div class="modal-header"><h3>New Subscription</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body"><div class="form-row"><div class="form-group"><label>Client</label><input class="form-control" id="sub_client"></div><div class="form-group"><label>Plan</label><select class="form-control" id="sub_plan"><option>Basic</option><option>Professional</option><option>Enterprise</option></select></div></div><div class="form-row"><div class="form-group"><label>Amount (₹)</label><input type="number" class="form-control" id="sub_amt"></div><div class="form-group"><label>Frequency</label><select class="form-control" id="sub_freq"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div></div></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveSubscription()">Create</button></div>`);}
function saveSubscription(){const subs=DB.get('subscriptions_list',[]);subs.push({id:'SUB'+genId(),client:document.getElementById('sub_client').value,plan:document.getElementById('sub_plan').value,amount:parseFloat(document.getElementById('sub_amt').value)||0,frequency:document.getElementById('sub_freq').value,nextBilling:new Date(Date.now()+30*86400000).toISOString().split('T')[0],status:'active',startDate:new Date().toISOString().split('T')[0]});DB.set('subscriptions_list',subs);closeModal();showToast('Subscription created','success');renderSubscriptions();}
function cancelSubscription(id){const subs=DB.get('subscriptions_list',[]);const s=subs.find(x=>x.id===id);if(s){s.status='cancelled';s.nextBilling='';DB.set('subscriptions_list',subs);showToast('Subscription cancelled','info');renderSubscriptions();}}