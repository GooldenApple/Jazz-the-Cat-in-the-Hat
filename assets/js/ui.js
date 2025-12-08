// ui.js
/* global bootstrap */
console.log('[ui] module loaded'); // log that ui module has loaded


// Storage key for settings, declared before loadSettings/saveSettings are used
const SETTINGS_KEY = 'settings'; // storage key for user settings

/** 
  * FX: one-shot sounds for overlays
  * Preload once, reuse same Audio objects
  */
const fxOverlay = {
  success: new Audio('assets/audio/yay.mp3'),
  fail:    new Audio('assets/audio/fail.mp3')
};

fxOverlay.success.preload = 'auto';
fxOverlay.fail.preload = 'auto';
fxOverlay.success.volume = 0.7; // adjust 
fxOverlay.fail.volume    = 0.7; 

// Follow master volume (from settings)
window.addEventListener('audio:setMasterVolume', (e) => {
  const master = Math.max(0, Math.min(1, e?.detail?.volume ?? 1));
  fxOverlay.success.volume = 0.7 * master;
  fxOverlay.fail.volume    = 0.7 * master;
});

// --- Overlay FX mute-guard (prevents sounds when closing panels) ---
let _overlayFxMuteUntil = 0;
function muteOverlayFx(ms = 600) { _overlayFxMuteUntil = performance.now() + ms; }
function canPlayOverlayFx() { return performance.now() >= _overlayFxMuteUntil; }

//  Plays the success sound safely (guarded)
function playFxSuccess() {
  try {
    if (!canPlayOverlayFx()) return;
    fxOverlay.success.currentTime = 0;
    void fxOverlay.success.play();
  } catch (_) {}
}
  // Plays the fail sound safely (guarded)
function playFxFail() {
  try {
    if (!canPlayOverlayFx()) return;
    fxOverlay.fail.currentTime = 0;
    void fxOverlay.fail.play();
  } catch (_) {}
}



// Mobile/Autoplay guard: prime FX on first user gesture

let _fxUnlocked = false;
function unlockFxOnce() {
  if (_fxUnlocked) return;
  _fxUnlocked = true;

  // remember volumes, play once at volume 0 to unlock, then restore
  const vSucc = fxOverlay.success.volume;
  const vFail = fxOverlay.fail.volume;
  fxOverlay.success.volume = 0;
  fxOverlay.fail.volume = 0;

  const p1 = fxOverlay.success.play().catch(() => {});
  const p2 = fxOverlay.fail.play().catch(() => {});
  Promise.allSettled([p1, p2]).finally(() => {
    try {
      fxOverlay.success.pause(); fxOverlay.success.currentTime = 0; fxOverlay.success.volume = vSucc;
      fxOverlay.fail.pause();    fxOverlay.fail.currentTime    = 0; fxOverlay.fail.volume    = vFail;
    } catch (_) {}
  });
}

// Run once on first interaction (works across mouse/touch/keyboard)
window.addEventListener('pointerdown', unlockFxOnce, { once: true, passive: true });
window.addEventListener('keydown',      unlockFxOnce, { once: true });


/**
  *Screen reader live-region 
  *Looks for #srLive; falls back to legacy #srRegion; otherwise creates #srLive.
  */

let srRegion = // region reference holder
  document.getElementById('srLive') || // prefer #srLive
  document.getElementById('srRegion'); // fall back to legacy id

if (!srRegion) { 
  srRegion = document.createElement('div'); 
  srRegion.id = 'srLive';  
  srRegion.className = 'sr-only'; 
  srRegion.setAttribute('role', 'status');
  srRegion.setAttribute('aria-live', 'polite');
  srRegion.setAttribute('aria-atomic', 'true');
  document.body.appendChild(srRegion); 
} else { // normalize legacy node
  srRegion.id = 'srLive'; 
  srRegion.classList.add('sr-only'); 
  srRegion.setAttribute('role', 'status');
  srRegion.setAttribute('aria-live', 'polite');
  srRegion.setAttribute('aria-atomic', 'true');
}

/**
 * srSpeak(msg)
 * Announce a short message to screen readers via the live-region.
 */
function srSpeak(msg = '') {
  if (!srRegion) return; // guard when region is missing
  srRegion.textContent = ''; 
  setTimeout(() => { srRegion.textContent = String(msg); }, 30); // async update so AT re-announces
}

// Note metrics: measure once, cache, and re-measure on layout changes.

let _noteBox = { w: 40, h: 40 }; // default note size until measured

/**
 * measureNoteBox()
 * Create a temporary note, measure it, cache width/height.
 */
function measureNoteBox() {
  const el = document.createElement('div');
  el.className = 'note note-left'; 
  el.style.position = 'absolute'; 
  el.style.left = '-9999px'; 
  el.style.top = '-9999px'; 
  el.style.pointerEvents = 'none';
  document.body.appendChild(el); 
  const rect = el.getBoundingClientRect();
  _noteBox = { 
    w: Math.max(1, Math.round(rect.width)), 
    h: Math.max(1, Math.round(rect.height)),
  };
  el.remove(); 
  return _noteBox;
}

/**
 * getNoteBox()
 * Return last measured note box dimensions.
 */
function getNoteBox() {
  return _noteBox;
}

/**
 * scheduleReMeasureNoteBox()
 * Re-measure note box on next animation frame.
 */
function scheduleReMeasureNoteBox() {
  requestAnimationFrame(measureNoteBox);
}

// Initial measure on ready
if (document.readyState !== 'loading') { 
  measureNoteBox();
} else {
  document.addEventListener('DOMContentLoaded', measureNoteBox, { once: true }); 
}

// Re-measure when fonts load (rem-based sizes settle)
document.fonts?.ready?.then(measureNoteBox); 
// Re-measure on viewport/orientation changes
window.addEventListener('resize', scheduleReMeasureNoteBox);
window.addEventListener('orientationchange', scheduleReMeasureNoteBox);

// Overlay (Play/Pause) controls 
const overlayEl = document.getElementById('overlay');
const iconPlay  = overlayEl ? overlayEl.querySelector('.icon-play')  : null; 
const iconPause = overlayEl ? overlayEl.querySelector('.icon-pause') : null;
// --- Overlay label lock (prevents other code from changing text while paused)
let _overlayLabelLock = null;

