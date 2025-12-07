// ui.js
/* global bootstrap */
// --- TEMP DEBUG ---
console.log('[ui] module loaded'); // log that ui module has loaded

/* ---------------------------
   UI related functions
---------------------------- */

// Storage key for settings, declared before loadSettings/saveSettings are used
const SETTINGS_KEY = 'settings'; // storage key for user settings

/* --------------------------------------
   FX: one-shot sounds for overlays
   - Preload once, reuse same Audio objects
--------------------------------------- */
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


/* ----------------------------------------
   Screen reader live-region 
   Looks for #srLive; falls back to legacy #srRegion; otherwise creates #srLive.
---------------------------------------- */
let srRegion = // region reference holder
  document.getElementById('srLive') || // prefer #srLive
  document.getElementById('srRegion'); // fall back to legacy id

if (!srRegion) { // if missing, create one
  srRegion = document.createElement('div'); // create container
  srRegion.id = 'srLive'; // set id
  srRegion.className = 'sr-only'; // hide visually
  srRegion.setAttribute('role', 'status'); // set role
  srRegion.setAttribute('aria-live', 'polite'); // polite announcements
  srRegion.setAttribute('aria-atomic', 'true'); // replace whole message
  document.body.appendChild(srRegion); // attach to body
} else { // normalize legacy node
  srRegion.id = 'srLive'; // enforce id
  srRegion.classList.add('sr-only'); // ensure visually hidden class
  srRegion.setAttribute('role', 'status'); // set role
  srRegion.setAttribute('aria-live', 'polite'); // live mode
  srRegion.setAttribute('aria-atomic', 'true'); // atomic updates
}

/**
 * srSpeak(msg)
 * Announce a short message to screen readers via the live-region.
 */
function srSpeak(msg = '') {
  if (!srRegion) return; // guard when region is missing
  srRegion.textContent = ''; // clear first to retrigger
  setTimeout(() => { srRegion.textContent = String(msg); }, 30); // async update so AT re-announces
}

/* ----------------------------------------
   Note metrics: measure once, cache, and re-measure on layout changes.
---------------------------------------- */
let _noteBox = { w: 40, h: 40 }; // default note size until measured

/**
 * measureNoteBox()
 * Create a temporary note, measure it, cache width/height.
 */
function measureNoteBox() {
  const el = document.createElement('div'); // create temp node
  el.className = 'note note-left'; // any note class has same size
  el.style.position = 'absolute'; // position off-screen
  el.style.left = '-9999px'; // move out of view
  el.style.top = '-9999px'; // move out of view
  el.style.pointerEvents = 'none'; // avoid interference
  document.body.appendChild(el); // attach for layout
  const rect = el.getBoundingClientRect(); // read size
  _noteBox = { // cache safe rounded values
    w: Math.max(1, Math.round(rect.width)), // width
    h: Math.max(1, Math.round(rect.height)), // height
  };
  el.remove(); // cleanup temp node
  return _noteBox; // return cached box
}

/**
 * getNoteBox()
 * Return last measured note box dimensions.
 */
function getNoteBox() {
  return _noteBox; // return cached dimensions
}

/**
 * scheduleReMeasureNoteBox()
 * Re-measure note box on next animation frame.
 */
function scheduleReMeasureNoteBox() {
  requestAnimationFrame(measureNoteBox); // queue measure
}

// Initial measure on ready
if (document.readyState !== 'loading') { // if DOM ready
  measureNoteBox(); // measure immediately
} else {
  document.addEventListener('DOMContentLoaded', measureNoteBox, { once: true }); // measure once on load
}

// Re-measure when fonts load (rem-based sizes settle)
document.fonts?.ready?.then(measureNoteBox); // when fonts ready, re-measure
// Re-measure on viewport/orientation changes
window.addEventListener('resize', scheduleReMeasureNoteBox); // on resize re-measure
window.addEventListener('orientationchange', scheduleReMeasureNoteBox); // on orientation change re-measure

// **Overlay (Play/Pause) controls */
const overlayEl = document.getElementById('overlay'); // overlay root 
const iconPlay  = overlayEl ? overlayEl.querySelector('.icon-play')  : null; 
const iconPause = overlayEl ? overlayEl.querySelector('.icon-pause') : null;
// --- Overlay label lock (prevents other code from changing text while paused)
let _overlayLabelLock = null;

/**
 * showOverlay()
 * Reveal the overlay layer.
 */
function showOverlay() {
  const el = document.getElementById('overlay'); // lookup fresh overlay
  if (el) el.classList.remove('hidden'); // remove hidden class
}

/**
 * hideOverlay()
 * Hide the overlay layer.
 */
function hideOverlay() {
  const el = document.getElementById('overlay'); // lookup fresh overlay
  if (el) el.classList.add('hidden'); // add hidden class
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
  const overlay = document.getElementById('overlay'); // fetch overlay
  if (!overlay) return; // guard if missing
  const cta = overlay.querySelector('.play-cta'); // get CTA shell
  if (!cta) return; // guard if missing
  let tip = cta.querySelector('.play-tip'); // find existing tip
  if (!tip) { // create if absent
    tip = document.createElement('div'); // make element
    tip.className = 'play-tip'; // set class
    cta.insertBefore(tip, cta.firstChild); // place above button
  }
  tip.textContent = String(text); // set/update copy
}

