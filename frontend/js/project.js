// Project App - Kanban Board & Task Management
const PROJECT_API_BASE = 'http://localhost:5001/api';

let projects = [];
let tasks = [];
let currentProjectId = null;
let editingTaskId = null;
let editingProjectId = null;

// Initialize Project App
function initProjectApp() {
    loadProjects();
}

// Load Projects from localStorage
function loadProjects() {
    const stored = localStorage.getItem('azolve_projects');
    projects = stored ? JSON.parse(stored) : getSampleProjects();
    if (!stored) localStorage.setItem('azolve_projects', JSON.stringify(projects));

    const storedTasks = localStorage.getItem('azolve_tasks');
    tasks = storedTasks ? JSON.parse(storedTasks) : getSampleTasks();
    if (!storedTasks) localStorage.setItem('azolve_tasks', JSON.stringify(tasks));

    renderProjectsSidebar();
    if (projects.length > 0) {
        selectProject(projects[0]._id);
    } else {
        renderKanban(null);
    }
    updateProjectStats();
}

// Sample data
function getSampleProjects() {
    return [
        { _id: 'proj_1', name: 'Website Redesign', color: '#714B67', description: 'Complete overhaul of company website', status: 'active', createdAt: new Date().toISOString() },
        { _id: 'proj_2', name: 'Mobile App Launch', color: '#00A09D', description: 'iOS and Android app release', status: 'active', createdAt: new Date().toISOString() },
        { _id: 'proj_3', name: 'Q4 Marketing Campaign', color: '#F5A623', description: 'End of year marketing push', status: 'active', createdAt: new Date().toISOString() }
    ];
}

function getSampleTasks() {
    return [
        { _id: 'task_1', projectId: 'proj_1', title: 'Design wireframes', description: 'Create low-fidelity wireframes for all pages', status: 'done', priority: 'high', assignee: 'Alice Johnson', dueDate: '2025-07-15', tags: ['design'] },
        { _id: 'task_2', projectId: 'proj_1', title: 'Build homepage', description: 'Implement the new homepage design', status: 'in_progress', priority: 'high', assignee: 'Bob Smith', dueDate: '2025-07-25', tags: ['dev'] },
        { _id: 'task_3', projectId: 'proj_1', title: 'SEO optimization', description: 'Optimize meta tags and content for SEO', status: 'todo', priority: 'medium', assignee: 'Carol White', dueDate: '2025-08-01', tags: ['marketing'] },
        { _id: 'task_4', projectId: 'proj_1', title: 'QA Testing', description: 'Test all pages across browsers', status: 'review', priority: 'high', assignee: 'Dave Brown', dueDate: '2025-07-30', tags: ['qa'] },
        { _id: 'task_5', projectId: 'proj_2', title: 'API integration', description: 'Connect app to backend APIs', status: 'in_progress', priority: 'critical', assignee: 'Alice Johnson', dueDate: '2025-07-20', tags: ['dev'] },
        { _id: 'task_6', projectId: 'proj_2', title: 'Push notifications', description: 'Implement push notification system', status: 'todo', priority: 'medium', assignee: 'Bob Smith', dueDate: '2025-07-28', tags: ['dev'] },
        { _id: 'task_7', projectId: 'proj_3', title: 'Create ad copy', description: 'Write copy for all ad campaigns', status: 'done', priority: 'high', assignee: 'Carol White', dueDate: '2025-07-10', tags: ['content'] },
        { _id: 'task_8', projectId: 'proj_3', title: 'Social media schedule', description: 'Plan and schedule social media posts', status: 'review', priority: 'medium', assignee: 'Dave Brown', dueDate: '2025-07-22', tags: ['social'] }
    ];
}

