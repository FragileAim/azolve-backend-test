// HRM App - Employee Management (localStorage-first)
let employees = [];
let editingEmployeeId = null;

function loadEmployees() {
    const stored = localStorage.getItem('hrm_employees');
    employees = stored ? JSON.parse(stored) : getSampleEmployees();
    if (!stored) localStorage.setItem('hrm_employees', JSON.stringify(employees));
    renderEmployeesTable();
    updateHrmStats();
}

function getSampleEmployees() {
    return [
        { _id: 'emp_1', firstName: 'James', lastName: 'Wilson', name: 'James Wilson', email: 'james.w@company.com', phone: '+1 555 1001', department: 'Engineering', position: 'Senior Developer', status: 'active', salary: 8500, startDate: '2022-03-15', notes: 'Team lead for backend' },
        { _id: 'emp_2', firstName: 'Maria', lastName: 'Garcia', name: 'Maria Garcia', email: 'maria.g@company.com', phone: '+1 555 1002', department: 'Marketing', position: 'Marketing Manager', status: 'active', salary: 7200, startDate: '2021-08-01', notes: 'Handles all campaigns' },
        { _id: 'emp_3', firstName: 'Robert', lastName: 'Chen', name: 'Robert Chen', email: 'robert.c@company.com', phone: '+1 555 1003', department: 'Sales', position: 'Sales Executive', status: 'active', salary: 6800, startDate: '2023-01-10', notes: '' },
        { _id: 'emp_4', firstName: 'Sofia', lastName: 'Patel', name: 'Sofia Patel', email: 'sofia.p@company.com', phone: '+1 555 1004', department: 'HR', position: 'HR Coordinator', status: 'on_leave', salary: 5500, startDate: '2022-11-20', notes: 'Maternity leave until March' },
        { _id: 'emp_5', firstName: 'Kevin', lastName: 'Brown', name: 'Kevin Brown', email: 'kevin.b@company.com', phone: '+1 555 1005', department: 'Finance', position: 'Financial Analyst', status: 'active', salary: 7800, startDate: '2020-06-05', notes: '' }
    ];
}

function getEmpName(emp) {
    if (emp.firstName || emp.lastName) return (emp.firstName + ' ' + (emp.lastName || '')).trim();
    return emp.name || 'Unknown';
}

