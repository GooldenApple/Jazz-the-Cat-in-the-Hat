// songplayer.js
//  Minimal chart-driven song player: loads audio + chart and schedules orb spawns.

import { SONGS } from './songRegistry.js';
import { spawnJudgedNote, state, setJudgeWindows } from './scoring.js';
import { LEVELS, simplifyChartForLevel } from './difficulty.js';
import './audio.js';


let audio = null;        // active HTMLAudioElement
let timers = [];         // active setTimeout ids
let current = null;      //  song, chart, bpm, travelBeats, offsetMs 
/* ----------------------------------------
   Volume bridge
   Purpose: Mirror Settings → HTMLAudioElement.volume (0..1)
---------------------------------------- */
let __uiVolume = 1;                                  // cached UI volume (0..1)

/* Read saved volume from localStorage ('settings') */
function getSavedVolume() {                          // returns 0..1
  try {
    const s = JSON.parse(localStorage.getItem('settings') || '{}'); // read settings
    const v = s && s.muted ? 0 : (typeof s.volume === 'number' ? s.volume : 0.8); // handle mute/volume
    return Math.max(0, Math.min(1, Number(v) || 0));               // clamp 0..1
  } catch (_) {
    return 0.8;                                                     // fallback
  }
}

/* React to Settings UI changes (ui.js → audio:setMasterVolume) */
window.addEventListener('audio:setMasterVolume', (e) => {           // listen for UI event
  const v = (e && e.detail && typeof e.detail.volume === 'number')  // extract volume
    ? e.detail.volume
    : 0;
  __uiVolume = Math.max(0, Math.min(1, Number(v) || 0));            // cache clamped value
  if (audio) audio.volume = __uiVolume;                              // apply live if audio exists
});



const DEBUG = true;      // set false to silence logs
const log = (...a) => { if (DEBUG) console.log('[song]', ...a); };

/**
 * emit(name, detail)
 * Brief: Dispatch a DOM CustomEvent so other modules can react.
 */
function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * clearTimers()
 * Brief: Clear and forget all scheduled timeouts.
 */
function clearTimers() {
  for (const t of timers) clearTimeout(t); // cancel timeout
  timers.length = 0;                        // empty list
}

/**
 * startSongById(id, options)
 * Brief: Load song + chart, apply difficulty, schedule note spawns, and play audio.
 * Options:
 *  - countdownSec?: number   visual pre-roll before audio starts
 *  - travelBeats?:  number   override fall time (beats from spawn to judge)
 */
