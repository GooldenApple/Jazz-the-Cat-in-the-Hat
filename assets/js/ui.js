//ui.js


// --- TEMP DEBUG ---
console.log('[ui] module loaded');
/* ---------------------------
   UI related functions
---------------------------- */
// Storage key for settings, declared before loadSettings/saveSettings are used
const SETTINGS_KEY = 'settings';
/* ----------------------------------------
   Screen reader live-region 
   Looks for #srLive; falls back to legacy #srRegion; otherwise creates #srLive.
---------------------------------------- */
let srRegion =
  document.getElementById('srLive') ||
  document.getElementById('srRegion');

if (!srRegion) {
  srRegion = document.createElement('div');
  srRegion.id = 'srLive';
  srRegion.className = 'sr-only';
  srRegion.setAttribute('role', 'status');
  srRegion.setAttribute('aria-live', 'polite');
  srRegion.setAttribute('aria-atomic', 'true');
  document.body.appendChild(srRegion);
} else {
  // Normalize attributes for existing node
  srRegion.id = 'srLive';
  srRegion.classList.add('sr-only');
  srRegion.setAttribute('role', 'status');
  srRegion.setAttribute('aria-live', 'polite');
  srRegion.setAttribute('aria-atomic', 'true');
}

/** Announce a short message to screen readers. */
function srSpeak(msg = '') {
  if (!srRegion) return;
  srRegion.textContent = '';
  // force a DOM mutation in a separate task so AT re-announces
  setTimeout(() => { srRegion.textContent = String(msg); }, 30);
}

/* ----------------------------------------
   Note metrics: measure once, cache, and re-measure on layout changes.
---------------------------------------- */
let _noteBox = { w: 40, h: 40 }; // safe defaults until first measure

function measureNoteBox() {
  // Create a detached note for measurement (off-screen)
  const el = document.createElement('div');
  el.className = 'note note-left';        // any note-* will have same size
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

function getNoteBox() {
  return _noteBox;
}

function scheduleReMeasureNoteBox() {
  requestAnimationFrame(measureNoteBox);
}

// Initial measure
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


// **Overlay (Play/Pause) controls */

const overlayEl = document.getElementById('overlay');
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null;
const iconPlay  = overlayEl ? overlayEl.querySelector('.icon-play')  : null;
const iconPause = overlayEl ? overlayEl.querySelector('.icon-pause') : null;
/* 
    showOverlay / hideOverlay / setOverlayLabel
    Purpose: Visual helpers for the CTA/pause overlay.
 */
function showOverlay() {
  const el = document.getElementById('overlay');     // lookup fresh
  if (el) el.classList.remove('hidden');             // reveal overlay
}

function hideOverlay() {
  const el = document.getElementById('overlay');     // lookup fresh
  if (el) el.classList.add('hidden');                // hide overlay
}

function setOverlayLabel(text) {
  const label = document.querySelector('#overlay .play-label'); // lookup fresh
  if (label) label.textContent = text;                          // set label
}



/* ----------------------------------------
   Rotate Overlay — shared refs
   I keep these at module scope so the helpers below can use them.
---------------------------------------- */
const body = document.body; // quick body ref
const rotateOverlay = document.getElementById('rotateOverlay'); // rotate overlay root
const rotateCloseBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; // close button

// match the same MQs I use in CSS
const mqTinyLandscape = window.matchMedia('(max-width: 767.98px) and (orientation: landscape)');
const mqShortHeight   = window.matchMedia('(max-height: 480px)');


/* ----------------------------------------
   updateRotateOverlayAria
   Synchronizes aria + inert based on MQs and dismissal flag.
---------------------------------------- */
function updateRotateOverlayAria() {
  if (!rotateOverlay) return; // guard

  const dismissed = body.getAttribute('data-rotate-dismissed') === 'true'; // user dismissed
  const visibleByMQ = (mqTinyLandscape.matches || mqShortHeight.matches);  // matches either MQ
  const shouldShow = visibleByMQ && !dismissed;                             // final decision

  if (shouldShow) {
    rotateOverlay.removeAttribute('inert');         // allow interaction
    rotateOverlay.setAttribute('aria-hidden', 'false'); // visible to a11y
    if (rotateCloseBtn) rotateCloseBtn.focus();     // focus inside to avoid background focus
  } else {
    if (rotateOverlay.contains(document.activeElement)) {
      document.activeElement.blur?.();             // defocus anything inside
    }
    rotateOverlay.setAttribute('inert', '');        // block focus behind
    rotateOverlay.setAttribute('aria-hidden', 'true'); // hide from a11y
  }
}

/* ----------------------------------------
   dismissRotateUntilPortrait
   Hides the overlay until orientation/height goes back to normal.
---------------------------------------- */
function dismissRotateUntilPortrait() {
  if (rotateOverlay && rotateOverlay.contains(document.activeElement)) {
    document.activeElement.blur?.(); // drop focus first
  }
  body.setAttribute('data-rotate-dismissed', 'true'); // remember user choice
  updateRotateOverlayAria();                           // apply state immediately
}

/* ----------------------------------------
   resetDismissalIfPortrait
   Clears dismissal flag when no longer in tiny landscape mode.
---------------------------------------- */
function resetDismissalIfPortrait() {
  if (!mqTinyLandscape.matches) {                    // portrait or wide enough
    body.removeAttribute('data-rotate-dismissed');   // clear dismissal
  }
  updateRotateOverlayAria();                         // resync aria/inert
}

/* ----------------------------------------
   initRotateOverlay
   Wires listeners and performs the initial sync.
---------------------------------------- */
function initRotateOverlay() {
  if (!rotateOverlay) return; // guard

  // button → dismiss until portrait
  if (rotateCloseBtn && rotateCloseBtn.dataset.wired !== 'true') {
    rotateCloseBtn.dataset.wired = 'true';
    rotateCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismissRotateUntilPortrait();
    });
  }

  // re-evaluate when MQs flip or on resize
  mqTinyLandscape.addEventListener('change', updateRotateOverlayAria);
  mqShortHeight.addEventListener('change',   updateRotateOverlayAria);
  window.addEventListener('resize',          updateRotateOverlayAria);

  // watch orientation to reset dismissal when returning to portrait
  window.matchMedia('(orientation: landscape)')
    .addEventListener('change', resetDismissalIfPortrait);

  // initial sync on load
  updateRotateOverlayAria();
}


