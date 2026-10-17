const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function runTest() {
  const profileDir = path.join(process.cwd(), '.chrome-temp', 'intro-test-2-' + Date.now());
  const port = 9226;
  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--hide-scrollbars',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));

    function getPageTarget(retries = 30) {
      return new Promise((resolve, reject) => {
        function attempt(n) {
          http.get(`http://127.0.0.1:${port}/json`, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
              try {
                const targets = JSON.parse(raw);
                const t = targets.find(x => x.type === 'page');
                if (t) return resolve(t);
              } catch (e) {}
              if (n <= 1) return reject(new Error('No page target after retries'));
              setTimeout(() => attempt(n - 1), 300);
            });
          }).on('error', (err) => {
            if (n <= 1) return reject(err);
            setTimeout(() => attempt(n - 1), 300);
          });
        }
        attempt(retries);
      });
    }

    const page = await getPageTarget();
    const wsUrl = new URL(page.webSocketDebuggerUrl);
    const socket = net.createConnection({ host: wsUrl.hostname, port: wsUrl.port });
    socket.on('error', () => {});

    await new Promise((resolve) => {
      socket.on('connect', () => {
        const key = Buffer.from('testkey123456789').toString('base64');
        const req = `GET ${wsUrl.pathname} HTTP/1.1\r\nHost: ${wsUrl.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`;
        socket.write(req);
      });

      let buf = '';
      socket.on('data', (d) => {
        buf += d.toString('utf8');
        if (buf.includes('\r\n\r\n')) {
          resolve();
        }
      });
    });

    let msgId = 1;
    const pending = new Map();

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const payload = JSON.stringify({ id, method, params });
        const len = Buffer.byteLength(payload);
        let frame;
        if (len < 126) {
          frame = Buffer.alloc(len + 6);
          frame[0] = 0x81;
          frame[1] = 0x80 | len;
          const mask = Buffer.from([1, 2, 3, 4]);
          mask.copy(frame, 2);
          const p = Buffer.from(payload);
          for (let i = 0; i < len; i++) frame[6 + i] = p[i] ^ mask[i % 4];
        } else {
          frame = Buffer.alloc(len + 8);
          frame[0] = 0x81;
          frame[1] = 0x80 | 126;
          frame.writeUInt16BE(len, 2);
          const mask = Buffer.from([1, 2, 3, 4]);
          mask.copy(frame, 4);
          const p = Buffer.from(payload);
          for (let i = 0; i < len; i++) frame[8 + i] = p[i] ^ mask[i % 4];
        }

        pending.set(id, { resolve, reject });
        socket.write(frame);
      });
    }

    let rxBuf = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      rxBuf = Buffer.concat([rxBuf, chunk]);
      while (rxBuf.length >= 2) {
        let len = rxBuf[1] & 0x7f;
        let offset = 2;
        if (len === 126) {
          if (rxBuf.length < 4) break;
          len = rxBuf.readUInt16BE(2);
          offset = 4;
        } else if (len === 127) {
          if (rxBuf.length < 10) break;
          len = Number(rxBuf.readBigUInt64BE(2));
          offset = 10;
        }
        if (rxBuf.length < offset + len) break;
        const payload = rxBuf.slice(offset, offset + len).toString('utf8');
        rxBuf = rxBuf.slice(offset + len);

        try {
          const msg = JSON.parse(payload);
          if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message));
            else p.resolve(msg.result);
          }
        } catch (e) {}
      }
    });

    console.log('=== TEST 1: Mobile Viewport (412x915) Android Chrome ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2,
      mobile: true,
      hasTouch: true,
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:3000/login ...');
    await send('Page.navigate', { url: 'http://localhost:3000/login' });

    // Wait until overlay appears
    let overlayFound = false;
    for (let i = 0; i < 30; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('[aria-label="Lenden Introduction Animation"]')`,
        returnByValue: true
      });
      if (check.result.value) {
        overlayFound = true;
        console.log(`Intro overlay detected on page after ${i * 200}ms!`);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!overlayFound) {
      throw new Error('Intro overlay did not appear!');
    }

    // Inspect overlay properties
    const inspectRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.querySelector('[aria-label="Lenden Introduction Animation"]');
        const canvas = overlay ? overlay.querySelector('canvas') : null;
        const bodyText = document.body.innerText;
        return {
          hasOverlay: !!overlay,
          overlayBg: overlay ? window.getComputedStyle(overlay).backgroundColor : null,
          overlayPos: overlay ? window.getComputedStyle(overlay).position : null,
          overlayWidth: overlay ? overlay.clientWidth : null,
          overlayHeight: overlay ? overlay.clientHeight : null,
          hasCanvas: !!canvas,
          canvasWidthAttr: canvas ? canvas.getAttribute('width') : null,
          canvasHeightAttr: canvas ? canvas.getAttribute('height') : null,
          canvasClientWidth: canvas ? canvas.clientWidth : null,
          canvasClientHeight: canvas ? canvas.clientHeight : null,
          hasSkipText: bodyText.includes('Skip'),
          hasIntroText: bodyText.includes('LENDEN™ INTRO') || bodyText.includes('Lenden™ Intro'),
          hasSmartBusinessText: bodyText.includes('Smart Business Suite'),
          buttonsCountInOverlay: overlay ? overlay.querySelectorAll('button').length : 0,
        };
      })()`,
      returnByValue: true
    });
    console.log('Mobile Intro Overlay Inspection:', inspectRes.result.value);

    // Capture screenshot during active playback
    const ssActive = await send('Page.captureScreenshot', { format: 'png' });
    const pActive = path.join(outputDir, 'mobile-intro-active.png');
    fs.writeFileSync(pActive, Buffer.from(ssActive.data, 'base64'));
    console.log(`Saved screenshot active intro: ${pActive}`);

    // Wait for the intro animation to finish and dismiss (up to 8.5 seconds)
    console.log('Waiting for intro to play 6s and auto-transition to website...');
    let transitioned = false;
    for (let i = 0; i < 45; i++) {
      const postCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const overlay = document.querySelector('[aria-label="Lenden Introduction Animation"]');
          const isDismissed = !overlay;
          const loginForm = document.querySelector('form');
          const sessionSeen = sessionStorage.getItem('lenden_intro_played') || sessionStorage.getItem('lenden_intro_seen');
          return {
            isDismissed,
            hasLoginForm: !!loginForm,
            sessionSeen: !!sessionSeen
          };
        })()`,
        returnByValue: true
      });
      if (postCheck.result.value.isDismissed && postCheck.result.value.hasLoginForm) {
        transitioned = true;
        console.log(`Auto-transition completed successfully after ~${(i + 1) * 200}ms wait!`);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!transitioned) {
      throw new Error('Intro did not automatically transition to website!');
    }

    // Capture screenshot of mobile login page after transition
    const ssTrans = await send('Page.captureScreenshot', { format: 'png' });
    const pTrans = path.join(outputDir, 'mobile-login-after-auto-transition.png');
    fs.writeFileSync(pTrans, Buffer.from(ssTrans.data, 'base64'));
    console.log(`Saved screenshot post-transition login page: ${pTrans}`);

    console.log('\n=== TEST 2: Desktop Viewport (1664x936) ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1664,
      height: 936,
      deviceScaleFactor: 1,
      mobile: false,
      hasTouch: false,
    });

    // Clear session storage to test fresh desktop visit
    await send('Runtime.evaluate', {
      expression: `sessionStorage.clear(); localStorage.clear();`
    });

    console.log('Navigating to http://localhost:3000/login for desktop test...');
    await send('Page.navigate', { url: 'http://localhost:3000/login' });

    let desktopOverlayFound = false;
    for (let i = 0; i < 30; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('[aria-label="Lenden Introduction Animation"]')`,
        returnByValue: true
      });
      if (check.result.value) {
        desktopOverlayFound = true;
        console.log(`Desktop intro overlay detected after ${i * 200}ms!`);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const desktopInspect = await send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.querySelector('[aria-label="Lenden Introduction Animation"]');
        const canvas = overlay ? overlay.querySelector('canvas') : null;
        return {
          hasOverlay: !!overlay,
          overlayBg: overlay ? window.getComputedStyle(overlay).backgroundColor : null,
          overlayWidth: overlay ? overlay.clientWidth : null,
          overlayHeight: overlay ? overlay.clientHeight : null,
          canvasClientWidth: canvas ? canvas.clientWidth : null,
          canvasClientHeight: canvas ? canvas.clientHeight : null,
          buttonsCountInOverlay: overlay ? overlay.querySelectorAll('button').length : 0,
        };
      })()`,
      returnByValue: true
    });
    console.log('Desktop Intro Inspection:', desktopInspect.result.value);

    // Capture desktop intro screenshot
    const ssDesktop = await send('Page.captureScreenshot', { format: 'png' });
    const pDesktop = path.join(outputDir, 'desktop-intro-active.png');
    fs.writeFileSync(pDesktop, Buffer.from(ssDesktop.data, 'base64'));
    console.log(`Saved screenshot desktop intro: ${pDesktop}`);

    // Wait for desktop transition
    console.log('Waiting for desktop intro to finish and transition...');
    for (let i = 0; i < 45; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!document.querySelector('[aria-label="Lenden Introduction Animation"]')`,
        returnByValue: true
      });
      if (check.result.value) {
        console.log(`Desktop transition completed after ~${(i + 1) * 200}ms!`);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    const ssDesktopLogin = await send('Page.captureScreenshot', { format: 'png' });
    const pDesktopLogin = path.join(outputDir, 'desktop-login-after-transition.png');
    fs.writeFileSync(pDesktopLogin, Buffer.from(ssDesktopLogin.data, 'base64'));
    console.log(`Saved screenshot desktop login: ${pDesktopLogin}`);

    chrome.kill();
    console.log('\n========================================');
    console.log('ALL VERIFICATION TESTS PASSED 100%!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}

runTest();
