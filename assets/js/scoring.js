// scoring.js
import { setFeedback, spawnNote } from './ui.js';        // UI helpers for feedback and visuals
import { getBonusConfig } from './difficulty.js';        // thresholds for bonus per level

/**
 * Scoring & Judging — single source of truth for game state
 * Owns: score/lives/level, timing queue, grading, and HUD hooks
 * UI owns: visual note spawning & rail measurements (via ui.js)
 */

// ----- Global state (exported) -----
const state = {
  running: false,        // game is running or paused
  score: 0,              // current score
  best: 0,               // best score (persisted)
  lives: 5,              // full hearts
  level: 1,              // current level
  partial: 0,            // quarter damage steps (0..3)
  combo: 0,              // current combo
  maxCombo: 0,           // best combo in this run
  bonusActive: false,    // bonus mode flag
  bonusHits: 0,          // hits inside bonus (for 'hits' mode)
  bonusPoints: 0,        // bonus-only points inside bonus (for 'points' mode)
};

const comboGroups = new Map();                              // track simultaneous groups

/**
 * init()
 * Reset full state and notify HUD.
 */
function init() {
  state.running = false;            // ensure paused
  state.score   = 0;                // reset score
  state.lives   = 5;                // reset lives
  state.level   = 1;                // reset level
  state.partial = 0;                // clear partial
  state.combo   = 0;                // reset combo
  state.maxCombo= 0;                // reset max combo
  state.bonusActive = false;        // bonus off
  state.bonusHits   = 0;            // zero bonus hits
  state.bonusPoints = 0;            // zero bonus points
  comboGroups.clear();              // clear group map
  notify();                         // HUD update

  state.best = loadBestScore();     // load persisted best
  notify();                         // HUD update again
}

/**
 * getSnapshot()
 * Return view for HUD.
 */
function getSnapshot() {
  return {
    score: state.score,             // score value
    best: state.best,               // high score
    lives: state.lives,             // hearts
    level: state.level,             // level
    partial: state.partial,         // quarter steps
    combo: state.combo,             // combo
    bonusActive: state.bonusActive, // bonus flag
    bonusHits: state.bonusHits      // bonus hits (progress)
  };
}

let onUpdate = null;                // HUD callback holder

/**
 * notify()
 * Call onUpdate with latest snapshot (if provided).
 */
function notify() {
  if (typeof onUpdate === 'function') onUpdate(getSnapshot()); // push snapshot
}

/**
 * setHooks(hooks)
 * Provide HUD updater to scoring.
 */
function setHooks(hooks) {
  if (!hooks) return;                                   // guard
  if (typeof hooks.onUpdate === 'function') onUpdate = hooks.onUpdate; // store hook
}

// ---------------- Best score persistence ----------------
const BEST_SCORE_KEY = 'best';                           // storage key for BEST
const MAX_LIVES = 10;                                    // hard cap for lives

/**
 * loadBestScore()
 * Read best score from storage; 0 on error.
 */
 function loadBestScore() {
  try {
    const n = Number(localStorage.getItem(BEST_SCORE_KEY)); // read value
    if (!Number.isFinite(n)) return 0;                      // invalid → 0
    return Math.max(0, Math.floor(n));                      // clamp int ≥ 0
  } catch { return 0; }                                     // storage blocked
}

/**
 * saveBestScore(v)
 * Save best score to storage (safe).
 */
 function saveBestScore(v) {
  try {
    const n = Math.max(0, Math.floor(Number(v) || 0));      // sanitize
    localStorage.setItem(BEST_SCORE_KEY, String(n));         // persist
  } catch { /* ignore */ }
}

/**
 * setJudgeWindows(newWindows)
 * Allow difficulty to override hit windows.
 */
export function setJudgeWindows(newWindows) {
  if (!newWindows) return;                                  // guard
  if (newWindows.perfect != null) judgeConfig.windows.perfect = newWindows.perfect; // set perfect
  if (newWindows.great   != null) judgeConfig.windows.great   = newWindows.great;   // set great
  if (newWindows.good    != null) judgeConfig.windows.good    = newWindows.good;    // set good
}

/**
 * getMultiplierForCombo(comboLen)
 * Return small multiplier from combo length.
 */
