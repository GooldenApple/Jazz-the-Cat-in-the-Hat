/* =============================
   Jazz the Cat in the Hat – Base Skeleton JS
   ============================= */

/* ----------------------------------------
   Global game state
   - Single source of truth for HUD + run state.
   Usage: mutate via functions (hit/heal/start/stop).
---------------------------------------- */
const state = {
  running: false,  // game running flag
  score:   0,      // current score
  lives:   3,      // hearts left
  level:   1,      // current level
  partial: 0       // damage steps on the active heart (0..3)
};

/* ----------------------------------------
   Quick HUD refs
   - Cache key DOM nodes used by updateHUD().
   Usage: hud.score.textContent = '10'
---------------------------------------- */
const hud = {
  lives: document.getElementById('lives'), // lives container (hearts)
  score: document.getElementById('score'), // score number
  best:  document.getElementById('best'),  // (placeholder) best/high score
  level: document.getElementById('level')  // level number
};

/* ----------------------------------------
   init
   Purpose: Reset state and render the HUD once.
   Usage: call once on DOMContentLoaded.
   TODO: load best score from storage when you add persistence.
---------------------------------------- */
function init() {
  state.running = false;  // ensure not running
  state.score   = 0;      // reset score
  state.lives   = 3;      // default lives
  state.level   = 1;      // default level
  state.partial = 0;      // clear partial damage
  updateHUD();            // render HUD to match state
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
   renderLives
   Purpose: Render hearts row according to lives + partial damage step.
   Usage: renderLives(hud.lives, state.lives, state.partial)
---------------------------------------- */
function renderLives(container, lives, partial = 0, steps = 4) {
  container.innerHTML = '';                                  // clear old hearts
  const safeLives   = Math.max(0, lives);                    // clamp negative
  const safePartial = Math.min(Math.max(partial, 0), steps - 1); // clamp step

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {     // for all but last
    container.appendChild(createHeart('full'));              // render full heart
  }

  if (safeLives > 0) {                                       // last heart may be partial
    let klass = 'full';                                      // default full
    if (safePartial === 1) klass = 'threequarter';           // 3/4
    if (safePartial === 2) klass = 'half';                   // 1/2
    if (safePartial === 3) klass = 'quarter';                // 1/4
    container.appendChild(createHeart(klass));               // append the last one
  }

  if (safeLives <= 0) {                                      // no lives → show empty
    container.appendChild(createHeart('empty'));
  }
}

/* ----------------------------------------
   updateHUD
   Purpose: Sync HUD numbers and hearts from state.
   Usage: updateHUD()
---------------------------------------- */
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial); // render lives strip
  hud.score.textContent = state.score;                // update score text
  hud.level.textContent = state.level;                // update level text
  // TODO: show best/high score when you add persistence.
}

/* ----------------------------------------
   bindControls
   Purpose: Placeholder for any extra control wiring later.
---------------------------------------- */
function bindControls() {
  // TODO: Add additional controls when needed (e.g., settings toggles).
}

/* ----------------------------------------
   hit
   Purpose: Apply damage in steps; every 4th step consumes one life.
   Usage: hit()
---------------------------------------- */
function hit() {
  if (state.lives <= 0) return;            // already dead → ignore
  if (state.partial < 3) {                 // not yet at 4th step
    state.partial += 1;                    // increment step
  } else {
    state.lives -= 1;                      // lose one heart
    state.partial = 0;                     // reset step
  }
  updateHUD();                              // refresh HUD
}

/* ----------------------------------------
   heal
   Purpose: Restore a full heart and clear partial damage.
   Usage: heal()
---------------------------------------- */
function heal() {
  state.lives += 1;                         // add life
  state.partial = 0;                        // clear damage step
  updateHUD();                              // refresh HUD
}

/* =============================
   Overlay (Play/Pause) controls
   ============================= */
const overlayEl = document.getElementById('overlay');            // overlay root (CTA + label)
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null; // circular play button

/* ----------------------------------------
   showOverlay / hideOverlay / setOverlayLabel
   Purpose: Visual helpers for the CTA/pause overlay.
---------------------------------------- */
function showOverlay() { overlayEl?.classList.remove('hidden'); } // reveal overlay
function hideOverlay() { overlayEl?.classList.add('hidden'); }    // hide overlay
function setOverlayLabel(text) {
  const label = document.querySelector('#overlay .play-label');   // find label span
  if (label) label.textContent = text;                            // set text content
}