async function startSongById(id, { countdownSec = 0, travelBeats } = {}) {
  // Pick a song from the registry
  const song = id ? SONGS.find(s => s.id === id) : (Array.isArray(SONGS) && SONGS[0]);
  if (!song) throw new Error('No songs in registry');

  // Load chart JSON
  const chartRes = await fetch(song.chart);
  if (!chartRes.ok) throw new Error(`Failed to load chart: ${song.chart}`);
  const chart = await chartRes.json();

  // Read chart timing
  const bpm = Number(chart.bpm);
  if (!Number.isFinite(bpm)) throw new Error('Chart is missing a valid bpm');
  const chartTravelBeats = Number.isFinite(chart.travelBeats) ? chart.travelBeats : 2.0;
  const offsetMs = Number.isFinite(chart.offsetMs) ? chart.offsetMs : 0;

  // Pick difficulty for the current level (fallback to level 1)
  const lvl = LEVELS?.[state.level] || LEVELS?.[1] || {};
  if (lvl && lvl.windows) setJudgeWindows(lvl.windows); // apply level-specific judge windows

  // Effective fall time (beats): options > level > chart
  const travelBeatsEff =
    typeof travelBeats === 'number'
      ? travelBeats
      : (typeof lvl.travelBeats === 'number' ? lvl.travelBeats : chartTravelBeats);

   // Prepare audio element
  audio = new Audio(song.audio);                                      // create HTMLAudioElement
  audio.preload = 'auto';                                             // load early
  audio.playbackRate = Number.isFinite(lvl.playbackRate) ? lvl.playbackRate : 1.0; // speed from level
  __uiVolume = getSavedVolume();                                      // read saved volume/mute
  audio.volume = __uiVolume;                                          // apply initial volume

  current = { song, chart, bpm, travelBeats: travelBeatsEff, offsetMs };

  // Build event list: try difficulty simplification, else raw chart notes
  let simplified = [];
  try {
    if (typeof simplifyChartForLevel === 'function') {
      simplified = simplifyChartForLevel(chart.notes || [], bpm, lvl) || [];
    }
  } catch (e) {
    log('simplifyChartForLevel failed, using raw notes:', e);
  }
  const rawNotes = Array.isArray(chart.notes) ? chart.notes : [];
  const events = (Array.isArray(simplified) && simplified.length) ? simplified : rawNotes;

  log('bpm=', bpm, 'travelBeatsEff=', travelBeatsEff, 'events=', events.length);

  // Notify UI that assets are ready (good moment to show “3..2..1..GO”)
  emit('song:ready', { song });

  // Starts playback after the optional countdown; aborts if playback was cancelled.
 
  if (countdownSec > 0) {                                                   // check if a pre-roll is requested
    await new Promise(r => setTimeout(r, countdownSec * 1000));             // wait for the 3-2-1 countdown
    }

  if (!audio) {                                                             // verify that playback wasn't cancelled
    emit('song:ended', { reason: 'paused', song });                         // notify listeners that start was aborted
    return;                                                                 // leave early to avoid calling play()
  }

  try {                                                                      // start playback safely
    await audio.play();                                                      // attempt to start the HTMLAudioElement
  } catch (err) {                                                            // catch autoplay or state errors
    emit('song:error', { error: err });                                      // broadcast the failure to the app
    throw err;                                                               // rethrow so the caller can handle it
  }

  emit('song:started', { song });                                            // confirm that audio actually started


  // Schedule spawns relative to audio start
  const startAt = performance.now();       // wall-clock reference
  const msPerBeat = 60000 / bpm;           // ms per beat
  const travelMs = travelBeatsEff * msPerBeat; // lead time so orb arrives at judge

  clearTimers(); // cancel any previous schedule

  // Convert an event to an absolute ms offset from audio start:
  // Supports fields: timeMs (ms) OR beat (beats) OR time (ms).
  const getEventTimeMs = (ev) => {
    if (Number.isFinite(ev.timeMs)) return ev.timeMs;
    if (Number.isFinite(ev.beat))   return ev.beat * msPerBeat;
    if (Number.isFinite(ev.time))   return ev.time;
    return null;
  };

  // Normalize direction field: dir | direction
  const getDir = (ev) => String(ev.dir ?? ev.direction ?? '').toLowerCase();

  // Schedule a single chart event
  const scheduleOne = (ev) => {
    const dir = getDir(ev);                                      // read lane
    if (!['left', 'up', 'down', 'right'].includes(dir)) return;  // ignore invalid

    const eventTime = getEventTimeMs(ev);                         // ms from audio start
    if (!Number.isFinite(eventTime)) return;                      // guard

  
    const targetMs = offsetMs + eventTime;                        // judge moment (ms)
    const spawnDelay = Math.max(0, targetMs - travelMs);          // delay from audio 0 → spawn
    const dueAt = startAt + spawnDelay;                           // wall-clock timestamp
    const delay = Math.max(0, dueAt - performance.now());         // non-negative delay

    const tid = setTimeout(() => {                                // schedule spawn
      spawnJudgedNote(dir, travelBeatsEff, bpm);                  // spawn orb (UI + queue)
    }, delay);
    timers.push(tid);                                             // track timeout for cleanup
  };

  events.forEach(scheduleOne); // schedule all chart events

// stop shortly after the last chart event; ensures results overlay shows
(function scheduleChartCutoff() {
  //compute last event time in ms
  const lastEventMs = events.reduce((max, ev) => {
    const t = getEventTimeMs(ev);
    return Number.isFinite(t) ? Math.max(max, t) : max;
  }, 0);

  // skip if no events
  if (!Number.isFinite(lastEventMs) || lastEventMs <= 0) return;

  //small grace so the last note clears the judge line
  const stopPadMs = Math.round(travelMs * 0.70);
  const plannedStopMs = offsetMs + lastEventMs + stopPadMs;

  // schedule hard stop on wall clock
  const stopDueAt = startAt + plannedStopMs;
  const stopDelay = Math.max(0, stopDueAt - performance.now());

  const tid = setTimeout(() => {
    log('chart cutoff reached → stopping song');
    stopSong('completed'); // end as completed to show results
  }, stopDelay);
  timers.push(tid);
})();


  // Auto-stop when the audio finishes 
  audio.addEventListener('ended', () => stopSong('completed'), { once: true });
}

// Stop playback and clear any scheduled spawns.
function stopSong(reason = 'stopped') {
  try { audio?.pause(); } catch {}
  audio = null;
  clearTimers();
  emit('song:ended', { reason, song: current ? current.song : null });
  current = null;
}

/* ---- exports ---- */
export { startSongById, stopSong };
