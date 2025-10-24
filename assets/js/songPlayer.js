// Minimal chart-driven song player: loads audio + chart and schedules orb spawns.

import { SONGS } from './songRegistry.js';
import { spawnJudgedNote } from './scoring.js';

let audio = null;             // active HTMLAudioElement
let timers = [];              // scheduled setTimeout ids
let current = null;           // { song, chart, bpm, travelBeats, offsetMs }

/** Dispatch a DOM CustomEvent so game.js/ui.js can react (overlay/countdown etc). */
function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
/**
 * Start a song by id (or first in registry if id is undefined).
 * Options:
 *  - countdownSec: number (optional visual delay before audio starts)
 *  - travelBeats:  number (override chart.travelBeats for spawn timing)
 */
export async function startSongById(id, { countdownSec = 0, travelBeats } = {}) {
  // Pick song
  const song = id
    ? SONGS.find(s => s.id === id)
    : (Array.isArray(SONGS) && SONGS[0]);
  if (!song) throw new Error('No songs in registry');

  // Load chart JSON
  const chartRes = await fetch(song.chart);
  if (!chartRes.ok) throw new Error(`Failed to load chart: ${song.chart}`);
  const chart = await chartRes.json();

  // Validate timing params
  const bpm = Number(chart.bpm);
  if (!Number.isFinite(bpm)) throw new Error('Chart missing valid bpm');
  const tb = Number.isFinite(travelBeats) ? Number(travelBeats) : (chart.travelBeats ?? 2.0);
  const offsetMs = chart.offsetMs ?? 0;

  // Prepare audio element
  audio = new Audio(song.audio);
  audio.preload = 'auto';

  current = { song, chart, bpm, travelBeats: tb, offsetMs };

  // Notify UI that we’re ready (good moment to show “3..2..1”)
  emit('song:ready', { song });

  // Optional countdown before starting audio
  if (countdownSec > 0) {
    await new Promise(r => setTimeout(r, countdownSec * 1000));
  }

  // Start audio (play() must be user-initiated in most browsers — your CTA click handles that)
  await audio.play();
  emit('song:started', { song });

  // Schedule note spawns
  const startAt = performance.now();       // ms timestamp baseline
  const msPerBeat = 60000 / bpm;
  const travelMs = tb * msPerBeat;         // how long an orb needs to reach the judge line

  // Clear any leftover timers from a previous run
  timers.forEach(t => clearTimeout(t));
  timers = [];

  // Helper: schedule a single note
  const scheduleOne = (note) => {
    const dir = String(note.dir || '').toLowerCase();
    if (!['left', 'up', 'down', 'right'].includes(dir)) return;

    // Target judge time relative to song start
    const targetMs = offsetMs + (note.timeMs ?? note.time ?? 0);

    // Spawn earlier by the travel time so orb arrives at the judge line on targetMs
    const spawnDelay = Math.max(0, targetMs - travelMs);
    const dueAt = startAt + spawnDelay;
    const delay = Math.max(0, dueAt - performance.now());

    const tId = setTimeout(() => {
      spawnJudgedNote(dir, tb, bpm);
    }, delay);
    timers.push(tId);
  };

  (chart.notes || []).forEach(scheduleOne);

  // When audio ends, stop everything
  audio.addEventListener('ended', () => {
    stopSong();
  }, { once: true });
}

/** Stop playback and clear any scheduled spawns. */
export function stopSong() {
  if (audio) {
    try { audio.pause(); } catch {}
    audio = null;
  }
  timers.forEach(t => clearTimeout(t));
  timers = [];
  emit('song:ended', current ? { song: current.song } : {});
  current = null;
}