function getMultiplierForCombo(comboLen) {
  if (comboLen >= 100) return 1.5;                          // big streak
  if (comboLen >= 50)  return 1.3;                          // large
  if (comboLen >= 25)  return 1.2;                          // medium
  if (comboLen >= 10)  return 1.1;                          // small
  return 1.0;                                               // base
}

/* ---------------------------------------------------------
   Bonus configuration helpers (fallbacks if config missing)
----------------------------------------------------------*/

/**
 * defaultHitsGoalForLevel()
 * Fallback hits needed for +1 life if cfg.hitsPerHeart missing.
 */
function defaultHitsGoalForLevel(level) {
  const L = Number(level) || 1;   // normalize
  if (L >= 10) return 70;
  if (L >= 7)  return 60;
  return 50;                      // L4–6 default
}

/**
 * defaultPointsGoalForLevel()
 * Fallback bonus-points needed for +1 life if cfg.pointsPerHeart missing.
 * Counts ONLY the flat +10 bonus per hit (not base points).
 */
function defaultPointsGoalForLevel(level) {
  const L = Number(level) || 1;   // normalize
  if (L >= 10) return 400;
  if (L >= 7)  return 300;
  return 200;                     // L4–6 default
}

const BONUS_POINT_PER_HIT = 10;   // flat points added per hit during bonus

/**
 * startBonus()
 * Enter bonus mode and notify UI to show the persistent banner + initial progress.
 */
function startBonus() {
  if (state.bonusActive) return;                                   // already active
  state.bonusActive = true;                                        // flag on
  state.bonusHits   = 0;                                           // reset
  state.bonusPoints = 0;                                           // reset
  notify();                                                        // HUD refresh

  window.dispatchEvent(new CustomEvent('bonus:started'));          // UI shows banner

  const cfg = getBonusConfig(state.level) || {};                   // level config
  const mode = (cfg.bonusAwardMode === 'points' || cfg.bonusAwardMode === 'hits')
    ? cfg.bonusAwardMode : 'hits';                                 // default to hits
  const goal = (mode === 'points')
    ? (Number(cfg.pointsPerHeart) > 0 ? Number(cfg.pointsPerHeart) : defaultPointsGoalForLevel(state.level))
    : (Number(cfg.hitsPerHeart)   > 0 ? Number(cfg.hitsPerHeart)   : defaultHitsGoalForLevel(state.level));

  window.dispatchEvent(new CustomEvent('bonus:progress', {         // initial progress
    detail: { mode, hits: 0, points: 0, goal }
  }));
}

/**
 * endBonus()
 * Exit bonus mode and notify UI to hide the banner.
 */
function endBonus() {
  if (!state.bonusActive) return;                                  // not active
  state.bonusActive = false;                                       // clear flag
  notify();                                                        // update HUD
  window.dispatchEvent(new CustomEvent('bonus:ended'));            // UI hides banner
}


/**
  * hit()
  * Purpose: Apply immediate quarter damage.
  * - L1: immune (no damage)
  * - On 4 quarters → lose 1 life and reset partial
  * - Fire game:livesDepleted when crossing to 0
  */
function hit() {
  if (state.level === 1) {           // training level → no damage
    notify();
    return;
  }
  if (state.lives <= 0) return;      // already zero

  const prevLives = state.lives;     // remember before change

  if (state.partial < 3) {
    state.partial += 1;              // +¼ heart
  } else {
    state.lives -= 1;                // −1 heart
    state.partial = 0;               // reset quarters
  }

  notify();

  if (prevLives > 0 && state.lives <= 0) {
    window.dispatchEvent(new CustomEvent('game:livesDepleted'));
  }
}


// Miss penalty helpers — tolerant miss → partial hit after N misses.
let _missSincePartial = 0;                            // accumulator

/**
 * missesPerPartialFor(level)
 * 3 misses/partial for levels ≤ 6, 5 misses/partial for levels ≥ 7.
 */
function missesPerPartialFor(level) {
  const L = Number(level) || 1;                     // normalize
  return (L >= 7) ? 5 : 3;                          // threshold by tier
}

/**
 * applyMissPenalty()
 * Increment tolerant miss counter; on threshold, convert to quarter damage.
 */
