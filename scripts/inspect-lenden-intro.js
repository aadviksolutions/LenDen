const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'lenden-intro');
if (!fs.existsSync(dir)) {
  console.log(JSON.stringify({ error: 'DIR_NOT_FOUND', dir }));
  process.exit(1);
}

const allEntries = fs.readdirSync(dir);
const jpgFiles = allEntries.filter(f => /\.(jpe?g)$/i.test(f));

// Natural sort
const naturalSorted = [...jpgFiles].sort((a, b) => 
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
);

function getJpgDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) {
    return { error: 'Not a valid JPEG (magic bytes missing)' };
  }
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xFF) break;
    // skip fill bytes
    while (buf[offset] === 0xFF && offset < buf.length) {
      offset++;
    }
    const marker = buf[offset++];
    if (marker === 0xD9 || marker === 0xDA) {
      // EOI or SOS marker reached without SOF
      break;
    }
    const len = buf.readUInt16BE(offset);
    if ([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF].includes(marker)) {
      const height = buf.readUInt16BE(offset + 3);
      const width = buf.readUInt16BE(offset + 5);
      return { width, height };
    }
    offset += len;
  }
  return null;
}

let validCount = 0;
let errors = [];
let dimensionsMap = {};
let sizes = [];
let fileDetails = [];

naturalSorted.forEach((file, index) => {
  const filePath = path.join(dir, file);
  try {
    const stat = fs.statSync(filePath);
    sizes.push(stat.size);
    const dim = getJpgDimensions(filePath);
    if (!dim || dim.error) {
      errors.push({ file, error: dim?.error || 'Could not parse dimensions' });
    } else {
      validCount++;
      const dimKey = `${dim.width}x${dim.height}`;
      dimensionsMap[dimKey] = (dimensionsMap[dimKey] || 0) + 1;
      fileDetails.push({ index: index + 1, file, size: stat.size, width: dim.width, height: dim.height });
    }
  } catch (err) {
    errors.push({ file, error: err.message });
  }
});

const report = {
  totalFiles: allEntries.length,
  jpgFilesCount: jpgFiles.length,
  validCount,
  errorsCount: errors.length,
  errors,
  dimensionsMap,
  minSize: Math.min(...sizes),
  maxSize: Math.max(...sizes),
  avgSize: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
  firstFrame: fileDetails[0],
  lastFrame: fileDetails[fileDetails.length - 1],
  sampleSequence: fileDetails.slice(0, 10).map(f => f.file),
  last10Sequence: fileDetails.slice(-10).map(f => f.file),
  allFilenamesNatural: naturalSorted
};

console.log(JSON.stringify(report, null, 2));
