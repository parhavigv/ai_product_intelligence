'use strict';

(() => {
  if (window.__linkelictLoaded) return;
  window.__linkelictLoaded = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const jitter = (base, spread) => sleep((base || 300) + Math.random() * (spread || 300));

  function isProfilePage() {
    return /linkedin\.com\/in\//i.test(location.href);
  }

  function isPrivateProfile() {
    const t = document.body.innerText || '';
    return t.includes('LinkedIn member') || t.includes('profile is not available');
  }

  // ── Auto-scroll to load lazy content ────────────────────────────────────────
  async function autoScroll() {
    const step = Math.floor(window.innerHeight * 0.75);
    let pos = 0;
    while (pos < document.body.scrollHeight) {
      window.scrollTo({ top: pos, behavior: 'smooth' });
      await jitter(250, 350);
      pos += step;
    }
    await sleep(2000 + Math.random() * 3000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await sleep(400);
  }

  // ── Expand all collapsed sections ───────────────────────────────────────────
  async function expandSections() {
    const keywords = ['see more', 'show more', 'show all', 'see all'];
    for (const btn of document.querySelectorAll('button')) {
      const txt = (btn.innerText || '').toLowerCase().trim();
      if (keywords.some(kw => txt === kw || txt.startsWith(kw))) {
        try { btn.click(); await jitter(200, 300); } catch (_) {}
      }
    }
  }

  // ── Field extractors ────────────────────────────────────────────────────────

  function extractName() {
    const selectors = [
      'h1.text-heading-xlarge',
      'h1[class*="heading"]',
      '.pv-text-details__left-panel h1',
      'section.pv-top-card h1',
      'h1'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    }
    return '';
  }

  function extractHeadline() {
    const selectors = [
      '.text-body-medium.break-words',
      '[data-generated-suggestion-target]',
      '.pv-text-details__left-panel .text-body-medium'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    }
    return '';
  }

  function extractLocation() {
    const skip = new Set([
      'connect', 'follow', 'message', 'more', 'visit', 'view', 'share',
      'save', 'like', 'comment', 'send', 'join', 'apply', 'report',
      'block', 'remove', 'unfollow', 'disconnect', 'endorse', 'request'
    ]);
    const selectors = [
      '.pv-text-details__left-panel span',
      '.text-body-small.inline',
      '.pv-top-card--list span'
    ];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const t = (el.innerText || '').trim();
        if (!t || t.length < 3 || t.length > 80) continue;
        if (skip.has(t.toLowerCase())) continue;
        if (/\d{4}|@|followers|connections|mutual/i.test(t)) continue;
        if (/,/.test(t) || /Area|Region|Metropolitan/i.test(t) ||
            /United States|United Kingdom|India|Canada|Australia/i.test(t) ||
            (/^[A-Z][a-zA-Z\s.]+$/.test(t) && t.split(' ').length <= 5)) {
          return t;
        }
      }
    }
    return '';
  }

  function extractFollowers() {
    const m = (document.body.innerText || '').match(/([\d,\.]+)\s*followers/i);
    return m ? m[1].replace(/,/g, '') : '';
  }

  function extractConnections() {
    const text = document.body.innerText || '';
    const m = text.match(/([\d,+]+)\s*connections/i);
    if (m) return m[1];
    return /500\+/.test(text) ? '500+' : '';
  }

  function extractAbout() {
    const selectors = [
      '#about ~ div .display-flex span[aria-hidden="true"]',
      'section[data-section="about"] span',
      '#about-section span[aria-hidden="true"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 20) return el.innerText.trim();
    }
    return '';
  }

  function extractListItems(sectionId) {
    const anchor = document.querySelector('#' + sectionId);
    if (!anchor) return [];
    const section = anchor.closest('section') || anchor.parentElement;
    if (!section) return [];
    const items = [];
    for (const card of section.querySelectorAll('li.artdeco-list__item')) {
      const texts = [...card.querySelectorAll('span[aria-hidden="true"]')]
        .map(s => s.innerText.trim())
        .filter(t => t.length > 1);
      if (texts.length >= 1) items.push(texts);
    }
    return items;
  }

  function extractExperience() {
    return extractListItems('experience').map(parts => ({
      title:    parts[0] || '',
      company:  parts[1] || '',
      dates:    parts[2] || '',
      location: parts[3] || ''
    }));
  }

  function extractEducation() {
    const noise = /^(more profiles|people also|show all|explore|follow|connect|see all|view all|recommendations|accomplishments|interests|volunteer|activity|skills|experience|about|certifications|licenses)/i;
    const anchor = document.querySelector('#education');
    if (!anchor) return [];
    const section = anchor.closest('section') || anchor.parentElement;
    if (!section) return [];
    const items = [];
    for (const card of section.querySelectorAll('li.artdeco-list__item')) {
      const texts = [...card.querySelectorAll('span[aria-hidden="true"]')]
        .map(s => s.innerText.trim())
        .filter(t => t.length > 1 && !noise.test(t));
      if (texts.length >= 1) {
        items.push({
          school: texts[0] || '',
          degree: texts[1] || '',
          field:  texts[2] || '',
          dates:  texts[3] || ''
        });
      }
    }
    return items;
  }

  function extractSkills() {
    const skills = new Set();
    const anchor = document.querySelector('#skills');
    if (!anchor) return [];
    const section = anchor.closest('section') || anchor.parentElement;
    if (!section) return [];
    for (const span of section.querySelectorAll('span[aria-hidden="true"]')) {
      const t = span.innerText.trim();
      if (t && t.length > 1 && t.length < 60 && !/^\d+$/.test(t) && !/endorsement/i.test(t)) {
        skills.add(t);
      }
    }
    for (const a of section.querySelectorAll('a[href*="/skill/"]')) {
      const t = a.innerText.trim();
      if (t && t.length > 1) skills.add(t);
    }
    return [...skills];
  }

  function extractCertifications() {
    const anchor = document.querySelector('#licenses_and_certifications') || document.querySelector('#certifications');
    if (!anchor) return [];
    const section = anchor.closest('section') || anchor.parentElement;
    if (!section) return [];
    const items = [];
    for (const card of section.querySelectorAll('li.artdeco-list__item')) {
      const texts = [...card.querySelectorAll('span[aria-hidden="true"]')]
        .map(s => s.innerText.trim())
        .filter(t => t.length > 1);
      if (texts.length >= 1) {
        items.push({ name: texts[0] || '', issuer: texts[1] || '', date: texts[2] || '' });
      }
    }
    return items;
  }

  // ── Flatten grouped field selection into a flat lookup ───────────────────────

  function flattenFields(fields) {
    const flat = {};
    const groupKeys = ['identity', 'career', 'activity'];
    for (const key of groupKeys) {
      if (Array.isArray(fields[key])) {
        for (const f of fields[key]) flat[f] = true;
      }
    }
    for (const [k, v] of Object.entries(fields)) {
      if (!groupKeys.includes(k)) flat[k] = v;
    }
    return flat;
  }

  // ── Main extraction orchestrator ────────────────────────────────────────────

  async function extractProfile(fields) {
    await autoScroll();
    await expandSections();
    await sleep(500);

    const f = flattenFields(fields);
    const data = {};

    if (f.name)           data.name           = extractName();
    if (f.headline)       data.headline       = extractHeadline();
    if (f.location)       data.location       = extractLocation();
    if (f.connections)    data.connections    = extractConnections();
    if (f.followers)      data.followers      = extractFollowers();
    if (f.about)          data.about          = extractAbout();
    if (f.experience)     data.experience     = extractExperience();
    if (f.education)      data.education      = extractEducation();
    if (f.skills)         data.skills         = extractSkills();
    if (f.certifications) data.certifications = extractCertifications();

    data.profileUrl  = location.href;
    data.extractedAt = new Date().toISOString();

    return data;
  }

  // ── Message listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action !== 'EXTRACT_PROFILE') return false;

    if (!isProfilePage()) {
      sendResponse({ success: false, error: 'Not a LinkedIn profile page.' });
      return false;
    }
    if (isPrivateProfile()) {
      sendResponse({ success: false, error: 'This profile is private or unavailable.' });
      return false;
    }

    extractProfile(msg.fields || {})
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));

    return true;
  });

  console.log('[LinkElict] content script loaded');
})();
