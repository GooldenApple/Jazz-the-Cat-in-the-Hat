// assets/js/audio.js

// ---------------------------------------------
// Web Audio mini-mixer (lazy) for optional use
// Purpose: centralize master gain, decode & play buffers
// ---------------------------------------------

let ctx = null;                  // AudioContext (created on first use)
let master = null;               // Master Gain node
let src = null;                  // Current BufferSource
let startAt = 0;                 // ctx.currentTime when playback started
let playing = false;             // simple playing flag
let currentBuffer = null;        // last decoded AudioBuffer

/* Create (once) and wire AudioContext + master gain */
function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); // create context
    master = ctx.createGain();                                      // master gain
    master.gain.value = 1;                                          // default 100%
    master.connect(ctx.destination);                                 // route to speakers
  }
  return ctx;
}

/* Some browsers require a user-gesture resume */
async function unlockAudio() {
  ensureContext();                               // make sure ctx exists
  if (ctx.state === 'suspended') await ctx.resume();
}

/* Decode ArrayBuffer → AudioBuffer (supports old callbacks) */
async function decodeArrayBufferToAudioBuffer(ab) {
  ensureContext();
  if (ctx.decodeAudioData.length === 1) {        // Promise API
    return ctx.decodeAudioData(ab);
  }
  return new Promise((resolve, reject) => {       // Callback API
    ctx.decodeAudioData(ab, resolve, reject);
  });
}

/* Fetch + decode an audio file; cache as currentBuffer */
async function loadAudioBuffer(url) {
  ensureContext();
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
  const ab = await res.arrayBuffer();
  currentBuffer = await decodeArrayBufferToAudioBuffer(ab);
  return currentBuffer;
}

/* Stop current playback safely */
function stop() {
  if (src) {
    try { src.stop(0); } catch (_) {}
    try { src.disconnect(); } catch (_) {}
  }
  src = null;
  playing = false;
  startAt = 0;
}

/* Play a buffer (or last loaded) at t+delaySec */
function playBuffer(buffer = currentBuffer, delaySec = 0) {
  ensureContext();
  if (!buffer) throw new Error('No AudioBuffer to play');

  stop();                                         // stop previous
  src = ctx.createBufferSource();                 // new source
  src.buffer = buffer;                            // attach data
  src.connect(master);                            // to master
  startAt = ctx.currentTime + (delaySec || 0);    // schedule start
  src.start(startAt);                             // start
  playing = true;

  src.addEventListener('ended', () => {           // clear when done
    playing = false;
    src = null;
  }, { once: true });

  return startAt;
}

/* Time since start (ms), 0 if not playing */
function getSongTimeMs() {
  if (!ctx || !playing) return 0;
  const t = (ctx.currentTime - startAt) * 1000;
  return t < 0 ? 0 : t;
}

/* Master volume 0..1 */
function setMasterVolume(v) {
  ensureContext();
  const vol = Math.max(0, Math.min(1, Number(v) || 0));
  master.gain.value = vol;
}

/* Bridge from Settings UI: apply master volume when event fires */
window.addEventListener('audio:setMasterVolume', (e) => {
  const v = (e && e.detail && typeof e.detail.volume === 'number') ? e.detail.volume : 0;
  try { setMasterVolume(v); } catch (_) { /* context not exist yet */ }
});

/* Simple playing flag getter */
function isPlaying() {
  return !!playing;
}

/* ---------------------------------------------
   Volume preview "pling"
   Purpose: Play a very short sine beep at the current master volume
--------------------------------------------- */
function playVolumePreview() {                             // plays a short beep
  ensureContext();                                         // ensure AudioContext
  const now = ctx.currentTime;                             // current time

  // If context is suspended (no user gesture yet), try to resume then beep
  if (ctx.state === 'suspended') {                         // if suspended
    ctx.resume().then(() => _doBeep());                    // resume then beep
    return;                                                // exit early
  }
  _doBeep();                                               // otherwise beep now

  function _doBeep() {                                     // inner helper to beep
    const osc = ctx.createOscillator();                    // create oscillator node
    const g   = ctx.createGain();                          // local gain for envelope
    osc.type = 'sine';                                     // simple sine wave
    osc.frequency.setValueAtTime(880, now);                // A5 = 880 Hz
    g.gain.setValueAtTime(0, now);                         // start at silence
    // Quick attack to ~90% of master.gain, then fast decay to near zero
    g.gain.linearRampToValueAtTime(0.9 * master.gain.value, now + 0.01); // attack
    g.gain.exponentialRampToValueAtTime(0.0001,           now + 0.13);   // decay

    osc.connect(g);                                        // osc → local gain
    g.connect(master);                                     // local gain → master
    osc.start(now);                                        // start immediately
    osc.stop(now + 0.14);                                  // stop after ~140 ms
  }
}

/* Listen for UI preview requests (so ui.js doesn't need to import audio.js) */
window.addEventListener('audio:previewVolume', () => {      // on preview event
  try { playVolumePreview(); } catch (_) {}                 // fire beep safely
});


/* export */
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
