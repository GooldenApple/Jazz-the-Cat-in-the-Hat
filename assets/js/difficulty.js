/* =============================
   Difficulty levels (game pacing)
   - Keep travelBeats exactly as before
   - Never slow audio below 1.00
   - Slightly increase playbackRate per level
   - minDurationSec is used to loop song/spawns until reached
============================= */

/**
 * LEVELS defines timing, density and chord rules per level.
 * Keys per level:
 * - windows: hit windows in ms (perfect/great/good)
 * - travelBeats: beats from spawn to judge line
 * - playbackRate: audio speed multiplier (never < 1.00)
 * - chordPolicy: 'single' | 'pair' | 'all'
 * - maxSimultaneous: max simultaneous notes
 * - minGapBeats / perLaneMinGapBeats: spacing in beats
 * - antiSimWindowMs / chordWindowMs: grouping and anti-sim timing windows
 * - allowSyncopation: whether off-beat placements are allowed
 * - minDurationSec: target minimum runtime in seconds
 */
export const LEVELS = {
  /* ---- L1–3: one note at a time / gentle intro ---- */
  1: {
    name: 'Warm-up',
    windows: { perfect: 110, great: 180, good: 260 },
    travelBeats: 3.2,
    playbackRate: 1.00,
    chordPolicy: 'single',
    maxSimultaneous: 1,
    minGapBeats: 3.0,
    perLaneMinGapBeats: 2.0,
    antiSimWindowMs: 520,
    chordWindowMs: 45,
    allowSyncopation: false,
    minDurationSec: 45,
  },

  2: {
    name: 'Easy',
    windows: { perfect: 100, great: 170, good: 230 },
    travelBeats: 3.0,
    playbackRate: 1.02,
    chordPolicy: 'single',
    maxSimultaneous: 1,
    minGapBeats: 3.0,
    perLaneMinGapBeats: 1.9,
    antiSimWindowMs: 500,
    chordWindowMs: 42,
    allowSyncopation: false,
    minDurationSec: 50,
  },

  /* ---- L3–5: start allowing occasional pairs ---- */
  3: {
    name: 'Casual',
    windows: { perfect: 90, great: 160, good: 220 },
    travelBeats: 2.7,
    playbackRate: 1.04,
    chordPolicy: 'pair',
    maxSimultaneous: 2,
    minGapBeats: 3.0,
    perLaneMinGapBeats: 1.8,
    antiSimWindowMs: 420,
    chordWindowMs: 40,
    allowSyncopation: false,
    minDurationSec: 55,
  },

  4: {
    name: 'Casual+',
    windows: { perfect: 85, great: 150, good: 210 },
    travelBeats: 2.6,
    playbackRate: 1.05,
    chordPolicy: 'pair',
    maxSimultaneous: 2,
    minGapBeats: 2.2,
    perLaneMinGapBeats: 1.5,
    antiSimWindowMs: 0,
    chordWindowMs: 40,
    allowSyncopation: false,
    minDurationSec: 60,
  },

  5: {
    name: 'Groove',
    windows: { perfect: 85, great: 145, good: 205 },
    travelBeats: 2.5,
    playbackRate: 1.08,
    chordPolicy: 'pair',
    maxSimultaneous: 2,
    minGapBeats: 2.0,
    perLaneMinGapBeats: 1.4,
    antiSimWindowMs: 0,
    chordWindowMs: 38,
    allowSyncopation: false,
    minDurationSec: 65,
  },

  /* ---- L6–8: tighter spacing, still mostly pairs ---- */
  6: {
    name: 'Groove+',
    windows: { perfect: 80, great: 140, good: 200 },
    travelBeats: 2.4,
    playbackRate: 1.10,
    chordPolicy: 'pair',
    maxSimultaneous: 2,
    minGapBeats: 1.9,
    perLaneMinGapBeats: 1.3,
    antiSimWindowMs: 0,
    chordWindowMs: 36,
    allowSyncopation: false,
    minDurationSec: 70,
  },

  7: {
    name: 'Flow',
    windows: { perfect: 78, great: 135, good: 195 },
    travelBeats: 2.3,
    playbackRate: 1.12,
    chordPolicy: 'pair',
    maxSimultaneous: 2,
    minGapBeats: 1.8,
    perLaneMinGapBeats: 1.2,
    antiSimWindowMs: 0,
    chordWindowMs: 34,
    allowSyncopation: false,
    minDurationSec: 75,
  },

  8: {
    name: 'Challenge',
    windows: { perfect: 75, great: 130, good: 190 },
    travelBeats: 2.2,
    playbackRate: 1.14,
    chordPolicy: 'pair',
    maxSimultaneous: 3,
    minGapBeats: 1.6,
    perLaneMinGapBeats: 1.1,
    antiSimWindowMs: 0,
    chordWindowMs: 34,
    allowSyncopation: true,
    minDurationSec: 80,
  },

  /* ---- L9–12: allow trios, syncopation, faster flow ---- */
  9: {
    name: 'Challenge+',
    windows: { perfect: 72, great: 125, good: 185 },
    travelBeats: 2.1,
    playbackRate: 1.16,
    chordPolicy: 'pair',
    maxSimultaneous: 3,
    minGapBeats: 1.5,
    perLaneMinGapBeats: 1.0,
    antiSimWindowMs: 0,
    chordWindowMs: 32,
    allowSyncopation: true,
    minDurationSec: 85,
  },

  10: {
    name: 'Hard',
    windows: { perfect: 70, great: 120, good: 180 },
    travelBeats: 2.0,
    playbackRate: 1.18,
    chordPolicy: 'pair',
    maxSimultaneous: 3,
    minGapBeats: 1.4,
    perLaneMinGapBeats: 1.0,
    antiSimWindowMs: 0,
    chordWindowMs: 30,
    allowSyncopation: true,
    minDurationSec: 90,
  },

  11: {
    name: 'Boss I',
    windows: { perfect: 68, great: 118, good: 178 },
    travelBeats: 1.95,
    playbackRate: 1.20,
    chordPolicy: 'all',
    maxSimultaneous: 4,
    minGapBeats: 1.3,
    perLaneMinGapBeats: 0.9,
    antiSimWindowMs: 0,
    chordWindowMs: 28,
    allowSyncopation: true,
    minDurationSec: 95,
  },

  12: {
    name: 'Boss II',
    windows: { perfect: 66, great: 115, good: 175 },
    travelBeats: 1.90,
    playbackRate: 1.22,
    chordPolicy: 'all',
    maxSimultaneous: 4,
    minGapBeats: 1.25,
    perLaneMinGapBeats: 0.9,
    antiSimWindowMs: 0,
    chordWindowMs: 26,
    allowSyncopation: true,
    minDurationSec: 95,
  },

  /* ---- L13–15: boss tier peak, up to 4 sim ---- */
  13: {
    name: 'Boss III',
    windows: { perfect: 64, great: 112, good: 172 },
    travelBeats: 1.85,
    playbackRate: 1.24,
    chordPolicy: 'all',
    maxSimultaneous: 4,
    minGapBeats: 1.2,
    perLaneMinGapBeats: 0.9,
    antiSimWindowMs: 0,
    chordWindowMs: 24,
    allowSyncopation: true,
    minDurationSec: 100,
  },

  14: {
    name: 'Boss IV',
    windows: { perfect: 62, great: 110, good: 170 },
    travelBeats: 1.80,
    playbackRate: 1.26,
    chordPolicy: 'all',
    maxSimultaneous: 4,
    minGapBeats: 1.15,
    perLaneMinGapBeats: 0.85,
    antiSimWindowMs: 0,
    chordWindowMs: 22,
    allowSyncopation: true,
    minDurationSec: 105,
  },

  15: {
    name: 'Boss V',
    windows: { perfect: 60, great: 108, good: 168 },
    travelBeats: 1.75,
    playbackRate: 1.28,
    chordPolicy: 'all',
    maxSimultaneous: 4,
    minGapBeats: 1.1,
    perLaneMinGapBeats: 0.8,
    antiSimWindowMs: 0,
    chordWindowMs: 20,
    allowSyncopation: true,
    minDurationSec: 110,
  },
};


