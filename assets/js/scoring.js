// scoring.js
import { setFeedback, spawnNote } from './ui.js';        // UI helpers for feedback and visuals
import { getBonusConfig } from './difficulty.js';        // thresholds for bonus per level

// Scoring & judging – single source of truth for game state
// Owns: score/lives/level, combo, bonus mode and hit/miss handling

// ----- Global state -----
const START_LIVES = 5;                  // starting lives
const BEST_SCORE_KEY = 'best';          // storage key for BEST
const MAX_LIVES = 10;                   // hard cap for lives

const state = {
  running: false,
  score: 0,
  best: 0,
  lives: START_LIVES,
  level: 1,
  partial: 0,            // quarter damage steps (0..3)
  combo: 0,
  maxCombo: 0,
  bonusActive: false,
  bonusHits: 0,
  bonusPoints: 0,
};

const comboGroups = new Map();          // track simultaneous groups for chords

// Reset full scoring state and refresh HUD.
function init() {
  state.running = false;
  state.score   = 0;
  state.lives   = START_LIVES;
  state.level   = 1;
  state.partial = 0;
  state.combo   = 0;
  state.maxCombo= 0;
  state.bonusActive = false;
  state.bonusHits   = 0;
  state.bonusPoints = 0;
  comboGroups.clear();
  notify();

  state.best = loadBestScore();         // load persisted best separately
  notify();
}

// Snapshot for HUD – keeps UI decoupled from internal state shape.
function getSnapshot() {
  return {
    score: state.score,
    best: state.best,
    lives: state.lives,
    level: state.level,
    partial: state.partial,
    combo: state.combo,
    bonusActive: state.bonusActive,
    bonusHits: state.bonusHits,
  };
}

let onUpdate = null;                    // HUD callback holder

// Call HUD hook with the latest snapshot (if present).
function notify() {
  if (typeof onUpdate === 'function') onUpdate(getSnapshot());
}

// Register HUD update hook.
function setHooks(hooks) {
  if (!hooks) return;
  if (typeof hooks.onUpdate === 'function') onUpdate = hooks.onUpdate;
}

// Load best score from storage; fall back to 0 on error.
function loadBestScore() {
  try {
    const n = Number(localStorage.getItem(BEST_SCORE_KEY));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return 0;
  }
}

// Save best score safely to storage.
function saveBestScore(v) {
  try {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    localStorage.setItem(BEST_SCORE_KEY, String(n));
  } catch {
    // ignore storage failures
  }
}

// Allow difficulty to override hit windows.
function setJudgeWindows(newWindows) {
  if (!newWindows) return;
  if (newWindows.perfect != null) judgeConfig.windows.perfect = newWindows.perfect;
  if (newWindows.great   != null) judgeConfig.windows.great   = newWindows.great;
  if (newWindows.good    != null) judgeConfig.windows.good    = newWindows.good;
}

// Small combo-based multiplier curve.
function getMultiplierForCombo(comboLen) {
  if (comboLen >= 100) return 1.5;
  if (comboLen >= 50)  return 1.3;
  if (comboLen >= 25)  return 1.2;
  if (comboLen >= 10)  return 1.1;
  return 1.0;
}

/* ---------------------------------------------------------
   Bonus configuration helpers (fallbacks if config missing)
----------------------------------------------------------*/

// Fallback hits needed for +1 life when cfg.hitsPerHeart is missing.
function defaultHitsGoalForLevel(level) {
  const L = Number(level) || 1;
  if (L >= 10) return 70;
  if (L >= 7)  return 60;
  return 50;                      // L4–6 default
}

// Fallback bonus-points needed for +1 life when cfg.pointsPerHeart is missing.
function defaultPointsGoalForLevel(level) {
  const L = Number(level) || 1;
  if (L >= 10) return 400;
  if (L >= 7)  return 300;
  return 200;                     // L4–6 default
}

const BONUS_POINT_PER_HIT = 10;   // flat bonus points while in bonus mode

