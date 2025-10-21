/* =============================
   Jazz the Cat in the Hat – Base Skeleton JS
   ============================= */

/* ----------------------------------------
   Global game state
---------------------------------------- */
const state = {
  running: false,  // game is running or not
  score: 0,        // current score
  lives: 3,        // hearts left
  level: 1,        // current level
  partial: 0,      // damage on the active heart (0..3)
};

/* ----------------------------------------
   Quick HUD refs
   - Stores references to key HUD elements
   - Lets us update lives, score, best, and level quickly
   Usage: hud.score.textContent = 10;
---------------------------------------- */
const hud = {
  lives: document.getElementById('lives'), // container that holds heart icons
  score: document.getElementById('score'), // span/div that shows current score
  best:  document.getElementById('best'),  // element for best/high score display
  level: document.getElementById('level'), // element that shows current level
};

/* ----------------------------------------
   init
   - Resets base game state
   - Renders HUD once
   Usage: call once on DOMContentLoaded
---------------------------------------- */
function init() {
  state.running = false; // ensure stopped
  state.score = 0;       // reset score
  state.lives = 3;       // default lives
  state.level = 1;       // default level
  state.partial = 0;     // no partial damage
  updateHUD();           // sync HUD
}

/* ----------------------------------------
   createHeart
   - Builds one SVG heart with a given state class
   Usage: container.appendChild(createHeart('full'))
---------------------------------------- */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // create SVG root
  svg.setAttribute('viewBox', '0 0 24 24');                                     // fixed viewbox
  svg.classList.add('svg-heart', stateClass);                                   // shape state

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // heart path
  path.setAttribute(
    'd',
    'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'
  );
  svg.appendChild(path);                                                        // attach path
  return svg;                                                                   // return node
}

/* ----------------------------------------
   renderLives
   - Rebuilds the heart row based on lives + partial
   Usage: renderLives(hud.lives, state.lives, state.partial)
---------------------------------------- */
function renderLives(container, lives, partial = 0, steps = 4) {
  container.innerHTML = '';                                       // clear row

  const safeLives   = Math.max(0, lives);                         // clamp lives
  const safePartial = Math.min(Math.max(partial, 0), steps - 1);  // clamp partial

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart('full'));                   // full hearts
  }

  if (safeLives > 0) {
    let stateClass = 'full';                                      // default full
    if (safePartial === 1) stateClass = 'threequarter';           // degrade 3/4
    if (safePartial === 2) stateClass = 'half';                   // degrade 1/2
    if (safePartial === 3) stateClass = 'quarter';                // degrade 1/4
    container.appendChild(createHeart(stateClass));               // append partial
  }

  if (safeLives <= 0) {
    container.appendChild(createHeart('empty'));                  // at least one empty
  }
}

/* ----------------------------------------
   updateHUD
   - Syncs HUD numbers and lives from state
   Usage: updateHUD()
---------------------------------------- */
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial); // hearts row
  hud.score.textContent = state.score;                // score text
  hud.level.textContent = state.level;                // level text
  // best / soundMode will be wired later               // reserved
}

/* ----------------------------------------
   bindControls
   - Placeholder for keyboard/touch bindings
   Usage: bindControls()
---------------------------------------- */
function bindControls() {
  // to be implemented
}

/* ----------------------------------------
   hit
   - Applies damage in steps; consumes a life after 4 hits
   Usage: hit()
---------------------------------------- */
function hit() {
  if (state.lives <= 0) return;      // no-op if dead
  if (state.partial < 3) {           // step partial damage
    state.partial += 1;              // next notch
  } else {
    state.lives -= 1;                // consume heart
    state.partial = 0;               // reset partial
  }
  updateHUD();                       // refresh HUD
}

/* ----------------------------------------
   heal
   - Restores one full heart and clears partial damage
   Usage: heal()
---------------------------------------- */
function heal() {
  state.lives += 1;  // add life
  state.partial = 0; // clear partial
  updateHUD();       // refresh HUD
}

/* =============================
   Overlay + Play Button Control
   ============================= */
const overlayEl = document.getElementById('overlay');                     // play overlay container
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null; // play button inside

/* ----------------------------------------
   showOverlay
   - Reveals the play overlay
   Usage: showOverlay()
---------------------------------------- */
function showOverlay() {
  overlayEl?.classList.remove('hidden'); // remove hidden flag
}

/* ----------------------------------------
   hideOverlay
   - Hides the play overlay
   Usage: hideOverlay()
---------------------------------------- */
function hideOverlay() {
  overlayEl?.classList.add('hidden');    // add hidden flag
}

