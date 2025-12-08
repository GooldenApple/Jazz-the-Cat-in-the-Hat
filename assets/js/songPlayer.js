// songplayer.js
// Minimal chart-driven song player: loads audio + chart and schedules orb spawns.

import { SONGS, getSongForLevel } from './songRegistry.js';
import { spawnJudgedNote, state, setJudgeWindows } from './scoring.js';
import { LEVELS, simplifyChartForLevel } from './difficulty.js';
import './audio.js';

let audio = null;        // active HTMLAudioElement instance
let timers = [];         // list of active setTimeout ids
let current = null;      // current song metadata (song, chart, bpm, travelBeats, offsetMs)
let _cancelPendingStart = false;  // flag to abort an in-flight start
let __uiVolume = 1;      // cached UI volume (0..1)

const DEBUG = true;      // set false to mute logs
const log = (...a) => { if (DEBUG) console.log('[song]', ...a); };
const ALL_DIRS = ['left', 'up', 'down', 'right'];

/**
 * Mark the current in-flight start as cancelled.
 * Used when the player pauses during the "starting" countdown.
 */
function cancelPendingStart() {
  _cancelPendingStart = true;
}

/**
 * Read saved volume (0..1) from settings in localStorage.
 * Respects muted flag and clamps the final value.
 */
function getSavedVolume() {
  try {
    const s = JSON.parse(localStorage.getItem('settings') || '{}'); // read settings object
    const v = s && s.muted ? 0 : (typeof s.volume === 'number' ? s.volume : 0.8); // resolve volume
    return Math.max(0, Math.min(1, Number(v) || 0)); // clamp to 0..1
  } catch (_) {
    return 0.8; // safe fallback
  }
}

/**
 * Apply master volume changes to the HTMLAudioElement.
 * Listens to `audio:setMasterVolume` so UI can stay decoupled.
 */
window.addEventListener('audio:setMasterVolume', (e) => {
  const v = (e && e.detail && typeof e.detail.volume === 'number') ? e.detail.volume : 0;
  __uiVolume = Math.max(0, Math.min(1, Number(v) || 0)); // clamp again for safety
  if (audio) audio.volume = __uiVolume;                  // apply to active element
});

// Emit a CustomEvent on window with the given name and detail.

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// Cancel all scheduled timeouts and clear the internal timer list.

function clearTimers() {
  for (const t of timers) clearTimeout(t); // cancel each timer
  timers.length = 0;                       // reset array
}

// Return a song entry by id, or the first available song if no id is given.

function _pickSongById(id) {
  return id ? SONGS.find((s) => s.id === id) : (Array.isArray(SONGS) && SONGS[0]);
}

/**
 * Fetch and parse the chart JSON for a song, validating bpm and timing fields.
 * Returns chart data plus bpm, travelBeats and offsetMs.
 */
async function _loadChartStrict(song) {
  const res = await fetch(song.chart);                           // load chart JSON
  if (!res.ok) throw new Error(`Failed to load chart: ${song.chart}`);

  const chart = await res.json();                                // parse content
  const bpm = Number(chart.bpm);                                 // read bpm
  if (!Number.isFinite(bpm)) throw new Error('Chart is missing a valid bpm');

  const chartTravelBeats = Number.isFinite(chart.travelBeats) ? chart.travelBeats : 2.0;
  const offsetMs = Number.isFinite(chart.offsetMs) ? chart.offsetMs : 0;

  return { chart, bpm, chartTravelBeats, offsetMs };
}

/**
 * Derive effective timing for the current level.
 * Applies judge windows, playbackRate (never < 1.0) and fall time in ms.
 */
function _deriveLevelTiming(bpm, chartTravelBeats, levelConfig, travelBeatsOverride) {
  if (levelConfig && levelConfig.windows) {
    setJudgeWindows(levelConfig.windows); // push level-specific windows into scoring
  }

  const rawRate = Number.isFinite(levelConfig?.playbackRate) ? levelConfig.playbackRate : 1.0;
  const rate = Math.max(1.0, rawRate); // never slow the track down

  const travelBeatsEff =
    (typeof travelBeatsOverride === 'number')
      ? travelBeatsOverride                                  // override from caller
      : (typeof levelConfig?.travelBeats === 'number'
          ? levelConfig.travelBeats                          // level config
          : chartTravelBeats);                               // chart default

  const msPerBeatEff = (60000 / bpm) / rate;                 // ms per beat at this rate
  const travelMs = travelBeatsEff * msPerBeatEff;            // fall duration in ms

  return { rate, travelBeatsEff, msPerBeatEff, travelMs };
}

/**
 * Build a stable key for grouping events that belong to the same time cluster.
 * Used later to assign gid for chords.
 */
