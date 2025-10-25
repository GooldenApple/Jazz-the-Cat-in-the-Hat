//Audio.js

//  tiny Web Audio helper for loading/playing songs

let ctx = null;                      // AudioContext (created on first use)
let master = null;                   // Master GainNode (for volume control)
let src = null;                      // Current BufferSource (the playing node)
let startAt = 0;                     // ContextTime when current song started
let playing = false;                 // Playback state flag
let currentBuffer = null;            // Cached AudioBuffer of the loaded song

/** Ensure an AudioContext exists (create lazily). */
function ensureContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)(); // create context
    master = ctx.createGain();                                      // create master gain
    master.gain.value = 1;                                          // default volume = 100%
    master.connect(ctx.destination);                                 // route to speakers
  }
  return ctx;
}

/** Try to resume context (required by some browsers after user gesture). */
export async function unlockAudio() {
  ensureContext();                                   // make sure context exists
  if (ctx.state === 'suspended') await ctx.resume(); // resume if suspended
}

/** Decode ArrayBuffer → AudioBuffer (cross-browser safe). */
async function decodeArrayBufferToAudioBuffer(ab) {
  ensureContext();                                                   // need ctx for decoding
  if (ctx.decodeAudioData.length === 1) {                            // modern promise API
    return ctx.decodeAudioData(ab);                                  // returns a Promise
  }
  // Older callback API → wrap in a Promise
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(ab, resolve, reject);
  });
}

/** Load an MP3/OGG into an AudioBuffer and cache it. */
export async function loadAudioBuffer(url) {
  ensureContext();                                                   // make sure ctx exists
  const res = await fetch(url, { cache: 'force-cache' });            // fetch audio file
  if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`); // network guard
  const ab = await res.arrayBuffer();                                // get as ArrayBuffer
  currentBuffer = await decodeArrayBufferToAudioBuffer(ab);          // decode to AudioBuffer
  return currentBuffer;                                              // return for convenience
}

/** Stop current playback (if any), safely. */
export function stop() {
  if (src) {
    try { src.stop(0); } catch {}      // stop may throw if already stopped
    try { src.disconnect(); } catch {} // tidy graph
  }
  src = null;                          // drop node reference
  playing = false;                     // update flag
  startAt = 0;                         // clear start time
}

/** Play a given AudioBuffer (or the last loaded), optionally after a delay (sec). */
export function playBuffer(buffer = currentBuffer, delaySec = 0) {
  ensureContext();                                   // context & graph ready
  if (!buffer) throw new Error('No AudioBuffer to play'); // guard against misuse

  stop();                                            // stop any previous playback
  src = ctx.createBufferSource();                    // create a new source
  src.buffer = buffer;                               // assign audio data
  src.connect(master);                               // route to master gain
  startAt = ctx.currentTime + (delaySec || 0);       // when playback will start
  src.start(startAt);                                // schedule start
  playing = true;                                    // update flag

  // Auto-clear flags when playback ends
  src.addEventListener('ended', () => {              // when source finishes
    playing = false;                                 // mark as not playing
    src = null;                                      // drop node
  }, { once: true });

  return startAt;                                    // return context start time
}

/** Get current song time in milliseconds since play() (0 if not playing). */
export function getSongTimeMs() {
  if (!ctx || !playing) return 0;                    // not started or already ended
  const t = (ctx.currentTime - startAt) * 1000;      // convert seconds → ms
  return t < 0 ? 0 : t;                              // avoid negative due to scheduling
}

/** Master volume: 0..1 (clamped). */
export function setMasterVolume(v) {
  ensureContext();                                   // need gain node ready
  const vol = Math.max(0, Math.min(1, Number(v) || 0));
  master.gain.value = vol;                           // apply gain
}

/** Convenience: expose whether something is currently playing. */
export function isPlaying() {
  return !!playing;                                  // boolean
}

