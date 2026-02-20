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

const landingView = document.getElementById("landingView");
const dashboardView = document.getElementById("dashboardView");
const openUsernameModalBtn = document.getElementById("openUsernameModalBtn");
const closeUsernameModalBtn = document.getElementById("closeUsernameModalBtn");
const modalBackdrop = document.getElementById("modalBackdrop");
const usernameForm = document.getElementById("usernameForm");
const usernameInput = document.getElementById("usernameInput");
const continueBtn = document.getElementById("continueBtn");
const usernameError = document.getElementById("usernameError");

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

const navItems = document.querySelectorAll(".nav__item");
const pages = document.querySelectorAll(".page");

const storyInput = document.getElementById("storyInput");
const generateBtn = document.getElementById("generateBtn");
const generateSpinner = document.getElementById("generateSpinner");
const storyError = document.getElementById("storyError");

const screenplayOutput = document.getElementById("screenplayOutput");
const charactersOutput = document.getElementById("charactersOutput");
const soundOutput = document.getElementById("soundOutput");

const screenplayError = document.getElementById("screenplayError");
const charactersError = document.getElementById("charactersError");
const soundError = document.getElementById("soundError");

const globalStatus = document.getElementById("globalStatus");

const downloadButtons = document.querySelectorAll("[data-download]");
const downloadStatus = document.getElementById("downloadStatus");

let currentUser = "";
let lastPayload = null;

function show(el) { el.classList.remove("is-hidden"); }
function hide(el) { el.classList.add("is-hidden"); }

function setActiveView(isLanding) {
  if (isLanding) {
    landingView.classList.add("view--active");
    landingView.classList.remove("view--hidden");
    dashboardView.classList.add("view--hidden");
  } else {
    landingView.classList.remove("view--active");
    landingView.classList.add("view--hidden");
    dashboardView.classList.remove("view--hidden");
  }
}

function toggleSidebar(open) {
  if (!sidebar) return;
  sidebar.classList.toggle("is-open", open);
  if (sidebarBackdrop) sidebarBackdrop.classList.toggle("is-hidden", !open);
}

openUsernameModalBtn?.addEventListener("click", () => {
  hide(usernameError);
  modalBackdrop?.classList.remove("is-hidden");
  usernameInput?.focus();
});

closeUsernameModalBtn?.addEventListener("click", () => {
  modalBackdrop?.classList.add("is-hidden");
});

modalBackdrop?.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add("is-hidden");
});

usernameInput?.addEventListener("input", () => {
  continueBtn.disabled = usernameInput.value.trim().length < 2;
});

usernameForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = usernameInput.value.trim();
  if (val.length < 2) {
    usernameError.textContent = "Please enter at least 2 characters.";
    show(usernameError);
    return;
  }
  currentUser = val;
  modalBackdrop.classList.add("is-hidden");
  setActiveView(false);
});

sidebarToggle?.addEventListener("click", () => toggleSidebar(true));
sidebarBackdrop?.addEventListener("click", () => toggleSidebar(false));

navItems.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("is-disabled")) return;
    const page = btn.dataset.page;
    navItems.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === page));
    toggleSidebar(false);
  });
});

function enableNav() {
  navItems.forEach((btn) => {
    btn.classList.remove("is-disabled");
    btn.disabled = false;
  });
}

function setActivePage(pageName) {
  navItems.forEach((b) => b.classList.remove("is-active"));
  pages.forEach((p) => p.classList.toggle("is-active", p.dataset.page === pageName));
  const match = Array.from(navItems).find((b) => b.dataset.page === pageName);
  if (match) match.classList.add("is-active");
}

function setStatus(message) {
  if (!globalStatus) return;
  globalStatus.textContent = message || "";
}

function safeText(text) {
  return (text || "").toString();
}

function formatScreenplay(text) {
  const lines = safeText(text).split(/\r?\n/);
  const html = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return `<div class="sp-action">&nbsp;</div>`;
    const upper = trimmed.toUpperCase();

    if (/^(INT\.|EXT\.|INT\/EXT\.|EST\.)/.test(upper)) {
      return `<div class="sp-scene">${trimmed}</div>`;
    }
    if (/(TO:|FADE OUT\.|FADE IN\.|CUT TO:|DISSOLVE TO:)$/.test(upper)) {
      return `<div class="sp-transition">${trimmed}</div>`;
    }
    if (/^\(.+\)$/.test(trimmed)) {
      return `<div class="sp-parenthetical">${trimmed}</div>`;
    }
    if (/^[A-Z0-9 ()'.-]{2,}$/.test(upper) && upper === trimmed) {
      return `<div class="sp-character">${trimmed}</div>`;
    }
    return `<div class="sp-action">${trimmed}</div>`;
  }).join("");
  return html;
}