/* ----------------------------------------
   Navbar Play/Pause toggle
   Purpose: Keep navbar button in sync with game state.
   Usage: wireMenuPlayToggle() on DOM ready; call updatePlayMenuLabel() on state change.
---------------------------------------- */
/* Returns the navbar Play/Pause toggle button */
function getMenuPlayToggle() {
  return document.getElementById('menuPlayToggle');
}

/* Sets the navbar label to ▶ Play and updates the a11y state */
function setMenuLabelToPlay() {
  const btn = getMenuPlayToggle();
  if (!btn) return;
  btn.textContent = '▶ Play';
  btn.setAttribute('aria-pressed', 'false');
}

/* Sets the navbar label to ⏸ Pause and updates the a11y state */
function setMenuLabelToPause() {
  const btn = getMenuPlayToggle();
  if (!btn) return;
  btn.textContent = '⏸ Pause';
  btn.setAttribute('aria-pressed', 'true');
}

/* Updates the navbar Play/Pause label based on the paused data attribute */
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

/* Binds quick and navbar Play/Pause buttons to emit intents */
// Note: Uses body flags (data-paused/data-starting);
function wireMenuPlayToggle() {
  const quick = document.getElementById('quickPlayPause');     // floating round button
  const menu  = getMenuPlayToggle();                            // navbar Play/Pause
  const targets = [quick, menu].filter(Boolean);                // keep existing ones

  targets.forEach((btn) => {
    if (btn.dataset.wired === 'true') return;                   // avoid double binding
    btn.dataset.wired = 'true';                                 // mark as wired

    btn.addEventListener('click', () => {
      const isStarting = document.body.getAttribute('data-starting') === 'true'; // countdown phase
      const isRunning  = !document.body.hasAttribute('data-paused');             // visuals unpaused
      if (isStarting || isRunning) {
        window.dispatchEvent(new CustomEvent('ui:requestPause'));                // request pause
      } else {
        window.dispatchEvent(new CustomEvent('ui:requestStartRun'));             // request start
      }
    });
  });
}



/**
 * wirePlayButton
 * Brief: Bind the overlay round button. On click, emit pause if the game is running or starting; otherwise emit start.
 */
function wirePlayButton() {
  const overlay = document.getElementById('overlay');              // get overlay root (fresh lookup)
  if (!overlay) return;                                            // guard if markup is missing

  const btn = overlay.querySelector('.play-btn');                  // get the circular CTA button
  if (!btn) return;                                                // guard if button is missing

  if (btn.dataset.wired === 'true') return;                        // avoid attaching duplicate listeners
  btn.dataset.wired = 'true';                                      // mark as wired once

  btn.addEventListener('click', () => {                            // listen for a click on the CTA
    const isStarting = document.body.getAttribute('data-starting') === 'true'; // check if a countdown is running
    const isRunning  = !document.body.hasAttribute('data-paused');            // check if gameplay is unpaused
    if (isStarting || isRunning) {                                 // treat both starting and running as "pause"
      window.dispatchEvent(new CustomEvent('ui:requestPause'));    // request pause/stop from the app
    } else {                                                       // otherwise the game is fully paused/stopped
      window.dispatchEvent(new CustomEvent('ui:requestStartRun')); // request a new run from the app
    }
  });
};


  /* ----------------------------------------
     Purpose: Wire navbar buttons to open panels and attach close handlers.
  ---------------------------------------- */
