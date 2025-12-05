/* =============================
   Difficulty levels (game pacing)
   - Keep travelBeats exactly as before
   - Never slow audio below 1.00
   - Slightly increase playbackRate per level
   - minDurationSec is used by the runner to loop song/spawns until reached
============================= */

export const LEVELS = {
  /* ---- L1–3: one note at a time / gentle intro ---- */
  1: {
    name: 'Warm-up',                                  // user-facing label
    windows: { perfect: 110, great: 180, good: 260 }, // judging windows (ms)
    travelBeats: 3.2,                                 // beats from spawn to judge
    playbackRate: 1.00,                               // audio speed multiplier (never < 1.00)
    chordPolicy: 'single',                            // allowed chord type
    maxSimultaneous: 1,                               // cap for simultaneous notes
    minGapBeats: 3.0,                                 // global min gap (beats)
    perLaneMinGapBeats: 2.0,                          // per-lane min gap (beats)
    antiSimWindowMs: 520,                             // block near-sim spawns within window
    chordWindowMs: 45,                                // max Δt to treat notes as same chord
    allowSyncopation: false,                          // off-beat placements allowed?
    minDurationSec: 45,                               // target minimum runtime (sec)
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
    playbackRate: 1.05,                               // slight increase vs L3
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
    playbackRate: 1.08,                               // moderate increase
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
    playbackRate: 1.10,                               // faster flow
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
    playbackRate: 1.12,                               // incremental bump
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
    playbackRate: 1.14,                               // incremental bump
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
    playbackRate: 1.16,                               // incremental bump
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
    playbackRate: 1.18,                               // incremental bump
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
    playbackRate: 1.20,                               // boss pacing start
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
    playbackRate: 1.22,                               // incremental bump
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
    playbackRate: 1.24,                               // incremental bump
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
    playbackRate: 1.26,                               // incremental bump
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
    playbackRate: 1.28,                               // peak speed for this set
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
  *simplifyChartForLevel(rawNotes, bpm, lvlCfg)
  * Purpose: Normalize → group → randomly reduce/augment → space → (optional) anti-sim filter.
  */

export function simplifyChartForLevel(rawNotes, bpm, lvlCfg) {
  if (!Array.isArray(rawNotes) || !Number.isFinite(bpm)) return [];             // guard

  const lvl = lvlCfg || LEVELS[1];                                              // level config
  const msPerBeat = 60000 / bpm;                                                // ms per beat
  const DIRS = ['left','up','down','right'];                                    // lanes universe

  // --- normalize input to {dir,timeMs} (optionally quantized when syncopation is off)
  function quantizeMsToFraction(ms, denom = 4) {                                 // local snap
    const step = msPerBeat / denom;                                              // sub-beat
    return Math.round(ms / step) * step;                                         // nearest step
  }

  const norm = rawNotes
    .map(ev => {
      const dir = String(ev.dir || '').toLowerCase();                            // lane
      if (!DIRS.includes(dir)) return null;                                      // drop bad
      let t = (ev.t != null) ? Number(ev.t)
        : (ev.timeMs != null ? Number(ev.timeMs) : Number(ev.time));
      if (!Number.isFinite(t)) return null;                                      // drop bad time
      if (!lvl.allowSyncopation) t = quantizeMsToFraction(t, 4);                 // optional snap
      return { dir, timeMs: t };                                                 // normalized
    })
    .filter(Boolean)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (norm.length === 0) return [];                                              // nothing

  // --- group by chordWindowMs
  const chordWin = Math.max(1, lvl.chordWindowMs ?? 40);                         // grouping window
  const groups = [];
  let cur = [norm[0]];
  for (let i = 1; i < norm.length; i++) {
    const ev = norm[i];
    if (Math.abs(ev.timeMs - cur[0].timeMs) <= chordWin) cur.push(ev);           // same chord
    else { groups.push(cur); cur = [ev]; }                                       // new chord
  }
  groups.push(cur);

  // --- reduction/augmentation policy
  const policy   = (lvl.chordPolicy || 'single');                                // 'single'|'pair'|'all'
  const maxSim   = Math.max(1, lvl.maxSimultaneous ?? 1);                        // cap simultaneity
  const baseSimChance =
    (lvl.simChance != null) ? Math.max(0, Math.min(1, Number(lvl.simChance)))                          // explicit chance
      : (policy === 'pair' ? 0.5 : policy === 'all' ? 0.85 : 0.0);               // defaults

  // small helper: return a random subset of unique lanes from a chord
function pickRandomDistinct(chord, count) {
  const seen = new Set();                                                      // dedupe lanes
  const uniq = [];                                                             // unique by lane

  for (const ev of chord) {                                                    // loop over all events in this chord
    if (!seen.has(ev.dir)) {                                                   // only keep first event per lane
      seen.add(ev.dir);                                                        // remember that this lane is used
      uniq.push(ev);                                                           // store the event as unique
    }
  }

  // shuffle uniq in-place (Fisher–Yates)
  for (let i = uniq.length - 1; i > 0; i--) {                                  // walk backwards through the array
    const j = Math.floor(Math.random() * (i + 1));                             // pick random index 0..i
    const tmp = uniq[i];                                                       // store current element
    uniq[i] = uniq[j];                                                         // move random element into position i
    uniq[j] = tmp;                                                             // put stored element at position j
  }

  const safeCount = Math.max(0, Math.floor(Number(count) || 0));               // clamp requested size to a non-negative integer

  return uniq.slice(0, safeCount);                                             // return at most safeCount items
}

  const picked = [];
  for (const chord of groups) {
    const baseTime = chord[0].timeMs;                                            // chord ms
    let keep = [];

    if (policy === 'all') {
      // keep as many distinct lanes as allowed; inject if chart lacks them
      keep = pickRandomDistinct(chord, Math.min(maxSim, DIRS.length));           // from chart
      // inject missing lanes at same time up to maxSim
      while (keep.length < Math.min(maxSim, DIRS.length)) {
        const used = new Set(keep.map(e => e.dir));
        const avail = DIRS.filter(d => !used.has(d));
        if (!avail.length) break;
        const d = avail[Math.floor(Math.random() * avail.length)];

        keep.push({ dir: d, timeMs: baseTime });
      }
    } else if (policy === 'pair') {
      // sometimes make a pair; otherwise single
      const makePair = Math.random() < baseSimChance;
      if (makePair) {
        keep = pickRandomDistinct(chord, Math.min(2, maxSim));                   // two lanes
        if (keep.length < 2) {
          // inject second lane if chart only had one
          const used = new Set(keep.map(e => e.dir));
          const avail = DIRS.filter(d => !used.has(d));
          if (avail.length) {
            const d = avail[Math.floor(Math.random() * avail.length)];
            keep.push({ dir: d, timeMs: baseTime });
          }
        }
      } else {
        // single: choose a random lane from this chord (no UP-bias)
        keep = pickRandomDistinct(chord, 1);
      }
    } else {
      // 'single' policy → always choose a random lane in the chord
      keep = pickRandomDistinct(chord, 1);
    }

    picked.push(...keep.slice(0, maxSim));                                       // cap just in case
  }

  // --- spacing rules
  const minGapMs  = (lvl.minGapBeats ?? 0) * msPerBeat;                           // global gap
  const laneGapMs = (lvl.perLaneMinGapBeats ?? 0) * msPerBeat;                    // per-lane gap
  const lastByLane = { left:-Infinity, up:-Infinity, down:-Infinity, right:-Infinity };
  let lastGlobal = -Infinity;
  const spaced = [];

  for (const ev of picked.sort((a,b)=>a.timeMs-b.timeMs)) {
    if (ev.timeMs - lastGlobal < minGapMs) continue;                              // thin globally
    if (ev.timeMs - lastByLane[ev.dir] < laneGapMs) continue;                     // thin per lane
    spaced.push(ev);                                                               // keep
    lastGlobal = ev.timeMs;                                                        // update global
    lastByLane[ev.dir] = ev.timeMs;                                               // update lane
  }

  // --- anti-sim (time proximity filter)
  const anti = lvl.antiSimWindowMs ?? 0;                                          // ms window
  if (anti > 0) {
    const out = [];
    let lastKeep = -Infinity;
    for (const ev of spaced) {
      if (ev.timeMs - lastKeep < anti) continue;                                  // skip too close
      out.push(ev);
      lastKeep = ev.timeMs;
    }
    return out;
  }

  return spaced;
}


/**
  * getBonusConfig(level)
  * Purpose: Combo threshold for bonus + points-per-life (from L3+).
  * Bands:
  * - L1–2  : activate 10/15, no hearts
  * - L3–5  : activate 10/15, 100 bonus-points per life
  * - L6–10 : activate 15/20, 120 bonus-points per life
  * - L11+  : activate 25,    160 bonus-points per life
  */

export function getBonusConfig(level) {
  const L = Number(level) || 1;                    // coerce level

  // combo trigger
  let activateCombo = 10;                          // default for L1–3
  if (L >= 4 && L <= 7) activateCombo = 50;        // L4–7
  else if (L >= 8 && L <= 10) activateCombo = 20;  // L8–10
  else if (L >= 11) activateCombo = 25;            // L11+

  // points required per extra life while bonus is active
  let bonusPointsPerLife = null;                   // L1–2 → no hearts
  if (L >= 3 && L <= 5)  bonusPointsPerLife = 500; 
  else if (L >= 6 && L <= 10) bonusPointsPerLife = 160;
  else if (L >= 11)      bonusPointsPerLife = 150;

  return { activateCombo, bonusPointsPerLife };    // return config
}