/**
 * showOverlay()
 * Reveal the overlay layer.
 */
function showOverlay() {
  const el = document.getElementById('overlay');
  if (el) el.classList.remove('hidden'); 
}

/**
 * hideOverlay()
 * Hide the overlay layer.
 */
function hideOverlay() {
  const el = document.getElementById('overlay');
  if (el) el.classList.add('hidden'); 
}

/**
 * setOverlayLabel(text)
 * Set the label under/near the big play button on the overlay.
 */
function setOverlayLabel(text, opts = {}) {
  // If locked (paused) and caller didn't explicitly override → do nothing
  if (_overlayLabelLock && !opts.override) return;
  const label = document.querySelector('#overlay .play-label');
  if (label) label.textContent = String(text);
}
/**
 * setPlayTip(text)
 * Ensure a tip line exists above the round play button and set its text.
 * Usage: setPlayTip('Hit the matching arrow when the orb crosses the line!')
 */
function setPlayTip(text = '') {
  const overlay = document.getElementById('overlay');
  if (!overlay) return; 
  const cta = overlay.querySelector('.play-cta');
  if (!cta) return; 
  let tip = cta.querySelector('.play-tip'); 
  if (!tip) { 
    tip = document.createElement('div');
    tip.className = 'play-tip';
    cta.insertBefore(tip, cta.firstChild); 
  }
  tip.textContent = String(text);
}

/**
 * (rotate) shared refs
 * Keep global references for rotate overlay helpers.
 */
const body = document.body; 
const rotateOverlay = document.getElementById('rotateOverlay');
const rotateCloseBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; 

// match same MQs as CSS
const mqTinyLandscape = window.matchMedia('(max-width: 767.98px) and (orientation: landscape)');
const mqShortHeight   = window.matchMedia('(max-height: 480px)');

/**
 * updateRotateOverlayAria()
 * Synchronize aria/inert for rotate overlay based on MQs and dismissal flag.
 */
function updateRotateOverlayAria() {
  if (!rotateOverlay) return; 
  const dismissed = body.getAttribute('data-rotate-dismissed') === 'true';
  const visibleByMQ = (mqTinyLandscape.matches || mqShortHeight.matches); 
  const shouldShow = visibleByMQ && !dismissed; 
  if (shouldShow) {
    rotateOverlay.removeAttribute('inert'); 
    rotateOverlay.setAttribute('aria-hidden', 'false');
    if (rotateCloseBtn) rotateCloseBtn.focus(); 
  } else { // hide overlay
    if (rotateOverlay.contains(document.activeElement)) { 
      document.activeElement.blur?.(); 
    }
    rotateOverlay.setAttribute('aria-hidden', 'true');
  }
}

/**
 * dismissRotateUntilPortrait()
 * Hide rotate overlay until orientation/height normalizes again.
 */
function dismissRotateUntilPortrait() {
  if (rotateOverlay && rotateOverlay.contains(document.activeElement)) { 
    document.activeElement.blur?.(); 
  }
  body.setAttribute('data-rotate-dismissed', 'true'); 
  updateRotateOverlayAria();
}

/**
 * resetDismissalIfPortrait()
 * Clear dismissal flag when not in tiny landscape anymore.
 */
function resetDismissalIfPortrait() {
  if (!mqTinyLandscape.matches) { 
    body.removeAttribute('data-rotate-dismissed'); 
  }
  updateRotateOverlayAria(); 
}

/**
 * initRotateOverlay()
 * Wire listeners and perform the initial sync for rotate overlay.
 */
function initRotateOverlay() {
  if (!rotateOverlay) return;
  if (rotateCloseBtn && rotateCloseBtn.dataset.wired !== 'true') { 
    rotateCloseBtn.dataset.wired = 'true';
    rotateCloseBtn.addEventListener('click', (e) => { 
      e.preventDefault(); 
      dismissRotateUntilPortrait(); 
    });
  }
  mqTinyLandscape.addEventListener('change', updateRotateOverlayAria); 
  mqShortHeight.addEventListener('change',   updateRotateOverlayAria); 
  window.addEventListener('resize',          updateRotateOverlayAria); 
  window.matchMedia('(orientation: landscape)').addEventListener('change', resetDismissalIfPortrait); // reset on orient
  updateRotateOverlayAria(); // initial sync
}

/**
 * getMenuPlayToggle()
 * Return the navbar Play/Pause toggle button.
 */
function getMenuPlayToggle() {
  return document.getElementById('menuPlayToggle');
}

/**
 * setMenuLabelToPlay()
 * Set navbar toggle to ▶ Play and update aria-pressed=false.
 */
function setMenuLabelToPlay() {
  const btn = getMenuPlayToggle(); 
  if (!btn) return; 
  btn.textContent = '▶ Play'; 
  btn.setAttribute('aria-pressed', 'false');
}

/**
 * setMenuLabelToPause()
 * Set navbar toggle to ⏸ Pause and update aria-pressed=true.
 */
function setMenuLabelToPause() {
  const btn = getMenuPlayToggle();
  if (!btn) return; 
  btn.textContent = '⏸ Pause'; 
  btn.setAttribute('aria-pressed', 'true'); 
}

/**
 * updatePlayMenuLabel()
 * Sync navbar + quick Play/Pause labels with body flags.
 */
function updatePlayMenuLabel() {
  const isPaused   = document.body.hasAttribute('data-paused');
  const isStarting = document.body.getAttribute('data-starting') === 'true';
  const runningLike = (!isPaused) || isStarting;
  if (!runningLike) {
    setMenuLabelToPlay();
  } else { 
    setMenuLabelToPause(); 
  }
  const quick = document.getElementById('quickPlayPause');
  if (quick) { 
    quick.setAttribute('aria-pressed', runningLike ? 'true' : 'false');
    quick.setAttribute('aria-label',  runningLike ? 'Pause' : 'Play');
  }
}

/**
 * wireMenuPlayToggle()
 * Bind quick and navbar Play/Pause buttons to emit start/pause intents.
 */