/**
 * Enter bonus mode, reset counters and broadcast initial progress.
 * Uses level config when available, and falls back to defaults.
 */
function startBonus() {
  if (state.bonusActive) return;

  state.bonusActive = true;
  state.bonusHits   = 0;
  state.bonusPoints = 0;
  notify();

  window.dispatchEvent(new CustomEvent('bonus:started'));

  const cfg = getBonusConfig(state.level) || {};
  const mode = (cfg.bonusAwardMode === 'points' || cfg.bonusAwardMode === 'hits')
    ? cfg.bonusAwardMode
    : 'hits';

  const goal = (mode === 'points')
    ? (Number(cfg.pointsPerHeart) > 0 ? Number(cfg.pointsPerHeart) : defaultPointsGoalForLevel(state.level))
    : (Number(cfg.hitsPerHeart)   > 0 ? Number(cfg.hitsPerHeart)   : defaultHitsGoalForLevel(state.level));

  window.dispatchEvent(new CustomEvent('bonus:progress', {
    detail: { mode, hits: 0, points: 0, goal }
  }));
}

// Exit bonus mode and let UI hide the banner.
function endBonus() {
  if (!state.bonusActive) return;
  state.bonusActive = false;
  notify();
  window.dispatchEvent(new CustomEvent('bonus:ended'));
}

/**
 * Apply immediate quarter-damage:
 * - Level 1 is training-only (no damage).
 * - Every 4 quarters becomes 1 lost life.
 * - Emits game:livesDepleted on the transition to 0.
 */
function hit() {
  if (state.level === 1) {
    notify();
    return;
  }
  if (state.lives <= 0) return;

  const prevLives = state.lives;

  if (state.partial < 3) {
    state.partial += 1;
  } else {
    state.lives -= 1;
    state.partial = 0;
  }

  notify();

  if (prevLives > 0 && state.lives <= 0) {
    window.dispatchEvent(new CustomEvent('game:livesDepleted'));
  }
}

// Miss penalty helpers – converts tolerant misses into quarter damage over time.
let _missSincePartial = 0;

// 3 misses/partial for ≤ L6, 5 misses/partial for ≥ L7.
function missesPerPartialFor(level) {
  const L = Number(level) || 1;
  return (L >= 7) ? 5 : 3;
}

// Increment tolerant miss counter; convert to quarter damage on threshold.
function applyMissPenalty() {
  if (state.lives <= 0) return;
  _missSincePartial += 1;
  const need = missesPerPartialFor(state.level);
  if (_missSincePartial >= need) {
    _missSincePartial = 0;
    hit();
  } else {
    notify();
  }
}

// Restore one full life (up to MAX_LIVES) and reset partial segments.
function heal() {
  const next = state.lives + 1;
  state.lives = Math.min(MAX_LIVES, next);
  state.partial = 0;
  notify();
}

/**
 * Time-based judging configuration.
 * Notes are queued with ETA in ms, and judged against windows.
 */
const judgeConfig = {
  bpm: 120,
  travelBeats: 2.0,
  windows: {
    perfect: 85,
    great:   140,
    good:    200
  }
};

const activeNotes = [];                               // { id, dir, eta, el, hit:false, gid }
let _noteId = 0;

function nowMs() { return performance.now(); }        // monotonic clock wrapper

// Remove a queued note by id.
function removeActiveById(id) {
  const idx = activeNotes.findIndex(n => n.id === id);
  if (idx !== -1) activeNotes.splice(idx, 1);
}

/**
 * Clear per-level counters for the next run.
 * Only refills hearts if the last run ended at 0 (Game Over).
 */
function resetPerLevelForNextRun() {
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;

  if (state.lives <= 0) {
    state.lives = START_LIVES;       // refill ONLY after Game Over
  }

  state.partial = 0;
  state.bonusActive = false;
  state.bonusHits = 0;
  state.bonusPoints = 0;
  _missSincePartial = 0;
  comboGroups.clear();
  notify();
}