// Render Projects Sidebar
function renderProjectsSidebar() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    if (projects.length === 0) {
        container.innerHTML = '<p style="color:#888;font-size:13px;padding:10px 0;">No projects yet. Create one!</p>';
        return;
    }

    container.innerHTML = projects.map(proj => {
        const projTasks = tasks.filter(t => t.projectId === proj._id);
        const doneTasks = projTasks.filter(t => t.status === 'done').length;
        const progress = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;
        const isActive = currentProjectId === proj._id;

        return `
        <div class="project-list-item ${isActive ? 'active' : ''}" onclick="selectProject('${proj._id}')">
            <div class="project-list-dot" style="background:${proj.color}"></div>
            <div class="project-list-info">
                <div class="project-list-name">${proj.name}</div>
                <div class="project-list-progress">
                    <div class="project-progress-bar">
                        <div class="project-progress-fill" style="width:${progress}%;background:${proj.color}"></div>
                    </div>
                    <span>${doneTasks}/${projTasks.length} tasks</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Select Project
function selectProject(projectId) {
    currentProjectId = projectId;
    renderProjectsSidebar();
    renderKanban(projectId);
    updateProjectStats();
}

// Render Kanban Board
function renderKanban(projectId) {
    const columns = [
        { id: 'todo', label: 'To Do', color: '#6c757d', icon: 'fas fa-circle' },
        { id: 'in_progress', label: 'In Progress', color: '#007bff', icon: 'fas fa-spinner' },
        { id: 'review', label: 'Review', color: '#fd7e14', icon: 'fas fa-eye' },
        { id: 'done', label: 'Done', color: '#28a745', icon: 'fas fa-check-circle' }
    ];

    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    if (!projectId) {
        board.innerHTML = '<div style="text-align:center;padding:60px;color:#888;"><i class="fas fa-project-diagram" style="font-size:48px;margin-bottom:16px;display:block;"></i><p>Select or create a project to get started</p></div>';
        return;
    }

    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const project = projects.find(p => p._id === projectId);

    board.innerHTML = columns.map(col => {
        const colTasks = projectTasks.filter(t => t.status === col.id);
        return `
        <div class="kanban-column" id="col-${col.id}">
            <div class="kanban-col-header">
                <div class="kanban-col-title">
                    <i class="${col.icon}" style="color:${col.color}"></i>
                    <span>${col.label}</span>
                    <span class="kanban-col-count">${colTasks.length}</span>
                </div>
                <button class="kanban-add-btn" onclick="openTaskModal(null, '${col.id}')">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="kanban-cards" id="cards-${col.id}" 
                 ondragover="allowDrop(event)" 
                 ondrop="dropTask(event, '${col.id}')">
                ${colTasks.map(task => renderTaskCard(task)).join('')}
            </div>
        </div>`;
    }).join('');
}

// Render Task Card
function renderTaskCard(task) {
    const priorityColors = { critical: '#dc3545', high: '#fd7e14', medium: '#ffc107', low: '#28a745' };
    const priorityColor = priorityColors[task.priority] || '#6c757d';
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    const tags = (task.tags || []).map(tag => `<span class="task-tag">${tag}</span>`).join('');

    return `
    <div class="kanban-card" draggable="true" 
         ondragstart="dragTask(event, '${task._id}')"
         onclick="openTaskModal('${task._id}')">
        <div class="kanban-card-priority" style="background:${priorityColor}"></div>
        <div class="kanban-card-body">
            <div class="kanban-card-title">${task.title}</div>
            ${task.description ? `<div class="kanban-card-desc">${task.description}</div>` : ''}
            ${tags ? `<div class="kanban-card-tags">${tags}</div>` : ''}
            <div class="kanban-card-footer">
                <div class="kanban-card-meta">
                    ${task.assignee ? `<span class="task-assignee"><i class="fas fa-user"></i> ${task.assignee.split(' ')[0]}</span>` : ''}
                    ${dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}"><i class="fas fa-calendar"></i> ${dueDate}</span>` : ''}
                </div>
                <div class="task-actions-inline">
                    <button onclick="event.stopPropagation();deleteTask('${task._id}')" class="task-delete-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

// Drag & Drop
let draggedTaskId = null;

function dragTask(event, taskId) {
    draggedTaskId = taskId;
    event.dataTransfer.setData('text/plain', taskId);
}

function allowDrop(event) {
    event.preventDefault();
}

function dropTask(event, newStatus) {
    event.preventDefault();
    const taskId = draggedTaskId || event.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const taskIndex = tasks.findIndex(t => t._id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus;
        saveTasks();
        renderKanban(currentProjectId);
        updateProjectStats();
        showToast(`Task moved to ${newStatus.replace('_', ' ')}`, 'success');
    }
}

// Open Task Modal
function openTaskModal(taskId, defaultStatus = 'todo') {
    editingTaskId = taskId;
    const editIdEl = document.getElementById('taskEditId'); if(editIdEl) editIdEl.value = taskId || '';
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');

    if (taskId) {
        const task = tasks.find(t => t._id === taskId);
        if (!task) return;
        title.textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskPriority').value = task.priority || 'medium';
        document.getElementById('taskAssignee').value = task.assignee || '';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        const tagsEl = document.getElementById('taskTags'); if (tagsEl) tagsEl.value = (task.tags || []).join(', ');
    } else {
        title.textContent = 'Add New Task';
        // Clear form fields manually
        ['taskTitle','taskDescription','taskAssignee'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        const taskDateEl = document.getElementById('taskDueDate'); if(taskDateEl) taskDateEl.value='';
        document.getElementById('taskStatus').value = defaultStatus;
        document.getElementById('taskPriority').value = 'medium';
    }

    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    editingTaskId = null;
}

// Save Task
function saveTask() {
    const titleEl = document.getElementById('taskTitle');
    if (!titleEl.value.trim()) {
        showToast('Task title is required', 'error');
        return;
    }

    const taskData = {
        projectId: currentProjectId,
        title: titleEl.value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value.trim(),
        dueDate: document.getElementById('taskDueDate').value,
        tags: (document.getElementById('taskTags')?.value || '').split(',').map(t => t.trim()).filter(Boolean)
    };

    if (editingTaskId) {
        const idx = tasks.findIndex(t => t._id === editingTaskId);
        if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], ...taskData };
            showToast('Task updated!', 'success');
        }
    } else {
        tasks.push({ ...taskData, _id: 'task_' + Date.now() });
        showToast('Task added!', 'success');
    }

    saveTasks();
    closeTaskModal();
    renderKanban(currentProjectId);
    renderProjectsSidebar();
    updateProjectStats();
}

