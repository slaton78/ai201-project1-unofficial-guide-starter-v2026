/**
 * Renders the ORIGINAL Campus Rally mark (an abstract pennant-and-star badge drawn in this
 * file) to the PNG icons Expo needs, using a local headless Chrome/Chromium.
 *
 * Usage: CHROME_PATH=/path/to/chrome node scripts/generate-icons.mjs
 * Output: assets/images/{icon,adaptive-icon,splash-icon,favicon}.png
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH;
if (!chrome) {
  console.error('Set CHROME_PATH to a Chrome/Chromium binary to regenerate icons.');
  process.exit(1);
}

const mark = (scale) => `
  <g transform="translate(512 512) scale(${scale}) translate(-50 -50)">
    <circle cx="50" cy="50" r="46" fill="#15244A" stroke="#FFC94A" stroke-width="5"/>
    <path d="M30 24 L30 80" stroke="#F5F7FF" stroke-width="5" stroke-linecap="round"/>
    <polygon points="32,26 78,40 32,56" fill="#4FD1C5"/>
    <polygon points="52,64 55.5,72 64,72.5 57.5,78 59.8,86 52,81.5 44.2,86 46.5,78 40,72.5 48.5,72" fill="#FFC94A"/>
  </g>`;

const svg = (
  body,
  background,
) => `<!doctype html><html><head><style>html,body{margin:0;background:${background}}</style></head>
<body><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg></body></html>`;

const glow = `<defs><radialGradient id="g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#1F3A78"/><stop offset="1" stop-color="#0B1630"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>`;

const outputs = [
  { file: 'icon.png', html: svg(glow + mark(8.4), '#0B1630'), size: 1024 },
  { file: 'adaptive-icon.png', html: svg(mark(6.2), 'transparent'), size: 1024 },
  { file: 'splash-icon.png', html: svg(mark(9.6), 'transparent'), size: 1024 },
  { file: 'favicon.png', html: svg(glow + mark(9.4), '#0B1630'), size: 1024, resize: 48 },
];

const work = mkdtempSync(path.join(tmpdir(), 'campus-rally-icons-'));
for (const out of outputs) {
  const page = path.join(work, `${out.file}.html`);
  const size = out.resize ?? out.size;
  const html = out.resize
    ? out.html.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)
    : out.html;
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${path.join(root, 'assets', 'images', out.file)}`,
      `file://${page}`,
    ],
    { stdio: 'ignore' },
  );
  console.log(`wrote assets/images/${out.file}`);
}