/**
 * Simplifies a raw chart for a given level.
 * Steps (conceptually):
 * - normalise events into {dir, timeMs}
 * - group nearby notes into chords
 * - apply chord policy (single/pair/all) and randomisation
 * - enforce spacing / per-lane gaps
 * - optionally apply an anti-sim proximity filter
 */
export function simplifyChartForLevel(rawNotes, bpm, lvlCfg) {
  if (!Array.isArray(rawNotes) || !Number.isFinite(bpm)) return [];

  const lvl = lvlCfg || LEVELS[1];
  const msPerBeat = 60000 / bpm;
  const DIRS = ['left', 'up', 'down', 'right'];

  // Normalise to { dir, timeMs } and optionally snap to a sub-beat grid.
  function quantizeMsToFraction(ms, denom = 4) {
    const step = msPerBeat / denom;
    return Math.round(ms / step) * step;
  }

  const norm = rawNotes
    .map(ev => {
      const dir = String(ev.dir || '').toLowerCase();
      if (!DIRS.includes(dir)) return null;

      let t = (ev.t != null) ? Number(ev.t)
        : (ev.timeMs != null ? Number(ev.timeMs) : Number(ev.time));
      if (!Number.isFinite(t)) return null;

      if (!lvl.allowSyncopation) t = quantizeMsToFraction(t, 4);
      return { dir, timeMs: t };
    })
    .filter(Boolean)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (norm.length === 0) return [];

  // Group notes into chords based on chordWindowMs.
  const chordWin = Math.max(1, lvl.chordWindowMs ?? 40);
  const groups = [];
  let cur = [norm[0]];
  for (let i = 1; i < norm.length; i++) {
    const ev = norm[i];
    if (Math.abs(ev.timeMs - cur[0].timeMs) <= chordWin) cur.push(ev);
    else {
      groups.push(cur);
      cur = [ev];
    }
  }
  groups.push(cur);

  const policy = (lvl.chordPolicy || 'single');
  const maxSim = Math.max(1, lvl.maxSimultaneous ?? 1);
  const baseSimChance =
    (lvl.simChance != null)
      ? Math.max(0, Math.min(1, Number(lvl.simChance)))
      : (policy === 'pair' ? 0.5 : policy === 'all' ? 0.85 : 0.0);

  /**
   * Picks a random subset of unique lanes from a chord.
   * Ensures no duplicate lanes and shuffles before slicing.
   */
  function pickRandomDistinct(chord, count) {
    const seen = new Set();
    const uniq = [];

    for (const ev of chord) {
      if (!seen.has(ev.dir)) {
        seen.add(ev.dir);
        uniq.push(ev);
      }
    }

    // Fisher–Yates shuffle
    for (let i = uniq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = uniq[i];
      uniq[i] = uniq[j];
      uniq[j] = tmp;
    }

    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    return uniq.slice(0, safeCount);
  }

  const picked = [];
  for (const chord of groups) {
    const baseTime = chord[0].timeMs;
    let keep = [];

    if (policy === 'all') {
      // Fill up to maxSim with distinct lanes, injecting missing lanes if needed.
      keep = pickRandomDistinct(chord, Math.min(maxSim, DIRS.length));
      while (keep.length < Math.min(maxSim, DIRS.length)) {
        const used = new Set(keep.map(e => e.dir));
        const avail = DIRS.filter(d => !used.has(d));
        if (!avail.length) break;
        const d = avail[Math.floor(Math.random() * avail.length)];
        keep.push({ dir: d, timeMs: baseTime });
      }
    } else if (policy === 'pair') {
      const makePair = Math.random() < baseSimChance;
      if (makePair) {
        keep = pickRandomDistinct(chord, Math.min(2, maxSim));
        if (keep.length < 2) {
          const used = new Set(keep.map(e => e.dir));
          const avail = DIRS.filter(d => !used.has(d));
          if (avail.length) {
            const d = avail[Math.floor(Math.random() * avail.length)];
            keep.push({ dir: d, timeMs: baseTime });
          }
        }
      } else {
        keep = pickRandomDistinct(chord, 1);
      }
    } else {
      // 'single' policy
      keep = pickRandomDistinct(chord, 1);
    }

    picked.push(...keep.slice(0, maxSim));
  }

  // Enforce global and per-lane spacing.
  const minGapMs = (lvl.minGapBeats ?? 0) * msPerBeat;
  const laneGapMs = (lvl.perLaneMinGapBeats ?? 0) * msPerBeat;
  const lastByLane = { left: -Infinity, up: -Infinity, down: -Infinity, right: -Infinity };
  let lastGlobal = -Infinity;
  const spaced = [];

  for (const ev of picked.sort((a, b) => a.timeMs - b.timeMs)) {
    if (ev.timeMs - lastGlobal < minGapMs) continue;
    if (ev.timeMs - lastByLane[ev.dir] < laneGapMs) continue;
    spaced.push(ev);
    lastGlobal = ev.timeMs;
    lastByLane[ev.dir] = ev.timeMs;
  }

  // Optional anti-sim proximity filter.
  const anti = lvl.antiSimWindowMs ?? 0;
  if (anti > 0) {
    const out = [];
    let lastKeep = -Infinity;
    for (const ev of spaced) {
      if (ev.timeMs - lastKeep < anti) continue;
      out.push(ev);
      lastKeep = ev.timeMs;
    }
    return out;
  }

  return spaced;
}


/**
 * Returns the bonus configuration for a given level.
 * Controls:
 * - activateCombo: combo threshold to enter bonus mode
 * - bonusPointsPerLife: points required per extra life (null = no hearts)
 *
 * Bands:
 * - L1–2  : activate 10/15, no hearts
 * - L3–5  : activate 10/15, 100 bonus-points per life
 * - L6–10 : activate 15/20, 120 bonus-points per life
 * - L11+  : activate 25,    160 bonus-points per life
 */
export function getBonusConfig(level) {
  const L = Number(level) || 1;

  // Combo trigger threshold.
  let activateCombo = 10;
  if (L >= 4 && L <= 7) activateCombo = 50;
  else if (L >= 8 && L <= 10) activateCombo = 20;
  else if (L >= 11) activateCombo = 25;

  // Points required per extra life while bonus is active.
  let bonusPointsPerLife = null;
  if (L >= 3 && L <= 5) bonusPointsPerLife = 500;
  else if (L >= 6 && L <= 10) bonusPointsPerLife = 160;
  else if (L >= 11) bonusPointsPerLife = 150;

  return { activateCombo, bonusPointsPerLife };
}