/* ----------------------------------------
   Overlay label helper
   - Updates the overlay label text without changing structure
---------------------------------------- */
function setOverlayLabel(text) {
  const label = document.querySelector('#overlay .play-label');
  if (label) label.textContent = text;
}

/* ----------------------------------------
   wirePlayButton
   - Hides overlay and marks game running when clicked
   Usage: call once on DOMContentLoaded
---------------------------------------- */
function wirePlayButton() {
  if (!playBtn) return;                          // skip if button missing
  playBtn.addEventListener('click', () => {      // on click
    hideOverlay();                               // hide CTA
    state.running = true;
    startBeatSpawner();                          // start the test note spawner when play is pressed
    updatePlayMenuLabel();                        // sync navbar label to "⏸ Pause"
    // TODO: startGame();                        // hook real start here
  });
}

/* ----------------------------------------
   Play/Pause menu toggle
   - Keeps the navbar Play/Pause label in sync with state.running
   - Minimal coupling: uses showOverlay()/hideOverlay() only
   Usage:
     - updatePlayMenuLabel() after init / on start/stop
     - wireMenuPlayToggle() once on DOM ready
---------------------------------------- */
function getMenuPlayToggle() {
  return document.getElementById('menuPlayToggle'); // query late to avoid null pre-DOM
}

function setMenuLabelToPlay() {
  const btn = getMenuPlayToggle();
  if (!btn) return;
  btn.textContent = '▶ Play';        /* label: Play */
  btn.setAttribute('aria-pressed', 'false');
}

function setMenuLabelToPause() {
  const btn = getMenuPlayToggle();
  if (!btn) return;
  btn.textContent = '⏸ Pause';       /* label: Pause */
  btn.setAttribute('aria-pressed', 'true');
}

function updatePlayMenuLabel() {
  if (state.running) {
    setMenuLabelToPause();           /* running → show Pause */
  } else {
    setMenuLabelToPlay();            /* stopped/paused → show Play */
  }
}

function wireMenuPlayToggle() {
  const btn = getMenuPlayToggle();
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (state.running) {
      /* Pause the game */
      state.running = false;
      stopBeatSpawner();      // stop spawning notes when game is paused
      setOverlayLabel('Paused');      // show pause label
      showOverlay();                  // reuse existing overlay as pause screen
      updatePlayMenuLabel();          // swap to ▶ Play
    } else {
      /* Start/Resume the game */
      state.running = true;
      startBeatSpawner();     // resume the note spawner when game starts again
      setOverlayLabel('Play');        // restore default label
      hideOverlay();                  // hide CTA when playing
      updatePlayMenuLabel();          // swap to ⏸ Pause
      // TODO: startGame();           /* hook real loop here if needed */
    }
  });
}

/* =============================
   Navbar / Hamburger behavior
   ============================= */

/* ----------------------------------------
   syncCollapseOnBreakpoint (IIFE context below)
   - Ensures nav is closed and aria cleaned when
     entering/leaving burger band (≤980px)
   Usage: registered on load + matchMedia + orientationchange
---------------------------------------- */
(() => {
  const mq = window.matchMedia('(max-width: 980px)');  // burger band media query

  /* ---------------------------------------------------------
     syncCollapseOnBreakpoint
     - Resets collapse state and ARIA when breakpoint flips
     Usage: internal only
  --------------------------------------------------------- */
  function syncCollapseOnBreakpoint() {
    const collapseEl = document.getElementById('mainNav');         // collapse root
    const toggler    = document.querySelector('.navbar-toggler.hamburger'); // burger button
    if (!collapseEl) return;                                       // nothing to do

    collapseEl.classList.remove('show');                           // force closed
    collapseEl.style.height = '';                                  // clear inline height
    document.body.removeAttribute('data-nav-open');                // clear body flag

    if (toggler) toggler.setAttribute('aria-expanded', 'false');   // aria sync
  }

  window.addEventListener('load', syncCollapseOnBreakpoint);       // run on load
  mq.addEventListener('change', syncCollapseOnBreakpoint);         // on MQ change
  window.addEventListener('orientationchange', syncCollapseOnBreakpoint); // on rotate
})();

/* =============================
   MOVE CONTROLLER (directional dance)
   - Adds/removes CSS classes to play animations:
     .move-left / .move-right / .move-up / .move-down
   - Exposes one function per move for clarity:
     doLeftMove(), doRightMove(), doUpMove(), doDownMove()
   - Wires both on-screen buttons and keyboard arrows
============================= */