/**
 * (rotate) shared refs
 * Keep global references for rotate overlay helpers.
 */
const body = document.body; // quick body ref
const rotateOverlay = document.getElementById('rotateOverlay'); // rotate overlay root
const rotateCloseBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; // close button

// match same MQs as CSS
const mqTinyLandscape = window.matchMedia('(max-width: 767.98px) and (orientation: landscape)'); // tiny landscape mq
const mqShortHeight   = window.matchMedia('(max-height: 480px)'); // very short height mq

/**
 * updateRotateOverlayAria()
 * Synchronize aria/inert for rotate overlay based on MQs and dismissal flag.
 */
function updateRotateOverlayAria() {
  if (!rotateOverlay) return; // guard early
  const dismissed = body.getAttribute('data-rotate-dismissed') === 'true'; // user dismissal state
  const visibleByMQ = (mqTinyLandscape.matches || mqShortHeight.matches); // MQ visibility
  const shouldShow = visibleByMQ && !dismissed; // final decision
  if (shouldShow) { // show overlay
    rotateOverlay.removeAttribute('inert'); // enable focus/interaction
    rotateOverlay.setAttribute('aria-hidden', 'false'); // expose to a11y
    if (rotateCloseBtn) rotateCloseBtn.focus(); // focus inside overlay
  } else { // hide overlay
    if (rotateOverlay.contains(document.activeElement)) { // if focus inside
      document.activeElement.blur?.(); // blur active element
    }
    rotateOverlay.setAttribute('inert', ''); // block background focus
    rotateOverlay.setAttribute('aria-hidden', 'true'); // hide from a11y
  }
}

/**
 * dismissRotateUntilPortrait()
 * Hide rotate overlay until orientation/height normalizes again.
 */
function dismissRotateUntilPortrait() {
  if (rotateOverlay && rotateOverlay.contains(document.activeElement)) { // if focusing inside
    document.activeElement.blur?.(); // blur first
  }
  body.setAttribute('data-rotate-dismissed', 'true'); // remember dismissal
  updateRotateOverlayAria(); // apply state immediately
}

/**
 * resetDismissalIfPortrait()
 * Clear dismissal flag when not in tiny landscape anymore.
 */
function resetDismissalIfPortrait() {
  if (!mqTinyLandscape.matches) { // if portrait or large
    body.removeAttribute('data-rotate-dismissed'); // clear dismissal
  }
  updateRotateOverlayAria(); // resync aria/inert
}

/**
 * initRotateOverlay()
 * Wire listeners and perform the initial sync for rotate overlay.
 */
function initRotateOverlay() {
  if (!rotateOverlay) return; // guard early
  if (rotateCloseBtn && rotateCloseBtn.dataset.wired !== 'true') { // wire close once
    rotateCloseBtn.dataset.wired = 'true'; // mark wired
    rotateCloseBtn.addEventListener('click', (e) => { // on click
      e.preventDefault(); // prevent default
      dismissRotateUntilPortrait(); // dismiss overlay
    });
  }
  mqTinyLandscape.addEventListener('change', updateRotateOverlayAria); // react to mq changes
  mqShortHeight.addEventListener('change',   updateRotateOverlayAria); // react to mq changes
  window.addEventListener('resize',          updateRotateOverlayAria); // react to resize
  window.matchMedia('(orientation: landscape)').addEventListener('change', resetDismissalIfPortrait); // reset on orient
  updateRotateOverlayAria(); // initial sync
}

/**
 * getMenuPlayToggle()
 * Return the navbar Play/Pause toggle button.
 */
function getMenuPlayToggle() {
  return document.getElementById('menuPlayToggle'); // fetch button by id
}

/**
 * setMenuLabelToPlay()
 * Set navbar toggle to ▶ Play and update aria-pressed=false.
 */
function setMenuLabelToPlay() {
  const btn = getMenuPlayToggle(); // get button
  if (!btn) return; // guard
  btn.textContent = '▶ Play'; // set label
  btn.setAttribute('aria-pressed', 'false'); // reflect state
}

/**
 * setMenuLabelToPause()
 * Set navbar toggle to ⏸ Pause and update aria-pressed=true.
 */
function setMenuLabelToPause() {
  const btn = getMenuPlayToggle(); // get button
  if (!btn) return; // guard
  btn.textContent = '⏸ Pause'; // set label
  btn.setAttribute('aria-pressed', 'true'); // reflect state
}

/**
 * updatePlayMenuLabel()
 * Sync navbar + quick Play/Pause labels with body flags.
 */
function updatePlayMenuLabel() {
  const isPaused   = document.body.hasAttribute('data-paused'); // paused flag
  const isStarting = document.body.getAttribute('data-starting') === 'true'; // starting flag
  const runningLike = (!isPaused) || isStarting; // compute running-like
  if (!runningLike) { // if not running-like
    setMenuLabelToPlay(); // show Play
  } else { // otherwise
    setMenuLabelToPause(); // show Pause
  }
  const quick = document.getElementById('quickPlayPause'); // quick button
  if (quick) { // if present
    quick.setAttribute('aria-pressed', runningLike ? 'true' : 'false'); // set aria-pressed
    quick.setAttribute('aria-label',  runningLike ? 'Pause' : 'Play'); // set aria-label
  }
}

