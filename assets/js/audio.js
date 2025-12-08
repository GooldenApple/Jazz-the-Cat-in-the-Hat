// assets/js/audio.js

/**
 * Web Audio mini-mixer for the game.
 * Centralises AudioContext, master gain, buffer loading and playback helpers.
 */

let ctx = null;
let master = null;
let src = null;
let startAt = 0;
let playing = false;
let currentBuffer = null;

/**
 * Ensures a single AudioContext + master gain node exists and returns it.
 * Creates the context lazily on first use.
 */
function ensureContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  return ctx;
}

/**
 * Tries to resume a suspended AudioContext after a user gesture.
 * Some browsers require this before any sound can be played.
 */
async function unlockAudio() {
  ensureContext();
  if (ctx.state === 'suspended') await ctx.resume();
}

/**
 * Decodes an ArrayBuffer into an AudioBuffer.
 * Supports both the modern Promise API and the older callback API.
 */
async function decodeArrayBufferToAudioBuffer(ab) {
  ensureContext();
  if (ctx.decodeAudioData.length === 1) {
    return ctx.decodeAudioData(ab);
  }
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(ab, resolve, reject);
  });
}

/**
 * Fetches and decodes an audio file, caching the result in currentBuffer.
 * Returns the decoded AudioBuffer.
 */
async function loadAudioBuffer(url) {
  ensureContext();
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  currentBuffer = await decodeArrayBufferToAudioBuffer(ab);
  return currentBuffer;
}

/**
 * Stops any current playback and clears source-related state.
 * Safe to call even if nothing is playing.
 */
function stop() {
  if (src) {
    try { src.stop(0); } catch (_) {}
    try { src.disconnect(); } catch (_) {}
  }
  src = null;
  playing = false;
  startAt = 0;
}

/**
 * Plays a given AudioBuffer (or the last loaded one) after an optional delay.
 * Returns the scheduled start time in AudioContext seconds.
 */
function playBuffer(buffer = currentBuffer, delaySec = 0) {
  ensureContext();
  if (!buffer) throw new Error('No AudioBuffer to play');

  stop();
  src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(master);

  startAt = ctx.currentTime + (delaySec || 0);
  src.start(startAt);
  playing = true;

  src.addEventListener('ended', () => {
    playing = false;
    src = null;
  }, { once: true });

  return startAt;
}

/**
 * Returns the approximate song time in milliseconds since playback started.
 * Returns 0 when nothing is currently playing.
 */
function getSongTimeMs() {
  if (!ctx || !playing) return 0;
  const t = (ctx.currentTime - startAt) * 1000;
  return t < 0 ? 0 : t;
}

/**
 * Sets the master output volume in the range 0..1.
 * Values outside the range are clamped.
 */
function setMasterVolume(v) {
  ensureContext();
  const vol = Math.max(0, Math.min(1, Number(v) || 0));
  master.gain.value = vol;
}

/**
 * Applies master volume changes from the Settings UI.
 * Listens for `audio:setMasterVolume` events so UI code does not import audio.js.
 */
window.addEventListener('audio:setMasterVolume', (e) => {
  const v = (e && e.detail && typeof e.detail.volume === 'number') ? e.detail.volume : 0;
  try { setMasterVolume(v); } catch (_) { /* context may not exist yet */ }
});

/**
 * Returns true when an AudioBuffer is currently playing.
 */
function isPlaying() {
  return !!playing;
}

/**
 * Plays a short sine beep at the current master volume.
 * Used by the Settings UI as a volume preview.
 */
function playVolumePreview() {
  ensureContext();
  const now = ctx.currentTime;

  // If the context is still suspended, resume first and then run the beep.
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => _doBeep());
    return;
  }
  _doBeep();

  // Internal helper that builds a tiny envelope (attack/decay) and plays the beep.
 
  function _doBeep() {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5 = 880 Hz

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.9 * master.gain.value, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(g);
    g.connect(master);

    osc.start(now);
    osc.stop(now + 0.14);
  }
}

/**
 * Handles volume preview requests from the UI via a custom event.
 * Keeps the UI decoupled from the audio implementation details.
 */
window.addEventListener('audio:previewVolume', () => {
  try { playVolumePreview(); } catch (_) {}
});

// Exported audio helpers for the rest of the game.

export {
  ensureContext,
  unlockAudio,
  loadAudioBuffer,
  stop,
  playBuffer,
  getSongTimeMs,
  setMasterVolume,
  isPlaying,
  playVolumePreview,
};
