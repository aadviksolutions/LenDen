const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const viewports = [
  { name: 'desktop-1664x936', width: 1664, height: 936 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'laptop-1366x768', width: 1366, height: 768 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Capturing screenshots at requested viewports...');

for (const vp of viewports) {
  const outFile = path.join(outputDir, `${vp.name}.png`);
  const profileDir = path.join(process.cwd(), '.chrome-temp', vp.name);
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    `--user-data-dir=${profileDir}`,
    `--window-size=${vp.width},${vp.height}`,
    '--hide-scrollbars',
    `--screenshot=${outFile}`,
    'http://localhost:3000/login',
  ];

  const result = spawnSync(chromePath, args, { stdio: 'pipe' });
  const exists = fs.existsSync(outFile);
  const size = exists ? fs.statSync(outFile).size : 0;
  console.log(`${vp.name} (${vp.width}x${vp.height}): ${exists ? `SAVED (${size} bytes)` : 'FAILED'}`);
  if (!exists && result.stderr) {
    console.log('Stderr:', result.stderr.toString());
  }
}