/* ----------------------------------------
   wirePlayButton
   Purpose: Wire the circular CTA button (once). Starts the game.
   Usage: call once after overlay is visible on DOMContentLoaded.
   TODO: call your real game loop start instead of spawner only.
---------------------------------------- */
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

  // Optional: hotkey 'H' to toggle while testing
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;                                  // no repeats
    if ((e.key || '').toLowerCase() === 'h') {             // press H
      e.preventDefault();
      toggleHudInline();
    }
  });
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

/* ----------------------------------------
   Play/Pause toggle button
   Purpose: Toggle game state using the always visible quick button.
   Usage: Call wireMenuPlayToggle() on DOMContentLoaded.
---------------------------------------- */
function wireMenuPlayToggle() {
  const btn = document.getElementById('quickPlayPause'); // query quick button
  if (!btn) return; // guard if button missing

  btn.addEventListener('click', () => { // on click
    if (state.running) {
      // ----- PAUSE -----
      state.running = false;                      // mark paused
      stopBeatSpawner();                          // stop random spawner (existing fn)
      setOverlayLabel('Paused');                  // overlay label
      showOverlay();                              // show overlay
      document.body.setAttribute('data-paused', 'true');   /* freeze notes in place */
      btn.setAttribute('aria-pressed', 'false');  // a11y state
      btn.setAttribute('aria-label', 'Play');     // a11y label
      // (optional) if your quick button shows text/icon, update it here
      // btn.textContent = '▶ Play';
    } else {
      // ----- START/RESUME -----
      state.running = true;                       // mark running
      startBeatSpawner();                         // start random spawner (existing fn)
      setOverlayLabel('Play');                    // normalize overlay label
      hideOverlay();                              // hide overlay
      document.body.removeAttribute('data-paused');        /* unfreeze notes */
      btn.setAttribute('aria-pressed', 'true');   // a11y state
      btn.setAttribute('aria-label', 'Pause');    // a11y label
      // (optional) if your quick button shows text/icon, update it here
      // btn.textContent = '⏸ Pause';
      // TODO: resumeGameLoop() if/when you add a real loop
    }
  });
}





/* =============================
   MOVE CONTROLLER (CSS-driven)
   - Adds/removes .move-left/right/up/down on #dancer.
   ============================= */

/* ----------------------------------------
   removeAllMoveClasses
   Purpose: Ensure only one move class lives at a time.
---------------------------------------- */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');   // clear left
  dancer.classList.remove('move-right');  // clear right
  dancer.classList.remove('move-up');     // clear up
  dancer.classList.remove('move-down');   // clear down
}

/* ----------------------------------------
   applyMove
   Purpose: Force-restart CSS animation by reflow; clean up on first animation end.
   Usage: applyMove('move-left')
---------------------------------------- */
function applyMove(moveClass) {
  if (!state.running) return;                              // ignore when paused
  const dancer = document.getElementById('dancer');       // cat wrapper
  if (!dancer) return;                                     // guard

  removeAllMoveClasses(dancer);                            // clear older move
  // Force a reflow so re-adding a class restarts the animation cleanly:
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;                                      // read layout to flush
  dancer.classList.add(moveClass);                         // add new move class

  const onEnd = () => {                                    // define cleanup handler
    dancer.classList.remove(moveClass);                    // remove the class
    dancer.removeEventListener('animationend', onEnd);     // detach listener
    dancer.removeEventListener('animationcancel', onEnd);  // detach cancel listener
  };
  dancer.addEventListener('animationend', onEnd,   { once:false }); // catch first bubbling end
  dancer.addEventListener('animationcancel', onEnd,{ once:false }); // safety
}

/* ----------------------------------------
   Convenience move triggers
   Purpose: Small wrappers for clarity (used by inputs).
---------------------------------------- */
function doLeftMove()  { applyMove('move-left');  } // trigger left move
function doRightMove() { applyMove('move-right'); } // trigger right move
function doUpMove()    { applyMove('move-up');    } // trigger up move
function doDownMove()  { applyMove('move-down');  } // trigger down move

