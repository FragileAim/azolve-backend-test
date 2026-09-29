/* 
   AZOLVE SaaS - Module-Specific Unique Features
   CRM, HRM, Sales, Invoice, Finance, Projects, Inventory, Purchase
*/

// ============================================
// CRM MODULE - Unique Functions
// ============================================

// Convert lead to opportunity/deal
function convertToDeal(leadId) {
  const leads = getData('lead') || [];
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  // Open deal modal pre-populated with lead data
  const dealModal = document.getElementById('modal_deal');
  if (dealModal) {
    document.getElementById('deal_name').value = lead.firstName + ' ' + lead.lastName;
    document.getElementById('deal_company').value = lead.company;
    document.getElementById('deal_value').value = lead.value || 0;
    dealModal.classList.add('active');
    showToast('Lead converted to deal', 'success');
  }
}

// Set follow-up reminder
function setFollowUpReminder(leadId) {
  const reminderDate = prompt('Set follow-up date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (reminderDate) {
    const leads = getData('lead') || [];
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      lead.followUpDate = reminderDate;
      lead.followUpStatus = 'pending';
      setData('lead', leads);
      renderModule('crm');
      showToast('Follow-up reminder set for ' + reminderDate, 'success');
    }
  }
}

// View communication history
function viewCommunicationLog(leadId) {
  const leads = getData('lead') || [];
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  const history = lead.communicationHistory || [];
  let historyHtml = '<div style="padding:20px;"><h3>Communication History - ' + lead.firstName + ' ' + lead.lastName + '</h3>';
  
  if (history.length === 0) {
    historyHtml += '<p style="color:#888;">No communication history yet.</p>';
  } else {
    historyHtml += '<ul style="margin-top:16px;">';
    history.forEach(h => {
      historyHtml += '<li style="padding:12px 0;border-bottom:1px solid #eee;"><strong>' + h.type + '</strong> - ' + h.date + '<br>' + h.notes + '</li>';
    });
    historyHtml += '</ul>';
  }
  historyHtml += '</div>';
  
  // Show in a modal or alert
  alert(historyHtml.replace(/<[^>]*>/g, '\n'));
}

// Add communication note
function addCommunication(leadId, type, notes) {
  const leads = getData('lead') || [];
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  
  if (!lead.communicationHistory) lead.communicationHistory = [];
  lead.communicationHistory.push({
    type: type,
    date: new Date().toISOString().split('T')[0],
    notes: notes
  });
  setData('lead', leads);
  showToast('Communication logged', 'success');
}

// ============================================
// HRM MODULE - Unique Functions
// ============================================

// Clock in/out
function clockIn(employeeId) {
  const employees = getData('employee') || [];
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return;
  
  emp.clockInTime = new Date().toISOString();
  emp.clockInStatus = 'clocked_in';
  setData('employee', employees);
  showToast(emp.firstName + ' clocked in at ' + new Date().toLocaleTimeString(), 'success');
  renderModule('hrm');
}

function clockOut(employeeId) {
  const employees = getData('employee') || [];
  const emp = employees.find(e => e.id === employeeId);
  if (!emp || emp.clockInStatus !== 'clocked_in') return;
  
  emp.clockOutTime = new Date().toISOString();
  emp.clockInStatus = 'clocked_out';
  
  // Calculate hours worked
  const clockIn = new Date(emp.clockInTime);
  const clockOut = new Date(emp.clockOutTime);
  const hours = Math.round((clockOut - clockIn) / (1000 * 60 * 60) * 100) / 100;
  emp.hoursWorked = (emp.hoursWorked || 0) + hours;
  
  setData('employee', employees);
  showToast(emp.firstName + ' clocked out. Hours today: ' + hours, 'success');
  renderModule('hrm');
}

// Leave request
function requestLeave(employeeId) {
  const startDate = prompt('Start date (YYYY-MM-DD):');
  const endDate = prompt('End date (YYYY-MM-DD):');
  const reason = prompt('Reason:');
  
  if (startDate && endDate && reason) {
    const employees = getData('employee') || [];
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    
    if (!emp.leaveRequests) emp.leaveRequests = [];
    emp.leaveRequests.push({
      startDate: startDate,
      endDate: endDate,
      reason: reason,
      status: 'pending',
      requestDate: new Date().toISOString().split('T')[0]
    });
    
    setData('employee', employees);
    showToast('Leave request submitted', 'success');
    renderModule('hrm');
  }
}