function wireMenuPlayToggle() {
  const quick = document.getElementById('quickPlayPause');
  const menu  = getMenuPlayToggle(); 
  const targets = [quick, menu].filter(Boolean); 
  targets.forEach((btn) => { 
    if (btn.dataset.wired === 'true') return;
    btn.dataset.wired = 'true';
    btn.addEventListener('click', () => {
      const isStarting = document.body.getAttribute('data-starting') === 'true';
      const isRunning  = !document.body.hasAttribute('data-paused');
      if (isStarting || isRunning) {
        window.dispatchEvent(new CustomEvent('ui:requestPause'));
      } else {
        window.dispatchEvent(new CustomEvent('ui:requestStartRun'));
      }
    });
  });
}

/**
 * wirePlayButton()
 * Bind the overlay round button to emit start/pause intents.
 */
function wirePlayButton() {
  const overlay = document.getElementById('overlay'); 
  if (!overlay) return; 
  const btn = overlay.querySelector('.play-btn');
  if (!btn) return; 
  if (btn.dataset.wired === 'true') return;
  btn.dataset.wired = 'true';
  btn.addEventListener('click', () => {
    const isStarting = document.body.getAttribute('data-starting') === 'true';
    const isRunning  = !document.body.hasAttribute('data-paused'); 
    if (isStarting || isRunning) { 
      window.dispatchEvent(new CustomEvent('ui:requestPause'));
    } else { 
      window.dispatchEvent(new CustomEvent('ui:requestStartRun'));
    }
  });
}

/**
 * bindControls()
 * Wire navbar/menu controls, panel open/close, and related shortcuts.
 * Internally delegates to helpers to keep function size small.
 */
function bindControls() {
  wireMenuPlayToggle(); // ensure play/pause buttons are wired
  _wireNavPanelButtons(); // wire navbar panel openers (non-settings tabs)
  _wirePanelCloseButtons(); // wire panel close buttons
  _wirePanelKeyShortcuts(); // wire global key shortcuts (S/Escape)
  _wireSettingsOpenersFromNavbar(); // wire navbar tabs to open Settings on specific pane
}



/**
 * _wireNavPanelButtons()
 * Wire navbar buttons for non-tab panels (tutorial/settings/highscore/credits via openPanel).
 */
function _wireNavPanelButtons() {
  const map = { tutorial: 'tutorial', settings: 'settings', highscore: 'highscore', credits: 'credits' };
  document.querySelectorAll('#primaryNav .nav-btn')
    .forEach((btn) => { 
      const action = btn.getAttribute('data-action');
      if (['tutorial','highscore','credits','settings'].includes(action)) return; // skip tab-driven (handled elsewhere)
      if (!map[action]) return;
      if (btn.dataset.wired === 'true') return; // avoid duplicates
      btn.dataset.wired = 'true'; 
      btn.addEventListener('click', () => { openPanel(map[action]); });
    });
}

/**
 * _wirePanelCloseButtons()
 * Wire close buttons inside panels to call closePanel(name).
 */
function _wirePanelCloseButtons() {
  document.querySelectorAll('.ui-panel [data-close-panel]') 
    .forEach((btn) => { 
      if (btn.dataset.wired === 'true') return;
      btn.dataset.wired = 'true';
      btn.addEventListener('click', () => { 
        const name = btn.getAttribute('data-close-panel');
        closePanel(name);
      });
    });
}

/**
 * _wirePanelKeyShortcuts()
 * Wire global key shortcuts for opening Settings and closing panels.
 */
function _wirePanelKeyShortcuts() {
  if (window.__panelKeysWired) return;
  window.__panelKeysWired = true;
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 's' || ev.key === 'S') {
      openPanel('settings'); 
      ev.preventDefault(); 
    }
    if (ev.key === 'Escape') {
      const open = document.body.getAttribute('data-panel-open');
      if (open) closePanel(open);
    }
  });
}

/**
 * _wireSettingsOpenersFromNavbar()
 * Open Settings to a specific tab when navbar items are clicked.
 */
function _wireSettingsOpenersFromNavbar() {
  document.querySelectorAll('#primaryNav .nav-btn')
    .forEach((btn) => { 
      const act = btn.getAttribute('data-action'); 
      if (!['tutorial','highscore','credits','settings'].includes(act)) return;
      if (btn.dataset.wiredSettingsTab === 'true') return;
      btn.dataset.wiredSettingsTab = 'true';
      btn.addEventListener('click', (ev) => { 
        ev.preventDefault(); 
        const targetTab = (act === 'settings' ? 'audio' : act);
        const collapseEl = document.querySelector('.topbar .navbar-collapse');
        if (collapseEl && collapseEl.classList.contains('show') && window.bootstrap) {
          const inst = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });
          const openAfterCollapse = () => { 
            collapseEl.removeEventListener('hidden.bs.collapse', openAfterCollapse); // cleanup
            openPanel('settings');
            selectSettingsTab(targetTab);
          };
          collapseEl.addEventListener('hidden.bs.collapse', openAfterCollapse, { once: true }); // one-time listener
          inst.hide();
          return; 
        }
        openPanel('settings');
        selectSettingsTab(targetTab);
      });
    });
}

/**
 * getHudInlineMode()
 * Return current HUD inline mode from body attr or saved localStorage.
 */
const HUD_MODE_KEY = 'hudInlineMode'; // storage key for HUD mode
function getHudInlineMode() {
  const attr = document.body.getAttribute('data-hud');
  const saved = localStorage.getItem(HUD_MODE_KEY);
  return (attr || saved || 'expanded'); 
}

/**
 * setHudInlineMode(mode)
 * Apply HUD inline mode to DOM, persist, and update button a11y.
 */
function setHudInlineMode(mode) {
  const v = (mode === 'collapsed') ? 'collapsed' : 'expanded'; // normalize mode
  document.body.setAttribute('data-hud', v);
  localStorage.setItem(HUD_MODE_KEY, v); // persist choice
  const btn  = document.getElementById('hudToggle'); // toggle chip element
  const icon = btn ? btn.querySelector('.hud-toggle__icon') : null;
  const text = btn ? btn.querySelector('.hud-toggle__text') : null;
  if (!btn || !icon || !text) return;
  btn.setAttribute('aria-expanded', String(v === 'expanded')); // reflect expanded state
  btn.setAttribute('aria-label', (v === 'expanded') ? 'Collapse HUD' : 'Expand HUD');
  if (v === 'expanded') { 
    icon.textContent = '▴';
    text.textContent = 'Collapse HUD'; 
  } else { 
    icon.textContent = '▾'; 
    text.textContent = 'Expand HUD';
  }
}