function bindControls() {

  wireMenuPlayToggle();                        // wire Play/Pause buttons once (guarded by data-wired)

  const map = {                                         // maps actions to panel ids
    tutorial: 'tutorial',                                // tutorial panel
    settings: 'settings',                                // settings panel
    highscore: 'highscore',                              // highscore panel
    credits: 'credits'                                   // credits panel
  };

  document.querySelectorAll('#primaryNav .nav-btn')      // selects nav buttons
  .forEach((btn) => {                                  // loops each button
    const action = btn.getAttribute('data-action');    // reads action name
    if (['tutorial','highscore','credits','settings'].includes(action)) return; // tabs live in Settings (skip here to avoid double wiring)
    if (!map[action]) return;                             // skips non-panel actions
    if (btn.dataset.wired === 'true') return;          // prevents double binding
    btn.dataset.wired = 'true';                        // marks as wired
    btn.addEventListener('click', () => {              // on click handler
      openPanel(map[action]);                          // opens mapped panel (e.g. settings)
    }); 
  }); 


  document.querySelectorAll('.ui-panel [data-close-panel]') // selects panel close btns
    .forEach((btn) => {                                     // loops each close button
      if (btn.dataset.wired === 'true') return;             // prevents double binding
      btn.dataset.wired = 'true';                           // marks as wired
      btn.addEventListener('click', () => {                 // on click handler
        const name = btn.getAttribute('data-close-panel');  // reads target name
        closePanel(name);                                   // hides that panel
      });                                                   // end click
    });                                                     // end forEach

  if (!window.__panelKeysWired) {                        // singleton guard for keys
    window.__panelKeysWired = true;                      // sets guard flag
    window.addEventListener('keydown', (ev) => {         // global keydown listener
      if (ev.key === 's' || ev.key === 'S') {            // checks S key
        openPanel('settings');                           // opens Settings
        ev.preventDefault();                             // prevents default behavior
      }
      if (ev.key === 'Escape') {                         // checks Esc key
        const open = document.body.getAttribute('data-panel-open'); // reads active panel
        if (open) closePanel(open);                      // closes active panel
      }
    });                                                
  }
 /* ----------------------------------------
   Purpose: Open Settings to specific tab when navbar items are clicked
---------------------------------------- */
document.querySelectorAll('#primaryNav .nav-btn')                   // scan nav buttons
  .forEach((btn) => {                                               // iterate buttons
    const act = btn.getAttribute('data-action');                    // read action
    if (!['tutorial','highscore','credits','settings'].includes(act)) return; // filter
    if (btn.dataset.wiredSettingsTab === 'true') return;            // guard
    btn.dataset.wiredSettingsTab = 'true';                          // mark wired

    btn.addEventListener('click', (ev) => {
  ev.preventDefault();

  const targetTab = (act === 'settings' ? 'audio' : act);
  const collapseEl = document.querySelector('.topbar .navbar-collapse');


  // if hamburger is open, close first and open panel when menu is closed.
  if (collapseEl && collapseEl.classList.contains('show') && window.bootstrap) {
    const inst = bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false });

    const openAfterCollapse = () => {
      collapseEl.removeEventListener('hidden.bs.collapse', openAfterCollapse);
      openPanel('settings');
      selectSettingsTab(targetTab);
    };

    collapseEl.addEventListener('hidden.bs.collapse', openAfterCollapse, { once: true });
    inst.hide();
    return; 
  }

    // Desktop - open panel  
    openPanel('settings');
    selectSettingsTab(targetTab);
  });
});
}


/* ----------------------------------------
   HUD inline collapse (Score/Best/Level)
   Purpose: Toggle left HUD column near Score; keep lives row untouched.
   Behavior: body[data-hud="expanded" | "collapsed"]; persists to localStorage.
---------------------------------------- */
const HUD_MODE_KEY = 'hudInlineMode';                      // storage key

function getHudInlineMode() {                              // read current/last mode
  const attr = document.body.getAttribute('data-hud');     // body attribute if set
  const saved = localStorage.getItem(HUD_MODE_KEY);        // persisted value
  return (attr || saved || 'expanded');                    // default expanded
}

/* ----------------------------------------
   setHudInlineMode
   Purpose: Apply mode to DOM + persist + update toggle visuals/a11y.
---------------------------------------- */
function setHudInlineMode(mode) {
  const v = (mode === 'collapsed') ? 'collapsed' : 'expanded';        // clamp value
  document.body.setAttribute('data-hud', v);                           // drive CSS state
  localStorage.setItem(HUD_MODE_KEY, v);                               // persist choice

  const btn  = document.getElementById('hudToggle');                   // toggle chip
  const icon = btn ? btn.querySelector('.hud-toggle__icon') : null;    // icon span
  const text = btn ? btn.querySelector('.hud-toggle__text') : null;    // text span

  if (!btn || !icon || !text) return;                                  // guard: markup missing

  // a11y: reflect expanded/collapsed
  btn.setAttribute('aria-expanded', String(v === 'expanded'));         // true when open
  btn.setAttribute('aria-label', (v === 'expanded') ? 'Collapse HUD' : 'Expand HUD'); // SR label

  // visible text + icon glyph
  if (v === 'expanded') {                                              // expanded → show "collapse"
    icon.textContent = '▴';                                            // down chevron
    text.textContent = 'Collapse HUD';                                 // button text
  } else {                                                             // collapsed → show "expand"
    icon.textContent = '▾';                                            // right chevron
    text.textContent = 'Expand HUD';                                   // button text
  }
}

function toggleHudInline() {                               // flip state
  setHudInlineMode(getHudInlineMode() === 'expanded' ? 'collapsed' : 'expanded');
}

function wireHudInlineToggle() {                           // wire chip + (optional) hotkey
  const btn = document.getElementById('hudToggle');        // toggle chip
  if (btn && btn.dataset.wired !== 'true') {
    btn.dataset.wired = 'true';                            // avoid duplicate listener
    btn.addEventListener('click', toggleHudInline);        // click toggles
  }

  // hotkey 'H' to toggle while testing
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;                                  // no repeats
    if ((e.key || '').toLowerCase() === 'h') {             // press H
      e.preventDefault();
      toggleHudInline();
    }
  });
}



/* ====================
   Visual judge flash 
   =================== */

function judgeFlash(type) {
  const rails = document.querySelector('.rails');        // rails root
  if (!rails) return;                                    // guard
  rails.classList.remove('flash-good','flash-miss');     // clear previous state
  if (type === 'good') rails.classList.add('flash-good'); // success flash
  if (type === 'miss') rails.classList.add('flash-miss'); // miss flash

  // Remove class after animation window (can't listen to ::after reliably)
  setTimeout(() => {
    rails.classList.remove('flash-good','flash-miss');   // cleanup
  }, 320);
}

