// ========== AZOLVE GMAIL-LIKE EMAIL SYSTEM ==========

(function() {
    // Keep track of current folder, threads, search state, active thread, etc.
    let currentFolder = 'inbox';
    let activeThreadId = null;
    let selectedThreadIds = new Set();
    let autoSaveTimer = null;
    let currentDraftId = null;
    let emailThreads = [];
    let activeThreadEmails = [];
    let currentReplyMode = 'reply';
    let isComposing = false;
    let isReplying = false;
    let recipientsList = []; // Cached company users for autocomplete

    // Fetch user token & headers helper
    function getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'X-Company-Id': localStorage.getItem('companyId') || ''
        };
    }

    // Main render function called from dashboard navigation
    window.renderEmail = async function() {
        const container = document.getElementById('emailContainer');
        if (!container) return;

        // Inject Styles dynamically if not already present
        if (!document.getElementById('email-styles')) {
            const style = document.createElement('style');
            style.id = 'email-styles';
            style.textContent = `
                .email-wrapper { display: flex; height: calc(100vh - var(--topbar-height) - 48px); background: #fff; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--border); font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
                .email-sidebar { width: 240px; border-right: 1px solid var(--border); padding: 16px 8px; display: flex; flex-direction: column; background: #fdfdfd; flex-shrink: 0; }
                .email-compose-btn { background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); color: #fff; border: none; padding: 12px 24px; border-radius: 24px; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0, 160, 157, 0.2); transition: var(--transition); width: calc(100% - 16px); margin-left: 8px; }
                .email-compose-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 160, 157, 0.3); }
                .email-sidebar-item { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: var(--transition); margin-bottom: 2px; position: relative; }
                .email-sidebar-item:hover { background: var(--bg-body); color: var(--text-primary); }
                .email-sidebar-item.active { background: var(--primary-light); color: var(--primary-dark); font-weight: 600; }
                .email-sidebar-badge { margin-left: auto; background: var(--primary); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
                .email-sidebar-badge.draft { background: #ffe6e6; color: var(--danger); }
                .email-main { flex: 1; display: flex; flex-direction: column; background: #fff; overflow: hidden; min-width: 0; }
                
                /* Toolbar */
                .email-toolbar { height: 56px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #fafbfc; flex-shrink: 0; }
                .email-toolbar-actions { display: flex; align-items: center; gap: 6px; }
                .email-toolbar-btn { background: none; border: none; width: 34px; height: 34px; border-radius: 50%; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 14px; transition: var(--transition); cursor: pointer; }
                .email-toolbar-btn:hover { background: var(--bg-body); color: var(--text-primary); }
                .email-toolbar-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .email-search { width: 320px; position: relative; }
                .email-search input { width: 100%; padding: 8px 12px 8px 36px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; background: #fff; transition: var(--transition); }
                .email-search input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0, 160, 157, 0.1); }
                .email-search i { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 13px; }

                /* Email List */
                .email-list-container { flex: 1; overflow-y: auto; }
                .email-thread-row { display: flex; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border); font-size: 13.5px; cursor: pointer; transition: background 0.15s; background: #fff; user-select: none; gap: 12px; }
                .email-thread-row:hover { background: #f8f9fa; box-shadow: inset 3px 0 0 var(--primary); }
                .email-thread-row.unread { background: #f4faf9; font-weight: 600; color: #111; }
                .email-thread-row.selected { background: #eef8f7; }
                .email-row-checkbox { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border); cursor: pointer; }
                .email-row-star { cursor: pointer; color: var(--text-muted); font-size: 14px; transition: var(--transition); display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; }
                .email-row-star:hover { color: #f1c40f; transform: scale(1.1); }
                .email-row-star.starred { color: #f1c40f; }
                .email-row-senders { width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; color: var(--text-primary); }
                .email-thread-row.unread .email-row-senders { color: #000; }
                .email-row-content { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
                .email-row-subject { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
                .email-row-snippet { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-weight: 400; }
                .email-row-attachment-icon { color: var(--text-muted); font-size: 12px; flex-shrink: 0; }
                .email-row-date { font-size: 11.5px; color: var(--text-secondary); width: 80px; text-align: right; flex-shrink: 0; }
                .email-row-hover-actions { display: none; gap: 4px; margin-left: auto; flex-shrink: 0; }
                .email-thread-row:hover .email-row-hover-actions { display: flex; }
                .email-thread-row:hover .email-row-date { display: none; }
                .email-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; color: var(--text-muted); }
                .email-empty-state i { font-size: 48px; opacity: 0.3; margin-bottom: 16px; color: var(--primary); }

                /* Thread View */
                .email-thread-view { flex: 1; display: flex; flex-direction: column; background: #fdfdfd; overflow-y: auto; padding: 24px; }
                .email-thread-header { border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 20px; }
                .email-thread-subject { font-size: 18px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 12px; word-break: break-word; }
                .email-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 12px; overflow: hidden; box-shadow: var(--shadow-sm); }
                .email-card-header { padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; background: #fafbfc; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; }
                .email-card-header-expanded { cursor: default; }
                .email-card-sender { display: flex; align-items: center; gap: 12px; min-width: 0; }
                .email-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
                .email-avatar.external { background: linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%); }
                .email-card-meta { min-width: 0; }
                .email-card-name { font-size: 13.5px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
                .email-card-name-tag { font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
                .email-card-name-tag.internal { background: rgba(0, 160, 157, 0.1); color: var(--primary-dark); }
                .email-card-name-tag.external { background: #f0f0f0; color: #555; }
                .email-card-addresses { font-size: 11.5px; color: var(--text-secondary); display: none; margin-top: 2px; }
                .email-card-snippet { font-size: 12.5px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .email-card-header-right { display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: var(--text-secondary); }
                .email-card-body { padding: 20px; font-size: 14px; line-height: 1.6; color: #333; background: #fff; border-top: 1px solid var(--border); }
                .email-card-attachments { margin-top: 20px; border-top: 1px dashed var(--border); padding-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
                .email-attachment-chip { display: inline-flex; align-items: center; gap: 8px; background: var(--bg-body); border: 1px solid var(--border); padding: 6px 12px; border-radius: var(--radius-sm); font-size: 12.5px; color: var(--text-primary); text-decoration: none; transition: var(--transition); }
                .email-attachment-chip:hover { border-color: var(--primary); background: var(--primary-light); color: var(--primary-dark); }
                .email-attachment-chip i { font-size: 13px; color: var(--text-secondary); }

                /* Compose / Reply inline */
                .email-reply-container { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-top: 20px; box-shadow: var(--shadow-sm); }
                .email-reply-header { font-size: 13.5px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
                .email-reply-textarea { width: 100%; min-height: 120px; padding: 12px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-size: 13.5px; font-family: inherit; line-height: 1.6; resize: vertical; margin-bottom: 12px; transition: var(--transition); }
                .email-reply-textarea:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0, 160, 157, 0.1); }
                .email-reply-footer { display: flex; align-items: center; justify-content: space-between; }
                .email-reply-actions { display: flex; align-items: center; gap: 8px; }

                /* Floating Compose Modal */
                .email-compose-modal { position: fixed; bottom: 0; right: 80px; width: 540px; background: #fff; border-radius: 12px 12px 0 0; box-shadow: 0 8px 30px rgba(0,0,0,0.18); border: 1px solid var(--border); z-index: 10000; display: flex; flex-direction: column; overflow: hidden; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .email-compose-modal.minimized { transform: translateY(calc(100% - 44px)); }
                .email-compose-header { background: #2d3436; color: #fff; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; font-weight: 600; cursor: pointer; }
                .email-compose-header-controls { display: flex; gap: 10px; font-size: 14px; }
                .email-compose-header-controls i { cursor: pointer; opacity: 0.8; transition: 0.15s; }
                .email-compose-header-controls i:hover { opacity: 1; }
                .email-compose-body { padding: 12px; display: flex; flex-direction: column; flex: 1; overflow-y: auto; max-height: 480px; }
                .email-compose-row { display: flex; align-items: center; border-bottom: 1px solid var(--border); padding: 6px 0; font-size: 13px; position: relative; }
                .email-compose-label { width: 50px; color: var(--text-secondary); font-weight: 500; }
                .email-compose-input { flex: 1; border: none; padding: 6px 8px; font-size: 13px; outline: none; background: transparent; }
                .email-compose-fields-toggle { font-size: 11.5px; color: var(--primary); cursor: pointer; font-weight: 600; display: flex; gap: 8px; }
                .email-compose-rich-body { flex: 1; border: 1.5px solid var(--border); border-radius: var(--radius-sm); margin-top: 12px; display: flex; flex-direction: column; overflow: hidden; }
                .email-compose-toolbar { background: #fafbfc; border-bottom: 1px solid var(--border); padding: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
                .email-compose-tool { border: none; background: none; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 4px; color: var(--text-secondary); cursor: pointer; transition: var(--transition); }
                .email-compose-tool:hover { background: var(--bg-body); color: var(--text-primary); }
                .email-compose-editor { min-height: 200px; padding: 12px; outline: none; font-size: 13.5px; line-height: 1.6; background: #fff; overflow-y: auto; }
                .email-compose-attachments-list { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
                .email-compose-attachment-item { font-size: 11.5px; background: var(--bg-body); padding: 3px 8px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); }
                .email-compose-attachment-item i { cursor: pointer; color: var(--danger); }
                .email-compose-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; margin-top: auto; border-top: 1px solid var(--border); }
                .email-compose-status { font-size: 11.5px; color: var(--text-secondary); font-style: italic; }
                
                /* Autocomplete dropdown */
                .email-autocomplete-list { position: absolute; top: 100%; left: 50px; right: 0; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 10001; max-height: 160px; overflow-y: auto; display: none; }
                .email-autocomplete-item { padding: 8px 12px; cursor: pointer; font-size: 12.5px; display: flex; justify-content: space-between; border-bottom: 1px solid #fafafa; }
                .email-autocomplete-item:hover { background: var(--primary-light); color: var(--primary-dark); }
                .email-autocomplete-email { color: var(--text-secondary); font-size: 11px; }

                /* Loading overlay */
                .email-loading-overlay { display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--primary); font-weight: 600; gap: 8px; }
            `;
            document.head.appendChild(style);
        }

        // Render skeleton wrapper
        container.innerHTML = `
            <div class="email-wrapper">
                <div class="email-sidebar" id="emailSidebar"></div>
                <div class="email-main" id="emailMain"></div>
            </div>
            <div id="emailComposeModalContainer"></div>
        `;

        renderSidebar();
        await loadFolder('inbox');
        fetchCompanyUsers(); // Load users in background for autocomplete
        setupSocketListener(); // Ensure socket updates list
    };

    // Load company users directory for recipients autocomplete
    async function fetchCompanyUsers() {
        try {
            const resp = await fetch(`${API_BASE_URL}/users?limit=100`, { headers: getHeaders() });
            const data = await resp.json();
            if (data.success && data.docs) {
                recipientsList = data.docs;
            }
        } catch (e) {
            console.error('Failed to load company users:', e);
        }
    }

    // Set up real-time listener for incoming emails
    function setupSocketListener() {
        if (window.socketService) {
            // Remove previous listener to avoid multiples
            window.socketService.off('email:received');
            window.socketService.on('email:received', (data) => {
                showToast(`New email received from ${data.sender}`, 'info');
                // Refresh list if in Inbox or showing thread lists
                if (!activeThreadId) {
                    loadFolder(currentFolder, false); // silent reload
                } else {
                    // Update inbox badge
                    updateSidebarBadges();
                }
            });
        }
    }

    // Render left sidebar
    function renderSidebar() {
        const sidebar = document.getElementById('emailSidebar');
        if (!sidebar) return;

        sidebar.innerHTML = `
            <button class="email-compose-btn" onclick="AzolveEmail.openCompose()">
                <i class="fas fa-edit"></i> Compose
            </button>
            <div class="email-sidebar-item ${currentFolder === 'inbox' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('inbox')">
                <i class="fas fa-inbox"></i> Inbox
                <span class="email-sidebar-badge" id="badge-inbox" style="display:none;">0</span>
            </div>
            <div class="email-sidebar-item ${currentFolder === 'starred' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('starred')">
                <i class="fas fa-star"></i> Starred
            </div>
            <div class="email-sidebar-item ${currentFolder === 'sent' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('sent')">
                <i class="fas fa-paper-plane"></i> Sent
            </div>
            <div class="email-sidebar-item ${currentFolder === 'drafts' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('drafts')">
                <i class="fas fa-file"></i> Drafts
                <span class="email-sidebar-badge draft" id="badge-drafts" style="display:none;">0</span>
            </div>
            <div class="email-sidebar-item ${currentFolder === 'archive' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('archive')">
                <i class="fas fa-archive"></i> Archive
            </div>
            <div class="email-sidebar-item ${currentFolder === 'trash' ? 'active' : ''}" onclick="AzolveEmail.switchFolder('trash')">
                <i class="fas fa-trash"></i> Trash
            </div>
            
            <div style="margin-top:auto; padding:8px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:8px;">
                <button class="btn btn-outline btn-sm btn-block" onclick="AzolveEmail.triggerSimulator()" style="font-size:11.5px;">
                    <i class="fas fa-robot" style="color:var(--primary)"></i> Mock Client Inquiry
                </button>
            </div>
        `;

        updateSidebarBadges();
    }

    // Update unread badges count
    async function updateSidebarBadges() {
        try {
            // Inbox badge
            const respInbox = await fetch(`${API_BASE_URL}/emails/folder/inbox`, { headers: getHeaders() });
            const dataInbox = await respInbox.json();
            const badgeInbox = document.getElementById('badge-inbox');
            if (badgeInbox) {
                const unreadCount = dataInbox.success ? dataInbox.data.filter(t => !t.isRead).length : 0;
                badgeInbox.style.display = unreadCount > 0 ? 'inline-block' : 'none';
                badgeInbox.textContent = unreadCount;
                
                // Update main app dashboard sidebar email badge if exists
                const mainBadge = document.getElementById('emailBadge');
                if (mainBadge) {
                    mainBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
                    mainBadge.textContent = unreadCount;
                }
            }

            // Drafts badge
            const respDrafts = await fetch(`${API_BASE_URL}/emails/folder/drafts`, { headers: getHeaders() });
            const dataDrafts = await respDrafts.json();
            const badgeDrafts = document.getElementById('badge-drafts');
            if (badgeDrafts) {
                const draftCount = dataDrafts.success ? dataDrafts.data.length : 0;
                badgeDrafts.style.display = draftCount > 0 ? 'inline-block' : 'none';
                badgeDrafts.textContent = draftCount;
            }
        } catch (e) {
            console.error('Error fetching unread badges:', e);
        }
    }

    // Load folder threads list
    async function loadFolder(folderName, showSpinner = true) {
        currentFolder = folderName;
        activeThreadId = null;
        selectedThreadIds.clear();

        // Update active sidebar state
        document.querySelectorAll('.email-sidebar-item').forEach(item => item.classList.remove('active'));
        renderSidebar();

        const mainContent = document.getElementById('emailMain');
        if (!mainContent) return;

        if (showSpinner) {
            mainContent.innerHTML = `
                <div class="email-loading-overlay">
                    <div style="width:24px;height:24px;border:3px solid #e9ecef;border-top-color:var(--primary);border-radius:50%;animation:azvspin 0.8s linear infinite"></div>
                    Loading...
                </div>
            `;
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/emails/folder/${folderName}`, { headers: getHeaders() });
            const data = await resp.json();
            
            if (data.success) {
                emailThreads = data.data;
                renderThreadList();
            } else {
                mainContent.innerHTML = `
                    <div class="email-empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Emails</h3>
                        <p>${data.message || 'Unknown server error.'}</p>
                    </div>
                `;
            }
        } catch (e) {
            mainContent.innerHTML = `
                <div class="email-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Network Error</h3>
                    <p>Could not connect to the API server.</p>
                </div>
            `;
        }
    }

    // Render thread list in main pane
    function renderThreadList() {
        const mainContent = document.getElementById('emailMain');
        if (!mainContent) return;

        // Toolbar HTML
        let toolbarHTML = `
            <div class="email-toolbar">
                <div class="email-toolbar-actions">
                    <input type="checkbox" class="email-row-checkbox" id="selectAllCheckbox" onchange="AzolveEmail.toggleSelectAll(this.checked)" style="margin-right: 8px;">
                    <button class="email-toolbar-btn" onclick="AzolveEmail.refreshFolder()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                    
                    <span style="border-left:1px solid var(--border); height:20px; margin:0 8px;"></span>
                    
                    <button class="email-toolbar-btn" id="tb-read" onclick="AzolveEmail.bulkMarkRead(true)" title="Mark as Read" disabled><i class="fas fa-envelope-open"></i></button>
                    <button class="email-toolbar-btn" id="tb-unread" onclick="AzolveEmail.bulkMarkRead(false)" title="Mark as Unread" disabled><i class="fas fa-envelope"></i></button>
                    
                    ${currentFolder === 'trash' 
                        ? `<button class="email-toolbar-btn" id="tb-delete" onclick="AzolveEmail.bulkDeletePermanent()" title="Delete Permanently" disabled><i class="fas fa-minus-circle"></i></button>
                           <button class="email-toolbar-btn" id="tb-restore" onclick="AzolveEmail.bulkRestore()" title="Restore" disabled><i class="fas fa-trash-restore"></i></button>
                           <button class="btn btn-outline btn-sm" onclick="AzolveEmail.emptyTrash()" style="margin-left: 12px; font-size: 11px; padding: 4px 10px;"><i class="fas fa-dumpster"></i> Empty Trash</button>`
                        : `<button class="email-toolbar-btn" id="tb-archive" onclick="AzolveEmail.bulkArchive()" title="Archive" disabled><i class="fas fa-archive"></i></button>
                           <button class="email-toolbar-btn" id="tb-trash" onclick="AzolveEmail.bulkTrash()" title="Move to Trash" disabled><i class="fas fa-trash"></i></button>`
                    }
                </div>
                <div class="email-search">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search mail..." oninput="AzolveEmail.searchEmails(this.value)">
                </div>
            </div>
        `;

        if (emailThreads.length === 0) {
            mainContent.innerHTML = toolbarHTML + `
                <div class="email-list-container">
                    <div class="email-empty-state">
                        <i class="fas fa-envelope-open"></i>
                        <h3>Your ${currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1)} folder is empty</h3>
                        <p>No messages found in this folder view.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Build list rows
        const listHTML = emailThreads.map(t => {
            const sendersStr = t.senders.join(', ');
            const isStarred = t.isStarred;
            const isRead = t.isRead;
            const isDraft = t.isDraft;

            const date = new Date(t.latestMessageDate);
            const formattedDate = date.toLocaleDateString() === new Date().toLocaleDateString()
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return `
                <div class="email-thread-row ${!isRead ? 'unread' : ''} ${selectedThreadIds.has(t.threadId) ? 'selected' : ''}" 
                     id="thread-${t.threadId}" onclick="AzolveEmail.openThread('${t.threadId}', event)">
                    
                    <input type="checkbox" class="email-row-checkbox" 
                           ${selectedThreadIds.has(t.threadId) ? 'checked' : ''} 
                           onclick="AzolveEmail.toggleSelectRow('${t.threadId}', event)">
                    
                    <div class="email-row-star ${isStarred ? 'starred' : ''}" 
                         onclick="AzolveEmail.toggleStar('${t.threadId}', event)">
                        <i class="${isStarred ? 'fas' : 'far'} fa-star"></i>
                    </div>
                    
                    <div class="email-row-senders">
                        ${isDraft ? '<span style="color:var(--danger); font-weight:700; margin-right:4px;">[Draft]</span>' : ''}
                        ${sendersStr} ${t.messagesCount > 1 ? `(${t.messagesCount})` : ''}
                    </div>
                    
                    <div class="email-row-content">
                        <span class="email-row-subject">${t.subject}</span>
                        <span style="color: var(--text-muted); font-weight: 400; margin: 0 4px;">—</span>
                        <span class="email-row-snippet">${t.snippet}</span>
                        ${t.hasAttachments ? '<i class="fas fa-paperclip email-row-attachment-icon"></i>' : ''}
                    </div>

                    <div class="email-row-date">${formattedDate}</div>
                    
                    <div class="email-row-hover-actions" onclick="event.stopPropagation()">
                        ${currentFolder === 'trash'
                            ? `<button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${t.threadId}', 'restore')" title="Restore"><i class="fas fa-trash-restore"></i></button>
                               <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${t.threadId}', 'delete-perm')" title="Delete Permanently"><i class="fas fa-minus-circle"></i></button>`
                            : `<button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${t.threadId}', 'trash')" title="Move to Trash"><i class="fas fa-trash"></i></button>
                               <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${t.threadId}', 'archive')" title="Archive"><i class="fas fa-archive"></i></button>
                               <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${t.threadId}', 'toggle-read')" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}"><i class="${isRead ? 'fas fa-envelope' : 'fas fa-envelope-open'}"></i></button>`
                        }
                    </div>
                </div>
            `;
        }).join('');

        mainContent.innerHTML = toolbarHTML + `
            <div class="email-list-container">
                ${listHTML}
            </div>
        `;

        updateToolbarState();
    }

    // Toggle single thread selection checkbox
    window.toggleSelectRow = function(threadId, e) {
        e.stopPropagation();
        if (selectedThreadIds.has(threadId)) {
            selectedThreadIds.delete(threadId);
            document.getElementById(`thread-${threadId}`)?.classList.remove('selected');
        } else {
            selectedThreadIds.add(threadId);
            document.getElementById(`thread-${threadId}`)?.classList.add('selected');
        }
        
        // Update Select All state
        const selectAll = document.getElementById('selectAllCheckbox');
        if (selectAll) {
            selectAll.checked = selectedThreadIds.size === emailThreads.length;
        }
        updateToolbarState();
    };

    // Toggle bulk selection checkbox
    window.toggleSelectAll = function(isChecked) {
        selectedThreadIds.clear();
        if (isChecked) {
            emailThreads.forEach(t => selectedThreadIds.add(t.threadId));
        }
        renderThreadList();
    };

    // Enable/disable toolbar buttons based on selection count
    function updateToolbarState() {
        const size = selectedThreadIds.size;
        const buttons = ['tb-read', 'tb-unread', 'tb-archive', 'tb-trash', 'tb-delete', 'tb-restore'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = size === 0;
        });
    }

    // Refresh folder view
    window.refreshFolder = async function() {
        await loadFolder(currentFolder, true);
        await updateSidebarBadges();
    };

    // Folder switching
    window.switchFolder = async function(folderName) {
        await loadFolder(folderName, true);
    };

    // Search input handler
    let searchDebounce = null;
    window.searchEmails = function(query) {
        clearTimeout(searchDebounce);
        if (!query.trim()) {
            loadFolder(currentFolder, false);
            return;
        }
        searchDebounce = setTimeout(async () => {
            const mainContent = document.getElementById('emailMain');
            if (!mainContent) return;

            try {
                const resp = await fetch(`${API_BASE_URL}/emails/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
                const data = await resp.json();
                if (data.success) {
                    emailThreads = data.data;
                    renderThreadList();
                }
            } catch (e) {
                console.error(e);
            }
        }, 3000);
    };

    // Open specific thread conversation
    window.openThread = async function(threadId, e) {
        // Prevent click if checked on checkbox/star/hover buttons
        if (e.target.closest('.email-row-checkbox') || e.target.closest('.email-row-star') || e.target.closest('.email-row-hover-actions')) {
            return;
        }

        activeThreadId = threadId;
        const mainContent = document.getElementById('emailMain');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="email-loading-overlay">
                <div style="width:24px;height:24px;border:3px solid #e9ecef;border-top-color:var(--primary);border-radius:50%;animation:azvspin 0.8s linear infinite"></div>
                Loading Conversation...
            </div>
        `;

        try {
            const resp = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const data = await resp.json();

            if (data.success && data.data.length > 0) {
                const emails = data.data;
                activeThreadEmails = emails;
                const latestEmail = emails[emails.length - 1];

                // If it is a draft thread, open in composer modal instead
                if (latestEmail.isDraft && emails.length === 1) {
                    AzolveEmail.openCompose(latestEmail._id);
                    loadFolder(currentFolder, false);
                    return;
                }

                renderThreadConversation(emails);
                updateSidebarBadges();
            } else {
                showToast('Failed to load thread details', 'error');
                loadFolder(currentFolder);
            }
        } catch (err) {
            showToast('Network error loading conversation', 'error');
            loadFolder(currentFolder);
        }
    };

    // Render thread conversation view
    function renderThreadConversation(emails) {
        const mainContent = document.getElementById('emailMain');
        if (!mainContent) return;

        const latestEmail = emails[emails.length - 1];
        const userEmail = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email : '';

        // Conversation Toolbar
        let toolbarHTML = `
            <div class="email-toolbar">
                <div class="email-toolbar-actions">
                    <button class="email-toolbar-btn" onclick="AzolveEmail.switchFolder('${currentFolder}')" title="Back to list"><i class="fas fa-arrow-left"></i></button>
                    <span style="border-left:1px solid var(--border); height:20px; margin:0 8px;"></span>
                    
                    ${currentFolder === 'trash'
                        ? `<button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${activeThreadId}', 'restore')" title="Restore to Inbox"><i class="fas fa-trash-restore"></i></button>
                           <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${activeThreadId}', 'delete-perm')" title="Delete Permanently"><i class="fas fa-minus-circle"></i></button>`
                        : `<button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${activeThreadId}', 'archive')" title="Archive"><i class="fas fa-archive"></i></button>
                           <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${activeThreadId}', 'trash')" title="Move to Trash"><i class="fas fa-trash"></i></button>
                           <button class="email-toolbar-btn" onclick="AzolveEmail.actionOnThread('${activeThreadId}', 'toggle-read')" title="Mark as Unread"><i class="fas fa-envelope"></i></button>`
                    }
                </div>
            </div>
        `;

        // Render each card (collapsible cards)
        const cardsHTML = emails.map((e, index) => {
            const isLast = index === emails.length - 1;
            const initials = e.sender.name ? e.sender.name[0].toUpperCase() : e.sender.email[0].toUpperCase();
            const dateStr = new Date(e.createdAt).toLocaleString();
            
            const isInternal = !!e.sender.user;
            const tagClass = isInternal ? 'internal' : 'external';
            const tagLabel = isInternal ? 'Azolve Team' : 'External Client';

            const toList = e.recipients.filter(r => r.recipientType === 'to').map(r => r.email).join(', ');
            const ccList = e.recipients.filter(r => r.recipientType === 'cc').map(r => r.email).join(', ');

            // Build attachments
            const attachHTML = e.attachments && e.attachments.length > 0
                ? `<div class="email-card-attachments">
                    ${e.attachments.map(att => `
                        <a href="${att.url}" target="_blank" class="email-attachment-chip" title="Click to view/download">
                            <i class="fas fa-paperclip"></i>
                            <span>${att.filename} (${Math.round(att.size / 1024)} KB)</span>
                        </a>
                    `).join('')}
                   </div>`
                : '';

            return `
                <div class="email-card" id="email-card-${e._id}">
                    <div class="email-card-header ${isLast ? 'email-card-header-expanded' : ''}" 
                         onclick="AzolveEmail.toggleEmailCard('${e._id}')">
                        <div class="email-card-sender">
                            <div class="email-avatar ${!isInternal ? 'external' : ''}">${initials}</div>
                            <div class="email-card-meta">
                                <div class="email-card-name">
                                    ${e.sender.name || e.sender.email} 
                                    <span class="email-card-name-tag ${tagClass}">${tagLabel}</span>
                                </div>
                                <div class="email-card-addresses" id="meta-addresses-${e._id}" style="${isLast ? 'display:block' : 'display:none'}">
                                    To: ${toList} ${ccList ? `<br>Cc: ${ccList}` : ''}
                                </div>
                                <div class="email-card-snippet" id="meta-snippet-${e._id}" style="${isLast ? 'display:none' : 'display:block'}">
                                    ${e.snippet}
                                </div>
                            </div>
                        </div>
                        <div class="email-card-header-right">
                            <span>${dateStr}</span>
                            <i class="fas ${isLast ? 'fa-chevron-up' : 'fa-chevron-down'}" id="chevron-${e._id}"></i>
                        </div>
                    </div>
                    
                    <div class="email-card-body" id="body-${e._id}" style="${isLast ? 'display:block' : 'display:none'}">
                        <div>${e.body}</div>
                        ${attachHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Quick inline Reply / Reply All / Forward box
        let quickReplyHTML = `
            <div class="email-reply-container" id="replyBox" style="display:none;">
                <div class="email-reply-header">
                    <i class="fas fa-reply" id="replyIcon"></i>
                    <span id="replyHeaderText">Reply to \${latestEmail.sender.name || latestEmail.sender.email}</span>
                </div>
                <div class="email-compose-row" style="position:relative;">
                    <span class="email-compose-label">To:</span>
                    <input type="text" class="email-compose-input" id="replyToInput" readonly oninput="AzolveEmail.handleAutocomplete(this, 'replyTo')">
                    <div class="email-autocomplete-list" id="auto-replyTo"></div>
                </div>
                <div class="email-compose-row" id="replyCcRow" style="display:none; position:relative;">
                    <span class="email-compose-label">Cc:</span>
                    <input type="text" class="email-compose-input" id="replyCcInput" placeholder="Cc recipients..." oninput="AzolveEmail.handleAutocomplete(this, 'replyCc')">
                    <div class="email-autocomplete-list" id="auto-replyCc"></div>
                </div>
                
                <div style="position:relative;">
                    <textarea class="email-reply-textarea" id="replyBody" placeholder="Type your message here..."></textarea>
                </div>

                <div class="email-compose-attachments-list" id="replyAttachmentsList"></div>

                <div class="email-reply-footer">
                    <div class="email-reply-actions">
                        <button class="btn btn-primary" onclick="AzolveEmail.sendInlineReply()"><i class="fas fa-paper-plane"></i> Send</button>
                        
                        <label for="replyFileInput" class="email-toolbar-btn" style="cursor:pointer; display:flex;" title="Attach Files">
                            <i class="fas fa-paperclip" style="margin-top:9px;"></i>
                        </label>
                        <input type="file" id="replyFileInput" style="display:none;" multiple onchange="AzolveEmail.handleReplyFilesUpload(this.files)">
                    </div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span class="email-compose-status" id="replyAutoSaveStatus"></span>
                        <button class="email-toolbar-btn" onclick="AzolveEmail.discardInlineReply()" title="Discard Reply"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>

            <!-- Trigger Action Buttons -->
            <div style="display:flex; gap:12px; margin-top:20px;" id="replyTriggers">
                <button class="btn btn-outline" onclick="AzolveEmail.showReplyForm('reply', '\${latestEmail.sender.email}')">
                    <i class="fas fa-reply"></i> Reply
                </button>
                <button class="btn btn-outline" onclick="AzolveEmail.showReplyForm('replyAll')">
                    <i class="fas fa-reply-all"></i> Reply All
                </button>
                <button class="btn btn-outline" onclick="AzolveEmail.showReplyForm('forward')">
                    <i class="fas fa-share"></i> Forward
                </button>
            </div>
        `;

        mainContent.innerHTML = toolbarHTML + `
            <div class="email-thread-view">
                <div class="email-thread-header">
                    <h2 class="email-thread-subject">
                        ${latestEmail.subject}
                    </h2>
                </div>
                <div style="flex:1;">
                    ${cardsHTML}
                    ${quickReplyHTML}
                </div>
            </div>
        `;
    }

    // Toggle message cards expand/collapse
    window.toggleEmailCard = function(id) {
        const body = document.getElementById(`body-${id}`);
        const addresses = document.getElementById(`meta-addresses-${id}`);
        const snippet = document.getElementById(`meta-snippet-${id}`);
        const chevron = document.getElementById(`chevron-${id}`);

        if (body.style.display === 'none') {
            body.style.display = 'block';
            addresses.style.display = 'block';
            snippet.style.display = 'none';
            chevron.className = 'fas fa-chevron-up';
        } else {
            body.style.display = 'none';
            addresses.style.display = 'none';
            snippet.style.display = 'block';
            chevron.className = 'fas fa-chevron-down';
        }
    };

    // Show reply inline workspace
    let replyAttachments = [];
    window.showReplyForm = function(mode, directSenderEmail) {
        currentReplyMode = mode;
        document.getElementById('replyTriggers').style.display = 'none';
        
        const replyBox = document.getElementById('replyBox');
        replyBox.style.display = 'block';

        const replyToInput = document.getElementById('replyToInput');
        const replyCcRow = document.getElementById('replyCcRow');
        const replyHeaderText = document.getElementById('replyHeaderText');
        const replyIcon = document.getElementById('replyIcon');

        // Fetch thread details for context
        const emails = activeThreadEmails;
        if (!emails || emails.length === 0) return;
        const latestEmail = emails[emails.length - 1];

        replyAttachments = [];
        document.getElementById('replyAttachmentsList').innerHTML = '';
        document.getElementById('replyBody').value = '';

        const userEmail = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).email.toLowerCase() : '';

        if (mode === 'reply') {
            let replyTo = '';
            if (latestEmail.sender.email.toLowerCase() === userEmail) {
                if (latestEmail.recipients && latestEmail.recipients.length > 0) {
                    replyTo = latestEmail.recipients[0].email;
                } else {
                    replyTo = emails[0].sender.email;
                }
            } else {
                replyTo = latestEmail.sender.email;
            }

            replyToInput.value = replyTo;
            replyToInput.readOnly = true;
            replyCcRow.style.display = 'none';
            document.getElementById('replyCcInput').value = '';
            replyHeaderText.textContent = `Reply to ${replyTo}`;
            replyIcon.className = 'fas fa-reply';
        } else if (mode === 'replyAll') {
            let replyTo = '';
            if (latestEmail.sender.email.toLowerCase() === userEmail) {
                if (latestEmail.recipients && latestEmail.recipients.length > 0) {
                    replyTo = latestEmail.recipients[0].email;
                } else {
                    replyTo = emails[0].sender.email;
                }
            } else {
                replyTo = latestEmail.sender.email;
            }

            const ccEmailsSet = new Set();
            latestEmail.recipients.forEach(r => {
                const emailLower = r.email.toLowerCase();
                if (emailLower !== userEmail && emailLower !== replyTo.toLowerCase()) {
                    ccEmailsSet.add(r.email);
                }
            });

            if (latestEmail.sender.email.toLowerCase() !== userEmail && latestEmail.sender.email.toLowerCase() !== replyTo.toLowerCase()) {
                ccEmailsSet.add(latestEmail.sender.email);
            }

            replyToInput.value = replyTo;
            replyToInput.readOnly = true;
            replyCcRow.style.display = 'flex';
            document.getElementById('replyCcInput').value = Array.from(ccEmailsSet).join(', ');
            replyHeaderText.textContent = `Reply All`;
            replyIcon.className = 'fas fa-reply-all';
        } else if (mode === 'forward') {
            replyToInput.value = '';
            replyToInput.readOnly = false;
            replyCcRow.style.display = 'none';
            document.getElementById('replyCcInput').value = '';
            replyHeaderText.textContent = `Forward Message`;
            replyIcon.className = 'fas fa-share';
            
            // Seed content with forward trace
            const activeCard = document.querySelector('.email-card:last-child');
            const sender = activeCard ? activeCard.querySelector('.email-card-name').textContent.trim() : '';
            const date = activeCard ? activeCard.querySelector('.email-card-header-right span').textContent.trim() : '';
            const body = activeCard ? activeCard.querySelector('.email-card-body').innerText.trim() : '';
            
            document.getElementById('replyBody').value = `\n\n---------- Forwarded message ---------\nFrom: ${sender}\nDate: ${date}\nSubject: ${latestEmail ? latestEmail.subject : ''}\n\n${body}`;
        }

        // Focus reply textarea
        document.getElementById('replyBody').focus();
    };

    window.discardInlineReply = function() {
        document.getElementById('replyBox').style.display = 'none';
        document.getElementById('replyTriggers').style.display = 'flex';
    };

    // Handle files dropped/selected on inline reply
    window.handleReplyFilesUpload = function(files) {
        const container = document.getElementById('replyAttachmentsList');
        Array.from(files).forEach(file => {
            replyAttachments.push(file);
            const item = document.createElement('div');
            item.className = 'email-compose-attachment-item';
            item.innerHTML = `
                <span>${file.name} (${Math.round(file.size / 1024)} KB)</span>
                <i class="fas fa-times" onclick="AzolveEmail.removeReplyFile('${file.name}', this)"></i>
            `;
            container.appendChild(item);
        });
    };

    window.removeReplyFile = function(fileName, el) {
        replyAttachments = replyAttachments.filter(f => f.name !== fileName);
        el.closest('.email-compose-attachment-item').remove();
    };

    // Send inline reply
    window.sendInlineReply = async function() {
        const replyTo = document.getElementById('replyToInput').value;
        const replyCc = document.getElementById('replyCcInput')?.value || '';
        const replyBodyText = document.getElementById('replyBody').value;

        if (!replyTo.trim()) {
            showToast('Please specify a recipient', 'error');
            return;
        }

        // Fetch thread details for subject
        let emailsList = emailThreads.find(t => t.threadId === activeThreadId);
        let subject = emailsList ? emailsList.subject : '';
        if (currentReplyMode === 'forward') {
            if (subject && !subject.toUpperCase().startsWith('FWD:')) {
                subject = 'Fwd: ' + subject;
            }
        } else {
            if (subject && !subject.toUpperCase().startsWith('RE:')) {
                subject = 'Re: ' + subject;
            }
        }

        const fd = new FormData();
        fd.append('to', replyTo);
        fd.append('cc', replyCc);
        fd.append('subject', subject || '(No Subject)');
        fd.append('body', replyBodyText.replace(/\n/g, '<br>'));
        fd.append('threadId', activeThreadId);
        fd.append('isDraft', 'false');

        replyAttachments.forEach(file => {
            fd.append('attachments', file);
        });

        try {
            showToast('Sending reply...', 'info');
            const resp = await fetch(`${API_BASE_URL}/emails/compose`, {
                method: 'POST',
                headers: getHeaders(),
                body: fd
            });
            const data = await resp.json();
            if (data.success) {
                showToast('Email sent successfully', 'success');
                // Reload thread conversation
                const threadResp = await fetch(`${API_BASE_URL}/emails/thread/${activeThreadId}`, { headers: getHeaders() });
                const threadData = await threadResp.json();
                if (threadData.success) {
                    renderThreadConversation(threadData.data);
                }
            } else {
                showToast(data.message || 'Failed to send email', 'error');
            }
        } catch (e) {
            showToast('Network error sending reply', 'error');
        }
    };

    // Action toggler helper (Bulk & individual)
    window.actionOnThread = async function(threadId, action) {
        try {
            // Get all emails inside the thread first to apply action on each message card
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (!dataThread.success) return;

            const emails = dataThread.data;
            for (const email of emails) {
                let url = `${API_BASE_URL}/emails/${email._id}`;
                let method = 'PUT';

                if (action === 'star') {
                    url += '/star';
                } else if (action === 'read') {
                    url += '/read';
                } else if (action === 'toggle-read') {
                    url += '/read';
                    method = 'PUT';
                } else if (action === 'trash') {
                    url += '/trash';
                } else if (action === 'archive') {
                    url += '/archive';
                } else if (action === 'restore') {
                    url += '/restore';
                } else if (action === 'delete-perm') {
                    method = 'DELETE';
                }

                let body = undefined;
                if (action === 'toggle-read') {
                    const currentlyRead = email.readBy.includes(localStorage.getItem('userId') || '');
                    body = JSON.stringify({ isRead: !currentlyRead });
                }

                await fetch(url, {
                    method,
                    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                    body
                });
            }

            showToast(`Conversation updated successfully`, 'success');
            await refreshFolder();
        } catch (e) {
            showToast('Failed to perform action', 'error');
        }
    };

    // Bulk actions
    window.bulkMarkRead = async function(isRead) {
        showToast('Updating threads...', 'info');
        for (const threadId of selectedThreadIds) {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success) {
                for (const email of dataThread.data) {
                    await fetch(`${API_BASE_URL}/emails/${email._id}/read`, {
                        method: 'PUT',
                        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                        body: JSON.stringify({ isRead })
                    });
                }
            }
        }
        await refreshFolder();
    };

    window.bulkArchive = async function() {
        showToast('Archiving threads...', 'info');
        for (const threadId of selectedThreadIds) {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success) {
                for (const email of dataThread.data) {
                    await fetch(`${API_BASE_URL}/emails/${email._id}/archive`, {
                        method: 'PUT',
                        headers: getHeaders()
                    });
                }
            }
        }
        await refreshFolder();
    };

    window.bulkTrash = async function() {
        showToast('Moving threads to Trash...', 'info');
        for (const threadId of selectedThreadIds) {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success) {
                for (const email of dataThread.data) {
                    await fetch(`${API_BASE_URL}/emails/${email._id}/trash`, {
                        method: 'PUT',
                        headers: getHeaders()
                    });
                }
            }
        }
        await refreshFolder();
    };

    window.bulkRestore = async function() {
        showToast('Restoring threads...', 'info');
        for (const threadId of selectedThreadIds) {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success) {
                for (const email of dataThread.data) {
                    await fetch(`${API_BASE_URL}/emails/${email._id}/restore`, {
                        method: 'PUT',
                        headers: getHeaders()
                    });
                }
            }
        }
        await refreshFolder();
    };

    window.bulkDeletePermanent = async function() {
        if (!confirm('Are you sure you want to permanently delete these conversations? This cannot be undone.')) return;
        showToast('Permanently deleting threads...', 'info');
        for (const threadId of selectedThreadIds) {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success) {
                for (const email of dataThread.data) {
                    await fetch(`${API_BASE_URL}/emails/${email._id}`, {
                        method: 'DELETE',
                        headers: getHeaders()
                    });
                }
            }
        }
        await refreshFolder();
    };

    window.emptyTrash = async function() {
        if (!confirm('Are you sure you want to empty your Trash folder? All deleted conversations will be permanently lost.')) return;
        try {
            showToast('Emptying Trash...', 'info');
            const resp = await fetch(`${API_BASE_URL}/emails/trash/empty`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const data = await resp.json();
            if (data.success) {
                showToast('Trash emptied successfully', 'success');
                await refreshFolder();
            }
        } catch (e) {
            showToast('Failed to empty Trash', 'error');
        }
    };

    window.toggleStar = async function(threadId, e) {
        e.stopPropagation();
        try {
            const respThread = await fetch(`${API_BASE_URL}/emails/thread/${threadId}`, { headers: getHeaders() });
            const dataThread = await respThread.json();
            if (dataThread.success && dataThread.data.length > 0) {
                // Star the latest message in thread
                const latest = dataThread.data[dataThread.data.length - 1];
                const res = await fetch(`${API_BASE_URL}/emails/${latest._id}/star`, {
                    method: 'PUT',
                    headers: getHeaders()
                });
                const resData = await res.json();
                if (resData.success) {
                    const row = document.getElementById(`thread-${threadId}`);
                    if (row) {
                        const starDiv = row.querySelector('.email-row-star');
                        if (resData.isStarred) {
                            starDiv.classList.add('starred');
                            starDiv.innerHTML = '<i class="fas fa-star"></i>';
                        } else {
                            starDiv.classList.remove('starred');
                            starDiv.innerHTML = '<i class="far fa-star"></i>';
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Star toggle failed:', err);
        }
    };

    // ==========================================
    // FLOATING COMPOSE MODAL (Gmail-style)
    // ==========================================
    let composeAttachments = [];

    window.openCompose = async function(editDraftId = null) {
        isComposing = true;
        composeAttachments = [];
        currentDraftId = editDraftId;

        const container = document.getElementById('emailComposeModalContainer');
        if (!container) return;

        // Render modal skeleton
        container.innerHTML = `
            <div class="email-compose-modal" id="composeModal">
                <div class="email-compose-header" onclick="AzolveEmail.minimizeCompose()">
                    <span>New Message</span>
                    <div class="email-compose-header-controls" onclick="event.stopPropagation()">
                        <i class="fas fa-minus" onclick="AzolveEmail.minimizeCompose()" title="Minimize"></i>
                        <i class="fas fa-times" onclick="AzolveEmail.closeCompose()" title="Close"></i>
                    </div>
                </div>
                <div class="email-compose-body">
                    <div class="email-compose-row">
                        <span class="email-compose-label">To:</span>
                        <input type="text" class="email-compose-input" id="comp-to" placeholder="Recipients..." oninput="AzolveEmail.handleAutocomplete(this, 'to')">
                        <div class="email-compose-fields-toggle">
                            <span onclick="AzolveEmail.toggleCcBcc('cc')">Cc</span>
                            <span onclick="AzolveEmail.toggleCcBcc('bcc')">Bcc</span>
                        </div>
                        <div class="email-autocomplete-list" id="auto-to"></div>
                    </div>
                    <div class="email-compose-row" id="row-cc" style="display:none;">
                        <span class="email-compose-label">Cc:</span>
                        <input type="text" class="email-compose-input" id="comp-cc" placeholder="Cc..." oninput="AzolveEmail.handleAutocomplete(this, 'cc')">
                        <div class="email-autocomplete-list" id="auto-cc"></div>
                    </div>
                    <div class="email-compose-row" id="row-bcc" style="display:none;">
                        <span class="email-compose-label">Bcc:</span>
                        <input type="text" class="email-compose-input" id="comp-bcc" placeholder="Bcc..." oninput="AzolveEmail.handleAutocomplete(this, 'bcc')">
                        <div class="email-autocomplete-list" id="auto-bcc"></div>
                    </div>
                    <div class="email-compose-row">
                        <span class="email-compose-label">Subject:</span>
                        <input type="text" class="email-compose-input" id="comp-subject" placeholder="Subject...">
                    </div>
                    
                    <div class="email-compose-rich-body">
                        <div class="email-compose-toolbar">
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('bold')" title="Bold"><i class="fas fa-bold"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('italic')" title="Italic"><i class="fas fa-italic"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('underline')" title="Underline"><i class="fas fa-underline"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('justifyLeft')" title="Align Left"><i class="fas fa-align-left"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('justifyCenter')" title="Align Center"><i class="fas fa-align-center"></i></button>
                            <button class="email-compose-tool" onclick="AzolveEmail.formatText('createLink')" title="Insert Link"><i class="fas fa-link"></i></button>
                        </div>
                        <div class="email-compose-editor" id="comp-body" contenteditable="true" placeholder="Say something..."></div>
                    </div>

                    <div class="email-compose-attachments-list" id="compAttachmentsList"></div>

                    <div class="email-compose-footer">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <button class="btn btn-primary" onclick="AzolveEmail.sendComposeMail()"><i class="fas fa-paper-plane"></i> Send</button>
                            
                            <label for="compFileInput" class="email-toolbar-btn" style="cursor:pointer; display:flex;" title="Attach Files">
                                <i class="fas fa-paperclip" style="margin-top:9px;"></i>
                            </label>
                            <input type="file" id="compFileInput" style="display:none;" multiple onchange="AzolveEmail.handleComposeFilesUpload(this.files)">
                        </div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span class="email-compose-status" id="compSaveStatus"></span>
                            <button class="email-toolbar-btn" onclick="AzolveEmail.discardComposeDraft()" title="Discard Draft"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // If editing a draft, load the draft values
        if (editDraftId) {
            try {
                // Get all thread emails to locate this draft
                const resp = await fetch(`${API_BASE_URL}/emails/thread/${editDraftId}`, { headers: getHeaders() });
                const dData = await resp.json();
                if (dData.success && dData.data.length > 0) {
                    const draft = dData.data[0];
                    document.getElementById('comp-to').value = draft.recipients.filter(r => r.recipientType === 'to').map(r => r.email).join(', ');
                    const cc = draft.recipients.filter(r => r.recipientType === 'cc').map(r => r.email).join(', ');
                    const bcc = draft.recipients.filter(r => r.recipientType === 'bcc').map(r => r.email).join(', ');
                    
                    if (cc) { AzolveEmail.toggleCcBcc('cc'); document.getElementById('comp-cc').value = cc; }
                    if (bcc) { AzolveEmail.toggleCcBcc('bcc'); document.getElementById('comp-bcc').value = bcc; }

                    document.getElementById('comp-subject').value = draft.subject;
                    document.getElementById('comp-body').innerHTML = draft.body;
                    
                    // Show existing attachments
                    if (draft.attachments && draft.attachments.length > 0) {
                        const container = document.getElementById('compAttachmentsList');
                        draft.attachments.forEach(att => {
                            const item = document.createElement('div');
                            item.className = 'email-compose-attachment-item';
                            item.innerHTML = `
                                <span>${att.filename} (${Math.round(att.size / 1024)} KB)</span>
                            `;
                            container.appendChild(item);
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Set up Auto-Save listener (debounced save draft every 3 seconds while typing)
        setupComposeAutoSave();
    };

    window.toggleCcBcc = function(field) {
        const row = document.getElementById(`row-${field}`);
        if (row) {
            row.style.display = row.style.display === 'none' ? 'flex' : 'none';
        }
    };

    window.minimizeCompose = function() {
        const modal = document.getElementById('composeModal');
        if (modal) {
            modal.classList.toggle('minimized');
        }
    };

    window.closeCompose = async function() {
        clearTimeout(autoSaveTimer);
        // Force save draft before closing if anything is typed
        await saveComposeDraft(true);
        isComposing = false;
        document.getElementById('composeModal')?.remove();
        await updateSidebarBadges();
        if (currentFolder === 'drafts') {
            refreshFolder();
        }
    };

    window.discardComposeDraft = async function() {
        clearTimeout(autoSaveTimer);
        if (currentDraftId) {
            try {
                showToast('Discarding draft...', 'info');
                await fetch(`${API_BASE_URL}/emails/${currentDraftId}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                showToast('Draft discarded', 'success');
            } catch (e) {
                console.error(e);
            }
        }
        isComposing = false;
        document.getElementById('composeModal')?.remove();
        await updateSidebarBadges();
        if (currentFolder === 'drafts') {
            refreshFolder();
        }
    };

    // Autocomplete dropdown recipient finder
    window.handleAutocomplete = function(inputEl, fieldType) {
        const query = inputEl.value.split(',').pop().trim().toLowerCase();
        const drop = document.getElementById(`auto-${fieldType}`);
        if (!drop) return;

        if (query.length < 2) {
            drop.style.display = 'none';
            return;
        }

        const filtered = recipientsList.filter(u => 
            (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
        );

        if (filtered.length === 0) {
            drop.style.display = 'none';
            return;
        }

        drop.innerHTML = filtered.map(u => `
            <div class="email-autocomplete-item" onclick="AzolveEmail.selectAutocompleteUser('${fieldType}', '${u.email}')">
                <span><strong>${u.name}</strong></span>
                <span class="email-autocomplete-email">${u.email}</span>
            </div>
        `).join('');
        drop.style.display = 'block';
    };

    window.selectAutocompleteUser = function(fieldType, email) {
        let input;
        if (fieldType === 'replyTo') {
            input = document.getElementById('replyToInput');
        } else if (fieldType === 'replyCc') {
            input = document.getElementById('replyCcInput');
        } else {
            input = document.getElementById(`comp-${fieldType}`);
        }
        const drop = document.getElementById(`auto-${fieldType}`);
        if (!input) return;

        const parts = input.value.split(',').map(e => e.trim());
        parts.pop(); // remove query
        parts.push(email);
        
        input.value = parts.join(', ') + ', ';
        input.focus();
        drop.style.display = 'none';
    };

    // Upload attachment helper
    window.handleComposeFilesUpload = function(files) {
        const container = document.getElementById('compAttachmentsList');
        Array.from(files).forEach(file => {
            composeAttachments.push(file);
            const item = document.createElement('div');
            item.className = 'email-compose-attachment-item';
            item.innerHTML = `
                <span>${file.name} (${Math.round(file.size / 1024)} KB)</span>
                <i class="fas fa-times" onclick="AzolveEmail.removeComposeFile('${file.name}', this)"></i>
            `;
            container.appendChild(item);
        });
    };

    window.removeComposeFile = function(fileName, el) {
        composeAttachments = composeAttachments.filter(f => f.name !== fileName);
        el.closest('.email-compose-attachment-item').remove();
    };

    // Rich Text Formatting helper
    window.formatText = function(command) {
        let value = null;
        if (command === 'createLink') {
            value = prompt('Enter the link URL:');
            if (!value) return;
        }
        document.execCommand(command, false, value);
        document.getElementById('comp-body').focus();
    };

    // Auto-save draft triggers
    function setupComposeAutoSave() {
        const targets = ['comp-to', 'comp-cc', 'comp-bcc', 'comp-subject', 'comp-body'];
        targets.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const event = id === 'comp-body' ? 'input' : 'keyup';
            el.addEventListener(event, () => {
                const statusEl = document.getElementById('compSaveStatus');
                if (statusEl) statusEl.textContent = 'Saving draft...';
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(() => saveComposeDraft(false), 3000);
            });
        });
    }

    // Save draft API call
    async function saveComposeDraft(isSilent = false) {
        if (!isComposing) return;

        const to = document.getElementById('comp-to')?.value || '';
        const subject = document.getElementById('comp-subject')?.value || '';
        const body = document.getElementById('comp-body')?.innerHTML || '';

        // If completely empty, don't create draft
        if (!to.trim() && !subject.trim() && !body.trim() && composeAttachments.length === 0) {
            const statusEl = document.getElementById('compSaveStatus');
            if (statusEl) statusEl.textContent = '';
            return;
        }

        const fd = new FormData();
        fd.append('to', to);
        fd.append('cc', document.getElementById('comp-cc')?.value || '');
        fd.append('bcc', document.getElementById('comp-bcc')?.value || '');
        fd.append('subject', subject);
        fd.append('body', body);
        fd.append('isDraft', 'true');
        if (currentDraftId) fd.append('draftId', currentDraftId);

        composeAttachments.forEach(file => {
            fd.append('attachments', file);
        });

        try {
            const resp = await fetch(`${API_BASE_URL}/emails/compose`, {
                method: 'POST',
                headers: getHeaders(),
                body: fd
            });
            const data = await resp.json();
            if (data.success && data.data) {
                currentDraftId = data.data._id;
                const statusEl = document.getElementById('compSaveStatus');
                if (statusEl) statusEl.textContent = 'Draft saved';
            }
        } catch (e) {
            console.error('Failed to auto-save draft:', e);
            const statusEl = document.getElementById('compSaveStatus');
            if (statusEl) statusEl.textContent = 'Draft save failed';
        }
    }

    // Final Send Email trigger
    window.sendComposeMail = async function() {
        const to = document.getElementById('comp-to').value;
        const cc = document.getElementById('comp-cc')?.value || '';
        const bcc = document.getElementById('comp-bcc')?.value || '';
        const subject = document.getElementById('comp-subject').value;
        const body = document.getElementById('comp-body').innerHTML;

        if (!to.trim()) {
            showToast('Recipient address is required', 'error');
            return;
        }

        clearTimeout(autoSaveTimer);
        const statusEl = document.getElementById('compSaveStatus');
        if (statusEl) statusEl.textContent = 'Sending...';

        const fd = new FormData();
        fd.append('to', to);
        fd.append('cc', cc);
        fd.append('bcc', bcc);
        fd.append('subject', subject || '(No Subject)');
        fd.append('body', body);
        fd.append('isDraft', 'false');
        if (currentDraftId) fd.append('draftId', currentDraftId);

        composeAttachments.forEach(file => {
            fd.append('attachments', file);
        });

        try {
            showToast('Sending message...', 'info');
            const resp = await fetch(`${API_BASE_URL}/emails/compose`, {
                method: 'POST',
                headers: getHeaders(),
                body: fd
            });
            const data = await resp.json();
            if (data.success) {
                showToast('Email sent successfully', 'success');
                isComposing = false;
                document.getElementById('composeModal')?.remove();
                
                await updateSidebarBadges();
                if (currentFolder === 'sent' || currentFolder === 'inbox') {
                    refreshFolder();
                } else {
                    switchFolder('inbox');
                }
            } else {
                showToast(data.message || 'Failed to send email', 'error');
                if (statusEl) statusEl.textContent = 'Failed to send';
            }
        } catch (e) {
            showToast('Network error sending email', 'error');
            if (statusEl) statusEl.textContent = 'Send failed';
        }
    };

    // Simulator trigger utility
    window.triggerSimulator = async function() {
        try {
            showToast('Requesting mock client inquiry...', 'info');
            const resp = await fetch(`${API_BASE_URL}/emails/simulate-incoming`, {
                method: 'POST',
                headers: { ...getHeaders(), 'Content-Type': 'application/json' }
            });
            const data = await resp.json();
            if (data.success) {
                showToast('Mock email received successfully!', 'success');
                if (!activeThreadId) {
                    refreshFolder();
                }
            }
        } catch (e) {
            showToast('Failed to trigger mock inquiry', 'error');
        }
    };

    // Public module exports
    window.AzolveEmail = {
        switchFolder,
        openCompose,
        minimizeCompose,
        closeCompose,
        discardComposeDraft,
        toggleCcBcc,
        handleAutocomplete,
        selectAutocompleteUser,
        handleComposeFilesUpload,
        removeComposeFile,
        sendComposeMail,
        formatText,
        refreshFolder,
        openThread,
        toggleEmailCard,
        showReplyForm,
        discardInlineReply,
        handleReplyFilesUpload,
        removeReplyFile,
        sendInlineReply,
        actionOnThread,
        toggleSelectRow,
        toggleSelectAll,
        bulkMarkRead,
        bulkArchive,
        bulkTrash,
        bulkRestore,
        bulkDeletePermanent,
        emptyTrash,
        toggleStar,
        searchEmails,
        triggerSimulator
    };

})();