/* ----------------------------------------
   removeAllMoveClasses
   - Ensures we start clean before applying a new move
---------------------------------------- */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');  // remove left class if present
  dancer.classList.remove('move-right'); // remove right class if present
  dancer.classList.remove('move-up');    // remove up class if present
  dancer.classList.remove('move-down');  // remove down class if present
}

/* ----------------------------------------
   applyMove
   - Cancels any current move and applies the requested class
   - Automatically removes the class after the first animation end
   Usage: applyMove('move-left')
---------------------------------------- */
function applyMove(moveClass) {
  if (!state.running) return;                      // ignore moves when paused/stopped
  const dancer = document.getElementById('dancer'); // reference to the cat wrapper
  if (!dancer) return;                               // guard if missing

  removeAllMoveClasses(dancer);                      // clear previous move classes

  // Force a reflow so re-adding a class restarts the CSS animation cleanly
  // (reading offsetWidth is a common way to flush styles)
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;                                // trigger reflow

  dancer.classList.add(moveClass);                   // apply the requested move

  /* ------------------------------------------------------
     Cleanup after animation:
     - We listen on the wrapper and accept the FIRST event
       bubbling from any animated child (svg, #pose-down, etc.)
     - This works for LEFT/RIGHT/UP (anim on <svg>) and
       for DOWN (anim on #pose-down).
  ------------------------------------------------------ */
  const onEnd = () => {
    dancer.classList.remove(moveClass);              // cleanup move class
    dancer.removeEventListener('animationend', onEnd);// detach listener
    dancer.removeEventListener('animationcancel', onEnd);// safety: cancel also cleans
  };
  dancer.addEventListener('animationend', onEnd, { once: false });
  dancer.addEventListener('animationcancel', onEnd, { once: false });
}

/* ----------------------------------------
   doLeftMove
   - Triggers the LEFT animation (slide + tilt + hat tip)
---------------------------------------- */
function doLeftMove() {
  applyMove('move-left');                            // play left move
}

/* ----------------------------------------
   doRightMove
   - Triggers the RIGHT animation (slide + tilt + hat tip)
---------------------------------------- */
function doRightMove() {
  applyMove('move-right');                           // play right move
}

/* ----------------------------------------
   doUpMove
   - Triggers the UP animation (jump + arms up + micro shake)
---------------------------------------- */
function doUpMove() {
  applyMove('move-up');                              // play up move
}

/* ----------------------------------------
   doDownMove
   - Triggers the DOWN animation (switch to back pose + twerk)
---------------------------------------- */
function doDownMove() {
  applyMove('move-down');                            // play down move
}

/* ----------------------------------------
   wireMoveButtons
   - Hooks on-screen arrow buttons to the corresponding moves
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // read data-dir
      if (!state.running) return;                                            // ignore when paused/stopped
      if (dir === 'left')  { doLeftMove();  attemptHit('left');  }           // LEFT button
      if (dir === 'right') { doRightMove(); attemptHit('right'); }           // RIGHT button
      if (dir === 'up')    { doUpMove();    attemptHit('up');    }           // UP button
      if (dir === 'down')  { doDownMove();  attemptHit('down');  }           // DOWN button
    });
  });
}

/* ----------------------------------------
   wireMoveKeyboard
   - Hooks keyboard arrow keys to the corresponding moves
   - Ignores repeated keydown events to avoid spam
---------------------------------------- */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;                              // ignore held-down repeats

    const isArrow =
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown';

    if (isArrow) e.preventDefault();                   // avoid browser scroll
    if (!state.running) return;                        // ignore inputs when paused/stopped

    // Map Arrow keys to moves (WASD can be added later if needed)
    if (e.key === 'ArrowLeft')  { doLeftMove();  attemptHit('left');  return; }   // ← triggers left + judge
    if (e.key === 'ArrowRight') { doRightMove(); attemptHit('right'); return; }   // → triggers right + judge
    if (e.key === 'ArrowUp')    { doUpMove();    attemptHit('up');    return; }   // ↑ triggers up + judge
    if (e.key === 'ArrowDown')  { doDownMove();  attemptHit('down');  return; }   // ↓ triggers down + judge
  });
}

/* ----------------------------------------
   initMoveControls
   - Public setup to call once after DOM is ready
---------------------------------------- */
function initMoveControls() {
  wireMoveButtons();      // enable on-screen buttons
  wireMoveKeyboard();     // enable keyboard arrows
}

