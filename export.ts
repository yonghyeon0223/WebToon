import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const PASSAGE = '2025-06-busan-10th-Q24-open-to-interpretation';
const PASSAGE_DIR = path.join('passages', PASSAGE);
const IMAGES_DIR = path.join(PASSAGE_DIR, 'images/pages');
const OUTPUT_PATH = path.join(PASSAGE_DIR, `${PASSAGE}.html`);
const TITLE = 'Mr. Realistic 시리즈';

interface PageData {
  id: string;
  src: string;
}

function detectMime(b: Buffer): string {
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  return 'application/octet-stream';
}

async function main(): Promise<void> {
  let files: string[];
  try {
    files = await fs.readdir(IMAGES_DIR);
  } catch {
    console.error(`Image directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const pageFiles = files
    .filter((f) => /^p\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));

  if (pageFiles.length === 0) {
    console.error(`No page images in ${IMAGES_DIR}. Run 'npm run generate' first.`);
    process.exit(1);
  }

  console.log(`Found ${pageFiles.length} page(s). Embedding into HTML...`);

  const pages: PageData[] = [];
  for (const fname of pageFiles) {
    const id = fname.replace('.png', '');
    const bytes = await fs.readFile(path.join(IMAGES_DIR, fname));
    const mime = detectMime(bytes);
    pages.push({
      id,
      src: `data:${mime};base64,${bytes.toString('base64')}`,
    });
    process.stdout.write(`  + ${id} (${(bytes.length / 1024).toFixed(0)} KB)\n`);
  }

  const html = buildHtml(pages);
  await fs.writeFile(OUTPUT_PATH, html);

  const sizeMB = (Buffer.byteLength(html) / 1024 / 1024).toFixed(1);
  console.log(`\n✓ ${OUTPUT_PATH}  (${pages.length} pages, ${sizeMB} MB)`);
}

function buildHtml(pages: PageData[]): string {
  const pagesJson = JSON.stringify(pages);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#000000">
<title>${escapeHtml(TITLE)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Pretendard','Segoe UI',sans-serif;height:100vh;height:100dvh;overflow:hidden;overscroll-behavior:none;user-select:none;-webkit-user-select:none}
.stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000}
.stage img{max-width:100%;max-height:100%;width:auto;height:auto;display:block;pointer-events:none;transition:opacity .15s ease;-webkit-user-drag:none}
.stage img.fading{opacity:0}
.tap-zones{position:fixed;inset:0;display:flex;z-index:5}
.tap-zones .zone{cursor:pointer}
.tap-zones .zone.left,.tap-zones .zone.right{flex:1.2}
.tap-zones .zone.center{flex:.6}
.topbar{position:fixed;top:0;left:0;right:0;padding-top:env(safe-area-inset-top);background:linear-gradient(to bottom,rgba(0,0,0,.85),rgba(0,0,0,0));z-index:10;transition:opacity .25s ease,transform .25s ease}
.topbar.hidden{opacity:0;transform:translateY(-100%);pointer-events:none}
.topbar-inner{display:flex;align-items:center;gap:12px;padding:10px 16px 18px}
.back-btn{background:none;border:none;color:#fff;font-size:22px;cursor:pointer;padding:8px;margin-left:-8px;line-height:1;font-family:inherit}
.topbar-title{flex:1;font-size:14px;font-weight:500;color:#f0e6d2;letter-spacing:.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.topbar-indicator{font-size:12px;color:#aaa;font-variant-numeric:tabular-nums}
.bottombar{position:fixed;bottom:0;left:0;right:0;padding:18px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(to top,rgba(0,0,0,.85),rgba(0,0,0,0));z-index:10;transition:opacity .25s ease,transform .25s ease}
.bottombar.hidden{opacity:0;transform:translateY(100%);pointer-events:none}
.progress-row{display:flex;align-items:center;gap:12px}
.progress-label{font-size:11px;color:#888;font-variant-numeric:tabular-nums;min-width:36px;text-align:right}
.progress-slider{flex:1;-webkit-appearance:none;appearance:none;height:3px;background:rgba(255,255,255,.16);border-radius:2px;outline:none;padding:0;margin:0;cursor:pointer}
.progress-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#f0e6d2;cursor:pointer;border:none;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
.progress-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#f0e6d2;cursor:pointer;border:none;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
.end-screen{position:fixed;inset:0;background:rgba(0,0,0,.94);display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:30;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.end-screen.visible{display:flex}
.end-screen .badge{font-size:48px;font-weight:200;color:#f0e6d2;letter-spacing:.15em;margin-bottom:8px}
.end-screen .label{font-size:13px;color:#888;letter-spacing:.05em}
.end-screen .restart{margin-top:32px;padding:14px 28px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#f0e6d2;border-radius:24px;font-size:14px;cursor:pointer;font-family:inherit;transition:background .15s ease}
.end-screen .restart:hover{background:rgba(255,255,255,.14)}
.empty{padding:80px 24px;text-align:center;color:#888;font-size:14px}
</style>
</head>
<body>

<div class="stage" id="stage">
  <img id="img" alt="">
</div>

<div class="tap-zones" id="tapZones">
  <div class="zone left" data-action="prev"></div>
  <div class="zone center" data-action="toggle"></div>
  <div class="zone right" data-action="next"></div>
</div>

<div class="topbar" id="topbar">
  <div class="topbar-inner">
    <button class="back-btn" type="button" id="backBtn" aria-label="back">←</button>
    <div class="topbar-title">${escapeHtml(TITLE)}</div>
    <div class="topbar-indicator" id="indicator">— / —</div>
  </div>
</div>

<div class="bottombar" id="bottombar">
  <div class="progress-row">
    <input type="range" id="slider" class="progress-slider" min="1" max="1" value="1" aria-label="page slider">
    <div class="progress-label" id="pageLabel">—</div>
  </div>
</div>

<div class="end-screen" id="endScreen">
  <div class="badge">— 끝 —</div>
  <div class="label">완결입니다</div>
  <button class="restart" type="button" id="restartBtn">처음부터 다시 보기</button>
</div>

<script>
const PAGES = ${pagesJson};
const stage = document.getElementById('stage');
const img = document.getElementById('img');
const indicator = document.getElementById('indicator');
const pageLabel = document.getElementById('pageLabel');
const slider = document.getElementById('slider');
const topbar = document.getElementById('topbar');
const bottombar = document.getElementById('bottombar');
const tapZones = document.getElementById('tapZones');
const endScreen = document.getElementById('endScreen');
const restartBtn = document.getElementById('restartBtn');
const backBtn = document.getElementById('backBtn');

if (!PAGES.length) {
  stage.innerHTML = '<div class="empty">No pages.</div>';
}

let cursor = 0;
let uiVisible = true;
let hideTimer = null;

function render() {
  const page = PAGES[cursor];
  if (!page) return;
  img.classList.add('fading');
  setTimeout(() => {
    img.src = page.src;
    img.alt = page.id;
    img.classList.remove('fading');
  }, 100);
  indicator.textContent = (cursor + 1) + ' / ' + PAGES.length;
  pageLabel.textContent = page.id;
  slider.value = String(cursor + 1);
  history.replaceState(null, '', '#' + page.id);
}

function go(delta) {
  if (endScreen.classList.contains('visible')) return;
  const next = cursor + delta;
  if (next < 0) return;
  if (next >= PAGES.length) {
    showEnd();
    return;
  }
  cursor = next;
  render();
  showUI();
}

function jumpTo(idx) {
  if (idx < 0 || idx >= PAGES.length) return;
  cursor = idx;
  render();
  showUI();
}

function showUI() {
  uiVisible = true;
  topbar.classList.remove('hidden');
  bottombar.classList.remove('hidden');
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(hideUI, 3000);
}

function hideUI() {
  uiVisible = false;
  topbar.classList.add('hidden');
  bottombar.classList.add('hidden');
}

function toggleUI() {
  if (uiVisible) hideUI();
  else showUI();
}

function showEnd() {
  endScreen.classList.add('visible');
  hideUI();
}

function hideEnd() {
  endScreen.classList.remove('visible');
}

tapZones.addEventListener('click', (e) => {
  const action = e.target && e.target.dataset && e.target.dataset.action;
  if (action === 'prev') go(-1);
  else if (action === 'next') go(1);
  else if (action === 'toggle') toggleUI();
});

slider.addEventListener('input', (e) => {
  jumpTo(parseInt(e.target.value, 10) - 1);
});
slider.addEventListener('mousedown', () => { if (hideTimer) clearTimeout(hideTimer); });
slider.addEventListener('touchstart', () => { if (hideTimer) clearTimeout(hideTimer); }, { passive: true });
slider.addEventListener('mouseup', showUI);
slider.addEventListener('touchend', showUI, { passive: true });

document.addEventListener('keydown', (e) => {
  if (endScreen.classList.contains('visible')) {
    if (e.key === 'Escape' || e.key === 'Enter') hideEnd();
    return;
  }
  if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    go(1);
  } else if (e.key === 'Escape') {
    toggleUI();
  }
});

let touchStartX = null, touchStartY = null;
stage.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) go(-1);
    else go(1);
  }
}, { passive: true });

restartBtn.addEventListener('click', () => {
  cursor = 0;
  render();
  hideEnd();
  showUI();
});

backBtn.addEventListener('click', () => {
  if (history.length > 1) history.back();
  else window.close();
});

if (PAGES.length) {
  slider.max = String(PAGES.length);
  const hash = window.location.hash.replace('#', '');
  const found = PAGES.findIndex((p) => p.id === hash);
  if (found >= 0) cursor = found;
  render();
  showUI();
}
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main().catch((err) => {
  console.error(
    'Fatal:',
    err instanceof Error ? err.stack ?? err.message : err,
  );
  process.exit(1);
});