// Find nearest candidate note in a lane at time t.
function _findBestCandidateInLane(dir, t) {
  let bestIdx = -1;
  let bestAbs = Infinity;
  for (let i = 0; i < activeNotes.length; i++) {
    const n = activeNotes[i];
    if (n.dir !== dir) continue;
    const adt = Math.abs(n.eta - t);
    if (adt < bestAbs) {
      bestAbs = adt;
      bestIdx = i;
    }
  }
  return { bestIdx, bestAbs };
}

// Classify input timing as Perfect/Great/Good/Miss.
function _labelFromDelta(absDelta, windows) {
  if (absDelta <= windows.perfect) return 'Perfect';
  if (absDelta <= windows.great)   return 'Great';
  if (absDelta <= windows.good)    return 'Good';
  return 'Miss';
}

/**
 * Unified miss rules for both input miss and natural miss:
 * - Always break combo.
 * - Level 1: no life loss.
 * - During bonus: end bonus without life loss.
 * - Otherwise: apply tolerant damage via applyMissPenalty().
 */
function _applyMissRules() {
  setFeedback('MISS', 'miss');

  if (state.bonusActive) {
    endBonus();
    state.combo = 0;
    notify();
    return { hit:false, label:'Miss' };
  }

  if (state.level === 1) {
    state.combo = 0;
    notify();
    return { hit:false, label:'Miss' };
  }

  state.combo = 0;
  applyMissPenalty();
  return { hit:false, label:'Miss' };
}

/* ---------------------------------------------
   Small helpers for _handleSuccessfulHit()
---------------------------------------------- */

// Mark note as hit, clean DOM, and remove from queue.
function _consumeNote(bestIdx) {
  const n = activeNotes[bestIdx];
  n.hit = true;
  if (n.el) n.el.remove();
  activeNotes.splice(bestIdx, 1);
}

// Compute base points and update combo/multiplier.
function _applyBaseScoring(label) {
  const base = (label === 'Perfect') ? 30 : (label === 'Great') ? 20 : 10;
  const newCombo = state.combo + 1;
  const mult = getMultiplierForCombo(newCombo);
  state.combo = newCombo;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  return Math.round(base * mult);
}

/**
 * Handle bonus progress and extra-life awards.
 * Returns extra points to add on top of base note score.
 */
function _handleBonusBlock(label, cfg) {
  let extra = 0;
  const awardMode = (cfg.bonusAwardMode === 'points' || cfg.bonusAwardMode === 'hits')
    ? cfg.bonusAwardMode
    : 'hits';

  const activateCombo = (Number.isFinite(cfg.activateCombo) && cfg.activateCombo > 0)
    ? cfg.activateCombo
    : 10;

  // Enter bonus when combo hits threshold.
  if (!state.bonusActive && state.combo >= activateCombo) startBonus();

  if (!state.bonusActive) {
    setFeedback(label, 'good');
    return 0;
  }

  // Inside bonus: always grant flat +10 visible bonus.
  extra += BONUS_POINT_PER_HIT;
  if (awardMode === 'points') {
    state.bonusPoints = (state.bonusPoints || 0) + BONUS_POINT_PER_HIT;
  } else {
    state.bonusHits   = (state.bonusHits   || 0) + 1;
  }

  const hitsGoal = Number(cfg.hitsPerHeart)   > 0 ? Number(cfg.hitsPerHeart)   : defaultHitsGoalForLevel(state.level);
  const ptsGoal  = Number(cfg.pointsPerHeart) > 0 ? Number(cfg.pointsPerHeart) : defaultPointsGoalForLevel(state.level);
  const goal     = (awardMode === 'points') ? ptsGoal : hitsGoal;

  window.dispatchEvent(new CustomEvent('bonus:progress', {
    detail: { mode: awardMode, hits: state.bonusHits, points: state.bonusPoints, goal }
  }));

  // Extra life only on L4+.
  if (state.level >= 4) {
    const reached = (awardMode === 'points')
      ? (state.bonusPoints >= ptsGoal)
      : (state.bonusHits   >= hitsGoal);

    if (reached) {
      state.bonusHits = 0;
      state.bonusPoints = 0;
      heal();
      window.dispatchEvent(new CustomEvent('bonus:lifeAwarded'));
      setFeedback('EXTRA LIFE +❤', 'good');

      // Reset progress UI explicitly.
      window.dispatchEvent(new CustomEvent('bonus:progress', {
        detail: { mode: awardMode, hits: 0, points: 0, goal }
      }));

      return extra; // still count +10 for this hit
    }
  }

  // Rolling feedback while staying in bonus.
  setFeedback(`${label} +${BONUS_POINT_PER_HIT}`, 'good');
  return extra;
}