/* ----------------------------------------
   Judge line helpers (optional visual flash)
   - Call judgeFlash('good') or judgeFlash('miss') on scoring
---------------------------------------- */
function judgeFlash(type) {
  const el = document.querySelector('.judge-line');
  if (!el) return;
  el.classList.remove('flash-good', 'flash-miss');   // reset any previous flash
  if (type === 'good') el.classList.add('flash-good');
  if (type === 'miss') el.classList.add('flash-miss');
  // auto clean after animation end (no side effects)
  const onEnd = () => {
    el.classList.remove('flash-good', 'flash-miss');
    el.removeEventListener('animationend', onEnd);
  };
  el.addEventListener('animationend', onEnd);
}

/* =============================
   Rails + Notes (falling prompts)
   - Draws glowing orb notes in the right rail (Left/Up/Down/Right).
   - Notes fall from the top of the rail down to the anchor/judge line.
   - A test beat-spawner releases random notes in sync with BPM.
============================= */

/* ----------------------------------------
   getRailsMap
   - Collects references to each rail element.
   - Returns an object with { left, up, down, right }.
   Usage: const rails = getRailsMap();
---------------------------------------- */
function getRailsMap() {
  const root = document.querySelector('.rails');   // find the main rails container
  if (!root) return null;                          // guard: if rails missing, return null
  return {
    left:  root.querySelector('.rail-left'),       // left rail element
    up:    root.querySelector('.rail-up'),         // up rail element
    down:  root.querySelector('.rail-down'),       // down rail element
    right: root.querySelector('.rail-right'),      // right rail element
  };
}

/* ----------------------------------------
   getDropDistancePx
   - Calculates how many pixels a note should travel
     from the top of the rail down to the judge line anchor.
   Usage: const dist = getDropDistancePx(railEl);
---------------------------------------- */
function getDropDistancePx(railEl) {
  if (!railEl) return 0;                                    // guard: if no rail, return 0
  const stageTop = railEl.getBoundingClientRect().top;      // measure top position of rail
  const judge    = document.querySelector('.judge-line');   // reference to judge line
  if (!judge) return railEl.clientHeight - 16;              // fallback: almost full rail height
  const targetY  = judge.getBoundingClientRect().top + 
                   (judge.clientHeight / 2);                // Y coordinate of judge line center
  const dist     = Math.max(0, targetY - stageTop - 9);     // subtract half note size to align center
  return dist;                                              // return final pixel distance
}

/* ----------------------------------------
   spawnNote
   - Creates a glowing orb note in a given rail.
   - Also records the expected arrival time at the judge line.
   - Parameters:
     dir: 'left'|'up'|'down'|'right'
     travelBeats: beats until it reaches the judge line
     bpm: tempo in beats per minute
---------------------------------------- */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap();                              // fetch rails map
  if (!rails || !rails[dir]) return;                        // guard: lane missing

  const rail = rails[dir];                                  // chosen rail element

  const note = document.createElement('div');               // create orb element
  note.className = `note note--${dir}`;                     // set classes for color

  const dropPx = getDropDistancePx(rail);                   // pixels to travel
  note.style.setProperty('--drop-distance', `${dropPx}px`); // expose to CSS

  const seconds = Math.max(0.16, travelBeats * (60 / bpm)); // beats → seconds
  note.style.animationDuration = `${seconds}s`;             // control fall speed

  const now = performance.now();                            // current time
  const arrive = now + seconds * 1000;                      // time when it hits the line

  // pack metadata for judging
  const meta = { dir, arrive, el: note, hit: false };       // note info
  note.__meta = meta;                                       // attach for the end handler
  activeNotes[dir].push(meta);                              // queue for this lane

  // remove on animation end: if not hit → it's a miss
  note.addEventListener('animationend', () => {             // listen when fall finishes
    if (meta.hit) return;                                   // already consumed by a hit
    // Miss: the note passed the line without a valid hit
    judgeFlash('miss');                                     // flash miss
    setFeedback('MISS', '#fd0404');                         // red text
    hit();                                                  // apply damage step
    updateHUD();                                            // refresh HUD
    // remove from DOM if still there
    note.remove();                                          // cleanup element
    // compact this lane queue
    compactQueue(dir);                                      // prune queue
  }, { once: true });

  rail.appendChild(note);                                    // place orb inside the lane
}

/* =============================
   Judging (timing windows + feedback)
   - Tracks upcoming notes so we can grade user input against time.
   - Adds a spawn wrapper that registers ETA per note.
   - Exposes: spawnJudgedNote(dir, travelBeats?, bpm?), tryJudge(dir)
============================= */