/**
 * wireMenuPlayToggle()
 * Bind quick and navbar Play/Pause buttons to emit start/pause intents.
 */
function wireMenuPlayToggle() {
  const quick = document.getElementById('quickPlayPause'); // floating round button
  const menu  = getMenuPlayToggle(); // navbar button
  const targets = [quick, menu].filter(Boolean); // only existing
  targets.forEach((btn) => { // loop both
    if (btn.dataset.wired === 'true') return; // avoid duplicates
    btn.dataset.wired = 'true'; // mark as wired
    btn.addEventListener('click', () => { // on click
      const isStarting = document.body.getAttribute('data-starting') === 'true'; // countdown phase
      const isRunning  = !document.body.hasAttribute('data-paused'); // visuals unpaused
      if (isStarting || isRunning) { // if starting or running
        window.dispatchEvent(new CustomEvent('ui:requestPause')); // ask to pause
      } else { // otherwise
        window.dispatchEvent(new CustomEvent('ui:requestStartRun')); // ask to start
      }
    });
  });
}

/**
 * wirePlayButton()
 * Bind the overlay round button to emit start/pause intents.
 */
function wirePlayButton() {
  const overlay = document.getElementById('overlay'); // fetch overlay
  if (!overlay) return; // guard if absent
  const btn = overlay.querySelector('.play-btn'); // find CTA button
  if (!btn) return; // guard if missing
  if (btn.dataset.wired === 'true') return; // avoid double-binding
  btn.dataset.wired = 'true'; // mark wired
  btn.addEventListener('click', () => { // on click
    const isStarting = document.body.getAttribute('data-starting') === 'true'; // check starting
    const isRunning  = !document.body.hasAttribute('data-paused'); // check running
    if (isStarting || isRunning) { // treat both as pause intent
      window.dispatchEvent(new CustomEvent('ui:requestPause')); // request pause
    } else { // otherwise
      window.dispatchEvent(new CustomEvent('ui:requestStartRun')); // request start
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
  const map = { tutorial: 'tutorial', settings: 'settings', highscore: 'highscore', credits: 'credits' }; // action→panel map
  document.querySelectorAll('#primaryNav .nav-btn') // scan nav buttons
    .forEach((btn) => { // iterate buttons
      const action = btn.getAttribute('data-action'); // read action
      if (['tutorial','highscore','credits','settings'].includes(action)) return; // skip tab-driven (handled elsewhere)
      if (!map[action]) return; // skip unknown actions
      if (btn.dataset.wired === 'true') return; // avoid duplicates
      btn.dataset.wired = 'true'; // mark wired
      btn.addEventListener('click', () => { openPanel(map[action]); }); // open mapped panel
    });
}

/**
 * _wirePanelCloseButtons()
 * Wire close buttons inside panels to call closePanel(name).
 */
function _wirePanelCloseButtons() {
  document.querySelectorAll('.ui-panel [data-close-panel]') // scan close buttons
    .forEach((btn) => { // iterate
      if (btn.dataset.wired === 'true') return; // avoid duplicates
      btn.dataset.wired = 'true'; // mark wired
      btn.addEventListener('click', () => { // on click
        const name = btn.getAttribute('data-close-panel'); // read panel name
        closePanel(name); // close that panel
      });
    });
}

/**
 * _wirePanelKeyShortcuts()
 * Wire global key shortcuts for opening Settings and closing panels.
 */
function _wirePanelKeyShortcuts() {
  if (window.__panelKeysWired) return; // singleton guard
  window.__panelKeysWired = true; // set guard
  window.addEventListener('keydown', (ev) => { // on keydown
    if (ev.key === 's' || ev.key === 'S') { // S opens settings
      openPanel('settings'); // open settings
      ev.preventDefault(); // prevent default behavior
    }
    if (ev.key === 'Escape') { // Escape closes current panel
      const open = document.body.getAttribute('data-panel-open'); // read open panel
      if (open) closePanel(open); // close if any
    }
  });
}

/**
 * _wireSettingsOpenersFromNavbar()
 * Open Settings to a specific tab when navbar items are clicked.
 */
function _wireSettingsOpenersFromNavbar() {
  document.querySelectorAll('#primaryNav .nav-btn') // scan nav buttons
    .forEach((btn) => { // iterate
      const act = btn.getAttribute('data-action'); // read action
      if (!['tutorial','highscore','credits','settings'].includes(act)) return; // only settings tabs
      if (btn.dataset.wiredSettingsTab === 'true') return; // avoid duplicates
      btn.dataset.wiredSettingsTab = 'true'; // mark wired
      btn.addEventListener('click', (ev) => { // on click
        ev.preventDefault(); // prevent default navigation
        const targetTab = (act === 'settings' ? 'audio' : act); // decide pane name
        const collapseEl = document.querySelector('.topbar .navbar-collapse'); // bootstrap collapse
        if (collapseEl && collapseEl.classList.contains('show') && window.bootstrap) { // if burger open
          const inst = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false }); // get instance
          const openAfterCollapse = () => { // handler after hide
            collapseEl.removeEventListener('hidden.bs.collapse', openAfterCollapse); // cleanup
            openPanel('settings'); // open settings
            selectSettingsTab(targetTab); // select tab
          };
          collapseEl.addEventListener('hidden.bs.collapse', openAfterCollapse, { once: true }); // one-time listener
          inst.hide(); // close burger
          return; // stop here
        }
        openPanel('settings'); // desktop path
        selectSettingsTab(targetTab); // select tab
      });
    });
}

/**
 * getHudInlineMode()
 * Return current HUD inline mode from body attr or saved localStorage.
 */
const HUD_MODE_KEY = 'hudInlineMode'; // storage key for HUD mode
function getHudInlineMode() {
  const attr = document.body.getAttribute('data-hud'); // body data attribute
  const saved = localStorage.getItem(HUD_MODE_KEY); // saved value
  return (attr || saved || 'expanded'); // prefer attr → saved → default
}

/**
 * setHudInlineMode(mode)
 * Apply HUD inline mode to DOM, persist, and update button a11y.
 */
function setHudInlineMode(mode) {
  const v = (mode === 'collapsed') ? 'collapsed' : 'expanded'; // normalize mode
  document.body.setAttribute('data-hud', v); // set body attribute
  localStorage.setItem(HUD_MODE_KEY, v); // persist choice
  const btn  = document.getElementById('hudToggle'); // toggle chip element
  const icon = btn ? btn.querySelector('.hud-toggle__icon') : null; // icon span
  const text = btn ? btn.querySelector('.hud-toggle__text') : null; // text span
  if (!btn || !icon || !text) return; // guard if markup missing
  btn.setAttribute('aria-expanded', String(v === 'expanded')); // reflect expanded state
  btn.setAttribute('aria-label', (v === 'expanded') ? 'Collapse HUD' : 'Expand HUD'); // label for SR
  if (v === 'expanded') { // expanded state
    icon.textContent = '▴'; // arrow up glyph
    text.textContent = 'Collapse HUD'; // button text
  } else { // collapsed state
    icon.textContent = '▾'; // arrow down glyph
    text.textContent = 'Expand HUD'; // button text
  }
}

/**
 * toggleHudInline()
 * Flip HUD inline mode between expanded/collapsed.
 */
function toggleHudInline() {
  setHudInlineMode(getHudInlineMode() === 'expanded' ? 'collapsed' : 'expanded'); // toggle
}

/**
 * wireHudInlineToggle()
 * Wire the HUD toggle chip and optional 'H' hotkey for testing.
 */
function wireHudInlineToggle() {
  const btn = document.getElementById('hudToggle'); // toggle button
  if (btn && btn.dataset.wired !== 'true') { // if exists and not wired
    btn.dataset.wired = 'true'; // mark wired
    btn.addEventListener('click', toggleHudInline); // click toggles
  }
  window.addEventListener('keydown', (e) => { // global hotkey
    if (e.repeat) return; // ignore repeats
    if ((e.key || '').toLowerCase() === 'h') { // if 'h'
      e.preventDefault(); // prevent default behavior
      toggleHudInline(); // toggle hud
    }
  });
}

/**
 * judgeFlash(type)
 * Brief, colored flash on rails to indicate good/miss.
 */
function judgeFlash(type) {
  const rails = document.querySelector('.rails'); // rails root
  if (!rails) return; // guard early
  rails.classList.remove('flash-good','flash-miss'); // reset classes
  if (type === 'good') rails.classList.add('flash-good'); // success flash
  if (type === 'miss') rails.classList.add('flash-miss'); // miss flash
  setTimeout(() => { rails.classList.remove('flash-good','flash-miss'); }, 320); // cleanup later
}

// Feedback timers
let _feedbackTimer = null; // active timeout id
let _feedbackSeq = 0; // sequence to avoid stale clears
const FEEDBACK_CLEAR_MS = 700; // message duration

/**
 * setFeedback(label, flash)
 * Show textual feedback and trigger judgeFlash; auto-clear after delay.
 * Usage: setFeedback('Perfect','good') / setFeedback('MISS','miss')
 */
function setFeedback(label, flash) {
  const el = document.getElementById('feedback'); // feedback node
  if (!el) return; // guard if missing
  if (_feedbackTimer) { clearTimeout(_feedbackTimer); _feedbackTimer = null; } // cancel prior timer
  el.textContent = label; // set message
  if (flash === 'good') judgeFlash('good'); // flash for good
  if (flash === 'miss') judgeFlash('miss'); // flash for miss
  const mySeq = ++_feedbackSeq; // increment sequence
  _feedbackTimer = setTimeout(() => { // schedule clear
    if (mySeq === _feedbackSeq) { el.textContent = ''; } // only clear newest
    _feedbackTimer = null; // drop handle
  }, FEEDBACK_CLEAR_MS); // wait before clear
}

/* ==========================================================
   Layout measurements (DISABLED)
   We do not measure header/controls or write CSS vars anymore.
   CSS-only layout manages the vertical sizing now.
   ========================================================== */

/**
 * initTopbarAutoHeight()
 * Fire a neutral layout event so listeners don't break.
 */
function initTopbarAutoHeight() {
  try { // safe try
    window.dispatchEvent(new CustomEvent('ui:layoutChanged', { detail: { topbarHeight: 0 } })); // neutral event
  } catch (_) { /* no-op */ } // ignore
}

/* Guard: remove any leftover inline CSS vars */
(function guardLegacyLayoutCalls() {
  const s = document?.documentElement?.style; // style ref
  if (s) { s.removeProperty('--topbar-h'); } // remove legacy var
})();

/**
 * initNavbarCollapseSync()
 * Keep body[data-nav-open] synced with Bootstrap collapse; pause on open.
 */
function initNavbarCollapseSync() {
  const collapseEl = document.querySelector('.topbar .navbar-collapse'); // collapse el
  const togglerEl  = document.querySelector('.navbar-toggler.hamburger'); // toggler el
  if (!collapseEl || !togglerEl || !window.bootstrap) return; // guard early
  const collapse = new bootstrap.Collapse(collapseEl, { toggle: false }); // get instance
  const markOpen  = () => { document.body.setAttribute('data-nav-open', 'true'); togglerEl.setAttribute('aria-expanded', 'true'); }; // mark open
  const markClose = () => { document.body.removeAttribute('data-nav-open'); togglerEl.setAttribute('aria-expanded', 'false'); }; // mark close
  const pauseOnOpen = () => { window.dispatchEvent(new CustomEvent('ui:requestPause')); }; // pause game on open
  collapseEl.addEventListener('show.bs.collapse',  pauseOnOpen); // listen
  collapseEl.addEventListener('show.bs.collapse',  markOpen); // mark opening
  collapseEl.addEventListener('hide.bs.collapse',  markClose); // mark closing
  collapseEl.addEventListener('shown.bs.collapse', markOpen); // confirm open
  collapseEl.addEventListener('hidden.bs.collapse', markClose); // confirm close
  const mqLgUp = window.matchMedia('(min-width: 992px)'); // breakpoint watcher
  const normalizeForViewport = () => { collapse.hide(); markClose(); }; // enforce closed on large
  normalizeForViewport(); // initial normalize
  mqLgUp.addEventListener('change', normalizeForViewport); // re-normalize on change
}

/**
 * createHeart(stateClass)
 * Build an SVG heart in a given visual state class.
 */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // create svg
  svg.setAttribute('viewBox', '0 0 24 24'); // set viewBox
  svg.classList.add('svg-heart', stateClass); // add classes
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // create path
  path.setAttribute('d', 'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'); // heart path
  svg.appendChild(path); // attach path
  return svg; // return svg
}