async function generate() {
  hide(storyError);
  hide(screenplayError);
  hide(charactersError);
  hide(soundError);

  const story = storyInput.value.trim();
  if (story.length < 10) {
    storyError.textContent = "Please provide at least 10 characters.";
    show(storyError);
    return;
  }

  generateBtn.disabled = true;
  generateSpinner.classList.remove("is-hidden");
  setStatus("Analyzing your story...");

  try {
    setStatus("Generating screenplay and production notes...");
    const res = await fetch("/generate_content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, username: currentUser })
    });

    if (!res.ok) throw new Error("Generation failed.");

    const data = await res.json();
    lastPayload = data;

    screenplayOutput.innerHTML = formatScreenplay(data.screenplay || data.script || "");
    charactersOutput.innerHTML = (data.characters_html || data.characters || "")
      ? renderCharacters(data.characters_html || data.characters)
      : "";
    soundOutput.innerHTML = (data.sound_design_html || data.sound_design || "")
      ? renderSound(data.sound_design_html || data.sound_design)
      : "";

    enableNav();
    setActivePage("screenplay");
    setStatus("Generation complete. Showing screenplay.");
  } catch (err) {
    storyError.textContent = err.message || "Something went wrong.";
    show(storyError);
    setStatus("Generation failed. Please try again.");
  } finally {
    generateSpinner.classList.add("is-hidden");
    generateBtn.disabled = false;
    setTimeout(() => setStatus(""), 2200);
  }
}

function renderCharacters(payload) {
  if (Array.isArray(payload)) {
    return payload.map((c) => `
      <div class="card">
        <h4 class="card__title">${safeText(c.name)}</h4>
        <div class="card__divider"></div>
        <div class="card__section"><strong>Background:</strong> ${safeText(c.background)}</div>
        <div class="card__section"><strong>Motivation:</strong> ${safeText(c.motivation)}</div>
        <div class="card__section"><strong>Conflict:</strong> ${safeText(c.conflict)}</div>
        <div class="card__section"><strong>Arc:</strong> ${safeText(c.arc)}</div>
      </div>
    `).join("");
  }
  return `<div class="card"><div class="card__section">${safeText(payload)}</div></div>`;
}

function renderSound(payload) {
  if (Array.isArray(payload)) {
    return payload.map((s) => `
      <div class="sound__item">
        <div class="sound__title">${safeText(s.scene)}</div>
        <div class="sound__body">${safeText(s.details || s.plan || "")}</div>
      </div>
    `).join("");
  }
  const raw = safeText(payload).trim();
  if (!raw) return "";

  const blocks = raw
    .split(/(?=SCENE\s*\d+:)/i)
    .map((b) => b.trim())
    .filter(Boolean);

  const formatBody = (text) => safeText(text).replace(/\r?\n/g, "<br>");

  if (blocks.length <= 1) {
    return `
      <div class="sound__item">
        <div class="sound__title">Sound Design</div>
        <div class="sound__body">${formatBody(raw)}</div>
      </div>
    `;
  }

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const firstLine = lines[0] || "Sound Design";
    const body = lines.slice(1).join("\n").trim() || block;
    return `
      <div class="sound__item">
        <div class="sound__title">${safeText(firstLine)}</div>
        <div class="sound__body">${formatBody(body)}</div>
      </div>
    `;
  }).join("");
}

generateBtn?.addEventListener("click", generate);

downloadButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const format = btn.dataset.download;
    const type = btn.dataset.downloadType || "screenplay";
    if (!lastPayload) return;

    try {
      downloadStatus.textContent = "Preparing file...";
      const res = await fetch(`/download/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, type, payload: lastPayload })
      });
      if (!res.ok) throw new Error("Download failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      downloadStatus.textContent = "Download ready.";
      setTimeout(() => (downloadStatus.textContent = ""), 1200);
    } catch (err) {
      downloadStatus.textContent = err.message || "Download error.";
    }
  });
});