/* ----------------------------------------
   Config for timing judgement
   - Keep bpm/travelBeats in sync with how notes are spawned.
---------------------------------------- */
const judge = {
  bpm: 120,                    // tempo used to compute ETAs (keep in sync with your spawner)
  travelBeats: 2.0,            // beats from spawn to the judge line (keep in sync with your spawner)
  windows: {                   // hit windows in milliseconds (centered around the ETA)
    perfect: 50,               // |Δt| ≤ 50ms  → Perfect
    great:   90,               // |Δt| ≤ 90ms  → Great
    good:   140                // |Δt| ≤ 140ms → Good
    // > 140ms in either direction → Miss
  }
};

/* ----------------------------------------
   Runtime queue of upcoming notes
   - Each entry = { dir: 'left'|'up'|'down'|'right', eta: Number, id: Number }
---------------------------------------- */
const activeNotes = [];               // holds all notes we can judge
let _noteIdSeq = 0;                   // simple id counter for debugging/inspection

/* ----------------------------------------
   nowMs
   - Returns high-resolution timestamp in ms.
---------------------------------------- */
function nowMs() {                    // function name describes intent
  return performance.now();           // monotonic clock for gameplay timing
}

/* ----------------------------------------
   setFeedback
   - Writes "Perfect/Great/Good/Miss" into the feedback box and flashes the judge line.
---------------------------------------- */
function setFeedback(label, flash) {
  const el = document.getElementById('feedback');          // grab feedback element
  if (!el) return;                                          // guard if missing
  el.textContent = label;                                   // show label
  if (flash === 'good')  judgeFlash('good');                // cyan/green flash path you already have
  if (flash === 'miss')  judgeFlash('miss');                // red flash path you already have
}

/* ----------------------------------------
   compactQueue
   - Drops any note whose ETA is way in the past (older than Good window).
---------------------------------------- */
function compactQueue(tNow) {
  const maxLag = judge.windows.good;                        // allowed lateness threshold
  for (let i = activeNotes.length - 1; i >= 0; i--) {       // iterate from tail so splice is cheap
    if (tNow - activeNotes[i].eta > maxLag) {               // if note is too old to hit
      activeNotes.splice(i, 1);                             // remove from queue
    }
  }
}

/* ----------------------------------------
   registerNote
   - Computes ETA for a note and pushes it to activeNotes.
   - travelBeats/bpm default to judge config so caller can omit.
---------------------------------------- */
function registerNote(dir, travelBeats = judge.travelBeats, bpm = judge.bpm) {
  const msPerBeat = 60000 / bpm;                            // convert beats → milliseconds
  const eta = nowMs() + (travelBeats * msPerBeat);          // when it should cross the judge line
  activeNotes.push({ dir, eta, id: ++_noteIdSeq });         // track for later judgement
}

/* ----------------------------------------
   gradeHit
   - Looks for the closest pending note in the requested direction.
   - If its |Δt| fits a window → consume it and return a grade label.
   - Otherwise returns 'Miss' without consuming anything.
---------------------------------------- */
function gradeHit(dir) {
  const tNow = nowMs();                                     // current timestamp
  compactQueue(tNow);                                       // purge stale notes first

  // Find the closest ETA in the same direction
  let bestIdx = -1;                                         // index of best candidate
  let bestAbsDt = Infinity;                                 // absolute difference in ms

  for (let i = 0; i < activeNotes.length; i++) {            // scan queue
    const n = activeNotes[i];                               // current note
    if (n.dir !== dir) continue;                            // must match direction
    const dt = n.eta - tNow;                                // signed delta time (ms)
    const adt = Math.abs(dt);                               // absolute |Δt|
    if (adt < bestAbsDt) {                                  // keep the closest
      bestAbsDt = adt;
      bestIdx = i;
    }
  }

  // No candidate in this direction → Miss
  if (bestIdx === -1) return { label: 'Miss', hit: false };

  // Decide window
  const w = judge.windows;                                  // shorthand
  let label = 'Miss';                                       // default outcome
  if (bestAbsDt <= w.perfect) label = 'Perfect';
  else if (bestAbsDt <= w.great) label = 'Great';
  else if (bestAbsDt <= w.good) label = 'Good';
  else label = 'Miss';

  if (label !== 'Miss') {                                   // successful timing
    activeNotes.splice(bestIdx, 1);                         // consume the note so it can’t be hit again
    return { label, hit: true };                            // return success
  }

  return { label: 'Miss', hit: false };                     // outside windows
}