function applyMissPenalty() {
  if (state.lives <= 0) return;                     // ignore if dead
  _missSincePartial += 1;                            // count miss
  const need = missesPerPartialFor(state.level);     // threshold
  if (_missSincePartial >= need) {                   // reached threshold
    _missSincePartial = 0;                           // reset counter
    hit();                                           // apply quarter damage
  } else {
    notify();                                        // HUD refresh (progress)
  }
}

/**
 * heal()
 * Restore one full life up to MAX_LIVES.
 */
function heal() {
  const next = state.lives + 1;                      // compute proposed new lives
  state.lives = Math.min(MAX_LIVES, next);           // clamp to MAX_LIVES
  state.partial = 0;                                 // clear partial segments
  notify();                                          // refresh HUD
}

/**
 * Time-based judging (ETA queue)
 * We register each spawned note with an ETA (and gid).
 */
const judgeConfig = {
  bpm: 120,                                          // default bpm
  travelBeats: 2.0,                                  // default travel beats
  windows: {                                         // centered hit windows (ms)
    perfect: 85,                                     // perfect
    great:   140,                                    // great
    good:    200                                     // good
  }
};

const activeNotes = [];                               // { id, dir, eta, el, hit:false, gid }
let _noteId = 0;                                      // incremental id
function nowMs() { return performance.now(); }        // monotonic clock

/**
 * removeActiveById(id)
 * Remove a queued note by its id.
 */
function removeActiveById(id) {
  const idx = activeNotes.findIndex(n => n.id === id); // find index
  if (idx !== -1) activeNotes.splice(idx, 1);          // remove if found
}

/**
 * resetPerLevelForNextRun()
 * Clear per-level counters while keeping lives and BEST.
 */
function resetPerLevelForNextRun() {
  state.score = 0;                  // fresh score
  state.combo = 0;                  // drop combo
  state.maxCombo = 0;               // drop per-run max combo
  state.partial = 0;                // clean heart segment
  state.bonusActive = false;        // bonus off between levels
  state.bonusHits = 0;              // clear bonus progress
  state.bonusPoints = 0;            // clear bonus points
  _missSincePartial = 0;            // clear helper counter
  comboGroups.clear();              // clear group map
  notify();                         // HUD
}

/**
 * _findBestCandidateInLane(dir, t)
 * Pick nearest ETA in a lane at time t.
 */
function _findBestCandidateInLane(dir, t) {
  let bestIdx = -1; let bestAbs = Infinity;            // init
  for (let i = 0; i < activeNotes.length; i++) {       // loop notes
    const n = activeNotes[i];                           // note
    if (n.dir !== dir) continue;                        // lane mismatch
    const adt = Math.abs(n.eta - t);                    // |Δt|
    if (adt < bestAbs) { bestAbs = adt; bestIdx = i; }  // pick better
  }
  return { bestIdx, bestAbs };                          // result
}

/**
 * _labelFromDelta(absDelta, windows)
 * Classify by timing window.
 */
function _labelFromDelta(absDelta, windows) {
  if (absDelta <= windows.perfect) return 'Perfect';    // perfect
  if (absDelta <= windows.great)   return 'Great';      // great
  if (absDelta <= windows.good)    return 'Good';       // good
  return 'Miss';                                        // miss
}

/**
 * _applyMissRules()
 * Handle input/natural miss outside window:
 *  - Break combo
 *  - L1: no life loss
 *  - Bonus: end bonus, no life loss
 *  - Otherwise: tolerant damage via applyMissPenalty() (3 or 5 misses/partial)
 */
function _applyMissRules() {
  setFeedback('MISS', 'miss');                          // show miss

  if (state.bonusActive) {                              // during bonus
    endBonus();                                         // end bonus
    state.combo = 0;                                    // break combo
    notify();                                           // HUD
    return { hit:false, label:'Miss' };                 // no life loss here
  }

  if (state.level === 1) {                              // L1 immune
    state.combo = 0;                                    // break combo only
    notify();                                           // HUD
    return { hit:false, label:'Miss' };                 // done
  }

  state.combo = 0;                                      // break combo
  applyMissPenalty();                                   // tolerant damage (3/5 rule)
  return { hit:false, label:'Miss' };                   // result
}

/* ---------------------------------------------
   Small helpers for _handleSuccessfulHit()
---------------------------------------------- */

