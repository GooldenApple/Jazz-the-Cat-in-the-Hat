//scoring.js
import { setFeedback, spawnNote } from './ui.js';

/* =========================================================
   Scoring & Judging — single source of truth for game state
   Owns: score/lives/level, timing queue, grading, and HUD hooks
   UI owns: visual note spawning & rail measurements (via ui.js)

   Notes to self:
   - Keep this module logic-only for visuals that belong to UI.
   - Do not mutate DOM except removing note elements on hit/miss.
========================================================= */

// ----- Global state (exported) -----
const state = {
  running: false,  // flag: the game is currently running or paused
  score:    0,      // current score counter
  best:     0,     // personal best (overwritten on init)
  lives:    5,      // total lives (full hearts)
  level:    1,      // level placeholder (for future difficulty scaling)
  partial:  0,       // damage steps on the active heart: 0..3 (four steps = -1 life)
  combo:    0,       // current combo length
  maxCombo: 0        // best combo this run
};

/* --------------------------------------------------------
   init()
   Purpose: Reset state to defaults and notify HUD once.
   Usage:
     init(); // typically on DOMContentLoaded
-------------------------------------------------------- */
function init() {
  state.running = false;  // ensure not running on fresh init
  state.score   = 0;      // reset score to zero
  state.lives   = 5;      // default lives count
  state.level   = 1;      // default level value
  state.partial = 0;      // no partial damage on start
  state.combo   = 0;      // Reset combo count
  state.maxCombo= 0;      // Reset maximum combo achieved this run
  notify();               // push fresh snapshot to HUD via hook

  state.best = loadBestScore();   // Load persisted best score
  notify();                  // Push a fresh snapshot to the HUD via update hook
}

/* --------------------------------------------------------
   Snapshot & hooks
   - getSnapshot(): returns a plain, read-only view for HUD.
   - setHooks(): register callbacks; currently only onUpdate.
   - notify(): calls onUpdate with the latest snapshot.
-------------------------------------------------------- */
function getSnapshot() {           // Build a read-only view for the HUD layer
  return {                         // Return a plain object
    score:   state.score,          // Current score value
    best:    state.best,           // Persisted best (high) score
    lives:   state.lives,          // Remaining full hearts
    level:   state.level,           // Current level (for future difficulty scaling)
    partial: state.partial,         // Quarter-damage steps on the active heart (0..3)
    combo:   state.combo           // Current combo count
  };
}

let onUpdate = null; // holds the HUD update callback (if registered)

function notify() {
  if (typeof onUpdate === 'function') onUpdate(getSnapshot());  // If a hook exists, send the current snapshot to HUD.
}

/* --------------------------------------------------------
   setHooks
   Purpose: Provide callbacks (e.g., HUD updater) to scoring.
-------------------------------------------------------- */
function setHooks(hooks) {
  if (!hooks) return;                         // guard: nothing provided
  if (typeof hooks.onUpdate === 'function') { // only accept valid function
    onUpdate = hooks.onUpdate;                // store the HUD updater
  }
}

// Best score persistence 
const BEST_SCORE_KEY = 'bestScore';

/** Load best score from storage; returns 0 if missing/invalid/unavailable */
export function loadBestScore() {
  try {
    const n = Number(localStorage.getItem(BEST_SCORE_KEY)); // parse to number
    if (!Number.isFinite(n)) return 0;                      // invalid → 0
    return Math.max(0, Math.floor(n));                      // clamp to 0+ int
  } catch {
    return 0;                                               // storage blocked → 0
  }
}

/** Save best score; coerces to non-negative integer and ignores storage errors */
export function saveBestScore(v) {
  try {
    const n = Math.max(0, Math.floor(Number(v) || 0));      // sanitize input
    localStorage.setItem(BEST_SCORE_KEY, String(n));         // store as string
  } catch {
    /* non-fatal: ignore */
  }
}

export function setJudgeWindows(newWindows) {
  if (!newWindows) return;
  if (newWindows.perfect != null) judgeConfig.windows.perfect = newWindows.perfect;
  if (newWindows.great   != null) judgeConfig.windows.great   = newWindows.great;
  if (newWindows.good    != null) judgeConfig.windows.good    = newWindows.good;
}

