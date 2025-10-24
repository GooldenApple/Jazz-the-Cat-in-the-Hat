/**
 * songPlayer.js — drive chart-based spawns against the Web Audio clock
 *
 * Flow:
 * 1) startSongById('some-id') → looks up song in registry.
 * 2) Loads chart JSON and audio buffer.
 * 3) Starts audio; ticks a lightweight scheduler that spawns notes
 *    exactly when (note.t + offsetMs - leadMs) <= songTimeMs.
 * 4) Emits window events: 'song:ready', 'song:started', 'song:ended'.
 *
 * Policy:
 * - Only chart-driven spawns; no random spawner here.
 * - Natural misses (no input) are handled in scoring's animationend handler.
 * - Input misses cost hearts; handled in gradeHit().
 */

import { getSongById, getFirstSong } from './songRegistry.js';       // Song lookup
import { loadChart, computeSpawnLeadMs } from './chartLoader.js';    // Chart I/O + helpers
import { loadAudioBuffer, unlockAudio, playBuffer, stop,            // Web Audio helpers
         getSongTimeMs, isPlaying } from './audio.js';
import { spawnJudgedNote } from './scoring.js';                      // Visual+judged note spawner

// ---- Internal runtime state -------------------------------------------------
let _timer = null;                       // Interval handle for the scheduler tick
let _chart = null;                       // Last loaded chart object
let _spawnIdx = 0;                       // Index of the next note to spawn
let _leadMs = 0;                         // Pre-roll time so notes reach the judge line
let _travelBeats = 2.0;                  // How many beats a note travels (for spawn lead)
let _status = 'idle';                    // 'idle'|'loading'|'ready'|'playing'|'ended'|'error'
let _currentSongId = null;               // ID of the song currently prepared/playing

// ---- Small helpers ----------------------------------------------------------

/** Clear the interval/timer if active. */
function clearTick() {                   // Stop the scheduler loop
  if (_timer) {                          // If a timer exists
    clearInterval(_timer);               // Clear the setInterval
    _timer = null;                       // Drop reference
  }
}

/** Dispatch a DOM CustomEvent for external UI */
function emit(name, detail = {}) {       // Broadcast status to the app (non-blocking)
  window.dispatchEvent(new CustomEvent(name, { detail })); // Fire event on window
}

// ---- Core scheduler ---------------------------------------------------------

/**
 * tick()
 * Called ~60fps while the song is playing.
 * Spawns all notes whose spawn time has passed.
 */
function tick() {                                                // One scheduling step
  if (!_chart) return;                                           // Guard: nothing loaded
  const nowMs = getSongTimeMs();                                 // Current audio clock in ms
  if (nowMs <= 0) return;                                        // Not started yet (pre-roll)

  // Spawn while we have due notes
  while (_spawnIdx < _chart.notes.length) {                      // Notes remaining
    const n = _chart.notes[_spawnIdx];                           // Next note
    const spawnAt = (n.t + (_chart.offsetMs || 0)) - _leadMs;    // Time must spawn this note

    if (spawnAt <= nowMs) {                                      // Due: time passed for spawn
      spawnJudgedNote(n.dir, _travelBeats, _chart.bpm);          // Create a judged note in lane
      _spawnIdx += 1;                                            // Advance index
      continue;                                                  // Try spawning next (if also due)
    }
    break;                                                       // Next note is in the future → stop
  }

  // If all notes spawned and audio finished, end the run
  if (_spawnIdx >= _chart.notes.length && !isPlaying()) {        // No more notes; audio has ended
    clearTick();                                                 // Stop ticking
    _status = 'ended';                                           // Mark status
    emit('song:ended', { id: _currentSongId });                  // Notify UI
  }
}

// ---- Public API -------------------------------------------------------------

/**
 * startSongById(songId, opts)
 * Look up a song from registry and start it.
 */
export async function startSongById(songId, opts = {}) {         // Entry by ID 
  const song = getSongById(songId) || getFirstSong();            // Resolve song or fallback to first
  if (!song) throw new Error('No songs registered');             // Hard guard if registry is empty
  return startSong(song, opts);                                  // Defer to startSong()
}

/**
 * startSong(song, opts)
 * Load chart + audio, compute spawn lead, then start audio and scheduler.
 */
export async function startSong(song, opts = {}) {               // Main entry with song object
  // Normalize options
  _travelBeats = Math.max(0.25, Number(opts.travelBeats ?? 2.0));  // Clamp sensible travel beats
  const countdownSec = Math.max(0, Number(opts.countdownSec ?? 0));// pre-start delay (UI later)

  // Reset previous state
  stopSong();                                                    // Stop audio + timer if any (safe no-op)
  _status = 'loading';                                           // Mark as loading
  _currentSongId = song.id || null;                              // Track current song id
  emit('song:loading', { id: _currentSongId });                  // Inform UI

  try {
    // Prepare audio context (must follow a user gesture in some browsers)
    await unlockAudio();                                         // Resume/satisfy autoplay policies

    // Load resources
    _chart = await loadChart(song.chart);                        // Fetch/parse chart JSON
    await loadAudioBuffer(song.audio);                           // Fetch/decode audio → AudioBuffer

    // Compute spawn lead from chart tempo + travel beats
    _leadMs = computeSpawnLeadMs(_travelBeats, _chart.bpm);      // e.g., 2 beats at 120 BPM = 1000ms
    _spawnIdx = 0;                                               // Start from first note

    // Ready state (before we actually start playback)
    _status = 'ready';                                           // Loaded but not started
    emit('song:ready', { id: _currentSongId, bpm: _chart.bpm }); // Notify UI (for countdown, etc.)

    // Start audio and start ticking
    playBuffer(undefined, countdownSec);                         // Start/schedule playback
    _status = 'playing';                                         // We are now playing
    emit('song:started', { id: _currentSongId });                // Inform UI it started
    _timer = setInterval(tick, 16);                              // ~60fps scheduler
  } catch (err) {
    _status = 'error';                                           // Mark failure
    clearTick();                                                 // Ensure timer is off
    stop();                                                      // Stop any half-started audio
    console.error('[songPlayer] start failed:', err);            // Log to console for debugging
    emit('song:error', { id: _currentSongId, error: String(err) });// Notify UI about the error
    throw err;                                                   // Re-throw for callers if needed
  }
}

/** Stop current song playback and scheduler . */
export function stopSong() {                                     // Public stop
  clearTick();                                                   // Kill scheduler if running
  try { stop(); } catch {}                                       // Stop audio (ignore errors)
  _status = 'idle';                                              // Reset status to idle
  _spawnIdx = 0;                                                 // Reset index
  _chart = null;                                                 // Drop chart
  _currentSongId = null;                                         // Drop id
}

/** Return whether a song is currently playing. */
export function isSongPlaying() {                                // Playing status for UI
  return _status === 'playing';                                  // True only while ticking is active
}

/** Lightweight accessor for progress (ms since audio start). */
export function getSongProgressMs() {                            // Progress for HUD/UX if needed
  return getSongTimeMs();                                        // Delegate to audio clock
}

/** Expose internal status string (debug/UX). */
export function getSongStatus() {                                // For debug panels
  return _status;                                                // 'idle'|'loading'|'ready'|'playing'|'ended'|'error'
}