// Consume and remove the judged note
function _consumeNote(bestIdx) {
  const n = activeNotes[bestIdx];   // read note meta
  n.hit = true;                     // mark as hit
  if (n.el) n.el.remove();          // remove DOM if present
  activeNotes.splice(bestIdx, 1);   // drop from queue
}

// Compute base points and update combo/multiplier
function _applyBaseScoring(label) {
  const base = (label === 'Perfect') ? 30 : (label === 'Great') ? 20 : 10; // base by label
  const newCombo = state.combo + 1; // next combo
  const mult = getMultiplierForCombo(newCombo); // small multiplier
  state.combo = newCombo;           // save combo
  if (state.combo > state.maxCombo) state.maxCombo = state.combo; // track run max
  return Math.round(base * mult);   // final note points
}

// Handle bonus progress, awards, and feedback; returns extra points to add
function _handleBonusBlock(label, cfg) {
  let extra = 0; // extra points from bonus
  const awardMode = (cfg.bonusAwardMode === 'points' || cfg.bonusAwardMode === 'hits') ? cfg.bonusAwardMode : 'hits';

  // enter bonus if needed (safe default activateCombo = 10)
  const activateCombo = (Number.isFinite(cfg.activateCombo) && cfg.activateCombo > 0) ? cfg.activateCombo : 10;
  if (!state.bonusActive && state.combo >= activateCombo) startBonus();

  if (!state.bonusActive) {
    setFeedback(label, 'good');     // normal feedback
    return 0;                       // no extra points
  }

  // inside bonus: always grant flat +10 (user-visible)
  extra += BONUS_POINT_PER_HIT;     // add flat bonus
  if (awardMode === 'points') {
    state.bonusPoints = (state.bonusPoints || 0) + BONUS_POINT_PER_HIT; // progress by points
  } else {
    state.bonusHits   = (state.bonusHits   || 0) + 1;                    // progress by hits
  }

  const hitsGoal = Number(cfg.hitsPerHeart)   > 0 ? Number(cfg.hitsPerHeart)   : defaultHitsGoalForLevel(state.level);
  const ptsGoal  = Number(cfg.pointsPerHeart) > 0 ? Number(cfg.pointsPerHeart) : defaultPointsGoalForLevel(state.level);
  const goal     = (awardMode === 'points') ? ptsGoal : hitsGoal;

  // push progress for UI
  window.dispatchEvent(new CustomEvent('bonus:progress', {
    detail: { mode: awardMode, hits: state.bonusHits, points: state.bonusPoints, goal }
  }));

  // extra life only on L4+
  if (state.level >= 4) {
    const reached = (awardMode === 'points')
      ? (state.bonusPoints >= ptsGoal)
      : (state.bonusHits   >= hitsGoal);

    if (reached) {
      state.bonusHits = 0;          // reset progress counters
      state.bonusPoints = 0;        // reset progress counters
      heal();                       // award life
      window.dispatchEvent(new CustomEvent('bonus:lifeAwarded')); // optional UI hook
      setFeedback('EXTRA LIFE +❤', 'good'); // feedback on award

      // reset progress UI explicitly
      window.dispatchEvent(new CustomEvent('bonus:progress', {
        detail: { mode: awardMode, hits: 0, points: 0, goal }
      }));
      return extra;                 // still count the +10 for this hit
    }
  }

  // rolling feedback while in bonus
  setFeedback(`${label} +${BONUS_POINT_PER_HIT}`, 'good');
  return extra;
}

/**
 * _handleSuccessfulHit(bestIdx, label)
 * Apply scoring/combo/bonus logic for a successful hit and update HUD/feedback.
 */
function _handleSuccessfulHit(bestIdx, label) {
  _consumeNote(bestIdx);                            // remove the judged orb
  let add = _applyBaseScoring(label);              // base points + combo update
  const cfg = getBonusConfig(state.level) || {};   // level thresholds (safe)

  add += _handleBonusBlock(label, cfg);            // bonus progress/award block

  // score + BEST
  state.score += add;                               // apply points
  if (state.score > (state.best || 0)) {            // new best?
    state.best = state.score;                       // update BEST
    saveBestScore(state.best);                      // persist BEST
  }

  notify();                                         // refresh HUD
  return { hit: true, label };                      // result for caller
}

