//chartloader.js
// load & validate note charts (JSON)

const VALID_DIRS = new Set(['left', 'up', 'down', 'right']);            // Allowed lanes (whitelist)

/** Load a chart JSON, coerce types, filter bad rows, sort by time ascending. */
export async function loadChart(url) {                                   // Public loader
  const res = await fetch(url, { cache: 'no-cache' });                   // Fetch JSON (avoid stale cache)
  if (!res.ok) throw new Error(`Chart fetch failed: ${res.status}`);     // Network guard
  const data = await res.json();                                         // Parse JSON payload

  // ---- Meta coercion ---------------------------------------------------
  const bpm = toPosNumber(data.bpm, 120);                                // BPM: positive number, default 120
  const offsetMs = toNonNegInt(data.offsetMs, 0);                        // Offset: non-negative int, default 0

  // ---- Notes normalization --------------------------------------------
  const raw = Array.isArray(data.notes) ? data.notes : [];               // Ensure array for notes
  const notes = raw
    .map((n, i) => ({                                                    // Coerce each row
      t: toNonNegInt(n?.t, NaN),                                         // t: ms since audio start (int)
      dir: String(n?.dir ?? '').toLowerCase(),                           // dir: normalized to lower-case
      _i: i                                                              // original index (debug aid)
    }))
    .filter(n => Number.isFinite(n.t) && VALID_DIRS.has(n.dir))          // Keep only valid (time + dir)
    .sort((a, b) => a.t - b.t)                                           // Sort by ascending time
    .map(({ t, dir }) => ({ t, dir }));                                  // Drop debug fields for output

  // ---- Return normalized chart ----------------------------------------
  return {
    id: String(data.id ?? ''),                                           // id as string (empty if missing)
    title: String(data.title ?? ''),                                     // title as string
    audio: String(data.audio ?? ''),                                     // audio path/URL as string
    bpm,                                                                 // normalized bpm
    offsetMs,                                                            // normalized offset
    notes                                                                // cleaned/sorted notes
  };
}

/** Convert beats → milliseconds for given bpm (helper). */
export function beatsToMs(beats, bpm) {                                  // Utility conversion
  const b = Number(beats) || 0;                                          // Coerce beats to number
  const msPerBeat = 60000 / (Number(bpm) || 120);                        // 60,000 ms per minute / bpm
  return b * msPerBeat;                                                  // Multiply to ms
}

/** Lead time to spawn notes so they reach the judge line at t (ms). */
export function computeSpawnLeadMs(travelBeats = 2.0, bpm = 120) {       // Spawn lead calculator
  return Math.max(0, Math.floor(beatsToMs(travelBeats, bpm)));           // Clamp to 0+, int ms
}

/* ---------- small coercion helpers ---------- */
function toNonNegInt(v, fallback = 0) {                                   // Coerce to int ≥ 0
  const n = Math.floor(Number(v));                                        // Number → floor to int
  return Number.isFinite(n) && n >= 0 ? n : fallback;                     // Validate or fallback
}
function toPosNumber(v, fallback = 1) {                                   // Coerce to number > 0
  const n = Number(v);                                                    // Number conversion
  return Number.isFinite(n) && n > 0 ? n : fallback;                      // Validate or fallback
}