/**
 * toggleHudInline()
 * Flip HUD inline mode between expanded/collapsed.
 */
function toggleHudInline() {
  setHudInlineMode(getHudInlineMode() === 'expanded' ? 'collapsed' : 'expanded');
}

/**
 * wireHudInlineToggle()
 * Wire the HUD toggle chip and optional 'H' hotkey for testing.
 */
function wireHudInlineToggle() {
  const btn = document.getElementById('hudToggle');
  if (btn && btn.dataset.wired !== 'true') { 
    btn.dataset.wired = 'true'; 
    btn.addEventListener('click', toggleHudInline);
  }
  window.addEventListener('keydown', (e) => { // global hotkey
    if (e.repeat) return; // ignore repeats
    if ((e.key || '').toLowerCase() === 'h') { 
      e.preventDefault(); 
      toggleHudInline(); 
    }
  });
}

/**
 * judgeFlash(type)
 * Brief, colored flash on rails to indicate good/miss.
 */
function judgeFlash(type) {
  const rails = document.querySelector('.rails'); // rails root
  if (!rails) return;
  rails.classList.remove('flash-good','flash-miss');
  if (type === 'good') rails.classList.add('flash-good');
  if (type === 'miss') rails.classList.add('flash-miss'); 
  setTimeout(() => { rails.classList.remove('flash-good','flash-miss'); }, 320); // cleanup later
}

// Feedback timers
let _feedbackTimer = null; // active timeout id
let _feedbackSeq = 0; // sequence to avoid stale clears
const FEEDBACK_CLEAR_MS = 700; 

/**
 * setFeedback(label, flash)
 * Show textual feedback and trigger judgeFlash; auto-clear after delay.
 * Usage: setFeedback('Perfect','good') / setFeedback('MISS','miss')
 */
function setFeedback(label, flash) {
  const el = document.getElementById('feedback');
  if (!el) return; 
  if (_feedbackTimer) { clearTimeout(_feedbackTimer); _feedbackTimer = null; }
  el.textContent = label;
  if (flash === 'good') judgeFlash('good');
  if (flash === 'miss') judgeFlash('miss');
  const mySeq = ++_feedbackSeq; 
  _feedbackTimer = setTimeout(() => { 
    if (mySeq === _feedbackSeq) { el.textContent = ''; } 
    _feedbackTimer = null;
  }, FEEDBACK_CLEAR_MS); 
}

/**
 * initTopbarAutoHeight()
 * Fire a neutral layout event so listeners don't break.
 */
function initTopbarAutoHeight() {
  try { // safe try
    window.dispatchEvent(new CustomEvent('ui:layoutChanged', { detail: { topbarHeight: 0 } })); // neutral event
  } catch (_) { /* no-op */ } // ignore
}

// Guard: remove any leftover inline CSS vars 
(function guardLegacyLayoutCalls() {
  const s = document?.documentElement?.style;
  if (s) { s.removeProperty('--topbar-h'); }
})();

/**
 * initNavbarCollapseSync()
 * Keep body[data-nav-open] synced with Bootstrap collapse; pause on open.
 */
function initNavbarCollapseSync() {
  const collapseEl = document.querySelector('.topbar .navbar-collapse'); 
  const togglerEl  = document.querySelector('.navbar-toggler.hamburger'); 
  if (!collapseEl || !togglerEl || !window.bootstrap) return;
  const collapse = new bootstrap.Collapse(collapseEl, { toggle: false });
  const markOpen  = () => { document.body.setAttribute('data-nav-open', 'true'); togglerEl.setAttribute('aria-expanded', 'true'); }; // mark open
  const markClose = () => { document.body.removeAttribute('data-nav-open'); togglerEl.setAttribute('aria-expanded', 'false'); }; // mark close
  const pauseOnOpen = () => { window.dispatchEvent(new CustomEvent('ui:requestPause')); }; // pause game on open
  collapseEl.addEventListener('show.bs.collapse',  pauseOnOpen);
  collapseEl.addEventListener('show.bs.collapse',  markOpen);
  collapseEl.addEventListener('hide.bs.collapse',  markClose);
  collapseEl.addEventListener('shown.bs.collapse', markOpen);
  collapseEl.addEventListener('hidden.bs.collapse', markClose);
  const mqLgUp = window.matchMedia('(min-width: 992px)'); // breakpoint watcher
  const normalizeForViewport = () => { collapse.hide(); markClose(); }; // enforce closed on large
  normalizeForViewport();
  mqLgUp.addEventListener('change', normalizeForViewport); // re-normalize on change
}

/**
 * createHeart(stateClass)
 * Build an SVG heart in a given visual state class.
 */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('svg-heart', stateClass);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'); // heart path
  svg.appendChild(path);
  return svg;
}

/**
 * renderLives(container, lives, partial, steps)
 * Render hearts row based on lives and partial damage.
 */
function renderLives(container, lives, partial = 0, steps = 4) {
  if (!container) return; 
  container.innerHTML = ''; 
  const safeLives   = Math.max(0, lives);
  const safePartial = Math.min(Math.max(partial, 0), steps - 1);
  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart('full')); 
  }
  if (safeLives > 0) { // if one or more lives
    let klass = 'full';
    if (safePartial === 1) klass = 'threequarter';
    if (safePartial === 2) klass = 'half';
    if (safePartial === 3) klass = 'quarter';
    container.appendChild(createHeart(klass));
  }
  if (safeLives <= 0) {
    container.appendChild(createHeart('empty'));
  }
}

/**
 * updateHUD(snapshot)
 * Update on-screen HUD (lives, score, level, best) from snapshot.
 */
