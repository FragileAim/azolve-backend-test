(function() {
    if(typeof document === 'undefined') return;

    window.addEventListener('DOMContentLoaded', () => {
        // Self-heal corrupted invoices in local storage
        try {
            if (typeof DB !== 'undefined') {
                const invs = DB.get('invoices', []);
                if (invs.length > 0 && typeof invs[0].number === 'undefined') {
                    DB.set('invoices', []);
                    DB.set('seeded', false); // Force re-seed on reload
                }
            }
        } catch(e) {}

        // Create the Pipeline Panel
        const panel = document.createElement('div');
        panel.id = 'phase2-pipeline-panel';
        
        panel.innerHTML = `
            <style>
                #phase2-pipeline-panel {
                    position: fixed; bottom: 24px; right: 24px; width: 420px;
                    background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
                    z-index: 9990; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                #phase2-pipeline-panel:hover {
                    box-shadow: 0 16px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05); transform: translateY(-2px);
                }
                .pipeline-header {
                    background: linear-gradient(135deg, #714B67 0%, #4b3244 100%); color: white; padding: 16px 20px;
                    font-weight: 600; font-size: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .pipeline-item {
                    display: flex; justify-content: space-between; align-items: center; padding: 10px 12px;
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; transition: all 0.2s ease;
                }
                .pipeline-item:hover {
                    background: #ffffff; border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transform: translateX(2px);
                }
                .pipeline-section-title {
                    margin: 0 0 10px; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                }
                .pipeline-btn {
                    color: white; padding: 5px 12px; font-size: 11px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer;
                    transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .pipeline-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.15); }
                .pipeline-btn:active { transform: translateY(0); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
            </style>
            
            <div class="pipeline-header" id="pipeline-panel-header">
                <span><i class="fas fa-rocket" style="margin-right: 8px; color: #f472b6;"></i> Conversion Pipeline</span>
                <button id="pipeline-panel-toggle" style="background: none; border: none; color: white; cursor: pointer; padding: 4px; transition: transform 0.2s;"><i class="fas fa-chevron-down"></i></button>
            </div>
            <div id="pipeline-panel-body" style="padding: 20px; max-height: 480px; overflow-y: auto; display: block; background: #ffffff;">
                
                <div style="margin-bottom: 20px;">
                    <h4 class="pipeline-section-title"><i class="fas fa-file-signature" style="color:#0984e3; margin-right:4px;"></i> 1. Quotations</h4>
                    <div id="pipeline-quotations-list" style="font-size: 12px;">Loading...</div>
                    <button class="btn btn-outline" style="margin-top: 8px; width: 100%; border-radius: 8px; border-style: dashed; border-width: 2px; padding: 8px; font-weight: 600; color: #64748b;" onclick="createTestQuotation()">
                        <i class="fas fa-plus"></i> Create Test Quotation
                    </button>
                </div>
                
                <div style="margin-bottom: 20px; border-top: 1px dashed #e2e8f0; padding-top: 20px;">
                    <h4 class="pipeline-section-title"><i class="fas fa-shopping-cart" style="color:#fdcb6e; margin-right:4px;"></i> 2. Sales Orders</h4>
                    <div id="pipeline-salesorders-list" style="font-size: 12px;">Loading...</div>
                </div>
                
                <div style="border-top: 1px dashed #e2e8f0; padding-top: 20px;">
                    <h4 class="pipeline-section-title"><i class="fas fa-truck" style="color:#00b894; margin-right:4px;"></i> 3. Delivery Challans</h4>
                    <div id="pipeline-deliverychallans-list" style="font-size: 12px;">Loading...</div>
                </div>
                
            </div>
        `;
        
        document.body.appendChild(panel);
        
        document.getElementById('pipeline-panel-header').addEventListener('click', () => {
            const body = document.getElementById('pipeline-panel-body');
            const icon = document.querySelector('#pipeline-panel-toggle i');
            if(body.style.display === 'none') {
                body.style.display = 'block';
                icon.className = 'fas fa-chevron-down';
                refreshPipeline();
            } else {
                body.style.display = 'none';
                icon.className = 'fas fa-chevron-up';
            }
        });
        
        setTimeout(refreshPipeline, 1500);
    });

    window.refreshPipeline = async function() {
        if(typeof api === 'undefined') return;
        
        try {
            // Fetch Clients to filter out leaked cross-company data from backend
            const clientRes = await api.request('/clients', {method: 'GET'});
            const validClientIds = clientRes && clientRes.success && clientRes.data ? clientRes.data.map(c => c._id || c.id) : [];

            // Fetch Quotations
            const qRes = await api.request('/quotations', {method: 'GET'});
            const qList = document.getElementById('pipeline-quotations-list');
            if(qRes && qRes.success && qRes.data && qRes.data.length > 0) {
                const validQs = qRes.data.filter(q => validClientIds.includes(q.client?._id || q.client));
                if(validQs.length > 0) {
                    qList.innerHTML = validQs.map(q => `
                        <div class="pipeline-item">
                            <div><strong style="color:#0f172a;">${q.quotationNumber}</strong> <div style="color: #64748b; font-size: 11px; margin-top:2px;">${q.client?.name || 'Unknown Client'}</div></div>
                            ${q.status !== 'accepted' ? `<button class="pipeline-btn" style="background: #0ea5e9;" onclick="convertDoc('quotations', '${q._id || q.id}', 'convert-to-sales-order')">Convert <i class="fas fa-arrow-right"></i></button>` : `<span class="badge badge-success" style="font-size: 11px;"><i class="fas fa-check-circle"></i> Done</span>`}
                        </div>
                    `).join('');
                } else {
                    qList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No quotations found.</span>`;
                }
            } else {
                qList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No quotations found.</span>`;
            }
            
            // Fetch Sales Orders
            const soRes = await api.request('/sales-orders', {method: 'GET'});
            const soList = document.getElementById('pipeline-salesorders-list');
            if(soRes && soRes.success && soRes.data && soRes.data.length > 0) {
                const validSOs = soRes.data.filter(so => validClientIds.includes(so.client?._id || so.client));
                if(validSOs.length > 0) {
                    soList.innerHTML = validSOs.map(so => `
                        <div class="pipeline-item">
                            <div><strong style="color:#0f172a;">${so.orderNumber}</strong> <div style="color: #64748b; font-size: 11px; margin-top:2px;">${so.client?.name || 'Unknown Client'}</div></div>
                            ${so.status !== 'completed' ? `<button class="pipeline-btn" style="background: #f59e0b;" onclick="convertDoc('sales-orders', '${so._id || so.id}', 'convert-to-delivery-challan')">Convert <i class="fas fa-arrow-right"></i></button>` : `<span class="badge badge-success" style="font-size: 11px;"><i class="fas fa-check-circle"></i> Done</span>`}
                        </div>
                    `).join('');
                } else {
                    soList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No sales orders found.</span>`;
                }
            } else {
                soList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No sales orders found.</span>`;
            }
            
            // Fetch Delivery Challans
            const dcRes = await api.request('/delivery-challans', {method: 'GET'});
            const dcList = document.getElementById('pipeline-deliverychallans-list');
            if(dcRes && dcRes.success && dcRes.data && dcRes.data.length > 0) {
                const validDCs = dcRes.data.filter(dc => validClientIds.includes(dc.client?._id || dc.client));
                if(validDCs.length > 0) {
                    dcList.innerHTML = validDCs.map(dc => `
                        <div class="pipeline-item">
                            <div><strong style="color:#0f172a;">${dc.challanNumber}</strong> <div style="color: #64748b; font-size: 11px; margin-top:2px;">${dc.client?.name || 'Unknown Client'}</div></div>
                            ${dc.status !== 'invoiced' ? `<button class="pipeline-btn" style="background: #10b981;" onclick="convertDoc('delivery-challans', '${dc._id || dc.id}', 'convert-to-invoice')">Generate Invoice <i class="fas fa-file-invoice-dollar"></i></button>` : `<span class="badge badge-success" style="font-size: 11px;"><i class="fas fa-check-circle"></i> Done</span>`}
                        </div>
                    `).join('');
                } else {
                    dcList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No delivery challans found.</span>`;
                }
            } else {
                dcList.innerHTML = `<span style="color: #94a3b8; font-style: italic;">No delivery challans found.</span>`;
            }
            
        } catch(e) {
            console.error('Pipeline refresh error:', e);
        }
    };
    
    window.convertDoc = async function(entity, id, action) {
        if(!confirm(`Proceed with conversion?`)) return;
        try {
            const res = await api.request(`/${entity}/${id}/${action}`, {method: 'POST'});
            if(res.success) {
                showToast('Conversion successful!', 'success');
                
                if (action === 'convert-to-invoice') {
                    // Append only the newly created invoice to local storage
                    try {
                        const newInvoice = res.data && res.data.invoice ? res.data.invoice : null;
                        if (newInvoice && typeof DB !== 'undefined') {
                            const currentInvoices = DB.get('invoices', []);
                            
                            // Check if it already exists to avoid duplicates
                            const exists = currentInvoices.find(inv => inv.id === newInvoice._id);
                            if (!exists) {
                                const mappedInv = {
                                    id: newInvoice._id || newInvoice.id,
                                    number: newInvoice.invoiceNumber || newInvoice.number || 'INV-NEW',
                                    clientId: newInvoice.client ? (newInvoice.client._id || newInvoice.client) : null,
                                    clientName: newInvoice.clientSnapshot?.name || newInvoice.client?.name || 'Patel Hardware',
                                    date: newInvoice.issueDate ? new Date(newInvoice.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                    due: newInvoice.dueDate ? new Date(newInvoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                    items: newInvoice.items || [],
                                    subtotal: newInvoice.subtotal || 0,
                                    tax: newInvoice.taxAmount || 0,
                                    total: newInvoice.grandTotal || 0,
                                    paid: newInvoice.amountPaid || 0,
                                    status: newInvoice.status || 'draft',
                                    template: newInvoice.template || 'default',
                                    notes: newInvoice.notes || ''
                                };
                                currentInvoices.unshift(mappedInv); // Add to top
                                DB.set('invoices', currentInvoices);
                            }
                        }
                    } catch(err) {
                        console.error('Failed to append invoice', err);
                    }
                    
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    refreshPipeline();
                }
            } else {
                showToast(res.message || 'Conversion failed', 'error');
            }
        } catch(e) {
            showToast('API Error', 'error');
        }
    };
    
    window.createTestQuotation = async function() {
        try {
            // First fetch a valid client ID
            const clientRes = await api.request('/clients', { method: 'GET' });
            if(!clientRes || !clientRes.success || !clientRes.data || clientRes.data.length === 0) {
                showToast('Please create at least one customer in the dashboard first.', 'warning');
                return;
            }
            const clientId = clientRes.data[0]._id || clientRes.data[0].id;

            const res = await api.request('/quotations', {
                method: 'POST',
                body: JSON.stringify({
                    client: clientId,
                    issueDate: new Date(),
                    validUntil: new Date(Date.now() + 86400000 * 7),
                    placeOfSupply: 'MH',
                    items: [
                        { name: 'Test Implementation Services', quantity: 2, price: 1500, taxRate: 18 }
                    ],
                    subtotal: 3000,
                    taxAmount: 540,
                    totalAmount: 3540
                })
            });
            if(res.success) {
                showToast('Test Quotation created!', 'success');
                refreshPipeline();
            } else {
                showToast(res.message || 'Error creating quotation', 'error');
            }
        } catch(e) {
            showToast('API Error', 'error');
        }
    };

})();