function saveTasks() {
    localStorage.setItem('azolve_tasks', JSON.stringify(tasks));
}

// Delete Task
function deleteTask(taskId) {
    tasks = tasks.filter(t => t._id !== taskId);
    saveTasks();
    renderKanban(currentProjectId);
    renderProjectsSidebar();
    updateProjectStats();
    showToast('Task deleted', 'success');
}

// Open Project Modal
function openProjectModal(projectId = null) {
    editingProjectId = projectId;
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');

    if (projectId) {
        const proj = projects.find(p => p._id === projectId);
        if (!proj) return;
        title.textContent = 'Edit Project';
        document.getElementById('projectName').value = proj.name;
        document.getElementById('projectDescription').value = proj.description || '';
        document.getElementById('projectColor').value = proj.color || '#714B67';
    } else {
        title.textContent = 'New Project';
        // Clear form fields manually
        ['projectName','projectDescription'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        document.getElementById('projectColor').value = '#714B67';
    }

    modal.classList.add('active');
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('active');
    editingProjectId = null;
}

function saveProject() {
    const nameEl = document.getElementById('projectName');
    if (!nameEl.value.trim()) {
        showToast('Project name is required', 'error');
        return;
    }

    const projectData = {
        name: nameEl.value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        color: document.getElementById('projectColor').value,
        status: 'active',
        createdAt: new Date().toISOString()
    };

    if (editingProjectId) {
        const idx = projects.findIndex(p => p._id === editingProjectId);
        if (idx !== -1) {
            projects[idx] = { ...projects[idx], ...projectData };
            showToast('Project updated!', 'success');
        }
    } else {
        const newProj = { ...projectData, _id: 'proj_' + Date.now() };
        projects.push(newProj);
        currentProjectId = newProj._id;
        showToast('Project created!', 'success');
    }

    localStorage.setItem('azolve_projects', JSON.stringify(projects));
    closeProjectModal();
    renderProjectsSidebar();
    renderKanban(currentProjectId);
    updateProjectStats();
}

// Update Project Stats
function updateProjectStats() {
    const totalTasksEl = document.getElementById('projectTotalTasks');
    const completedTasksEl = document.getElementById('projectCompletedTasks');
    const inProgressEl = document.getElementById('projectInProgress');
    const totalProjectsEl = document.getElementById('projectTotalProjects');

    if (totalTasksEl) totalTasksEl.textContent = tasks.length;
    if (completedTasksEl) completedTasksEl.textContent = tasks.filter(t => t.status === 'done').length;
    if (inProgressEl) inProgressEl.textContent = tasks.filter(t => t.status === 'in_progress').length;
    if (totalProjectsEl) totalProjectsEl.textContent = projects.length;

    // Update global dashboard stats
    const totalEmployeesEl = document.getElementById('totalProjects');
    if (totalEmployeesEl) totalEmployeesEl.textContent = projects.length;
}

// Search Tasks
function searchTasks() {
    const query = document.getElementById('taskSearchInput')?.value?.toLowerCase() || '';
    if (!query) {
        renderKanban(currentProjectId);
        return;
    }

    const filtered = tasks.filter(t =>
        t.projectId === currentProjectId &&
        (t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
    );

    // Temporarily filter display
    const board = document.getElementById('kanbanBoard');
    if (!board) return;

    const columns = ['todo', 'in_progress', 'review', 'done'];
    columns.forEach(status => {
        const cardsContainer = document.getElementById(`cards-${status}`);
        if (cardsContainer) {
            const colTasks = filtered.filter(t => t.status === status);
            cardsContainer.innerHTML = colTasks.map(task => renderTaskCard(task)).join('');
        }
    });
}