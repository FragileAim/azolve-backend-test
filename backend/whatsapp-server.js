const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.WA_WEB_PORT || 3001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let browser = null;
let page = null;
let status = 'stopped'; // stopped | launching | ready
let waState = 'unknown'; // qr | loading | logged_in | unknown
let screenshotInterval = null;
let activeConnections = 0;

const userDataDir = path.resolve(__dirname, 'whatsapp_session_data');

console.log(`[WA Server] Session directory: ${userDataDir}`);

async function launchBrowser() {
  if (status === 'launching' || status === 'ready') {
    console.log(`[WA Server] Browser already launch requested or running (status: ${status})`);
    return;
  }
  
  status = 'launching';
  io.emit('status', { status, message: 'Launching WhatsApp Web...' });
  
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
    
    console.log('[WA Server] Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      userDataDir: userDataDir,
      defaultViewport: { width: 1280, height: 900 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,900'
      ]
    });
    
    console.log('[WA Server] Creating new page...');
    page = (await browser.pages())[0] || await browser.newPage();
    
    // Set a realistic User-Agent to prevent bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Bypass webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    status = 'ready';
    io.emit('status', { status, message: 'Browser Ready' });
    
    console.log('[WA Server] Navigating to https://web.whatsapp.com...');
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('[WA Server] Start streaming...');
    startStreaming();
  } catch (err) {
    console.error('[WA Server] Failed to launch browser:', err);
    status = 'stopped';
    io.emit('status', { status, message: 'Failed to launch browser: ' + err.message });
  }
}

function startStreaming() {
  if (screenshotInterval) clearInterval(screenshotInterval);
  
  screenshotInterval = setInterval(async () => {
    if (!page || page.isClosed()) return;
    
    try {
      // 1. Capture Screenshot if there are active WebSocket connections
      if (activeConnections > 0) {
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 50, encoding: 'base64' });
        io.emit('screenshot', { image: `data:image/jpeg;base64,${screenshot}` });
      }
      
      // 2. Detect State (QR, Loading, Logged In)
      let newState = 'unknown';
      
      const stateObj = await page.evaluate(() => {
        const hasQr = !!document.querySelector('canvas') || !!document.querySelector('[data-testid="qrcode"]');
        const hasLoader = !!document.querySelector('progress') || !!document.querySelector('[id="initial_startup"]') || !!document.querySelector('span[data-icon="loader"]');
        const hasChatList = !!document.querySelector('[data-testid="chat-list"]') || !!document.querySelector('#pane-side');
        return { hasQr, hasLoader, hasChatList };
      });
      
      if (stateObj.hasQr) {
        newState = 'qr';
      } else if (stateObj.hasLoader) {
        newState = 'loading';
      } else if (stateObj.hasChatList) {
        newState = 'logged_in';
      }
      
      if (newState !== waState) {
        waState = newState;
        console.log(`[WA Server] State changed to: ${waState}`);
        io.emit('wa_state', { state: waState });
      }
    } catch (err) {
      // Ignore errors caused by transitions or navigation
      // console.debug('[WA Server] Streaming error (expected during transition):', err.message);
    }
  }, 350);
}

// REST Endpoints
app.post('/api/launch', async (req, res) => {
  launchBrowser();
  res.json({ success: true });
});

app.post('/api/reload', async (req, res) => {
  if (page) {
    try {
      console.log('[WA Server] Reloading page...');
      await page.reload({ waitUntil: 'networkidle2' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(400).json({ error: 'Browser not launched' });
  }
});

app.post('/api/clear-session', async (req, res) => {
  try {
    console.log('[WA Server] Disconnecting session...');
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }
    
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    
    if (fs.existsSync(userDataDir)) {
      // Small delay to release file locks before deleting
      await new Promise(resolve => setTimeout(resolve, 1000));
      fs.rmSync(userDataDir, { recursive: true, force: true });
      console.log('[WA Server] Session directory cleared.');
    }
    
    status = 'stopped';
    waState = 'unknown';
    
    io.emit('status', { status, message: 'Session disconnected' });
    io.emit('wa_state', { state: waState });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[WA Server] Error clearing session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  activeConnections++;
  console.log(`[WA Server] Client connected. Active: ${activeConnections}`);
  
  // Send current status immediately
  socket.emit('status', { status, message: status === 'ready' ? 'Browser Ready' : 'Not Connected' });
  socket.emit('wa_state', { state: waState });
  
  socket.on('launch', () => {
    launchBrowser();
  });
  
  socket.on('click', async ({ x, y }) => {
    if (!page) return;
    try {
      await page.mouse.click(x, y);
    } catch (err) {
      console.error('[WA Server] Click error:', err.message);
    }
  });
  
  socket.on('scroll', async ({ x, y, deltaY }) => {
    if (!page) return;
    try {
      await page.mouse.move(x, y);
      if (page.mouse.wheel) {
        await page.mouse.wheel({ deltaY });
      } else {
        await page.evaluate((dy) => {
          window.scrollBy(0, dy);
        }, deltaY);
      }
    } catch (err) {
      console.error('[WA Server] Scroll error:', err.message);
    }
  });
  
  socket.on('type', async ({ text }) => {
    if (!page) return;
    try {
      await page.keyboard.type(text);
    } catch (err) {
      console.error('[WA Server] Type error:', err.message);
    }
  });
  
  socket.on('keypress', async ({ key }) => {
    if (!page) return;
    try {
      if (key.startsWith('Control+')) {
        const char = key.split('+')[1];
        await page.keyboard.down('Control');
        await page.keyboard.press(char);
        await page.keyboard.up('Control');
      } else {
        await page.keyboard.press(key);
      }
    } catch (err) {
      console.error('[WA Server] Keypress error:', err.message);
    }
  });
  
  socket.on('disconnect', () => {
    activeConnections--;
    console.log(`[WA Server] Client disconnected. Active: ${activeConnections}`);
  });
});

// Auto-cleanup on server exit
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`[WA Server] Running on http://localhost:${PORT}`);
});
