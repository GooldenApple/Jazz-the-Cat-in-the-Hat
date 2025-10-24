


// --- TEMP DEBUG ---
console.log('[ui] module loaded');
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
  const isPaused = document.body.hasAttribute('data-paused');
  if (isPaused) {
    setMenuLabelToPlay();
  } else {
    setMenuLabelToPause();
  }
}



/* wirePlayButton
   Purpose: Wire the big CTA play button. Do NOT hide overlay here;
            song lifecycle events will handle countdown + hide.
*/
function wirePlayButton() {
  console.log('[overlay] wirePlayButton: start');                 // debug marker

  const overlay = document.getElementById('overlay');             // overlay root
  if (!overlay) {                                                 // guard: missing DOM
    console.log('[overlay] wirePlayButton: no overlay');
    return;
  }

  const btn = overlay.querySelector('.play-btn');                 // circular CTA button
  if (!btn) {                                                     // guard: missing DOM
    console.log('[overlay] wirePlayButton: no .play-btn');
    return;
  }

  if (btn.dataset.wired === 'true') {                             // avoid double-binding
    console.log('[overlay] wirePlayButton: already wired');
    return;
  }
  btn.dataset.wired = 'true';                                     // mark as wired
  console.log('[overlay] wirePlayButton: listener attached');

  btn.addEventListener('click', () => {                           // when CTA is clicked
    console.log('[overlay] click: paused(before)=',               // log paused flag
      document.body.hasAttribute('data-paused'));

    window.dispatchEvent(new CustomEvent('ui:requestStartRun'));  // ask app to start a run (song-based)

    document.body.removeAttribute('data-paused');                 // unfreeze UI immediately
    console.log('[overlay] after removeAttribute: paused=',
      document.body.hasAttribute('data-paused'));
    updatePlayMenuLabel();                                        // sync navbar label

    // NOTE: Do NOT hide the overlay or change its label here.     // keep overlay visible
    // The countdown (3-2-1) and hiding will be controlled by      // handled in song:ready/started
    // 'song:ready' and 'song:started' events.                     // events in game.js
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
  const stageTop = railEl.getBoundingClientRect().top; // rail top Y
  const judge = document.querySelector('.judge-line'); // judge hook
  if (!judge) {
    return Math.max(0, railEl.clientHeight * 0.62 - 20); // fallback approximation
  }
  const targetY = judge.getBoundingClientRect().top + (judge.clientHeight / 2); // center Y
  const dist = Math.max(0, targetY - stageTop - 9); // distance to align note center
  return dist;
}

/* Calculates the pixel distance from the rail top to where the note ends at the bottom */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0; // guard
  const NOTE_H = 40; // must match CSS .note height
  return Math.max(0, railEl.clientHeight - NOTE_H); // bottom stop
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
  createHeart,  renderLives,
  // Notes (visual)
  spawnNote,
  // Rotate overlay
  updateRotateOverlayAria, dismissRotateUntilPortrait, resetDismissalIfPortrait, initRotateOverlay,
  // Extra controls
  bindControls,
  // HUD update
  updateHUD,
};