// Used by setFeedback to auto-clear the message
let _feedbackTimer = null;                 // active timeout handle
let _feedbackSeq = 0;                      // sequence to avoid stale clears
const FEEDBACK_CLEAR_MS = 700;             // how long the text stays (ms)

/* ----------------------------------------
   setFeedback
   Purpose: Show textual feedback + trigger judgeFlash.
   Usage: setFeedback('Perfect','good') / setFeedback('miss')
---------------------------------------- */
function setFeedback(label, flash) {
  const el = document.getElementById('feedback');
  if (!el) return;

  // Cancel any previous clear timer
  if (_feedbackTimer) { clearTimeout(_feedbackTimer); _feedbackTimer = null; }

  // Show text + optional judge flash
  el.textContent = label;
  if (flash === 'good') judgeFlash('good');
  if (flash === 'miss') judgeFlash('miss');

  // Sequence guard: prevents an older timer from clearing a newer message
  const mySeq = ++_feedbackSeq;

  // Auto-clear after a short delay
  _feedbackTimer = setTimeout(() => {
    if (mySeq === _feedbackSeq) {
      el.textContent = '';
    }
    _feedbackTimer = null;
  }, FEEDBACK_CLEAR_MS);
}

/* ==========================================================
   Layout measurements (DISABLED)
   We do not measure header/controls or write CSS vars anymore.
   CSS-only layout manages the vertical sizing now.
   ========================================================== */


/* Wires resize/orientation/font-load listeners — disabled */
function initTopbarAutoHeight() {
  // Fire a neutral event once so any listeners won't break.
  try {
    window.dispatchEvent(new CustomEvent('ui:layoutChanged', { detail: { topbarHeight: 0 } }));
  } catch (_) { /* no-op */ }
}

/* Guard: remove any leftover inline CSS vars */
(function guardLegacyLayoutCalls() {
  const s = document?.documentElement?.style;
  if (s) {
    s.removeProperty('--topbar-h');
  }
})();



// === Navbar collapse sync (Bootstrap) ===
// Purpose: keep body[data-nav-open] in sync with Bootstrap's collapse
// and re-measure --topbar-h at both start and end of the transition.
// This lets CSS move the quick-PP button out of the way *before* anything overlaps.
function initNavbarCollapseSync() {
  const collapseEl = document.querySelector('.topbar .navbar-collapse');
  const togglerEl  = document.querySelector('.navbar-toggler.hamburger');
  if (!collapseEl || !togglerEl || !window.bootstrap) return;

  const collapse = new bootstrap.Collapse(collapseEl, { toggle: false });

  const markOpen  = () => {
    document.body.setAttribute('data-nav-open', 'true');
    togglerEl.setAttribute('aria-expanded', 'true');
    
  };
  const markClose = () => {
    document.body.removeAttribute('data-nav-open');
    togglerEl.setAttribute('aria-expanded', 'false');
  };

  // pause game as soon as the burger starts opening
  const pauseOnOpen = () => {
    window.dispatchEvent(new CustomEvent('ui:requestPause'));
  };

  // Fire at the start of the transition (prevents quick-PP/menu collisions)
  collapseEl.addEventListener('show.bs.collapse',  pauseOnOpen);
  collapseEl.addEventListener('show.bs.collapse',  markOpen);
  collapseEl.addEventListener('hide.bs.collapse',  markClose);
  // Confirm at the end as well (safety)
  collapseEl.addEventListener('shown.bs.collapse', markOpen);
  collapseEl.addEventListener('hidden.bs.collapse', markClose);


  // Normalize state when crossing the lg breakpoint
  const mqLgUp = window.matchMedia('(min-width: 992px)');
  const normalizeForViewport = () => { collapse.hide(); markClose(); };
  normalizeForViewport();
  mqLgUp.addEventListener('change', normalizeForViewport);

}


/* ----------------------------------------
   createHeart
   Purpose: Build one SVG heart with a given visual state.
   Usage: container.appendChild(createHeart('full'))
---------------------------------------- */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // create an SVG root
  svg.setAttribute('viewBox', '0 0 24 24');                                    // fixed viewBox for consistent shape
  svg.classList.add('svg-heart', stateClass);                                  // apply base class + state class

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // create the heart path
  path.setAttribute('d',
    'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'
  );                                                                           // path data for a heart
  svg.appendChild(path);                                                        // attach the path to the SVG
  return svg;                                                                   // return the ready node
}


/* Renders the hearts row based on lives and the current partial damage step */
function renderLives(container, lives, partial = 0, steps = 4) {
  if (!container) return; // guard
  container.innerHTML = ''; // clear

  const safeLives   = Math.max(0, lives); // clamp
  const safePartial = Math.min(Math.max(partial, 0), steps - 1); // clamp

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart('full')); // full hearts except last
  }

  if (safeLives > 0) {
    let klass = 'full'; // default
    if (safePartial === 1) klass = 'threequarter';
    if (safePartial === 2) klass = 'half';
    if (safePartial === 3) klass = 'quarter';
    container.appendChild(createHeart(klass)); // last heart can be partial
  }

  if (safeLives <= 0) {
    container.appendChild(createHeart('empty')); // empty state when no lives
  }
}