/**
 * renderLives(container, lives, partial, steps)
 * Render hearts row based on lives and partial damage.
 */
function renderLives(container, lives, partial = 0, steps = 4) {
  if (!container) return; // guard
  container.innerHTML = ''; // clear container
  const safeLives   = Math.max(0, lives); // clamp lives
  const safePartial = Math.min(Math.max(partial, 0), steps - 1); // clamp partial
  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) { // for all but last
    container.appendChild(createHeart('full')); // full heart
  }
  if (safeLives > 0) { // if one or more lives
    let klass = 'full'; // default class
    if (safePartial === 1) klass = 'threequarter'; // 3/4
    if (safePartial === 2) klass = 'half'; // 1/2
    if (safePartial === 3) klass = 'quarter'; // 1/4
    container.appendChild(createHeart(klass)); // add last heart
  }
  if (safeLives <= 0) { // if no lives
    container.appendChild(createHeart('empty')); // empty heart
  }
}

/**
 * updateHUD(snapshot)
 * Update on-screen HUD (lives, score, level, best) from snapshot.
 */
function updateHUD(snapshot) {
  if (!snapshot) return; // guard
  const livesEl = document.getElementById('lives'); // hearts container
  const scoreEl = document.getElementById('score'); // score label
  const levelEl = document.getElementById('level'); // level label
  const bestEl  = document.getElementById('best'); // best label
  renderLives(livesEl, snapshot.lives, snapshot.partial); // render hearts
  if (scoreEl) scoreEl.textContent = snapshot.score; // set score
  if (levelEl) levelEl.textContent = snapshot.level; // set level
  if (bestEl && typeof snapshot.best !== 'undefined') { bestEl.textContent = snapshot.best; } // set best
}