/* ----------------------------------------
   tryJudge
   - Public entry for inputs.
   - Grades the hit for a given direction and triggers visual feedback.
---------------------------------------- */
function tryJudge(dir) {
  if (!state.running) return;                               // ignore if game is paused
  const res = gradeHit(dir);                                // compute timing grade
  setFeedback(res.label, res.hit ? 'good' : 'miss');        // write label + flash
}

/* ----------------------------------------
   spawnJudgedNote
   - Wrapper around your existing spawnNote().
   - Spawns the visual orb AND registers its ETA for judging.
   - Use this instead of spawnNote wherever you schedule notes (e.g., your test spawner).
---------------------------------------- */
function spawnJudgedNote(dir, travelBeats = judge.travelBeats, bpm = judge.bpm) {
  registerNote(dir, travelBeats, bpm);                      // record ETA for judgement
  spawnNote(dir, travelBeats, bpm);                         // keep your current visual spawn behavior
}



/* ----------------------------------------
   spawnNote
   - Creates a glowing orb note in a given rail.
   - Parameters:
     dir: 'left'|'up'|'down'|'right' → rail direction
     travelBeats: how many beats until the note reaches the anchor
     bpm: tempo in beats per minute
   Usage: spawnNote('left', 2, 120);
---------------------------------------- */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap();                              // get rails map
  if (!rails || !rails[dir]) return;                        // guard: skip if missing rail

  const rail = rails[dir];                                  // select the right rail

  const note = document.createElement('div');               // create a new div for the note
  note.className = `note note-${dir} note--${dir}`;         // add both class styles for safety (CSS uses note--dir)

  const dropPx = getDropDistancePx(rail);                   // calculate drop distance in pixels
  note.style.setProperty('--drop-distance', `${dropPx}px`); // set CSS variable for animation (if used by CSS)

  const seconds = Math.max(0.16, travelBeats * (60 / bpm)); // convert beats → seconds (min 0.16s)
  note.style.animationDuration = `${seconds}s`;             // apply animation speed (used if CSS keyframes present)

  note.dataset.state = 'alive';                             // mark the note as alive (not hit yet)

  note.addEventListener('animationend', () => {             // when animation finishes
    if (note.dataset.state === 'alive') {                   // if still alive, it was a Miss
      judgeFlash('miss');                                   // visual miss flash
      // Optional: apply damage/score penalty here
    }
    note.remove();                                          // remove note from DOM either way
  }, { once: true });

  rail.appendChild(note);                                   // insert note into the rail
}

/* ----------------------------------------
   startBeatSpawner
   - Starts a simple interval that spawns random notes
     on every beat or sub-beat, based on BPM settings.
   Usage: startBeatSpawner();
---------------------------------------- */
let _beatTimer = null;                                      // private reference to the interval
const rhythm = {
  bpm: 120,             // tempo (beats per minute)
  stepDiv: 1,           // tick frequency: 1 = each beat, 2 = 1/2 beat, 4 = 1/4 beat etc.
  travelBeats: 2.0,     // how many beats a note should take to travel to anchor
};

function startBeatSpawner() {
  if (_beatTimer) return;                                   // guard: already running

  const msPerBeat = 60000 / rhythm.bpm;                     // duration of one beat in ms
  const tickMs    = msPerBeat / rhythm.stepDiv;             // interval time per step

  _beatTimer = setInterval(() => {                          // create repeating interval
    if (!state.running) return;                             // spawn only if game is running

    const dirs = ['left', 'up', 'down', 'right'];           // possible directions
    const dir  = dirs[(Math.random() * dirs.length) | 0];   // pick random direction
    spawnNote(dir, rhythm.travelBeats, rhythm.bpm);         // spawn note in chosen rail
  }, Math.max(80, tickMs));                                 // run interval, min 80ms safe cap
}

/* ----------------------------------------
   stopBeatSpawner
   - Stops the interval that spawns notes.
   Usage: stopBeatSpawner();
---------------------------------------- */
function stopBeatSpawner() {
  if (_beatTimer) {                                         // if interval exists
    clearInterval(_beatTimer);                              // clear interval
    _beatTimer = null;                                      // reset reference
  }
}

/* ----------------------------------------
   clearAllNotes
   - Utility to remove all active notes from DOM.
   Usage: clearAllNotes();
---------------------------------------- */
function clearAllNotes() {
  document.querySelectorAll('.rail .note')                  // select all notes
    .forEach(n => n.remove());                              // remove each
}

