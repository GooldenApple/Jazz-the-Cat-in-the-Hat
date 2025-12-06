/* jshint esversion: 11 */
/* jshint browser: true */
/* jshint devel: true */
/* jshint strict: implied */
/* jshint unused: true */ 

// songplayer.js
//  Minimal chart-driven song player: loads audio + chart and schedules orb spawns.

import { SONGS, getSongForLevel } from './songRegistry.js';
import { spawnJudgedNote, state, setJudgeWindows } from './scoring.js';
import { LEVELS, simplifyChartForLevel } from './difficulty.js';
import './audio.js';

let audio = null;        // active HTMLAudioElement
let timers = [];         // active setTimeout ids
let current = null;      // song, chart, bpm, travelBeats, offsetMs
let _cancelPendingStart = false;  // tracks if current start should be cancelled

/**
 * cancelPendingStart()
 * Mark the current in-flight start as cancelled.
 * Used when user pauses during the "starting" countdown.
 */
function cancelPendingStart() {
  _cancelPendingStart = true;     // mark that the in-flight start should bail
}

/* ----------------------------------------
   Volume bridge
   Purpose: Mirror Settings → HTMLAudioElement.volume (0..1)
---------------------------------------- */
let __uiVolume = 1;                                  // cached UI volume (0..1)

/* -------------------------------
   getSavedVolume()
   Purpose: Read 0..1 from storage
-------------------------------- */
function getSavedVolume() {
  try {
    const s = JSON.parse(localStorage.getItem('settings') || '{}'); // read settings JSON
    const v = s && s.muted ? 0 : (typeof s.volume === 'number' ? s.volume : 0.8); // resolve value
    return Math.max(0, Math.min(1, Number(v) || 0));               // clamp to 0..1
  } catch (_) {
    return 0.8;                                                     // safe fallback
  }
}

/* --------------------------------------------
   (event) audio:setMasterVolume
   Purpose: Apply UI volume live to <audio>
--------------------------------------------- */
window.addEventListener('audio:setMasterVolume', (e) => {
  const v = (e && e.detail && typeof e.detail.volume === 'number') ? e.detail.volume : 0; // read detail
  __uiVolume = Math.max(0, Math.min(1, Number(v) || 0));                                   // clamp
  if (audio) audio.volume = __uiVolume;                                                    // apply
});

const DEBUG = true;      // set false to silence logs
const log = (...a) => { if (DEBUG) console.log('[song]', ...a); };

/* -------------------------------------------
   emit(name, detail)
   Purpose: Broadcast CustomEvent
-------------------------------------------- */
function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));          // fire event
}

/* -------------------------------------------
   clearTimers()
   Purpose: Cancel all timeouts
-------------------------------------------- */
function clearTimers() {
  for (const t of timers) clearTimeout(t);                          // cancel timeout
  timers.length = 0;                                                 // empty list
}

/* ----------------------------------------
   Internal helpers used by startSongById
---------------------------------------- */

/* ------------------------------------------------------
   _pickSongById(id)
   Purpose: Return song entry by id or first available
------------------------------------------------------- */
function _pickSongById(id) {
  return id ? SONGS.find(s => s.id === id) : (Array.isArray(SONGS) && SONGS[0]); // pick
}

/* ------------------------------------------------------
   _loadChartStrict(song)
   Purpose: Fetch + validate chart JSON and timing fields
------------------------------------------------------- */
async function _loadChartStrict(song) {
  const res = await fetch(song.chart);                               // fetch chart
  if (!res.ok) throw new Error(`Failed to load chart: ${song.chart}`); // guard
  const chart = await res.json();                                    // parse
  const bpm = Number(chart.bpm);                                     // bpm
  if (!Number.isFinite(bpm)) throw new Error('Chart is missing a valid bpm'); // guard
  const chartTravelBeats = Number.isFinite(chart.travelBeats) ? chart.travelBeats : 2.0; // default
  const offsetMs = Number.isFinite(chart.offsetMs) ? chart.offsetMs : 0; // default
  return { chart, bpm, chartTravelBeats, offsetMs };                 // bundle
}

