/*
  Coffee-with-Cinema — Frontend
  Vanilla JS SPA-style UI over a single Flask template.

  Backend endpoints (Flask):
    POST /set_username
    POST /generate_content
    POST /download/<format_type>

  Notes:
  - No backend logic implemented here.
  - Uses Fetch API with robust error handling.
  - State is kept in a single appState object.
*/

(() => {
  'use strict';

  /**
   * Central state store
   */
  const appState = {
    username: '',
    storyIdea: '',
    generated: {
      screenplay: '',
      characters: null,
      soundDesign: null,
      raw: null,
    },
    ui: {
      currentView: 'landing', // landing | dashboard
      currentPage: 'story', // story | screenplay | characters | sound
      isSubmittingUsername: false,
      isGenerating: false,
      isDownloading: false,
    },
  };

  /**
   * DOM helpers
   */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    landingView: $('#landingView'),
    dashboardView: $('#dashboardView'),

    sidebar: $('.sidebar'),
    sidebarBackdrop: $('#sidebarBackdrop'),
    sidebarToggle: $('#sidebarToggle'),

    openUsernameModalBtn: $('#openUsernameModalBtn'),
    closeUsernameModalBtn: $('#closeUsernameModalBtn'),

    modalBackdrop: $('#modalBackdrop'),
    usernameForm: $('#usernameForm'),
    usernameInput: $('#usernameInput'),
    continueBtn: $('#continueBtn'),
    usernameError: $('#usernameError'),

    greeting: $('#greeting'),
    globalStatus: $('#globalStatus'),

    navItems: $$('.nav__item'),
    pages: $$('.page'),

    storyInput: $('#storyInput'),
    generateBtn: $('#generateBtn'),
    generateSpinner: $('#generateSpinner'),
    storyError: $('#storyError'),

    screenplayOutput: $('#screenplayOutput'),
    screenplayError: $('#screenplayError'),

    charactersOutput: $('#charactersOutput'),
    charactersError: $('#charactersError'),

    soundOutput: $('#soundOutput'),
    soundError: $('#soundError'),

    downloadButtons: $$('[data-download]'),
    downloadStatus: $('#downloadStatus'),
  };

  /**
   * UI messaging
   */
  function setGlobalStatus(message) {
    els.globalStatus.textContent = message || '';
  }

  function showInlineError(containerEl, message) {
    if (!containerEl) return;
    if (!message) {
      containerEl.textContent = '';
      containerEl.classList.add('is-hidden');
      return;
    }
    containerEl.textContent = message;
    containerEl.classList.remove('is-hidden');
  }

  function setModalOpen(isOpen) {
    els.modalBackdrop.classList.toggle('is-hidden', !isOpen);
    els.modalBackdrop.setAttribute('aria-hidden', String(!isOpen));

    if (isOpen) {
      // small delay lets animation feel smoother
      window.setTimeout(() => {
        els.usernameInput?.focus();
      }, 50);
    }
  }

  function setView(viewName) {
    appState.ui.currentView = viewName;

    const isLanding = viewName === 'landing';
    els.landingView.classList.toggle('view--active', isLanding);
    els.landingView.classList.toggle('view--hidden', !isLanding);

    els.dashboardView.classList.toggle('view--active', !isLanding);
    els.dashboardView.classList.toggle('view--hidden', isLanding);

    setGlobalStatus('');
  }

  function setGreeting(username) {
    const safeName = (username || '').trim();
    if (safeName) {
      els.greeting.textContent = `Welcome, ${safeName}. Let's create something amazing.`;
    } else {
      els.greeting.textContent = 'Welcome. Let\'s create something amazing.';
    }
  }

  function setSidebarOpen(isOpen) {
    els.sidebar?.classList.toggle('sidebar--open', isOpen);
    els.sidebarBackdrop?.classList.toggle('is-hidden', !isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
    els.sidebarBackdrop?.setAttribute('aria-hidden', String(!isOpen));
  }

  /**
   * Sidebar / Page routing (client-side)
   */
  function setActivePage(pageKey) {
    appState.ui.currentPage = pageKey;

    els.navItems.forEach((btn) => {
      const isMatch = btn.dataset.page === pageKey;
      btn.classList.toggle('is-active', isMatch);
    });

    els.pages.forEach((page) => {
      const isMatch = page.dataset.page === pageKey;
      page.classList.toggle('is-active', isMatch);
    });

    // Clear page-specific errors when switching
    showInlineError(els.storyError, '');
    showInlineError(els.screenplayError, '');
    showInlineError(els.charactersError, '');
    showInlineError(els.soundError, '');

    // Friendly status hint
    if (pageKey === 'screenplay') setGlobalStatus('Screenplay ready.');
    if (pageKey === 'characters') setGlobalStatus('Character profiles ready.');
    if (pageKey === 'sound') setGlobalStatus('Sound design plan ready.');
    if (pageKey === 'story') setGlobalStatus('');

    setSidebarOpen(false);
  }

  function setSidebarEnabled(enabled) {
    els.navItems.forEach((btn) => {
      const page = btn.dataset.page;
      if (page === 'story') return;
      btn.disabled = !enabled;
      btn.classList.toggle('is-disabled', !enabled);
    });
  }

  /**
   * Fetch helpers
   */
  async function safeJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function postJson(url, body) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(body ?? {}),
      credentials: 'same-origin',
    });

    if (!resp.ok) {
      const data = await safeJson(resp);
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Request failed (${resp.status})`;
      throw new Error(msg);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return resp.json();
    }

    // If backend returns plain text JSON-less, still attempt to parse
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, data: text };
    }
  }

  function coerceToText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(coerceToText).join('\n\n');
    if (typeof value === 'object') {
      // Prefer common payload keys if present
      const preferredKeys = ['screenplay', 'script', 'content', 'text', 'result', 'output'];
      for (const key of preferredKeys) {
        if (typeof value[key] === 'string') return value[key];
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatScreenplayText(raw) {
    const text = (raw || '').replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    let previousType = '';

    return lines.map((line) => {
      const trimmed = line.trim();
      const safe = escapeHtml(line);

      if (!trimmed) {
        previousType = '';
        return '';
      }

      const isScene = /^\s*(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/i.test(trimmed);
      const isTransition = /TO:$|FADE OUT\.?$|FADE IN\.?$|CUT TO:$/i.test(trimmed);
      const isCharacter = /^[A-Z0-9 ()'".\-]+$/.test(trimmed) && trimmed.length <= 30 && !isScene && !isTransition;
      const isParenthetical = /^\(.*\)$/.test(trimmed);

      if (isScene) {
        previousType = 'scene';
        return `<span class="screenplay__line screenplay__scene">${safe}</span>`;
      }

      if (isTransition) {
        previousType = 'transition';
        return `<span class="screenplay__line screenplay__transition">${safe}</span>`;
      }

      if (isCharacter) {
        previousType = 'character';
        return `<span class="screenplay__line screenplay__character">${safe}</span>`;
      }

      if (isParenthetical) {
        previousType = 'parenthetical';
        return `<span class="screenplay__line screenplay__parenthetical">${safe}</span>`;
      }

      if (['character', 'parenthetical', 'dialogue'].includes(previousType)) {
        previousType = 'dialogue';
        return `<span class="screenplay__line screenplay__dialogue">${safe}</span>`;
      }

      previousType = 'action';
      return `<span class="screenplay__line screenplay__action">${safe}</span>`;
    }).join('\n');
  }

  /**
   * Renderers — tolerate multiple backend shapes.
   */
  function renderScreenplay(payload) {
    // Common shapes:
    // - {screenplay: "..."}
    // - {data: {screenplay: "..."}}
    // - {result: {screenplay: "..."}}
    // - {screenplay_text: "..."}
    const screenplay =
      (payload && typeof payload.screenplay === 'string' && payload.screenplay) ||
      (payload && typeof payload.screenplay_text === 'string' && payload.screenplay_text) ||
      (payload && payload.data && typeof payload.data.screenplay === 'string' && payload.data.screenplay) ||
      (payload && payload.result && typeof payload.result.screenplay === 'string' && payload.result.screenplay) ||
      '';

    const fallback = screenplay || coerceToText(payload);
    appState.generated.screenplay = fallback;
    els.screenplayOutput.innerHTML = formatScreenplayText(fallback);
  }

  function splitCharacters(rawText) {
    // Attempt to split character blocks in plain text outputs.
    // Heuristic: two or more newlines start a new block.
    const text = (rawText || '').trim();
    if (!text) return [];
    return text.split(/\n\s*\n+/g).map((s) => s.trim()).filter(Boolean);
  }

  function renderCharacters(payload) {
    // Common shapes:
    // - {characters: "..."}
    // - {characters: [ {name, description}, ... ] }
    // - {character_profiles: "..."}
    // - {data: {characters: ...}}

    const root = payload?.data ?? payload?.result ?? payload;
    let characters = root?.characters ?? root?.character_profiles ?? root?.characterProfiles ?? null;

    els.charactersOutput.innerHTML = '';

    if (Array.isArray(characters)) {
      characters.forEach((ch, idx) => {
        const name = (ch && (ch.name || ch.character || ch.title)) ? (ch.name || ch.character || ch.title) : `Character ${idx + 1}`;
        const body = ch && (ch.profile || ch.description || ch.details || ch.bio) ? (ch.profile || ch.description || ch.details || ch.bio) : coerceToText(ch);
        els.charactersOutput.appendChild(buildCharacterCard(name, body));
      });
      appState.generated.characters = characters;
      return;
    }

    // If it's a string, split into blocks
    if (typeof characters === 'string') {
      const blocks = splitCharacters(characters);
      blocks.forEach((block, idx) => {
        const firstLine = block.split(/\n/)[0]?.trim() || `Character ${idx + 1}`;
        els.charactersOutput.appendChild(buildCharacterCard(firstLine, block));
      });
      appState.generated.characters = blocks;
      return;
    }

    // Fallback: coerce payload
    const text = coerceToText(root);
    const blocks = splitCharacters(text);
    if (blocks.length) {
      blocks.forEach((block, idx) => {
        const firstLine = block.split(/\n/)[0]?.trim() || `Character ${idx + 1}`;
        els.charactersOutput.appendChild(buildCharacterCard(firstLine, block));
      });
      appState.generated.characters = blocks;
      return;
    }

    appState.generated.characters = null;
    els.charactersOutput.appendChild(buildCharacterCard('Characters', 'No character data returned.'));
  }

  function renderSoundDesign(payload) {
    // Common shapes:
    // - {sound_design: "..."}
    // - {soundDesign: "..."}
    // - {sound_design_plan: [ {scene, ambience, foley, music}, ... ] }
    const root = payload?.data ?? payload?.result ?? payload;
    const sound = root?.sound_design ?? root?.soundDesign ?? root?.sound_design_plan ?? root?.soundDesignPlan ?? null;

    els.soundOutput.innerHTML = '';

    if (Array.isArray(sound)) {
      sound.forEach((sceneObj, idx) => {
        const heading = (sceneObj && (sceneObj.scene || sceneObj.title || sceneObj.heading)) ? (sceneObj.scene || sceneObj.title || sceneObj.heading) : `Scene ${idx + 1}`;
        els.soundOutput.appendChild(buildSoundSection(heading, sceneObj));
      });
      appState.generated.soundDesign = sound;
      return;
    }

    if (typeof sound === 'string') {
      // Split by scene markers if present; fallback to blocks.
      const text = sound.trim();
      const blocks = text.includes('Scene')
        ? text.split(/\n(?=\s*Scene\s*\d+\b)/g)
        : text.split(/\n\s*\n+/g);

      blocks.map((b) => b.trim()).filter(Boolean).forEach((block, idx) => {
        const firstLine = block.split(/\n/)[0]?.trim() || `Scene ${idx + 1}`;
        els.soundOutput.appendChild(buildSoundSection(firstLine, block));
      });
      appState.generated.soundDesign = blocks;
      return;
    }

    const text = coerceToText(root);
    if (text.trim()) {
      const blocks = text.split(/\n\s*\n+/g).map((b) => b.trim()).filter(Boolean);
      blocks.forEach((block, idx) => {
        const firstLine = block.split(/\n/)[0]?.trim() || `Scene ${idx + 1}`;
        els.soundOutput.appendChild(buildSoundSection(firstLine, block));
      });
      appState.generated.soundDesign = blocks;
      return;
    }

    appState.generated.soundDesign = null;
    els.soundOutput.appendChild(buildSoundSection('Sound Design', 'No sound design data returned.'));
  }

  function buildCharacterCard(title, bodyText) {
    const card = document.createElement('article');
    card.className = 'card';

    const h = document.createElement('h4');
    h.className = 'card__title';
    h.textContent = title;

    const divider = document.createElement('div');
    divider.className = 'card__divider';

    card.appendChild(h);
    card.appendChild(divider);

    const sections = extractCharacterSections(bodyText);
    if (sections && sections.length) {
      sections.forEach((section) => card.appendChild(section));
      return card;
    }

    const body = document.createElement('div');
    body.className = 'card__section-body';
    body.textContent = bodyText;
    card.appendChild(body);
    return card;
  }

  function extractCharacterSections(text) {
    const raw = (text || '').trim();
    if (!raw) return null;

    const target = ['Background', 'Motivation', 'Conflict', 'Arc'];
    const sections = new Map(target.map((label) => [label, []]));
    let current = null;

    raw.split(/\n/).forEach((line) => {
      const match = line.match(/^\s*(Background|Motivation|Conflict|Arc)\s*:\s*(.*)$/i);
      if (match) {
        current = target.find((label) => label.toLowerCase() === match[1].toLowerCase()) || match[1];
        sections.set(current, [match[2] || '']);
        return;
      }

      if (current) {
        sections.get(current)?.push(line.trim());
      }
    });

    const blocks = [];
    for (const label of target) {
      const content = (sections.get(label) || []).join(' ').trim();
      if (!content) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'card__section';

      const title = document.createElement('div');
      title.className = 'card__section-title';
      title.textContent = label;

      const body = document.createElement('div');
      body.className = 'card__section-body';
      body.textContent = content;

      wrapper.appendChild(title);
      wrapper.appendChild(body);
      blocks.push(wrapper);
    }

    return blocks.length ? blocks : null;
  }

  function buildSoundSection(heading, content) {
    const section = document.createElement('section');
    section.className = 'sound__section';

    const h = document.createElement('h4');
    h.className = 'sound__heading';
    h.textContent = heading;

    const body = document.createElement('div');
    body.className = 'sound__content';

    if (typeof content === 'string') {
      body.textContent = content;
    } else {
      // Render object with bold keys, per spec
      body.appendChild(renderKeyValueBlock(content));
    }

    section.appendChild(h);
    section.appendChild(body);
    return section;
  }

  function renderKeyValueBlock(obj) {
    const wrapper = document.createElement('div');

    if (!obj || typeof obj !== 'object') {
      wrapper.textContent = coerceToText(obj);
      return wrapper;
    }

    const entries = Object.entries(obj);
    if (!entries.length) {
      wrapper.textContent = 'No details available.';
      return wrapper;
    }

    for (const [key, value] of entries) {
      const line = document.createElement('div');
      const label = document.createElement('strong');
      label.textContent = `${humanizeKey(key)}: `;

      const text = document.createElement('span');
      text.textContent = coerceToText(value);

      line.appendChild(label);
      line.appendChild(text);
      wrapper.appendChild(line);
    }

    return wrapper;
  }

  function humanizeKey(key) {
    return String(key)
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }

  /**
   * Business actions
   */
  async function submitUsername(username) {
    if (appState.ui.isSubmittingUsername) return;

    const trimmed = (username || '').trim();
    if (!trimmed) return;

    appState.ui.isSubmittingUsername = true;
    showInlineError(els.usernameError, '');
    setGlobalStatus('');

    els.continueBtn.disabled = true;

    try {
      // Backend expects JSON body. Key name is unknown; send both common variants.
      await postJson('/set_username', { username: trimmed });

      appState.username = trimmed;
      setGreeting(trimmed);
      setModalOpen(false);

      // Redirect to dashboard (client-side)
      setView('dashboard');
      setActivePage('story');

      // Ensure initial state of sidebar
      setSidebarEnabled(false);

      // Focus the story input for a smooth flow
      window.setTimeout(() => {
        els.storyInput?.focus();
      }, 80);
    } catch (err) {
      showInlineError(els.usernameError, err?.message || 'Failed to set username.');
      els.continueBtn.disabled = false;
    } finally {
      appState.ui.isSubmittingUsername = false;
      updateContinueButtonState();
    }
  }

  function setGeneratingUI(isGenerating) {
    appState.ui.isGenerating = isGenerating;
    els.generateBtn.disabled = isGenerating;
    els.generateSpinner.classList.toggle('is-hidden', !isGenerating);

    if (isGenerating) {
      els.generateBtn.dataset.prevLabel = els.generateBtn.textContent || '';
      els.generateBtn.textContent = 'Generating...';
    } else {
      els.generateBtn.textContent = els.generateBtn.dataset.prevLabel || 'Generate Content';
    }
  }

  async function generateContent() {
    if (appState.ui.isGenerating) return;

    const story = (els.storyInput.value || '').trim();
    if (!story) {
      showInlineError(els.storyError, 'Please enter your story idea before generating.');
      return;
    }

    showInlineError(els.storyError, '');
    setGlobalStatus('Generating content...');

    appState.storyIdea = story;
    setGeneratingUI(true);

    try {
      // Backend payload key is not specified; send common variants.
      const payload = {
        story: story,
        story_idea: story,
        prompt: story,
      };

      const data = await postJson('/generate_content', payload);

      appState.generated.raw = data;

      // If backend returns partial results with errors, show them but continue rendering.
      if (data && data.ok === false && Array.isArray(data.errors) && data.errors.length) {
        showInlineError(els.storyError, data.errors.join('\n'));
      }

      // Render all pages now; then enable sidebar items.
      renderScreenplay(data);
      renderCharacters(data);
      renderSoundDesign(data);

      setSidebarEnabled(true);
      setGlobalStatus('Generation complete.');

      // Navigate to Screenplay page
      setActivePage('screenplay');
    } catch (err) {
      showInlineError(els.storyError, err?.message || 'Failed to generate content.');
      setGlobalStatus('');
    } finally {
      setGeneratingUI(false);
    }
  }

  async function downloadFormat(formatType) {
    if (appState.ui.isDownloading) return;

    const fmt = String(formatType || '').toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(fmt)) return;

    els.downloadStatus.textContent = 'Preparing download...';
    appState.ui.isDownloading = true;

    // Disable buttons to prevent duplicates
    els.downloadButtons.forEach((b) => b.disabled = true);

    try {
      const resp = await fetch(`/download/${encodeURIComponent(fmt)}`, {
        method: 'POST',
        headers: { 'Accept': '*/*' },
        credentials: 'same-origin',
      });

      if (!resp.ok) {
        const data = await safeJson(resp);
        const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Download failed (${resp.status})`;
        throw new Error(msg);
      }

      const blob = await resp.blob();
      const filename = inferFilename(resp, fmt);

      // Trigger file download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      els.downloadStatus.textContent = 'Download started.';
    } catch (err) {
      els.downloadStatus.textContent = '';
      showInlineError(els.screenplayError, err?.message || 'Unable to download file.');
    } finally {
      appState.ui.isDownloading = false;
      els.downloadButtons.forEach((b) => b.disabled = false);
      window.setTimeout(() => {
        els.downloadStatus.textContent = '';
      }, 1400);
    }
  }

  function inferFilename(response, fmt) {
    const dispo = response.headers.get('content-disposition') || '';
    const match = dispo.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const raw = match ? (match[1] || match[2]) : '';
    const safe = raw ? decodeURIComponent(raw) : `cineforge-ai-studio.${fmt}`;
    return safe;
  }

  /**
   * Input / interaction wiring
   */
  function updateContinueButtonState() {
    const hasText = Boolean((els.usernameInput.value || '').trim());
    els.continueBtn.disabled = !hasText || appState.ui.isSubmittingUsername;
  }

  function wireEvents() {
    els.sidebarToggle?.addEventListener('click', () => {
      const isOpen = els.sidebar?.classList.contains('sidebar--open');
      setSidebarOpen(!isOpen);
    });

    els.sidebarBackdrop?.addEventListener('click', () => {
      setSidebarOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) setSidebarOpen(false);
    });

    // Landing → modal
    els.openUsernameModalBtn.addEventListener('click', () => {
      showInlineError(els.usernameError, '');
      els.usernameInput.value = '';
      updateContinueButtonState();
      setModalOpen(true);
    });

    // Close modal
    els.closeUsernameModalBtn.addEventListener('click', () => {
      if (!appState.ui.isSubmittingUsername) setModalOpen(false);
    });

    // Click outside modal closes it
    els.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === els.modalBackdrop && !appState.ui.isSubmittingUsername) {
        setModalOpen(false);
      }
    });

    // ESC closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.modalBackdrop.classList.contains('is-hidden')) {
        if (!appState.ui.isSubmittingUsername) setModalOpen(false);
      }
    });

    // Enable continue button once text entered
    els.usernameInput.addEventListener('input', () => {
      showInlineError(els.usernameError, '');
      updateContinueButtonState();
    });

    // Submit username
    els.usernameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitUsername(els.usernameInput.value);
    });

    // Sidebar navigation
    els.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled || btn.classList.contains('is-disabled')) return;
        const page = btn.dataset.page;
        if (!page) return;
        setActivePage(page);
      });
    });

    // Generate
    els.generateBtn.addEventListener('click', generateContent);

    // Download
    els.downloadButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.download;
        downloadFormat(fmt);
      });
    });

    // Polite: clear screenplay error when navigating away/back
    els.storyInput.addEventListener('input', () => {
      showInlineError(els.storyError, '');
    });
  }

  /**
   * Boot
   */
  function init() {
    // Initial state per spec:
    // - Landing view active
    // - Modal closed
    // - Dashboard hidden
    // - Sidebar other pages disabled
    setView('landing');
    setModalOpen(false);
    setSidebarEnabled(false);
    setActivePage('story');
    setGreeting('');

    wireEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