/* --------------------------------------------------------
   Combo multiplier
   Returns a score multiplier based on the (new) combo length.
   Tiers example: 0→1.0, ≥10→1.1, ≥25→1.2, ≥50→1.3, ≥100→1.5
-------------------------------------------------------- */
function getMultiplierForCombo(comboLen) {               // Compute multiplier from combo length
  if (comboLen >= 100) return 1.5;                       // Very high combo ⇒ biggest boost
  if (comboLen >= 50)  return 1.3;                       // 50+ combo  ⇒ large boost
  if (comboLen >= 25)  return 1.2;                       // 25+ combo  ⇒ medium boost
  if (comboLen >= 10)  return 1.1;                       // 10+ combo  ⇒ small boost
  return 1.0;                                            // Otherwise  ⇒ no boost
}

/**hit(): apply quarter-damage; every 4 steps consume 1 life.
* Sends a custom event when lives drop to 0.
*/
function hit() {
  const prevLives = state.lives;                 // remember previous lives

  if (state.lives <= 0) return;                  // ignore if already dead

  if (state.partial < 3) {                       // build up partial damage 0→1→2→3
    state.partial += 1;                          // add a quarter-heart hit
  } else {                                       // on the 4th step…
    state.lives -= 1;                            // consume one full life
    state.partial = 0;                           // reset partial damage
  }

  notify();                                      // update HUD

  // If we just crossed from >0 lives to 0 lives → announce depletion
  if (prevLives > 0 && state.lives <= 0) {
    window.dispatchEvent(new CustomEvent('game:livesDepleted')); // let the app react
  }
}


function heal() {
  state.lives += 1;   // add a full life
  state.partial = 0;  // clear any partial damage on the active heart
  notify();           // update HUD with the new lives state
}

/* =========================================================
   Time-based judging (ETA queue)
   - We register each spawned note with an ETA (when it crosses judge line).
   - On input, we pick the nearest ETA in the same lane and grade by |Δt|.
========================================================= */
const judgeConfig = {
  bpm: 120,           // tempo in beats per minute (controls ETA spacing)
  travelBeats: 2.0,   // how many beats a note travels from spawn to judge line
  windows: {          // centered hit windows (in milliseconds)
    perfect: 85,      // |Δt| ≤ 50ms → Perfect
    great:   140,      // |Δt| ≤ 90ms → Great
    good:   200       // |Δt| ≤ 140ms → Good
  }
};

// Runtime queue of active notes waiting to be judged.
const activeNotes = []; // each: { id, dir, eta, el, hit:false }
let _noteId = 0;        // simple counter for debugging and tracking

// Small helpers
function nowMs() { return performance.now(); } // monotonic timestamp for comparisons

function removeActiveById(id) {
  const idx = activeNotes.findIndex(n => n.id === id); // locate note by id
  if (idx !== -1) activeNotes.splice(idx, 1);          // remove from queue if found
}



