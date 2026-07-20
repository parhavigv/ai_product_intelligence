'use strict';

/**
 * LinkElict v3.0.0 — Side Panel
 *
 * sidepanel.js ──port──▶ serviceWorker.js ──tabs.sendMessage──▶ content.js
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const statusBanner  = $('statusBanner');
const statusDot     = $('statusDot');
const statusText    = $('statusText');
const urlInput      = $('urlInput');
const btnTarget     = $('btnTarget');
const btnExtract    = $('btnExtract');
const btnExport     = $('btnExport');
const btnCopy       = $('btnCopy');
const btnClear      = $('btnClear');
const progressWrap  = $('progressWrap');
const progressFill  = $('progressFill');
const progressLabel = $('progressLabel');
const resultsSection = $('resultsSection');
const resultsCard   = $('resultsCard');

let lastData     = null;
let activeFormat = 'csv';
let port         = null;
let portAlive    = false;

// ── Port connection ───────────────────────────────────────────────────────────

function connectPort() {
  port = chrome.runtime.connect({ name: 'linkelict-panel' });
  portAlive = true;

  port.onMessage.addListener(onMessage);

  port.onDisconnect.addListener(() => {
    portAlive = false;
    setTimeout(connectPort, 1000);
  });

  send({ type: 'GET_TAB_STATE' });
  send({ type: 'GET_CACHED' });
}

function send(msg) {
  if (!portAlive) return;
  try { port.postMessage(msg); } catch (_) { portAlive = false; }
}

// ── Message handler ───────────────────────────────────────────────────────────

function onMessage(msg) {
  switch (msg.type) {

    case 'TAB_STATE':
      if (msg.isLinkedIn) {
        urlInput.value = msg.url || '';
        setStatus('ready', 'Profile detected - ready to extract');
        btnExtract.disabled = false;
      } else {
        setStatus('idle', 'Navigate to a LinkedIn profile to begin');
        btnExtract.disabled = true;
      }
      break;

    case 'PROGRESS':
      showProgress(msg.step, msg.pct, msg.label);
      break;

    case 'EXTRACTION_COMPLETE':
      showProgress('done', 100, 'Complete');
      setStatus('success', 'Extracted \u00B7 ' + new Date().toLocaleTimeString());
      lastData = msg.data;
      renderResults(lastData);
      enableButtons(true);
      resetExtractBtn();
      hideProgress();
      break;

    case 'EXTRACTION_ERROR':
      setStatus('warn', 'Error: ' + msg.error);
      progressWrap.classList.remove('visible');
      resetExtractBtn();
      break;

    case 'CACHED_DATA':
      if (msg.profile) {
        lastData = msg.profile;
        renderResults(lastData);
        setStatus('success', 'Showing cached profile');
        enableButtons(true);
      }
      break;

    case 'DATA_CLEARED':
      lastData = null;
      resultsSection.classList.add('hidden');
      resultsCard.innerHTML = '';
      progressWrap.classList.remove('visible');
      enableButtons(false);
      setStatus('idle', 'Data cleared');
      break;
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────

function setStatus(type, text) {
  const dots = { idle: 'dot-idle', ready: 'dot-ready', warn: 'dot-warn', success: 'dot-success', extracting: 'dot-pulse' };
  statusBanner.className = 'status-banner ' + (type === 'extracting' ? 'ready' : type);
  statusDot.className = 'status-dot ' + (dots[type] || 'dot-idle');
  statusText.textContent = text;
}

function enableButtons(on) {
  [btnExport, btnCopy, btnClear].forEach(b => b.disabled = !on);
}

// ── Progress ──────────────────────────────────────────────────────────────────

const STEPS = ['scroll', 'expand', 'parse', 'build', 'done'];

function showProgress(stepName, pct, label) {
  progressWrap.classList.add('visible');
  progressFill.style.width = pct + '%';
  progressLabel.textContent = label || '';

  const curr = STEPS.indexOf(stepName);
  STEPS.forEach((s, i) => {
    const el = document.querySelector('[data-step="' + s + '"]');
    if (!el) return;
    el.classList.remove('done', 'active');
    if (i < curr) el.classList.add('done');
    if (i === curr) el.classList.add('active');
    el.querySelector('.step-dot').textContent = i < curr ? '\u2713' : String(i + 1);
  });
}

function hideProgress() {
  setTimeout(() => progressWrap.classList.remove('visible'), 1500);
}

// ── Checklist accordion ───────────────────────────────────────────────────────

document.querySelectorAll('.checklist-header').forEach(header => {
  header.addEventListener('click', () => {
    const group = header.dataset.group;
    document.getElementById('body-' + group).classList.toggle('open');
    header.querySelector('.chevron').classList.toggle('open');
  });
});

function updateCount(group) {
  const total   = document.querySelectorAll('input[name="' + group + '"]').length;
  const checked = document.querySelectorAll('input[name="' + group + '"]:checked').length;
  document.getElementById('count-' + group).textContent = checked + ' of ' + total + ' selected';
}

document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', () => updateCount(cb.name));
});

document.querySelectorAll('.select-all-btn').forEach(btn => {
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const group  = btn.dataset.group;
    const action = btn.dataset.action;
    document.querySelectorAll('input[name="' + group + '"]').forEach(cb => {
      cb.checked = action === 'all';
    });
    updateCount(group);
  });
});

['identity', 'career', 'activity'].forEach(updateCount);

// ── Format selector ───────────────────────────────────────────────────────────

document.querySelectorAll('.format-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFormat = btn.dataset.format;
  });
});

// ── Target button ─────────────────────────────────────────────────────────────

btnTarget.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url || !url.includes('linkedin.com/in/')) {
    setStatus('warn', 'Enter a valid linkedin.com/in/ URL');
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.update(tab.id, { url });
    setStatus('ready', 'Navigating - click Extract when loaded');
  }
});

// ── Extract button ────────────────────────────────────────────────────────────

function getSelectedFields() {
  const fields = {};
  ['identity', 'career', 'activity'].forEach(group => {
    fields[group] = Array.from(
      document.querySelectorAll('input[name="' + group + '"]:checked')
    ).map(cb => cb.value);
  });
  return fields;
}

function resetExtractBtn() {
  btnExtract.disabled = false;
  btnExtract.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Start Extraction';
}

btnExtract.addEventListener('click', () => {
  btnExtract.disabled = true;
  btnExtract.innerHTML = '<div class="spinner"></div> Extracting\u2026';
  setStatus('extracting', 'Extraction in progress\u2026');
  showProgress('scroll', 5, 'Starting\u2026');
  send({ type: 'EXTRACT_PROFILE', fields: getSelectedFields() });
});

// ── Export ────────────────────────────────────────────────────────────────────

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(s) {
  return '"' + String(s || '').replace(/"/g, '""') + '"';
}

function buildCSV(data) {
  const row = {
    name:           data.name || '',
    headline:       data.headline || '',
    location:       data.location || '',
    connections:    data.connections || '',
    followers:      data.followers || '',
    about:          data.about || '',
    experience:     (data.experience || []).map(e => e.title + ' @ ' + e.company).join(' | '),
    education:      (data.education || []).map(e => e.school).join(' | '),
    skills:         (data.skills || []).join(', '),
    certifications: (data.certifications || []).map(c => c.name).join(', '),
    profileUrl:     data.profileUrl || '',
    extractedAt:    data.extractedAt || ''
  };
  const headers = Object.keys(row).join(',');
  const values  = Object.values(row).map(escapeCSV).join(',');
  return headers + '\n' + values;
}

function buildText(data) {
  const lines = [
    'LinkedIn Profile \u2014 ' + (data.name || ''),
    'Exported: ' + new Date().toLocaleString(),
    '',
    'HEADLINE: ' + (data.headline || '\u2014'),
    'LOCATION: ' + (data.location || '\u2014'),
    'CONNECTIONS: ' + (data.connections || '\u2014'),
    'FOLLOWERS: ' + (data.followers || '\u2014'),
    'URL: ' + (data.profileUrl || ''),
    '',
    'ABOUT',
    data.about || '\u2014',
    '',
    'EXPERIENCE',
  ];
  (data.experience || []).forEach(e => {
    lines.push('  \u2022 ' + e.title + ' @ ' + e.company + ' (' + (e.dates || '') + ')');
    if (e.location) lines.push('    ' + e.location);
  });
  lines.push('', 'EDUCATION');
  (data.education || []).forEach(e => {
    lines.push('  \u2022 ' + e.school + ' \u2014 ' + e.degree + (e.field ? ', ' + e.field : '') + ' (' + (e.dates || '') + ')');
  });
  lines.push('', 'SKILLS', '  ' + (data.skills || []).join(', '));
  lines.push('', 'CERTIFICATIONS');
  (data.certifications || []).forEach(c => {
    lines.push('  \u2022 ' + c.name + ' \u2014 ' + c.issuer + (c.date ? ' (' + c.date + ')' : ''));
  });
  return lines.join('\n');
}

btnExport.addEventListener('click', () => {
  if (!lastData) return;
  const safeName = (lastData.name || 'profile').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);

  if (activeFormat === 'json') {
    downloadBlob(JSON.stringify(lastData, null, 2), safeName + '.json', 'application/json');
  } else if (activeFormat === 'txt') {
    downloadBlob(buildText(lastData), safeName + '.txt', 'text/plain');
  } else {
    downloadBlob(buildCSV(lastData), safeName + '.csv', 'text/csv');
  }
});

btnCopy.addEventListener('click', async () => {
  if (!lastData) return;
  await navigator.clipboard.writeText(JSON.stringify(lastData, null, 2));
  btnCopy.textContent = '\u2713 Copied';
  setTimeout(() => {
    btnCopy.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy JSON';
  }, 1500);
});

btnClear.addEventListener('click', () => {
  send({ type: 'CLEAR_DATA' });
});

// ── Results renderer ──────────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function row(label, value) {
  const v = value || '';
  return '<div class="result-row"><span class="result-label">' + label + '</span><span class="result-value' + (v ? '' : ' muted') + '">' + (v ? esc(v) : '\u2014') + '</span></div>';
}

function renderResults(data) {
  resultsSection.classList.remove('hidden');
  let html = '';

  html += '<div class="result-head">Identity</div>';
  html += row('Name', data.name);
  html += row('Headline', data.headline);
  html += row('Location', data.location);
  html += row('Connections', data.connections);
  html += row('Followers', data.followers);

  if (data.about) {
    html += '<div class="result-head">About</div>';
    const about = data.about.length > 200 ? data.about.slice(0, 200) + '\u2026' : data.about;
    html += '<div class="result-row"><span class="result-value">' + esc(about) + '</span></div>';
  }

  if (data.experience && data.experience.length) {
    html += '<div class="result-head">Experience \u00B7 ' + data.experience.length + ' roles</div>';
    data.experience.slice(0, 5).forEach(e => {
      html += '<div class="result-row">';
      html += '<span class="result-label" style="font-size:10px">' + esc(e.dates || '') + '</span>';
      html += '<span class="result-value"><strong>' + esc(e.title) + '</strong>';
      if (e.company) html += '<br><span style="color:#666;font-size:11px">' + esc(e.company) + '</span>';
      if (e.location) html += '<br><span style="color:#999;font-size:10px">' + esc(e.location) + '</span>';
      html += '</span></div>';
    });
  }

  if (data.education && data.education.length) {
    html += '<div class="result-head">Education \u00B7 ' + data.education.length + '</div>';
    data.education.forEach(e => {
      html += '<div class="result-row">';
      html += '<span class="result-label" style="font-size:10px">' + esc(e.dates || '') + '</span>';
      html += '<span class="result-value"><strong>' + esc(e.school) + '</strong>';
      if (e.degree) {
        let deg = e.degree;
        if (e.field) deg += ', ' + e.field;
        html += '<br><span style="color:#666;font-size:11px">' + esc(deg) + '</span>';
      }
      html += '</span></div>';
    });
  }

  if (data.skills && data.skills.length) {
    html += '<div class="result-head">Skills \u00B7 ' + data.skills.length + '</div>';
    html += '<div class="skill-wrap">';
    data.skills.forEach(s => { html += '<span class="skill-chip">' + esc(s) + '</span>'; });
    html += '</div>';
  }

  if (data.certifications && data.certifications.length) {
    html += '<div class="result-head">Certifications \u00B7 ' + data.certifications.length + '</div>';
    data.certifications.forEach(c => {
      html += '<div class="result-row">';
      html += '<span class="result-label">' + esc(c.issuer || '') + '</span>';
      html += '<span class="result-value">' + esc(c.name);
      if (c.date) html += ' <span style="color:#999;font-size:10px">(' + esc(c.date) + ')</span>';
      html += '</span></div>';
    });
  }

  resultsCard.innerHTML = html;
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

connectPort();