function _clusterKey(ev) {
  if (Number.isFinite(ev.t))      return `t:${ev.t}`;
  if (Number.isFinite(ev.timeMs)) return `ms:${ev.timeMs}`;
  if (Number.isFinite(ev.beat))   return `b:${ev.beat}`;
  if (Number.isFinite(ev.time))   return `tm:${ev.time}`;
  return `x:${Math.random()}`; // rare fallback
}

/**
 * Compute probability caps for chord sizes for a given level.
 * Uses LEVELS config where available and clamps by maxSimultaneous.
 */
function _probPolicyForLevel(level) {
  const cfg = (typeof LEVELS === 'object' && LEVELS?.[level]) || {};
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  let max = level >= 11 ? 4 : level >= 8 ? 3 : level >= 3 ? 2 : 1; // default cap per tier
  if (Number.isFinite(cfg.maxSimultaneous)) {
    max = clamp(cfg.maxSimultaneous, 1, 4); // respect config while clamping
  }

  let p2 = 0;
  let p3 = 0;
  let p4 = 0;

  if (level >= 3 && level <= 4) { p2 = 0.20; }
  else if (level <= 6)          { p2 = 0.30; }
  else if (level <= 8)          { p2 = 0.35; p3 = 0.08; }
  else if (level <= 10)         { p2 = 0.40; p3 = 0.12; }
  else if (level <= 12)         { p2 = 0.45; p3 = 0.18; p4 = 0.03; }
  else                          { p2 = 0.50; p3 = 0.25; p4 = 0.06; }

  if (max < 4) p4 = 0;
  if (max < 3) p3 = 0;
  if (max < 2) p2 = 0;

  return { max, p2, p3, p4 };
}

// Sample a chord size (1–4) based on probability policy.

function _sampleChordSize({ p2, p3, p4 }) {
  let r = Math.random();
  if (p4 && r < p4) return 4;
  r -= p4 || 0;
  if (p3 && r < p3) return 3;
  r -= p3 || 0;
  if (p2 && r < p2) return 2;
  return 1;
}

/**
 * Return a random distinct subset of size k from an array.
 * Uses a partial Fisher–Yates shuffle.
 */
function _pickRandomSubset(arr, k) {
  const a = arr.slice();                  // copy array so we do not mutate input
  const n = Math.min(k, a.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i)); // random index
    [a[i], a[j]] = [a[j], a[i]];           // swap elements
  }
  return a.slice(0, n);
}

/**
 * Inject extra chord notes for a given level by duplicating events into other lanes.
 * Only runs from level 3 and up, respecting maxSimultaneous caps.
 */
function injectChordsForLevel(baseEvents, level) {
  if (!Array.isArray(baseEvents) || baseEvents.length === 0) return baseEvents;

  const L = Number(level) || 1;
  const { max, p2, p3, p4 } = _probPolicyForLevel(L);
  if (L < 3 || max <= 1) return baseEvents; // nothing to inject

  const clusterCount = Object.create(null); // key → count
  const clusterDirs = Object.create(null);  // key → Set of used dirs

  // First pass: measure existing simultaneity for each cluster
  for (const ev of baseEvents) {
    const key = _clusterKey(ev);
    const dir = String(ev.dir ?? ev.direction ?? '').toLowerCase();
    if (!ALL_DIRS.includes(dir)) continue;

    if (!clusterCount[key]) {
      clusterCount[key] = 0;
      clusterDirs[key] = new Set();
    }

    if (!clusterDirs[key].has(dir)) {
      clusterCount[key] += 1;
      clusterDirs[key].add(dir);
    }
  }

  const out = [];

  // Second pass: decide where to inject extra chord lanes
  for (const ev of baseEvents) {
    out.push(ev); // keep the original event

    const key = _clusterKey(ev);
    const baseDir = String(ev.dir ?? ev.direction ?? '').toLowerCase();
    if (!ALL_DIRS.includes(baseDir)) continue;

    const usedSet = clusterDirs[key] || new Set();
    const currentCount = clusterCount[key] || 0;
    const capacity = Math.max(0, max - currentCount);
    if (capacity <= 0) continue; // cluster already full

    const desiredSize = _sampleChordSize({ p2, p3, p4 });
    const extrasWanted = Math.max(0, Math.min(desiredSize - 1, capacity));
    if (extrasWanted <= 0) continue;

    const candidates = ALL_DIRS.filter((d) => d !== baseDir && !usedSet.has(d));
    const picks = _pickRandomSubset(candidates, extrasWanted);

    for (const d of picks) {
      const clone = { ...ev, dir: d }; // clone event with new lane
      if ('direction' in ev && !('direction' in clone)) clone.direction = d;
      out.push(clone);

      if (!clusterCount[key]) {
        clusterCount[key] = 0;
        clusterDirs[key] = new Set();
      }
      clusterCount[key] += 1;
      clusterDirs[key].add(d);
    }
  }

  return out;
}