/* -----------------------------------------------------------------
   _deriveLevelTiming(...)
   Purpose: Apply difficulty: judge windows + playbackRate (no slow)
------------------------------------------------------------------ */
function _deriveLevelTiming(bpm, chartTravelBeats, levelConfig, travelBeatsOverride) {
  if (levelConfig && levelConfig.windows) setJudgeWindows(levelConfig.windows);  // override judge windows
  const rawRate = Number.isFinite(levelConfig?.playbackRate) ? levelConfig.playbackRate : 1.0; // configured rate
  const rate = Math.max(1.0, rawRate);                                           // never slow down (>= 1.0)
  const travelBeatsEff = (typeof travelBeatsOverride === 'number') ? travelBeatsOverride : (typeof levelConfig?.travelBeats === 'number' ? levelConfig.travelBeats : chartTravelBeats); // else cfg/chart
  const msPerBeatEff = (60000 / bpm) / rate;                                     // ms per beat at effective rate
  const travelMs     = travelBeatsEff * msPerBeatEff;                            // fall time in ms
  return { rate, travelBeatsEff, msPerBeatEff, travelMs };                       // timing pack
}

/* ---- chord helpers (private, RANDOM) ---- */
const ALL_DIRS = ['left','up','down','right'];

/* -------------------------------------------
   _clusterKey(ev)
   Purpose: Build stable key for simultaneity
-------------------------------------------- */
function _clusterKey(ev) {
  if (Number.isFinite(ev.t))      return `t:${ev.t}`;                      // normalized ms (rate-aware in charts)
  if (Number.isFinite(ev.timeMs)) return `ms:${ev.timeMs}`;                // absolute ms
  if (Number.isFinite(ev.beat))   return `b:${ev.beat}`;                   // beat index
  if (Number.isFinite(ev.time))   return `tm:${ev.time}`;                  // alt ms
  return `x:${Math.random()}`;                                            // rare fallback
}

/* ----------------------------------------------------
   _probPolicyForLevel(level)
   Purpose: Prob caps for random chord sizes
----------------------------------------------------- */
function _probPolicyForLevel(level) {
  const cfg = (typeof LEVELS === 'object' && LEVELS?.[level]) || {};      // level cfg
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));             // clamp helper

  let max = level >= 11 ? 4 : level >= 8 ? 3 : level >= 3 ? 2 : 1;        // default cap by tier
  if (Number.isFinite(cfg.maxSimultaneous)) max = clamp(cfg.maxSimultaneous, 1, 4); // respect cfg

  let p2=0, p3=0, p4=0;                                                   // probabilities
  if (level >= 3 && level <= 4) { p2 = 0.20; }
  else if (level <= 6)          { p2 = 0.30; }
  else if (level <= 8)          { p2 = 0.35; p3 = 0.08; }
  else if (level <= 10)         { p2 = 0.40; p3 = 0.12; }
  else if (level <= 12)         { p2 = 0.45; p3 = 0.18; p4 = 0.03; }
  else                          { p2 = 0.50; p3 = 0.25; p4 = 0.06; }

  if (max < 4) p4 = 0; if (max < 3) p3 = 0; if (max < 2) p2 = 0;          // clamp by cap
  return { max, p2, p3, p4 };                                             // policy
}

/* ---------------------------------------------------
   _sampleChordSize(policy)
   Purpose: RNG chord size 1..4 by probs
---------------------------------------------------- */
function _sampleChordSize({ p2, p3, p4 }) {
  let r = Math.random();                                                  // rng
  if (p4 && r < p4) return 4; r -= p4 || 0;                               // try 4
  if (p3 && r < p3) return 3; r -= p3 || 0;                               // try 3
  if (p2 && r < p2) return 2;                                             // try 2
  return 1;                                                               // else single
}