/* ----------------------------------------
   wireMoveButtons
   Purpose: Map on-screen DDR buttons to moves + judge.
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {           // get all control buttons
    btn.addEventListener('click', () => {                              // on click/tap
      const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // read dir attribute
      if (!state.running) return;                                      // ignore when paused
      if (dir === 'left')  { doLeftMove();  tryJudge('left');  }       // play left + judge
      if (dir === 'right') { doRightMove(); tryJudge('right'); }       // play right + judge
      if (dir === 'up')    { doUpMove();    tryJudge('up');    }       // play up + judge
      if (dir === 'down')  { doDownMove();  tryJudge('down');  }       // play down + judge
    });
  });
}

/* ----------------------------------------
   wireMoveKeyboard
   Purpose: Map Arrow keys to moves + judge (no repeats).
---------------------------------------- */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {                          // listen for key down
    if (e.repeat) return;                                              // ignore repeats
    const isArrow =
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp'   || e.key === 'ArrowDown';                  // detect arrow keys
    if (isArrow) e.preventDefault();                                   // prevent scroll
    if (!state.running) return;                                        // ignore when paused

    if (e.key === 'ArrowLeft')  { doLeftMove();  tryJudge('left');  return; }
    if (e.key === 'ArrowRight') { doRightMove(); tryJudge('right'); return; }
    if (e.key === 'ArrowUp')    { doUpMove();    tryJudge('up');    return; }
    if (e.key === 'ArrowDown')  { doDownMove();  tryJudge('down');  return; }
  });
}

/* ----------------------------------------
   initMoveControls
   Purpose: Public setup to connect both input types.
---------------------------------------- */
function initMoveControls() {
  wireMoveButtons();   // on-screen
  wireMoveKeyboard();  // keyboard
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
   Rails + Notes (visual)
   ============================= */

/* ----------------------------------------
   getRailsMap
   Purpose: Cache references to rail elements.
   Returns: { left, up, down, right } or null.
---------------------------------------- */
function getRailsMap() {
  const root = document.querySelector('.rails');           // rails root
  if (!root) return null;                                  // guard
  return {
    left:  root.querySelector('.rail-left'),               // left rail
    up:    root.querySelector('.rail-up'),                 // up rail
    down:  root.querySelector('.rail-down'),               // down rail
    right: root.querySelector('.rail-right')               // right rail
  };
}

/* ----------------------------------------
   getJudgeDistancePx
   Purpose: Pixel distance from rail top to judge-line center.
   Notes: Uses a hidden .judge-line hook; falls back to an approximation.
---------------------------------------- */
function getJudgeDistancePx(railEl) {
  if (!railEl) return 0;                                        // guard
  const stageTop = railEl.getBoundingClientRect().top;          // rail top Y (viewport)
  const judge = document.querySelector('.judge-line');          // measurement hook
  if (!judge) {                                                 // no hook → approximate
    return Math.max(0, railEl.clientHeight * 0.62 - 20);        // crude approx to --judge-rel
  }
  const targetY = judge.getBoundingClientRect().top + (judge.clientHeight / 2); // center Y
  const dist = Math.max(0, targetY - stageTop - 9);             // align note center reasonably
  return dist;                                                  // pixels to judge line
}

/* ----------------------------------------
   getBottomDistancePx
   Purpose: Pixel distance from rail top to where the note stops at bottom.
   Notes: NOTE_H must match CSS .note height.
---------------------------------------- */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0;                        // guard
  const NOTE_H = 40;                            // must match CSS
  return Math.max(0, railEl.clientHeight - NOTE_H); // top of note touches rail bottom
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



/* =============================
   TIME-BASED JUDGING (ETA queue)
   ============================= */

/* ----------------------------------------
   judgeConfig
   Purpose: Shared tempo + timing windows for grading.
---------------------------------------- */
const judgeConfig = {
  bpm: 120,                 // tempo used for ETA
  travelBeats: 2.0,         // beats from spawn to judge line
  windows: {                // centered hit windows (ms)
    perfect: 50,            // ≤ 50ms
    great:   90,            // ≤ 90ms
    good:   140             // ≤ 140ms
  }
};

/* ----------------------------------------
   Runtime queue
   Each entry: { id, dir, eta, el, hit:false }
---------------------------------------- */
const activeNotes = [];   // pending notes to judge
let _noteId = 0;         // simple id counter

/* Small helpers */
function nowMs() { return performance.now(); }             // monotonic clock
function removeActiveById(id) {
  const idx = activeNotes.findIndex(n => n.id === id);     // find by id
  if (idx !== -1) activeNotes.splice(idx, 1);              // remove if found
}

/* ----------------------------------------
   registerNote
   Purpose: Compute ETA and push into activeNotes.
   Returns: meta so caller can link DOM element later.
---------------------------------------- */
function registerNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const msPerBeat = 60000 / bpm;                           // beat length in ms
  const eta = nowMs() + (travelBeats * msPerBeat);         // expected crossing time
  const meta = { id: ++_noteId, dir, eta, el: null, hit: false }; // runtime meta
  activeNotes.push(meta);                                   // store
  return meta;                                              // return
}