/**
 * Create a function that maps a chart event to time in milliseconds from audio start.
 * Takes bpm and playback rate into account.
 */
function _makeEventTimeGetter(bpm, rate) {
  const msPerBeatEff = (60000 / bpm) / rate;
  return (ev) => {
    if (Number.isFinite(ev.t))      return ev.t / rate;         // normalized ms
    if (Number.isFinite(ev.beat))   return ev.beat * msPerBeatEff;
    if (Number.isFinite(ev.timeMs)) return ev.timeMs / rate;
    if (Number.isFinite(ev.time))   return ev.time / rate;
    return null;
  };
}

/**
 * Create and configure an HTMLAudioElement for the given song path.
 * Applies playbackRate and initial volume.
 */
function _primeHtmlAudio(songAudioPath, rate) {
  audio = new Audio(songAudioPath);
  audio.preload = 'auto';
  audio.playbackRate = rate;     // enforce effective rate (>= 1.0)
  __uiVolume = getSavedVolume(); // load UI volume
  audio.volume = __uiVolume;     // apply volume
  return audio;
}

/**
 * Resolve when audio metadata (like duration) is available.
 * Returns false if metadata never arrives within a short timeout.
 */
function _waitMetadata(aud) {
  return new Promise((resolve) => {
    if (!aud) return resolve(false);
    if (Number.isFinite(aud.duration) && aud.duration > 0) return resolve(true);

    const on = () => {
      aud.removeEventListener('loadedmetadata', on);
      resolve(true);
    };
    aud.addEventListener('loadedmetadata', on);

    setTimeout(() => resolve(false), 500); // safety timeout
  });
}

/**
 * Compute group ids (gid) for events that share the same judge time.
 * Used so scoring can treat simultaneous hits as one combo cluster.
 */
function _computeGroupIds(events, getEventTimeMs, offsetEff) {
  const keyToGid = new Map();
  let nextGid = 1;
  const gids = new Array(events.length);

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const t = getEventTimeMs(ev);
    if (!Number.isFinite(t)) {
      gids[i] = 0;
      continue;
    }
    const judgeMs = offsetEff + t;
    const key = Math.round(judgeMs); // bucket by whole ms

    let gid = keyToGid.get(key);
    if (!gid) {
      gid = nextGid++;
      keyToGid.set(key, gid);
    }
    gids[i] = gid;
  }
  return gids;
}

/**
 * Schedule all note spawns for a list of events.
 * Returns the last event time in ms relative to the chart start.
 */
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
  const gids = _computeGroupIds(events, getEventTimeMs, offsetEff + baseOffsetMs);
  const getDir = (ev) => String(ev.dir ?? ev.direction ?? '').toLowerCase();

  events.forEach((ev, idx) => {
    const dir = getDir(ev);
    if (!['left', 'up', 'down', 'right'].includes(dir)) return;

    const eventTime = getEventTimeMs(ev);
    if (!Number.isFinite(eventTime)) return;

    const targetMs = baseOffsetMs + offsetEff + eventTime; // judge moment
    const spawnDelay = Math.max(0, targetMs - travelMs);   // how long until spawn
    const dueAt = startWallMs + spawnDelay;                // absolute wall-clock time
    const delay = Math.max(0, dueAt - performance.now());  // non-negative delay
    const gid = gids[idx] || 0;

    const tid = setTimeout(() => {
      spawnJudgedNote(dir, travelBeatsEff, bpmRateScaled, gid);
    }, delay);
    timers.push(tid);
  });

  const lastEventMs = events.reduce((max, ev) => {
    const t = getEventTimeMs(ev);
    return Number.isFinite(t) ? Math.max(max, t) : max;
  }, 0);

  return lastEventMs;
}

/**
 * Schedule a hard cutoff shortly after the last note.
 * Ensures overlays can show even if the audio keeps looping.
 */
function _scheduleChartCutoff(
  lastEventMs,
  startWallMs,
  offsetEff,
  travelMs,
  baseOffsetMs = 0
) {
  if (!Number.isFinite(lastEventMs) || lastEventMs <= 0) return;

  const stopPadMs = Math.round(travelMs * 0.70);                     // let last orb clear
  const plannedStop = baseOffsetMs + offsetEff + lastEventMs + stopPadMs;
  const stopDueAt = startWallMs + plannedStop;
  const stopDelay = Math.max(0, stopDueAt - performance.now());

  const tid = setTimeout(() => {
    log('chart cutoff reached → stopping song');
    stopSong('completed');
  }, stopDelay);

  timers.push(tid);
}