/* ---------------------------------------------------------
   _pickRandomSubset(arr, k)
   Purpose: Random distinct subset (Fisher–Yates)
---------------------------------------------------------- */
function _pickRandomSubset(arr, k) {
  const a = arr.slice();                                                  // copy
  const n = Math.min(k, a.length);                                        // count
  for (let i = 0; i < n; i++) {                                           // partial shuffle
    const j = i + Math.floor(Math.random() * (a.length - i));                // random index
    [a[i], a[j]] = [a[j], a[i]];                                          // swap
  }
  return a.slice(0, n);                                                   // take n
}

/* ------------------------------------------------------------
   injectChordsForLevel (RANDOM)
   Purpose: Duplicate some events into other lanes at same time
------------------------------------------------------------- */
function injectChordsForLevel(baseEvents, level) {
  if (!Array.isArray(baseEvents) || baseEvents.length === 0) return baseEvents; // guard
  const L = Number(level) || 1;                                           // level
  const { max, p2, p3, p4 } = _probPolicyForLevel(L);                     // policy
  if (L < 3 || max <= 1) return baseEvents;                               // no chords

  const clusterCount = Object.create(null);                                // key→count
  const clusterDirs  = Object.create(null);                                // key→Set

  // pre-count existing simultaneity
  for (const ev of baseEvents) {
    const key = _clusterKey(ev);                                          // cluster key
    const dir = String(ev.dir ?? ev.direction ?? '').toLowerCase();       // lane
    if (!ALL_DIRS.includes(dir)) continue;                                // guard
    if (!clusterCount[key]) { clusterCount[key] = 0; clusterDirs[key] = new Set(); } // init
    if (!clusterDirs[key].has(dir)) { clusterCount[key]++; clusterDirs[key].add(dir); } // mark
  }

  const out = [];                                                         // result

  for (const ev of baseEvents) {
    out.push(ev);                                                         // keep original

    const key = _clusterKey(ev);                                          // time cluster
    const baseDir = String(ev.dir ?? ev.direction ?? '').toLowerCase();   // lane
    if (!ALL_DIRS.includes(baseDir)) continue;                            // guard

    const usedSet = clusterDirs[key] || new Set();                         // used lanes
    const current = clusterCount[key] || 0;                                // already in cluster
    const capacity = Math.max(0, max - current);                           // room left
    if (capacity <= 0) continue;                                           // no room

    const desiredSize = _sampleChordSize({ p2, p3, p4 });                  // desired chord size
    const extrasWanted = Math.max(0, Math.min(desiredSize - 1, capacity)); // extra notes count
    if (extrasWanted <= 0) continue;                                       // skip

    const candidates = ALL_DIRS.filter(d => d !== baseDir && !usedSet.has(d)); // lanes left
    const picks = _pickRandomSubset(candidates, extrasWanted);             // random picks

    for (const d of picks) {
      const clone = { ...ev, dir: d };                                     // clone event
      if ('direction' in ev && !('direction' in clone)) clone.direction = d; // mirror alt field
      out.push(clone);                                                     // add clone
      if (!clusterCount[key]) { clusterCount[key] = 0; clusterDirs[key] = new Set(); } // ensure
      clusterCount[key] += 1;                                              // inc count
      clusterDirs[key].add(d);                                             // mark lane used
    }
  }

  return out;                                                              // done
}

/* ------------------------------------------------------------
   _makeEventTimeGetter(bpm, rate)
   Purpose: Map chart event → ms from audio start (rate-scaled)
------------------------------------------------------------- */
function _makeEventTimeGetter(bpm, rate) {
  const msPerBeatEff = (60000 / bpm) / rate;                               // ms/beat eff
  return (ev) => {
    if (Number.isFinite(ev.t))      return ev.t / rate;                    // normalized ms (divide by rate)
    if (Number.isFinite(ev.beat))   return ev.beat * msPerBeatEff;         // beats → ms
    if (Number.isFinite(ev.timeMs)) return ev.timeMs / rate;               // raw ms (divide by rate)
    if (Number.isFinite(ev.time))   return ev.time / rate;                 // alt ms
    return null;                                                           // no time
  };
}

