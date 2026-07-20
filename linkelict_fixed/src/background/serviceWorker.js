'use strict';

/**
 * LinkElict v3.0.0 — Background Service Worker
 *
 * Architecture:
 *   sidepanel ──port──▶ SW ──tabs.sendMessage──▶ content script
 *             ◀─────────────────────────────────────────────────
 *
 * Panel → SW messages:
 *   GET_TAB_STATE       → responds with TAB_STATE
 *   EXTRACT_PROFILE     → orchestrates full extraction pipeline
 *   GET_CACHED          → returns cached profile from storage
 *   CLEAR_DATA          → wipes cached profile
 *
 * SW → Panel messages:
 *   TAB_STATE           { isLinkedIn, url, tabId }
 *   PROGRESS            { step, pct, label }
 *   EXTRACTION_COMPLETE { data }
 *   EXTRACTION_ERROR    { error }
 *   CACHED_DATA         { profile, url }
 *   DATA_CLEARED
 */

// ── Open side panel on toolbar click ──────────────────────────────────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});

// ── Install / update lifecycle ────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  chrome.storage.local.set({
    version: '3.0.0',
    installedAt: new Date().toISOString()
  });
  console.log('[LinkElict] Installed, reason:', reason);
});

// ── Keep-alive alarm ──────────────────────────────────────────────────────────
chrome.alarms.create('keepalive', { periodInMinutes: 0.35 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'keepalive') {
    chrome.storage.local.set({ _ping: Date.now() });
  }
});

// ── Tab helpers ───────────────────────────────────────────────────────────────

function getTabState(tab) {
  return {
    isLinkedIn: !!(tab && tab.url && tab.url.includes('linkedin.com/in/')),
    url:        (tab && tab.url) || '',
    tabId:      (tab && tab.id) || null
  };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// ── Port connection from side panel ───────────────────────────────────────────

let panelPort = null;

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'linkelict-panel') return;

  panelPort = port;
  console.log('[LinkElict] Panel connected');

  getActiveTab().then(tab => {
    const state = getTabState(tab);
    send(port, { type: 'TAB_STATE', ...state });
  });

  port.onMessage.addListener(async msg => {
    switch (msg.type) {

      case 'GET_TAB_STATE': {
        const tab = await getActiveTab();
        send(port, { type: 'TAB_STATE', ...getTabState(tab) });
        break;
      }

      case 'EXTRACT_PROFILE': {
        await runExtraction(port, msg.fields || {});
        break;
      }

      case 'GET_CACHED': {
        const data = await chrome.storage.local.get(['lastProfile', 'lastUrl']);
        send(port, {
          type:    'CACHED_DATA',
          profile: data.lastProfile || null,
          url:     data.lastUrl || null
        });
        break;
      }

      case 'CLEAR_DATA': {
        await chrome.storage.local.remove(['lastProfile', 'lastUrl']);
        send(port, { type: 'DATA_CLEARED' });
        break;
      }
    }
  });

  port.onDisconnect.addListener(() => {
    if (panelPort === port) panelPort = null;
  });
});

// ── Extraction pipeline ───────────────────────────────────────────────────────

async function runExtraction(port, fields) {
  try {
    send(port, { type: 'PROGRESS', step: 'scroll', pct: 5, label: 'Checking tab…' });

    const tab = await getActiveTab();
    if (!tab) throw new Error('No active tab.');
    if (!tab.url || !tab.url.includes('linkedin.com/in/')) {
      throw new Error('Not a LinkedIn profile page.');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
    } catch (_) {}

    send(port, { type: 'PROGRESS', step: 'scroll', pct: 25, label: 'Scrolling profile…' });
    await sleep(1500);

    send(port, { type: 'PROGRESS', step: 'expand', pct: 40, label: 'Extracting data…' });

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'EXTRACT_PROFILE',
        fields
      });
    } catch (e) {
      throw new Error('Cannot reach page. Try reloading the LinkedIn tab.');
    }

    send(port, { type: 'PROGRESS', step: 'parse', pct: 70, label: 'Parsing…' });
    await sleep(200);

    if (!response || !response.success) {
      throw new Error(response?.error || 'Extraction returned no data.');
    }

    send(port, { type: 'PROGRESS', step: 'build', pct: 88, label: 'Saving…' });
    await chrome.storage.local.set({ lastProfile: response.data, lastUrl: tab.url });
    await sleep(150);

    send(port, { type: 'PROGRESS', step: 'done', pct: 100, label: 'Done' });
    send(port, { type: 'EXTRACTION_COMPLETE', data: response.data });

  } catch (err) {
    console.error('[LinkElict] Extraction error:', err);
    send(port, { type: 'EXTRACTION_ERROR', error: err.message });
  }
}

// ── Push tab state on tab switch ──────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!panelPort) return;
  try {
    const tab = await chrome.tabs.get(tabId);
    send(panelPort, { type: 'TAB_STATE', ...getTabState(tab) });
  } catch (_) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !panelPort) return;
  send(panelPort, { type: 'TAB_STATE', ...getTabState(tab) });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(port, msg) {
  try { port.postMessage(msg); } catch (_) {}
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