/* ----------------------------------------
   getJudgeCenterY
   - Returns the vertical center (in px) of the judge line.
   Usage: const y = getJudgeCenterY();
---------------------------------------- */
function getJudgeCenterY() {
  const line = document.querySelector('.judge-line');     // find judge line element
  if (!line) return 0;                                    // guard if missing
  const r = line.getBoundingClientRect();                 // get DOMRect for judge
  return r.top + r.height / 2;                            // compute center Y
}

/* ----------------------------------------
   getNoteCenterY
   - Returns the vertical center (in px) of a note element.
   Usage: const y = getNoteCenterY(note);
---------------------------------------- */
function getNoteCenterY(note) {
  const r = note.getBoundingClientRect();                 // get DOMRect for note
  return r.top + r.height / 2;                            // compute center Y
}

/* ----------------------------------------
   findBestNoteInWindow
   - Returns the closest note (by |ΔY|) in the given dir
     if it is within the largest timing window; else null.
   Usage: const hit = findBestNoteInWindow('left');
---------------------------------------- */
function findBestNoteInWindow(dir) {
  const rails = getRailsMap();                                         // get rails
  if (!rails || !rails[dir]) return null;                              // guard
  const rail = rails[dir];                                             // pick rail

  const notes = Array.from(rail.querySelectorAll('.note'));            // gather notes in this rail
  if (!notes.length) return null;                                      // nothing to hit

  const judgeY = getJudgeCenterY();                                    // judge Y center
  // map to distances with element reference
  const scored = notes.map(n => ({ el: n, dy: Math.abs(getNoteCenterY(n) - judgeY) })); // calc |ΔY|
  // sort by closest to judge
  scored.sort((a, b) => a.dy - b.dy);                                  // nearest first

  // define windows (px): tweak as you like
  const WINDOW_PERFECT = 14;                                           // <= 14px → Perfect
  const WINDOW_GREAT   = 26;                                           // <= 26px → Great
  const WINDOW_GOOD    = 42;                                           // <= 42px → Good

  const best = scored[0];                                              // closest note
  if (!best) return null;                                              // safety

  // attach rank for later scoring feedback
  if (best.dy <= WINDOW_PERFECT) { best.rank = 'Perfect'; return best; }
  if (best.dy <= WINDOW_GREAT)   { best.rank = 'Great';   return best; }
  if (best.dy <= WINDOW_GOOD)    { best.rank = 'Good';    return best; }
  return null;                                                         // outside window → no hit
}

/* ----------------------------------------
   applyScoreForRank
   - Adds points based on rank and flashes judge line.
   Usage: applyScoreForRank('Great');
---------------------------------------- */
function applyScoreForRank(rank) {
  // basic scoring; adjust values as you like
  if (rank === 'Perfect') state.score += 100;          // add points
  else if (rank === 'Great') state.score += 70;        // add points
  else if (rank === 'Good') state.score += 50;         // add points
  updateHUD();                                         // refresh HUD

  // use the existing judge flash as positive feedback
  judgeFlash('good');                                  // flash green-ish
}

/* ----------------------------------------
   attemptHit
   - Tries to hit the nearest note in the given direction;
     if inside a judgment window → remove note immediately.
   - Returns the hit result {hit: boolean, rank?: 'Perfect'|'Great'|'Good'}
     or {hit:false} if nothing was hittable.
   Usage: attemptHit('left');
---------------------------------------- */
function attemptHit(dir) {
  if (!state.running) return { hit: false };                     // ignore while paused

  const best = findBestNoteInWindow(dir);                        // find closest note within windows
  if (!best) return { hit: false };                              // no note to hit

  best.el.dataset.state = 'hit';                                 // mark as hit to avoid miss logic on animationend
  best.el.remove();                                              // remove the note immediately
  applyScoreForRank(best.rank);                                  // apply points + feedback
  return { hit: true, rank: best.rank };                         // return info (could be used for combo UI)
}

