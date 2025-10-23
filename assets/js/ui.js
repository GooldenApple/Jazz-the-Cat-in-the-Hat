/* ---------------------------
   UI related functions
---------------------------- */


// Overlay (Play/Pause) controls 

const overlayEl = document.getElementById('overlay');            // overlay root (CTA + label)
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null; // circular play button

/* 
    showOverlay / hideOverlay / setOverlayLabel
    Purpose: Visual helpers for the CTA/pause overlay.
 */

function showOverlay() { overlayEl?.classList.remove('hidden'); } // reveal overlay
function hideOverlay() { overlayEl?.classList.add('hidden'); }    // hide overlay
function setOverlayLabel(text) {
  const label = document.querySelector('#overlay .play-label');   // find label span
  if (label) label.textContent = text;                            // set text content
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
function getMenuPlayToggle() {
  return document.getElementById('menuPlayToggle'); // late query for safety
}
function setMenuLabelToPlay()  { const b = getMenuPlayToggle(); if (!b) return; b.textContent = '▶ Play';  b.setAttribute('aria-pressed','false'); }
function setMenuLabelToPause() { const b = getMenuPlayToggle(); if (!b) return; b.textContent = '⏸ Pause'; b.setAttribute('aria-pressed','true'); }
function updatePlayMenuLabel() { state.running ? setMenuLabelToPause() : setMenuLabelToPlay(); }


/* 
   wirePlayButton
   Purpose: Wire the circular CTA button (once). Starts the game.
   Usage: call once after overlay is visible on DOMContentLoaded.
   TODO: call your real game loop start instead of spawner only.
 */

function wirePlayButton() {
  const overlay = document.getElementById('overlay');       // re-query overlay (robust)
  if (!overlay) return;                                     // guard: missing overlay
  const btn = overlay.querySelector('.play-btn');           // find play button
  if (!btn) return;                                         // guard: missing button
  if (btn.dataset.wired === 'true') return;                 // already wired once
  btn.dataset.wired = 'true';                               // mark as wired

  btn.addEventListener('click', () => {                     // on click
    state.running = true;                                   // go to running
    startBeatSpawner();                                     // start test spawner
    setOverlayLabel('Play');                                // normalize label
    hideOverlay();                                          // close overlay
    updatePlayMenuLabel();                                  // navbar → Pause
    // TODO: startGameLoop();
  });
}

/* ----------------------------------------
   bindControls
   Purpose: Placeholder for any extra control wiring later.
---------------------------------------- */
function bindControls() {
  // TODO: Add additional controls when needed (e.g., settings toggles).
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
    icon.textContent = '▾';                                            // down chevron
    text.textContent = 'Collapse HUD';                                 // button text
  } else {                                                             // collapsed → show "expand"
    icon.textContent = '▸';                                            // right chevron
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

/* ----------------------------------------
   setFeedback
   Purpose: Show textual feedback + trigger judgeFlash.
   Usage: setFeedback('Perfect','good') / setFeedback('MISS','miss')
---------------------------------------- */
function setFeedback(label, flash) {
  const el = document.getElementById('feedback');          // feedback element
  if (!el) return;                                         // guard
  el.textContent = label;                                  // set text
  if (flash === 'good') judgeFlash('good');                // success flash
  if (flash === 'miss') judgeFlash('miss');                // miss flash
}


/* =============================
   Navbar collapse sync (Bootstrap)
   ============================= */
/* ----------------------------------------
   initNavbarCollapseSync
   Purpose: Keep burger/collapse state correct over lg (992px) breakpoint.
   - Uses Bootstrap Collapse instance as source of truth.
   - Mirrors open state on body[data-nav-open] so CSS can morph burger → X.
---------------------------------------- */
function initNavbarCollapseSync() {
  const collapseEl = document.querySelector('.topbar .navbar-collapse'); // collapsible area
  const togglerEl  = document.querySelector('.navbar-toggler.hamburger'); // burger button
  if (!collapseEl || !togglerEl || !window.bootstrap) return;            // guard

  const collapse = new bootstrap.Collapse(collapseEl, { toggle: false }); // programmatic control

  collapseEl.addEventListener('shown.bs.collapse', () => {               // when opened
    document.body.setAttribute('data-nav-open', 'true');                 // burger → X
    togglerEl.setAttribute('aria-expanded', 'true');                     // a11y
  });
  collapseEl.addEventListener('hidden.bs.collapse', () => {              // when closed
    document.body.removeAttribute('data-nav-open');                      // X → burger
    togglerEl.setAttribute('aria-expanded', 'false');                    // a11y
  });

  togglerEl.addEventListener('click', () => { collapse.toggle(); });     // ensure toggle works

  const mqLgUp = window.matchMedia('(min-width: 992px)');                // lg breakpoint
  const normalizeForViewport = () => {                                   // clean state when crossing
    collapse.hide();                                                     // remove hanging .show
    document.body.removeAttribute('data-nav-open');                      // clear body flag
    togglerEl.setAttribute('aria-expanded', 'false');                    // a11y reset
  };

  normalizeForViewport();                                                // start closed
  mqLgUp.addEventListener('change', normalizeForViewport);               // keep consistent
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



/* ---------------------------
   Export all UI functions
---------------------------- */
export {
  // HUD toggle
  HUD_MODE_KEY, getHudInlineMode, setHudInlineMode, toggleHudInline, wireHudInlineToggle,
  // Overlay (Play/Pause)
  overlayEl, playBtn, showOverlay, hideOverlay, setOverlayLabel, wirePlayButton,
  // Navbar Play/Pause sync
  getMenuPlayToggle, setMenuLabelToPlay, setMenuLabelToPause, updatePlayMenuLabel,
  // Navbar collapse (Bootstrap)
  initNavbarCollapseSync,
  // Feedback / judge flash
  judgeFlash, setFeedback,
  // Hearts
  createHeart,
  // Notes (visual)
  spawnNote,
  // Rotate overlay
  updateRotateOverlayAria, dismissRotateUntilPortrait, resetDismissalIfPortrait, initRotateOverlay
};
