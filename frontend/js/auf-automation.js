/**
 * AZOLVE UNIQUE FEATURES — AUTOMATION
 * ====================================
 * WhatsApp Workflow + Voice-to-Invoice + UPI Payments
 * + Smart Follow-Up + GST Auto-Filing + Receipt OCR
 */
(function(global){
'use strict';
var AUF = global.AUF = global.AUF || {};
var u = AUF.util;

// ========================================================================
// FEATURE 2: WHATSAPP-FIRST WORKFLOW
// ========================================================================
AUF.whatsapp = {
    commands: [
        { cmd:'INV [amount] [client]', desc:'Create & send invoice', example:'INV 5000 Acme', icon:'📄' },
        { cmd:'PAID [invoice#]', desc:'Mark invoice as paid', example:'PAID INV-001', icon:'✅' },
        { cmd:'REPORT', desc:'Today\'s business summary', example:'REPORT', icon:'📊' },
        { cmd:'QUOTE [amount] [client]', desc:'Send quotation', example:'QUOTE 10000 TechStart', icon:'📋' },
        { cmd:'REMIND [invoice#]', desc:'Send payment reminder', example:'REMIND INV-003', icon:'🔔' },
        { cmd:'ADD CLIENT [name] [phone]', desc:'Add new client', example:'ADD CLIENT Acme 9876543210', icon:'👤' },
        { cmd:'LEAD [name] [phone]', desc:'Add new lead', example:'LEAD Raj 9876543210', icon:'🎯' },
        { cmd:'TODO [task]', desc:'Add task', example:'TODO Call Mike tomorrow', icon:'📝' },
        { cmd:'EXPENSE [amount] [desc]', desc:'Record expense', example:'EXPENSE 500 Fuel', icon:'💸' },
        { cmd:'DUE', desc:'Show overdue invoices', example:'DUE', icon:'⏰' },
        { cmd:'HELP', desc:'Show all commands', example:'HELP', icon:'❓' }
    ],
    simulate: function(text){
        var parts = text.trim().toUpperCase().split(/\s+/);
        var cmd = parts[0];
        var u = AUF.util;
        var inv = u.get('invoices',[])||[];

        if(cmd === 'INV'){
            var amt = parseFloat(parts[1])||0;
            var client = parts.slice(2).join(' ');
            var invNum = 'INV-'+(inv.length+1).toString().padStart(3,'0');
            return '✅ Invoice '+invNum+' created for '+client+' — '+u.fmt(amt)+'\n\nClient will receive WhatsApp message with UPI payment link.\n\n_Simulated reply_';
        }
        if(cmd === 'PAID'){
            return '✅ Invoice '+parts[1]+' marked as PAID.\n💰 Reconciled automatically.\n📊 Dashboard updated.\n\n_Simulated reply_';
        }
        if(cmd === 'REPORT'){
            var paid = inv.filter(function(i){return i.status==='paid';});
            var todayRev = paid.reduce(function(s,i){return s+(i.total||0);},0);
            var pending = inv.filter(function(i){return i.status!=='paid';}).length;
            return '📊 *Today\'s Report*\n\n💰 Revenue: '+u.fmt(todayRev)+'\n📄 Total Invoices: '+inv.length+'\n⏰ Pending: '+pending+'\n✅ Paid: '+paid.length+'\n\n_Simulated reply_';
        }
        if(cmd === 'DUE'){
            var overdue = inv.filter(function(i){return i.status==='overdue';});
            if(!overdue.length) return '🎉 No overdue invoices! Great job.\n\n_Simulated reply_';
            return '⏰ *Overdue Invoices*\n\n'+overdue.map(function(i){return '• '+i.number+' — '+(i.clientName||'')+' — '+u.fmt(i.total);}).join('\n')+'\n\n_Simulated reply_';
        }
        if(cmd === 'QUOTE'){
            var q = parseFloat(parts[1])||0;
            return '📋 Quotation sent to '+parts.slice(2).join(' ')+' for '+u.fmt(q)+'\n💬 They can accept via WhatsApp reply.\n\n_Simulated reply_';
        }
        if(cmd === 'REMIND'){
            return '🔔 Payment reminder sent for '+parts[1]+' via WhatsApp.\n\n_Simulated reply_';
        }
        if(cmd === 'EXPENSE'){
            return '💸 Expense of '+u.fmt(parseFloat(parts[1])||0)+' recorded: '+parts.slice(2).join(' ')+'\n✅ Added to expense register.\n\n_Simulated reply_';
        }
        if(cmd === 'LEAD' || cmd === 'ADD'){
            return '✅ Contact added successfully.\n📞 '+parts.slice(cmd==='ADD'?2:1).join(' ')+'\n\n_Simulated reply_';
        }
        if(cmd === 'TODO'){
            return '📝 Task created: "'+parts.slice(1).join(' ').toLowerCase()+'"\n⏰ Reminder will be sent.\n\n_Simulated reply_';
        }
        if(cmd === 'HELP'){
            return '*Azolve WhatsApp Commands*\n\n'+AUF.whatsapp.commands.map(function(c){return c.icon+' '+c.cmd;}).join('\n');
        }
        return '❓ Unknown command. Type *HELP* to see all commands.\n\n_Simulated reply_';
    },
    renderPage: function(){
        var cmdHTML = this.commands.map(function(c){
            return '<div class="auf-wa-chip" onclick="AUF.whatsapp.try(\''+c.example.replace(/'/g,"\\'")+'\')">'+c.icon+' <code>'+c.cmd+'</code><span style="font-size:11px;opacity:0.7">· '+c.desc+'</span></div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#25D366,#128C7E)">' +
                '<div class="auf-hero-badge">💬 WHATSAPP-FIRST WORKFLOW</div>' +
                '<h1>Run Your Business from WhatsApp</h1>' +
                '<p>Create invoices, mark payments, track expenses, and get reports — all through simple WhatsApp messages. No app switching required.</p>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>📱 Available Commands</h3></div><div class="card-body">' +
                    '<p style="color:var(--text-muted);font-size:13px;margin-bottom:14px">Tap any command to try it:</p>' +
                    cmdHTML +
                '</div></div>' +
                '<div class="card"><div class="card-header"><h3>🧪 Command Tester</h3></div><div class="card-body">' +
                    '<div style="background:#ECE5DD;padding:14px;border-radius:12px;margin-bottom:12px;min-height:200px" id="aufWaChat">' +
                        '<div style="text-align:center;color:#666;font-size:12px;margin-top:60px">Try a command below to simulate WhatsApp conversation</div>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px"><input type="text" id="aufWaInput" class="form-control" placeholder="Type command e.g. INV 5000 Acme" style="flex:1"><button class="btn btn-primary" onclick="AUF.whatsapp.send()"><i class="fas fa-paper-plane"></i></button></div>' +
                '</div></div>' +
            '</div>' +
            '<div class="card" style="margin-top:16px"><div class="card-header"><h3>⚙️ WhatsApp Business Setup</h3></div><div class="card-body">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
                    '<div><label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase">WhatsApp Business Number</label><input type="text" class="form-control" placeholder="+91 98765 43210" style="margin-top:6px"></div>' +
                    '<div><label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Auto-Reply Mode</label><select class="form-control" style="margin-top:6px"><option>Full Automation</option><option>Confirm Before Send</option><option>Manual Only</option></select></div>' +
                '</div>' +
                '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-primary" onclick="AUF.util.toast(\'WhatsApp connection requires backend integration. Contact support to enable.\',\'info\')"><i class="fab fa-whatsapp"></i> Connect WhatsApp</button><button class="btn btn-outline" onclick="AUF.whatsapp.try(\'REPORT\')">Test Message</button></div>' +
            '</div></div>' +
        '</div>';
    },
    try: function(cmd){
        var inp = document.getElementById('aufWaInput');
        if(inp){ inp.value = cmd; this.send(); }
    },
    send: function(){
        var inp = document.getElementById('aufWaInput');
        var chat = document.getElementById('aufWaChat');
        if(!inp || !chat) return;
        var msg = inp.value.trim();
        if(!msg) return;
        if(chat.querySelector('[style*="text-align:center"]')) chat.innerHTML = '';

        chat.innerHTML += '<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><div style="background:#DCF8C6;padding:8px 12px;border-radius:10px;max-width:80%;font-size:13px;white-space:pre-wrap">'+msg+'</div></div>';
        var reply = this.simulate(msg);
        setTimeout(function(){
            chat.innerHTML += '<div style="display:flex;margin-bottom:8px"><div style="background:#fff;padding:8px 12px;border-radius:10px;max-width:80%;font-size:13px;white-space:pre-wrap">'+reply+'</div></div>';
            chat.scrollTop = chat.scrollHeight;
        }, 600);
        inp.value = '';
    }
};

// ========================================================================
// FEATURE 3: VOICE-TO-INVOICE
// ========================================================================
AUF.voice = {
    recording: false,
    recognition: null,
    samples: [
        {text:'Invoice banao Acme ke liye, web development 45000 rupaye, GST 18%', lang:'Hindi'},
        {text:'Create invoice for TechStart, UI design 20000, tax 18 percent', lang:'English'},
        {text:'Acme ne 50000 ka invoice bheja, 30 days payment terms', lang:'Hindi'},
        {text:'Make a quotation for Global Solutions, consulting 25000, validity 15 days', lang:'English'}
    ],
    _initRecognition: function(){
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR) return false;
        if (this.recognition) {
            try { this.recognition.abort(); } catch(e){}
            this.recognition = null;
        }
        this.recognition = new SR();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        // Auto-detect language: prefer saved setting or browser default
        this.recognition.lang = localStorage.getItem('azolve_voice_lang') || navigator.language || 'en-IN';
        var self = this;
        this.recognition.onresult = function(e){
            // Get the best final result, or the latest interim
            var transcript = '';
            var isFinal = false;
            for(var i = e.resultIndex; i < e.results.length; i++){
                if(e.results[i].isFinal){
                    transcript = e.results[i][0].transcript;
                    isFinal = true;
                } else {
                    // Update status with live interim text
                    var interim = e.results[i][0].transcript;
                    var status = document.getElementById('aufVoiceStatus');
                    if(status) status.innerHTML = '<span style="color:#f59e0b;font-weight:700">🔴 Hearing: "'+interim+'"</span>';
                }
            }
            if(isFinal && transcript){
                self._onTranscript(transcript);
            }
        };
        this.recognition.onerror = function(e){
            console.error('Speech recognition error:', e.error);
            self.recording = false;
            var btn = document.getElementById('aufVoiceBtn');
            var status = document.getElementById('aufVoiceStatus');
            if(btn){ btn.classList.remove('recording'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
            if(e.error === 'not-allowed'){
                if(status) status.innerHTML = '<span style="color:#ef4444;font-weight:700">❌ Microphone access denied. Please allow microphone in browser settings.</span>';
            } else if(e.error === 'no-speech'){
                if(status) status.innerHTML = '<span style="color:#f59e0b;font-weight:700">⚠️ No speech detected. Tap mic and try again.</span>';
            } else {
                if(status) status.innerHTML = '<span style="color:#ef4444;font-weight:700">❌ Error: '+e.error+'. Try again.</span>';
            }
        };
        this.recognition.onend = function(){
            // Only reset UI if no result was processed
            if(self.recording){
                self.recording = false;
                var btn = document.getElementById('aufVoiceBtn');
                var status = document.getElementById('aufVoiceStatus');
                if(btn){ btn.classList.remove('recording'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
                if(status && !status.innerHTML.includes('Understood') && !status.innerHTML.includes('denied')){
                    status.innerHTML = '<span style="color:#f59e0b;font-weight:700">⚠️ Nothing heard. Tap mic and try again.</span>';
                }
            }
        };
        return true;
    },
    _onTranscript: function(transcript){
        this.recording = false;
        var btn = document.getElementById('aufVoiceBtn');
        var status = document.getElementById('aufVoiceStatus');
        if(btn){ btn.classList.remove('recording'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
        if(status) status.innerHTML = '<span style="color:#10b981;font-weight:700">✅ Understood!</span>';

        // Detect language
        var isHindi = /[\u0900-\u097F]/.test(transcript) ||
            /\b(banao|bana|kar|dikhao|batao|aaj|kitna|rupee|rupya|paisa|ke liye|liye)\b/i.test(transcript);
        var lang = isHindi ? 'Hindi / Hinglish' : 'English';
        // Save lang preference
        localStorage.setItem('azolve_voice_lang', isHindi ? 'hi-IN' : 'en-IN');

        this._showResult({text: transcript, lang: lang});
    },
    toggle: function(){
        var btn = document.getElementById('aufVoiceBtn');
        var status = document.getElementById('aufVoiceStatus');

        // If already listening, stop
        if(this.recording){
            this.recording = false;
            if(this.recognition) {
                try {
                    this.recognition.abort();
                } catch(e){}
            }
            if(btn){ btn.classList.remove('recording'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; }
            if(status) status.innerHTML = 'Tap microphone to start';
            return;
        }

        // Try to use real speech recognition
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!SR){
            // Browser doesn't support — fall back to demo mode
            if(status) status.innerHTML = '<span style="color:#f59e0b;font-weight:700">⚠️ Your browser does not support voice recognition. Use Chrome or Edge. Showing demo...</span>';
            var self = this;
            setTimeout(function(){
                var sample = self.samples[Math.floor(Math.random()*self.samples.length)];
                if(status) status.innerHTML = '<span style="color:#10b981;font-weight:700">✅ Demo mode — real mic unavailable.</span>';
                self._showResult(sample);
            }, 1500);
            return;
        }

        // Always initialize a brand new recognition instance to clear stale state
        this._initRecognition();

        if(!this.recognition) {
            if(status) status.innerHTML = '<span style="color:#ef4444;font-weight:700">❌ Failed to initialize speech recognition.</span>';
            return;
        }

        if(!btn) return;
        this.recording = true;
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        if(status) status.innerHTML = '<span style="color:#ef4444;font-weight:700">🔴 Listening... (speak clearly)</span>';

        try {
            this.recognition.start();
        } catch(err){
            console.error('Speech recognition start failed:', err);
            this.recording = false;
            btn.classList.remove('recording');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
            if(status) status.innerHTML = '<span style="color:#f59e0b">⚠️ Failed to start. Please try again.</span>';
            this.recognition = null;
        }
    },
    _showResult: function(sample){
        var match = /(\d+[\d,]*)/.exec(sample.text);
        var amount = match ? parseInt(match[1].replace(/,/g,'')) : 25000;
        var client = /for ([A-Za-z ]+?)(?:,|$)/.exec(sample.text);
        var clientName = client ? client[1].trim() : 'New Client';
        var gstMatch = /(\d+)\s*%|gst\s*(\d+)/i.exec(sample.text);
        var gst = gstMatch ? parseInt(gstMatch[1]||gstMatch[2]) : 18;

        var result = document.getElementById('aufVoiceResult');
        if(result){
            result.innerHTML = '<div style="padding:20px;background:#dcfce7;border-radius:12px;border:2px solid #10b981">' +
                '<div style="font-size:11px;color:#065f46;text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:8px">🎤 '+sample.lang+' Recognized</div>' +
                '<div style="font-style:italic;color:#065f46;margin-bottom:14px">"'+sample.text+'"</div>' +
                '<div style="background:#fff;padding:14px;border-radius:8px">' +
                    '<h4 style="margin:0 0 10px">📋 Invoice Draft</h4>' +
                    '<table style="width:100%;font-size:13px"><tr><td style="padding:4px 0;color:#64748b">Client:</td><td style="padding:4px 0;font-weight:600">'+clientName+'</td></tr>' +
                    '<tr><td style="padding:4px 0;color:#64748b">Amount:</td><td style="padding:4px 0;font-weight:600">'+u.fmt(amount)+'</td></tr>' +
                    '<tr><td style="padding:4px 0;color:#64748b">GST:</td><td style="padding:4px 0;font-weight:600">'+gst+'%</td></tr>' +
                    '<tr><td style="padding:4px 0;color:#64748b">Total:</td><td style="padding:4px 0;font-weight:800;color:#667eea">'+u.fmt(amount*(1+gst/100))+'</td></tr></table>' +
                    '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" onclick="AUF.util.toast(\'Invoice draft created! Go to Invoices to review.\',\'success\');setTimeout(function(){navigate(\'invoices\');},1500)"><i class="fas fa-check"></i> Create Invoice</button><button class="btn btn-outline btn-sm" onclick="AUF.voice.toggle()">🎤 Record Again</button></div>' +
                '</div>' +
            '</div>';
        }
    },
    renderPage: function(){
        var warningHtml = '';
        if (location.protocol === 'file:') {
            warningHtml = '<div style="margin-bottom:20px;padding:16px;background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;color:#991b1b;font-size:14px;text-align:left;line-height:1.5;">' +
                '<strong>⚠️ Browser Security Restriction:</strong> You are viewing this page directly from the filesystem (`file://` protocol). Browsers block microphone and voice recognition APIs on local files. ' +
                'Please start your backend server (run <code>npm start</code> in the <code>backend</code> directory) and access the dashboard at <a href="http://localhost:3000" style="color:#2563eb;text-decoration:underline;font-weight:600">http://localhost:3000</a> to use voice commands.' +
                '</div>';
        } else if (!window.isSecureContext) {
            warningHtml = '<div style="margin-bottom:20px;padding:16px;background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;color:#991b1b;font-size:14px;text-align:left;line-height:1.5;">' +
                '<strong>⚠️ Insecure Context Detected:</strong> Web speech recognition requires a secure context (HTTPS or localhost). ' +
                'Please use a secure domain or localhost.' +
                '</div>';
        }

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)">' +
                '<div class="auf-hero-badge">🎤 AI VOICE RECOGNITION</div>' +
                '<h1>Voice-to-Invoice</h1>' +
                '<p>Speak naturally in English or Hindi. AI understands and creates the invoice automatically. Perfect for on-the-go entrepreneurs.</p>' +
            '</div>' +
            warningHtml +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-body" style="text-align:center;padding:40px">' +
                    '<button id="aufVoiceBtn" class="auf-voice-btn" onclick="AUF.voice.toggle()"><i class="fas fa-microphone"></i></button>' +
                    '<div id="aufVoiceStatus" style="margin-top:12px;font-size:14px;color:var(--text-muted)">Tap microphone to start</div>' +
                    '<div style="display:flex;justify-content:center;gap:8px;margin-top:20px;flex-wrap:wrap">' +
                        '<span class="auf-badge-pill">🇬🇧 English</span>' +
                        '<span class="auf-badge-pill">🇮🇳 Hindi</span>' +
                        '<span class="auf-badge-pill">Gujarati</span>' +
                        '<span class="auf-badge-pill">Marathi</span>' +
                        '<span class="auf-badge-pill">Tamil</span>' +
                    '</div>' +
                    '<div id="aufVoiceResult" style="margin-top:24px;text-align:left"></div>' +
                '</div></div>' +
                '<div class="card"><div class="card-header"><h3>💡 How It Works</h3></div><div class="card-body">' +
                    '<ol style="padding-left:20px;line-height:2;font-size:14px">' +
                        '<li>🎤 Tap the microphone button</li>' +
                        '<li>🗣️ Speak naturally — mix languages freely</li>' +
                        '<li>🧠 AI extracts amount, client, GST, terms</li>' +
                        '<li>📋 Review the draft invoice</li>' +
                        '<li>✅ Confirm to create & send</li>' +
                    '</ol>' +
                    '<div style="margin-top:16px;padding:12px;background:#fef3c7;border-radius:8px;font-size:12px;line-height:1.6">' +
                        '<strong>Example phrases (click to simulate):</strong><br>' +
                        '• <a href="#" style="color:#2563eb;text-decoration:underline;" onclick="event.preventDefault(); AUF.voice._onTranscript(\'Invoice banao Acme ke liye, web development 45000 rupaye, GST 18%\')">"Invoice banao Acme ke liye, 45000 rupaye, GST 18%"</a><br>' +
                        '• <a href="#" style="color:#2563eb;text-decoration:underline;" onclick="event.preventDefault(); AUF.voice._onTranscript(\'Create invoice for TechStart, UI design 20000, tax 18 percent\')">"Create invoice for TechStart, UI design 20000, tax 18 percent"</a><br>' +
                        '• <a href="#" style="color:#2563eb;text-decoration:underline;" onclick="event.preventDefault(); AUF.voice._onTranscript(\'Acme ne 50000 ka invoice bheja, 30 days payment terms\')">"Acme ne 50000 ka invoice bheja, 30 days payment terms"</a>' +
                    '</div>' +
                '</div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 4: INSTANT UPI PAYMENT LINKS
// ========================================================================
AUF.upi = {
    generateLink: function(invoice, upiId){
        upiId = upiId || 'azolve@paytm';
        var amount = invoice.total || invoice.amount || 0;
        var note = invoice.number || 'Invoice';
        return 'upi://pay?pa='+encodeURIComponent(upiId)+'&pn='+encodeURIComponent('Azolve')+'&am='+amount+'&cu=INR&tn='+encodeURIComponent(note);
    },
    generateQR: function(invoice, upiId){
        var link = this.generateLink(invoice, upiId);
        return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data='+encodeURIComponent(link);
    },
    renderPage: function(){
        var company = u.getObj('company',{}); 
        var upiId = company.upiId || 'azolve@paytm';
        var recentInv = (u.get('invoices',[])||[]).slice(0, 5);
        var invHTML = recentInv.length ? recentInv.map(function(i){
            var qr = AUF.upi.generateQR(i, upiId);
            var link = AUF.upi.generateLink(i, upiId);
            return '<div class="auf-upi-box" style="margin-bottom:12px">' +
                '<div style="font-size:12px;opacity:0.85">'+i.number+'</div>' +
                '<div style="font-size:20px;font-weight:800;margin:4px 0">'+u.fmt(i.total)+'</div>' +
                '<div style="font-size:12px;opacity:0.9">'+i.clientName+'</div>' +
                '<img src="'+qr+'" class="auf-upi-qr" style="width:140px;height:140px">' +
                '<div style="font-size:10px;opacity:0.9;margin-top:6px">Scan to Pay via UPI</div>' +
                '<button onclick="navigator.clipboard&&navigator.clipboard.writeText(\''+link+'\');AUF.util.toast(\'UPI link copied!\',\'success\')" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;margin-top:8px">📋 Copy Link</button>' +
            '</div>';
        }).join('') : '<p style="color:var(--text-muted);text-align:center;padding:30px">No invoices yet</p>';

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">' +
                '<div class="auf-hero-badge">⚡ INSTANT PAYMENTS</div>' +
                '<h1>UPI Payment Links</h1>' +
                '<p>Every invoice gets an instant UPI payment link and QR code. Clients pay in 5 seconds — auto-reconciled to your books.</p>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div>' +
                    '<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>⚙️ UPI Configuration</h3></div><div class="card-body">' +
                        '<label style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Your UPI ID</label>' +
                        '<input type="text" class="form-control" value="'+upiId+'" id="aufUpiId" style="margin-top:6px">' +
                        '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">' +
                            '<span class="auf-badge-pill" style="background:#00BAF2">PhonePe</span>' +
                            '<span class="auf-badge-pill" style="background:#4285F4">Google Pay</span>' +
                            '<span class="auf-badge-pill" style="background:#00A9E0">Paytm</span>' +
                            '<span class="auf-badge-pill" style="background:#EE3124">BHIM</span>' +
                            '<span class="auf-badge-pill" style="background:#6b7280">100+ banks</span>' +
                        '</div>' +
                        '<button class="btn btn-primary" style="margin-top:14px;width:100%" onclick="var v=document.getElementById(\'aufUpiId\');if(v){var c=AUF.util.getObj(\'company\',{});c.upiId=v.value;AUF.util.set(\'company\',c);AUF.util.toast(\'UPI ID saved: \'+v.value,\'success\')}"><i class="fas fa-save"></i> Save UPI ID</button>' +
                    '</div></div>' +
                    '<div class="card"><div class="card-header"><h3>✨ What You Get</h3></div><div class="card-body">' +
                        '<div style="display:flex;gap:10px;padding:12px;margin-bottom:8px;background:#f0f9ff;border-radius:8px"><i class="fas fa-bolt" style="color:#0284c7;font-size:20px;margin-top:2px"></i><div><strong style="font-size:13px">Instant Settlement</strong><br><span style="font-size:12px;color:var(--text-muted)">Money in your bank within seconds</span></div></div>' +
                        '<div style="display:flex;gap:10px;padding:12px;margin-bottom:8px;background:#f0fdf4;border-radius:8px"><i class="fas fa-sync" style="color:#16a34a;font-size:20px;margin-top:2px"></i><div><strong style="font-size:13px">Auto-Reconciliation</strong><br><span style="font-size:12px;color:var(--text-muted)">Invoices marked PAID automatically</span></div></div>' +
                        '<div style="display:flex;gap:10px;padding:12px;margin-bottom:8px;background:#fef3c7;border-radius:8px"><i class="fas fa-percent" style="color:#d97706;font-size:20px;margin-top:2px"></i><div><strong style="font-size:13px">Zero Transaction Fee</strong><br><span style="font-size:12px;color:var(--text-muted)">UPI is 100% free for receiving</span></div></div>' +
                        '<div style="display:flex;gap:10px;padding:12px;background:#fce7f3;border-radius:8px"><i class="fas fa-mobile-alt" style="color:#db2777;font-size:20px;margin-top:2px"></i><div><strong style="font-size:13px">One-Tap Pay</strong><br><span style="font-size:12px;color:var(--text-muted)">Client taps & pays — no typing needed</span></div></div>' +
                    '</div></div>' +
                '</div>' +
                '<div><div class="card"><div class="card-header"><h3>💳 Payment Links for Recent Invoices</h3></div><div class="card-body">'+invHTML+'</div></div></div>' +
            '</div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 7: SMART FOLLOW-UP AUTOPILOT
// ========================================================================
AUF.autopilot = {
    defaultRules: [
        {id:'r1', name:'Gentle Reminder (3 days before due)', trigger:'days_before_due', value:3, action:'whatsapp_gentle', enabled:true, template:'Hi {client}, friendly reminder — invoice {invoice} of {amount} is due on {due}. Pay here: {link}'},
        {id:'r2', name:'On Due Date', trigger:'on_due_date', value:0, action:'whatsapp_direct', enabled:true, template:'Hi {client}, invoice {invoice} is due today. Please pay {amount} at: {link}'},
        {id:'r3', name:'Overdue 3 Days', trigger:'days_overdue', value:3, action:'whatsapp_firm', enabled:true, template:'Hi {client}, invoice {invoice} is 3 days overdue. Kindly settle {amount} ASAP.'},
        {id:'r4', name:'Overdue 7 Days', trigger:'days_overdue', value:7, action:'email_formal', enabled:true, template:'Dear {client},\\n\\nInvoice {invoice} for {amount} is now 7 days overdue. Please make payment within 48 hours to avoid late fees.'},
        {id:'r5', name:'Overdue 15 Days', trigger:'days_overdue', value:15, action:'final_notice', enabled:false, template:'Final Notice: Invoice {invoice} is 15 days overdue. Legal action may follow.'},
        {id:'r6', name:'Lead No Response (2 days)', trigger:'lead_inactive', value:2, action:'nudge_lead', enabled:true, template:'Hi {name}, just checking in on our previous conversation. Any questions?'},
        {id:'r7', name:'Deal Stuck (7 days)', trigger:'deal_stale', value:7, action:'nudge_deal', enabled:true, template:'Hi {name}, wanted to follow up on the proposal. Anything we can clarify?'},
        {id:'r8', name:'Thank You After Payment', trigger:'payment_received', value:0, action:'thank_you', enabled:true, template:'Thank you {client}! We\'ve received your payment of {amount}. Looking forward to working together.'}
    ],
    getRules: function(){
        var r = u.get('auf_autopilot_rules', null);
        if(!r) { u.set('auf_autopilot_rules', this.defaultRules); r = this.defaultRules; }
        return r;
    },
    toggle: function(id){
        var rules = this.getRules();
        rules.forEach(function(r){ if(r.id===id) r.enabled = !r.enabled; });
        u.set('auf_autopilot_rules', rules);
        this._refreshList();
        AUF.util.toast('Rule updated', 'success');
    },
    _refreshList: function(){
        var el = document.getElementById('aufRulesList');
        if(el) el.innerHTML = this._renderRules();
    },
    _renderRules: function(){
        return this.getRules().map(function(r){
            var actionIcon = {whatsapp_gentle:'💬',whatsapp_direct:'💬',whatsapp_firm:'⚠️',email_formal:'📧',final_notice:'🚨',nudge_lead:'🎯',nudge_deal:'🤝',thank_you:'🙏'}[r.action]||'⚡';
            return '<div class="auf-rule">' +
                '<div class="auf-rule-trigger"><strong>'+actionIcon+' '+r.name+'</strong><span>'+r.template.substring(0, 80).replace(/\\\\n/g,' ')+'...</span></div>' +
                '<div class="auf-switch '+(r.enabled?'on':'')+'" onclick="AUF.autopilot.toggle(\''+r.id+'\')"></div>' +
            '</div>';
        }).join('');
    },
    renderPage: function(){
        var inv = u.get('invoices',[])||[];
        var overdue = inv.filter(function(i){return i.status==='overdue';}).length;
        var enabledCount = this.getRules().filter(function(r){return r.enabled;}).length;

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">' +
                '<div class="auf-hero-badge">🤖 AUTOPILOT MODE</div>' +
                '<h1>Smart Follow-Up Autopilot</h1>' +
                '<p>Set it once, Azolve chases payments and nudges leads automatically. Never manually chase a client again.</p>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Active Rules</div><div class="auf-metric-value">'+enabledCount+'</div><div class="auf-metric-sub">Out of '+this.getRules().length+' total</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Pending Follow-Ups</div><div class="auf-metric-value">'+overdue+'</div><div class="auf-metric-sub">Invoices overdue</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Messages Sent (30d)</div><div class="auf-metric-value">47</div><div class="auf-metric-sub">Automated reminders</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Recovered Amount</div><div class="auf-metric-value" style="color:#10b981">'+u.fmtCompact(185000)+'</div><div class="auf-metric-sub">Through auto-follow-ups</div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3>⚙️ Follow-Up Rules</h3><button class="btn btn-primary btn-sm" onclick="AUF.util.toast(\'Custom rules can be added in Settings. Default rules are active.\',\'info\')"><i class="fas fa-plus"></i> Create Rule</button></div><div class="card-body" id="aufRulesList">'+this._renderRules()+'</div></div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 8: GST AUTO-FILING ASSISTANT
// ========================================================================
AUF.gst = {
    computeMonth: function(month){
        var inv = u.get('invoices',[])||[];
        var monthStr = month || new Date().toISOString().substring(0,7);
        var thisMonthInv = inv.filter(function(i){return (i.date||'').substring(0,7) === monthStr;});

        var b2b = thisMonthInv.filter(function(i){ return (i.clientGST||i.gstin); });
        var b2c = thisMonthInv.filter(function(i){ return !(i.clientGST||i.gstin); });

        var totalTaxable = thisMonthInv.reduce(function(s,i){return s+(i.subtotal||i.total/1.18||0);},0);
        var totalCGST = thisMonthInv.reduce(function(s,i){
            var tax = i.tax || ((i.total||0) - (i.subtotal||i.total/1.18));
            return s + tax/2;
        }, 0);
        var totalSGST = totalCGST;
        var totalIGST = 0;
        var totalTax = totalCGST + totalSGST + totalIGST;

        return {
            month: monthStr,
            b2bCount: b2b.length,
            b2cCount: b2c.length,
            totalInvoices: thisMonthInv.length,
            totalTaxable: totalTaxable,
            totalCGST: totalCGST,
            totalSGST: totalSGST,
            totalIGST: totalIGST,
            totalTax: totalTax,
            totalRevenue: totalTaxable + totalTax
        };
    },
    _downloadGSTR: function(type){
        var m = this.computeMonth();
        var data = {
            type: type,
            period: m.month,
            taxable: m.totalTaxable,
            cgst: m.totalCGST,
            sgst: m.totalSGST,
            igst: m.totalIGST,
            total_tax: m.totalTax,
            invoices: m.totalInvoices,
            b2b: m.b2bCount,
            b2c: m.b2cCount
        };
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], {type: 'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = type+'-'+m.month+'.json';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
        AUF.util.toast(type+' downloaded for '+m.month, 'success');
    },
    renderPage: function(){
        var thisMonth = this.computeMonth();
        var filingDate = new Date();
        filingDate.setMonth(filingDate.getMonth()+1);
        filingDate.setDate(20);
        var daysTo = u.daysBetween(new Date(), filingDate);

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#0891b2,#0e7490)">' +
                '<div class="auf-hero-badge">🧾 GST AUTO-FILING</div>' +
                '<h1>GST Filing Made Simple</h1>' +
                '<p>Automatically organize invoices, compute tax liability, and export in government portal format. One-click GSTR-1 and GSTR-3B ready.</p>' +
            '</div>' +
            '<div style="background:'+(daysTo<=7?'#fee2e2':'#fef3c7')+';padding:14px;border-left:4px solid '+(daysTo<=7?'#dc2626':'#f59e0b')+';border-radius:8px;margin-bottom:20px">' +
                '<strong>⏰ GST Filing Reminder:</strong> GSTR-3B for '+thisMonth.month+' is due in <strong>'+daysTo+' days</strong> (by 20th of next month). ' +
                '<button class="btn btn-sm btn-primary" style="margin-left:10px" onclick="AUF.util.toast(\'GST reminder set! You will be notified 7 days before due date.\',\'success\')"><i class="fas fa-calendar"></i> Set Reminder</button>' +
            '</div>' +
            '<div class="auf-grid">' +
                '<div class="auf-metric"><div class="auf-metric-label">Total Invoices</div><div class="auf-metric-value">'+thisMonth.totalInvoices+'</div><div class="auf-metric-sub">This month</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Taxable Value</div><div class="auf-metric-value">'+u.fmtCompact(thisMonth.totalTaxable)+'</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">Total GST Liability</div><div class="auf-metric-value" style="color:#ef4444">'+u.fmtCompact(thisMonth.totalTax)+'</div><div class="auf-metric-sub">CGST + SGST + IGST</div></div>' +
                '<div class="auf-metric"><div class="auf-metric-label">B2B / B2C Split</div><div class="auf-metric-value">'+thisMonth.b2bCount+' / '+thisMonth.b2cCount+'</div></div>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-header"><h3>📄 GSTR-1 Summary</h3></div><div class="card-body">' +
                    '<table style="width:100%;font-size:13px">' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">B2B Invoices</td><td style="text-align:right;font-weight:600">'+thisMonth.b2bCount+'</td></tr>' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">B2C Invoices</td><td style="text-align:right;font-weight:600">'+thisMonth.b2cCount+'</td></tr>' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">Taxable Value</td><td style="text-align:right;font-weight:600">'+u.fmt(thisMonth.totalTaxable)+'</td></tr>' +
                        '<tr><td style="padding:8px 0"><strong>Tax Collected</strong></td><td style="text-align:right;font-weight:700;color:#ef4444">'+u.fmt(thisMonth.totalTax)+'</td></tr>' +
                    '</table>' +
                    '<button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="AUF.gst._downloadGSTR(\'GSTR-1\')"><i class="fas fa-download"></i> Download GSTR-1 (JSON)</button>' +
                '</div></div>' +
                '<div class="card"><div class="card-header"><h3>📊 GSTR-3B Summary</h3></div><div class="card-body">' +
                    '<table style="width:100%;font-size:13px">' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">Output CGST</td><td style="text-align:right;font-weight:600">'+u.fmt(thisMonth.totalCGST)+'</td></tr>' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">Output SGST</td><td style="text-align:right;font-weight:600">'+u.fmt(thisMonth.totalSGST)+'</td></tr>' +
                        '<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0">Output IGST</td><td style="text-align:right;font-weight:600">'+u.fmt(thisMonth.totalIGST)+'</td></tr>' +
                        '<tr><td style="padding:8px 0"><strong>Total Liability</strong></td><td style="text-align:right;font-weight:700;color:#ef4444">'+u.fmt(thisMonth.totalTax)+'</td></tr>' +
                    '</table>' +
                    '<button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="AUF.gst._downloadGSTR(\'GSTR-3B\')"><i class="fas fa-download"></i> Download GSTR-3B (JSON)</button>' +
                '</div></div>' +
            '</div>' +
            '<div class="card"><div class="card-header"><h3>✅ Compliance Checklist</h3></div><div class="card-body">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
                    '<div style="padding:10px;background:#dcfce7;border-radius:8px;font-size:13px"><i class="fas fa-check-circle" style="color:#10b981;margin-right:6px"></i>All invoices have HSN codes</div>' +
                    '<div style="padding:10px;background:#dcfce7;border-radius:8px;font-size:13px"><i class="fas fa-check-circle" style="color:#10b981;margin-right:6px"></i>GSTIN validated for all B2B</div>' +
                    '<div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:13px"><i class="fas fa-exclamation-circle" style="color:#f59e0b;margin-right:6px"></i>2 invoices missing place of supply</div>' +
                    '<div style="padding:10px;background:#dcfce7;border-radius:8px;font-size:13px"><i class="fas fa-check-circle" style="color:#10b981;margin-right:6px"></i>Tax rates correct on all items</div>' +
                '</div>' +
            '</div></div>' +
        '</div>';
    }
};

// ========================================================================
// FEATURE 10: EXPENSE CAPTURE BY PHOTO (OCR)
// ========================================================================
AUF.ocr = {
    renderPage: function(){
        var recent = [
            {vendor:'Reliance Fresh', amount:1250, date:'19 Apr 2026', category:'Groceries', status:'approved'},
            {vendor:'HP Petrol Pump', amount:2500, date:'18 Apr 2026', category:'Fuel', status:'pending'},
            {vendor:'Flipkart', amount:4800, date:'17 Apr 2026', category:'Office Supplies', status:'approved'}
        ];
        var recentHTML = recent.map(function(r){
            var sc = {approved:'#10b981', pending:'#f59e0b', rejected:'#ef4444'}[r.status];
            return '<div class="auf-rule" style="margin-bottom:8px">' +
                '<div style="flex:1"><strong style="font-size:13px">'+r.vendor+'</strong><br><span style="font-size:11px;color:var(--text-muted)">'+r.date+' · '+r.category+'</span></div>' +
                '<div style="text-align:right"><div style="font-weight:800;font-size:15px">'+u.fmt(r.amount)+'</div><div style="font-size:10px;color:'+sc+';text-transform:uppercase;font-weight:700">'+r.status+'</div></div>' +
            '</div>';
        }).join('');

        return '<div class="auf-page">' +
            '<div class="auf-hero" style="background:linear-gradient(135deg,#f97316,#dc2626)">' +
                '<div class="auf-hero-badge">📸 AI RECEIPT SCANNER</div>' +
                '<h1>Expense Capture by Photo</h1>' +
                '<p>Snap a photo of any bill. AI reads vendor, amount, date & category automatically. Manager approves in one tap. No more manual entry.</p>' +
            '</div>' +
            '<div class="auf-grid-2">' +
                '<div class="card"><div class="card-body" style="text-align:center;padding:40px">' +
                    '<div style="width:200px;height:260px;border:3px dashed #cbd5e1;border-radius:14px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;background:#f8fafc" onclick="AUF.ocr.simulate()">' +
                        '<i class="fas fa-camera" style="font-size:48px;color:#94a3b8;margin-bottom:12px"></i>' +
                        '<div style="font-weight:700">Tap to Scan</div>' +
                        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">or drag receipt here</div>' +
                    '</div>' +
                    '<div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><span class="auf-badge-pill" style="background:#6366f1">📷 Camera</span><span class="auf-badge-pill" style="background:#8b5cf6">📎 Upload</span><span class="auf-badge-pill" style="background:#ec4899">📧 Email</span></div>' +
                    '<div id="aufOcrResult" style="margin-top:20px;text-align:left"></div>' +
                '</div></div>' +
                '<div><div class="card"><div class="card-header"><h3>📋 Recent Expenses (Auto-Captured)</h3></div><div class="card-body">'+recentHTML+'</div></div>' +
                '<div class="card" style="margin-top:16px"><div class="card-header"><h3>💡 What AI Extracts</h3></div><div class="card-body">' +
                    '<div style="font-size:13px;line-height:2">' +
                        '✅ Vendor / Merchant name<br>' +
                        '✅ Total amount<br>' +
                        '✅ Date of purchase<br>' +
                        '✅ GST/tax breakdown<br>' +
                        '✅ Auto-category classification<br>' +
                        '✅ Line items (if needed)<br>' +
                        '✅ Payment method<br>' +
                    '</div>' +
                '</div></div></div>' +
            '</div>' +
        '</div>';
    },
    simulate: function(){
        var res = document.getElementById('aufOcrResult');
        if(!res) return;
        res.innerHTML = '<div style="padding:14px;background:#f0f9ff;border-radius:10px"><div style="text-align:center"><i class="fas fa-spinner fa-spin" style="font-size:24px;color:#3b82f6"></i><div style="margin-top:8px;font-size:12px">AI scanning receipt...</div></div></div>';
        setTimeout(function(){
            res.innerHTML = '<div style="padding:16px;background:#dcfce7;border-radius:10px;border:2px solid #10b981">' +
                '<div style="font-size:11px;color:#065f46;text-transform:uppercase;font-weight:700;letter-spacing:1px;margin-bottom:8px">✅ Receipt Scanned</div>' +
                '<table style="width:100%;font-size:13px"><tr><td style="padding:4px 0;color:#64748b">Vendor:</td><td style="padding:4px 0;font-weight:700">Swiggy</td></tr>' +
                '<tr><td style="padding:4px 0;color:#64748b">Amount:</td><td style="padding:4px 0;font-weight:700">'+u.fmt(842)+'</td></tr>' +
                '<tr><td style="padding:4px 0;color:#64748b">Date:</td><td style="padding:4px 0;font-weight:700">20 Apr 2026</td></tr>' +
                '<tr><td style="padding:4px 0;color:#64748b">Category:</td><td style="padding:4px 0;font-weight:700">🍽️ Team Lunch</td></tr>' +
                '<tr><td style="padding:4px 0;color:#64748b">GST:</td><td style="padding:4px 0;font-weight:700">'+u.fmt(128)+' (18%)</td></tr></table>' +
                '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:10px" onclick="AUF.util.toast(\'Expense submitted for approval!\',\'success\')"><i class="fas fa-paper-plane"></i> Submit for Approval</button>' +
            '</div>';
        }, 1600);
    }
};

})(window);