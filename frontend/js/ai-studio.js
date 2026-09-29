(function() {
    if (typeof document === 'undefined') return;

    // Wait for DOM to load
    window.addEventListener('DOMContentLoaded', initAIStudio);

    function initAIStudio() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;

        // Create the page section if it doesn't exist
        if (!document.getElementById('page-ai-studio')) {
            const section = document.createElement('div');
            section.className = 'page-section';
            section.id = 'page-ai-studio';
            
            // Add Styles
            const style = document.createElement('style');
            style.textContent = `
                /* AI Studio Specific Styles */
                #page-ai-studio {
                    height: calc(100vh - var(--topbar-height) - 48px);
                    margin: -24px; /* Negate the .page-content padding to make it edge-to-edge */
                    padding: 0;
                    display: none;
                    background: var(--bg-body);
                }
                #page-ai-studio.active {
                    display: flex;
                }
                .ai-studio-layout {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                
                /* Chat Panel (Left) */
                .ai-chat-panel {
                    flex: 1;
                    min-width: 320px;
                    max-width: 450px;
                    background: #fff;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    z-index: 10;
                    box-shadow: 2px 0 10px rgba(0,0,0,0.02);
                }
                .ai-chat-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .ai-chat-header .icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #d946ef, #8b5cf6);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }
                .ai-chat-header h3 {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }
                .ai-chat-header .status {
                    font-size: 12px;
                    color: var(--success);
                    font-weight: 600;
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .ai-chat-header .status::before {
                    content: '';
                    width: 8px;
                    height: 8px;
                    background: var(--success);
                    border-radius: 50%;
                    display: inline-block;
                    animation: pulse 2s infinite;
                }
                .ai-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                
                .msg-wrapper {
                    display: flex;
                    gap: 12px;
                    animation: fadeInUp 0.3s ease;
                }
                .msg-wrapper.user {
                    flex-direction: row-reverse;
                }
                .msg-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                }
                .msg-wrapper.ai .msg-avatar { background: linear-gradient(135deg, #d946ef, #8b5cf6); }
                .msg-wrapper.user .msg-avatar { background: var(--secondary); }
                
                .msg-bubble {
                    background: #f8fafc;
                    padding: 14px 18px;
                    border-radius: 16px;
                    border-top-left-radius: 4px;
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-primary);
                    max-width: 85%;
                    border: 1px solid var(--border);
                }
                .msg-wrapper.user .msg-bubble {
                    background: var(--primary-light);
                    color: var(--primary-dark);
                    border-top-right-radius: 4px;
                    border-top-left-radius: 16px;
                    border: 1px solid rgba(113, 75, 103, 0.1);
                }
                
                .ai-chat-input-area {
                    padding: 20px;
                    background: #fff;
                    border-top: 1px solid var(--border);
                }
                .ai-input-box {
                    position: relative;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    background: #f8fafc;
                    transition: var(--transition);
                }
                .ai-input-box:focus-within {
                    border-color: #d946ef;
                    box-shadow: 0 0 0 3px rgba(217, 70, 239, 0.1);
                    background: #fff;
                }
                .ai-input-box textarea {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 16px;
                    padding-right: 50px;
                    font-size: 14px;
                    font-family: inherit;
                    color: var(--text-primary);
                    resize: none;
                    outline: none;
                    height: 56px;
                    max-height: 150px;
                    border-radius: 16px;
                }
                .ai-input-box textarea::placeholder { color: var(--text-muted); }
                
                .ai-send-btn {
                    position: absolute;
                    right: 8px;
                    bottom: 8px;
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #d946ef, #8b5cf6);
                    color: #fff;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    cursor: pointer;
                    transition: transform 0.2s, filter 0.2s;
                }
                .ai-send-btn:hover {
                    filter: brightness(1.1);
                    transform: scale(1.05);
                }
                .ai-send-btn:disabled {
                    background: #cbd5e1;
                    cursor: not-allowed;
                    transform: scale(1);
                }
                
                /* Workspace Panel (Right) */
                .ai-workspace-panel {
                    flex: 2;
                    background: #f1f5f9;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    transition: all 0.3s ease;
                }
                .ai-workspace-empty {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: var(--text-muted);
                }
                .ai-workspace-empty i { font-size: 64px; margin-bottom: 20px; opacity: 0.5; }
                .ai-workspace-empty h2 { font-size: 24px; color: var(--text-secondary); margin-bottom: 8px; }
                
                .ai-workspace-content {
                    display: none; /* hidden until generated */
                    flex-direction: column;
                    height: 100%;
                    background: #fff;
                }
                .ai-workspace-content.active {
                    display: flex;
                }
                
                .workspace-header {
                    padding: 0 20px;
                    height: 56px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #fff;
                }
                .workspace-tabs {
                    display: flex;
                    gap: 20px;
                    height: 100%;
                }
                .workspace-tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 0 4px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    transition: var(--transition);
                }
                .workspace-tab:hover { color: var(--primary); }
                .workspace-tab.active {
                    color: #d946ef;
                    border-bottom-color: #d946ef;
                }
                
                .workspace-actions button {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    background: #fff;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: var(--transition);
                }
                .workspace-actions button:hover { background: var(--bg-body); color: var(--primary); }
                
                .workspace-body {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                    background: #f8fafc;
                }
                .workspace-view {
                    position: absolute;
                    inset: 0;
                    display: none;
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                .workspace-view.active { display: block; }
                
                #workspace-code-view {
                    padding: 20px;
                    margin: 0;
                    background: #1e1e1e;
                    color: #d4d4d4;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 13px;
                    line-height: 1.5;
                    overflow: auto;
                }
                
                .typing-dots span {
                    display: inline-block;
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #a8a29e;
                    margin: 0 2px;
                    animation: typing 1.4s infinite ease-in-out both;
                }
                .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
                .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
                
                /* Dark Mode Support */
                body.dark-mode .ai-chat-panel, body.dark-mode .ai-chat-input-area, body.dark-mode .workspace-header { background: var(--bg-card); border-color: var(--border); }
                body.dark-mode .msg-bubble, body.dark-mode .ai-input-box { background: var(--bg-body); border-color: var(--border); color: var(--text-primary); }
                body.dark-mode .ai-workspace-panel { background: #0f172a; }
                body.dark-mode .ai-workspace-content { background: var(--bg-card); }
                body.dark-mode .msg-wrapper.user .msg-bubble { background: rgba(113, 75, 103, 0.2); }
            `;
            document.head.appendChild(style);

            // Add HTML structure
            section.innerHTML = `
                <div class="ai-studio-layout">
                    <!-- Chat Panel -->
                    <div class="ai-chat-panel">
                        <div class="ai-chat-header">
                            <div class="icon"><i class="fas fa-sparkles"></i></div>
                            <div>
                                <h3>AI Studio</h3>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top:2px;">Powered by Claude & ChatGPT Models</div>
                            </div>
                            <div class="status">Online</div>
                        </div>
                        
                        <div class="ai-chat-messages" id="ai-chat-messages">
                            <div class="msg-wrapper ai">
                                <div class="msg-avatar"><i class="fas fa-robot"></i></div>
                                <div class="msg-bubble">
                                    Hello! I'm your advanced AI assistant. I can help you analyze data, generate reports, or even <strong>build full-scale websites</strong> and applications right here in the workspace. <br><br>What would you like to create today?
                                </div>
                            </div>
                        </div>
                        
                        <div class="ai-chat-input-area">
                            <div class="ai-input-box">
                                <textarea id="ai-chat-input" placeholder="E.g., Build a modern landing page for my business..." rows="1"></textarea>
                                <button class="ai-send-btn" id="ai-send-btn"><i class="fas fa-paper-plane"></i></button>
                            </div>
                            <div style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 12px;">
                                AI can make mistakes. Review generated code and content carefully.
                            </div>
                        </div>
                    </div>
                    
                    <!-- Workspace Panel -->
                    <div class="ai-workspace-panel">
                        <div class="ai-workspace-empty" id="ai-workspace-empty">
                            <i class="fas fa-laptop-code"></i>
                            <h2>Your Workspace</h2>
                            <p>Ask the AI to build a website, dashboard, or application,<br>and it will render instantly here.</p>
                        </div>
                        
                        <div class="ai-workspace-content" id="ai-workspace-content">
                            <div class="workspace-header">
                                <div class="workspace-tabs">
                                    <div class="workspace-tab active" data-target="preview"><i class="fas fa-play"></i> Live Preview</div>
                                    <div class="workspace-tab" data-target="code"><i class="fas fa-code"></i> View Code</div>
                                </div>
                                <div class="workspace-actions">
                                    <button title="Copy Code" onclick="AzolveStudio.copyCode()"><i class="far fa-copy"></i> Copy</button>
                                    <button title="Open in New Tab" onclick="AzolveStudio.openPreview()"><i class="fas fa-external-link-alt"></i> Open</button>
                                </div>
                            </div>
                            <div class="workspace-body">
                                <iframe id="workspace-preview-view" class="workspace-view active"></iframe>
                                <pre id="workspace-code-view" class="workspace-view"><code></code></pre>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            pageContent.appendChild(section);
            
            // Initialize Logic
            initAIStudioLogic();
        }
    }
    
    function initAIStudioLogic() {
        const input = document.getElementById('ai-chat-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const messagesArea = document.getElementById('ai-chat-messages');
        const workspaceEmpty = document.getElementById('ai-workspace-empty');
        const workspaceContent = document.getElementById('ai-workspace-content');
        const previewFrame = document.getElementById('workspace-preview-view');
        const codeView = document.getElementById('workspace-code-view').querySelector('code');
        const tabs = document.querySelectorAll('.workspace-tab');
        
        let isGenerating = false;
        let lastGeneratedCode = "";

        // Tab Switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.workspace-view').forEach(v => v.classList.remove('active'));
                
                const target = tab.getAttribute('data-target');
                if (target === 'preview') {
                    document.getElementById('workspace-preview-view').classList.add('active');
                } else if (target === 'code') {
                    document.getElementById('workspace-code-view').classList.add('active');
                }
            });
        });

        // Auto-resize textarea
        input.addEventListener('input', function() {
            this.style.height = '56px';
            this.style.height = (this.scrollHeight) + 'px';
            sendBtn.disabled = this.value.trim().length === 0;
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        
        sendBtn.addEventListener('click', handleSend);

        function handleSend() {
            const text = input.value.trim();
            if (!text || isGenerating) return;
            
            // 1. Add User Message
            addMessage(text, 'user');
            input.value = '';
            input.style.height = '56px';
            sendBtn.disabled = true;
            
            // 2. Add AI Loading State
            isGenerating = true;
            const loadingId = addMessage('<div class="typing-dots"><span></span><span></span><span></span></div>', 'ai');
            
            // 3. Simulate Generation (Mocking actual AI API for demo)
            setTimeout(() => {
                const isWebsiteRequest = text.toLowerCase().includes('website') || text.toLowerCase().includes('page') || text.toLowerCase().includes('build');
                
                if (isWebsiteRequest) {
                    removeMessage(loadingId);
                    addMessage("I've built the website you requested. I used HTML, Tailwind CSS (via CDN) for modern styling, and added some micro-animations to make it feel premium. You can interact with it in the Live Preview panel on the right, or view the source code.", 'ai');
                    
                    const simulatedHTML = generatePremiumMockHTML(text);
                    lastGeneratedCode = simulatedHTML;
                    
                    // Show Workspace
                    workspaceEmpty.style.display = 'none';
                    workspaceContent.classList.add('active');
                    
                    // Inject into iframe
                    const doc = previewFrame.contentWindow.document;
                    doc.open();
                    doc.write(simulatedHTML);
                    doc.close();
                    
                    // Inject into code view (escape HTML so it renders as text)
                    codeView.textContent = simulatedHTML;
                    
                } else {
                    removeMessage(loadingId);
                    addMessage("I can certainly help with that. Since this is the AI Studio, if you ask me to **build a website**, **landing page**, or **dashboard**, I will write the full code and render it live on the right canvas. Try asking me to 'Build a modern startup landing page'!", 'ai');
                }
                
                isGenerating = false;
            }, 1800);
        }
        
        function addMessage(html, type) {
            const id = 'msg-' + Date.now();
            const wrapper = document.createElement('div');
            wrapper.className = `msg-wrapper ${type}`;
            wrapper.id = id;
            
            const avatar = document.createElement('div');
            avatar.className = 'msg-avatar';
            avatar.innerHTML = type === 'ai' ? '<i class="fas fa-robot"></i>' : 'U';
            
            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            bubble.innerHTML = html;
            
            wrapper.appendChild(avatar);
            wrapper.appendChild(bubble);
            messagesArea.appendChild(wrapper);
            
            messagesArea.scrollTop = messagesArea.scrollHeight;
            return id;
        }
        
        function removeMessage(id) {
            const el = document.getElementById(id);
            if (el) el.remove();
        }
        
        // Expose public methods
        window.AzolveStudio = {
            copyCode: () => {
                if(lastGeneratedCode) {
                    navigator.clipboard.writeText(lastGeneratedCode);
                    if(typeof showToast === 'function') showToast('Code copied to clipboard!', 'success');
                }
            },
            openPreview: () => {
                if(lastGeneratedCode) {
                    const blob = new Blob([lastGeneratedCode], {type: 'text/html'});
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                }
            }
        };
    }
    
    // --- MOCK TEMPLATE GENERATOR ---
    function generatePremiumMockHTML(prompt) {
        // We inject Tailwind via CDN to simulate a real "built from scratch" look
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated AI Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); }
        .gradient-text { background: linear-gradient(135deg, #d946ef, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased overflow-x-hidden">
    
    <!-- Navbar -->
    <nav class="fixed w-full z-50 transition-all duration-300 glass top-0 left-0 px-6 py-4">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="text-2xl font-bold tracking-tighter"><span class="gradient-text">Nexus</span>AI</div>
            <div class="hidden md:flex gap-8 font-medium text-sm text-slate-600">
                <a href="#" class="hover:text-purple-600 transition">Features</a>
                <a href="#" class="hover:text-purple-600 transition">Solutions</a>
                <a href="#" class="hover:text-purple-600 transition">Pricing</a>
            </div>
            <button class="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">Get Started</button>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-300 rounded-full blur-[120px] opacity-20 -z-10"></div>
        <div class="max-w-7xl mx-auto px-6 text-center">
            <div class="inline-block mb-4 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide uppercase">New Feature Released</div>
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                Build the future with <br> <span class="gradient-text">intelligent tools</span>.
            </h1>
            <p class="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                Empower your team with next-generation AI workflows. Automate the mundane, focus on the creative, and scale faster than ever before.
            </p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button class="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:shadow-xl transition transform hover:-translate-y-1 w-full sm:w-auto">Start Free Trial</button>
                <button class="bg-white text-slate-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-50 border border-slate-200 transition shadow-sm w-full sm:w-auto">Book a Demo</button>
            </div>
        </div>
        
        <!-- Dashboard Mockup -->
        <div class="max-w-5xl mx-auto mt-20 relative px-6 animate-float">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 p-2">
                <div class="bg-slate-100 rounded-xl h-[400px] flex items-center justify-center text-slate-400 font-medium">
                    [ Interactive Dashboard Render ]
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="py-24 bg-white border-t border-slate-100">
        <div class="max-w-7xl mx-auto px-6">
            <div class="text-center mb-16">
                <h2 class="text-3xl font-bold mb-4">Everything you need to scale</h2>
                <p class="text-slate-500 max-w-2xl mx-auto">Our platform provides end-to-end solutions for modern enterprises looking to leverage AI.</p>
            </div>
            <div class="grid md:grid-cols-3 gap-8">
                <div class="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition">
                    <div class="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6 text-xl">⚡</div>
                    <h3 class="text-xl font-bold mb-3">Lightning Fast</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Generated code is optimized for performance, ensuring your applications run smoothly under any load.</p>
                </div>
                <div class="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition">
                    <div class="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center mb-6 text-xl">🛡️</div>
                    <h3 class="text-xl font-bold mb-3">Enterprise Security</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Bank-grade encryption and SOC2 compliance out of the box. Your data is always protected.</p>
                </div>
                <div class="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition">
                    <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6 text-xl">🔄</div>
                    <h3 class="text-xl font-bold mb-3">Seamless Integrations</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">Connect with your favorite tools effortlessly. We support over 100+ native integrations.</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>`;
    }
})();
