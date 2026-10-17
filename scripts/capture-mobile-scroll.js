const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(process.cwd(), 'screenshots');

async function run() {
  const profileDir = path.join(process.cwd(), '.chrome-temp', 'scroll-suite-' + Date.now());
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--hide-scrollbars',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  function getPageTarget(retries = 10) {
    return new Promise((resolve, reject) => {
      function attempt(left) {
        http.get('http://127.0.0.1:9222/json', (res) => {
          let raw = '';
          res.on('data', chunk => raw += chunk);
          res.on('end', () => {
            try {
              const targets = JSON.parse(raw);
              const t = targets.find(x => x.type === 'page');
              if (t) return resolve(t);
            } catch (e) {}
            if (left <= 0) return reject(new Error('No page target'));
            setTimeout(() => attempt(left - 1), 600);
          });
        }).on('error', (err) => {
          if (left <= 0) return reject(err);
          setTimeout(() => attempt(left - 1), 600);
        });
      }
      attempt(retries);
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
  await sendCommand('Page.enable');
  await sendCommand('Page.navigate', { url: 'http://localhost:3000/login?nointro=true' });
  await new Promise(r => setTimeout(r, 2500));

  await sendCommand('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });

  // 1. Scroll to login card
  await sendCommand('Runtime.evaluate', {
    expression: `document.getElementById('mobile-login-section').scrollIntoView({ behavior: 'instant', block: 'start' })`
  });
  await new Promise(r => setTimeout(r, 400));
  let res = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'mobile-scrolled-login-390x844.png'), Buffer.from(res.result.data, 'base64'));
  console.log('[PASS] mobile-scrolled-login-390x844.png saved');

  // 2. Scroll to categories & footer
  await sendCommand('Runtime.evaluate', {
    expression: `window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })`
  });
  await new Promise(r => setTimeout(r, 400));
  res = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outputDir, 'mobile-scrolled-categories-footer-390x844.png'), Buffer.from(res.result.data, 'base64'));
  console.log('[PASS] mobile-scrolled-categories-footer-390x844.png saved');

  socket.end();
  chrome.kill();
}

run().catch(console.error);