/* --------------------------------------------------------
   gradeHit(dir)
   Purpose: On input, pick closest ETA in the same lane and grade by |eta - now|.
   Returns:
     { hit:true,  label:'Perfect'|'Great'|'Good' }
     { hit:false, label:'Miss' }
   Rules:
   - Input miss (wrong lane or outside timing window): heart penalty + break combo.
   - Natural miss (no input) handled elsewhere; no penalty, no combo break.
-------------------------------------------------------- */
function gradeHit(dir) {                                  // Evaluate a player's input for a given lane
  const t = nowMs();                                      // Current monotonic time (ms)
  let bestIdx = -1;                                       // Index of the closest candidate note
  let bestAbs = Infinity;                                 // Smallest |eta - now| seen so far

  // Scan the active queue for the closest note in the same direction
  for (let i = 0; i < activeNotes.length; i++) {          // Iterate over registered notes
    const n = activeNotes[i];                             // Candidate metadata
    if (n.dir !== dir) continue;                          // Skip notes from other lanes
    const adt = Math.abs(n.eta - t);                      // Absolute delta from target time
    if (adt < bestAbs) {                                  // If this candidate is closer...
      bestAbs = adt;                                      // ...remember its |Δt|
      bestIdx = i;                                        // ...and its index
    }
  }

  // No candidate in this lane → input MISS (penalty + break combo)
  if (bestIdx === -1) {                                   // If no note matches the input lane
    setFeedback('MISS', 'miss');                          // Show MISS feedback with miss flash
    state.combo = 0;                                      // Break the combo on input-miss
    hit();                                                // Apply quarter-heart penalty (hit() calls notify())
    return { hit:false, label:'Miss' };                   // Return miss result
  }

  // Resolve grade by timing windows
  const w = judgeConfig.windows;                          // Timing windows (ms) for grading
  let label = 'Miss';                                     // Default outcome is miss
  if (bestAbs <= w.perfect) label = 'Perfect';            // Inside Perfect window
  else if (bestAbs <= w.great) label = 'Great';           // Inside Great window
  else if (bestAbs <= w.good)  label = 'Good';            // Inside Good window

  // Successful hit inside a timing window
  if (label !== 'Miss') {                                 // If the input qualifies as a hit
    const n = activeNotes[bestIdx];                       // Retrieve the matched note meta
    n.hit = true;                                         // Mark as consumed by input
    if (n.el) n.el.remove();                              // Remove visual orb if still in DOM
    activeNotes.splice(bestIdx, 1);                       // Remove from judging queue

    // Base points by grade
    const base =                                          // Decide base points by quality
      label === 'Perfect' ? 100 :                         // Perfect ⇒ 100 pts
      label === 'Great'   ?  70 :                         // Great   ⇒  70 pts
                            50;                           // Good    ⇒  50 pts

    const newCombo = state.combo + 1;                     // Increase combo AFTER a successful hit
    const mult     = getMultiplierForCombo(newCombo);     // Compute multiplier for the new combo
    state.combo    = newCombo;                            // Commit updated combo
    if (state.combo > state.maxCombo)                     // Track the best combo this run
      state.maxCombo = state.combo;

    state.score += Math.round(base * mult);               // Add points with multiplier (rounded)

    if (state.score > (state.best || 0)) {                // If new score beats stored best...
      state.best = state.score;                           // ...update best in memory
      saveBestScore(state.best);                          // ...persist to localStorage
    }

    notify();                                             // Push updated HUD snapshot
    setFeedback(label, 'good');                           // Show positive feedback + good flash
    return { hit:true, label };                           // Return successful result
  }

  // Outside timing window → input MISS (penalty + break combo)
  setFeedback('MISS', 'miss');                            // Show MISS feedback
  state.combo = 0;                                        // Break combo for early/late input
  hit();                                                  // Apply quarter-heart penalty (hit() calls notify())
  return { hit:false, label:'Miss' };                     // Return miss result
}

/* --------------------------------------------------------
   registerNote(dir, travelBeats?, bpm?)
   Purpose: Compute ETA from now and push note meta into the queue.
   Usage:
     const meta = registerNote('left', 2, 120);
-------------------------------------------------------- */
function registerNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const msPerBeat = 60000 / bpm;                 // length of one beat in ms
  const eta = nowMs() + (travelBeats * msPerBeat);// target crossing time
  const meta = {
    id: ++_noteId,    // unique incremental id
    dir,              // lane: 'left' | 'up' | 'down' | 'right'
    eta,              // expected crossing timestamp
    el: null,         // will link to the DOM element after spawn
    hit: false        // flag: becomes true on successful judge
  };
  activeNotes.push(meta);                         // stage into queue
  return meta;                                    // return for linking
}

/* --------------------------------------------------------
   spawnJudgedNote
   Purpose: Register ETA + spawn a visual note and auto-MISS on fall end.
   Usage:
     spawnJudgedNote('up');            // default beats/bpm
     spawnJudgedNote('left', 1.5, 96); // custom travel/bpm
-------------------------------------------------------- */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const meta = registerNote(dir, travelBeats, bpm); // create meta with ETA
  const el = spawnNote(dir, travelBeats, bpm);      // ask UI to create the orb
  if (!el) return;                                  // guard if UI couldn't spawn

  meta.el = el;             // link DOM element to meta entry
  el.__noteId = meta.id;    // debug hook: useful in devtools

  // When animation reaches the bottom and the note wasn't hit,  count as MISS without penalty.
  el.addEventListener('animationend', () => {
    const still = activeNotes.find(n => n.id === meta.id); // still in queue?
    if (!still) return;             // note already judged as hit; do nothing


    // No heart penalty on natural miss by design
    removeActiveById(meta.id);      // purge from queue
    el.remove();                    // clean DOM element
  }, { once: true });               // run once per spawned element
}

/* --------------------------------------------------------
   clearAllNotes()
   Purpose: Remove all notes from DOM and clear the ETA queue.
   Usage:
     clearAllNotes(); 
-------------------------------------------------------- */
function clearAllNotes() {
  document.querySelectorAll('.rail .note') // query every note element
    .forEach(n => n.remove());             // remove them from DOM
  activeNotes.length = 0;                  // empty the runtime queue
}

 // Exports 

export {
  // Core state
  state, init,

  // Lives API
  hit, heal,

  // Judging / spawn
  spawnJudgedNote, clearAllNotes, gradeHit,

  // HUD hooks
  getSnapshot, setHooks,
};
