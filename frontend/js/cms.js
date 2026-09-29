// CMS App - Content Management System
const CMS_API_BASE = 'http://localhost:5001/api';

let cmsContent = [];
let cmsCategories = [];
let editingContentId = null;
let currentCmsFilter = 'all';

// Initialize CMS App
function initCmsApp() {
    loadCmsContent();
}

// Load CMS Content from localStorage
function loadCmsContent() {
    const stored = localStorage.getItem('azolve_cms_content');
    cmsContent = stored ? JSON.parse(stored) : getSampleContent();
    if (!stored) localStorage.setItem('azolve_cms_content', JSON.stringify(cmsContent));

    const storedCats = localStorage.getItem('azolve_cms_categories');
    cmsCategories = storedCats ? JSON.parse(storedCats) : ['Blog', 'Page', 'News', 'Documentation', 'Landing Page'];
    if (!storedCats) localStorage.setItem('azolve_cms_categories', JSON.stringify(cmsCategories));

    renderCmsTable();
    updateCmsStats();
    populateCmsCategories();
}

// Sample Content
function getSampleContent() {
    return [
        {
            _id: 'content_1',
            title: 'Welcome to AZOLVE Platform',
            type: 'Page',
            status: 'published',
            author: 'Admin',
            category: 'Page',
            slug: 'welcome-to-azolve',
            body: 'Welcome to the AZOLVE SaaS platform. This is your central hub for managing your business.',
            excerpt: 'Welcome to AZOLVE, your all-in-one business management solution.',
            tags: ['welcome', 'platform'],
            featured: true,
            views: 1240,
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
        },
        {
            _id: 'content_2',
            title: 'Getting Started with CRM',
            type: 'Blog',
            status: 'published',
            author: 'Admin',
            category: 'Blog',
            slug: 'getting-started-crm',
            body: 'Learn how to use the CRM module to manage your leads and customers effectively.',
            excerpt: 'A comprehensive guide to using the CRM module in AZOLVE.',
            tags: ['crm', 'guide', 'tutorial'],
            featured: false,
            views: 856,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
        },
        {
            _id: 'content_3',
            title: 'HRM Best Practices 2025',
            type: 'Blog',
            status: 'draft',
            author: 'Admin',
            category: 'Blog',
            slug: 'hrm-best-practices-2025',
            body: 'Discover the best practices for managing your human resources in the modern workplace.',
            excerpt: 'Top HR management strategies for 2025.',
            tags: ['hrm', 'best-practices'],
            featured: false,
            views: 0,
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: 'content_4',
            title: 'New Features Release Notes v2.0',
            type: 'News',
            status: 'published',
            author: 'Admin',
            category: 'News',
            slug: 'features-v2-release-notes',
            body: 'We are excited to announce the release of AZOLVE v2.0 with many new features.',
            excerpt: 'AZOLVE v2.0 is here with exciting new features and improvements.',
            tags: ['release', 'features', 'news'],
            featured: true,
            views: 2100,
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            _id: 'content_5',
            title: 'API Documentation',
            type: 'Documentation',
            status: 'archived',
            author: 'Admin',
            category: 'Documentation',
            slug: 'api-documentation',
            body: 'Complete API documentation for AZOLVE platform integrations.',
            excerpt: 'Full API reference for developers integrating with AZOLVE.',
            tags: ['api', 'docs', 'developers'],
            featured: false,
            views: 3400,
            createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 10 * 86400000).toISOString()
        }
    ];
}