/**
 * Apply scoring/combo/bonus logic for a successful hit
 * and update HUD / BEST score.
 */
function _handleSuccessfulHit(bestIdx, label) {
  _consumeNote(bestIdx);
  let add = _applyBaseScoring(label);
  const cfg = getBonusConfig(state.level) || {};

  add += _handleBonusBlock(label, cfg);

  state.score += add;
  if (state.score > (state.best || 0)) {
    state.best = state.score;
    saveBestScore(state.best);
  }

  notify();
  return { hit: true, label };
}

// Judge input against closest note in lane and route to hit/miss handlers.
function gradeHit(dir) {
  const t = nowMs();
  const { bestIdx, bestAbs } = _findBestCandidateInLane(dir, t);

  if (bestIdx === -1) return _applyMissRules();
  const label = _labelFromDelta(bestAbs, judgeConfig.windows);
  if (label === 'Miss') return _applyMissRules();

  return _handleSuccessfulHit(bestIdx, label);
}

// Register a note with ETA and optional group id (for chord bonuses).
function registerNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm, gid = 0) {
  const msPerBeat = 60000 / bpm;
  const eta = nowMs() + (travelBeats * msPerBeat);
  const meta = { id: ++_noteId, dir, eta, el: null, hit:false, gid };
  activeNotes.push(meta);

  if (gid) {
    const g = comboGroups.get(gid) || { expected:0, hits:0, failed:false };
    g.expected += 1;
    comboGroups.set(gid, g);
  }

  return meta;
}

/**
 * Register a judged note + spawn its visual orb.
 * On natural miss (animation end with no input), apply unified miss rules.
 */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm, gid = 0) {
  const meta = registerNote(dir, travelBeats, bpm, gid);
  const el = spawnNote(dir, travelBeats, bpm);
  if (!el) return;

  meta.el = el;
  el.__noteId = meta.id; // dev hook

  el.addEventListener('animationend', () => {
    const still = activeNotes.find(n => n.id === meta.id);
    if (!still) return;                     // already judged as a hit

    removeActiveById(meta.id);
    el.remove();

    // Flag this chord group so it cannot later award a clean-group bonus.
    if (meta.gid) {
      const g = comboGroups.get(meta.gid) || { expected: 1, hits: 0, failed: false };
      g.failed = true;
      comboGroups.set(meta.gid, g);
    }

    _applyMissRules();
  }, { once: true });
}

// Remove all note DOM elements and clear judging queues.
function clearAllNotes() {
  document.querySelectorAll('.rail .note')
    .forEach(n => n.remove());
  activeNotes.length = 0;
  comboGroups.clear();
}

// Auto-end bonus on song end (but keep state for pause/stop).
window.addEventListener('song:ended', (e) => {
  const reason = e?.detail?.reason || 'completed';
  if (reason === 'paused' || reason === 'stopped') {
    return;
  }
  if (state.bonusActive) endBonus();
  state.bonusHits   = 0;
  state.bonusPoints = 0;
  comboGroups.clear();
});

// Full scoring reset when retrying after Game Over.
function resetForGameOver() {
  init();
}

// Exports
export {
  // core state + init
  state, init,
  // lives API
  hit, heal,
  // judging/spawn
  spawnJudgedNote, clearAllNotes, gradeHit, setJudgeWindows,
  // HUD hooks
  getSnapshot, setHooks,
  // resets
  resetPerLevelForNextRun,
  resetForGameOver,
};
