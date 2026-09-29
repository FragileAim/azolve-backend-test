// Azolve Design Studio — full in-app design editor (Canva-style), no external API/keys.
(function () {
    if (typeof document === 'undefined') return;

    const STORE_KEY = 'azolve_design_studio_v2';
    const MAX_LIVE_DIM = 1400;   // backing-store cap while editing (perf)
    const uid = () => 'o' + Math.random().toString(36).slice(2, 10);
    const FONTS = ['Poppins', 'Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana', 'Impact'];

    // ---------------------------------------------------------------
    // Vector shape library (normalized 0..100 viewBox paths)
    // ---------------------------------------------------------------
    const SHAPES = {
        star: 'M50 2 L61 37 L98 37 L68 59 L79 95 L50 73 L21 95 L32 59 L2 37 L39 37 Z',
        heart: 'M50,30 C50,10 20,10 20,35 C20,55 50,75 50,90 C50,75 80,55 80,35 C80,10 50,10 50,30 Z',
        triangle: 'M50 5 L95 95 L5 95 Z',
        hexagon: 'M25 5 L75 5 L95 50 L75 95 L25 95 L5 50 Z',
        arrow: 'M10 35 L60 35 L60 15 L95 50 L60 85 L60 65 L10 65 Z',
        arrowUp: 'M35 95 L35 40 L15 40 L50 5 L85 40 L65 40 L65 95 Z',
        speech: 'M5 10 H95 V70 H35 L15 92 V70 H5 Z',
        diamond: 'M50 2 L98 50 L50 98 L2 50 Z',
        plus: 'M35 5 H65 V35 H95 V65 H65 V95 H35 V65 H5 V35 H35 Z',
        circleOutline: 'M50 2 A48 48 0 1 1 49.9 2 Z',
        pentagon: 'M50 3 L95 37 L78 92 L22 92 L5 37 Z',
        check: 'M10 55 L35 80 L92 15 L80 5 L35 58 L20 43 Z',
        cloud: 'M25 75 C10 75 2 63 2 52 C2 41 10 33 20 33 C22 18 36 8 50 8 C65 8 78 18 80 33 C90 33 98 42 98 53 C98 65 88 75 75 75 Z',
        bolt: 'M55 2 L20 55 L45 55 L40 98 L82 40 L55 40 Z',
        tag: 'M5 45 L45 5 H90 V50 L50 90 Z M68 20 A6 6 0 1 1 68 32 A6 6 0 1 1 68 20 Z',
        pin: 'M50 2 C25 2 8 22 8 45 C8 70 50 98 50 98 C50 98 92 70 92 45 C92 22 75 2 50 2 Z M50 30 A15 15 0 1 1 50 60 A15 15 0 1 1 50 30 Z',
        cross: 'M5 5 L45 45 L5 85 L15 95 L50 60 L85 95 L95 85 L60 45 L95 15 L85 5 L50 40 L15 5 Z',
        sun: 'M50 3 L58 22 L72 8 L70 28 L92 22 L78 38 L98 44 L78 52 L96 64 L75 63 L84 82 L67 70 L64 92 L52 75 L42 94 L36 74 L18 88 L20 66 L2 72 L14 55 L-2 45 L18 40 L4 24 L26 30 L28 8 L42 24 Z',
        moon: 'M65 5 C40 5 20 25 20 50 C20 75 40 95 65 95 C50 85 40 68 40 50 C40 32 50 15 65 5 Z',
    };
    const SHAPE_ICONS = {
        star: 'fas fa-star', heart: 'fas fa-heart', triangle: 'fas fa-play',
        hexagon: 'fas fa-draw-polygon', arrow: 'fas fa-long-arrow-alt-right', arrowUp: 'fas fa-long-arrow-alt-up',
        speech: 'fas fa-comment', diamond: 'fas fa-gem', plus: 'fas fa-plus',
        circleOutline: 'far fa-circle', pentagon: 'fas fa-shapes', check: 'fas fa-check',
        cloud: 'fas fa-cloud', bolt: 'fas fa-bolt', tag: 'fas fa-tag', pin: 'fas fa-map-marker-alt',
        cross: 'fas fa-times', sun: 'fas fa-sun', moon: 'fas fa-moon',
    };

    // ---------------------------------------------------------------
    // Blank-size presets
    // ---------------------------------------------------------------
    const SIZE_PRESETS = [
        { key: 'ig_post', label: 'Instagram Post', icon: 'fab fa-instagram', w: 1080, h: 1080 },
        { key: 'ig_story', label: 'Instagram Story', icon: 'fab fa-instagram', w: 1080, h: 1920 },
        { key: 'fb_post', label: 'Facebook Post', icon: 'fab fa-facebook', w: 1200, h: 630 },
        { key: 'yt_thumb', label: 'YouTube Thumbnail', icon: 'fab fa-youtube', w: 1280, h: 720 },
        { key: 'presentation', label: 'Presentation (16:9)', icon: 'fas fa-desktop', w: 1600, h: 900 },
        { key: 'doc', label: 'Document (A4)', icon: 'fas fa-file-alt', w: 1240, h: 1600 },
        { key: 'poster', label: 'Poster', icon: 'fas fa-image', w: 1200, h: 1600 },
        { key: 'custom', label: 'Custom size…', icon: 'fas fa-ruler-combined', w: 0, h: 0 },
    ];

    // ---------------------------------------------------------------
    // Ready-made templates — each returns a page (width,height,bg,objects)
    // ---------------------------------------------------------------
    function T_text(x, y, w, h, text, fontSize, color, opts) {
        return Object.assign({ type: 'text', x, y, w, h, text, fontSize, fontFamily: 'Poppins', color, bold: true, align: 'left', rotation: 0, opacity: 1 }, opts || {});
    }
    function T_rect(x, y, w, h, fill, opts) {
        return Object.assign({ type: 'rect', x, y, w, h, fill, stroke: 'transparent', radius: 0, rotation: 0, opacity: 1 }, opts || {});
    }
    function T_ellipse(x, y, w, h, fill, opts) {
        return Object.assign({ type: 'ellipse', x, y, w, h, fill, stroke: 'transparent', rotation: 0, opacity: 1 }, opts || {});
    }
    function T_shape(key, x, y, w, h, fill, opts) {
        return Object.assign({ type: 'shape', shapeKey: key, x, y, w, h, fill, rotation: 0, opacity: 1 }, opts || {});
    }

    const TEMPLATES = [
        {
            id: 'sale_promo', name: 'Sale Promo', cat: 'marketing', w: 1080, h: 1080, thumbColor: '#e63950',
            build: () => ({ bg: { type: 'solid', color: '#e63950' }, objects: [
                T_ellipse(-150, -150, 500, 500, 'rgba(255,255,255,.08)'),
                T_ellipse(700, 700, 550, 550, 'rgba(255,255,255,.08)'),
                T_text(90, 330, 900, 220, 'BIG SALE', 150, '#ffffff', { align: 'center', fontFamily: 'Impact' }),
                T_text(90, 540, 900, 100, 'Up to 50% off everything', 44, '#ffffff', { align: 'center', bold: false }),
                T_rect(390, 700, 300, 90, '#ffffff', { radius: 45 }),
                T_text(390, 722, 300, 50, 'SHOP NOW', 28, '#e63950', { align: 'center' }),
            ] }),
        },
        {
            id: 'story_announce', name: 'Story Announcement', cat: 'social', w: 1080, h: 1920, thumbColor: '#714B67',
            build: () => ({ bg: { type: 'linear', color: '#714B67', color2: '#3a2536', angle: 135 }, objects: [
                T_text(80, 700, 920, 260, "We're\nHiring!", 130, '#ffffff', { fontFamily: 'Impact' }),
                T_text(80, 980, 920, 90, 'Join our growing team', 40, '#f0e6ee', { bold: false }),
                T_rect(80, 1600, 500, 100, '#00c4cc', { radius: 50 }),
                T_text(80, 1626, 500, 50, 'APPLY TODAY', 30, '#0c1c1c', { align: 'center' }),
            ] }),
        },
        {
            id: 'event_cover', name: 'Event Cover', cat: 'events', w: 1200, h: 630, thumbColor: '#1a1a2e',
            build: () => ({ bg: { type: 'solid', color: '#1a1a2e' }, objects: [
                T_shape('star', 950, 60, 90, 90, '#f4c542'),
                T_shape('star', 1050, 200, 50, 50, '#f4c542', { opacity: .7 }),
                T_text(70, 190, 900, 140, 'Annual Conference 2026', 68, '#ffffff'),
                T_text(70, 340, 900, 60, 'Oct 12 · Grand Hall · 9:00 AM', 30, '#c9c9e0', { bold: false }),
            ] }),
        },
        {
            id: 'yt_bold', name: 'Bold Thumbnail', cat: 'social', w: 1280, h: 720, thumbColor: '#ff3b3b',
            build: () => ({ bg: { type: 'solid', color: '#111111' }, objects: [
                T_rect(0, 500, 1280, 220, '#ff3b3b'),
                T_text(60, 80, 1160, 300, 'YOU WON\'T\nBELIEVE THIS', 92, '#ffffff', { fontFamily: 'Impact' }),
                T_text(60, 545, 1160, 130, 'WATCH NOW', 70, '#ffffff', { align: 'center', fontFamily: 'Impact' }),
            ] }),
        },
        {
            id: 'title_slide', name: 'Title Slide', cat: 'presentation', w: 1600, h: 900, thumbColor: '#0b3d3d',
            build: () => ({ bg: { type: 'solid', color: '#ffffff' }, objects: [
                T_rect(0, 0, 550, 900, '#0b3d3d'),
                T_shape('hexagon', 150, 350, 250, 250, 'rgba(255,255,255,.12)'),
                T_text(620, 340, 900, 130, 'Project Kickoff', 70, '#1a1a1a'),
                T_text(620, 470, 900, 60, 'Presented by the Azolve team', 28, '#666', { bold: false }),
            ] }),
        },
        {
            id: 'quote_card', name: 'Quote Card', cat: 'quote', w: 1080, h: 1080, thumbColor: '#fff7e6',
            build: () => ({ bg: { type: 'solid', color: '#fff7e6' }, objects: [
                T_text(120, 130, 200, 200, '“', 160, '#e0a13e', { fontFamily: 'Georgia' }),
                T_text(120, 380, 840, 300, 'Great things are done by a series of small things brought together.', 48, '#3a2c1a', { fontFamily: 'Georgia', bold: false }),
                T_rect(120, 760, 90, 6, '#e0a13e'),
                T_text(120, 800, 600, 50, 'Vincent Van Gogh', 28, '#3a2c1a', { bold: false }),
            ] }),
        },
        {
            id: 'new_product', name: 'New Product Launch', cat: 'marketing', w: 1080, h: 1080, thumbColor: '#1a1a2e',
            build: () => ({ bg: { type: 'linear', color: '#1a1a2e', color2: '#3d1a4a', angle: 120 }, objects: [
                T_shape('bolt', 800, 80, 160, 160, '#ffd23f', { opacity: .85 }),
                T_text(90, 380, 900, 200, 'NEW ARRIVAL', 96, '#ffffff', { fontFamily: 'Impact', align: 'center' }),
                T_text(90, 570, 900, 70, 'Available now — limited stock', 32, '#c9c2d6', { bold: false, align: 'center' }),
                T_rect(390, 700, 300, 90, '#ffd23f', { radius: 45 }),
                T_text(390, 722, 300, 50, 'ORDER NOW', 26, '#1a1a2e', { align: 'center' }),
            ] }),
        },
        {
            id: 'webinar', name: 'Webinar Invite', cat: 'events', w: 1200, h: 630, thumbColor: '#0e5e5e',
            build: () => ({ bg: { type: 'solid', color: '#0e5e5e' }, objects: [
                T_ellipse(920, -60, 300, 300, 'rgba(255,255,255,.08)'),
                T_shape('speech', 60, 60, 130, 130, 'rgba(255,255,255,.15)'),
                T_text(70, 220, 900, 130, 'Free Webinar: Growth Tactics', 54, '#ffffff'),
                T_text(70, 360, 900, 50, 'Thursday · 3PM EST · Register free', 28, '#a8e0d8', { bold: false }),
            ] }),
        },
        {
            id: 'business_card', name: 'Business Card', cat: 'business', w: 1050, h: 600, thumbColor: '#ffffff',
            build: () => ({ bg: { type: 'solid', color: '#ffffff' }, objects: [
                T_rect(0, 0, 1050, 12, '#714B67'),
                T_text(60, 220, 700, 70, 'Jordan Rivera', 44, '#1a1a1a'),
                T_text(60, 300, 700, 40, 'Marketing Director', 22, '#714B67', { bold: false }),
                T_rect(60, 380, 60, 3, '#714B67'),
                T_text(60, 410, 700, 40, 'jordan@company.com  ·  +1 555 0100', 18, '#555', { bold: false }),
            ] }),
        },
        {
            id: 'infographic', name: 'Simple Infographic', cat: 'business', w: 1080, h: 1400, thumbColor: '#f4f2f5',
            build: () => ({ bg: { type: 'solid', color: '#f9f8f9' }, objects: [
                T_text(90, 60, 900, 90, 'By The Numbers', 52, '#1a1a1a'),
                T_ellipse(90, 220, 160, 160, '#714B67'),
                T_text(90, 268, 160, 60, '72%', 40, '#ffffff', { align: 'center' }),
                T_text(280, 250, 700, 100, 'of customers prefer\nfast response times', 26, '#333', { bold: false }),
                T_ellipse(90, 440, 160, 160, '#00c4cc'),
                T_text(90, 488, 160, 60, '3.5x', 36, '#ffffff', { align: 'center' }),
                T_text(280, 470, 700, 100, 'higher retention with\nregular check-ins', 26, '#333', { bold: false }),
                T_ellipse(90, 660, 160, 160, '#ffd23f'),
                T_text(90, 708, 160, 60, '48h', 36, '#1a1a2e', { align: 'center' }),
                T_text(280, 690, 700, 100, 'average time to\nfirst resolution', 26, '#333', { bold: false }),
            ] }),
        },
        {
            id: 'class_certificate', name: 'Certificate', cat: 'education', w: 1600, h: 1131, thumbColor: '#fffaf0',
            build: () => ({ bg: { type: 'solid', color: '#fffaf0' }, objects: [
                T_rect(40, 40, 1520, 1051, 'transparent', { stroke: '#c9a34e' }),
                T_shape('pentagon', 750, 90, 100, 100, '#c9a34e'),
                T_text(200, 240, 1200, 100, 'Certificate of Achievement', 60, '#3a2c1a', { align: 'center', fontFamily: 'Georgia' }),
                T_text(200, 420, 1200, 60, 'This certifies that', 24, '#7a6a55', { align: 'center', bold: false }),
                T_text(200, 480, 1200, 90, 'Taylor Morgan', 52, '#1a1a1a', { align: 'center', fontFamily: 'Georgia' }),
                T_text(200, 620, 1200, 60, 'has successfully completed the course', 24, '#7a6a55', { align: 'center', bold: false }),
            ] }),
        },
        {
            id: 'agenda_slide', name: 'Agenda Slide', cat: 'presentation', w: 1600, h: 900, thumbColor: '#ffffff',
            build: () => ({ bg: { type: 'solid', color: '#ffffff' }, objects: [
                T_text(100, 80, 900, 100, "Today's Agenda", 56, '#1a1a1a'),
                T_rect(100, 220, 1400, 2, '#e0dde2'),
                T_text(100, 260, 60, 50, '01', 32, '#714B67'),
                T_text(180, 260, 1200, 50, 'Project overview', 28, '#333', { bold: false }),
                T_text(100, 340, 60, 50, '02', 32, '#714B67'),
                T_text(180, 340, 1200, 50, 'Timeline & milestones', 28, '#333', { bold: false }),
                T_text(100, 420, 60, 50, '03', 32, '#714B67'),
                T_text(180, 420, 1200, 50, 'Budget review', 28, '#333', { bold: false }),
                T_text(100, 500, 60, 50, '04', 32, '#714B67'),
                T_text(180, 500, 1200, 50, 'Q&A', 28, '#333', { bold: false }),
            ] }),
        },
        {
            id: 'birthday_card', name: 'Birthday Card', cat: 'social', w: 1080, h: 1080, thumbColor: '#ff6b9d',
            build: () => ({ bg: { type: 'linear', color: '#ff6b9d', color2: '#ffa06b', angle: 45 }, objects: [
                T_shape('star', 100, 100, 70, 70, 'rgba(255,255,255,.5)'),
                T_shape('star', 880, 850, 90, 90, 'rgba(255,255,255,.4)'),
                T_shape('heart', 800, 120, 110, 110, 'rgba(255,255,255,.5)'),
                T_text(90, 420, 900, 200, 'Happy Birthday!', 90, '#ffffff', { align: 'center', fontFamily: 'Impact' }),
                T_text(90, 600, 900, 60, 'Wishing you a wonderful day', 30, '#fff0f4', { align: 'center', bold: false }),
            ] }),
        },
    ];

    // ---------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------
    function loadAll() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
        catch { return []; }
    }
    function saveAll(list) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; }
        catch (e) {
            console.error('Design Studio: storage failed', e);
            toast('Could not save — browser storage is full. Delete an old design or a large image.', true);
            return false;
        }
    }
    function toast(msg, isError) {
        let t = document.getElementById('dsToast');
        if (!t) { t = document.createElement('div'); t.id = 'dsToast'; t.className = 'ds-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.className = 'ds-toast show' + (isError ? ' err' : '');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2600);
    }
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function timeAgo(ts) {
        if (!ts) return '';
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }

    // ---------------------------------------------------------------
    // Minimal PDF writer (embeds each page as a JPEG image — no deps)
    // ---------------------------------------------------------------
    function strToBytes(s) { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; return b; }
    function base64ToBytes(b64) { const bin = atob(b64); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return b; }

    function buildPdf(pages) {
        const chunks = []; let offset = 0; const offsets = {};
        function push(x) { const b = typeof x === 'string' ? strToBytes(x) : x; chunks.push(b); offset += b.length; }
        push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

        let objNum = 1;
        const catalogNum = objNum++, pagesNum = objNum++;
        const pageNums = [], contentNums = [], imageNums = [];
        for (let i = 0; i < pages.length; i++) { pageNums.push(objNum++); contentNums.push(objNum++); imageNums.push(objNum++); }

        offsets[catalogNum] = offset;
        push(`${catalogNum} 0 obj\n<< /Type /Catalog /Pages ${pagesNum} 0 R >>\nendobj\n`);

        offsets[pagesNum] = offset;
        push(`${pagesNum} 0 obj\n<< /Type /Pages /Kids [${pageNums.map(n => n + ' 0 R').join(' ')}] /Count ${pages.length} >>\nendobj\n`);

        for (let i = 0; i < pages.length; i++) {
            const { dataUrl, w, h } = pages[i];
            const ptW = Math.round(w / 2), ptH = Math.round(h / 2);

            offsets[pageNums[i]] = offset;
            push(`${pageNums[i]} 0 obj\n<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 ${imageNums[i]} 0 R >> >> /Contents ${contentNums[i]} 0 R >>\nendobj\n`);

            const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
            offsets[contentNums[i]] = offset;
            push(`${contentNums[i]} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

            const imgBytes = base64ToBytes(dataUrl.split(',')[1]);
            offsets[imageNums[i]] = offset;
            push(`${imageNums[i]} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
            push(imgBytes);
            push('\nendstream\nendobj\n');
        }

        const xrefOffset = offset;
        let xref = `xref\n0 ${objNum}\n0000000000 65535 f \n`;
        for (let i = 1; i < objNum; i++) xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
        push(xref);
        push(`trailer\n<< /Size ${objNum} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

        const total = chunks.reduce((a, c) => a + c.length, 0);
        const out = new Uint8Array(total);
        let pos = 0; for (const c of chunks) { out.set(c, pos); pos += c.length; }
        return new Blob([out], { type: 'application/pdf' });
    }

    // ---------------------------------------------------------------
    // State
    // ---------------------------------------------------------------
    let designs = loadAll();
    let current = null;       // { id, name, pages:[...], updatedAt, thumbnail, uploads:[{src,name}] }
    let pageIdx = 0;
    let selectedIds = [];
    let history = [], historyIdx = -1;
    let dragState = null, marquee = null;
    let scale = 1, zoom = 1;
    let guideLines = [];
    let canvasEl, ctx;
    let stockQuery = '';
    let gridSnap = false;
    const GRID_SIZE = 20;
    let clipboard = [];
    const BRAND_KEY = 'azolve_design_studio_brandkit_v1';

    function pages() { return current.pages; }
    function pg() { return current.pages[pageIdx]; }
    function objById(id) { return pg().objects.find(o => o.id === id); }
    function selectedObjs() { return pg().objects.filter(o => selectedIds.includes(o.id)); }

    function deg2rad(d) { return d * Math.PI / 180; }

    // ---------------------------------------------------------------
    // DOM injection
    // ---------------------------------------------------------------
    function initDesignStudio() {
        const pageContent = document.querySelector('.page-content');
        if (!pageContent) return;
        if (document.getElementById('page-design-studio')) return;
        injectStyles();

        const section = document.createElement('div');
        section.className = 'page-section';
        section.id = 'page-design-studio';
        section.innerHTML = `
            <div class="ds-wrap" id="dsListView">
                <div class="page-header">
                    <div>
                        <h1 class="page-title">Design Studio</h1>
                        <p class="page-subtitle">Create graphics right inside Azolve — no external account needed</p>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-primary" id="dsNewBtn"><i class="fas fa-plus"></i> New Design</button>
                    </div>
                </div>
                <div id="dsGrid" class="ds-grid"></div>
            </div>

            <div class="ds-editor" id="dsEditorView" style="display:none;">
                <div class="ds-editor-topbar">
                    <button class="btn btn-outline btn-sm" id="dsBackBtn"><i class="fas fa-arrow-left"></i> Back</button>
                    <input type="text" id="dsNameInput" class="ds-name-input" value="Untitled design">
                    <div class="ds-zoom">
                        <button id="dsZoomOut"><i class="fas fa-minus"></i></button>
                        <span id="dsZoomLabel">100%</span>
                        <button id="dsZoomIn"><i class="fas fa-plus"></i></button>
                        <button id="dsZoomFit" title="Fit"><i class="fas fa-compress"></i></button>
                    </div>
                    <div class="ds-topbar-actions">
                        <button class="btn btn-outline btn-sm" id="dsGridBtn" title="Snap to grid"><i class="fas fa-border-all"></i></button>
                        <button class="btn btn-outline btn-sm" id="dsResizeBtn" title="Resize to another platform"><i class="fas fa-expand-arrows-alt"></i> Resize</button>
                        <button class="btn btn-outline btn-sm" id="dsUndoBtn" title="Undo"><i class="fas fa-undo"></i></button>
                        <button class="btn btn-outline btn-sm" id="dsRedoBtn" title="Redo"><i class="fas fa-redo"></i></button>
                        <div class="ds-export-wrap">
                            <button class="btn btn-outline btn-sm" id="dsExportBtn"><i class="fas fa-download"></i> Export</button>
                            <div class="ds-export-menu" id="dsExportMenu">
                                <div data-fmt="png">PNG (this page)</div>
                                <div data-fmt="jpg">JPG (this page)</div>
                                <div data-fmt="pdf">PDF (all pages)</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" id="dsSaveBtn"><i class="fas fa-save"></i> Save</button>
                    </div>
                </div>

                <div class="ds-editor-body">
                    <div class="ds-rail">
                        <button class="ds-rail-tab active" data-tab="elements" title="Elements"><i class="fas fa-shapes"></i><span>Elements</span></button>
                        <button class="ds-rail-tab" data-tab="text" title="Text"><i class="fas fa-font"></i><span>Text</span></button>
                        <button class="ds-rail-tab" data-tab="uploads" title="Uploads"><i class="fas fa-cloud-upload-alt"></i><span>Uploads</span></button>
                        <button class="ds-rail-tab" data-tab="photos" title="Photos"><i class="fas fa-image"></i><span>Photos</span></button>
                        <button class="ds-rail-tab" data-tab="brand" title="Brand Kit"><i class="fas fa-swatchbook"></i><span>Brand</span></button>
                        <button class="ds-rail-tab" data-tab="layers" title="Layers"><i class="fas fa-layer-group"></i><span>Layers</span></button>
                    </div>
                    <div class="ds-side-panel" id="dsSidePanel"></div>

                    <div class="ds-center">
                        <div class="ds-selbar" id="dsSelBar" style="display:none;">
                            <button data-act="dup" title="Duplicate"><i class="fas fa-clone"></i></button>
                            <button data-act="front" title="Bring to front"><i class="fas fa-arrow-up"></i></button>
                            <button data-act="back" title="Send to back"><i class="fas fa-arrow-down"></i></button>
                            <div class="ds-selbar-sep"></div>
                            <button data-act="align-left" title="Align left"><i class="fas fa-align-left"></i></button>
                            <button data-act="align-hcenter" title="Align center"><i class="fas fa-align-center"></i></button>
                            <button data-act="align-right" title="Align right"><i class="fas fa-align-right"></i></button>
                            <button data-act="align-top" title="Align top"><i class="fas fa-border-style"></i></button>
                            <button data-act="align-vcenter" title="Align middle"><i class="fas fa-grip-lines"></i></button>
                            <button data-act="align-bottom" title="Align bottom"><i class="fas fa-border-style" style="transform:rotate(180deg)"></i></button>
                            <div class="ds-selbar-sep"></div>
                            <button data-act="group" title="Group"><i class="fas fa-object-group"></i></button>
                            <button data-act="ungroup" title="Ungroup"><i class="fas fa-object-ungroup"></i></button>
                            <div class="ds-selbar-sep"></div>
                            <button data-act="delete" class="ds-danger" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="ds-canvas-area" id="dsCanvasArea">
                            <canvas id="dsCanvas"></canvas>
                        </div>
                        <div class="ds-pages-strip" id="dsPagesStrip"></div>
                    </div>

                    <div class="ds-props" id="dsProps"></div>
                </div>
            </div>
        `;
        pageContent.appendChild(section);
        canvasEl = section.querySelector('#dsCanvas');
        ctx = canvasEl.getContext('2d');
        bindGlobalEvents(section);
        renderGrid();
    }

    // ---------------------------------------------------------------
    // Event binding
    // ---------------------------------------------------------------
    function bindGlobalEvents(section) {
        section.querySelector('#dsNewBtn').addEventListener('click', openNewDesignModal);
        section.querySelector('#dsBackBtn').addEventListener('click', () => showList());
        section.querySelector('#dsSaveBtn').addEventListener('click', () => saveCurrentDesign(true));
        section.querySelector('#dsUndoBtn').addEventListener('click', undo);
        section.querySelector('#dsRedoBtn').addEventListener('click', redo);

        section.querySelector('#dsZoomIn').addEventListener('click', () => setZoom(zoom + 0.1));
        section.querySelector('#dsZoomOut').addEventListener('click', () => setZoom(zoom - 0.1));
        section.querySelector('#dsZoomFit').addEventListener('click', () => setZoom(1));

        section.querySelector('#dsExportBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            section.querySelector('#dsExportMenu').classList.toggle('open');
        });
        section.querySelectorAll('#dsExportMenu [data-fmt]').forEach(el => {
            el.addEventListener('click', () => { exportDesign(el.dataset.fmt); section.querySelector('#dsExportMenu').classList.remove('open'); });
        });
        document.addEventListener('click', () => section.querySelector('#dsExportMenu')?.classList.remove('open'));

        section.querySelectorAll('.ds-rail-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const isActive = tab.classList.contains('active');
                section.querySelectorAll('.ds-rail-tab').forEach(t => t.classList.remove('active'));
                const panel = section.querySelector('#dsSidePanel');
                if (isActive) { panel.classList.remove('open'); return; }
                tab.classList.add('active');
                panel.classList.add('open');
                renderSidePanel(tab.dataset.tab);
            });
        });

        section.querySelector('#dsSelBar').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (btn) selectionAction(btn.dataset.act);
        });

        section.querySelector('#dsGridBtn').addEventListener('click', (e) => {
            gridSnap = !gridSnap;
            e.currentTarget.classList.toggle('active', gridSnap);
            drawAll();
            toast('Snap to grid: ' + (gridSnap ? 'on' : 'off'));
        });
        section.querySelector('#dsResizeBtn').addEventListener('click', openResizeModal);

        canvasEl.addEventListener('mousedown', onCanvasDown);
        window.addEventListener('mousemove', onCanvasMove);
        window.addEventListener('mouseup', onCanvasUp);
        canvasEl.addEventListener('touchstart', onCanvasDown, { passive: false });
        window.addEventListener('touchmove', onCanvasMove, { passive: false });
        window.addEventListener('touchend', onCanvasUp);
        canvasEl.addEventListener('dblclick', onCanvasDblClick);

        window.addEventListener('keydown', (e) => {
            if (!current) return;
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) { e.preventDefault(); selectionAction('delete'); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedIds.length) { e.preventDefault(); selectionAction('dup'); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedIds.length) { e.preventDefault(); copySelection(); }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard.length) { e.preventDefault(); pasteClipboard(); }
            if (e.key === 'Escape') { selectedIds = []; drawAll(); renderProps(); updateSelBar(); }
            if (selectedIds.length && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                selectedObjs().forEach(o => { o.x += dx; o.y += dy; });
                drawAll();
                clearTimeout(window._dsNudgeHistTimer);
                window._dsNudgeHistTimer = setTimeout(pushHistory, 300);
            }
        });
        window.addEventListener('resize', () => { if (current) fitCanvas(); });
    }

    function copySelection() {
        clipboard = selectedObjs().map(o => { const c = JSON.parse(JSON.stringify(o)); if (o._img) c._img = o._img; return c; });
        toast(clipboard.length > 1 ? `${clipboard.length} objects copied` : 'Copied');
    }
    function pasteClipboard() {
        const newIds = [];
        clipboard.forEach(o => {
            const copy = JSON.parse(JSON.stringify(o));
            copy.id = uid(); copy.x += 24; copy.y += 24;
            if (o._img) copy._img = o._img;
            delete copy.groupId;
            pg().objects.push(copy); newIds.push(copy.id);
        });
        selectedIds = newIds;
        pushHistory(); drawAll(); renderProps(); updateSelBar();
        toast('Pasted');
    }

    // ---------------------------------------------------------------
    // List view
    // ---------------------------------------------------------------
    function renderGrid() {
        const grid = document.getElementById('dsGrid');
        if (!grid) return;
        designs = loadAll();
        if (!designs.length) {
            grid.innerHTML = `<div class="ds-empty">
                <i class="fas fa-palette"></i>
                <h3>No designs yet</h3>
                <p>Templates, shapes, photos, multi-page — all built in, no external account required.</p>
                <button class="btn btn-primary" onclick="document.getElementById('dsNewBtn').click()">Create your first design</button>
            </div>`;
            return;
        }
        grid.innerHTML = designs.slice().reverse().map(d => `
            <div class="ds-card" data-id="${d.id}">
                <div class="ds-card-thumb" style="background-image:url('${d.thumbnail || ''}')"></div>
                <div class="ds-card-body">
                    <div class="ds-card-name">${escapeHtml(d.name)}</div>
                    <div class="ds-card-meta">${(d.pages || [{}]).length} page${(d.pages || []).length === 1 ? '' : 's'} · ${timeAgo(d.updatedAt)}</div>
                </div>
                <div class="ds-card-actions">
                    <button class="btn btn-outline btn-sm" data-act="edit"><i class="fas fa-pen"></i> Edit</button>
                    <button class="btn btn-outline btn-sm" data-act="dup" title="Duplicate"><i class="fas fa-clone"></i></button>
                    <button class="btn btn-outline btn-sm" data-act="del" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
        grid.querySelectorAll('.ds-card').forEach(card => {
            const id = card.dataset.id;
            card.querySelector('[data-act="edit"]').addEventListener('click', () => editDesign(id));
            card.querySelector('.ds-card-thumb').addEventListener('click', () => editDesign(id));
            card.querySelector('[data-act="dup"]').addEventListener('click', () => duplicateDesign(id));
            card.querySelector('[data-act="del"]').addEventListener('click', () => deleteDesign(id));
        });
    }

    function openNewDesignModal() {
        document.getElementById('dsNewModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'dsNewModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:760px;">
                <div class="ds-modal-header">
                    <div class="ds-modal-tabs">
                        <button class="ds-modal-tab active" data-tab="templates">Templates</button>
                        <button class="ds-modal-tab" data-tab="blank">Blank sizes</button>
                    </div>
                    <button class="btn-icon" id="dsNewModalClose">&times;</button>
                </div>
                <div class="ds-modal-body" id="dsNewModalBody"></div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#dsNewModalClose').addEventListener('click', () => modal.remove());
        modal.querySelectorAll('.ds-modal-tab').forEach(t => t.addEventListener('click', () => {
            modal.querySelectorAll('.ds-modal-tab').forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            renderNewModalBody(modal, t.dataset.tab);
        }));
        renderNewModalBody(modal, 'templates');
    }

    function renderNewModalBody(modal, tab) {
        const body = modal.querySelector('#dsNewModalBody');
        if (tab === 'templates') {
            body.innerHTML = `<div class="ds-tmpl-grid">${TEMPLATES.map(t => `
                <div class="ds-tmpl-card" data-id="${t.id}">
                    <div class="ds-tmpl-thumb" style="background:${t.thumbColor};aspect-ratio:${t.w}/${t.h}"></div>
                    <div class="ds-tmpl-name">${t.name}</div>
                </div>`).join('')}</div>`;
            body.querySelectorAll('.ds-tmpl-card').forEach(card => card.addEventListener('click', () => {
                const t = TEMPLATES.find(x => x.id === card.dataset.id);
                modal.remove();
                const built = t.build();
                createNewDesign(t.name, t.w, t.h, built.bg, built.objects);
            }));
        } else {
            body.innerHTML = `<div class="ds-preset-grid">${SIZE_PRESETS.map(p => `
                <div class="ds-preset-card" data-key="${p.key}">
                    <i class="${p.icon}"></i>
                    <div class="ds-preset-label">${p.label}</div>
                    ${p.w ? `<div class="ds-preset-dim">${p.w}×${p.h}</div>` : ''}
                </div>`).join('')}</div>`;
            body.querySelectorAll('.ds-preset-card').forEach(card => card.addEventListener('click', () => {
                const preset = SIZE_PRESETS.find(p => p.key === card.dataset.key);
                modal.remove();
                if (preset.key === 'custom') {
                    const w = parseInt(prompt('Width in pixels', '1000') || '0', 10);
                    const h = parseInt(prompt('Height in pixels', '1000') || '0', 10);
                    if (!w || !h) return;
                    createNewDesign(preset.label, w, h);
                } else {
                    createNewDesign(preset.label, preset.w, preset.h);
                }
            }));
        }
    }

    // ---------------------------------------------------------------
    // Resize (auto-resize current page to a different platform size)
    // ---------------------------------------------------------------
    function openResizeModal() {
        document.getElementById('dsResizeModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'dsResizeModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:640px;">
                <div class="ds-modal-header">
                    <h3 style="margin:0;font-size:16px;">Resize this design</h3>
                    <button class="btn-icon" id="dsResizeClose">&times;</button>
                </div>
                <div class="ds-modal-body">
                    <p class="ds-props-empty" style="margin-bottom:14px;">This adds a new page at the chosen size, with everything scaled to fit. Your original page stays untouched.</p>
                    <div class="ds-preset-grid">${SIZE_PRESETS.filter(p => p.key !== 'custom').map(p => `
                        <div class="ds-preset-card" data-key="${p.key}">
                            <i class="${p.icon}"></i>
                            <div class="ds-preset-label">${p.label}</div>
                            <div class="ds-preset-dim">${p.w}×${p.h}</div>
                        </div>`).join('')}</div>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#dsResizeClose').addEventListener('click', () => modal.remove());
        modal.querySelectorAll('.ds-preset-card').forEach(card => card.addEventListener('click', () => {
            const preset = SIZE_PRESETS.find(p => p.key === card.dataset.key);
            modal.remove();
            resizeCurrentPageTo(preset.w, preset.h);
        }));
    }

    function resizeCurrentPageTo(newW, newH) {
        const src = pg();
        const scaleX = newW / src.width, scaleY = newH / src.height;
        const newPage = blankPage(newW, newH, JSON.parse(JSON.stringify(src.bg)), []);
        newPage.objects = src.objects.map(o => {
            const c = JSON.parse(JSON.stringify(o));
            c.id = uid();
            c.x *= scaleX; c.y *= scaleY; c.w *= scaleX; c.h *= scaleY;
            if (o.type === 'text') c.fontSize = Math.round(o.fontSize * ((scaleX + scaleY) / 2));
            if (o._img) c._img = o._img;
            return c;
        });
        current.pages.splice(pageIdx + 1, 0, newPage);
        pushHistory();
        switchPage(pageIdx + 1);
        toast(`Resized to ${newW}×${newH} on a new page`);
    }

    // ---------------------------------------------------------------
    // Design lifecycle
    // ---------------------------------------------------------------
    function blankPage(w, h, bg, objects) {
        return {
            id: uid(), width: w, height: h,
            bg: bg || { type: 'solid', color: '#ffffff' },
            objects: (objects || []).map(o => Object.assign({ id: uid(), rotation: 0, opacity: 1 }, o)),
        };
    }

    function createNewDesign(label, w, h, bg, objects) {
        current = {
            id: uid(), name: label, uploads: [],
            pages: [blankPage(w, h, bg, objects)],
            createdAt: Date.now(), updatedAt: Date.now(),
        };
        pageIdx = 0; selectedIds = [];
        loadImagesForDesign(current, () => {
            history = [snapshot()]; historyIdx = 0;
            showEditor();
        });
    }

    function editDesign(id) {
        const d = designs.find(x => x.id === id);
        if (!d) return;
        current = JSON.parse(JSON.stringify(d));
        if (!current.uploads) current.uploads = [];
        pageIdx = 0; selectedIds = [];
        loadImagesForDesign(current, () => {
            history = [snapshot()]; historyIdx = 0;
            showEditor();
        });
    }

    function duplicateDesign(id) {
        const d = designs.find(x => x.id === id);
        if (!d) return;
        const copy = JSON.parse(JSON.stringify(d));
        copy.id = uid(); copy.name = d.name + ' (copy)';
        copy.createdAt = Date.now(); copy.updatedAt = Date.now();
        designs.push(copy); saveAll(designs); renderGrid();
        toast('Design duplicated');
    }

    function deleteDesign(id) {
        if (!confirm('Delete this design? This cannot be undone.')) return;
        designs = designs.filter(x => x.id !== id);
        saveAll(designs); renderGrid();
    }

    function loadImagesForDesign(design, cb) {
        const imgObjs = [];
        design.pages.forEach(p => p.objects.forEach(o => { if (o.type === 'image' && o.src) imgObjs.push(o); }));
        if (!imgObjs.length) return cb();
        let remaining = imgObjs.length;
        imgObjs.forEach(o => {
            const img = new Image();
            img.onload = () => { o._img = img; if (--remaining === 0) cb(); };
            img.onerror = () => { if (--remaining === 0) cb(); };
            img.src = o.src;
        });
    }

    function showList() {
        document.getElementById('dsListView').style.display = '';
        document.getElementById('dsEditorView').style.display = 'none';
        current = null;
        renderGrid();
    }

    function showEditor() {
        document.getElementById('dsListView').style.display = 'none';
        document.getElementById('dsEditorView').style.display = 'flex';
        document.getElementById('dsNameInput').value = current.name;
        document.getElementById('dsNameInput').oninput = (e) => { current.name = e.target.value; };
        zoom = 1;
        fitCanvas();
        renderProps();
        renderPagesStrip();
        renderSidePanel('elements');
        updateSelBar();
    }

    // ---------------------------------------------------------------
    // Undo / redo (per-design snapshot of all pages)
    // ---------------------------------------------------------------
    function snapshot() {
        const clean = current.pages.map(p => ({
            ...p, objects: p.objects.map(o => { const c = { ...o }; delete c._img; return c; }),
        }));
        return JSON.stringify({ pages: clean, uploads: current.uploads });
    }
    function pushHistory() {
        history = history.slice(0, historyIdx + 1);
        history.push(snapshot());
        historyIdx = history.length - 1;
    }
    function undo() { if (historyIdx <= 0) return; historyIdx--; restoreSnapshot(history[historyIdx]); }
    function redo() { if (historyIdx >= history.length - 1) return; historyIdx++; restoreSnapshot(history[historyIdx]); }
    function restoreSnapshot(snap) {
        const data = JSON.parse(snap);
        current.pages = data.pages;
        current.uploads = data.uploads;
        if (pageIdx >= current.pages.length) pageIdx = current.pages.length - 1;
        selectedIds = [];
        loadImagesForDesign(current, () => { drawAll(); renderProps(); renderPagesStrip(); updateSelBar(); });
    }

    function saveCurrentDesign(showMsg) {
        current.updatedAt = Date.now();
        current.thumbnail = canvasEl.toDataURL('image/jpeg', 0.6);
        const idx = designs.findIndex(d => d.id === current.id);
        const toStore = JSON.parse(JSON.stringify(current));
        toStore.pages.forEach(p => p.objects.forEach(o => { delete o._img; }));
        if (idx >= 0) designs[idx] = toStore; else designs.push(toStore);
        if (saveAll(designs) && showMsg) toast('Design saved');
    }

    // ---------------------------------------------------------------
    // Pages
    // ---------------------------------------------------------------
    function renderPagesStrip() {
        const strip = document.getElementById('dsPagesStrip');
        if (!strip) return;
        strip.innerHTML = current.pages.map((p, i) => `
            <div class="ds-page-thumb ${i === pageIdx ? 'active' : ''}" data-i="${i}">
                <div class="ds-page-num">${i + 1}</div>
                <div class="ds-page-thumb-actions">
                    <button data-act="dup" title="Duplicate page"><i class="fas fa-clone"></i></button>
                    ${current.pages.length > 1 ? '<button data-act="del" title="Delete page"><i class="fas fa-trash"></i></button>' : ''}
                </div>
            </div>`).join('') + `<button class="ds-page-add" id="dsAddPage"><i class="fas fa-plus"></i></button>`;
        strip.querySelectorAll('.ds-page-thumb').forEach(el => {
            const i = parseInt(el.dataset.i, 10);
            el.addEventListener('click', (e) => { if (!e.target.closest('button')) switchPage(i); });
            el.querySelector('[data-act="dup"]').addEventListener('click', () => duplicatePage(i));
            el.querySelector('[data-act="del"]')?.addEventListener('click', () => deletePage(i));
        });
        strip.querySelector('#dsAddPage').addEventListener('click', addPage);
    }
    function switchPage(i) { pageIdx = i; selectedIds = []; fitCanvas(); renderProps(); renderPagesStrip(); updateSelBar(); }
    function addPage() {
        const ref = pg();
        current.pages.push(blankPage(ref.width, ref.height, { type: 'solid', color: '#ffffff' }, []));
        pageIdx = current.pages.length - 1;
        pushHistory(); switchPage(pageIdx);
    }
    function duplicatePage(i) {
        const copy = JSON.parse(JSON.stringify(current.pages[i]));
        copy.id = uid();
        copy.objects.forEach(o => o.id = uid());
        current.pages.splice(i + 1, 0, copy);
        loadImagesForDesign(current, () => { pushHistory(); switchPage(i + 1); });
    }
    function deletePage(i) {
        if (current.pages.length <= 1) return;
        if (!confirm('Delete this page?')) return;
        current.pages.splice(i, 1);
        if (pageIdx >= current.pages.length) pageIdx = current.pages.length - 1;
        pushHistory(); switchPage(pageIdx);
    }

    // ---------------------------------------------------------------
    // Canvas fit / zoom
    // ---------------------------------------------------------------
    function fitCanvas() {
        const area = document.getElementById('dsCanvasArea');
        if (!area || !current) return;
        const page = pg();
        const backingW = Math.min(page.width, MAX_LIVE_DIM);
        const backingH = Math.round(backingW * (page.height / page.width));
        canvasEl.width = backingW; canvasEl.height = backingH;

        const availW = area.clientWidth - 32, availH = area.clientHeight - 32;
        const fitScale = Math.min(availW / backingW, availH / backingH, 1);
        const displayScale = fitScale * zoom;
        canvasEl.style.width = Math.round(backingW * displayScale) + 'px';
        canvasEl.style.height = Math.round(backingH * displayScale) + 'px';
        scale = backingW / page.width;
        document.getElementById('dsZoomLabel').textContent = Math.round(zoom * 100) + '%';
        drawAll();
    }
    function setZoom(z) { zoom = Math.max(0.25, Math.min(3, z)); fitCanvas(); }

    // ---------------------------------------------------------------
    // Fill resolver (solid color or linear gradient)
    // ---------------------------------------------------------------
    function resolveFill(ctx2, fill, x, y, w, h) {
        if (fill && typeof fill === 'object' && fill.type === 'linear') {
            const rad = deg2rad(fill.angle || 0);
            const dx = Math.cos(rad) * w / 2, dy = Math.sin(rad) * h / 2;
            const cx = x + w / 2, cy = y + h / 2;
            const g = ctx2.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
            g.addColorStop(0, fill.color); g.addColorStop(1, fill.color2);
            return g;
        }
        return fill || '#000000';
    }

    // ---------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------
    function drawAll() {
        if (!current) return;
        const page = pg();
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.save();
        ctx.fillStyle = resolveFill(ctx, page.bg && page.bg.type === 'linear' ? page.bg : (page.bg ? page.bg.color : '#fff'), 0, 0, canvasEl.width, canvasEl.height);
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.restore();

        if (gridSnap) {
            ctx.save();
            ctx.strokeStyle = 'rgba(113,75,103,.15)'; ctx.lineWidth = 1;
            for (let gx = 0; gx <= page.width; gx += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(gx * scale, 0); ctx.lineTo(gx * scale, canvasEl.height); ctx.stroke();
            }
            for (let gy = 0; gy <= page.height; gy += GRID_SIZE) {
                ctx.beginPath(); ctx.moveTo(0, gy * scale); ctx.lineTo(canvasEl.width, gy * scale); ctx.stroke();
            }
            ctx.restore();
        }

        page.objects.forEach(o => { if (!o.hidden) drawObjectOn(ctx, scale, o); });

        guideLines.forEach(g => {
            ctx.save();
            ctx.strokeStyle = '#ff3d9a'; ctx.lineWidth = 1;
            ctx.beginPath();
            if (g.type === 'v') { ctx.moveTo(g.pos * scale, 0); ctx.lineTo(g.pos * scale, canvasEl.height); }
            else { ctx.moveTo(0, g.pos * scale); ctx.lineTo(canvasEl.width, g.pos * scale); }
            ctx.stroke();
            ctx.restore();
        });

        selectedObjs().forEach(o => drawSelection(o));
    }

    function drawObjectOn(ctx2, scl, o) {
        ctx2.save();
        ctx2.globalAlpha = (o.opacity == null ? 1 : o.opacity);
        const x = o.x * scl, y = o.y * scl, w = o.w * scl, h = o.h * scl;
        const cx = x + w / 2, cy = y + h / 2;
        if (o.rotation) { ctx2.translate(cx, cy); ctx2.rotate(deg2rad(o.rotation)); ctx2.translate(-cx, -cy); }

        if (o.type === 'rect') {
            ctx2.fillStyle = resolveFill(ctx2, o.fill, x, y, w, h);
            if (o.radius) roundRectOn(ctx2, x, y, w, h, o.radius * scl); else ctx2.fillRect(x, y, w, h);
            if (o.stroke && o.stroke !== 'transparent') {
                ctx2.strokeStyle = o.stroke; ctx2.lineWidth = (o.strokeWidth || 3) * scl;
                if (o.radius) { ctx2.beginPath(); roundRectPath(ctx2, x, y, w, h, o.radius * scl); ctx2.stroke(); }
                else ctx2.strokeRect(x, y, w, h);
            }
        } else if (o.type === 'ellipse') {
            ctx2.fillStyle = resolveFill(ctx2, o.fill, x, y, w, h);
            ctx2.beginPath(); ctx2.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx2.fill();
            if (o.stroke && o.stroke !== 'transparent') {
                ctx2.strokeStyle = o.stroke; ctx2.lineWidth = (o.strokeWidth || 3) * scl; ctx2.stroke();
            }
        } else if (o.type === 'line') {
            ctx2.fillStyle = resolveFill(ctx2, o.fill, x, y, w, Math.max(h, 2 * scl));
            ctx2.fillRect(x, y, w, Math.max(h, 2 * scl));
        } else if (o.type === 'shape') {
            ctx2.fillStyle = resolveFill(ctx2, o.fill, x, y, w, h);
            ctx2.save();
            ctx2.translate(x, y);
            ctx2.scale(w / 100, h / 100);
            ctx2.fill(new Path2D(SHAPES[o.shapeKey] || SHAPES.star));
            ctx2.restore();
        } else if (o.type === 'table') {
            drawTableOn(ctx2, scl, o, x, y, w, h);
        } else if (o.type === 'chart') {
            drawChartOn(ctx2, scl, o, x, y, w, h);
        } else if (o.type === 'image' && o._img) {
            ctx2.filter = o.filter || 'none';
            const iw = o._img.naturalWidth || o._img.width, ih = o._img.naturalHeight || o._img.height;
            const cx0 = (o.cropX || 0) * iw, cy0 = (o.cropY || 0) * ih;
            const cw = (o.cropW == null ? 1 : o.cropW) * iw, ch = (o.cropH == null ? 1 : o.cropH) * ih;
            if (o.clip && o.clip !== 'none') {
                ctx2.save();
                ctx2.beginPath();
                if (o.clip === 'circle') ctx2.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
                else roundRectPath(ctx2, x, y, w, h, Math.min(w, h) * 0.12);
                ctx2.clip();
                ctx2.drawImage(o._img, cx0, cy0, cw, ch, x, y, w, h);
                ctx2.restore();
            } else {
                ctx2.drawImage(o._img, cx0, cy0, cw, ch, x, y, w, h);
            }
            ctx2.filter = 'none';
        } else if (o.type === 'image' && !o._img) {
            ctx2.save();
            ctx2.strokeStyle = '#b9a9b5'; ctx2.setLineDash([8, 6]); ctx2.lineWidth = 2;
            ctx2.fillStyle = '#f4f0f3';
            if (o.clip === 'circle') { ctx2.beginPath(); ctx2.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2); ctx2.fill(); ctx2.stroke(); }
            else { ctx2.fillRect(x, y, w, h); ctx2.strokeRect(x, y, w, h); }
            ctx2.restore();
            ctx2.fillStyle = '#9c8a97';
            ctx2.font = `${14 * scl}px Poppins, sans-serif`;
            ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
            ctx2.fillText('+ Add photo', cx, cy);
        } else if (o.type === 'text') {
            ctx2.fillStyle = o.color;
            ctx2.font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${o.fontSize * scl}px ${o.fontFamily}, sans-serif`;
            ctx2.textBaseline = 'top';
            ctx2.textAlign = o.align || 'left';
            if (o.shadow && o.shadow.enabled) {
                ctx2.shadowColor = o.shadow.color || 'rgba(0,0,0,.5)';
                ctx2.shadowBlur = (o.shadow.blur || 6) * scl;
                ctx2.shadowOffsetX = (o.shadow.offsetX || 3) * scl;
                ctx2.shadowOffsetY = (o.shadow.offsetY || 3) * scl;
            }
            if (o.curve && o.curve !== 0) {
                drawCurvedTextOn(ctx2, o, x, y, w, h, scl);
            } else {
                const tx = o.align === 'center' ? x + w / 2 : o.align === 'right' ? x + w : x;
                if (o.outline && o.outline.enabled) {
                    ctx2.strokeStyle = o.outline.color || '#000000';
                    ctx2.lineWidth = (o.outline.width || 4) * scl;
                    ctx2.lineJoin = 'round';
                    wrapTextOn(ctx2, o.text, tx, y, w, o.fontSize * scl * 1.25, true);
                }
                wrapTextOn(ctx2, o.text, tx, y, w, o.fontSize * scl * 1.25, false);
            }
            ctx2.shadowColor = 'transparent'; ctx2.shadowBlur = 0; ctx2.shadowOffsetX = 0; ctx2.shadowOffsetY = 0;
        }
        ctx2.restore();
    }

    // Draws text along an arc. o.curve range roughly -100..100; sign flips direction.
    function drawCurvedTextOn(ctx2, o, x, y, w, h, scl) {
        const text = String(o.text || '').replace(/\n/g, ' ');
        if (!text) return;
        const radius = 6000 / Math.max(4, Math.abs(o.curve)) * scl;
        const dir = o.curve > 0 ? 1 : -1;
        const cx = x + w / 2;
        const cy = y + h / 2 + dir * radius * -1; // pivot above/below text depending on direction
        let totalWidth = 0;
        const widths = [];
        text.split('').forEach(ch => { const cw = ctx2.measureText(ch).width; widths.push(cw); totalWidth += cw; });
        const totalAngle = (totalWidth / radius) * dir;
        let angle = -totalAngle / 2 - Math.PI / 2 * dir + Math.PI / 2;
        ctx2.save();
        ctx2.translate(cx, cy);
        text.split('').forEach((ch, i) => {
            const chWidth = widths[i];
            const chAngle = (chWidth / radius) * dir;
            ctx2.save();
            ctx2.rotate(angle + chAngle / 2 - Math.PI / 2 + Math.PI / 2 * (1 - dir));
            ctx2.translate(0, -radius * dir);
            ctx2.textAlign = 'center';
            if (o.outline && o.outline.enabled) {
                ctx2.strokeStyle = o.outline.color || '#000'; ctx2.lineWidth = (o.outline.width || 4) * scl;
                ctx2.strokeText(ch, 0, 0);
            }
            ctx2.fillText(ch, 0, 0);
            ctx2.restore();
            angle += chAngle;
        });
        ctx2.restore();
    }

    function drawTableOn(ctx2, scl, o, x, y, w, h) {
        const rows = o.rows || 3, cols = o.cols || 3;
        const cellW = w / cols, cellH = h / rows;
        ctx2.fillStyle = o.fill || '#ffffff';
        ctx2.fillRect(x, y, w, h);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx0 = x + c * cellW, cy0 = y + r * cellH;
                if (r === 0 && o.headerFill) { ctx2.fillStyle = o.headerFill; ctx2.fillRect(cx0, cy0, cellW, cellH); }
                ctx2.strokeStyle = o.borderColor || '#d0d0d0';
                ctx2.lineWidth = Math.max(1, 1 * scl);
                ctx2.strokeRect(cx0, cy0, cellW, cellH);
                const val = (o.cells && o.cells[r] && o.cells[r][c]) || '';
                if (val) {
                    ctx2.fillStyle = (r === 0 && o.headerFill) ? (o.headerTextColor || '#ffffff') : (o.textColor || '#1a1a1a');
                    ctx2.font = `${r === 0 ? 'bold ' : ''}${(o.fontSize || 16) * scl}px Poppins, sans-serif`;
                    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
                    ctx2.fillText(val, cx0 + cellW / 2, cy0 + cellH / 2, cellW - 8 * scl);
                }
            }
        }
    }

    const CHART_COLORS = ['#714B67', '#00c4cc', '#ffd23f', '#e63950', '#5b8def', '#7bc47f', '#f4845f'];

    function drawChartOn(ctx2, scl, o, x, y, w, h) {
        const data = (o.data && o.data.length ? o.data : [{ label: 'A', value: 1 }]);
        const chartType = o.chartType || 'bar';
        ctx2.save();
        if (o.title) {
            ctx2.fillStyle = o.textColor || '#1a1a1a';
            ctx2.font = `bold ${16 * scl}px Poppins, sans-serif`;
            ctx2.textAlign = 'left'; ctx2.textBaseline = 'top';
            ctx2.fillText(o.title, x, y);
        }
        const padTop = o.title ? 32 * scl : 8 * scl;
        const plotX = x + 10 * scl, plotY = y + padTop, plotW = w - 20 * scl, plotH = h - padTop - 30 * scl;
        const maxVal = Math.max(...data.map(d => d.value), 0.0001);

        if (chartType === 'bar') {
            const gap = plotW * 0.08 / data.length;
            const barW = (plotW - gap * (data.length - 1)) / data.length;
            data.forEach((d, i) => {
                const barH = (d.value / maxVal) * plotH;
                const bx = plotX + i * (barW + gap), by = plotY + plotH - barH;
                ctx2.fillStyle = d.color || CHART_COLORS[i % CHART_COLORS.length];
                ctx2.fillRect(bx, by, barW, barH);
                ctx2.fillStyle = o.textColor || '#555';
                ctx2.font = `${11 * scl}px Poppins, sans-serif`;
                ctx2.textAlign = 'center'; ctx2.textBaseline = 'top';
                ctx2.fillText(String(d.label).slice(0, 10), bx + barW / 2, plotY + plotH + 6 * scl);
            });
        } else if (chartType === 'line') {
            ctx2.beginPath();
            data.forEach((d, i) => {
                const px = plotX + (i / Math.max(1, data.length - 1)) * plotW;
                const py = plotY + plotH - (d.value / maxVal) * plotH;
                if (i === 0) ctx2.moveTo(px, py); else ctx2.lineTo(px, py);
            });
            ctx2.strokeStyle = (o.data[0] && o.data[0].color) || CHART_COLORS[0];
            ctx2.lineWidth = 3 * scl;
            ctx2.stroke();
            data.forEach((d, i) => {
                const px = plotX + (i / Math.max(1, data.length - 1)) * plotW;
                const py = plotY + plotH - (d.value / maxVal) * plotH;
                ctx2.beginPath(); ctx2.arc(px, py, 4 * scl, 0, Math.PI * 2);
                ctx2.fillStyle = CHART_COLORS[0]; ctx2.fill();
                ctx2.fillStyle = o.textColor || '#555';
                ctx2.font = `${11 * scl}px Poppins, sans-serif`;
                ctx2.textAlign = 'center'; ctx2.textBaseline = 'top';
                ctx2.fillText(String(d.label).slice(0, 10), px, plotY + plotH + 6 * scl);
            });
        } else if (chartType === 'pie') {
            const total = data.reduce((s, d) => s + d.value, 0) || 1;
            const cx = x + w / 2, cy = plotY + plotH / 2, r = Math.min(plotW, plotH) / 2;
            let angle = -Math.PI / 2;
            data.forEach((d, i) => {
                const slice = (d.value / total) * Math.PI * 2;
                ctx2.beginPath(); ctx2.moveTo(cx, cy);
                ctx2.arc(cx, cy, r, angle, angle + slice);
                ctx2.closePath();
                ctx2.fillStyle = d.color || CHART_COLORS[i % CHART_COLORS.length];
                ctx2.fill();
                angle += slice;
            });
            // legend
            let ly = y + h - data.length * 16 * scl - 4 * scl;
            data.forEach((d, i) => {
                ctx2.fillStyle = d.color || CHART_COLORS[i % CHART_COLORS.length];
                ctx2.fillRect(x, ly, 10 * scl, 10 * scl);
                ctx2.fillStyle = o.textColor || '#555';
                ctx2.font = `${11 * scl}px Poppins, sans-serif`;
                ctx2.textAlign = 'left'; ctx2.textBaseline = 'top';
                ctx2.fillText(`${d.label} (${d.value})`, x + 14 * scl, ly - 1 * scl);
                ly += 16 * scl;
            });
        }
        ctx2.restore();
    }

    function wrapTextOn(ctx2, text, x, y, maxWidth, lineHeight, strokeOnly) {
        const paragraphs = String(text).split('\n');
        let ly = y;
        const draw = strokeOnly ? (t, xx, yy) => ctx2.strokeText(t, xx, yy) : (t, xx, yy) => ctx2.fillText(t, xx, yy);
        paragraphs.forEach(par => {
            const words = par.split(/\s+/);
            let line = '';
            for (let n = 0; n < words.length; n++) {
                const test = line + words[n] + ' ';
                if (ctx2.measureText(test).width > maxWidth && line) {
                    draw(line, x, ly); line = words[n] + ' '; ly += lineHeight;
                } else line = test;
            }
            draw(line, x, ly); ly += lineHeight;
        });
    }

    function roundRectPath(ctx2, x, y, w, h, r) {
        ctx2.moveTo(x + r, y);
        ctx2.arcTo(x + w, y, x + w, y + h, r);
        ctx2.arcTo(x + w, y + h, x, y + h, r);
        ctx2.arcTo(x, y + h, x, y, r);
        ctx2.arcTo(x, y, x + w, y, r);
        ctx2.closePath();
    }
    function roundRectOn(ctx2, x, y, w, h, r) {
        ctx2.beginPath();
        roundRectPath(ctx2, x, y, w, h, r);
        ctx2.fill();
    }

    function drawSelection(o) {
        const x = o.x * scale, y = o.y * scale, w = o.w * scale, h = o.h * scale;
        const cx = x + w / 2, cy = y + h / 2;
        ctx.save();
        if (o.rotation) { ctx.translate(cx, cy); ctx.rotate(deg2rad(o.rotation)); ctx.translate(-cx, -cy); }
        ctx.strokeStyle = '#714B67'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#714B67';
        const hs = 9;
        ctx.fillRect(x + w - hs / 2, y + h - hs / 2, hs, hs); // resize handle
        // rotate handle
        ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y - 26); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, y - 26, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ---------------------------------------------------------------
    // Pointer interaction
    // ---------------------------------------------------------------
    function getPos(e) {
        const rect = canvasEl.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        const dispScale = canvasEl.width / rect.width;
        return { x: (cx * dispScale) / scale, y: (cy * dispScale) / scale };
    }
    // rotate a point around a center by -angle (world -> local)
    function toLocal(px, py, o) {
        if (!o.rotation) return { x: px, y: py };
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const rad = -deg2rad(o.rotation);
        const dx = px - cx, dy = py - cy;
        return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
    }
    function objCenter(o) { return { x: o.x + o.w / 2, y: o.y + o.h / 2 }; }

    function hitTest(pos) {
        const objs = pg().objects;
        for (let i = objs.length - 1; i >= 0; i--) {
            const o = objs[i];
            if (o.hidden || o.locked) continue;
            const lp = toLocal(pos.x, pos.y, o);
            if (lp.x >= o.x && lp.x <= o.x + o.w && lp.y >= o.y && lp.y <= o.y + o.h) return o;
        }
        return null;
    }

    function groupMembers(o) {
        if (!o.groupId) return [o];
        return pg().objects.filter(x => x.groupId === o.groupId);
    }

    function onCanvasDown(e) {
        if (!current) return;
        e.preventDefault();
        const pos = getPos(e);

        // handle interaction only when exactly one selected object
        if (selectedIds.length === 1) {
            const o = objById(selectedIds[0]);
            if (o) {
                const c = objCenter(o);
                const lp = toLocal(pos.x, pos.y, o);
                // rotate handle (26px above top, in local space -> account for scale)
                const rotHandleY = o.y - 26 / scale;
                if (Math.abs(lp.x - c.x) < 14 / scale && Math.abs(lp.y - rotHandleY) < 14 / scale) {
                    dragState = { mode: 'rotate', obj: o, cx: c.x, cy: c.y, startRotation: o.rotation || 0, startAngle: Math.atan2(pos.y - c.y, pos.x - c.x) };
                    return;
                }
                const handleX = o.x + o.w, handleY = o.y + o.h;
                if (Math.abs(lp.x - handleX) < 14 / scale && Math.abs(lp.y - handleY) < 14 / scale) {
                    dragState = { mode: 'resize', obj: o, startW: o.w, startH: o.h, startX: pos.x, startY: pos.y, rotation: o.rotation || 0 };
                    return;
                }
            }
        }

        const hit = hitTest(pos);
        if (hit) {
            const group = groupMembers(hit);
            const isShift = e.shiftKey;
            if (isShift) {
                if (selectedIds.includes(hit.id)) selectedIds = selectedIds.filter(id => !group.some(g => g.id === id));
                else selectedIds = [...new Set([...selectedIds, ...group.map(g => g.id)])];
            } else if (!selectedIds.includes(hit.id)) {
                selectedIds = group.map(g => g.id);
            }
            const starts = {};
            selectedObjs().forEach(o => { starts[o.id] = { x: o.x, y: o.y }; });
            dragState = { mode: 'move', anchorId: hit.id, offX: pos.x - hit.x, offY: pos.y - hit.y, starts };
        } else if (!e.shiftKey) {
            selectedIds = [];
            marquee = { x0: pos.x, y0: pos.y, x1: pos.x, y1: pos.y };
        }
        drawAll(); renderProps(); updateSelBar();
    }

    function snapCandidates(excludeIds) {
        const page = pg();
        const cands = { x: [0, page.width / 2, page.width], y: [0, page.height / 2, page.height] };
        page.objects.forEach(o => {
            if (excludeIds.includes(o.id)) return;
            cands.x.push(o.x, o.x + o.w / 2, o.x + o.w);
            cands.y.push(o.y, o.y + o.h / 2, o.y + o.h);
        });
        return cands;
    }

    function onCanvasMove(e) {
        if (marquee) {
            e.preventDefault();
            const pos = getPos(e);
            marquee.x1 = pos.x; marquee.y1 = pos.y;
            drawAll();
            const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1);
            const y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
            ctx.save(); ctx.strokeStyle = '#714B67'; ctx.fillStyle = 'rgba(113,75,103,.08)'; ctx.lineWidth = 1;
            ctx.fillRect(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);
            ctx.strokeRect(x0 * scale, y0 * scale, (x1 - x0) * scale, (y1 - y0) * scale);
            ctx.restore();
            return;
        }
        if (!dragState) return;
        e.preventDefault();
        const pos = getPos(e);
        guideLines = [];

        if (dragState.mode === 'move') {
            const anchor = objById(dragState.anchorId);
            let nx = Math.round(pos.x - dragState.offX), ny = Math.round(pos.y - dragState.offY);
            let snappedX = false, snappedY = false;
            if (selectedIds.length === 1) {
                const THRESH = 8 / scale;
                const cands = snapCandidates(selectedIds);
                const w = anchor.w, h = anchor.h;
                [{ v: nx, adj: 0 }, { v: nx + w / 2, adj: w / 2 }, { v: nx + w, adj: w }].forEach(p => {
                    cands.x.forEach(c => { if (Math.abs(p.v - c) < THRESH) { nx = Math.round(c - p.adj); guideLines.push({ type: 'v', pos: c }); snappedX = true; } });
                });
                [{ v: ny, adj: 0 }, { v: ny + h / 2, adj: h / 2 }, { v: ny + h, adj: h }].forEach(p => {
                    cands.y.forEach(c => { if (Math.abs(p.v - c) < THRESH) { ny = Math.round(c - p.adj); guideLines.push({ type: 'h', pos: c }); snappedY = true; } });
                });
            }
            if (gridSnap) {
                if (!snappedX) nx = Math.round(nx / GRID_SIZE) * GRID_SIZE;
                if (!snappedY) ny = Math.round(ny / GRID_SIZE) * GRID_SIZE;
            }
            const dx = nx - anchor.x, dy = ny - anchor.y;
            selectedObjs().forEach(o => {
                const st = dragState.starts[o.id];
                o.x = st.x + dx; o.y = st.y + dy;
            });
        } else if (dragState.mode === 'resize') {
            const o = dragState.obj;
            // compute drag delta in the object's own rotated axes
            const rad = deg2rad(dragState.rotation || 0);
            const rawDx = pos.x - dragState.startX, rawDy = pos.y - dragState.startY;
            const localDx = rawDx * Math.cos(-rad) - rawDy * Math.sin(-rad);
            const localDy = rawDx * Math.sin(-rad) + rawDy * Math.cos(-rad);
            o.w = Math.max(20, Math.round(dragState.startW + localDx));
            o.h = Math.max(20, Math.round(dragState.startH + localDy));
        } else if (dragState.mode === 'rotate') {
            const o = dragState.obj;
            const angle = Math.atan2(pos.y - dragState.cy, pos.x - dragState.cx);
            let deg = dragState.startRotation + (angle - dragState.startAngle) * 180 / Math.PI;
            deg = Math.round(deg);
            if (Math.abs(deg % 90) < 4) deg = Math.round(deg / 90) * 90; // snap to 90s
            o.rotation = ((deg % 360) + 360) % 360;
        }
        drawAll();
    }

    function onCanvasUp() {
        if (marquee) {
            const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1);
            const y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
            if (Math.abs(x1 - x0) > 3 || Math.abs(y1 - y0) > 3) {
                selectedIds = pg().objects.filter(o => !o.hidden && !o.locked &&
                    o.x < x1 && o.x + o.w > x0 && o.y < y1 && o.y + o.h > y0).map(o => o.id);
            }
            marquee = null;
            drawAll(); renderProps(); updateSelBar();
        }
        if (dragState) { guideLines = []; pushHistory(); renderProps(); drawAll(); }
        dragState = null;
    }

    function onCanvasDblClick(e) {
        const pos = getPos(e);
        const hit = hitTest(pos);
        if (hit && hit.type === 'text') {
            const val = prompt('Edit text', hit.text);
            if (val !== null) { hit.text = val; pushHistory(); drawAll(); renderProps(); }
        } else if (hit && hit.type === 'table') {
            const lp = toLocal(pos.x, pos.y, hit);
            const col = Math.min(hit.cols - 1, Math.max(0, Math.floor((lp.x - hit.x) / (hit.w / hit.cols))));
            const row = Math.min(hit.rows - 1, Math.max(0, Math.floor((lp.y - hit.y) / (hit.h / hit.rows))));
            if (!hit.cells) hit.cells = [];
            if (!hit.cells[row]) hit.cells[row] = [];
            const current = hit.cells[row][col] || '';
            const val = prompt('Edit cell text', current);
            if (val !== null) { hit.cells[row][col] = val; pushHistory(); drawAll(); }
        }
    }

    // ---------------------------------------------------------------
    // Adding objects
    // ---------------------------------------------------------------
    function addObjectToPage(obj) {
        const o = Object.assign({ id: uid(), rotation: 0, opacity: 1 }, obj);
        pg().objects.push(o);
        selectedIds = [o.id];
        pushHistory(); drawAll(); renderProps(); updateSelBar();
        return o;
    }

    function addText(preset) {
        const page = pg();
        const cx = page.width / 2;
        const presets = {
            heading: { fontSize: 64, w: page.width * 0.7, text: 'Add a heading', bold: true },
            subheading: { fontSize: 36, w: page.width * 0.7, text: 'Add a subheading', bold: true },
            body: { fontSize: 22, w: page.width * 0.6, text: 'Add a little body text', bold: false },
        };
        const p = presets[preset] || presets.body;
        addObjectToPage({ type: 'text', x: cx - p.w / 2, y: page.height / 2 - 30, w: p.w, h: p.fontSize * 1.5, text: p.text, fontSize: p.fontSize, fontFamily: 'Poppins', color: '#1a1a1a', bold: p.bold, align: 'center' });
    }

    function addShapeTool(type, shapeKey) {
        const page = pg();
        const cx = page.width / 2, cy = page.height / 2;
        if (type === 'rect') addObjectToPage({ type: 'rect', x: cx - 100, y: cy - 75, w: 200, h: 150, fill: '#714B67', stroke: 'transparent', radius: 0 });
        else if (type === 'ellipse') addObjectToPage({ type: 'ellipse', x: cx - 90, y: cy - 90, w: 180, h: 180, fill: '#00c4cc', stroke: 'transparent' });
        else if (type === 'line') addObjectToPage({ type: 'line', x: cx - 150, y: cy, w: 300, h: 4, fill: '#1a1a1a' });
        else if (type === 'shape') addObjectToPage({ type: 'shape', shapeKey, x: cx - 90, y: cy - 90, w: 180, h: 180, fill: '#714B67' });
    }

    function addTableTool() {
        const page = pg();
        const w = page.width * 0.6, h = page.height * 0.35;
        addObjectToPage({
            type: 'table', x: (page.width - w) / 2, y: (page.height - h) / 2, w, h,
            rows: 3, cols: 3, fill: '#ffffff', borderColor: '#d8d3d9', headerFill: '#714B67',
            headerTextColor: '#ffffff', textColor: '#1a1a1a', fontSize: 16,
            cells: [['Header 1', 'Header 2', 'Header 3'], ['Row 1', '', ''], ['Row 2', '', '']],
        });
    }

    function resizeTable(o, rows, cols) {
        rows = Math.max(1, Math.min(12, rows));
        cols = Math.max(1, Math.min(8, cols));
        const oldCells = o.cells || [];
        const newCells = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) row.push((oldCells[r] && oldCells[r][c]) || '');
            newCells.push(row);
        }
        o.rows = rows; o.cols = cols; o.cells = newCells;
    }

    function addFrameTool(clip) {
        // A frame is just an empty placeholder image slot the user fills via Uploads/Photos,
        // shown as a dashed placeholder until an image is assigned.
        const page = pg();
        const size = Math.min(page.width, page.height) * 0.4;
        addObjectToPage({
            type: 'image', x: (page.width - size) / 2, y: (page.height - size) / 2, w: size, h: size,
            src: '', _img: null, filter: 'none', clip, isFramePlaceholder: true,
        });
        toast('Frame added — open Uploads or Photos and pick an image, then drag it onto the frame.');
    }

    function addChartTool(chartType) {
        const page = pg();
        const w = page.width * 0.6, h = page.height * 0.4;
        const sampleData = [
            { label: 'Jan', value: 40 }, { label: 'Feb', value: 65 },
            { label: 'Mar', value: 50 }, { label: 'Apr', value: 80 },
        ];
        addObjectToPage({
            type: 'chart', chartType, x: (page.width - w) / 2, y: (page.height - h) / 2, w, h,
            title: 'Chart title', textColor: '#333333', data: sampleData,
        });
    }

    function addImageObject(src, img) {
        if (fillSelectedFrame(src, img)) return null;
        const page = pg();
        const maxW = page.width * 0.6;
        const ratio = img.width / img.height;
        let w = Math.min(img.width, maxW), h = w / ratio;
        return addObjectToPage({ type: 'image', x: (page.width - w) / 2, y: (page.height - h) / 2, w, h, src, _img: img, filter: 'none', cropX: 0, cropY: 0, cropW: 1, cropH: 1 });
    }

    function fillSelectedFrame(src, img) {
        if (selectedIds.length !== 1) return false;
        const o = objById(selectedIds[0]);
        if (!o || o.type !== 'image' || !o.isFramePlaceholder) return false;
        o.src = src; o._img = img; o.cropX = 0; o.cropY = 0; o.cropW = 1; o.cropH = 1;
        delete o.isFramePlaceholder;
        pushHistory(); drawAll(); renderProps();
        toast('Photo added to frame');
        return true;
    }


    function handleImageUpload(file, cb) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                current.uploads.unshift({ src: ev.target.result, name: file.name });
                if (current.uploads.length > 30) current.uploads.length = 30;
                addImageObject(ev.target.result, img);
                if (cb) cb();
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ---------------------------------------------------------------
    // Selection toolbar actions
    // ---------------------------------------------------------------
    function updateSelBar() {
        const bar = document.getElementById('dsSelBar');
        if (!bar) return;
        bar.style.display = selectedIds.length ? 'flex' : 'none';
        const ungroupBtn = bar.querySelector('[data-act="ungroup"]');
        const groupBtn = bar.querySelector('[data-act="group"]');
        if (groupBtn) groupBtn.style.display = selectedIds.length > 1 ? '' : 'none';
        if (ungroupBtn) ungroupBtn.style.display = selectedObjs().some(o => o.groupId) ? '' : 'none';
    }

    function selectionAction(action) {
        const objs = selectedObjs();
        if (!objs.length) return;
        if (action === 'delete') {
            pg().objects = pg().objects.filter(o => !selectedIds.includes(o.id));
            selectedIds = [];
        } else if (action === 'dup') {
            const newIds = [];
            objs.forEach(o => {
                const copy = JSON.parse(JSON.stringify(o));
                copy.id = uid(); copy.x += 20; copy.y += 20;
                if (o._img) copy._img = o._img;
                pg().objects.push(copy); newIds.push(copy.id);
            });
            selectedIds = newIds;
        } else if (action === 'front' || action === 'back') {
            const set = new Set(selectedIds);
            const moved = pg().objects.filter(o => set.has(o.id));
            pg().objects = pg().objects.filter(o => !set.has(o.id));
            if (action === 'front') pg().objects.push(...moved); else pg().objects.unshift(...moved);
        } else if (action === 'group') {
            if (objs.length > 1) { const gid = uid(); objs.forEach(o => o.groupId = gid); }
        } else if (action === 'ungroup') {
            objs.forEach(o => delete o.groupId);
        } else if (action.startsWith('align-')) {
            const xs = objs.map(o => o.x), ys = objs.map(o => o.y);
            const xe = objs.map(o => o.x + o.w), ye = objs.map(o => o.y + o.h);
            const minX = Math.min(...xs), maxX = Math.max(...xe), minY = Math.min(...ys), maxY = Math.max(...ye);
            objs.forEach(o => {
                if (action === 'align-left') o.x = minX;
                if (action === 'align-right') o.x = maxX - o.w;
                if (action === 'align-hcenter') o.x = minX + (maxX - minX) / 2 - o.w / 2;
                if (action === 'align-top') o.y = minY;
                if (action === 'align-bottom') o.y = maxY - o.h;
                if (action === 'align-vcenter') o.y = minY + (maxY - minY) / 2 - o.h / 2;
            });
        }
        pushHistory(); drawAll(); renderProps(); updateSelBar();
    }

    // ---------------------------------------------------------------
    // Side panel (Elements / Text / Uploads / Photos / Layers)
    // ---------------------------------------------------------------
    function renderSidePanel(tab) {
        const panel = document.getElementById('dsSidePanel');
        if (!panel) return;
        if (tab === 'elements') {
            panel.innerHTML = `
                <h4>Basic shapes</h4>
                <div class="ds-basic-shapes">
                    <button data-shape="rect" title="Rectangle"><i class="fas fa-square"></i></button>
                    <button data-shape="ellipse" title="Circle"><i class="fas fa-circle"></i></button>
                    <button data-shape="line" title="Line"><i class="fas fa-minus"></i></button>
                </div>
                <h4>Layout</h4>
                <div class="ds-basic-shapes">
                    <button data-layout="table" title="Table"><i class="fas fa-table"></i></button>
                    <button data-layout="frame-circle" title="Circle photo frame"><i class="far fa-dot-circle"></i></button>
                    <button data-layout="frame-rounded" title="Rounded photo frame"><i class="far fa-square"></i></button>
                </div>
                <h4>Charts</h4>
                <div class="ds-basic-shapes">
                    <button data-chart="bar" title="Bar chart"><i class="fas fa-chart-bar"></i></button>
                    <button data-chart="line" title="Line chart"><i class="fas fa-chart-line"></i></button>
                    <button data-chart="pie" title="Pie chart"><i class="fas fa-chart-pie"></i></button>
                </div>
                <h4>Icons &amp; shapes</h4>
                <input type="text" id="dsIconSearch" placeholder="Search icons…" class="ds-icon-search">
                <div class="ds-icon-grid" id="dsIconGrid">
                    ${Object.keys(SHAPES).map(k => `<button data-icon="${k}" data-name="${k.toLowerCase()}" title="${k}"><i class="${SHAPE_ICONS[k]}"></i></button>`).join('')}
                </div>`;
            panel.querySelectorAll('[data-shape]').forEach(b => b.addEventListener('click', () => addShapeTool(b.dataset.shape)));
            panel.querySelectorAll('[data-icon]').forEach(b => b.addEventListener('click', () => addShapeTool('shape', b.dataset.icon)));
            panel.querySelector('[data-layout="table"]').addEventListener('click', () => addTableTool());
            panel.querySelector('[data-layout="frame-circle"]').addEventListener('click', () => addFrameTool('circle'));
            panel.querySelector('[data-layout="frame-rounded"]').addEventListener('click', () => addFrameTool('rounded'));
            panel.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', () => addChartTool(b.dataset.chart)));
            panel.querySelector('#dsIconSearch').addEventListener('input', (e) => {
                const q = e.target.value.trim().toLowerCase();
                panel.querySelectorAll('#dsIconGrid button').forEach(b => { b.style.display = !q || b.dataset.name.includes(q) ? '' : 'none'; });
            });
        } else if (tab === 'text') {
            panel.innerHTML = `
                <h4>Add text</h4>
                <button class="ds-text-preset ds-tp-heading" id="dsAddHeading">Add a heading</button>
                <button class="ds-text-preset ds-tp-sub" id="dsAddSub">Add a subheading</button>
                <button class="ds-text-preset ds-tp-body" id="dsAddBody">Add body text</button>`;
            panel.querySelector('#dsAddHeading').addEventListener('click', () => addText('heading'));
            panel.querySelector('#dsAddSub').addEventListener('click', () => addText('subheading'));
            panel.querySelector('#dsAddBody').addEventListener('click', () => addText('body'));
        } else if (tab === 'uploads') {
            panel.innerHTML = `
                <h4>Uploads</h4>
                <label class="btn btn-primary btn-sm ds-upload-btn">
                    <i class="fas fa-cloud-upload-alt"></i> Upload image
                    <input type="file" accept="image/*" id="dsUploadInput" style="display:none;">
                </label>
                <div class="ds-photo-grid" id="dsUploadGrid"></div>`;
            const grid = panel.querySelector('#dsUploadGrid');
            const renderUploads = () => {
                grid.innerHTML = (current.uploads || []).map((u, i) => `<div class="ds-photo-thumb" data-i="${i}" style="background-image:url('${u.src}')"></div>`).join('');
                grid.querySelectorAll('.ds-photo-thumb').forEach(el => el.addEventListener('click', () => {
                    const u = current.uploads[parseInt(el.dataset.i, 10)];
                    const img = new Image();
                    img.onload = () => addImageObject(u.src, img);
                    img.src = u.src;
                }));
            };
            renderUploads();
            panel.querySelector('#dsUploadInput').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) handleImageUpload(file, renderUploads);
                e.target.value = '';
            });
        } else if (tab === 'photos') {
            panel.innerHTML = `
                <h4>Stock photos</h4>
                <div class="ds-photo-search">
                    <input type="text" id="dsPhotoQuery" placeholder="Search e.g. office, nature, food" value="${escapeHtml(stockQuery)}">
                    <button id="dsPhotoSearchBtn"><i class="fas fa-search"></i></button>
                </div>
                <p class="ds-props-empty">Pulled from a free public photo source. If nothing loads, use Uploads instead.</p>
                <div class="ds-photo-grid" id="dsPhotoResults"></div>`;
            const doSearch = () => {
                const q = panel.querySelector('#dsPhotoQuery').value.trim();
                stockQuery = q;
                const results = panel.querySelector('#dsPhotoResults');
                if (!q) { results.innerHTML = ''; return; }
                results.innerHTML = Array.from({ length: 9 }).map((_, i) =>
                    `<div class="ds-photo-thumb ds-photo-loading" data-sig="${i}"><img loading="lazy" src="https://source.unsplash.com/320x240/?${encodeURIComponent(q)}&sig=${i}" onerror="this.parentElement.classList.add('ds-photo-error')"></div>`
                ).join('');
                results.querySelectorAll('.ds-photo-thumb').forEach(el => {
                    const imgEl = el.querySelector('img');
                    imgEl.addEventListener('load', () => el.classList.remove('ds-photo-loading'));
                    el.addEventListener('click', () => insertStockPhoto(q, el.dataset.sig));
                });
            };
            panel.querySelector('#dsPhotoSearchBtn').addEventListener('click', doSearch);
            panel.querySelector('#dsPhotoQuery').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
            if (stockQuery) doSearch();
        } else if (tab === 'brand') {
            renderBrandPanel(panel);
        } else if (tab === 'layers') {
            renderLayersPanel(panel);
        }
    }

    // ---------------------------------------------------------------
    // Brand kit — logo, colors, fonts saved globally across all designs
    // ---------------------------------------------------------------
    function loadBrandKit() {
        try { return JSON.parse(localStorage.getItem(BRAND_KEY) || 'null') || { logo: null, colors: [], fonts: [] }; }
        catch { return { logo: null, colors: [], fonts: [] }; }
    }
    function saveBrandKit(kit) {
        try { localStorage.setItem(BRAND_KEY, JSON.stringify(kit)); return true; }
        catch { toast('Could not save brand kit — storage full', true); return false; }
    }

    function renderBrandPanel(panel) {
        const kit = loadBrandKit();
        panel.innerHTML = `
            <h4>Logo</h4>
            ${kit.logo ? `
                <div class="ds-brand-logo-wrap">
                    <img src="${kit.logo.src}" class="ds-brand-logo-preview" id="dsBrandLogoImg">
                    <button class="ds-brand-remove" id="dsBrandLogoRemove" title="Remove logo"><i class="fas fa-times"></i></button>
                </div>` : `
                <label class="btn btn-outline btn-sm ds-upload-btn">
                    <i class="fas fa-cloud-upload-alt"></i> Upload logo
                    <input type="file" accept="image/*" id="dsBrandLogoInput" style="display:none;">
                </label>`}
            <h4>Brand colors</h4>
            <div class="ds-brand-colors" id="dsBrandColors">
                ${kit.colors.map((c, i) => `<div class="ds-brand-swatch" data-i="${i}" style="background:${c}" title="${c}"><button class="ds-brand-swatch-del" data-i="${i}">&times;</button></div>`).join('')}
                <label class="ds-brand-swatch-add" title="Add color"><i class="fas fa-plus"></i><input type="color" id="dsBrandColorInput" style="display:none;"></label>
            </div>
            <h4>Brand fonts</h4>
            <div class="ds-brand-fonts" id="dsBrandFonts">
                ${kit.fonts.map((f, i) => `<div class="ds-brand-font-row" data-i="${i}" style="font-family:'${f}',sans-serif">${escapeHtml(f)}<button class="ds-brand-font-del" data-i="${i}">&times;</button></div>`).join('') || '<p class="ds-props-empty">No fonts saved yet.</p>'}
            </div>
            <div class="ds-brand-font-add">
                <select id="dsBrandFontSelect">${FONTS.map(f => `<option>${f}</option>`).join('')}</select>
                <button class="btn btn-outline btn-sm" id="dsBrandFontAddBtn"><i class="fas fa-plus"></i></button>
            </div>
            <p class="ds-props-empty" style="margin-top:14px;">Saved here and available across every design. Click a color to apply it to the selected object; click a font to apply it to selected text.</p>`;

        panel.querySelector('#dsBrandLogoInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                kit.logo = { src: ev.target.result };
                saveBrandKit(kit);
                renderBrandPanel(panel);
            };
            reader.readAsDataURL(file);
        });
        panel.querySelector('#dsBrandLogoRemove')?.addEventListener('click', () => {
            kit.logo = null; saveBrandKit(kit); renderBrandPanel(panel);
        });
        panel.querySelector('#dsBrandLogoImg')?.addEventListener('click', () => {
            const img = new Image();
            img.onload = () => addImageObject(kit.logo.src, img);
            img.src = kit.logo.src;
        });
        panel.querySelector('#dsBrandColorInput')?.addEventListener('input', (e) => {
            kit.colors.push(e.target.value);
            saveBrandKit(kit); renderBrandPanel(panel);
        });
        panel.querySelectorAll('.ds-brand-swatch-del').forEach(btn => btn.addEventListener('click', (e) => {
            e.stopPropagation();
            kit.colors.splice(parseInt(btn.dataset.i, 10), 1);
            saveBrandKit(kit); renderBrandPanel(panel);
        }));
        panel.querySelectorAll('.ds-brand-swatch[data-i]').forEach(sw => sw.addEventListener('click', () => {
            const color = kit.colors[parseInt(sw.dataset.i, 10)];
            if (selectedIds.length !== 1) { toast('Select an object on the canvas first'); return; }
            const o = objById(selectedIds[0]);
            if (!o) return;
            if (o.type === 'text') o.color = color;
            else if ('fill' in o) o.fill = color;
            pushHistory(); drawAll(); renderProps();
            toast('Color applied');
        }));
        panel.querySelector('#dsBrandFontAddBtn')?.addEventListener('click', () => {
            const f = panel.querySelector('#dsBrandFontSelect').value;
            if (!kit.fonts.includes(f)) kit.fonts.push(f);
            saveBrandKit(kit); renderBrandPanel(panel);
        });
        panel.querySelectorAll('.ds-brand-font-del').forEach(btn => btn.addEventListener('click', (e) => {
            e.stopPropagation();
            kit.fonts.splice(parseInt(btn.dataset.i, 10), 1);
            saveBrandKit(kit); renderBrandPanel(panel);
        }));
        panel.querySelectorAll('.ds-brand-font-row').forEach(row => row.addEventListener('click', () => {
            const f = kit.fonts[parseInt(row.dataset.i, 10)];
            if (selectedIds.length !== 1) { toast('Select a text object first'); return; }
            const o = objById(selectedIds[0]);
            if (!o || o.type !== 'text') { toast('Select a text object first'); return; }
            o.fontFamily = f;
            pushHistory(); drawAll(); renderProps();
            toast('Font applied');
        }));
    }

    function insertStockPhoto(query, sig) {
        toast('Adding photo…');
        const fullUrl = `https://source.unsplash.com/1600x1200/?${encodeURIComponent(query)}&sig=${sig}`;
        fetch(fullUrl, { mode: 'cors' })
            .then(r => { if (!r.ok) throw new Error('bad status'); return r.blob(); })
            .then(blob => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }))
            .then(dataUrl => {
                const img = new Image();
                img.onload = () => { addImageObject(dataUrl, img); toast('Photo added'); };
                img.src = dataUrl;
            })
            .catch(() => toast("Couldn't load that photo — try another, or use Uploads.", true));
    }

    function renderLayersPanel(panel) {
        panel.innerHTML = `<h4>Layers (this page)</h4><p class="ds-props-empty" style="margin-bottom:8px;">Drag to reorder</p><div class="ds-layers-list" id="dsLayersList"></div>`;
        const list = panel.querySelector('#dsLayersList');
        const objs = pg().objects.slice().reverse();
        list.innerHTML = objs.map(o => `
            <div class="ds-layer-row ${selectedIds.includes(o.id) ? 'active' : ''}" data-id="${o.id}" draggable="true">
                <i class="fas fa-grip-vertical ds-layer-drag"></i>
                <i class="${layerIcon(o)}"></i>
                <span class="ds-layer-name">${escapeHtml(o.name || layerLabel(o))}</span>
                <button data-act="hide" title="${o.hidden ? 'Show' : 'Hide'}"><i class="fas ${o.hidden ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                <button data-act="lock" title="${o.locked ? 'Unlock' : 'Lock'}"><i class="fas ${o.locked ? 'fa-lock' : 'fa-lock-open'}"></i></button>
            </div>`).join('') || '<p class="ds-props-empty">No objects on this page yet.</p>';
        let dragId = null;
        list.querySelectorAll('.ds-layer-row').forEach(row => {
            const id = row.dataset.id;
            row.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                selectedIds = [id]; drawAll(); renderProps(); updateSelBar(); renderLayersPanel(panel);
            });
            row.querySelector('[data-act="hide"]').addEventListener('click', () => {
                const o = objById(id); o.hidden = !o.hidden; pushHistory(); drawAll(); renderLayersPanel(panel);
            });
            row.querySelector('[data-act="lock"]').addEventListener('click', () => {
                const o = objById(id); o.locked = !o.locked; pushHistory(); renderLayersPanel(panel);
            });
            row.addEventListener('dragstart', (e) => { dragId = id; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
            row.addEventListener('dragend', () => { row.classList.remove('dragging'); });
            row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
            row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
            row.addEventListener('drop', (e) => {
                e.preventDefault(); row.classList.remove('drag-over');
                if (!dragId || dragId === id) return;
                const visual = pg().objects.slice().reverse(); // top-first, matches what's shown
                const fromIdx = visual.findIndex(o => o.id === dragId);
                const toIdx = visual.findIndex(o => o.id === id);
                if (fromIdx < 0 || toIdx < 0) return;
                const [moved] = visual.splice(fromIdx, 1);
                visual.splice(toIdx, 0, moved);
                pg().objects = visual.slice().reverse(); // back to bottom-first stack order
                pushHistory(); drawAll(); renderLayersPanel(panel);
            });
        });
    }
    function layerIcon(o) {
        return { text: 'fas fa-font', rect: 'fas fa-square', ellipse: 'fas fa-circle', line: 'fas fa-minus', shape: 'fas fa-shapes', image: 'fas fa-image', table: 'fas fa-table', chart: 'fas fa-chart-bar' }[o.type] || 'fas fa-square';
    }
    function layerLabel(o) {
        if (o.type === 'text') return (o.text || 'Text').slice(0, 18);
        return o.type.charAt(0).toUpperCase() + o.type.slice(1);
    }

    // ---------------------------------------------------------------
    // Properties panel (right side)
    // ---------------------------------------------------------------
    function renderProps() {
        const panel = document.getElementById('dsProps');
        if (!panel) return;
        if (selectedIds.length === 0) {
            panel.innerHTML = `
                <h4>Page background</h4>
                <div class="ds-props-group"><label>Type</label>
                    <select id="dsBgType"><option value="solid" ${pg().bg.type !== 'linear' ? 'selected' : ''}>Solid</option><option value="linear" ${pg().bg.type === 'linear' ? 'selected' : ''}>Gradient</option></select>
                </div>
                <div class="ds-props-group"><label>Color</label><input type="color" id="dsBgColor" value="${pg().bg.color}"></div>
                <div class="ds-props-group" id="dsBgColor2Wrap" style="display:${pg().bg.type === 'linear' ? '' : 'none'}"><label>Color 2</label><input type="color" id="dsBgColor2" value="${pg().bg.color2 || '#000000'}"></div>
                <p class="ds-props-empty" style="margin-top:16px;">Select an object on the canvas to edit its style.</p>`;
            const bgType = panel.querySelector('#dsBgType');
            bgType.addEventListener('change', () => {
                pg().bg.type = bgType.value;
                if (bgType.value === 'linear' && !pg().bg.color2) pg().bg.color2 = '#000000';
                panel.querySelector('#dsBgColor2Wrap').style.display = bgType.value === 'linear' ? '' : 'none';
                drawAll(); pushHistory();
            });
            panel.querySelector('#dsBgColor').addEventListener('input', e => { pg().bg.color = e.target.value; drawAll(); });
            panel.querySelector('#dsBgColor').addEventListener('change', pushHistory);
            panel.querySelector('#dsBgColor2').addEventListener('input', e => { pg().bg.color2 = e.target.value; drawAll(); });
            panel.querySelector('#dsBgColor2').addEventListener('change', pushHistory);
            return;
        }
        if (selectedIds.length > 1) {
            panel.innerHTML = `<p class="ds-props-empty">${selectedIds.length} objects selected. Use the toolbar above the canvas to align, group, or duplicate them together.</p>`;
            return;
        }
        const o = objById(selectedIds[0]);
        if (!o) return;
        let html = '';
        if (o.type === 'text') {
            html += `
                <div class="ds-props-group"><label>Text</label><textarea id="dsPText" rows="3">${escapeHtml(o.text)}</textarea></div>
                <div class="ds-props-group"><label>Font</label><select id="dsPFont">${FONTS.map(f => `<option ${o.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
                <div class="ds-props-row">
                    <div class="ds-props-group"><label>Size</label><input type="number" id="dsPSize" value="${o.fontSize}" min="8" max="300"></div>
                    <div class="ds-props-group"><label>Color</label><input type="color" id="dsPColor" value="${o.color}"></div>
                </div>
                <div class="ds-props-row">
                    <div class="ds-props-group"><label><input type="checkbox" id="dsPBold" ${o.bold ? 'checked' : ''}> Bold</label></div>
                    <div class="ds-props-group"><label><input type="checkbox" id="dsPItalic" ${o.italic ? 'checked' : ''}> Italic</label></div>
                </div>
                <div class="ds-props-group"><label>Align</label>
                    <select id="dsPAlign">
                        <option value="left" ${o.align === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${o.align === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${o.align === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
                <h4>Effects</h4>
                <div class="ds-props-group"><label><input type="checkbox" id="dsPShadowOn" ${o.shadow && o.shadow.enabled ? 'checked' : ''}> Shadow</label></div>
                <div class="ds-effect-sub" id="dsShadowSub" style="display:${o.shadow && o.shadow.enabled ? '' : 'none'}">
                    <div class="ds-props-row">
                        <div class="ds-props-group"><label>Color</label><input type="color" id="dsPShadowColor" value="${(o.shadow && o.shadow.color) || '#000000'}"></div>
                        <div class="ds-props-group"><label>Blur</label><input type="number" id="dsPShadowBlur" value="${(o.shadow && o.shadow.blur) || 6}" min="0" max="60"></div>
                    </div>
                </div>
                <div class="ds-props-group"><label><input type="checkbox" id="dsPOutlineOn" ${o.outline && o.outline.enabled ? 'checked' : ''}> Outline</label></div>
                <div class="ds-effect-sub" id="dsOutlineSub" style="display:${o.outline && o.outline.enabled ? '' : 'none'}">
                    <div class="ds-props-row">
                        <div class="ds-props-group"><label>Color</label><input type="color" id="dsPOutlineColor" value="${(o.outline && o.outline.color) || '#000000'}"></div>
                        <div class="ds-props-group"><label>Width</label><input type="number" id="dsPOutlineWidth" value="${(o.outline && o.outline.width) || 4}" min="1" max="20"></div>
                    </div>
                </div>
                <div class="ds-props-group"><label>Curve</label><input type="range" id="dsPCurve" min="-100" max="100" value="${o.curve || 0}"></div>`;
        } else if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'line' || o.type === 'shape') {
            const isGrad = o.fill && typeof o.fill === 'object';
            html += `<div class="ds-props-group"><label>Fill</label>
                    <select id="dsPFillType"><option value="solid" ${!isGrad ? 'selected' : ''}>Solid</option><option value="linear" ${isGrad ? 'selected' : ''}>Gradient</option></select>
                </div>
                <div class="ds-props-group"><label>Color</label><input type="color" id="dsPFill" value="${isGrad ? o.fill.color : (typeof o.fill === 'string' ? o.fill : '#714B67')}"></div>
                <div class="ds-props-group" id="dsPFill2Wrap" style="display:${isGrad ? '' : 'none'}"><label>Color 2</label><input type="color" id="dsPFill2" value="${isGrad ? o.fill.color2 : '#000000'}"></div>`;
            if (o.type === 'rect') html += `<div class="ds-props-group"><label>Corner radius</label><input type="number" id="dsPRadius" value="${o.radius || 0}" min="0" max="300"></div>`;
        } else if (o.type === 'image') {
            html += `<div class="ds-props-group"><label>Filter</label>
                <select id="dsPFilter">
                    <option value="none" ${!o.filter || o.filter === 'none' ? 'selected' : ''}>None</option>
                    <option value="grayscale(100%)" ${o.filter === 'grayscale(100%)' ? 'selected' : ''}>Grayscale</option>
                    <option value="sepia(80%)" ${o.filter === 'sepia(80%)' ? 'selected' : ''}>Sepia</option>
                    <option value="brightness(1.3) saturate(1.3)" ${o.filter === 'brightness(1.3) saturate(1.3)' ? 'selected' : ''}>Vivid</option>
                    <option value="contrast(1.3) brightness(0.9)" ${o.filter === 'contrast(1.3) brightness(0.9)' ? 'selected' : ''}>Bold</option>
                    <option value="blur(3px)" ${o.filter === 'blur(3px)' ? 'selected' : ''}>Blur</option>
                </select>
            </div>
            <div class="ds-props-group"><label>Frame</label>
                <select id="dsPClip">
                    <option value="none" ${!o.clip || o.clip === 'none' ? 'selected' : ''}>None</option>
                    <option value="circle" ${o.clip === 'circle' ? 'selected' : ''}>Circle</option>
                    <option value="rounded" ${o.clip === 'rounded' ? 'selected' : ''}>Rounded</option>
                </select>
            </div>
            ${o._img ? '<button class="btn btn-outline btn-sm" id="dsPCropBtn" style="width:100%;margin-bottom:14px;"><i class="fas fa-crop-alt"></i> Crop photo</button>' : ''}`;
        } else if (o.type === 'table') {
            html += `
                <div class="ds-props-row">
                    <div class="ds-props-group"><label>Rows</label><input type="number" id="dsPRows" value="${o.rows}" min="1" max="12"></div>
                    <div class="ds-props-group"><label>Cols</label><input type="number" id="dsPCols" value="${o.cols}" min="1" max="8"></div>
                </div>
                <div class="ds-props-group"><label>Header color</label><input type="color" id="dsPHeaderFill" value="${o.headerFill || '#714B67'}"></div>
                <div class="ds-props-group"><label>Border color</label><input type="color" id="dsPBorderColor" value="${o.borderColor || '#d8d3d9'}"></div>
                <p class="ds-props-empty">Double-click a cell on the canvas to edit its text.</p>`;
        } else if (o.type === 'chart') {
            html += `
                <div class="ds-props-group"><label>Title</label><input type="text" id="dsPChartTitle" value="${escapeHtml(o.title || '')}"></div>
                <div class="ds-props-group"><label>Chart type</label>
                    <select id="dsPChartType">
                        <option value="bar" ${o.chartType === 'bar' ? 'selected' : ''}>Bar</option>
                        <option value="line" ${o.chartType === 'line' ? 'selected' : ''}>Line</option>
                        <option value="pie" ${o.chartType === 'pie' ? 'selected' : ''}>Pie</option>
                    </select>
                </div>
                <button class="btn btn-outline btn-sm" id="dsPChartData" style="width:100%;margin-bottom:14px;"><i class="fas fa-table"></i> Edit data</button>`;
        }
        html += `
            <div class="ds-props-group"><label>Opacity</label><input type="range" id="dsPOpacity" min="0" max="100" value="${Math.round((o.opacity == null ? 1 : o.opacity) * 100)}"></div>
            <div class="ds-props-group"><label>Rotation</label><input type="range" id="dsPRotation" min="0" max="359" value="${o.rotation || 0}"></div>
            <div class="ds-props-row">
                <div class="ds-props-group"><label>Width</label><input type="number" id="dsPW" value="${Math.round(o.w)}"></div>
                <div class="ds-props-group"><label>Height</label><input type="number" id="dsPH" value="${Math.round(o.h)}"></div>
            </div>`;
        panel.innerHTML = html;

        const bind = (id, ev, fn) => { const el = panel.querySelector(id); if (el) el.addEventListener(ev, fn); };
        bind('#dsPText', 'input', e => { o.text = e.target.value; drawAll(); });
        bind('#dsPFont', 'change', e => { o.fontFamily = e.target.value; drawAll(); pushHistory(); });
        bind('#dsPSize', 'input', e => { o.fontSize = parseInt(e.target.value, 10) || 12; drawAll(); });
        bind('#dsPColor', 'input', e => { o.color = e.target.value; drawAll(); });
        bind('#dsPBold', 'change', e => { o.bold = e.target.checked; drawAll(); pushHistory(); });
        bind('#dsPItalic', 'change', e => { o.italic = e.target.checked; drawAll(); pushHistory(); });
        bind('#dsPAlign', 'change', e => { o.align = e.target.value; drawAll(); pushHistory(); });
        bind('#dsPShadowOn', 'change', e => {
            o.shadow = o.shadow || { color: '#000000', blur: 6, offsetX: 3, offsetY: 3 };
            o.shadow.enabled = e.target.checked;
            drawAll(); pushHistory(); renderProps();
        });
        bind('#dsPShadowColor', 'input', e => { o.shadow.color = e.target.value; drawAll(); });
        bind('#dsPShadowBlur', 'input', e => { o.shadow.blur = parseInt(e.target.value, 10) || 0; drawAll(); });
        bind('#dsPOutlineOn', 'change', e => {
            o.outline = o.outline || { color: '#000000', width: 4 };
            o.outline.enabled = e.target.checked;
            drawAll(); pushHistory(); renderProps();
        });
        bind('#dsPOutlineColor', 'input', e => { o.outline.color = e.target.value; drawAll(); });
        bind('#dsPOutlineWidth', 'input', e => { o.outline.width = parseInt(e.target.value, 10) || 1; drawAll(); });
        bind('#dsPCurve', 'input', e => { o.curve = parseInt(e.target.value, 10); drawAll(); });
        bind('#dsPClip', 'change', e => { o.clip = e.target.value; drawAll(); pushHistory(); });
        bind('#dsPCropBtn', 'click', () => openCropModal(o));
        bind('#dsPRows', 'change', e => { resizeTable(o, parseInt(e.target.value, 10) || 1, o.cols); drawAll(); pushHistory(); });
        bind('#dsPCols', 'change', e => { resizeTable(o, o.rows, parseInt(e.target.value, 10) || 1); drawAll(); pushHistory(); });
        bind('#dsPHeaderFill', 'input', e => { o.headerFill = e.target.value; drawAll(); });
        bind('#dsPBorderColor', 'input', e => { o.borderColor = e.target.value; drawAll(); });
        bind('#dsPChartTitle', 'input', e => { o.title = e.target.value; drawAll(); });
        bind('#dsPChartType', 'change', e => { o.chartType = e.target.value; drawAll(); pushHistory(); });
        bind('#dsPChartData', 'click', () => openChartDataModal(o));
        bind('#dsPFillType', 'change', e => {
            if (e.target.value === 'linear') o.fill = { type: 'linear', color: typeof o.fill === 'string' ? o.fill : '#714B67', color2: '#000000', angle: 90 };
            else o.fill = typeof o.fill === 'object' ? o.fill.color : o.fill;
            drawAll(); pushHistory(); renderProps();
        });
        bind('#dsPFill', 'input', e => { if (typeof o.fill === 'object') o.fill.color = e.target.value; else o.fill = e.target.value; drawAll(); });
        bind('#dsPFill2', 'input', e => { if (typeof o.fill === 'object') o.fill.color2 = e.target.value; drawAll(); });
        bind('#dsPRadius', 'input', e => { o.radius = parseInt(e.target.value, 10) || 0; drawAll(); });
        bind('#dsPFilter', 'change', e => { o.filter = e.target.value; drawAll(); pushHistory(); });
        bind('#dsPOpacity', 'input', e => { o.opacity = parseInt(e.target.value, 10) / 100; drawAll(); });
        bind('#dsPRotation', 'input', e => { o.rotation = parseInt(e.target.value, 10); drawAll(); });
        bind('#dsPW', 'input', e => { o.w = parseInt(e.target.value, 10) || 20; drawAll(); });
        bind('#dsPH', 'input', e => { o.h = parseInt(e.target.value, 10) || 20; drawAll(); });
        ['#dsPText', '#dsPSize', '#dsPColor', '#dsPFill', '#dsPFill2', '#dsPRadius', '#dsPOpacity', '#dsPRotation', '#dsPW', '#dsPH', '#dsPShadowColor', '#dsPShadowBlur', '#dsPOutlineColor', '#dsPOutlineWidth', '#dsPCurve', '#dsPHeaderFill', '#dsPBorderColor', '#dsPChartTitle'].forEach(id => bind(id, 'change', pushHistory));
    }

    // ---------------------------------------------------------------
    // Chart data modal
    // ---------------------------------------------------------------
    function openChartDataModal(o) {
        document.getElementById('dsChartModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'dsChartModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:520px;">
                <div class="ds-modal-header">
                    <h3 style="margin:0;font-size:16px;">Edit chart data</h3>
                    <button class="btn-icon" id="dsChartClose">&times;</button>
                </div>
                <div class="ds-modal-body">
                    <div class="ds-chart-rows" id="dsChartRows"></div>
                    <button class="btn btn-outline btn-sm" id="dsChartAddRow" style="margin-top:6px;"><i class="fas fa-plus"></i> Add row</button>
                </div>
                <div class="ds-crop-actions">
                    <button class="btn btn-primary btn-sm" id="dsChartApply">Apply</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#dsChartClose').addEventListener('click', () => modal.remove());

        let rows = (o.data || []).map(d => ({ ...d }));
        const rowsEl = modal.querySelector('#dsChartRows');
        function renderRows() {
            rowsEl.innerHTML = rows.map((r, i) => `
                <div class="ds-chart-row" data-i="${i}">
                    <input type="text" class="ds-chart-label" value="${escapeHtml(r.label)}" placeholder="Label">
                    <input type="number" class="ds-chart-value" value="${r.value}" placeholder="Value">
                    <input type="color" class="ds-chart-color" value="${r.color || CHART_COLORS[i % CHART_COLORS.length]}">
                    <button class="ds-chart-del" title="Remove row"><i class="fas fa-times"></i></button>
                </div>`).join('');
            rowsEl.querySelectorAll('.ds-chart-row').forEach(row => {
                const i = parseInt(row.dataset.i, 10);
                row.querySelector('.ds-chart-label').addEventListener('input', e => { rows[i].label = e.target.value; });
                row.querySelector('.ds-chart-value').addEventListener('input', e => { rows[i].value = parseFloat(e.target.value) || 0; });
                row.querySelector('.ds-chart-color').addEventListener('input', e => { rows[i].color = e.target.value; });
                row.querySelector('.ds-chart-del').addEventListener('click', () => { rows.splice(i, 1); renderRows(); });
            });
        }
        renderRows();
        modal.querySelector('#dsChartAddRow').addEventListener('click', () => {
            rows.push({ label: 'New', value: 10, color: CHART_COLORS[rows.length % CHART_COLORS.length] });
            renderRows();
        });
        modal.querySelector('#dsChartApply').addEventListener('click', () => {
            o.data = rows.filter(r => r.label);
            modal.remove();
            pushHistory(); drawAll();
            toast('Chart updated');
        });
    }

    // ---------------------------------------------------------------
    // Crop modal — drag a rectangle over the original image, then apply
    // ---------------------------------------------------------------
    function openCropModal(o) {
        document.getElementById('dsCropModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'dsCropModal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width:640px;">
                <div class="ds-modal-header">
                    <h3 style="margin:0;font-size:16px;">Crop photo</h3>
                    <button class="btn-icon" id="dsCropClose">&times;</button>
                </div>
                <div class="ds-crop-stage" id="dsCropStage">
                    <img id="dsCropImg" src="${o.src}">
                    <div class="ds-crop-rect" id="dsCropRect">
                        <div class="ds-crop-handle" data-h="nw"></div>
                        <div class="ds-crop-handle" data-h="ne"></div>
                        <div class="ds-crop-handle" data-h="sw"></div>
                        <div class="ds-crop-handle" data-h="se"></div>
                    </div>
                </div>
                <div class="ds-crop-actions">
                    <button class="btn btn-outline btn-sm" id="dsCropReset">Reset</button>
                    <button class="btn btn-primary btn-sm" id="dsCropApply">Apply crop</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('#dsCropClose').addEventListener('click', () => modal.remove());

        const stage = modal.querySelector('#dsCropStage');
        const imgEl = modal.querySelector('#dsCropImg');
        const rectEl = modal.querySelector('#dsCropRect');
        // rect state in fractions (0..1) of the displayed image
        let rect = { x: o.cropX || 0, y: o.cropY || 0, w: o.cropW == null ? 1 : o.cropW, h: o.cropH == null ? 1 : o.cropH };

        function applyRectStyle() {
            const b = stage.getBoundingClientRect();
            rectEl.style.left = (rect.x * b.width) + 'px';
            rectEl.style.top = (rect.y * b.height) + 'px';
            rectEl.style.width = (rect.w * b.width) + 'px';
            rectEl.style.height = (rect.h * b.height) + 'px';
        }
        imgEl.addEventListener('load', applyRectStyle);
        if (imgEl.complete) applyRectStyle();

        let drag = null;
        rectEl.addEventListener('mousedown', (e) => {
            if (e.target.dataset.h) {
                drag = { mode: 'resize', handle: e.target.dataset.h, start: { ...rect }, sx: e.clientX, sy: e.clientY };
            } else {
                drag = { mode: 'move', start: { ...rect }, sx: e.clientX, sy: e.clientY };
            }
            e.preventDefault(); e.stopPropagation();
        });
        window.addEventListener('mousemove', onCropMove);
        window.addEventListener('mouseup', onCropUp);
        function onCropMove(e) {
            if (!drag) return;
            const b = stage.getBoundingClientRect();
            const dx = (e.clientX - drag.sx) / b.width, dy = (e.clientY - drag.sy) / b.height;
            if (drag.mode === 'move') {
                rect.x = Math.max(0, Math.min(1 - rect.w, drag.start.x + dx));
                rect.y = Math.max(0, Math.min(1 - rect.h, drag.start.y + dy));
            } else {
                let { x, y, w, h } = drag.start;
                if (drag.handle.includes('w')) { const nx = Math.max(0, Math.min(x + w - 0.05, x + dx)); w += x - nx; x = nx; }
                if (drag.handle.includes('e')) { w = Math.max(0.05, Math.min(1 - x, w + dx)); }
                if (drag.handle.includes('n')) { const ny = Math.max(0, Math.min(y + h - 0.05, y + dy)); h += y - ny; y = ny; }
                if (drag.handle.includes('s')) { h = Math.max(0.05, Math.min(1 - y, h + dy)); }
                rect = { x, y, w, h };
            }
            applyRectStyle();
        }
        function onCropUp() { drag = null; }

        modal.querySelector('#dsCropReset').addEventListener('click', () => { rect = { x: 0, y: 0, w: 1, h: 1 }; applyRectStyle(); });
        modal.querySelector('#dsCropApply').addEventListener('click', () => {
            o.cropX = rect.x; o.cropY = rect.y; o.cropW = rect.w; o.cropH = rect.h;
            window.removeEventListener('mousemove', onCropMove);
            window.removeEventListener('mouseup', onCropUp);
            modal.remove();
            pushHistory(); drawAll();
            toast('Crop applied');
        });
        // clean up listeners if closed without applying
        modal.querySelector('#dsCropClose').addEventListener('click', () => {
            window.removeEventListener('mousemove', onCropMove);
            window.removeEventListener('mouseup', onCropUp);
        });
    }

    // ---------------------------------------------------------------
    // Export
    // ---------------------------------------------------------------
    function renderPageOffscreen(page) {
        const off = document.createElement('canvas');
        off.width = page.width; off.height = page.height;
        const octx = off.getContext('2d');
        octx.fillStyle = resolveFill(octx, page.bg && page.bg.type === 'linear' ? page.bg : (page.bg ? page.bg.color : '#fff'), 0, 0, page.width, page.height);
        octx.fillRect(0, 0, page.width, page.height);
        page.objects.forEach(o => { if (!o.hidden) drawObjectOn(octx, 1, o); });
        return off;
    }

    function exportDesign(fmt) {
        if (fmt === 'pdf') {
            toast('Building PDF…');
            const pagesData = current.pages.map(p => {
                const off = renderPageOffscreen(p);
                return { dataUrl: off.toDataURL('image/jpeg', 0.9), w: off.width, h: off.height };
            });
            try {
                const blob = buildPdf(pagesData);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${safeName(current.name)}.pdf`;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 4000);
                toast('PDF exported');
            } catch (e) {
                console.error(e); toast('PDF export failed', true);
            }
            return;
        }
        const off = renderPageOffscreen(pg());
        const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        const dataUrl = off.toDataURL(mime, 0.92);
        const a = document.createElement('a');
        a.href = dataUrl; a.download = `${safeName(current.name)}.${fmt === 'jpg' ? 'jpg' : 'png'}`;
        document.body.appendChild(a); a.click(); a.remove();
        toast('Exported ' + fmt.toUpperCase());
    }
    function safeName(n) { return String(n || 'design').replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'design'; }

    // ---------------------------------------------------------------
    // Styles
    // ---------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById('dsStyles')) return;
        const style = document.createElement('style');
        style.id = 'dsStyles';
        style.textContent = `
        .ds-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px;margin-top:20px;}
        .ds-card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);border:1px solid #eee;display:flex;flex-direction:column;}
        .ds-card-thumb{height:150px;background-size:cover;background-position:center;background-color:#f4f2f5;cursor:pointer;}
        .ds-card-body{padding:10px 12px 4px;}
        .ds-card-name{font-weight:600;font-size:14px;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ds-card-meta{font-size:12px;color:#888;margin-top:2px;}
        .ds-card-actions{display:flex;gap:6px;padding:10px 12px;}
        .ds-card-actions .btn{flex:1;}
        .ds-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;}
        .ds-empty i{font-size:48px;color:#d8cdd6;margin-bottom:14px;}
        .ds-empty h3{color:#333;margin:0 0 6px;}

        .ds-modal-header{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #eee;}
        .ds-modal-tabs{display:flex;gap:6px;}
        .ds-modal-tab{background:none;border:none;padding:8px 14px;border-radius:20px;font-size:13px;font-weight:600;color:#777;cursor:pointer;}
        .ds-modal-tab.active{background:#f4f2f5;color:#714B67;}
        .ds-modal-body{padding:20px 24px;max-height:60vh;overflow-y:auto;}
        #dsNewModalClose{background:none;border:none;font-size:20px;cursor:pointer;color:#888;}
        .ds-tmpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
        .ds-tmpl-card{cursor:pointer;border-radius:10px;overflow:hidden;border:1px solid #eee;transition:.15s;}
        .ds-tmpl-card:hover{border-color:#714B67;transform:translateY(-2px);}
        .ds-tmpl-thumb{width:100%;max-height:160px;}
        .ds-tmpl-name{padding:8px 10px;font-size:12.5px;font-weight:600;color:#333;}
        .ds-preset-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
        .ds-preset-card{border:1px solid #eee;border-radius:10px;padding:18px 10px;text-align:center;cursor:pointer;transition:.15s;}
        .ds-preset-card:hover{border-color:#714B67;background:#faf7fa;}
        .ds-preset-card i{font-size:24px;color:#714B67;margin-bottom:8px;display:block;}
        .ds-preset-label{font-size:13px;font-weight:600;color:#333;}
        .ds-preset-dim{font-size:11px;color:#999;margin-top:2px;}

        .ds-editor{display:flex;flex-direction:column;height:calc(100vh - 140px);min-height:560px;}
        .ds-editor-topbar{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid #eee;background:#fff;flex-wrap:wrap;}
        .ds-name-input{flex:1;min-width:140px;border:1px solid transparent;background:transparent;font-size:15px;font-weight:600;padding:6px 8px;border-radius:6px;}
        .ds-name-input:hover,.ds-name-input:focus{border-color:#ddd;background:#fafafa;outline:none;}
        .ds-zoom{display:flex;align-items:center;gap:4px;background:#f4f2f5;border-radius:20px;padding:4px 8px;}
        .ds-zoom button{width:24px;height:24px;border:none;background:none;border-radius:50%;cursor:pointer;color:#555;}
        .ds-zoom button:hover{background:#e4dee2;}
        .ds-zoom span{font-size:12px;width:42px;text-align:center;color:#555;}
        .ds-topbar-actions{display:flex;gap:8px;align-items:center;}
        .ds-export-wrap{position:relative;}
        .ds-export-menu{display:none;position:absolute;top:110%;right:0;background:#fff;border:1px solid #eee;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);min-width:150px;z-index:20;overflow:hidden;}
        .ds-export-menu.open{display:block;}
        .ds-export-menu div{padding:9px 14px;font-size:13px;cursor:pointer;}
        .ds-export-menu div:hover{background:#f4f2f5;}

        .ds-editor-body{flex:1;display:flex;overflow:hidden;}
        .ds-rail{width:72px;background:#fff;border-right:1px solid #eee;display:flex;flex-direction:column;align-items:center;padding:12px 4px;gap:4px;}
        .ds-rail-tab{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;width:100%;padding:10px 2px;border-radius:8px;cursor:pointer;font-size:9.5px;color:#666;}
        .ds-rail-tab i{font-size:16px;}
        .ds-rail-tab:hover{background:#f4f2f5;}
        .ds-rail-tab.active{background:#f0ecfa;color:#714B67;}
        .ds-side-panel{width:0;overflow:hidden;background:#fff;border-right:1px solid #eee;transition:width .15s;padding:0;}
        .ds-side-panel.open{width:250px;padding:16px;overflow-y:auto;}
        .ds-side-panel h4{font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#999;margin:0 0 10px;}
        .ds-side-panel h4:not(:first-child){margin-top:20px;}
        .ds-basic-shapes{display:flex;gap:8px;margin-bottom:6px;}
        .ds-basic-shapes button{flex:1;height:44px;border:1px solid #eee;border-radius:8px;background:#fff;cursor:pointer;color:#714B67;font-size:16px;}
        .ds-basic-shapes button:hover{background:#f4f2f5;}
        .ds-icon-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
        .ds-icon-grid button{height:44px;border:1px solid #eee;border-radius:8px;background:#fff;cursor:pointer;color:#714B67;font-size:16px;}
        .ds-icon-grid button:hover{background:#f4f2f5;}
        .ds-text-preset{display:block;width:100%;text-align:left;padding:12px 14px;margin-bottom:8px;border:1px solid #eee;border-radius:8px;background:#fff;cursor:pointer;color:#1a1a1a;}
        .ds-tp-heading{font-size:19px;font-weight:800;}
        .ds-tp-sub{font-size:15px;font-weight:700;}
        .ds-tp-body{font-size:13px;}
        .ds-upload-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-bottom:14px;cursor:pointer;}
        .ds-photo-search{display:flex;gap:6px;margin-bottom:6px;}
        .ds-photo-search input{flex:1;padding:7px 9px;border:1px solid #ddd;border-radius:6px;font-size:12.5px;}
        .ds-photo-search button{width:34px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;color:#714B67;}
        .ds-photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;}
        .ds-photo-thumb{aspect-ratio:4/3;border-radius:6px;overflow:hidden;cursor:pointer;background:#f4f2f5;position:relative;}
        .ds-photo-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
        .ds-photo-thumb.ds-photo-loading{background:linear-gradient(90deg,#eee,#f6f6f6,#eee);}
        .ds-photo-thumb.ds-photo-error{display:none;}
        .ds-layers-list{display:flex;flex-direction:column;gap:4px;}
        .ds-layer-row{display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;cursor:pointer;font-size:12.5px;color:#333;}
        .ds-layer-row:hover{background:#f9f7f9;}
        .ds-layer-row.active{background:#f0ecfa;}
        .ds-layer-row i:first-child{width:16px;color:#714B67;}
        .ds-layer-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ds-layer-row button{background:none;border:none;color:#999;cursor:pointer;padding:2px 4px;}
        .ds-layer-row button:hover{color:#714B67;}
        .ds-layer-drag{cursor:grab;color:#ccc !important;}
        .ds-layer-row.dragging{opacity:.4;}
        .ds-layer-row.drag-over{background:#f0ecfa;box-shadow:inset 0 2px 0 #714B67;}
        .ds-icon-search{width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:6px;font-size:12.5px;margin-bottom:10px;}
        .ds-effect-sub{margin:-6px 0 10px 24px;}

        .ds-center{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;}
        .ds-selbar{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#fff;border-radius:10px;box-shadow:0 3px 14px rgba(0,0,0,.15);display:flex;align-items:center;padding:5px;gap:2px;z-index:15;}
        .ds-selbar button{width:32px;height:32px;border:none;background:none;border-radius:6px;cursor:pointer;color:#444;}
        .ds-selbar button:hover{background:#f4f2f5;color:#714B67;}
        .ds-selbar button.ds-danger:hover{background:#fdeaea;color:#d33;}
        .ds-selbar-sep{width:1px;height:20px;background:#eee;margin:0 2px;}
        .ds-canvas-area{flex:1;display:flex;align-items:center;justify-content:center;background:#efe9ed repeating-conic-gradient(#e7dfe6 0% 25%, transparent 0% 50%) 0/20px 20px;overflow:auto;padding:16px;}
        .ds-canvas-area canvas{background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.15);cursor:default;touch-action:none;}
        .ds-pages-strip{display:flex;gap:10px;padding:10px 16px;background:#fff;border-top:1px solid #eee;overflow-x:auto;align-items:center;}
        .ds-page-thumb{position:relative;width:64px;height:64px;border:2px solid #eee;border-radius:6px;background:#fafafa;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;}
        .ds-page-thumb.active{border-color:#714B67;}
        .ds-page-num{font-size:11px;color:#999;font-weight:700;}
        .ds-page-thumb-actions{position:absolute;bottom:2px;right:2px;display:flex;gap:2px;opacity:0;transition:.15s;}
        .ds-page-thumb:hover .ds-page-thumb-actions{opacity:1;}
        .ds-page-thumb-actions button{width:16px;height:16px;font-size:8px;border:none;background:#fff;border-radius:3px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.2);}
        .ds-page-add{width:64px;height:64px;flex:none;border:2px dashed #ddd;border-radius:6px;background:none;cursor:pointer;color:#999;}
        .ds-page-add:hover{border-color:#714B67;color:#714B67;}

        .ds-props{width:260px;background:#fff;border-left:1px solid #eee;padding:16px;overflow-y:auto;flex:none;}
        .ds-props-empty{font-size:12.5px;color:#999;line-height:1.5;}
        .ds-props-group{margin-bottom:14px;}
        .ds-props-group label{display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:5px;}
        .ds-props-group input[type=text],.ds-props-group textarea,.ds-props-group select,.ds-props-group input[type=number]{width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:6px;font-size:13px;}
        .ds-props-group input[type=color]{width:100%;height:34px;border:1px solid #ddd;border-radius:6px;padding:2px;cursor:pointer;}
        .ds-props-group input[type=range]{width:100%;}
        .ds-props-row{display:flex;gap:10px;}
        .ds-props-row .ds-props-group{flex:1;}

        .ds-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:.2s;z-index:99999;}
        .ds-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
        .ds-toast.err{background:#c0392b;}

        .ds-crop-stage{position:relative;margin:0 24px;max-height:60vh;overflow:hidden;background:#111;user-select:none;}
        .ds-crop-stage img{display:block;width:100%;height:auto;opacity:.4;}
        .ds-crop-rect{position:absolute;border:2px solid #fff;box-shadow:0 0 0 2000px rgba(0,0,0,.5);cursor:move;}
        .ds-crop-handle{position:absolute;width:14px;height:14px;background:#fff;border:2px solid #714B67;border-radius:50%;}
        .ds-crop-handle[data-h=nw]{top:-8px;left:-8px;cursor:nwse-resize;}
        .ds-crop-handle[data-h=ne]{top:-8px;right:-8px;cursor:nesw-resize;}
        .ds-crop-handle[data-h=sw]{bottom:-8px;left:-8px;cursor:nesw-resize;}
        .ds-crop-handle[data-h=se]{bottom:-8px;right:-8px;cursor:nwse-resize;}
        .ds-crop-actions{display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;}

        #dsGridBtn.active{background:#f0ecfa;color:#714B67;border-color:#714B67;}

        .ds-brand-logo-wrap{position:relative;margin-bottom:14px;}
        .ds-brand-logo-preview{width:100%;border:1px solid #eee;border-radius:8px;cursor:pointer;background:#fafafa;padding:10px;box-sizing:border-box;}
        .ds-brand-remove{position:absolute;top:4px;right:4px;width:20px;height:20px;border:none;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;color:#c0392b;font-size:11px;}
        .ds-brand-colors{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
        .ds-brand-swatch{position:relative;width:34px;height:34px;border-radius:8px;cursor:pointer;border:1px solid rgba(0,0,0,.08);}
        .ds-brand-swatch-del{position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;border:none;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);font-size:9px;color:#c0392b;cursor:pointer;display:none;line-height:1;}
        .ds-brand-swatch:hover .ds-brand-swatch-del{display:block;}
        .ds-brand-swatch-add{width:34px;height:34px;border-radius:8px;border:1.5px dashed #ccc;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#999;}
        .ds-brand-swatch-add:hover{border-color:#714B67;color:#714B67;}
        .ds-brand-fonts{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;}
        .ds-brand-font-row{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #eee;border-radius:6px;font-size:14px;cursor:pointer;}
        .ds-brand-font-row:hover{background:#f9f7f9;}
        .ds-brand-font-del{border:none;background:none;color:#999;cursor:pointer;font-size:13px;}
        .ds-brand-font-del:hover{color:#c0392b;}
        .ds-brand-font-add{display:flex;gap:6px;}
        .ds-brand-font-add select{flex:1;padding:7px 9px;border:1px solid #ddd;border-radius:6px;font-size:12.5px;}
        .ds-brand-font-add button{width:34px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;color:#714B67;}

        .ds-chart-rows{display:flex;flex-direction:column;gap:8px;}
        .ds-chart-row{display:grid;grid-template-columns:1fr 80px 40px 28px;gap:6px;align-items:center;}
        .ds-chart-row input[type=text],.ds-chart-row input[type=number]{padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;}
        .ds-chart-row input[type=color]{width:100%;height:30px;border:1px solid #ddd;border-radius:6px;padding:2px;cursor:pointer;}
        .ds-chart-del{border:none;background:none;color:#c0392b;cursor:pointer;}

        @media (max-width:1100px){
            .ds-props{width:220px;}
            .ds-side-panel.open{width:210px;}
        }
        @media (max-width:900px){
            .ds-props{display:none;}
            .ds-rail{width:56px;}
            .ds-rail-tab span{display:none;}
        }
        `;
        document.head.appendChild(style);
    }

    initDesignStudio();
})();