// Updates HUD numbers and hearts using a provided snapshot object
function updateHUD(snapshot) {                              // Refresh on-screen HUD values
  if (!snapshot) return;                                    // Guard against undefined

  const livesEl = document.getElementById('lives');         // hearts container
  const scoreEl = document.getElementById('score');         // score text node
  const levelEl = document.getElementById('level');         // level text node
  const bestEl  = document.getElementById('best');          // BEST/personal record node

  renderLives(livesEl, snapshot.lives, snapshot.partial);   // redraw hearts (supports partial damage)

  if (scoreEl) scoreEl.textContent = snapshot.score;        // update current score
  if (levelEl) levelEl.textContent = snapshot.level;        // update current level

  // show personal best (persisted in localStorage and loaded into snapshot.best)
  if (bestEl && typeof snapshot.best !== 'undefined') {     // ensure element + value exist
    bestEl.textContent = snapshot.best;                     // render BEST value
    //  (pretty formatting): bestEl.textContent = (snapshot.best ?? 0).toLocaleString();
  }
}


/* Returns cached references to the four rails so I can target the right lane */
function getRailsMap() {
  const root = document.querySelector('.rails'); // rails root
  if (!root) return null; // guard
  return {
    left:  root.querySelector('.rail-left'),  // left rail
    up:    root.querySelector('.rail-up'),    // up rail
    down:  root.querySelector('.rail-down'),  // down rail
    right: root.querySelector('.rail-right')  // right rail
  };
}

/* Calculates the pixel distance from the rail top to the center of the judge line */
function getJudgeDistancePx(railEl) {
  if (!railEl) return 0; // guard

  const stageTop = railEl.getBoundingClientRect().top;
  const judge = document.querySelector('.judge-line');
  const { h: noteH } = getNoteBox();             // measured .note height

  if (!judge) {
    // Fallback: approximate the judge at ~--judge-rel and center the note
    return Math.max(0, railEl.clientHeight * 0.62 - (noteH / 2));
  }

  const jr = judge.getBoundingClientRect();
  const judgeCenterY = jr.top + (jr.height / 2);

  // Distance from rail top to judge center, minus half the note height
  const dist = Math.max(0, judgeCenterY - stageTop - (noteH / 2));
  return dist;
}


/* Calculates the pixel distance from the rail top to where the note ends at the bottom */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0;                         // guard
  const { h } = getNoteBox();                    // measured .note height in px
  return Math.max(0, railEl.clientHeight - h);   // bottom stop
}



/* ----------------------------------------
   spawnNote
   Purpose: Create one falling orb (note) inside the given rail.
   - It sets CSS variables for judge distance and bottom distance.
   - It computes animation duration so that the orb passes the judge line
     exactly at the desired ETA (travelBeats @ bpm).
   - On hit: removed at judge line by gradeHit().
   - On miss: continues falling to the rail bottom and disappears on animationend.
   Usage: spawnNote('left', 2, 120)
---------------------------------------- */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap();                                  // get all rail refs
  if (!rails || !rails[dir]) return null;                       // guard: missing lane
  const rail = rails[dir];                                      // pick the correct lane

  const note = document.createElement('div');                   // make a new orb div
  note.className = `note note-${dir} note--${dir}`;             // add base + direction classes

  const judgePx  = getJudgeDistancePx(rail);                    // pixels to judge line
  const bottomPx = getBottomDistancePx(rail);                   // pixels to rail bottom

  note.style.setProperty('--drop-distance-judge',  `${judgePx}px`);   // feed CSS var for judge
  note.style.setProperty('--drop-distance-bottom', `${bottomPx}px`);  // feed CSS var for bottom

  const msPerBeat = 60000 / bpm;                                // how long one beat is
  const secondsToJudge = Math.max(0.08, travelBeats * (msPerBeat / 1000)); // time until judge
  const safeJudge = Math.max(1, judgePx);                       // avoid divide by zero
  const safeBottom = Math.max(safeJudge + 1, bottomPx);         // ensure > judge distance

  const totalSeconds = secondsToJudge * (safeBottom / safeJudge); // scale so ETA = judge
  note.style.animationDuration = `${totalSeconds}s`;            // assign fall duration

  note.dataset.state = 'alive';                                 // mark as active note
  rail.appendChild(note);                                       // attach note to DOM
  return note;                                                  // return reference
}

/* ===== Results & Game Over panels (inside #overlay) ===== */

/**
 * hideAllOverlayPanels
 * Brief: Hides every panel inside the overlay (play, results, game over).
 */
function hideAllOverlayPanels() {
  // Select all overlay panels that use the shared .play-cta shell
  const panels = document.querySelectorAll('#overlay .play-cta'); // NodeList of panels
  // Hide each panel by adding the shared .hidden class
  panels.forEach(el => el.classList.add('hidden'));               // collapse all
}

/**
 * showResultsOverlay
 * Shows the Results panel and fills level/score/combo, then sets a celebratory headline.
 */
function showResultsOverlay({ level, score, maxCombo }) {
  hideAllOverlayPanels();                                   // hide any other overlay panels
  showOverlay();                                            // ensure the overlay layer is visible

  const congratsEl = document.getElementById('resCongrats'); // get the headline element
  if (congratsEl) {                                         // guard: only if the element exists
    const choices = [ 'YOU DID IT!', 'AWESOME JOB!', 'YOU NAILED IT!', 'NICE WORK!' ]; // headline variants
    const i = Math.floor(Math.random() * choices.length);   // pick a random index
    congratsEl.textContent = choices[i];                    // set the chosen headline text
  }

  const set = (sel, v) => {                                 // helper to set text content safely
    const el = document.querySelector(sel);                 // query the target element
    if (el) el.textContent = v;                             // assign text when found
  };

  set('#resLevel',  level ?? '');                           // write level value
  set('#resScore',  score ?? 0);                            // write score value
  set('#resCombo',  maxCombo ?? 0);                         // write max combo value

  const panel = document.getElementById('resultsCta');      // get the results panel root
  if (panel) panel.classList.remove('hidden');              // unhide the results panel

  srSpeak(`Level ${level ?? ''} clear. Score ${score ?? 0}. Max combo ${maxCombo ?? 0}.`); // announce
}