/**
 * Load audio + chart for a song id, apply difficulty and schedule notes.
 * Optionally waits for a pre-roll countdown and loops until minDurationSec.
 */
async function startSongById(id, { countdownSec = 0, travelBeats } = {}) {
  _cancelPendingStart = false; // fresh start; clear previous cancel flag

  const song = _pickSongById(id);
  if (!song) throw new Error('No songs in registry');

  const { chart, bpm, chartTravelBeats, offsetMs } =
    await _loadChartStrict(song);

  const lvlCfg = LEVELS?.[state.level] || LEVELS?.[1] || {};
  const { rate, travelBeatsEff, travelMs } =
    _deriveLevelTiming(bpm, chartTravelBeats, lvlCfg, travelBeats);

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
    const base = simplified.length ? simplified : rawNotes;

    // Allow extra chord injection per level if helper is present
    return typeof injectChordsForLevel === 'function'
      ? injectChordsForLevel(base, state.level)
      : base;
  })();

  log('bpm=', bpm, 'travelBeatsEff=', travelBeatsEff, 'events=', events.length);

  _primeHtmlAudio(song.audio, rate);
  current = { song, chart, bpm, travelBeats: travelBeatsEff, offsetMs };
  emit('song:ready', { song }); // tell UI that chart/audio are ready

  if (countdownSec > 0) {
    await new Promise((r) => setTimeout(r, countdownSec * 1000)); // wait pre-roll
  }

  // Guard: user hit pause during countdown → bail before play()
  if (_cancelPendingStart) {
    log('start cancelled before metadata/audio.play');
    _cancelPendingStart = false;
    try { if (audio) audio.pause(); } catch {}
    audio = null;
    clearTimers();
    current = null;
    return;
  }

  await _waitMetadata(audio);

  // Second guard: bail if pause was requested after metadata but before play
  if (_cancelPendingStart) {
    log('start cancelled after metadata, before audio.play');
    _cancelPendingStart = false;
    try { if (audio) audio.pause(); } catch {}
    audio = null;
    clearTimers();
    current = null;
    return;
  }

  const audioCycleMs =
    (Number.isFinite(audio?.duration) && audio.duration > 0)
      ? Math.round((audio.duration * 1000) / rate) // scale duration by rate
      : 0;

  try {
    await audio.play(); // start audio playback
  } catch (err) {
    emit('song:error', { error: err });
    throw err;
  }

  emit('song:started', { song });

  clearTimers(); // clear any old timers before scheduling new ones

  const startWallMs = performance.now();      // base wall-clock for scheduling
  const offsetEff = offsetMs / rate;         // rate-adjusted offset
  const bpmRateScaled = bpm * rate;          // used for spawnJudgedNote
  const getEventTimeMs = _makeEventTimeGetter(bpm, rate);

  // Schedule first loop of notes
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

  const stopPadMs = Math.round(travelMs * 0.70);
  const chartSpanMs = offsetEff + lastEventMsFirst + stopPadMs;
  const cycleMs = audioCycleMs > 0 ? audioCycleMs : chartSpanMs; // fallback to chart span

  const minDurMs = Math.max(0, Math.floor((lvlCfg?.minDurationSec || 0) * 1000));
  const loopsNeeded = Math.max(1, Math.ceil((minDurMs || chartSpanMs) / cycleMs)); // at least one loop

  log('cycleMs=', cycleMs, 'minDurMs=', minDurMs, 'loopsNeeded=', loopsNeeded);

  if (loopsNeeded > 1) {
    if (audio) audio.loop = true; // let audio loop while we schedule extra chart passes

    // Schedule additional loops of the same chart
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

  // Safety: if browser fires ended anyway, ensure we route via stopSong once.
  audio.addEventListener('ended', () => stopSong('completed'), { once: true });
}

// Stop the current song, clear timers and emit a song:ended event.

function stopSong(reason = 'stopped') {
  try {
    if (audio) {
      audio.loop = false;
      audio.pause();
    }
  } catch {}
  audio = null;
  clearTimers();
  emit('song:ended', { reason, song: current ? current.song : null });
  current = null;
}

// Resolve which song to use for a given level and start it with options.

async function startSongForLevel(level, options) {
  const song = getSongForLevel(level);     // map level → song
  return startSongById(song?.id, options); // delegate to main loader
}

// Exports for the game bootstrap and lifecycle
export {
  stopSong,
  startSongForLevel,
  cancelPendingStart,
};