// Render CMS Table
function renderCmsTable() {
    const tbody = document.getElementById('cmsTableBody');
    if (!tbody) return;

    let filtered = cmsContent;

    // Apply filter
    if (currentCmsFilter !== 'all') {
        filtered = filtered.filter(c => c.status === currentCmsFilter);
    }

    // Apply search
    const searchVal = document.getElementById('cmsSearchInput')?.value?.toLowerCase() || '';
    if (searchVal) {
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(searchVal) ||
            (c.category || '').toLowerCase().includes(searchVal) ||
            (c.tags || []).some(t => t.toLowerCase().includes(searchVal))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:40px;color:#888;">
                    <i class="fas fa-file-alt" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                    No content found. Create your first piece of content!
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const statusClass = item.status === 'published' ? 'success' : item.status === 'draft' ? 'warning' : 'secondary';
        const date = new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return `
        <tr>
            <td>
                <div style="font-weight:600;color:#2c3e50;">${item.title}</div>
                <div style="font-size:12px;color:#888;">${item.slug}</div>
            </td>
            <td><span class="badge badge-outline">${item.type || item.category}</span></td>
            <td><span class="badge badge-${statusClass}">${item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span></td>
            <td>${item.author || 'Admin'}</td>
            <td>
                <div style="font-size:13px;">${date}</div>
            </td>
            <td>
                <span style="color:#714B67;font-weight:600;">
                    <i class="fas fa-eye" style="margin-right:4px;"></i>${(item.views || 0).toLocaleString()}
                </span>
            </td>
            <td>
                <div style="display:flex;gap:8px;">
                    <button class="btn-icon" onclick="editContent('${item._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="toggleContentStatus('${item._id}')" title="${item.status === 'published' ? 'Unpublish' : 'Publish'}">
                        <i class="fas fa-${item.status === 'published' ? 'eye-slash' : 'globe'}"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteContent('${item._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Filter CMS content
function filterCmsContent(status) {
    currentCmsFilter = status;

    // Update active tab
    document.querySelectorAll('.cms-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-filter="${status}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    renderCmsTable();
}

// Search CMS
function searchCmsContent() {
    renderCmsTable();
}

// Update CMS Stats
function updateCmsStats() {
    const totalEl = document.getElementById('cmsTotalContent');
    const publishedEl = document.getElementById('cmsPublished');
    const draftEl = document.getElementById('cmsDrafts');
    const viewsEl = document.getElementById('cmsTotalViews');

    if (totalEl) totalEl.textContent = cmsContent.length;
    if (publishedEl) publishedEl.textContent = cmsContent.filter(c => c.status === 'published').length;
    if (draftEl) draftEl.textContent = cmsContent.filter(c => c.status === 'draft').length;
    if (viewsEl) {
        const totalViews = cmsContent.reduce((sum, c) => sum + (c.views || 0), 0);
        viewsEl.textContent = totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'k' : totalViews;
    }
}

// Populate Categories in Modal
function populateCmsCategories() {
    const select = document.getElementById('contentCategory');
    if (!select) return;
    select.innerHTML = cmsCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Open Content Modal
function openContentModal(contentId = null) {
    editingContentId = contentId;
    const modal = document.getElementById('contentModal');
    const title = document.getElementById('contentModalTitle');

    populateCmsCategories();

    if (contentId) {
        const item = cmsContent.find(c => c._id === contentId);
        if (!item) return;
        title.textContent = 'Edit Content';
        document.getElementById('contentTitle').value = item.title;
        document.getElementById('contentCategory').value = item.category || 'Blog';
        document.getElementById('contentSlug').value = item.slug || '';
        document.getElementById('contentStatus').value = item.status;
        document.getElementById('contentExcerpt').value = item.excerpt || '';
        document.getElementById('contentBody').value = item.body || '';
        document.getElementById('contentTags').value = (item.tags || []).join(', ');
        document.getElementById('contentFeatured').checked = item.featured || false;
    } else {
        title.textContent = 'New Content';
        // Clear form fields manually
        ['contentTitle','contentSlug','contentExcerpt','contentBody','contentTags'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
        const featEl=document.getElementById('contentFeatured'); if(featEl) featEl.checked=false;
        const catEl=document.getElementById('contentCategory'); if(catEl) catEl.value='Blog';
        document.getElementById('contentStatus').value = 'draft';
    }

    modal.classList.add('active');
}

function editContent(contentId) {
    openContentModal(contentId);
}

function closeContentModal() {
    document.getElementById('contentModal').classList.remove('active');
    editingContentId = null;
}

// Auto-generate slug from title
function generateSlug() {
    const title = document.getElementById('contentTitle')?.value || '';
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    const slugEl = document.getElementById('contentSlug');
    if (slugEl) slugEl.value = slug;
}

// Save Content
function saveContent() {
    const titleEl = document.getElementById('contentTitle');
    if (!titleEl.value.trim()) {
        showToast('Content title is required', 'error');
        return;
    }

    const contentData = {
        title: titleEl.value.trim(),
        category: document.getElementById('contentCategory').value,
        type: document.getElementById('contentCategory').value,
        slug: document.getElementById('contentSlug').value.trim() || titleEl.value.toLowerCase().replace(/\s+/g, '-'),
        status: document.getElementById('contentStatus').value,
        excerpt: document.getElementById('contentExcerpt').value.trim(),
        body: document.getElementById('contentBody').value.trim(),
        tags: document.getElementById('contentTags').value.split(',').map(t => t.trim()).filter(Boolean),
        featured: document.getElementById('contentFeatured').checked,
        author: 'Admin',
        updatedAt: new Date().toISOString()
    };

    if (editingContentId) {
        const idx = cmsContent.findIndex(c => c._id === editingContentId);
        if (idx !== -1) {
            cmsContent[idx] = { ...cmsContent[idx], ...contentData };
            showToast('Content updated!', 'success');
        }
    } else {
        cmsContent.push({
            ...contentData,
            _id: 'content_' + Date.now(),
            views: 0,
            createdAt: new Date().toISOString()
        });
        showToast('Content created!', 'success');
    }

    localStorage.setItem('azolve_cms_content', JSON.stringify(cmsContent));
    closeContentModal();
    renderCmsTable();
    updateCmsStats();
}

// Toggle Content Status
function toggleContentStatus(contentId) {
    const idx = cmsContent.findIndex(c => c._id === contentId);
    if (idx === -1) return;

    const item = cmsContent[idx];
    if (item.status === 'published') {
        cmsContent[idx].status = 'draft';
        showToast('Content unpublished', 'success');
    } else {
        cmsContent[idx].status = 'published';
        showToast('Content published!', 'success');
    }

    cmsContent[idx].updatedAt = new Date().toISOString();
    localStorage.setItem('azolve_cms_content', JSON.stringify(cmsContent));
    renderCmsTable();
    updateCmsStats();
}

// Delete Content
function deleteContent(contentId) {
    cmsContent = cmsContent.filter(c => c._id !== contentId);
    localStorage.setItem('azolve_cms_content', JSON.stringify(cmsContent));
    renderCmsTable();
    updateCmsStats();
    showToast('Content deleted', 'success');
}