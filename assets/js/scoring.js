import { createHeart } from './ui.js';
import { setFeedback } from './ui.js';



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
/* 

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
  state.lives   = 5;      // default lives
  state.level   = 1;      // default level
  state.partial = 0;      // clear partial damage
  updateHUD();            // render HUD to match state
}

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
   Purpose: Check if a note in the lane is hittable and apply scoring.
   Usage: tryJudge('left'|'right'|'up'|'down')
---------------------------------------- */
function tryJudge(dir) {
  const lane = document.querySelector(`.lane.${dir}`);     // select lane element
  if (!lane) return;                                       // guard if missing

  const note = lane.querySelector('.note');                // first note in lane
  if (!note) {                                             // no note to hit
    setFeedback('MISS', 'miss');                           // feedback miss
    hit();                                                 // lose life
    return;
  }

  // TODO: Replace with proper timing window check vs. music
  const inWindow = true;                                   // temporary always true
  if (inWindow) {
    note.remove();                                         // remove note
    state.score += 100;                                    // add points
    setFeedback('Perfect!', 'good');                       // feedback perfect
  } else {
    setFeedback('MISS', 'miss');                           // feedback miss
    hit();                                                 // lose life
  }

  updateHUD();                                             // refresh HUD
}


/* ----------------------------------------
   judgeHit
   Purpose: Wrapper for note judging so input.js 
   does not call game.js directly.
   Usage: judgeHit('left'|'right'|'up'|'down')
---------------------------------------- */
function judgeHit(dir) {
  tryJudge(dir); // delegate to main game logic
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
   spawnJudgedNote
   Purpose: Register ETA + spawn DOM, and auto-MISS if animation finishes unhit.
   Usage: use this from your test spawner (and later from chart playback).
---------------------------------------- */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const meta = registerNote(dir, travelBeats, bpm);        // create meta with ETA
  const el = spawnNote(dir, travelBeats, bpm);             // create DOM note (from UI)
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
   clearAllNotes
   Purpose: Remove all visual notes and clear ETA queue.
---------------------------------------- */
function clearAllNotes() {
  document.querySelectorAll('.rail .note').forEach(n => n.remove()); // purge nodes
  activeNotes.length = 0;                                            // purge queue
}



/* ---------------------------
   Export all Scoring functions
---------------------------- */
export {
  // Core state
  state, init, hud,
  // Hearts
  renderLives,
  // HUD updates
  updateHUD,
  // Gameplay
  hit, heal, 
    // Judging / spawn
  tryJudge, spawnJudgedNote, judgeHit, tryJudge, clearAllNotes

};