function updateHUD(snapshot) {
  if (!snapshot) return; // guard
  const livesEl = document.getElementById('lives'); 
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const bestEl  = document.getElementById('best');
  renderLives(livesEl, snapshot.lives, snapshot.partial);
  if (scoreEl) scoreEl.textContent = snapshot.score;
  if (levelEl) levelEl.textContent = snapshot.level;
  if (bestEl && typeof snapshot.best !== 'undefined') { bestEl.textContent = snapshot.best; }
}

/**
 * getRailsMap()
 * Return cached references to the four rails.
 */
function getRailsMap() {
  const root = document.querySelector('.rails');
  if (!root) return null;
  return { 
    left:  root.querySelector('.rail-left'),
    up:    root.querySelector('.rail-up'), 
    down:  root.querySelector('.rail-down'),
    right: root.querySelector('.rail-right') 
  };
}

/**
 * getJudgeDistancePx(railEl)
 * Compute px distance from rail top to judge line center (minus half note height).
 */
function getJudgeDistancePx(railEl) {
  if (!railEl) return 0; 
  const stageTop = railEl.getBoundingClientRect().top;
  const judge = document.querySelector('.judge-line');
  const { h: noteH } = getNoteBox();
  if (!judge) {
    return Math.max(0, railEl.clientHeight * 0.62 - (noteH / 2));
  }
  const jr = judge.getBoundingClientRect();
  const judgeCenterY = jr.top + (jr.height / 2);
  const dist = Math.max(0, judgeCenterY - stageTop - (noteH / 2));
  return dist; 
}

/**
 * getBottomDistancePx(railEl)
 * Compute px distance from rail top to bottom minus note height.
 */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0; 
  const { h } = getNoteBox();
  return Math.max(0, railEl.clientHeight - h);
}

/**
 * spawnNote(dir, travelBeats, bpm)
 * Create one falling orb in a lane; set CSS vars and animation duration.
 */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap();
  if (!rails || !rails[dir]) return null;
  const rail = rails[dir];
  const note = document.createElement('div'); 
  note.className = `note note-${dir} note--${dir}`;
  const judgePx  = getJudgeDistancePx(rail); 
  const bottomPx = getBottomDistancePx(rail); 
  note.style.setProperty('--drop-distance-judge',  `${judgePx}px`); 
  note.style.setProperty('--drop-distance-bottom', `${bottomPx}px`); 
  const msPerBeat = 60000 / bpm;
  const secondsToJudge = Math.max(0.08, travelBeats * (msPerBeat / 1000));
  const safeJudge = Math.max(1, judgePx);
  const safeBottom = Math.max(safeJudge + 1, bottomPx);
  const totalSeconds = secondsToJudge * (safeBottom / safeJudge);
  note.style.animationDuration = `${totalSeconds}s`;
  note.dataset.state = 'alive';
  rail.appendChild(note); 
  return note; 
}

/**
 * hideAllOverlayPanels()
 * Hide every panel inside #overlay that uses .play-cta shell.
 */
function hideAllOverlayPanels() {
  const panels = document.querySelectorAll('#overlay .play-cta');
  panels.forEach(el => el.classList.add('hidden'));
}

/**
 * showResultsOverlay(data)
 * Show Results panel, fill level/score/combo, and speak summary.
 */
function showResultsOverlay({ level, score, maxCombo }) {
  // Prep overlay
  hideAllOverlayPanels(); 
  showOverlay();

  // Randomize congrats headline 
  const congratsEl = document.getElementById('resCongrats');
  if (congratsEl) {
    const choices = ['YOU DID IT!', 'AWESOME JOB!', 'YOU NAILED IT!', 'NICE WORK!'];
    const i = Math.floor(Math.random() * choices.length);
    congratsEl.textContent = choices[i];
  }

  // Fill stats
  const set = (sel, v) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = v;
  };
  set('#resLevel',  level ?? '');
  set('#resScore',  score ?? 0);
  set('#resCombo',  maxCombo ?? 0);

  // Unhide panel
  const panel = document.getElementById('resultsCta');
  if (panel) panel.classList.remove('hidden');

  // Play success sting (non-blocking)
  playFxSuccess();

  // Screen reader summary
  srSpeak(`Level ${level ?? ''} clear. Score ${score ?? 0}. Max combo ${maxCombo ?? 0}.`);
}


/**
 * showPauseOverlay()
 * Show base CTA with a clear resume hint; keep overlay visible.
 */
function showPauseOverlay() {
  // Do nothing if a UI panel (e.g., Settings) is open
  const panelOpen = document.body.getAttribute('data-panel-open');
  if (panelOpen) return;

  // Do not touch overlay if Results or Game Over is visible
  const res = document.getElementById('resultsCta');
  const go  = document.getElementById('gameOverCta');
  const resultsVisible  = res && !res.classList.contains('hidden');
  const gameOverVisible = go && !go.classList.contains('hidden');
  if (resultsVisible || gameOverVisible) return;

  // Show base CTA with a clear pause message
  hideAllOverlayPanels(); 
  const baseCta = document.querySelector('#overlay .play-cta');
  if (baseCta) baseCta.classList.remove('hidden');

  setOverlayLabel('Game paused\nPress Play to resume');
  srSpeak('Game paused. Press Play to resume.');
  showOverlay();
}

// helper used by Game Over overlay
function setText(sel, v) {
  const el = document.querySelector(sel);
  if (el) el.textContent = v;
}

/**
 * showGameOverOverlay(data)
 * Show Game Over panel and fill level/score/combo; announce.
 */
function showGameOverOverlay({ level, score, maxCombo }) {
  hideAllOverlayPanels(); 
  showOverlay(); 

  // Fill fields 
  setText('#goLevel',  level ?? '');
  setText('#goScore',  score ?? 0);
  setText('#goCombo',  maxCombo ?? 0);

  // Unhide panel
  const panel = document.getElementById('gameOverCta');
  if (panel) panel.classList.remove('hidden');

  // Play fail sting exactly when panel appears
  playFxFail();

  // Screen reader announcement
  srSpeak(`Game over. Score ${score ?? 0}. Max combo ${maxCombo ?? 0}.`);
}



/**
 * initResultOverlays()
 * Wire buttons in Results and Game Over panels to emit UI events.
 */
