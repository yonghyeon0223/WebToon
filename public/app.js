'use strict';

const state = {
  passage: '',
  pages: [], // [{ id, hasImage, archiveCount }]
  currentPage: null,
  model: 'flash2', // alias as it appears in the dropdown
};

const titleEl = document.getElementById('title');
const passageEl = document.getElementById('passage');
const modelSelect = document.getElementById('modelSelect');
const imageStage = document.getElementById('imageStage');
const pageInfo = document.getElementById('pageInfo');
const actions = document.getElementById('actions');
const regenFlash = document.getElementById('regenFlash');
const regenPro = document.getElementById('regenPro');
const archivesBlock = document.getElementById('archivesBlock');
const archivesGrid = document.getElementById('archivesGrid');
const archivesLabel = document.getElementById('archivesLabel');
const pageStrip = document.getElementById('pageStrip');
const toast = document.getElementById('toast');

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

function fullModelToAlias(full) {
  // server gives back the resolved model id; map back to dropdown alias
  if (full.includes('flash')) return 'flash2';
  if (full.includes('pro')) return 'pro';
  return 'flash2';
}

async function fetchStatus() {
  const r = await fetch('/api/status');
  if (!r.ok) {
    showToast('Failed to load status', true);
    return;
  }
  const data = await r.json();
  state.passage = data.passage;
  state.pages = data.pages;
  state.model = fullModelToAlias(data.model);
  modelSelect.value = state.model;
  passageEl.textContent = data.passage;
  titleEl.textContent = 'WebToon';
  renderPageStrip();
}

function renderPageStrip() {
  pageStrip.innerHTML = '';
  for (const p of state.pages) {
    const cell = document.createElement('div');
    cell.className = 'page-cell';
    if (p.hasImage) cell.classList.add('has-image');
    if (state.currentPage === p.id) cell.classList.add('active');
    cell.textContent = p.id.slice(1).replace(/^0+/, '') || '0'; // 'p05' -> '5'
    cell.title = `${p.id}${p.hasImage ? ' ✓' : ' (no image yet)'}` +
      (p.archiveCount > 0 ? ` · ${p.archiveCount} archives` : '');
    cell.onclick = () => loadPage(p.id);
    pageStrip.appendChild(cell);
  }
}

function setLoading(on, msg = 'Generating…') {
  if (on) {
    imageStage.classList.add('loading');
    if (!imageStage.querySelector('.loading-text')) {
      const t = document.createElement('div');
      t.className = 'loading-text';
      t.textContent = msg;
      imageStage.appendChild(t);
    } else {
      imageStage.querySelector('.loading-text').textContent = msg;
    }
    regenFlash.disabled = true;
    regenPro.disabled = true;
  } else {
    imageStage.classList.remove('loading');
    const t = imageStage.querySelector('.loading-text');
    if (t) t.remove();
    regenFlash.disabled = false;
    regenPro.disabled = false;
  }
}

async function loadPage(pageId) {
  state.currentPage = pageId;
  renderPageStrip();

  let pageData;
  try {
    const r = await fetch(`/api/pages/${pageId}`);
    if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
    pageData = await r.json();
  } catch (err) {
    showToast(`Failed to load ${pageId}: ${err.message}`, true);
    return;
  }

  // Render image area
  imageStage.innerHTML = '';
  if (pageData.hasImage) {
    const img = document.createElement('img');
    img.src = `/images/${pageId}.png?t=${Date.now()}`;
    img.alt = pageId;
    imageStage.appendChild(img);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `No image yet for <strong>${pageId}</strong>.<br><br>Pick a model and click a button below to generate.`;
    imageStage.appendChild(empty);
  }

  // Page info
  const refs = pageData.refs.length === 0 ? '(no refs)' : `refs: ${pageData.refs.join(', ')}`;
  pageInfo.innerHTML = `<span class="pid">${pageId}</span><span>${refs}</span>`;

  // Actions
  actions.hidden = false;

  // Archives
  if (pageData.archives.length > 0) {
    archivesBlock.hidden = false;
    archivesLabel.textContent = `Archives (${pageData.archives.length})`;
    archivesGrid.innerHTML = '';
    for (const arch of pageData.archives) {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = `/images/_archive/${arch}`;
      img.alt = arch;
      img.onclick = () => window.open(`/images/_archive/${arch}`, '_blank');
      fig.appendChild(img);
      const cap = document.createElement('figcaption');
      // extract timestamp from filename: pXX_YYYY-MM-DDTHHMMSS.png
      const m = arch.match(/_(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})\.png$/);
      cap.textContent = m ? `${m[1]} ${m[2]}:${m[3]}` : arch;
      fig.appendChild(cap);
      archivesGrid.appendChild(fig);
    }
  } else {
    archivesBlock.hidden = true;
  }
}

async function regenerate(modelAlias) {
  if (!state.currentPage) return;
  const pageId = state.currentPage;
  const page = state.pages.find((p) => p.id === pageId);

  if (page?.hasImage) {
    const ok = confirm(
      `${pageId} already has an image.\n\n` +
        `Regenerating will ARCHIVE the current image and replace it with a new one (with ${modelAlias}).\n\n` +
        `Continue?`,
    );
    if (!ok) return;
  }

  setLoading(true, `Generating ${pageId} with ${modelAlias}…`);

  try {
    const r = await fetch(`/api/pages/${pageId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelAlias }),
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || `HTTP ${r.status}`);
    }
    const result = await r.json();
    showToast(`✓ ${pageId} done (${(result.bytes / 1024).toFixed(0)} KB)`);
  } catch (err) {
    showToast(`Failed: ${err.message}`, true);
    setLoading(false);
    return;
  }

  // Refresh status (archive count may have changed) and reload the page
  await fetchStatus();
  await loadPage(pageId);
  setLoading(false);
}

regenFlash.onclick = () => regenerate('flash2');
regenPro.onclick = () => regenerate('pro');

modelSelect.onchange = async (e) => {
  const m = e.target.value;
  state.model = m;
  try {
    await fetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: m }),
    });
    showToast(`Default model set to ${m}`);
  } catch (err) {
    showToast(`Failed to switch model: ${err.message}`, true);
  }
};

// Init
fetchStatus();