/* -------------------------------------------------------------
   _primeHtmlAudio(path, rate)
   Purpose: Create & prime <audio>, rate and volume applied
-------------------------------------------------------------- */
function _primeHtmlAudio(songAudioPath, rate) {
  audio = new Audio(songAudioPath);                                        // create element
  audio.preload = 'auto';                                                  // hint to browser
  audio.playbackRate = rate;                                               // set playbackRate (>=1.0)
  __uiVolume = getSavedVolume();                                           // read UI volume
  audio.volume = __uiVolume;                                               // apply volume
  return audio;                                                            // return element
}

/* ----------------------------------------------------------------
   _waitMetadata(aud)
   Purpose: Resolve once metadata is ready (duration known)
----------------------------------------------------------------- */
function _waitMetadata(aud) {
  return new Promise((resolve) => {
    if (!aud) return resolve(false);                                       // guard
    if (Number.isFinite(aud.duration) && aud.duration > 0) return resolve(true); // already ready
    const on = () => { aud.removeEventListener('loadedmetadata', on); resolve(true); }; // handler
    aud.addEventListener('loadedmetadata', on);                             // wait once
    // safety timeout in case metadata never fires
    setTimeout(() => resolve(false), 500);                                  // fallback after 500ms
  });
}

/* ------------------------------------------------------------------------
   _computeGroupIds(events, getEventTimeMs, offsetEff)
   Purpose: Same-time events share a gid so scoring can group combos
------------------------------------------------------------------------- */
function _computeGroupIds(events, getEventTimeMs, offsetEff) {
  const keyToGid = new Map();                                             // key→gid
  let nextGid = 1;                                                         // counter
  const gids = new Array(events.length);                                   // result
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];                                                  // event
    const t = getEventTimeMs(ev);                                          // time rel 0
    if (!Number.isFinite(t)) { gids[i] = 0; continue; }                    // no group
    const judgeMs = offsetEff + t;                                         // judge time
    const key = Math.round(judgeMs);                                       // bucket ms
    let gid = keyToGid.get(key);                                           // lookup
    if (!gid) { gid = nextGid++; keyToGid.set(key, gid); }                 // assign
    gids[i] = gid;                                                         // store
  }
  return gids;                                                             // return map
}

/* ---------------------------------------------------------------------------------------
   _scheduleAllEvents(...)
   Purpose: Schedule spawns for every event (with gid). Supports baseOffsetMs for loops.
---------------------------------------------------------------------------------------- */
function _scheduleAllEvents(
  events,
  startWallMs,
  offsetEff,
  travelMs,
  travelBeatsEff,
  bpmRateScaled,
  getEventTimeMs,
  baseOffsetMs = 0
) {
  const gids = _computeGroupIds(events, getEventTimeMs, offsetEff + baseOffsetMs); // gid per event
  const getDir = (ev) => String(ev.dir ?? ev.direction ?? '').toLowerCase();       // lane helper

  events.forEach((ev, idx) => {                                            // iterate events
    const dir = getDir(ev);                                                // lane
    if (!['left','up','down','right'].includes(dir)) return;               // guard

    const eventTime = getEventTimeMs(ev);                                   // time rel 0
    if (!Number.isFinite(eventTime)) return;                                // guard

    const targetMs   = baseOffsetMs + offsetEff + eventTime;                // judge moment
    const spawnDelay = Math.max(0, targetMs - travelMs);                    // delay until spawn
    const dueAt      = startWallMs + spawnDelay;                            // wall time
    const delay      = Math.max(0, dueAt - performance.now());              // non-negative
    const gid        = gids[idx] || 0;                                      // group id

    const tid = setTimeout(() => {                                          // schedule
      spawnJudgedNote(dir, travelBeatsEff, bpmRateScaled, gid);             // spawn with gid
    }, delay);
    timers.push(tid);                                                       // keep id
  });

  // compute last event ms for this batch
  const lastEventMs = events.reduce((max, ev) => {
    const t = getEventTimeMs(ev);                                          // time rel 0
    return Number.isFinite(t) ? Math.max(max, t) : max;                    // max
  }, 0);

  return lastEventMs;                                                      // return for cutoff
}