/* ----------------------------------------
   gradeHit
   Purpose: On input, pick closest note in same dir and grade by |eta-now|.
   Returns: {hit:true,label:'Perfect'|'Great'|'Good'} or {hit:false,label:'Miss'}
---------------------------------------- */
function gradeHit(dir) {
  const t = nowMs();                                       // current time
  let bestIdx = -1;                                        // best candidate index
  let bestAbs = Infinity;                                  // best |Δt|

  for (let i = 0; i < activeNotes.length; i++) {           // scan queue
    const n = activeNotes[i];                              // candidate
    if (n.dir !== dir) continue;                           // must match direction
    const adt = Math.abs(n.eta - t);                       // |Δt| to ETA
    if (adt < bestAbs) { bestAbs = adt; bestIdx = i; }     // keep tighter one
  }

  if (bestIdx === -1) {                                    // none in lane
    setFeedback('MISS', 'miss');                           // UI miss
    return { hit:false, label:'Miss' };
  }

  const w = judgeConfig.windows;                           // window cfg
  let label = 'Miss';                                      // default
  if (bestAbs <= w.perfect) label = 'Perfect';
  else if (bestAbs <= w.great) label = 'Great';
  else if (bestAbs <= w.good)  label = 'Good';

  if (label !== 'Miss') {                                  // a valid hit
    const n = activeNotes[bestIdx];                        // note meta
    n.hit = true;                                          // mark hit
    if (n.el) n.el.remove();                               // remove DOM if still there
    activeNotes.splice(bestIdx, 1);                        // consume

    if (label === 'Perfect') state.score += 100;           // score bumps
    else if (label === 'Great') state.score += 70;
    else if (label === 'Good')  state.score += 50;
    updateHUD();                                           // refresh HUD
    setFeedback(label, 'good');                            // UI good flash
    return { hit:true, label };
  }

  setFeedback('MISS', 'miss');                             // outside windows
  return { hit:false, label:'Miss' };                      // miss
}

/* ----------------------------------------
   tryJudge
   Purpose: Public entry from inputs → perform time-based judgement.
---------------------------------------- */
function tryJudge(dir) {
  if (!state.running) return;                              // ignore when paused
  gradeHit(dir);                                           // compute grade
}

/* ----------------------------------------
   spawnJudgedNote
   Purpose: Register ETA + spawn DOM, and auto-MISS if animation finishes unhit.
   Usage: use this from your test spawner (and later from chart playback).
---------------------------------------- */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const meta = registerNote(dir, travelBeats, bpm);        // create meta with ETA
  const el = spawnNote(dir, travelBeats, bpm);             // create DOM note
  if (!el) return;                                         // guard
  meta.el = el;                                            // link DOM→meta
  el.__noteId = meta.id;                                   // store id on DOM (debug)

  el.addEventListener('animationend', () => {              // when fall ends
    const still = activeNotes.find(n => n.id === meta.id); // still pending?
    if (!still) return;                                    // already hit → ignore
    setFeedback('MISS', 'miss');                           // UI miss
    hit();                                                 // apply damage step
    updateHUD();                                           // refresh HUD
    removeActiveById(meta.id);                             // drop from queue
    el.remove();                                           // clean DOM
  }, { once:true });
}

/* =============================
   RANDOM TEST SPAWNER (dev)
   ============================= */

let _beatTimer = null;                                     // interval handle
const rhythm = {
  bpm: 120,            // tempo
  stepDiv: 1,          // ticks per beat (1=each beat)
  travelBeats: 2.0     // travel beats to judge line
};