function initResultOverlays() {
  const btnNext    = document.getElementById('btnNextLevel');
  const btnRestart = document.getElementById('btnRestartLevel'); 
  const btnRetry   = document.getElementById('btnRetryLevel');

  if (btnNext && btnNext.dataset.wired !== 'true') { 
    btnNext.dataset.wired = 'true';
    btnNext.addEventListener('click', () => {
      muteOverlayFx(600);
      hideAllOverlayPanels();
      window.dispatchEvent(new CustomEvent('ui:nextLevel')); 
    });
  }

  if (btnRestart && btnRestart.dataset.wired !== 'true') {
    btnRestart.dataset.wired = 'true';
    btnRestart.addEventListener('click', () => { 
      muteOverlayFx(600);
      hideAllOverlayPanels();
      window.dispatchEvent(new CustomEvent('ui:restartLevel'));
    });
  }

  if (btnRetry && btnRetry.dataset.wired !== 'true') {
    btnRetry.dataset.wired = 'true'; 
    btnRetry.addEventListener('click', () => { 
      muteOverlayFx(600);
      hideAllOverlayPanels(); 
      window.dispatchEvent(new CustomEvent('ui:retryLevel'));
    });
  }
}


/**
 * setOverlayIcon(mode)
 * Force overlay icon to 'play' | 'pause' | null (release to CSS when null).
 */
function setOverlayIcon(mode) {
  if (!iconPlay || !iconPause) return;
  if (mode === 'play') { iconPlay.style.display  = 'inline-block'; iconPause.style.display = 'none'; return; } 
  if (mode === 'pause') { iconPlay.style.display  = 'none'; iconPause.style.display = 'inline-block'; return; } 
  iconPlay.style.display  = '';
  iconPause.style.display = '';
}

// Focus helpers for panels (trap + restore)
const FOCUS_SEL = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
let _panelLastFocus = null; 
let _trapHandler = null;

/**
 * getFirstFocusable(container)
 * Return the first focusable element within a container or null.
 */
function getFirstFocusable(container) {
  const nodes = container.querySelectorAll(FOCUS_SEL);
  return nodes.length ? nodes[0] : null; 
}

/**
 * _trapFocusIn(container)
 * Trap Tab key within a container until panel is closed.
 */
function _trapFocusIn(container) {
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler);
  _trapHandler = (ev) => { 
    if (ev.key !== 'Tab') return;
    const list = Array.from(container.querySelectorAll(FOCUS_SEL))
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!list.length) return; 
    const first = list[0]; 
    const last = list[list.length - 1]; 
    if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); } 
    else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); } 
  };
  document.addEventListener('keydown', _trapFocusIn.handler = _trapHandler); // attach
}

/**
 * _rememberFocus()
 * Store the element that had focus before opening a panel.
 */
function _rememberFocus() {
  _panelLastFocus = document.activeElement; 
}

/**
 * _restoreFocus()
 * Restore focus to the element that had focus before opening the panel.
 */
function _restoreFocus() {
  if (_trapHandler) { document.removeEventListener('keydown', _trapHandler); _trapHandler = null; }
  if (_panelLastFocus && document.contains(_panelLastFocus)) { _panelLastFocus.focus(); } 
  _panelLastFocus = null; 
}

/**
 * openPanel(name)
 * Pause game, open the named panel, trap focus; if settings, wire its UI.
 */
function openPanel(name) {
  window.dispatchEvent(new CustomEvent('ui:requestPause'));
  const panel = document.getElementById(`panel-${name}`); 
  if (!panel) return; 
  document.body.setAttribute('data-panel-open', name); 
  panel.classList.remove('hidden'); 
  if (name === 'settings') srSpeak('Settings opened.'); 
  _rememberFocus(); // store last focus
  const first = getFirstFocusable(panel) || panel.querySelector('[data-close-panel]') || panel;
  first?.focus(); 
  _trapFocusIn(panel); 
  if (name === 'settings') { wireSettingsTabs(); wireSettingsControls(); renderHighScorePane(); } // ensure settings UI wired
}

/**
 * closePanel(name)
 * Hide panel, clear open flag, release focus trap, restore focus.
 */
function closePanel(name) {
  const panel = document.getElementById(`panel-${name}`);
  if (!panel) return; 
  panel.classList.add('hidden'); 
  if (document.body.getAttribute('data-panel-open') === name) {
    document.body.removeAttribute('data-panel-open');
  }

  // If the game is paused when a panel closes, and no Results/Game Over is showing,
  // bring back the pause CTA so the user is not left with an empty screen.
  const isPaused   = document.body.hasAttribute('data-paused');
  const isStarting = document.body.getAttribute('data-starting') === 'true';
  const res = document.getElementById('resultsCta');
  const go  = document.getElementById('gameOverCta');
  const resultsVisible  = res && !res.classList.contains('hidden');
  const gameOverVisible = go && !go.classList.contains('hidden');
  if (isPaused && !isStarting && !resultsVisible && !gameOverVisible) {
    showPauseOverlay();
  }

  _restoreFocus(); // restore focus and cleanup trap
}


/**
 * loadSettings()
 * Load settings from localStorage or return defaults.
 */
function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY); // read JSON string
  if (raw) { try { return JSON.parse(raw); } catch (_) {} } // parse or ignore
  return { volume: 0.8, muted: false, reduceMotion: false, noFlash: false, countdown: 3 };
}

/**
 * saveSettings(s)
 * Persist settings to localStorage.
 */
function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/**
 * applySettings(s)
 * Apply reduce-motion/no-flash to body and notify audio volume.
 */
function applySettings(s) {
  // audio volume
  window.dispatchEvent(new CustomEvent('audio:setMasterVolume', {
    detail: { volume: s.muted ? 0 : s.volume }
  }));

  // comfort flags
  if (s.reduceMotion) document.body.setAttribute('data-reduce-motion', 'true');
  else document.body.removeAttribute('data-reduce-motion');

  if (s.noFlash) document.body.setAttribute('data-no-flash', 'true');
  else document.body.removeAttribute('data-no-flash');


  const raw = Number(s.countdown);
  const cd = Number.isFinite(raw) ? raw : 3;

  window.__settings = window.__settings || {};
  window.__settings.countdown = cd; 
}