/**
 * showPauseOverlay
 * Shows the base CTA and prints a clear two-line resume hint while paused.
 */
function showPauseOverlay() {
  hideAllOverlayPanels();                                               // hide results/game-over panels
  const baseCta = document.querySelector('#overlay .play-cta');         // get the base CTA (round button + label)
  if (baseCta) baseCta.classList.remove('hidden');                      // ensure the base CTA is visible again
  setOverlayLabel('Game paused\nPress Play to resume');                 // two-line hint (CSS makes '\n' break line)
  srSpeak('Game paused. Press Play to resume.');                        // announce for screen readers
  showOverlay();                                                        // reveal the overlay layer
}



/**
 * showGameOverOverlay
 * Shows the game-over panel and fills it with level/score/combo numbers.
 */
function showGameOverOverlay({ level, score, maxCombo }) {
  hideAllOverlayPanels();                                                // hide other panels first
  showOverlay();                                                         // make overlay visible

  const set = (sel, v) => {                                              // helper to set text by selector
    const el = document.querySelector(sel);                              // find node for selector
    if (el) el.textContent = v;                                          // set text when node exists
  };

  set('#goLevel',  level ?? '');                                         // write level value
  set('#goScore',  score ?? 0);                                          // write score value
  set('#goCombo',  maxCombo ?? 0);                                       // write max combo value

  const panel = document.getElementById('gameOverCta');                  // fresh lookup of panel node
  if (panel) panel.classList.remove('hidden');                           // unhide game-over panel

  srSpeak(`Game over. Score ${score ?? 0}. Max combo ${maxCombo ?? 0}.`); // announce
}





/**
 * initResultOverlays()
 * Brief: Wire panel buttons to emit UI events handled in game.js.
 */
function initResultOverlays() {
  const btnNext    = document.getElementById('btnNextLevel');     // Next button in results
  const btnRestart = document.getElementById('btnRestartLevel');  // Restart button in results
  const btnRetry   = document.getElementById('btnRetryLevel');    // Retry button in game over

  if (btnNext && btnNext.dataset.wired !== 'true') {              // guard double-binding
    btnNext.dataset.wired = 'true';                               // mark as wired
    btnNext.addEventListener('click', () => {                     // on click
      hideAllOverlayPanels();                                     // hide panels
      window.dispatchEvent(new CustomEvent('ui:nextLevel'));      // tell game.js to go next
    });
  }

  if (btnRestart && btnRestart.dataset.wired !== 'true') {        // guard double-binding
    btnRestart.dataset.wired = 'true';                            // mark as wired
    btnRestart.addEventListener('click', () => {                  // on click
      hideAllOverlayPanels();                                     // hide panels
      window.dispatchEvent(new CustomEvent('ui:restartLevel'));   // tell game.js to restart
    });
  }

  if (btnRetry && btnRetry.dataset.wired !== 'true') {            // guard double-binding
    btnRetry.dataset.wired = 'true';                              // mark as wired
    btnRetry.addEventListener('click', () => {                    // on click
      hideAllOverlayPanels();                                     // hide panels
      window.dispatchEvent(new CustomEvent('ui:retryLevel'));     // tell game.js to retry
    });
  }
}

// Force overlay icon: 'play' | 'pause' | null (null = release to CSS control)
function setOverlayIcon(mode) {
  if (!iconPlay || !iconPause) return;
  if (mode === 'play') {
    iconPlay.style.display  = 'inline-block';
    iconPause.style.display = 'none';
    return;
  }
  if (mode === 'pause') {
    iconPlay.style.display  = 'none';
    iconPause.style.display = 'inline-block';
    return;
  }
  // release to CSS defaults
  iconPlay.style.display  = '';
  iconPause.style.display = '';
}

/* ----------------------------------------
   Focus helpers for panels (trap + restore)
---------------------------------------- */
const FOCUS_SEL = 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'; // focusables
let _panelLastFocus = null;       // stores the element that had focus before opening
let _trapHandler = null;          // keydown handler reference for removal

/* Return first focusable inside a container */
function getFirstFocusable(container) {               // container = panel root
  const nodes = container.querySelectorAll(FOCUS_SEL); // find focusables
  return nodes.length ? nodes[0] : null;               // first or null
}

/* Trap Tab inside container until panel is closed */
function trapFocusIn(container) {                     // enable focus trap
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler); // cleanup previous
  _trapHandler = (ev) => {                             // keydown handler
    if (ev.key !== 'Tab') return;                      // only Tab
    const list = Array.from(container.querySelectorAll(FOCUS_SEL)) // list focusables
      .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null); // visible/enabled
    if (!list.length) return;                          // nothing to trap
    const first = list[0];                             // first focusable
    const last = list[list.length - 1];                // last focusable
    if (ev.shiftKey && document.activeElement === first) { // Shift+Tab on first → go last
      last.focus(); ev.preventDefault();               // loop
    } else if (!ev.shiftKey && document.activeElement === last) { // Tab on last → go first
      first.focus(); ev.preventDefault();              // loop
    }
  };
  document.addEventListener('keydown', _trapHandler);  // start trapping
}