/* --------------------------------------------------------------------
   _scheduleChartCutoff(...)
   Purpose: Hard stop a little after last note so overlays can show
--------------------------------------------------------------------- */
function _scheduleChartCutoff(lastEventMs, startWallMs, offsetEff, travelMs, baseOffsetMs = 0) {
  if (!Number.isFinite(lastEventMs) || lastEventMs <= 0) return;            // guard
  const stopPadMs   = Math.round(travelMs * 0.70);                           // pad so last note clears
  const plannedStop = baseOffsetMs + offsetEff + lastEventMs + stopPadMs;    // stop timeline ms
  const stopDueAt   = startWallMs + plannedStop;                             // wall time
  const stopDelay   = Math.max(0, stopDueAt - performance.now());            // non-negative
  const tid = setTimeout(() => {                                             // timer
    log('chart cutoff reached → stopping song');                              // log
    stopSong('completed');                                                   // stop
  }, stopDelay);
  timers.push(tid);                                                          // keep id
}

/**
 * startSongById()
 * Load audio + chart, apply difficulty, schedule note spawns,
 * and optionally loop until minDurationSec is met.
 * Structured with section headers for readability.
 */
async function startSongById(id, { countdownSec = 0, travelBeats } = {}) {

  /* ---------------------------------------------
   * 0) Fresh start: reset cancellation flag
   * Ensures pause-during-countdown can abort safely.
   --------------------------------------------- */
  _cancelPendingStart = false;

  /* ---------------------------------------------
   * 1) Resolve song, chart and level timing
   * Picks correct song, loads chart, derives timing.
   --------------------------------------------- */
  const song = _pickSongById(id);
  if (!song) throw new Error('No songs in registry');

  const { chart, bpm, chartTravelBeats, offsetMs } =
    await _loadChartStrict(song);

  const lvlCfg = LEVELS?.[state.level] || LEVELS?.[1] || {};
  const { rate, travelBeatsEff, travelMs } =
  _deriveLevelTiming(bpm, chartTravelBeats, lvlCfg, travelBeats);

  /* ---------------------------------------------
   * 2) Build event list
   * Simplifies chart for level + injects random chords.
   --------------------------------------------- */
  const events = (function buildEvents() {
    let simplified = [];
    try {
      if (typeof simplifyChartForLevel === 'function') {
        simplified = simplifyChartForLevel(chart.notes || [], bpm, lvlCfg) || [];
      }
    } catch (e) {
      log('simplifyChartForLevel failed, using raw notes:', e);
    }

    const rawNotes = Array.isArray(chart.notes) ? chart.notes : [];
    const base     = simplified.length ? simplified : rawNotes;

    return typeof injectChordsForLevel === 'function' ? injectChordsForLevel(base, state.level) : base;
  })();

  log('bpm=', bpm, 'travelBeatsEff=', travelBeatsEff, 'events=', events.length);

  /* ---------------------------------------------
   * 3) Prime audio + store metadata + emit "ready"
   --------------------------------------------- */
  _primeHtmlAudio(song.audio, rate);
  current = { song, chart, bpm, travelBeats: travelBeatsEff, offsetMs };
  emit('song:ready', { song });

  /* ---------------------------------------------
   * 4) Optional pre-roll countdown
   --------------------------------------------- */
  if (countdownSec > 0) {
    await new Promise(r => setTimeout(r, countdownSec * 1000));
  }

  /* ---------------------------------------------
   * 5) Guard: user paused during countdown
   * Cancel cleanly before metadata/audio.play().
   --------------------------------------------- */
  if (_cancelPendingStart) {
    log('start cancelled before metadata/audio.play');
    _cancelPendingStart = false;
    try { if (audio) audio.pause(); } catch {}
    audio = null;
    clearTimers();
    current = null;
    return;
  }

  /* ---------------------------------------------
   * 6) Read metadata + second cancel guard
   --------------------------------------------- */
  await _waitMetadata(audio);

  if (_cancelPendingStart) {
    log('start cancelled after metadata, before audio.play');
    _cancelPendingStart = false;
    try { if (audio) audio.pause(); } catch {}
    audio = null;
    clearTimers();
    current = null;
    return;
  }

  /* ---------------------------------------------
   * 7) Start playback + emit "started"
   --------------------------------------------- */
  const audioCycleMs =
    (Number.isFinite(audio?.duration) && audio.duration > 0) ? Math.round((audio.duration * 1000) / rate) : 0;

  try {
    await audio.play();
  } catch (err) {
    emit('song:error', { error: err });
    throw err;
  }

  emit('song:started', { song });

  /* ---------------------------------------------
   * 8) Schedule note spawns + loop logic
   * First loop → optional extra loops → final cutoff.
   --------------------------------------------- */
  clearTimers();

  const startWallMs    = performance.now();
  const offsetEff      = offsetMs / rate;
  const bpmRateScaled  = bpm * rate;
  const getEventTimeMs = _makeEventTimeGetter(bpm, rate);

  // First loop events 
  const lastEventMsFirst = _scheduleAllEvents(
    events,
    startWallMs,
    offsetEff,
    travelMs,
    travelBeatsEff,
    bpmRateScaled,
    getEventTimeMs,
    0
  );

   // Compute cycle duration 
  const stopPadMs   = Math.round(travelMs * 0.70);
  const chartSpanMs = offsetEff + lastEventMsFirst + stopPadMs;
  const cycleMs     = audioCycleMs > 0 ? audioCycleMs : chartSpanMs;

  const minDurMs    = Math.max(0, Math.floor((lvlCfg?.minDurationSec || 0) * 1000));
  const loopsNeeded = Math.max(1, Math.ceil((minDurMs || chartSpanMs) / cycleMs));

  log('cycleMs=', cycleMs, 'minDurMs=', minDurMs, 'loopsNeeded=', loopsNeeded);

  // Multi-loop scheduling 
  if (loopsNeeded > 1) {
    if (audio) audio.loop = true;

    for (let i = 1; i < loopsNeeded; i++) {
      const baseOffsetMs = i * cycleMs;
      _scheduleAllEvents(
        events,
        startWallMs,
        offsetEff,
        travelMs,
        travelBeatsEff,
        bpmRateScaled,
        getEventTimeMs,
        baseOffsetMs
      );
    }

    const finalBase = (loopsNeeded - 1) * cycleMs;
    _scheduleChartCutoff(
      lastEventMsFirst,
      startWallMs,
      offsetEff,
      travelMs,
      finalBase
    );
  } else {
    _scheduleChartCutoff(
      lastEventMsFirst,
      startWallMs,
      offsetEff,
      travelMs,
      0
    );
  }

  /* ---------------------------------------------
   * 9) Safety handler: ensure stop on audio ended
   * Prevents rare cases where cutoff never fires.
   --------------------------------------------- */
  audio.addEventListener('ended', () => stopSong('completed'), { once: true });
}


/* --------------------------------------------------------
   stopSong(reason)
   Purpose: Stop audio, clear timers, emit song:ended
--------------------------------------------------------- */
function stopSong(reason = 'stopped') {
  try { if (audio) { audio.loop = false; audio.pause(); } } catch {}        // stop & disable loop
  audio = null;                                                             // drop ref
  clearTimers();                                                            // cancel timers
  emit('song:ended', { reason, song: current ? current.song : null });      // route end
  current = null;                                                           // clear current meta
}

/* ------------------------------------------------------------------
   startSongForLevel(level, options)
   Purpose: Resolve song id from mapping and start the player
------------------------------------------------------------------- */
async function startSongForLevel(level, options) {
  const song = getSongForLevel(level);                                      // resolve by level
  return startSongById(song?.id, options);                                   // forward to loader
}

/* ---- exports ---- */
export { stopSong, startSongForLevel, cancelPendingStart, };