/**
 * wireSettingsControls()
 * Sync settings form with storage and persist on changes.
 * Internally delegates to small helpers for readability.
 */
function wireSettingsControls() {
  const form = document.getElementById('settingsForm'); 
  if (!form || form.dataset.wired === 'true') return;
  form.dataset.wired = 'true';
  const refs = _readSettingsFormRefs();
  let s = loadSettings(); 
  _syncFormFromSettings(refs, s); // reflect into UI
  applySettings(s);
  const persist = () => { saveSettings(s); applySettings(s); };
  _attachSettingsListeners(refs, s, persist); 
}

/**
 * _readSettingsFormRefs()
 * Return references to all settings controls used in the form.
 */
function _readSettingsFormRefs() {
  return {
    elVolume:    document.getElementById('settingsVolume'), // slider
    elMute:      document.getElementById('settingsMute'), // checkbox
    elReduce:    document.getElementById('settingsReduceMotion'), // toggle
    elNoFlash:   document.getElementById('settingsNoFlash'), // toggle
    elCountdown: document.getElementById('settingsCountdown'), // select
    elReset:     document.getElementById('settingsResetData'), // button
  };
}

/**
 * _syncFormFromSettings(refs, s)
 * Mirror settings values to the form controls.
 */
function _syncFormFromSettings(refs, s) {
  const { elVolume, elMute, elReduce, elNoFlash, elCountdown } = refs; // destructure
  if (elVolume)   elVolume.value   = Math.round((s.volume ?? 0.8) * 100);
  if (elMute)     elMute.checked   = !!s.muted;
  if (elReduce)   elReduce.setAttribute('aria-pressed', (!!s.reduceMotion) ? 'true' : 'false');
  if (elNoFlash)  elNoFlash.setAttribute('aria-pressed', (!!s.noFlash) ? 'true' : 'false'); 
  if (elCountdown)elCountdown.value= String(s.countdown ?? 3); 
}


function _attachSettingsListeners(refs, s, persist) {
  const { elVolume, elMute, elReduce, elNoFlash, elCountdown, elReset } = refs; 

  // Volume slider: update volume and play preview ping
  if (elVolume) {
    elVolume.addEventListener('input', () => {
      const raw = Number(elVolume.value);
      const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 80;
      s.volume = clamped / 100;
      persist(); 

      // trigger volume preview ping at the current volume
      window.dispatchEvent(new CustomEvent('audio:previewVolume'));
    });
  }

  // Mute checkbox: toggle muted on/off
  if (elMute) {
    elMute.addEventListener('change', () => {
      s.muted = !!elMute.checked; // true if checked
      persist();
    });
  }

  // Reduce Motion toggle: aria-pressed + setting flag
  if (elReduce) {
    elReduce.addEventListener('click', () => {
      const next = elReduce.getAttribute('aria-pressed') !== 'true'; 
      elReduce.setAttribute('aria-pressed', next ? 'true' : 'false');
      s.reduceMotion = next; 
      persist();
    });
  }

  // No Flash toggle: aria-pressed + setting flag
  if (elNoFlash) {
    elNoFlash.addEventListener('click', () => {
      const next = elNoFlash.getAttribute('aria-pressed') !== 'true'; // flip state
      elNoFlash.setAttribute('aria-pressed', next ? 'true' : 'false'); 
      s.noFlash = next;
      persist();
    });
  }

  // Countdown select: store 0 / 3 / 5 (or fallback to 3)
  if (elCountdown) {
    elCountdown.addEventListener('change', () => {
      const v = Number(elCountdown.value); 
      s.countdown = (Number.isFinite(v) && v >= 0) ? v : 3;
      persist();
    });
  }

  // Reset button: clear storage, reload defaults, resync form and settings
  if (elReset) {
    elReset.addEventListener('click', () => {
      const ok = confirm('Reset all saved progress and settings?');
      if (!ok) return; 

      try {
        localStorage.clear();
      } catch (_) {
      
      }

      const fresh = loadSettings(); // reload default settings
      _syncFormFromSettings(refs, fresh); // update form fields from defaults

      // copy values into current settings object
      s.volume = fresh.volume;
      s.muted = fresh.muted;
      s.reduceMotion = fresh.reduceMotion;
      s.noFlash = fresh.noFlash;
      s.countdown = fresh.countdown;

      persist();
      alert('Game data has been reset.');
    });
  }
}


/**
 * renderHighScorePane()
 * Populate the High Score pane with the current BEST and wire reset.
 */
function renderHighScorePane() {
  const readBest = () => { // helper to read best
    try {
      const fromLS = Number(localStorage.getItem('best') || 0);
      if (!Number.isNaN(fromLS) && fromLS > 0) return fromLS;
    } catch (_) {} 
    const hudBest = Number((document.getElementById('best')?.textContent || '0').replace(/\D+/g, '')) || 0; // fallback to HUD
    return hudBest; 
  };
  const out = document.getElementById('hiBestValue'); // output node
  if (out) out.textContent = readBest();
  const btn = document.getElementById('resetHighScore'); 
  if (btn && btn.dataset.wired !== 'true') { 
    btn.dataset.wired = 'true'; 
    btn.addEventListener('click', () => {
      const ok = confirm('Reset BEST score only?');
      if (!ok) return;
      try { localStorage.setItem('best', '0'); } catch (_) {} // reset LS key
      const hudBest = document.getElementById('best'); 
      if (hudBest) hudBest.textContent = '0'; 
      if (out) out.textContent = '0'; // 
    });
  }
}

/**
 * selectSettingsTab(name)
 * Switch visible settings pane; keep all tab buttons visible/marked.
 */