/* ----------------------------------------
   Panel controls (open/close)
   Purpose: Pause game, open panel, trap focus; restore on close.
---------------------------------------- */
function openPanel(name) {
  window.dispatchEvent(new CustomEvent('ui:requestPause'));      // pause the game behind
  const panel = document.getElementById(`panel-${name}`);        // target panel root
  if (!panel) return;                                            // guard
  document.body.setAttribute('data-panel-open', name);           // mark open
  panel.classList.remove('hidden');                              // show
  if (name === 'settings') srSpeak('Settings opened.');

  // a11y: focus management (store last, move focus inside, trap tab)
  _panelLastFocus = document.activeElement;                      // remember current focus
  const first = getFirstFocusable(panel)                          // first interactive
             || panel.querySelector('[data-close-panel]')        // or its close button
             || panel;                                           // or the panel itself
  first?.focus();                                                // move focus in
  trapFocusIn(panel);                                            // trap Tab

  // keep existing wiring for settings
  if (name === 'settings') {
    wireSettingsTabs();                                          // tabs are ready
    wireSettingsControls();                                      // form controls ready
    renderHighScorePane();
  }
}

function closePanel(name) {
  const panel = document.getElementById(`panel-${name}`);        // target panel root
  if (!panel) return;                                            // guard
  panel.classList.add('hidden');                                 // hide
  if (document.body.getAttribute('data-panel-open') === name) {  // clear open flag
    document.body.removeAttribute('data-panel-open');
  }
  // a11y: release trap + restore focus to opener (if still in DOM)
  if (_trapHandler) { document.removeEventListener('keydown', _trapHandler); _trapHandler = null; }
  if (_panelLastFocus && document.contains(_panelLastFocus)) { _panelLastFocus.focus(); }
  _panelLastFocus = null;                                        // clear ref
}


/* Loads settings or returns defaults (no highContrast anymore) */
function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);              // reads stored JSON
  if (raw) {
    try { return JSON.parse(raw); } catch (_) {}
  }
  return {
    volume: 0.8,                                               // 80% volume
    muted: false,                                              // not muted
    reduceMotion: false,                                       // motion allowed
    noFlash: false,                                            // flashes allowed
    countdown: 3                                               // 3 seconds
  };
}


/* Saves settings to localStorage */
function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));       // persists JSON
}

/* ----------------------------------------
   Apply settings to UI/body and notify subsystems
   Purpose: Enforce non-gameplay toggles; send simple events.
---------------------------------------- */
function applySettings(s) {
  // audio: send an event; your audio system can listen or poll
  window.dispatchEvent(new CustomEvent('audio:setMasterVolume', { // notifies audio
    detail: { volume: s.muted ? 0 : s.volume }                    // 0 when muted
  }));

  // sets data flags for CSS/JS to react to
if (s.reduceMotion) document.body.setAttribute('data-reduce-motion', 'true');
else document.body.removeAttribute('data-reduce-motion');

if (s.noFlash) document.body.setAttribute('data-no-flash', 'true');
else document.body.removeAttribute('data-no-flash');


  // expose countdown value globally for start overlay (applies next start)
  window.__settings = window.__settings || {};                  // creates settings bag
  window.__settings.countdown = Number(s.countdown) || 3;       // stores countdown
}

/* ----------------------------------------
   Wire settings form controls
   Purpose: Sync form with storage and persist on change.
---------------------------------------- */
function wireSettingsControls() {
  const form = document.getElementById('settingsForm');         // grabs settings form
  if (!form || form.dataset.wired === 'true') return;           // prevents double-bind
  form.dataset.wired = 'true';                                  // marks wired

  // query controls (no highContrast anymore)
  const elVolume    = document.getElementById('settingsVolume');       // volume slider
  const elMute      = document.getElementById('settingsMute');         // mute checkbox
  const elReduce    = document.getElementById('settingsReduceMotion'); // reduce motion
  const elNoFlash   = document.getElementById('settingsNoFlash');      // disable flashes
  const elCountdown = document.getElementById('settingsCountdown');    // countdown select
  const elReset     = document.getElementById('settingsResetData');    // reset button

  // load current settings
  let s = loadSettings();

  // reflect values into form
  if (elVolume)   elVolume.value   = Math.round((s.volume ?? 0.8) * 100);
  if (elMute)     elMute.checked   = !!s.muted;
  if (elReduce)   elReduce.setAttribute('aria-pressed', (!!s.reduceMotion) ? 'true' : 'false');
  if (elNoFlash)  elNoFlash.setAttribute('aria-pressed', (!!s.noFlash) ? 'true' : 'false');
  if (elCountdown)elCountdown.value= String(s.countdown ?? 3);

  // apply immediately on open
  applySettings(s);

  // helpers to persist on change
  const persist = () => {
    saveSettings(s);
    applySettings(s);
  };

  // listeners
  if (elVolume) elVolume.addEventListener('input', () => {
    s.volume = Math.max(0, Math.min(1, Number(elVolume.value) / 100));
    persist();
  });

  if (elMute) elMute.addEventListener('change', () => {
    s.muted = !!elMute.checked;
    persist();
  });

  if (elReduce) elReduce.addEventListener('click', () => {
    const next = elReduce.getAttribute('aria-pressed') !== 'true';
    elReduce.setAttribute('aria-pressed', next ? 'true' : 'false');
    s.reduceMotion = next;
    persist();
  });

  if (elNoFlash) elNoFlash.addEventListener('click', () => {
    const next = elNoFlash.getAttribute('aria-pressed') !== 'true';
    elNoFlash.setAttribute('aria-pressed', next ? 'true' : 'false');
    s.noFlash = next;
    persist();
  });


  if (elCountdown) elCountdown.addEventListener('change', () => {
    s.countdown = Number(elCountdown.value) || 3;
    persist();
  });

  if (elReset) elReset.addEventListener('click', () => {
    const ok = confirm('Reset all saved progress and settings?');
    if (!ok) return;
    try {
      localStorage.clear();
    } catch (_) {}
    s = loadSettings();
    if (elVolume)   elVolume.value   = Math.round(s.volume * 100);
    if (elMute)     elMute.checked   = !!s.muted;
    if (elReduce)   elReduce.setAttribute('aria-pressed', s.reduceMotion ? 'true' : 'false');
    if (elNoFlash)  elNoFlash.setAttribute('aria-pressed', s.noFlash ? 'true' : 'false');
    if (elCountdown)elCountdown.value= String(s.countdown);
    persist();
    alert('Game data has been reset.');
  });
}