/**
 * getRailsMap()
 * Return cached references to the four rails.
 */
function getRailsMap() {
  const root = document.querySelector('.rails'); // rails root
  if (!root) return null; // guard missing
  return { // return lane elements
    left:  root.querySelector('.rail-left'), // left
    up:    root.querySelector('.rail-up'), // up
    down:  root.querySelector('.rail-down'), // down
    right: root.querySelector('.rail-right') // right
  };
}

/**
 * getJudgeDistancePx(railEl)
 * Compute px distance from rail top to judge line center (minus half note height).
 */
function getJudgeDistancePx(railEl) {
  if (!railEl) return 0; // guard
  const stageTop = railEl.getBoundingClientRect().top; // top of rail
  const judge = document.querySelector('.judge-line'); // judge line
  const { h: noteH } = getNoteBox(); // note height
  if (!judge) { // fallback if judge missing
    return Math.max(0, railEl.clientHeight * 0.62 - (noteH / 2)); // approximate
  }
  const jr = judge.getBoundingClientRect(); // judge rect
  const judgeCenterY = jr.top + (jr.height / 2); // center y
  const dist = Math.max(0, judgeCenterY - stageTop - (noteH / 2)); // distance adjusted
  return dist; // return distance
}

/**
 * getBottomDistancePx(railEl)
 * Compute px distance from rail top to bottom minus note height.
 */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0; // guard
  const { h } = getNoteBox(); // note height
  return Math.max(0, railEl.clientHeight - h); // bottom stop
}

