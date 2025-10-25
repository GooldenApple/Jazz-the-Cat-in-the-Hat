export const LEVELS = {
  1: {
    name: 'Warm-up',
    // Very forgiving:
    windows: { perfect: 110, great: 180, good: 260 }, // ms
    // Slow visuals + audio:
    travelBeats: 3.2,         // orbs speed fall
    playbackRate: 1.0,       // slow the song a bit
    // Simplicity rules:
    chordPolicy: 'single',    // never require two notes at once
    maxSimultaneous: 1,
    minGapBeats: 3.0,        // global gap between notes (beats)
    perLaneMinGapBeats: 2.0, // extra spacing on same lane
    antiSimWindowMs: 520,     // “one at a time” window
    chordWindowMs: 45,        // events within this form a chord
    allowSyncopation: false,  // quantize to neat fractions
  },
   2: {
    name: 'Easy',
    windows: { perfect: 100, great: 170, good: 230 },
    travelBeats: 3.0,      
    playbackRate: 1.0,
    chordPolicy: 'single',
    maxSimultaneous: 1,
  
    minGapBeats: 3.0,
    perLaneMinGapBeats: 1.9,
    antiSimWindowMs: 500,
    chordWindowMs: 42,
    allowSyncopation: false,
  },

  3: {
    name: 'Casual',
    windows: { perfect: 90, great: 160, good: 220 },
    travelBeats: 2.8,      
    playbackRate: 1.0,
    chordPolicy: 'single',
    maxSimultaneous: 1,
    minGapBeats: 3.0,
    perLaneMinGapBeats: 1.8,
    antiSimWindowMs: 480,
    chordWindowMs: 40,
    allowSyncopation: false,
  },

  4: {
    name: 'Casual+',
    windows: { perfect: 85, great: 150, good: 210 },
    travelBeats: 2.8,
    playbackRate: 1.0,
    chordPolicy: 'single',
    maxSimultaneous: 1,
    minGapBeats: 2.0,
    perLaneMinGapBeats: 1.4,
    antiSimWindowMs: 440,
    chordWindowMs: 38,
    allowSyncopation: false,
  },
  //TODO add more levels
};

/**
 * Quantize ms to the nearest fraction of a beat when disallow syncopation.
 */
function quantizeMsToFraction(ms, msPerBeat, denom = 4) {
  const frac = msPerBeat / denom;                  // e.g., quarter-beat
  return Math.round(ms / frac) * frac;
}

/**
 * simplifyChartForLevel(notes, bpm, lvl)
 * Returns a pruned, ordered array of note events for the chosen level.
 * Each input event expects: { dir: 'left'|'up'|'down'|'right', timeMs?: number, time?: number }
 * If only `time` is present, it is treated as milliseconds as well.
 */
export function simplifyChartForLevel(rawNotes, bpm, lvlCfg) {
  if (!Array.isArray(rawNotes) || !Number.isFinite(bpm)) return [];

  const lvl = lvlCfg || LEVELS[1];
  const msPerBeat = 60000 / bpm;

  // 1) Normalize and quantize times.
  const norm = rawNotes
    .map(ev => {
      const dir = String(ev.dir || '').toLowerCase();
      if (!['left','up','down','right'].includes(dir)) return null;
      let t = (ev.timeMs != null) ? Number(ev.timeMs) : Number(ev.time);
      if (!Number.isFinite(t)) return null;
      if (!lvl.allowSyncopation) {
        t = quantizeMsToFraction(t, msPerBeat, 4); // snap to 1/4 beat
      }
      return { dir, timeMs: t };
    })
    .filter(Boolean)
    .sort((a, b) => a.timeMs - b.timeMs);

  if (norm.length === 0) return [];

  // 2) Group events into chords within chordWindowMs.
  const chordWin = Math.max(1, lvl.chordWindowMs ?? 40);
  const groups = [];
  let current = [norm[0]];
  for (let i = 1; i < norm.length; i++) {
    const ev = norm[i];
    if (Math.abs(ev.timeMs - current[0].timeMs) <= chordWin) {
      current.push(ev);
    } else {
      groups.push(current);
      current = [ev];
    }
  }
  groups.push(current);

  // 3) Reduce each chord according to chordPolicy and maxSimultaneous.
  const picked = [];
  const maxSim = Math.max(1, lvl.maxSimultaneous ?? 1);
  const policy  = (lvl.chordPolicy || 'single');

  for (const chord of groups) {
    if (policy === 'all') {
      picked.push(...chord.slice(0, maxSim));
    } else if (policy === 'pair') {
      const uniq = [];
      const seen = new Set();
      for (const ev of chord) {
        if (!seen.has(ev.dir)) { uniq.push(ev); seen.add(ev.dir); }
      }
      picked.push(...uniq.slice(0, Math.min(2, maxSim)));
    } else {
      // 'single' → keep one representative (prefer UP, then DOWN, else first).
      const keep = chord.find(e => e.dir === 'up')
                ||  chord.find(e => e.dir === 'down')
                ||  chord[0];
      picked.push(keep);
    }
  }

  // 4) Enforce spacing: global and per-lane minimum gaps.
  const minGapMs   = (lvl.minGapBeats ?? 0) * msPerBeat;
  const perLaneMs  = (lvl.perLaneMinGapBeats ?? 0) * msPerBeat;

  const lastByLane = { left: -Infinity, up: -Infinity, down: -Infinity, right: -Infinity };
  let lastGlobal   = -Infinity;

  const spaced = [];
  for (const ev of picked.sort((a, b) => a.timeMs - b.timeMs)) {
    if (ev.timeMs - lastGlobal < minGapMs) continue;                 // global thinning
    if (ev.timeMs - lastByLane[ev.dir] < perLaneMs) continue;        // per-lane thinning
    spaced.push(ev);
    lastGlobal = ev.timeMs;
    lastByLane[ev.dir] = ev.timeMs;
  }

  // 5) Optional final pass: guarantee “one note at a time” if antiSimWindowMs > 0.
  const anti = lvl.antiSimWindowMs ?? 0;
  if (anti > 0) {
    const finalOut = [];
    let lastKeep = -Infinity;
    for (const ev of spaced) {
      if (ev.timeMs - lastKeep < anti) continue;
      finalOut.push(ev);
      lastKeep = ev.timeMs;
    }
    return finalOut;
  }

  return spaced;
}