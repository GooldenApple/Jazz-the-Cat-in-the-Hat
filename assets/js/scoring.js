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
  score:   0,      // current score counter
  lives:   5,      // total lives (full hearts)
  level:   1,      // level placeholder (for future difficulty scaling)
  partial: 0       // damage steps on the active heart: 0..3 (four steps = -1 life)
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
  notify();               // push fresh snapshot to HUD via hook
}

/* --------------------------------------------------------
   Snapshot & hooks
   - getSnapshot(): returns a plain, read-only view for HUD.
   - setHooks(): register callbacks; currently only onUpdate.
   - notify(): calls onUpdate with the latest snapshot.
-------------------------------------------------------- */
function getSnapshot() {
  // Return only serializable values that HUD needs.
  return {
    score:   state.score,
    lives:   state.lives,
    level:   state.level,
    partial: state.partial
  };
}

let onUpdate = null; // holds the HUD update callback (if registered)

function notify() {
  // If a hook exists, send the current snapshot to HUD.
  if (typeof onUpdate === 'function') onUpdate(getSnapshot());
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

/* --------------------------------------------------------
   Lives management
   hit(): apply quarter-damage; every 4 steps consume 1 life.
   heal(): restore one full life and clear partial damage.
   Notes:
   - No negative clamp here; add game-over handling elsewhere if needed.
-------------------------------------------------------- */
function hit() {
  if (state.lives <= 0) return;     // ignore hits when no lives remain
  if (state.partial < 3) {          // build up partial damage (0→1→2→3)
    state.partial += 1;             // step partial by one
  } else {                          // on the 4th step...
    state.lives -= 1;               // consume one full life
    state.partial = 0;              // reset partial back to zero
  }
  notify();                         // reflect change in the HUD
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
    perfect: 50,      // |Δt| ≤ 50ms → Perfect
    great:   90,      // |Δt| ≤ 90ms → Great
    good:   140       // |Δt| ≤ 140ms → Good
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
   Notes:
   - On any input miss (wrong lane OR outside timing windows) we apply a heart penalty.
   - Natural misses (no input as the note falls) are visual-only elsewhere and do not penalize lives.
-------------------------------------------------------- */
function gradeHit(dir) {
  const t = nowMs();              // current time for window comparison
  let bestIdx = -1;               // index of best candidate in queue
  let bestAbs = Infinity;         // best |eta - now| so far

  // Scan the queue for the closest note in the same direction.
  for (let i = 0; i < activeNotes.length; i++) {
    const n = activeNotes[i];            // candidate
    if (n.dir !== dir) continue;         // skip other lanes
    const adt = Math.abs(n.eta - t);     // absolute delta to target time
    if (adt < bestAbs) {                 // keep the tightest window
      bestAbs = adt;                     // update best |Δt|
      bestIdx = i;                       // remember index
    }
  }

  // No candidate in lane → input MISS (apply penalty).
  if (bestIdx === -1) {
    setFeedback('MISS', 'miss');   // visual feedback
    hit();                         // apply heart penalty on input miss
    notify();                      // update HUD immediately
    return { hit: false, label: 'Miss' };
  }

  // Resolve grade label by window thresholds.
  const w = judgeConfig.windows;   // window boundaries
  let label = 'Miss';              // default to miss
  if (bestAbs <= w.perfect) label = 'Perfect';
  else if (bestAbs <= w.great) label = 'Great';
  else if (bestAbs <= w.good)  label = 'Good';

  // If within a valid window, score and clean up.
  if (label !== 'Miss') {
    const n = activeNotes[bestIdx];  // the judged note
    n.hit = true;                    // mark as hit for bookkeeping
    if (n.el) n.el.remove();         // remove DOM element if still present
    activeNotes.splice(bestIdx, 1);  // drop from queue

    // Score by quality.
    if (label === 'Perfect') state.score += 100;
    else if (label === 'Great') state.score += 70;
    else if (label === 'Good')  state.score += 50;

    notify();                        // update HUD with new score
    setFeedback(label, 'good');      // show positive feedback + flash
    return { hit: true, label };     // return graded result
  }

  // Outside windows → input MISS (apply penalty).
  setFeedback('MISS', 'miss'); // visual feedback
  hit();                       // apply heart penalty on early/late input
  notify();                    // update HUD immediately
  return { hit: false, label: 'Miss' };
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