/**
 * spawnNote(dir, travelBeats, bpm)
 * Create one falling orb in a lane; set CSS vars and animation duration.
 */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap(); // get rails
  if (!rails || !rails[dir]) return null; // guard lane
  const rail = rails[dir]; // choose lane
  const note = document.createElement('div'); // create note
  note.className = `note note-${dir} note--${dir}`; // set classes
  const judgePx  = getJudgeDistancePx(rail); // px to judge line
  const bottomPx = getBottomDistancePx(rail); // px to bottom
  note.style.setProperty('--drop-distance-judge',  `${judgePx}px`); // set CSS var
  note.style.setProperty('--drop-distance-bottom', `${bottomPx}px`); // set CSS var
  const msPerBeat = 60000 / bpm; // ms per beat
  const secondsToJudge = Math.max(0.08, travelBeats * (msPerBeat / 1000)); // seconds to judge
  const safeJudge = Math.max(1, judgePx); // avoid zero
  const safeBottom = Math.max(safeJudge + 1, bottomPx); // ensure > judge
  const totalSeconds = secondsToJudge * (safeBottom / safeJudge); // scale to reach bottom after judge
  note.style.animationDuration = `${totalSeconds}s`; // set duration
  note.dataset.state = 'alive'; // mark alive
  rail.appendChild(note); // append to lane
  return note; // return node
}

/**
 * hideAllOverlayPanels()
 * Hide every panel inside #overlay that uses .play-cta shell.
 */
function hideAllOverlayPanels() {
  const panels = document.querySelectorAll('#overlay .play-cta'); // select panels
  panels.forEach(el => el.classList.add('hidden')); // hide each
}

/**
 * showResultsOverlay(data)
 * Show Results panel, fill level/score/combo, and speak summary.
 */
function showResultsOverlay({ level, score, maxCombo }) {
  // Prep overlay
  hideAllOverlayPanels();            // hide any other panel
  showOverlay();                     // show overlay layer

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
  hideAllOverlayPanels();                       // hide other CTA panels
  const baseCta = document.querySelector('#overlay .play-cta');
  if (baseCta) baseCta.classList.remove('hidden');

  setOverlayLabel('Game paused\nPress Play to resume'); // caption under the button
  srSpeak('Game paused. Press Play to resume.');        // screen reader hint
  showOverlay();                                        // reveal overlay layer
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
  hideAllOverlayPanels();              // hide other panels
  showOverlay();                       // ensure overlay container is visible

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
  const btnNext    = document.getElementById('btnNextLevel'); // results → next
  const btnRestart = document.getElementById('btnRestartLevel'); // results → restart
  const btnRetry   = document.getElementById('btnRetryLevel'); // game over → retry
  if (btnNext && btnNext.dataset.wired !== 'true') { // guard
    btnNext.dataset.wired = 'true'; // mark wired
    btnNext.addEventListener('click', () => { // click
      muteOverlayFx(600);
      hideAllOverlayPanels(); // hide panels
      window.dispatchEvent(new CustomEvent('ui:nextLevel')); // next level
    });
  }
  if (btnRestart && btnRestart.dataset.wired !== 'true') { // guard
    btnRestart.dataset.wired = 'true'; // mark wired
    btnRestart.addEventListener('click', () => { // click
      muteOverlayFx(600);
      hideAllOverlayPanels(); // hide panels
      window.dispatchEvent(new CustomEvent('ui:restartLevel')); // restart level
    });
  }
  if (btnRetry && btnRetry.dataset.wired !== 'true') { // guard
    btnRetry.dataset.wired = 'true'; // mark wired
    btnRetry.addEventListener('click', () => { // click
      muteOverlayFx(600);
      hideAllOverlayPanels(); // hide panels
      window.dispatchEvent(new CustomEvent('ui:retryLevel')); // retry level
    });
  }
}

/**
 * setOverlayIcon(mode)
 * Force overlay icon to 'play' | 'pause' | null (release to CSS when null).
 */
function setOverlayIcon(mode) {
  if (!iconPlay || !iconPause) return; // guard
  if (mode === 'play') { iconPlay.style.display  = 'inline-block'; iconPause.style.display = 'none'; return; } // show play
  if (mode === 'pause') { iconPlay.style.display  = 'none'; iconPause.style.display = 'inline-block'; return; } // show pause
  iconPlay.style.display  = ''; // release to CSS
  iconPause.style.display = ''; // release to CSS
}

// Focus helpers for panels (trap + restore)
const FOCUS_SEL = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'; // focusable elements
let _panelLastFocus = null; // last focused element before open
let _trapHandler = null; // keydown handler ref

/**
 * getFirstFocusable(container)
 * Return the first focusable element within a container or null.
 */
function getFirstFocusable(container) {
  const nodes = container.querySelectorAll(FOCUS_SEL); // query
  return nodes.length ? nodes[0] : null; // first or null
}

/**
 * _trapFocusIn(container)
 * Trap Tab key within a container until panel is closed.
 */