function selectSettingsTab(name) {
  if (name === 'settings') name = 'audio'; 
  const tabs = document.querySelectorAll('.settings-tab'); 
  const panes = { 
    audio:         document.getElementById('settingsPane-audio'),
    accessibility: document.getElementById('settingsPane-accessibility'),
    tutorial:      document.getElementById('settingsPane-tutorial'),
    highscore:     document.getElementById('settingsPane-highscore'),
    credits:       document.getElementById('settingsPane-credits')
  };
  Object.entries(panes).forEach(([key, el]) => { if (!el) return; const show = key === name; el.classList.toggle('hidden', !show); el.toggleAttribute('aria-hidden', !show); }); // show target, hide others
  tabs.forEach((btn) => { const raw = btn.dataset.settingsTab || 'audio'; const btnName = (raw === 'settings') ? 'audio' : raw; const isActive = btnName === name; btn.setAttribute('aria-selected', isActive ? 'true' : 'false'); btn.removeAttribute('aria-hidden'); btn.classList.remove('hidden'); btn.setAttribute('tabindex', '0'); }); // mark tabs
  if (name === 'highscore') { renderHighScorePane(); } // refresh when needed
}

/**
 * wireSettingsTabs()
 * Wire settings tab buttons and default to 'audio' pane.
 */
function wireSettingsTabs() {
  const bar = document.querySelector('.settings-tabs');
  if (!bar || bar.dataset.wired === 'true') return; 
  bar.dataset.wired = 'true';
  bar.querySelectorAll('.settings-tab').forEach(btn => { 
    btn.addEventListener('click', () => { const name = btn.dataset.settingsTab || 'audio'; selectSettingsTab(name); }); // on click select
  });
  selectSettingsTab('audio'); 
}

// Bonus banner FX: one-shot flash on start
 

let _bonusFXWired = false;
function initBonusBannerFX() {
  if (_bonusFXWired) return;  
  _bonusFXWired = true;

  const sel = '#bonusBanner';         // target the banner element itself

  // one-shot flash helper
  const flashOnce = () => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove('flash-once');
    void el.offsetWidth;               // reflow to allow retrigger
    el.classList.add('flash-once');    // play once
  };

  // when bonus starts → flash
  window.addEventListener('bonus:started', flashOnce);

  // when bonus ends → remove flash class
  window.addEventListener('bonus:ended', () => {
    const el = document.querySelector(sel);
    if (el) el.classList.remove('flash-once');
  });

  // natural song end → ensure flash class is cleared
  window.addEventListener('song:ended', (e) => {
    const reason = e?.detail?.reason || 'completed';
    if (reason !== 'paused' && reason !== 'stopped') {
      const el = document.querySelector(sel);
      if (el) el.classList.remove('flash-once');
    }
  });
}


/**
 * _ensureBonusBanner()
 * Create #bonusBanner just before #feedback if missing; return the node.
 */
function _ensureBonusBanner() {
  let node = document.getElementById('bonusBanner'); // find existing
  if (node) return node;
  const feedback = document.getElementById('feedback');
  node = document.createElement('div'); // create banner
  node.id = 'bonusBanner';
  node.className = 'bonus-banner'; 
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  if (feedback && feedback.parentNode) {
    feedback.parentNode.insertBefore(node, feedback); 
  } else {
    document.body.appendChild(node); // fallback attach to body
  }
  return node; 
}

/**
 * showBonusBanner(text)
 * Show the bonus banner with an initial text.
 */
function showBonusBanner(text = 'BONUS MODE!') {
  const node = _ensureBonusBanner(); 
  node.textContent = text;
  node.classList.remove('hidden');
}


/**
 * hideBonusBanner()
 * Hide/clear the bonus banner.
 */
function hideBonusBanner() {
  const node = document.getElementById('bonusBanner');
  if (!node) return;
  node.textContent = '';
  node.classList.add('hidden');
}

/**
  * Bonus UI hooks (banner only)
  * Shows "BONUS MODE!" at start and "BONUS MODE ENDED" briefly at end.
  * No counters/progress in the banner by design.
 */

(function wireBonusUiHooks() {
  let endTimer = null; // timer for hiding the end message

  window.addEventListener('bonus:started', () => {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; } 
    document.body.setAttribute('data-bonus', 'true');
    showBonusBanner('BONUS MODE!'); 
    srSpeak('Bonus mode started'); 
  });

  window.addEventListener('bonus:ended', () => {
    document.body.removeAttribute('data-bonus'); 
    showBonusBanner('BONUS MODE ENDED'); 
    srSpeak('Bonus mode ended'); 
    endTimer = setTimeout(() => { hideBonusBanner(); }, 1800);
  });

  window.addEventListener('song:ended', (e) => {
    const reason = e?.detail?.reason || 'completed'; 
    if (reason !== 'paused' && reason !== 'stopped') { 
      document.body.removeAttribute('data-bonus');
      showBonusBanner('BONUS MODE ENDED');
      srSpeak('Bonus mode ended'); 
      endTimer = setTimeout(() => { hideBonusBanner(); }, 1500);
    }
  });
})();

// --- Keep overlay-label lock in sync with UI intents ---
(function syncOverlayLabelLock() {
  // When user intends to start/resume → release lock (countdown may update label)
  window.addEventListener('ui:requestStartRun', () => {
    _overlayLabelLock = null;
  });

  // When song actually starts → also release (belt-and-braces)
  window.addEventListener('song:started', () => {
    _overlayLabelLock = null;
  });

  // When user pauses (from anywhere) → apply lock and enforce the paused label
  window.addEventListener('ui:requestPause', () => {
    _overlayLabelLock = 'pause';
    setOverlayLabel('Game paused\nPress Play to resume', { override: true });
    showOverlay();
  });
})();

/* Placeholder so game.js import doesn't crash (no-op) */
function bindFutureControlsPlaceholder() { /* intentionally empty */ }



// Export UI functions

export {
  HUD_MODE_KEY,
  bindControls,
  hideOverlay,
  initNavbarCollapseSync,
  initResultOverlays,
  initRotateOverlay,
  setFeedback,
  setHudInlineMode,
  setOverlayLabel,
  showGameOverOverlay,
  showOverlay,
  showPauseOverlay,
  showResultsOverlay,
  spawnNote,
  updateHUD,
  updatePlayMenuLabel,
  wireHudInlineToggle,
  wireMenuPlayToggle,
  wirePlayButton,
  setPlayTip,
  setOverlayIcon,
  initTopbarAutoHeight,
  bindFutureControlsPlaceholder,
  initBonusBannerFX,
  unlockFxOnce,
}