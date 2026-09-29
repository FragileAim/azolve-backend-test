// Finance App - Transaction & Budget Management (localStorage-first)
let transactions = [];
let editingTxId = null;

const TX_INCOME_CATS = ['Sales Revenue', 'Service Income', 'Consulting', 'Investment', 'Refund', 'Other Income'];
const TX_EXPENSE_CATS = ['Salaries', 'Marketing', 'Rent & Utilities', 'Software & Tools', 'Travel', 'Equipment', 'Legal & Admin', 'Other Expense'];

function initFinanceApp() {
    const stored = localStorage.getItem('azolve_transactions');
    transactions = stored ? JSON.parse(stored) : getSampleTransactions();
    if (!stored) localStorage.setItem('azolve_transactions', JSON.stringify(transactions));
    updateFinanceStats();
    updateTxCategories();
    renderRecentTransactions();
    renderFinanceChart();
    renderBudgetBars();
}

function getSampleTransactions() {
    return [
        { _id: 'tx_1', description: 'Client Payment - TechCorp', type: 'income', category: 'Sales Revenue', amount: 8500, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
        { _id: 'tx_2', description: 'Monthly Office Rent', type: 'expense', category: 'Rent & Utilities', amount: 2200, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
        { _id: 'tx_3', description: 'Consulting Revenue - MediaGroup', type: 'income', category: 'Consulting', amount: 4500, date: new Date(Date.now()-2*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-2*86400000).toISOString() },
        { _id: 'tx_4', description: 'Software Subscriptions (Annual)', type: 'expense', category: 'Software & Tools', amount: 1850, date: new Date(Date.now()-3*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-3*86400000).toISOString() },
        { _id: 'tx_5', description: 'Employee Salaries - March', type: 'expense', category: 'Salaries', amount: 24000, date: new Date(Date.now()-5*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-5*86400000).toISOString() },
        { _id: 'tx_6', description: 'Service Income - StartupX', type: 'income', category: 'Service Income', amount: 6800, date: new Date(Date.now()-7*86400000).toISOString().split('T')[0], createdAt: new Date(Date.now()-7*86400000).toISOString() }
    ];
}

function renderTransactionsTable() {
    const tbody = document.getElementById('txTableBody');
    if (!tbody) return;

    const typeFilter = document.getElementById('txTypeFilter')?.value || 'all';
    const searchVal = document.getElementById('txSearchInput')?.value?.toLowerCase() || '';
    const monthFilter = '';

    let filtered = transactions;
    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    if (searchVal) filtered = filtered.filter(t =>
        (t.description||'').toLowerCase().includes(searchVal) ||
        (t.category||'').toLowerCase().includes(searchVal)
    );
    if (monthFilter) filtered = filtered.filter(t => (t.date||'').startsWith(monthFilter));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">
            <i class="fas fa-wallet" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>
            No transactions found. <a href="#" onclick="openTransactionModal()" style="color:#fd7e14;">Add your first transaction!</a></td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(tx => {
        const isIncome = tx.type === 'income';
        const date = tx.date ? new Date(tx.date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '-';
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;border-radius:8px;background:${isIncome ? '#e9f7ec' : '#ffeef0'};color:${isIncome ? '#28a745' : '#dc3545'};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;">
                        <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div>
                        <div style="font-weight:600;color:#2c3e50;font-size:13px;">${tx.description}</div>
                        <div style="font-size:11px;color:#888;">${tx.category || '-'}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-${isIncome ? 'success' : 'danger'}">${isIncome ? 'Income' : 'Expense'}</span></td>
            <td style="font-size:13px;color:#666;">${tx.category || '-'}</td>
            <td style="font-weight:700;color:${isIncome ? '#28a745' : '#dc3545'};">${isIncome ? '+' : '-'}$${Number(tx.amount||0).toLocaleString()}</td>
            <td style="font-size:12px;color:#888;">${date}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="openTransactionModal('${tx._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteTransaction('${tx._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateFinanceStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s+(t.amount||0), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s,t) => s+(t.amount||0), 0);
    const balance = income - expenses;

    setEl('finTotalIncome', '$' + income.toLocaleString());
    setEl('finTotalExpenses', '$' + expenses.toLocaleString());
    setEl('finNetBalance', (balance >= 0 ? '+$' : '-$') + Math.abs(balance).toLocaleString());
    setEl('finTxCount', transactions.length);
}

function renderBudgetBars() {
    const container = document.getElementById('budgetCards');
    if (!container) return;
    const budgetData = [
        { label: 'Salaries', budget: 30000, spent: transactions.filter(t => t.category === 'Salaries').reduce((s,t) => s+(t.amount||0), 0), color: '#714B67' },
        { label: 'Marketing', budget: 5000, spent: transactions.filter(t => t.category === 'Marketing').reduce((s,t) => s+(t.amount||0), 0), color: '#fd7e14' },
        { label: 'Software & Tools', budget: 3000, spent: transactions.filter(t => t.category === 'Software & Tools').reduce((s,t) => s+(t.amount||0), 0), color: '#007bff' },
        { label: 'Rent & Utilities', budget: 4000, spent: transactions.filter(t => t.category === 'Rent & Utilities').reduce((s,t) => s+(t.amount||0), 0), color: '#28a745' }
    ];
    container.innerHTML = budgetData.map(b => {
        const pct = Math.min(100, Math.round((b.spent / b.budget) * 100));
        const color = pct > 90 ? '#dc3545' : pct > 70 ? '#ffc107' : b.color;
        return `
        <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:13px;font-weight:600;color:#2c3e50;">${b.label}</span>
                <span style="font-size:12px;color:#888;">$${b.spent.toLocaleString()} / $${b.budget.toLocaleString()}</span>
            </div>
            <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width .3s;"></div>
            </div>
            <div style="font-size:11px;color:${color};text-align:right;margin-top:3px;">${pct}% used</div>
        </div>`;
    }).join('');
}

function filterTransactions() { renderTransactionsTable(); }
function searchTransactions() { renderTransactionsTable(); }

function updateTxCategories() {
    const typeEl = document.getElementById('txType');
    const catEl = document.getElementById('txCategory');
    if (!catEl) return;
    const type = typeEl ? typeEl.value : 'expense';
    const cats = type === 'income' ? TX_INCOME_CATS : TX_EXPENSE_CATS;
    catEl.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function openTransactionModal(txId) {
    txId = txId || null;
    editingTxId = txId;
    const modal = document.getElementById('transactionModal');
    if (!modal) return;
    const title = document.getElementById('transactionModalTitle');

    // Clear form
    const descEl = document.getElementById('txDescription');
    if (descEl) descEl.value = '';
    const typeEl = document.getElementById('txType');
    if (typeEl) typeEl.value = 'income';
    const amountEl = document.getElementById('txAmount');
    if (amountEl) amountEl.value = '';
    const dateEl = document.getElementById('txDate');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    const editIdEl = document.getElementById('txEditId');
    if (editIdEl) editIdEl.value = '';

    // Populate categories for default type
    updateTxCategories();

    if (txId) {
        const tx = transactions.find(t => t._id === txId);
        if (!tx) return;
        if (title) title.textContent = 'Edit Transaction';
        if (editIdEl) editIdEl.value = tx._id;
        if (typeEl) typeEl.value = tx.type || 'expense';
        updateTxCategories();
        const catEl = document.getElementById('txCategory');
        if (catEl) catEl.value = tx.category || '';
        if (descEl) descEl.value = tx.description || '';
        if (amountEl) amountEl.value = tx.amount || '';
        if (dateEl) dateEl.value = tx.date || new Date().toISOString().split('T')[0];
    } else {
        if (title) title.textContent = 'Add Transaction';
    }
    modal.classList.add('active');
}

function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) modal.classList.remove('active');
    editingTxId = null;
}

function saveTransaction() {
    const descEl = document.getElementById('txDescription');
    if (!descEl || !descEl.value.trim()) { showToast('Description is required', 'error'); return; }
    const amountEl = document.getElementById('txAmount');
    if (!amountEl || !amountEl.value || parseFloat(amountEl.value) <= 0) { showToast('Valid amount is required', 'error'); return; }

    const txData = {
        description: descEl.value.trim(),
        type: document.getElementById('txType')?.value || 'expense',
        category: document.getElementById('txCategory')?.value || '',
        amount: parseFloat(amountEl.value),
        date: document.getElementById('txDate')?.value || new Date().toISOString().split('T')[0]
    };

    const currentEditId = document.getElementById('txEditId')?.value || editingTxId;

    if (currentEditId) {
        const idx = transactions.findIndex(t => t._id === currentEditId);
        if (idx !== -1) { transactions[idx] = { ...transactions[idx], ...txData }; showToast('Transaction updated!', 'success'); }
    } else {
        transactions.unshift({ ...txData, _id: 'tx_' + Date.now(), createdAt: new Date().toISOString() });
        showToast('Transaction added!', 'success');
    }

    localStorage.setItem('azolve_transactions', JSON.stringify(transactions));
    closeTransactionModal();
    renderTransactionsTable();
    updateFinanceStats();
    renderBudgetBars();
}

function deleteTransaction(txId) {
    if (!confirm('Delete this transaction?')) return;
    transactions = transactions.filter(t => t._id !== txId);
    localStorage.setItem('azolve_transactions', JSON.stringify(transactions));
    renderTransactionsTable();
    updateFinanceStats();
    renderBudgetBars();
    showToast('Transaction deleted', 'success');
}
// Finance View Tab Switching
function switchFinanceView(view) {
    const views = ['overview', 'transactions', 'budget'];
    views.forEach(v => {
        const el = document.getElementById('finance' + v.charAt(0).toUpperCase() + v.slice(1));
        if (el) el.style.display = v === view ? '' : 'none';
        const btn = document.getElementById('finView' + v.charAt(0).toUpperCase() + v.slice(1));
        if (btn) btn.classList.toggle('active', v === view);
    });
    if (view === 'transactions') renderTransactionsTable();
    if (view === 'budget') renderBudgetBars();
    if (view === 'overview') { renderRecentTransactions(); renderFinanceChart(); }
}

function renderRecentTransactions() {
    const tbody = document.getElementById('recentTxBody');
    if (!tbody) return;
    const recent = [...transactions].sort((a,b) => new Date(b.date||b.createdAt) - new Date(a.date||a.createdAt)).slice(0, 5);
    if (recent.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:20px;">No transactions yet.</td></tr>'; return; }
    tbody.innerHTML = recent.map(tx => {
        const isIncome = tx.type === 'income';
        return `<tr>
            <td style="font-size:13px;">${tx.description}</td>
            <td style="font-size:12px;color:#666;">${tx.category || '-'}</td>
            <td><span class="badge badge-${isIncome ? 'success' : 'danger'}">${isIncome ? 'Income' : 'Expense'}</span></td>
            <td style="font-weight:700;color:${isIncome ? '#28a745' : '#dc3545'};">${isIncome ? '+' : '-'}$${Number(tx.amount||0).toLocaleString()}</td>
            <td style="font-size:12px;color:#888;">${tx.date || '-'}</td>
        </tr>`;
    }).join('');
}

function renderFinanceChart() {
    const barsEl = document.getElementById('financeChartBars');
    const labelsEl = document.getElementById('financeChartLabels');
    if (!barsEl || !labelsEl) return;

    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), key: d.toISOString().slice(0, 7) });
    }

    const maxVal = months.reduce((max, m) => {
        const inc = transactions.filter(t => t.type === 'income' && (t.date||'').startsWith(m.key)).reduce((s,t) => s+(t.amount||0), 0);
        const exp = transactions.filter(t => t.type === 'expense' && (t.date||'').startsWith(m.key)).reduce((s,t) => s+(t.amount||0), 0);
        return Math.max(max, inc, exp);
    }, 1);

    barsEl.innerHTML = months.map(m => {
        const inc = transactions.filter(t => t.type === 'income' && (t.date||'').startsWith(m.key)).reduce((s,t) => s+(t.amount||0), 0);
        const exp = transactions.filter(t => t.type === 'expense' && (t.date||'').startsWith(m.key)).reduce((s,t) => s+(t.amount||0), 0);
        const incPct = Math.round((inc / maxVal) * 140);
        const expPct = Math.round((exp / maxVal) * 140);
        return `<div class="chart-bar-group" title="${m.label}: Income $${inc.toLocaleString()}, Expenses $${exp.toLocaleString()}">
            <div class="chart-bar" style="height:${incPct}px;background:#28a745;"></div>
            <div class="chart-bar" style="height:${expPct}px;background:#dc3545;"></div>
        </div>`;
    }).join('');

    labelsEl.innerHTML = months.map(m => `<div class="chart-label">${m.label}</div>`).join('');
}

function addBudgetCategory() {
    const name = prompt('Budget category name:');
    if (!name) return;
    const budget = parseFloat(prompt('Monthly budget amount ($):') || '0');
    showToast('Budget category "' + name + '" added!', 'success');
}
