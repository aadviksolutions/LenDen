const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: 'mobile-320x640', width: 320, height: 640, mobile: true },
  { name: 'mobile-360x800', width: 360, height: 800, mobile: true },
  { name: 'mobile-375x812', width: 375, height: 812, mobile: true },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'mobile-412x915', width: 412, height: 915, mobile: true },
  { name: 'mobile-430x932', width: 430, height: 932, mobile: true },
  { name: 'desktop-1366x768', width: 1366, height: 768, mobile: false },
  { name: 'desktop-1440x900', width: 1440, height: 900, mobile: false },
  { name: 'desktop-1664x936', width: 1664, height: 936, mobile: false },
];

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function run() {
  const profileDir = path.join(process.cwd(), '.chrome-temp', 'cdp-suite-' + Date.now());
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--hide-scrollbars',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getPageTarget() {
    return new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json', (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          const targets = JSON.parse(raw);
          const t = targets.find(x => x.type === 'page');
          if (t) resolve(t);
          else reject(new Error('No page target'));
        });
      }).on('error', reject);
    });
  }

  const page = await getPageTarget();
  const wsUrl = new URL(page.webSocketDebuggerUrl);

  const socket = net.createConnection({ host: wsUrl.hostname, port: wsUrl.port });

  await new Promise((resolve) => {
    socket.on('connect', () => {
      const key = Buffer.from('testkey123456789').toString('base64');
      const req = `GET ${wsUrl.pathname} HTTP/1.1\r\nHost: ${wsUrl.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
      socket.write(req);
    });

    let buffer = Buffer.alloc(0);
    socket.on('data', function onUpgrade(chunk) {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.toString('utf8').includes('\r\n\r\n')) {
        socket.removeListener('data', onUpgrade);
        resolve();
      }
    });
  });

  let msgId = 1;
  const pending = new Map();
  let wsBuffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    wsBuffer = Buffer.concat([wsBuffer, chunk]);
    while (wsBuffer.length >= 2) {
      const secondByte = wsBuffer[1];
      let len = secondByte & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (wsBuffer.length < 4) break;
        len = wsBuffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (wsBuffer.length < 10) break;
        len = Number(wsBuffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (wsBuffer.length < offset + len) break;
      const payload = wsBuffer.slice(offset, offset + len);
      wsBuffer = wsBuffer.slice(offset + len);

      try {
        const msg = JSON.parse(payload.toString('utf8'));
        if (msg.id && pending.has(msg.id)) {
          const cb = pending.get(msg.id);
          pending.delete(msg.id);
          cb(msg);
        }
      } catch (e) {}
    }
  });

  function sendCommand(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      pending.set(id, resolve);
      const jsonStr = JSON.stringify({ id, method, params });
      const rawPayload = Buffer.from(jsonStr, 'utf8');
      const len = rawPayload.length;
      const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
      const maskedPayload = Buffer.alloc(len);
      for (let i = 0; i < len; i++) {
        maskedPayload[i] = rawPayload[i] ^ mask[i % 4];
      }

      let header;
      if (len < 126) {
        header = Buffer.from([0x81, 0x80 | len, 0x12, 0x34, 0x56, 0x78]);
      } else if (len < 65536) {
        header = Buffer.alloc(8);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(len, 2);
        mask.copy(header, 4);
      } else {
        header = Buffer.alloc(14);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(len), 2);
        mask.copy(header, 10);
      }
      socket.write(Buffer.concat([header, maskedPayload]));
    });
  }

  // Navigate to login
  console.log('Navigating to http://localhost:3000/login?nointro=true ...');
  await sendCommand('Page.enable');
  await sendCommand('Page.navigate', { url: 'http://localhost:3000/login?nointro=true' });
  await new Promise(r => setTimeout(r, 3000)); // wait for full load & hydration

  console.log('Starting screenshot captures across all requested viewports...');

  for (const vp of viewports) {
    // 1. Set device metrics override
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
      screenOrientation: { angle: 0, type: 'portraitPrimary' }
    });

    await new Promise(r => setTimeout(r, 600)); // wait for layout recalculation

    // 2. Capture screenshot
    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (res.result && res.result.data) {
      const outFile = path.join(outputDir, `${vp.name}.png`);
      fs.writeFileSync(outFile, Buffer.from(res.result.data, 'base64'));
      console.log(`[PASS] ${vp.name} (${vp.width}x${vp.height}): ${fs.statSync(outFile).size} bytes`);
    } else {
      console.log(`[FAIL] ${vp.name}:`, res.error || 'No data');
    }
  }

  // Also capture Mobile Menu Open state
  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await sendCommand('Runtime.evaluate', {
    expression: `(function() {
      const btn = document.querySelector('button[aria-label*="navigation menu"]');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 500));
  const menuRes = await sendCommand('Page.captureScreenshot', { format: 'png' });
  if (menuRes.result && menuRes.result.data) {
    const outFile = path.join(outputDir, `mobile-menu-drawer-390x844.png`);
    fs.writeFileSync(outFile, Buffer.from(menuRes.result.data, 'base64'));
    console.log(`[PASS] mobile-menu-drawer-390x844: ${fs.statSync(outFile).size} bytes`);
  }

  socket.end();
  chrome.kill();
  console.log('All captures complete!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