/* ----------------------------------------
   startBeatSpawner
   Purpose: Start a simple random spawner aligned to BPM (for testing).
   TODO: replace with real chart/music syncing later.
---------------------------------------- */
function startBeatSpawner() {
  if (_beatTimer) return;                                  // already running
  const msPerBeat = 60000 / rhythm.bpm;                    // ms per beat
  const tickMs    = msPerBeat / rhythm.stepDiv;            // tick interval

  _beatTimer = setInterval(() => {                         // interval loop
    if (!state.running) return;                            // spawn only if playing
    const dirs = ['left', 'up', 'down', 'right'];          // available lanes
    const dir  = dirs[(Math.random() * dirs.length) | 0];  // random lane
    spawnJudgedNote(dir, rhythm.travelBeats, rhythm.bpm);  // spawn + register
  }, Math.max(80, tickMs));                                // guard too-fast timers
}

/* ----------------------------------------
   stopBeatSpawner
   Purpose: Stop the random spawner.
---------------------------------------- */
function stopBeatSpawner() {
  if (_beatTimer) { clearInterval(_beatTimer); _beatTimer = null; } // clear timer
}

/* ----------------------------------------
   clearAllNotes
   Purpose: Remove all visual notes and clear ETA queue.
---------------------------------------- */
function clearAllNotes() {
  document.querySelectorAll('.rail .note').forEach(n => n.remove()); // purge nodes
  activeNotes.length = 0;                                            // purge queue
}

/* =============================
   Rotate Overlay Controller
   ============================= */
/* ----------------------------------------
   Purpose: Show the rotate overlay only on tiny landscape or very short heights.
   - Keeps aria-hidden in sync
   - Uses `inert` to block focus behind the overlay
   - Blurs focused element before hiding to avoid ARIA warning
---------------------------------------- */
(() => {
  const body = document.body;                                                   // root body
  const rotateOverlay = document.getElementById('rotateOverlay');               // overlay element
  const closeBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; // close button

  // Match our CSS media queries: show on ≤767.98px & landscape, or ≤480px height
  const mqTinyLandscape = window.matchMedia('(max-width: 767.98px) and (orientation: landscape)'); // MQ 1
  const mqShortHeight   = window.matchMedia('(max-height: 480px)');                                 // MQ 2

  /** Update ARIA + inert to reflect current visibility */
  function updateRotateOverlayAria() {
    const dismissed = body.getAttribute('data-rotate-dismissed') === 'true'; // user dismissed?
    const visibleByMQ = (mqTinyLandscape.matches || mqShortHeight.matches);  // matches either MQ
    const shouldShow = visibleByMQ && !dismissed;                             // final decision

    if (!rotateOverlay) return;                                               // guard

    if (shouldShow) {
      rotateOverlay.removeAttribute('inert');                                 // allow interaction
      rotateOverlay.setAttribute('aria-hidden', 'false');                     // visible for a11y
      if (closeBtn) closeBtn.focus();                                         // focus inside
    } else {
      if (rotateOverlay.contains(document.activeElement)) {                   // focus cleanup
        document.activeElement.blur?.();
      }
      rotateOverlay.setAttribute('inert', '');                                // block focus
      rotateOverlay.setAttribute('aria-hidden', 'true');                      // hide for a11y
    }
  }

  /** User clicked "Close window": hide until we go back to portrait/taller */
  function dismissRotateUntilPortrait() {
    if (rotateOverlay.contains(document.activeElement)) { // defocus first
      document.activeElement.blur?.();
    }
    body.setAttribute('data-rotate-dismissed', 'true');   // remember dismissal
    updateRotateOverlayAria();                             // apply state
  }

  /** When leaving landscape, clear the dismissal so it can show next time */
  function resetDismissalIfPortrait() {
    if (!mqTinyLandscape.matches) {                        // portrait or wide
      body.removeAttribute('data-rotate-dismissed');       // clear dismissal
    }
    updateRotateOverlayAria();                             // resync
  }

  if (rotateOverlay && closeBtn) {                         // wire only if present
    closeBtn.addEventListener('click', (e) => {            // on click
      e.preventDefault();                                  // prevent default button behavior
      dismissRotateUntilPortrait();                        // hide overlay
    });

    // Re-evaluate when MQs flip or on resize
    mqTinyLandscape.addEventListener('change', updateRotateOverlayAria); // MQ1 change
    mqShortHeight.addEventListener('change', updateRotateOverlayAria);   // MQ2 change
    window.addEventListener('resize', updateRotateOverlayAria);          // generic resize

    // Also watch orientation to reset dismissal when returning to portrait
    window.matchMedia('(orientation: landscape)')
      .addEventListener('change', resetDismissalIfPortrait);             // orientation watcher

    // Initial sync
    updateRotateOverlayAria();                                           // first run
  }

  // TODO: Add fade/animation when overlay appears/disappears for smoother UX
  // TODO: Maybe store dismissal in localStorage if i want it remembered between sessions
})();



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