function _trapFocusIn(container) {
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler); // cleanup previous
  _trapHandler = (ev) => { // on keydown
    if (ev.key !== 'Tab') return; // only Tab
    const list = Array.from(container.querySelectorAll(FOCUS_SEL)) // all focusables
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null); // visible/enabled
    if (!list.length) return; // nothing to trap
    const first = list[0]; // first focusable
    const last = list[list.length - 1]; // last focusable
    if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); } // wrap backward
    else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); } // wrap forward
  };
  document.addEventListener('keydown', _trapFocusIn.handler = _trapHandler); // attach
}

/**
 * _rememberFocus()
 * Store the element that had focus before opening a panel.
 */
function _rememberFocus() {
  _panelLastFocus = document.activeElement; // store current focus
}

/**
 * _restoreFocus()
 * Restore focus to the element that had focus before opening the panel.
 */
function _restoreFocus() {
  if (_trapHandler) { document.removeEventListener('keydown', _trapHandler); _trapHandler = null; } // remove trap
  if (_panelLastFocus && document.contains(_panelLastFocus)) { _panelLastFocus.focus(); } // restore focus
  _panelLastFocus = null; // clear ref
}

/**
 * openPanel(name)
 * Pause game, open the named panel, trap focus; if settings, wire its UI.
 */
function openPanel(name) {
  window.dispatchEvent(new CustomEvent('ui:requestPause')); // pause the game behind
  const panel = document.getElementById(`panel-${name}`); // find panel root
  if (!panel) return; // guard if missing
  document.body.setAttribute('data-panel-open', name); // mark open on body
  panel.classList.remove('hidden'); // show panel
  if (name === 'settings') srSpeak('Settings opened.'); // speak when settings
  _rememberFocus(); // store last focus
  const first = getFirstFocusable(panel) || panel.querySelector('[data-close-panel]') || panel; // find focus target
  first?.focus(); // move focus inside
  _trapFocusIn(panel); // trap tab key
  if (name === 'settings') { wireSettingsTabs(); wireSettingsControls(); renderHighScorePane(); } // ensure settings UI wired
}

/**
 * closePanel(name)
 * Hide panel, clear open flag, release focus trap, restore focus.
 */
function closePanel(name) {
  const panel = document.getElementById(`panel-${name}`); // find panel
  if (!panel) return; // guard
  panel.classList.add('hidden'); // hide panel
  if (document.body.getAttribute('data-panel-open') === name) {
    document.body.removeAttribute('data-panel-open'); // clear flag
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
  return { volume: 0.8, muted: false, reduceMotion: false, noFlash: false, countdown: 3 }; // defaults
}

/**
 * saveSettings(s)
 * Persist settings to localStorage.
 */
function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); // save JSON
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
  const form = document.getElementById('settingsForm'); // get form
  if (!form || form.dataset.wired === 'true') return; // guard duplicate
  form.dataset.wired = 'true'; // mark wired
  const refs = _readSettingsFormRefs(); // read control refs
  let s = loadSettings(); // load current settings
  _syncFormFromSettings(refs, s); // reflect into UI
  applySettings(s); // apply immediately
  const persist = () => { saveSettings(s); applySettings(s); }; // persist helper
  _attachSettingsListeners(refs, s, persist); // attach listeners
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
  if (elVolume)   elVolume.value   = Math.round((s.volume ?? 0.8) * 100); // set slider
  if (elMute)     elMute.checked   = !!s.muted; // set checkbox
  if (elReduce)   elReduce.setAttribute('aria-pressed', (!!s.reduceMotion) ? 'true' : 'false'); // set pressed
  if (elNoFlash)  elNoFlash.setAttribute('aria-pressed', (!!s.noFlash) ? 'true' : 'false'); // set pressed
  if (elCountdown)elCountdown.value= String(s.countdown ?? 3); // set select
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
      persist(); // apply + save
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
      elNoFlash.setAttribute('aria-pressed', next ? 'true' : 'false'); // update attribute
      s.noFlash = next; // update setting value
      persist(); // apply + save
    });
  }

  // Countdown select: store 0 / 3 / 5 (or fallback to 3)
  if (elCountdown) {
    elCountdown.addEventListener('change', () => {
      const v = Number(elCountdown.value); // read selected value
      s.countdown = (Number.isFinite(v) && v >= 0) ? v : 3; // safe parse / fallback
      persist(); // apply + save
    });
  }

  // Reset button: clear storage, reload defaults, resync form and settings
  if (elReset) {
    elReset.addEventListener('click', () => {
      const ok = confirm('Reset all saved progress and settings?'); // confirm with user
      if (!ok) return; // cancel if user says no

      try {
        localStorage.clear(); // clear all stored data
      } catch (_) {
        // ignore storage errors
      }

      const fresh = loadSettings(); // reload default settings
      _syncFormFromSettings(refs, fresh); // update form fields from defaults

      // copy values into current settings object
      s.volume = fresh.volume;
      s.muted = fresh.muted;
      s.reduceMotion = fresh.reduceMotion;
      s.noFlash = fresh.noFlash;
      s.countdown = fresh.countdown;

      persist(); // apply + save
      alert('Game data has been reset.'); // notify user
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
      const fromLS = Number(localStorage.getItem('best') || 0); // read LS
      if (!Number.isNaN(fromLS) && fromLS > 0) return fromLS; // valid
    } catch (_) {} // ignore
    const hudBest = Number((document.getElementById('best')?.textContent || '0').replace(/\D+/g, '')) || 0; // fallback to HUD
    return hudBest; // return fallback
  };
  const out = document.getElementById('hiBestValue'); // output node
  if (out) out.textContent = readBest(); // print current BEST
  const btn = document.getElementById('resetHighScore'); // reset button
  if (btn && btn.dataset.wired !== 'true') { // guard
    btn.dataset.wired = 'true'; // mark wired
    btn.addEventListener('click', () => { // on click
      const ok = confirm('Reset BEST score only?'); // confirm
      if (!ok) return; // abort
      try { localStorage.setItem('best', '0'); } catch (_) {} // reset LS key
      const hudBest = document.getElementById('best'); // HUD label
      if (hudBest) hudBest.textContent = '0'; // reset HUD
      if (out) out.textContent = '0'; // reset pane
    });
  }
}

