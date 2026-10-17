const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.join(process.cwd(), 'screenshots');
const outFile = path.join(outputDir, 'desktop-1664x936.png');
const profileDir = path.join(process.cwd(), '.chrome-temp', 'quick-1664');
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const args = [
  '--headless=new',
  '--disable-gpu',
  `--user-data-dir=${profileDir}`,
  '--window-size=1664,936',
  '--hide-scrollbars',
  `--screenshot=${outFile}`,
  'http://localhost:3000/login',
];

const res = spawnSync(chromePath, args, { stdio: 'inherit' });
console.log('Capture finished, file size:', fs.statSync(outFile).size);