/* =============================
   DOMContentLoaded bootstrap
   ============================= */
/* ----------------------------------------
   Purpose: Wire everything once DOM is ready.
---------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();                                  // reset core state + render HUD once
    setOverlayLabel('Play');                 // set initial overlay label
    updatePlayMenuLabel();                   // navbar shows ▶ Play initially

    const overlay = document.getElementById('overlay'); // grab overlay node
    if (overlay) overlay.classList.remove('hidden');    // ensure overlay is visible on first load

    wirePlayButton();                        // hook up CTA play button
    initMoveControls();                      // map buttons + keyboard → tryJudge()
    wireMenuPlayToggle();                    // navbar ▶ Play / ⏸ Pause toggle
    initNavbarCollapseSync();                // keep burger/collapse correct across breakpoints
    bindControls();                          // placeholder for future settings, etc.

    /* ----- Inline HUD collapse (Score/Best/Level) ----- */
    const savedHud = localStorage.getItem(HUD_MODE_KEY);                  // fetch persisted mode
    const prefersCollapsed = window.matchMedia('(max-width: 732px)').matches; // breakpoint check
    setHudInlineMode(                                                      // apply initial mode
      savedHud ? savedHud : (prefersCollapsed ? 'collapsed' : 'expanded')
    );

    wireHudInlineToggle();                                                // wire the HUD toggle chip (+ hotkey 'H')

    // Auto-collapse on resize when under 732px,
    // but only if user has not chosen a mode (no savedHud).
    const mqHud = window.matchMedia('(max-width: 732px)');                // watch breakpoint
    mqHud.addEventListener('change', (e) => {                             // when crossing threshold
      if (localStorage.getItem(HUD_MODE_KEY)) return;                     // user preference exists → skip
      if (e.matches) {                                                    // now under 732px
        setHudInlineMode('collapsed');                                    // collapse HUD
      } else {                                                            // above 732px
        setHudInlineMode('expanded');                                     // expand HUD
      }
    });

    /* ----- Mobile UX: close navbar collapse after clicking a nav button ----- */
    document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {   // get all nav buttons
      btn.addEventListener('click', () => {                               // on any nav button click
        const collapseEl = document.getElementById('mainNav');            // collapse root
        if (collapseEl && collapseEl.classList.contains('show')) {        // only if currently open
          const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl); // get instance
          collapse.hide();                                                // close the panel
        }
      });
    });

  } catch (err) {
    console.error('[INIT ERROR]', err);           // log any failure
    const overlay = document.getElementById('overlay'); // best-effort: show overlay so user can recover
    if (overlay) overlay.classList.remove('hidden');    // unhide overlay on error
  }
});





/* =============================
   DEV test hooks
   ============================= */
/* ----------------------------------------
   exposeDevHooks
   Purpose: Attach useful helpers to window for console testing.
   Safe to keep in production; only references are exposed.
---------------------------------------- */
(function exposeDevHooks() {
  if (typeof window === 'undefined') return;  // guard

  // Moves (Console: doLeftMove(), doRightMove(), doUpMove(), doDownMove())
  window.doLeftMove  = doLeftMove;
  window.doRightMove = doRightMove;
  window.doUpMove    = doUpMove;
  window.doDownMove  = doDownMove;

  // Time-based judge entry (Console: tryJudge('left'|'right'|'up'|'down'))
  window.tryJudge    = tryJudge;

  // TODO: expose start/stop helpers if you want quick testing:
  // window.startBeatSpawner = startBeatSpawner;
  // window.stopBeatSpawner  = stopBeatSpawner;
})();