// Calculate payroll
function calculatePayroll() {
  const employees = getData('employee') || [];
  let totalPayroll = 0;
  let breakdown = [];
  
  employees.forEach(emp => {
    const salary = parseFloat(emp.salary) || 0;
    const deductions = salary * 0.1; // 10% deduction
    const netPay = salary - deductions;
    totalPayroll += netPay;
    
    breakdown.push({
      name: emp.firstName + ' ' + emp.lastName,
      salary: salary,
      deductions: deductions,
      netPay: netPay
    });
  });
  
  alert('Total Payroll: $' + totalPayroll.toLocaleString() + '\n\nEmployees: ' + breakdown.length);
  showToast('Payroll calculated: $' + totalPayroll.toLocaleString(), 'info');
}

// Performance review
function addPerformanceReview(employeeId) {
  const rating = prompt('Rating (1-5):');
  const feedback = prompt('Feedback:');
  
  if (rating && feedback) {
    const employees = getData('employee') || [];
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    
    if (!emp.reviews) emp.reviews = [];
    emp.reviews.push({
      rating: parseInt(rating),
      feedback: feedback,
      date: new Date().toISOString().split('T')[0]
    });
    
    // Calculate average rating
    const avgRating = emp.reviews.reduce((sum, r) => sum + r.rating, 0) / emp.reviews.length;
    emp.rating = Math.round(avgRating * 10) / 10;
    
    setData('employee', employees);
    showToast('Performance review added', 'success');
    renderModule('hrm');
  }
}

// ============================================
// SALES MODULE - Unique Functions
// ============================================

// Sales forecast
function viewSalesForecast() {
  const deals = getData('deal') || [];
  const pipeline = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  
  let forecast = 0;
  let byMonth = {};
  
  pipeline.forEach(deal => {
    const value = parseFloat(deal.value) || 0;
    const prob = getStageProbability(deal.stage);
    const weightedValue = value * prob;
    forecast += weightedValue;
    
    const month = new Date().toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + weightedValue;
  });
  
  let forecastText = 'SALES FORECAST\n';
  forecastText += 'Estimated Revenue: $' + forecast.toLocaleString() + '\n';
  forecastText += 'Open Deals: ' + pipeline.length + '\n\n';
  forecastText += 'Weighted by Stage Probability:\n';
  forecastText += '  - Lead: 20%\n  - Qualified: 50%\n  - Negotiation: 75%\n  - Closing: 90%\n';
  
  alert(forecastText);
}

function getStageProbability(stage) {
  const probs = {
    'lead': 0.2,
    'qualified': 0.5,
    'negotiation': 0.75,
    'closing': 0.9,
    'won': 1.0,
    'lost': 0
  };
  return probs[stage] || 0.5;
}

// Calculate commission
function calculateCommission() {
  const deals = getData('deal') || [];
  const wonDeals = deals.filter(d => d.stage === 'won');
  
  let totalCommission = 0;
  wonDeals.forEach(deal => {
    const value = parseFloat(deal.value) || 0;
    const commission = value * 0.10; // 10% commission
    totalCommission += commission;
  });
  
  alert('Total Commission (Won Deals): $' + totalCommission.toLocaleString() + '\nDeals Won: ' + wonDeals.length);
}

// Generate quotation
function generateQuotation(dealId) {
  const deals = getData('deal') || [];
  const deal = deals.find(d => d.id === dealId);
  if (!deal) return;
  
  alert('QUOTATION GENERATED\n\n' +
        'Quote #: QT-' + deal.id + '\n' +
        'Client: ' + (deal.company || 'N/A') + '\n' +
        'Amount: $' + (deal.value || 0).toLocaleString() + '\n' +
        'Valid until: ' + new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString() + '\n\n' +
        'This quotation can be converted to invoice.');
}

// ============================================
// INVOICE MODULE - Template System
// ============================================

// Switch invoice template
function switchInvoiceTemplate(templateName) {
  const invoiceWrapper = document.querySelector('.invoice-wrapper');
  if (!invoiceWrapper) return;
  
  // Remove all template classes
  invoiceWrapper.classList.remove('invoice-template-modern', 'invoice-template-classic', 
    'invoice-template-detailed', 'invoice-template-minimal');
  
  // Add selected template class
  invoiceWrapper.classList.add('invoice-template-' + templateName);
  
  // Save preference
  localStorage.setItem('invoiceTemplate', templateName);
  showToast('Invoice template changed to ' + templateName, 'success');
}