/* =============================
   Rotate Overlay Controller 
   - Shows the rotate overlay by CSS when:
       (max-width: 980px) AND (orientation: landscape)
       OR (max-width: 980px) AND (max-height: 480px)
   - Close button hides overlay UNTIL we return to portrait.
   - ARIA kept in sync with visual state.
   Usage:
   - Requires CSS final override (placed last in CSS file):
     body[data-rotate-dismissed="true"] #rotateOverlay { display: none !important; }
============================= */
(() => {
  const body = document.body;                                              // <body> to store dismissal flag
  const rotateOverlay = document.getElementById('rotateOverlay');          // rotate blocker container
  const closeBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; // close button inside

  const mqLandscape = window.matchMedia('(orientation: landscape)');       // true if landscape
  const mqBurgerMax = window.matchMedia('(max-width: 980px)');             // true if ≤980px

  /* ---------------------------------------------------------
     updateRotateOverlayAria
     - Syncs aria-hidden to reflect whether overlay SHOULD show
     Usage: call on load / resize / MQ change
  --------------------------------------------------------- */
  function updateRotateOverlayAria() {
    const dismissed = body.getAttribute('data-rotate-dismissed') === 'true';     // has user dismissed?
    const visibleByCSS = mqLandscape.matches && mqBurgerMax.matches;             // CSS would show now?
    const shouldBeVisible = visibleByCSS && !dismissed;                          // final visibility

    if (rotateOverlay) {
      rotateOverlay.setAttribute('aria-hidden', shouldBeVisible ? 'false' : 'true'); // sync aria
    }
  }

  /* ---------------------------------------------------------
     dismissRotateUntilPortrait
     - Hides rotate overlay by setting a data-flag on <body>
     - Overlay stays hidden until we switch back to portrait
     Usage: bound to close button
  --------------------------------------------------------- */
  function dismissRotateUntilPortrait() {
    body.setAttribute('data-rotate-dismissed', 'true'); // mark dismissed
    updateRotateOverlayAria();                           // refresh aria
  }

  /* ---------------------------------------------------------
     resetDismissalIfPortrait
     - Clears dismissal flag after leaving landscape (portrait)
     - Allows overlay to appear again next time in landscape
     Usage: bound to orientation MQ change
  --------------------------------------------------------- */
  function resetDismissalIfPortrait() {
    if (!mqLandscape.matches) {
      body.removeAttribute('data-rotate-dismissed');     // clear flag on portrait
    }
    updateRotateOverlayAria();                           // refresh aria
  }

  // Wire events if overlay exists in DOM
  if (rotateOverlay && closeBtn) {
    closeBtn.addEventListener('click', (e) => {          // handle close click
      e.preventDefault();                                // prevent default
      dismissRotateUntilPortrait();                      // hide until portrait
    });

    mqLandscape.addEventListener('change', resetDismissalIfPortrait); // orientation changes
    mqBurgerMax.addEventListener('change', updateRotateOverlayAria);  // width changes
    window.addEventListener('resize', updateRotateOverlayAria);       // safety on resize

    updateRotateOverlayAria();                           // initial sync on load
  }
})();

/* =============================
   DOM Ready bootstrap
   - Initializes HUD, shows Play CTA, wires nav collapse flags,
   - and binds nav button close + play button handler.
============================= */
document.addEventListener('DOMContentLoaded', () => {
  init();                          // reset game + HUD
  setOverlayLabel('Play');         // ensure initial overlay label says "Play"
  updatePlayMenuLabel();           // set initial label based on state.running (false → ▶ Play)
  bindControls();                  // (placeholder) input setup
  showOverlay();                   // show Play CTA on first load
  wirePlayButton();                // hook play button
  initMoveControls();              // wire buttons + keyboard for moves
  wireMenuPlayToggle();            // enable navbar toggle click handler

  const navCollapse = document.getElementById('mainNav'); // Bootstrap collapse root
  if (navCollapse) {
    // When nav opens, mark <body> so CSS can morph burger into "X"
    navCollapse.addEventListener('shown.bs.collapse', () => {
      document.body.setAttribute('data-nav-open', '');    // set open flag
    });
    // When nav closes, remove the body flag
    navCollapse.addEventListener('hidden.bs.collapse', () => {
      document.body.removeAttribute('data-nav-open');     // clear flag
    });
  }

  // Close collapse when a nav button is clicked (mobile UX)
  document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const collapseEl = document.getElementById('mainNav');                 // collapse root
      if (collapseEl && collapseEl.classList.contains('show')) {             // only if open
        const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl); // get instance
        collapse.hide();                                                     // close
      }
    });
  });
});

/* ----------------------------------------
   DEV test hooks (Console helpers)
   - Expose move functions on window so you can call them in DevTools
   - Safe in production; only attaches references
---------------------------------------- */
(function exposeDevHooks() {
  // guard: make sure window exists (it does in browsers)
  if (typeof window === 'undefined') return;

  // map our internal functions to global names for quick testing
  window.doLeftMove  = doLeftMove;   // call in Console: doLeftMove()
  window.doRightMove = doRightMove;  // call in Console: doRightMove()
  window.doUpMove    = doUpMove;     // call in Console: doUpMove()
  window.doDownMove  = doDownMove;   // call in Console: doDownMove()

  // expose judge attempt for quick testing too (optional)
  window.attemptHit  = attemptHit;   // call: attemptHit('left')
})();