function renderEmployeesTable() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;

    const searchVal = document.getElementById('employeeSearchInput')?.value?.toLowerCase() || '';
    const deptFilter = document.getElementById('employeeDepartmentFilter')?.value || '';

    let filtered = employees;
    if (deptFilter) filtered = filtered.filter(e => e.department === deptFilter);
    if (searchVal) filtered = filtered.filter(e =>
        getEmpName(e).toLowerCase().includes(searchVal) ||
        (e.email||'').toLowerCase().includes(searchVal) ||
        (e.position||'').toLowerCase().includes(searchVal)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#888;">
            <i class="fas fa-users" style="font-size:32px;display:block;margin-bottom:12px;opacity:.4;"></i>
            No employees found. <a href="#" onclick="openEmployeeModal()" style="color:#00A09D;">Add your first employee!</a></td></tr>`;
        return;
    }

    const statusColors = { active: 'success', inactive: 'danger', on_leave: 'warning' };
    const statusLabels = { active: 'Active', inactive: 'Inactive', on_leave: 'On Leave' };

    tbody.innerHTML = filtered.map(emp => {
        const name = getEmpName(emp);
        const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
        const statusBadge = statusColors[emp.status] || 'secondary';
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00A09D,#00C9C6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${initials}</div>
                    <div>
                        <div style="font-weight:700;color:#2c3e50;">${name}</div>
                        ${emp.phone ? `<div style="font-size:12px;color:#888;">${emp.phone}</div>` : ''}
                    </div>
                </div>
            </td>
            <td style="font-size:13px;">${emp.email || '-'}</td>
            <td style="font-size:13px;">${emp.department || '-'}</td>
            <td style="font-size:13px;">${emp.position || '-'}</td>
            <td><span class="badge badge-${statusBadge}">${statusLabels[emp.status] || emp.status}</span></td>
            <td style="font-weight:700;color:#00A09D;">${emp.salary ? '$'+Number(emp.salary).toLocaleString()+'/mo' : '-'}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon" onclick="openEmployeeModal('${emp._id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteEmployee('${emp._id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updateHrmStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const activeCount = employees.filter(e => e.status === 'active').length;
    const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].length;
    const totalSalary = employees.filter(e => e.status === 'active').reduce((s,e) => s+(e.salary||0), 0);
    // HTML IDs: hrmTotalEmployees, hrmActive, hrmDepts, hrmPayroll
    setEl('hrmTotalEmployees', employees.length);
    setEl('hrmActive', activeCount);
    setEl('hrmDepts', depts);
    setEl('hrmPayroll', '$' + (totalSalary >= 1000 ? (totalSalary/1000).toFixed(0)+'k' : totalSalary.toLocaleString()));
    // Legacy IDs (keep for safety)
    setEl('hrmActiveEmployees', activeCount);
    setEl('hrmOnLeave', employees.filter(e => e.status === 'on_leave').length);
    setEl('hrmTotalSalary', '$' + (totalSalary >= 1000 ? (totalSalary/1000).toFixed(0)+'k' : totalSalary.toLocaleString()));
}

function searchEmployees() { renderEmployeesTable(); }
function filterEmployees() { renderEmployeesTable(); }

function openEmployeeModal(empId) {
    empId = empId || null;
    editingEmployeeId = empId;
    const modal = document.getElementById('employeeModal');
    if (!modal) return;
    const title = document.getElementById('employeeModalTitle');

    // Clear form
    ['empFirstName','empLastName','empEmail','empPosition'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const deptEl = document.getElementById('empDepartment');
    if (deptEl) deptEl.value = 'Engineering';
    const statusEl = document.getElementById('empStatus');
    if (statusEl) statusEl.value = 'active';
    const salaryEl = document.getElementById('empSalary');
    if (salaryEl) salaryEl.value = '';
    const editIdEl = document.getElementById('empEditId');
    if (editIdEl) editIdEl.value = '';

    if (empId) {
        const emp = employees.find(e => e._id === empId);
        if (!emp) return;
        if (title) title.textContent = 'Edit Employee';
        if (editIdEl) editIdEl.value = emp._id;
        const fn = document.getElementById('empFirstName');
        const ln = document.getElementById('empLastName');
        if (fn) fn.value = emp.firstName || (emp.name ? emp.name.split(' ')[0] : '');
        if (ln) ln.value = emp.lastName || (emp.name ? emp.name.split(' ').slice(1).join(' ') : '');
        if (document.getElementById('empEmail')) document.getElementById('empEmail').value = emp.email || '';
        if (deptEl) deptEl.value = emp.department || 'Engineering';
        if (document.getElementById('empPosition')) document.getElementById('empPosition').value = emp.position || '';
        if (statusEl) statusEl.value = emp.status || 'active';
        if (salaryEl) salaryEl.value = emp.salary || '';
    } else {
        if (title) title.textContent = 'Add Employee';
    }
    modal.classList.add('active');
}

function closeEmployeeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) modal.classList.remove('active');
    editingEmployeeId = null;
}

function saveEmployee() {
    const firstName = (document.getElementById('empFirstName')?.value || '').trim();
    const lastName = (document.getElementById('empLastName')?.value || '').trim();
    const email = (document.getElementById('empEmail')?.value || '').trim();

    if (!firstName) { showToast('First name is required', 'error'); return; }
    if (!email) { showToast('Email is required', 'error'); return; }

    const empData = {
        firstName,
        lastName,
        name: (firstName + ' ' + lastName).trim(),
        email,
        department: document.getElementById('empDepartment')?.value || 'Engineering',
        position: (document.getElementById('empPosition')?.value || '').trim(),
        status: document.getElementById('empStatus')?.value || 'active',
        salary: parseFloat(document.getElementById('empSalary')?.value) || 0
    };

    const currentEditId = document.getElementById('empEditId')?.value || editingEmployeeId;

    if (currentEditId) {
        const idx = employees.findIndex(e => e._id === currentEditId);
        if (idx !== -1) { employees[idx] = { ...employees[idx], ...empData }; showToast('Employee updated!', 'success'); }
    } else {
        employees.unshift({ ...empData, _id: 'emp_' + Date.now(), startDate: new Date().toISOString().split('T')[0] });
        showToast('Employee added!', 'success');
    }

    localStorage.setItem('hrm_employees', JSON.stringify(employees));
    closeEmployeeModal();
    renderEmployeesTable();
    updateHrmStats();
}

function deleteEmployee(empId) {
    if (!confirm('Delete this employee?')) return;
    employees = employees.filter(e => e._id !== empId);
    localStorage.setItem('hrm_employees', JSON.stringify(employees));
    renderEmployeesTable();
    updateHrmStats();
    showToast('Employee deleted', 'success');
}