/**
 * selectSettingsTab(name)
 * Switch visible settings pane; keep all tab buttons visible/marked.
 */
function selectSettingsTab(name) {
  if (name === 'settings') name = 'audio'; // alias settings→audio
  const tabs = document.querySelectorAll('.settings-tab'); // tab buttons
  const panes = { // pane elements
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
  const bar = document.querySelector('.settings-tabs'); // tab bar
  if (!bar || bar.dataset.wired === 'true') return; // guard duplicate
  bar.dataset.wired = 'true'; // mark wired
  bar.querySelectorAll('.settings-tab').forEach(btn => { // iterate buttons
    btn.addEventListener('click', () => { const name = btn.dataset.settingsTab || 'audio'; selectSettingsTab(name); }); // on click select
  });
  selectSettingsTab('audio'); // default pane
}

/* -----------------------------------------
 * Bonus banner FX: one-shot flash on start
 * ----------------------------------------- */

let _bonusFXWired = false;
function initBonusBannerFX() {
  if (_bonusFXWired) return;         // guard against duplicates
  _bonusFXWired = true;

  const sel = '#bonusBanner';         // target the banner element itself

  // one-shot flash helper
  const flashOnce = () => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove('flash-once'); // reset
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



/* ---------------------------------------------
   Bonus Banner (separate from feedback)
   - Sits ABOVE #feedback (not overlapping).
   - Created on demand as #bonusBanner (class .bonus-banner).
   - Visible for entire bonus duration.
---------------------------------------------- */

/**
 * _ensureBonusBanner()
 * Create #bonusBanner just before #feedback if missing; return the node.
 */
function _ensureBonusBanner() {
  let node = document.getElementById('bonusBanner'); // find existing
  if (node) return node; // return if found
  const feedback = document.getElementById('feedback'); // locate feedback
  node = document.createElement('div'); // create banner
  node.id = 'bonusBanner'; // set id
  node.className = 'bonus-banner'; // set class for styling 
  node.setAttribute('aria-live', 'polite'); // announce updates softly
  node.setAttribute('aria-atomic', 'true'); // replace whole text
  if (feedback && feedback.parentNode) { // if feedback exists
    feedback.parentNode.insertBefore(node, feedback); // insert above feedback
  } else {
    document.body.appendChild(node); // fallback attach to body
  }
  return node; // return banner node
}

/**
 * showBonusBanner(text)
 * Show the bonus banner with an initial text.
 */
function showBonusBanner(text = 'BONUS MODE!') {
  const node = _ensureBonusBanner(); // ensure node exists
  node.textContent = text; // set text
  node.classList.remove('hidden'); // ensure visible
}


/**
 * hideBonusBanner()
 * Hide/clear the bonus banner.
 */
function hideBonusBanner() {
  const node = document.getElementById('bonusBanner'); // find node
  if (!node) return; // guard
  node.textContent = ''; // clear text
  node.classList.add('hidden'); // hide from view
}

/* ---------------------------------------------
   Bonus UI hooks (banner only)
   Shows "BONUS MODE!" at start and "BONUS MODE ENDED" briefly at end.
   No counters/progress in the banner by design.
---------------------------------------------- */
(function wireBonusUiHooks() {
  let endTimer = null; // timer for hiding the end message

  window.addEventListener('bonus:started', () => {
    if (endTimer) { clearTimeout(endTimer); endTimer = null; } // cancel pending hide
    document.body.setAttribute('data-bonus', 'true');          // mark bonus on body
    showBonusBanner('BONUS MODE!');                            // show start banner
    srSpeak('Bonus mode started');                             // announce to SR
  });

  window.addEventListener('bonus:ended', () => {
    document.body.removeAttribute('data-bonus');               // clear body flag
    showBonusBanner('BONUS MODE ENDED');                       // show end banner text
    srSpeak('Bonus mode ended');                               // announce to SR
    endTimer = setTimeout(() => { hideBonusBanner(); }, 1800);  // hide after a short delay
  });

  window.addEventListener('song:ended', (e) => {
    const reason = e?.detail?.reason || 'completed';           // read reason
    if (reason !== 'paused' && reason !== 'stopped') {         // on natural end
      document.body.removeAttribute('data-bonus');             // clear flag
      showBonusBanner('BONUS MODE ENDED');                     // mirror end flow
      srSpeak('Bonus mode ended');                             // announce to SR
      endTimer = setTimeout(() => { hideBonusBanner(); }, 1500);// hide after delay
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
};