/* ----------------------------------------
   High Score pane helpers
   Purpose: Show current BEST and allow resetting it.
---------------------------------------- */
function renderHighScorePane() {
  // read BEST from localStorage (fallback: HUD label)
  const readBest = () => {
    try {
      // common key used by scoring; if missing, fall back to HUD
      const fromLS = Number(localStorage.getItem('best') || 0);
      if (!Number.isNaN(fromLS) && fromLS > 0) return fromLS;
    } catch (_) {}
    const hudBest = Number((document.getElementById('best')?.textContent || '0').replace(/\D+/g, '')) || 0;
    return hudBest;
  };

  const out = document.getElementById('hiBestValue');      // output node
  if (out) out.textContent = readBest();                   // print current BEST

  const btn = document.getElementById('resetHighScore');   // reset button
  if (btn && btn.dataset.wired !== 'true') {
    btn.dataset.wired = 'true';
    btn.addEventListener('click', () => {
      const ok = confirm('Reset BEST score only?');
      if (!ok) return;

      // set BEST to 0 in storage (safe even if key absent)
      try { localStorage.setItem('best', '0'); } catch (_) {}

      // update HUD BEST if present
      const hudBest = document.getElementById('best');
      if (hudBest) hudBest.textContent = '0';

      // refresh panel value
      if (out) out.textContent = '0';
    });
  }
}



/* ----------------------------------------
   selectSettingsTab
   Purpose: Switch panes; keep all tab buttons visible and mark active with aria-selected.
   Notes:
   - 'settings' is treated as alias for the 'audio' pane.
---------------------------------------- */
function selectSettingsTab(name) {
  // Treat "settings" as the "audio" (home) pane
  if (name === 'settings') name = 'audio';

  // Grab all tab buttons and pane nodes
  const tabs = document.querySelectorAll('.settings-tab');
  const panes = {
    audio:         document.getElementById('settingsPane-audio'),
    accessibility: document.getElementById('settingsPane-accessibility'),
    tutorial:      document.getElementById('settingsPane-tutorial'),
    highscore:     document.getElementById('settingsPane-highscore'),
    credits:       document.getElementById('settingsPane-credits')
  };

  // Show target pane; hide others (with ARIA)
  Object.entries(panes).forEach(([key, el]) => {
    if (!el) return;
    const show = key === name;
    el.classList.toggle('hidden', !show);
    el.toggleAttribute('aria-hidden', !show);
  });

  // Keep all tab buttons visible; mark active with aria-selected
  tabs.forEach((btn) => {
    const raw = btn.dataset.settingsTab || 'audio';
    const btnName = (raw === 'settings') ? 'audio' : raw;
    const isActive = btnName === name;
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.removeAttribute('aria-hidden');
    btn.classList.remove('hidden');
    btn.setAttribute('tabindex', '0'); // keep tabs focusable
  });

  // If highscore tab is active, refresh value
  if (name === 'highscore') {
    renderHighScorePane();
  }
}



/* ----------------------------------------
   Wire settings tabs
   Purpose: Bind tab buttons once and default to 'audio' (home)
---------------------------------------- */
function wireSettingsTabs() {
  const bar = document.querySelector('.settings-tabs');
  if (!bar || bar.dataset.wired === 'true') return;   // guard duplicate
  bar.dataset.wired = 'true';

  bar.querySelectorAll('.settings-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.settingsTab || 'audio';
      selectSettingsTab(name);
    });
  });

  /* Default view = audio/home */
  selectSettingsTab('audio');
}



/* ---------------------------
   Export all UI functions
---------------------------- */
export {
  // HUD toggle
  HUD_MODE_KEY, getHudInlineMode, setHudInlineMode, toggleHudInline, wireHudInlineToggle,
  // Overlay (Play/Pause)
  overlayEl, playBtn, showOverlay, hideOverlay, setOverlayLabel, wirePlayButton, setOverlayIcon,
  // Navbar Play/Pause sync
  getMenuPlayToggle, setMenuLabelToPlay, setMenuLabelToPause, updatePlayMenuLabel, wireMenuPlayToggle,
  // Navbar collapse (Bootstrap)
  initNavbarCollapseSync, initTopbarAutoHeight,
  // Feedback / judge flash 
  judgeFlash, setFeedback,
  // Hearts
  createHeart,  renderLives,
  // Notes (visual)
  spawnNote,
  // Rotate overlay
  updateRotateOverlayAria, dismissRotateUntilPortrait, resetDismissalIfPortrait, initRotateOverlay,
  // Extra controls
  bindControls,openPanel, closePanel,
  // HUD update
  updateHUD,
  // overlay play/paus/gameover/next
   showResultsOverlay, showGameOverOverlay, initResultOverlays, showPauseOverlay,
};