/**
 * gradeHit(dir)
 * Judge input vs. closest note; split into small helpers.
 */
function gradeHit(dir) {
  const t = nowMs();                                        // now
  const { bestIdx, bestAbs } = _findBestCandidateInLane(dir, t); // find candidate

  if (bestIdx === -1) return _applyMissRules();             // no candidate → miss
  const label = _labelFromDelta(bestAbs, judgeConfig.windows); // classify
  if (label === 'Miss') return _applyMissRules();           // outside window

  return _handleSuccessfulHit(bestIdx, label);              // score
}

/**
 * registerNote(dir, travelBeats?, bpm?, gid?)
 * Compute ETA from now, push note meta into queue, and record group size.
 */
function registerNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm, gid = 0) {
  const msPerBeat = 60000 / bpm;                            // ms per beat
  const eta = nowMs() + (travelBeats * msPerBeat);          // crossing time
  const meta = { id: ++_noteId, dir, eta, el: null, hit:false, gid }; // meta (with gid)
  activeNotes.push(meta);                                   // enqueue

  if (gid) {                                                // track group expectation
    const g = comboGroups.get(gid) || { expected:0, hits:0, failed:false }; // ensure
    g.expected += 1;                                        // one more member
    comboGroups.set(gid, g);                                // store back
  }

  return meta;                                              // return
}

/**
 * spawnJudgedNote(dir, travelBeats?, bpm?, gid?)
 * Purpose: Register ETA, spawn a visual orb, and on natural miss (no input)
 *          delegate to _applyMissRules() so misses are handled uniformly.
 * Notes:   Keeps chord bookkeeping via gid to prevent group awards after a miss.
 */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm, gid = 0) {
  const meta = registerNote(dir, travelBeats, bpm, gid);   // push meta with computed ETA (+optional gid)
  const el = spawnNote(dir, travelBeats, bpm);             // create orb in DOM
  if (!el) return;                                         // guard if spawn failed

  meta.el = el;                                            // link DOM element to meta
  el.__noteId = meta.id;                                   // debug hook for inspectors

  /* Natural miss handler — unify with input miss rules */
  el.addEventListener('animationend', () => {              // when orb reaches judge line (no hit)
    const still = activeNotes.find(n => n.id === meta.id); // ensure the note is still pending
    if (!still) return;                                    // was already judged as hit elsewhere

    removeActiveById(meta.id);                             // remove from active queue
    el.remove();                                           // prune DOM element

    // Mark this time cluster as failed so chord bonuses cannot trigger later
    if (meta.gid) {
      const g = comboGroups.get(meta.gid) || { expected: 1, hits: 0, failed: false }; // ensure record
      g.failed = true;                                     // flag cluster as failed
      comboGroups.set(meta.gid, g);                        // persist update
    }

    _applyMissRules();                                     // unified path: combo break, L1 immunity,
                                                           // end bonus w/o life loss, tolerant 3/5→¼→life
  }, { once: true });                                      // run exactly once
}

/**
 * clearAllNotes()
 * Remove all notes from DOM and clear the ETA queue and group map.
 */
function clearAllNotes() {
  document.querySelectorAll('.rail .note')                  // select notes
    .forEach(n => n.remove());                              // remove DOM
  activeNotes.length = 0;                                   // clear queue
  comboGroups.clear();                                      // clear groups
}

// Auto-end bonus when a song ends, but **not** on pause/stop
window.addEventListener('song:ended', (e) => {
  const reason = e?.detail?.reason || 'completed';          // reason
  if (reason === 'paused' || reason === 'stopped') {        // pause path
    return;                                                 // keep bonus state on pause/stop
  }
  if (state.bonusActive) endBonus();                        // turn off on complete/failed
  state.bonusHits   = 0;                                    // clear counters
  state.bonusPoints = 0;                                    // clear points
  comboGroups.clear();                                      // clear groups
});

// Exports
export {
  // core state + init
  state, init,
  // lives API
  hit, heal,
  // judging/spawn
  spawnJudgedNote, clearAllNotes, gradeHit,
  // HUD hooks
  getSnapshot, setHooks,
  resetPerLevelForNextRun,
};