// View invoice with template
function viewInvoiceWithTemplate(invoiceId) {
  const invoices = getData('invoice') || [];
  const invoice = invoices.find(i => i._id === invoiceId);
  if (!invoice) {
    showToast('Invoice not found', 'error');
    return;
  }
  
  // Use saved template from invoice or default to modern
  const template = invoice.template || 'modern';
  
  // Calculate totals
  const subtotal = (invoice.lines || []).reduce((sum, line) => sum + (line.price || 0) * (line.qty || 1), 0);
  const tax = subtotal * ((invoice.taxRate || 0) / 100);
  const total = subtotal + tax;
  
  // Create invoice HTML with selected template
  const invoiceHtml = `
    <div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <label style="font-weight:600;">Template:</label>
      <select id="viewTemplateSelect" class="form-control" style="flex:1;max-width:200px;" onchange="switchViewTemplate('${invoiceId}', this.value)">
        <option value="modern" ${template === 'modern' ? 'selected' : ''}>Modern</option>
        <option value="classic" ${template === 'classic' ? 'selected' : ''}>Classic</option>
        <option value="detailed" ${template === 'detailed' ? 'selected' : ''}>Detailed</option>
        <option value="minimal" ${template === 'minimal' ? 'selected' : ''}>Minimal</option>
      </select>
      <button class="btn btn-outline btn-sm" onclick="window.print()">
        <i class="fas fa-print"></i> Print
      </button>
    </div>
    <div class="invoice-wrapper invoice-template-${template}" style="background:white;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div class="invoice-header" style="display:flex;justify-content:space-between;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #e9ecef;">
        <div class="invoice-logo" style="font-size:32px;font-weight:700;color:#00A09D;">AZOLVE</div>
        <div class="invoice-number" style="text-align:right;">
          <h2 style="margin:0 0 8px 0;color:#2c3e50;">INVOICE #${invoice.number}</h2>
          <div style="color:#6c757d;font-size:13px;">Date: ${invoice.issueDate || new Date().toLocaleDateString()}</div>
          <div style="color:#6c757d;font-size:13px;">Due: ${invoice.dueDate || 'N/A'}</div>
        </div>
      </div>
      <div class="invoice-meta" style="display:flex;gap:40px;margin-bottom:30px;">
        <div class="invoice-meta-section">
          <h3 style="margin:0 0 8px 0;color:#2c3e50;font-size:14px;">Bill To</h3>
          <strong style="color:#495057;">${invoice.client || 'Client Name'}</strong><br>
          <span style="color:#6c757d;font-size:13px;">${invoice.clientEmail || ''}</span>
        </div>
        <div class="invoice-meta-section" style="margin-left:auto;">
          <h3 style="margin:0 0 8px 0;color:#2c3e50;font-size:14px;">Status</h3>
          <span class="badge badge-${invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}">${invoice.status || 'Draft'}</span>
        </div>
      </div>
      <div class="invoice-items">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:12px;text-align:left;border-bottom:2px solid #dee2e6;color:#495057;">Item</th>
              <th style="padding:12px;text-align:center;border-bottom:2px solid #dee2e6;color:#495057;width:80px;">Qty</th>
              <th style="padding:12px;text-align:right;border-bottom:2px solid #dee2e6;color:#495057;width:120px;">Price</th>
              <th style="padding:12px;text-align:right;border-bottom:2px solid #dee2e6;color:#495057;width:120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.lines || []).map(line => `
              <tr>
                <td style="padding:12px;border-bottom:1px solid #e9ecef;color:#495057;">${line.desc || 'Service'}</td>
                <td style="padding:12px;text-align:center;border-bottom:1px solid #e9ecef;color:#495057;">${line.qty || 1}</td>
                <td style="padding:12px;text-align:right;border-bottom:1px solid #e9ecef;color:#495057;">$${(line.price || 0).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                <td style="padding:12px;text-align:right;border-bottom:1px solid #e9ecef;color:#495057;font-weight:600;">$${((line.qty || 1) * (line.price || 0)).toLocaleString(undefined, {minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="invoice-totals" style="display:flex;justify-content:flex-end;">
        <div class="totals-box" style="min-width:250px;">
          <div class="totals-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e9ecef;">
            <span style="color:#6c757d;">Subtotal:</span>
            <span style="font-weight:600;">$${subtotal.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
          </div>
          <div class="totals-row" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e9ecef;">
            <span style="color:#6c757d;">Tax (${invoice.taxRate || 0}%):</span>
            <span style="font-weight:600;">$${tax.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
          </div>
          <div class="totals-row grand-total" style="display:flex;justify-content:space-between;padding:12px 0;background:#00A09D;color:white;border-radius:4px;padding:12px;margin-top:8px;">
            <span style="font-weight:700;">Total:</span>
            <span style="font-weight:700;font-size:18px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
          </div>
        </div>
      </div>
      ${invoice.notes ? `<div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:4px;"><strong style="color:#495057;">Notes:</strong><p style="margin:8px 0 0 0;color:#6c757d;font-size:13px;">${invoice.notes}</p></div>` : ''}
    </div>
  `;
  
  // Show in modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal" style="max-width:900px;max-height:95vh;overflow-y:auto;">
      <div class="modal-header">
        <h3>View Invoice - ${invoice.number}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:0;">
        ${invoiceHtml}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function switchViewTemplate(invoiceId, newTemplate) {
  const invoices = getData('invoice') || [];
  const idx = invoices.findIndex(i => i._id === invoiceId);
  if (idx !== -1) {
    invoices[idx].template = newTemplate;
    setData('invoice', invoices);
    
    // Re-render the invoice with new template
    const wrapper = document.querySelector('.invoice-wrapper');
    if (wrapper) {
      wrapper.className = `invoice-wrapper invoice-template-${newTemplate}`;
    }
    showToast('Template updated', 'success');
  }
}

function calculateInvoiceSubtotal(invoice) {
  if (!invoice.lineItems) return 0;
  return invoice.lineItems.reduce((sum, item) => sum + ((item.quantity || 1) * (item.price || 0)), 0);
}

function calculateInvoiceTax(invoice) {
  return calculateInvoiceSubtotal(invoice) * 0.10;
}

function calculateInvoiceTotal(invoice) {
  return calculateInvoiceSubtotal(invoice) + calculateInvoiceTax(invoice);
}

function printInvoice() {
  window.print();
}

function downloadPDF() {
  showToast('PDF download feature - requires library integration', 'info');
}

function createRecurringInvoice() {
  const interval = prompt('Create recurring invoice. Select interval:\n1. Monthly\n2. Quarterly\n3. Yearly\n\nEnter choice (1-3):', '1');
  if (!interval) return;
  
  const intervals = { '1': 'monthly', '2': 'quarterly', '3': 'yearly' };
  showToast('Recurring invoice set up: ' + intervals[interval], 'success');
}

function viewInvoiceTemplates() {
  const templatesHtml = `
    <div style="background:white;padding:20px;border-radius:8px;">
      <h2 style="text-align:center;margin-bottom:20px;color:#2c3e50;">Invoice Templates Preview</h2>
      
      <!-- Modern Template Preview -->
      <div style="margin-bottom:30px;padding:20px;border:1px solid #e9ecef;border-radius:6px;">
        <h3 style="color:#00A09D;margin-bottom:15px;">Modern Template</h3>
        <div class="invoice-wrapper invoice-template-modern" style="background:white;padding:20px;border-radius:4px;border:1px solid #dee2e6;">
          <div class="invoice-header" style="display:flex;justify-content:space-between;margin-bottom:20px;">
            <div style="font-size:24px;font-weight:700;color:#00A09D;">AZOLVE</div>
            <div style="text-align:right;">
              <h4 style="margin:0;">INVOICE #INV-001</h4>
              <small>Due: 2024-12-31</small>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:15px;background:#f8f9fa;border-radius:4px;">
            <strong>Sample Client</strong><br>
            <small>client@example.com</small>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:10px;text-align:left;border-bottom:2px solid #dee2e6;">Item</th>
                <th style="padding:10px;text-align:right;border-bottom:2px solid #dee2e6;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #e9ecef;">Web Development Services</td>
                <td style="padding:10px;text-align:right;border-bottom:1px solid #e9ecef;">$1,500.00</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:15px;text-align:right;">
            <strong>Total: $1,500.00</strong>
          </div>
        </div>
      </div>
      
      <!-- Classic Template Preview -->
      <div style="margin-bottom:30px;padding:20px;border:1px solid #e9ecef;border-radius:6px;">
        <h3 style="color:#495057;margin-bottom:15px;">Classic Template</h3>
        <div class="invoice-wrapper invoice-template-classic" style="background:#fff8f0;padding:20px;border-radius:4px;border:2px solid #d4a373;">
          <div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #d4a373;padding-bottom:15px;">
            <div style="font-size:28px;font-weight:bold;color:#5c3d2e;letter-spacing:3px;">AZOLVE</div>
            <small style="color:#8b7355;">Professional Business Solutions</small>
          </div>
          <div style="margin-bottom:20px;padding:15px;background:white;border-left:4px solid #d4a373;">
            <strong style="color:#5c3d2e;">Bill To: Sample Client</strong>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#d4a373;color:white;">
                <th style="padding:10px;text-align:left;">Description</th>
                <th style="padding:10px;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px;border-bottom:1px solid #e0d5c1;">Consulting Services</td>
                <td style="padding:10px;text-align:right;border-bottom:1px solid #e0d5c1;">$2,000.00</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:15px;text-align:right;padding:10px;background:#fff8f0;border:1px solid #d4a373;">
            <strong>Total: $2,000.00</strong>
          </div>
        </div>
      </div>
      
      <!-- Detailed Template Preview -->
      <div style="margin-bottom:30px;padding:20px;border:1px solid #e9ecef;border-radius:6px;">
        <h3 style="color:#667eea;margin-bottom:15px;">Detailed Template</h3>
        <div class="invoice-wrapper invoice-template-detailed" style="background:white;padding:20px;border-radius:8px;border:2px solid #667eea;">
          <div style="background:#667eea;color:white;padding:15px;border-radius:4px;margin-bottom:20px;">
            <div style="font-size:20px;font-weight:bold;">AZOLVE INVOICE</div>
            <small>Invoice #: INV-001 | Date: 2024-12-01</small>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
            <div style="padding:15px;background:#f0f4ff;border-radius:4px;">
              <strong>Bill To:</strong><br>
              Sample Client<br>
              <small>client@example.com</small>
            </div>
            <div style="padding:15px;background:#f0f4ff;border-radius:4px;">
              <strong>Payment Terms:</strong><br>
              Net 30 Days<br>
              <small>Status: Pending</small>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#667eea;color:white;">
                <th style="padding:12px;text-align:left;">Item</th>
                <th style="padding:12px;text-align:center;">Qty</th>
                <th style="padding:12px;text-align:right;">Rate</th>
                <th style="padding:12px;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px;border-bottom:1px solid #e0e7ff;">Software License</td>
                <td style="padding:12px;text-align:center;border-bottom:1px solid #e0e7ff;">1</td>
                <td style="padding:12px;text-align:right;border-bottom:1px solid #e0e7ff;">$500.00</td>
                <td style="padding:12px;text-align:right;border-bottom:1px solid #e0e7ff;">$500.00</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:15px;padding:15px;background:#f0f4ff;border-radius:4px;text-align:right;">
            <strong>Subtotal: $500.00</strong><br>
            <strong>Tax (10%): $50.00</strong><br>
            <strong style="font-size:18px;color:#667eea;">Total: $550.00</strong>
          </div>
        </div>
      </div>
      
      <!-- Minimal Template Preview -->
      <div style="margin-bottom:30px;padding:20px;border:1px solid #e9ecef;border-radius:6px;">
        <h3 style="color:#212529;margin-bottom:15px;">Minimal Template</h3>
        <div class="invoice-wrapper invoice-template-minimal" style="background:white;padding:30px;border-radius:4px;border:1px solid #212529;">
          <div style="text-align:center;margin-bottom:30px;">
            <div style="font-size:18px;letter-spacing:8px;font-weight:300;color:#212529;">AZOLVE</div>
            <div style="margin-top:10px;color:#6c757d;font-size:12px;">INVOICE #INV-001</div>
          </div>
          <div style="text-align:center;margin-bottom:30px;">
            <strong style="color:#212529;">Sample Client</strong>
          </div>
          <table style="width:100%;border:none;">
            <tbody>
              <tr>
                <td style="padding:10px;text-align:right;color:#6c757d;">Services</td>
                <td style="padding:10px;text-align:right;">$1,000.00</td>
              </tr>
              <tr>
                <td style="padding:10px;text-align:right;color:#6c757d;">Tax</td>
                <td style="padding:10px;text-align:right;">$100.00</td>
              </tr>
              <tr style="border-top:1px solid #212529;">
                <td style="padding:15px;text-align:right;font-weight:bold;">Total</td>
                <td style="padding:15px;text-align:right;font-weight:bold;">$1,100.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal" style="max-width:1000px;max-height:95vh;overflow-y:auto;">
      <div class="modal-header">
        <h3>Invoice Templates</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
      </div>
      <div class="modal-body" style="padding:0;">
        ${templatesHtml}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ============================================
// FINANCE MODULE - Unique Functions
// ============================================

function generateProfitLossStatement() {
  const transactions = getData('transaction') || [];
  const income = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = income.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;
  
  let report = 'PROFIT & LOSS STATEMENT\n';
  report += '=====================================\n';
  report += 'Income:\n';
  income.forEach(t => {
    report += '  - ' + t.description + ': $' + t.amount + '\n';
  });
  report += 'Total Income: $' + totalIncome.toLocaleString() + '\n\n';
  
  report += 'Expenses:\n';
  expenses.forEach(t => {
    report += '  - ' + t.description + ': $' + t.amount + '\n';
  });
  report += 'Total Expenses: $' + totalExpenses.toLocaleString() + '\n\n';
  
  report += 'Net Profit/Loss: $' + profit.toLocaleString();
  
  alert(report);
}

// ============================================
// PROJECTS MODULE - Unique Functions
// ============================================

function addProjectMilestone(projectId) {
  const name = prompt('Milestone name:');
  const dueDate = prompt('Due date (YYYY-MM-DD):');
  
  if (name && dueDate) {
    const projects = getData('project') || [];
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (!project.milestones) project.milestones = [];
    project.milestones.push({
      name: name,
      dueDate: dueDate,
      status: 'pending',
      id: Date.now()
    });
    
    setData('project', projects);
    showToast('Milestone added', 'success');
    renderModule('project');
  }
}

function trackProjectTime(projectId, hours) {
  const projects = getData('project') || [];
  const project = projects.find(p => p.id === projectId);
  if (!project) return;
  
  project.timeLogged = (project.timeLogged || 0) + hours;
  setData('project', projects);
  showToast('Time tracked: ' + hours + 'h', 'success');
  renderModule('project');
}

// ============================================
// INVENTORY MODULE - Unique Functions
// ============================================

function checkStockLevels() {
  const products = getData('product') || [];
  const lowStock = products.filter(p => (p.quantity || 0) < (p.reorderLevel || 10));
  
  if (lowStock.length === 0) {
    showToast('All products are in stock', 'success');
  } else {
    alert('LOW STOCK ALERT\n\n' + lowStock.map(p => 
      `${p.name}: ${p.quantity} units (Reorder at ${p.reorderLevel || 10})`
    ).join('\n'));
  }
}

function recordStockMovement(productId, type, quantity, notes) {
  const products = getData('product') || [];
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  if (!product.movements) product.movements = [];
  product.movements.push({
    type: type, // 'in' or 'out'
    quantity: quantity,
    notes: notes,
    date: new Date().toISOString().split('T')[0]
  });
  
  if (type === 'in') {
    product.quantity = (product.quantity || 0) + quantity;
  } else {
    product.quantity = Math.max(0, (product.quantity || 0) - quantity);
  }
  
  setData('product', products);
  showToast('Stock recorded: ' + type.toUpperCase() + ' ' + quantity + ' units', 'success');
  renderModule('products');
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

// Make functions globally available
window.convertToDeal = convertToDeal;
window.setFollowUpReminder = setFollowUpReminder;
window.viewCommunicationLog = viewCommunicationLog;
window.addCommunication = addCommunication;
window.clockIn = clockIn;
window.clockOut = clockOut;
window.requestLeave = requestLeave;
window.calculatePayroll = calculatePayroll;
window.addPerformanceReview = addPerformanceReview;
window.viewSalesForecast = viewSalesForecast;
window.calculateCommission = calculateCommission;
window.generateQuotation = generateQuotation;
window.switchInvoiceTemplate = switchInvoiceTemplate;
window.viewInvoiceWithTemplate = viewInvoiceWithTemplate;
window.switchViewTemplate = switchViewTemplate;
window.viewInvoiceTemplates = viewInvoiceTemplates;
window.createRecurringInvoice = createRecurringInvoice;
window.printInvoice = printInvoice;
window.downloadPDF = downloadPDF;
window.generateProfitLossStatement = generateProfitLossStatement;
window.addProjectMilestone = addProjectMilestone;
window.trackProjectTime = trackProjectTime;
window.checkStockLevels = checkStockLevels;
window.recordStockMovement = recordStockMovement;