/**songRegistry.js
  *Read-only song registry (immutable). Prevents accidental runtime mutations.
  */

export const SONGS = Object.freeze([
  Object.freeze({
    id: 'itty-bitty-8bit',
    title: 'Itty Bitty 8-Bit',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/itty-bitty-8bit.mp3',
    chart: 'assets/charts/itty-bitty-8bit.json',
  }),
  Object.freeze({
    id: 'balloon-game',
    title: 'Balloon Game',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/balloon-game.mp3',
    chart: 'assets/charts/balloon-game.json',
  }),

  Object.freeze({
    id: 'cfunk',
    title: 'C-Funk',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/cfunk.mp3',
    chart: 'assets/charts/cfunk.json',
  }),
  Object.freeze({
    id: 'stylefunk',
    title: 'Style Funk',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/stylefunk.mp3',
    chart: 'assets/charts/stylefunk.json',
  }),
  Object.freeze({
    id: 'funkorama',
    title: 'Funkorama',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/funkorama.mp3',
    chart: 'assets/charts/funkorama.json',
  }),
  Object.freeze({
    id: 'fluteyfunk',
    title: 'Flutey Funk',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/fluteyfunk.mp3',
    chart: 'assets/charts/fluteyfunk.json',
  }),
  Object.freeze({
    id: 'funkgameloop',
    title: 'Funk Game Loop',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/funkgameloop.mp3',
    chart: 'assets/charts/funkgameloop.json',
  }),
  Object.freeze({
    id: 'aceshigh',
    title: 'Aces High',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/aceshigh.mp3',
    chart: 'assets/charts/aceshigh.json',
  }),
  Object.freeze({
    id: 'protofunk',
    title: 'Protofunk',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/protofunk.mp3',
    chart: 'assets/charts/protofunk.json',
  }),
  Object.freeze({
    id: 'smoothmove',
    title: 'Smooth Move',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/smoothmove.mp3',
    chart: 'assets/charts/smoothmove.json',
  }),
  Object.freeze({
    id: 'funkychunk',
    title: 'Funky Chunk',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/funkychunk.mp3',
    chart: 'assets/charts/funkychunk.json',
  }),
  Object.freeze({
    id: 'celebration',
    title: 'Celebration',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/celebration.mp3',
    chart: 'assets/charts/celebration.json',
  }),
  Object.freeze({
    id: 'yourcall',
    title: 'Your Call',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/yourcall.mp3',
    chart: 'assets/charts/yourcall.json',
  }),
  Object.freeze({
    id: 'entertheparty',
    title: 'Enter the Party',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/entertheparty.mp3',
    chart: 'assets/charts/entertheparty.json',
  }),
  Object.freeze({
    id: 'forkandspoon',
    title: 'Fork and Spoon',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/forkandspoon.mp3',
    chart: 'assets/charts/forkandspoon.json',
  }),
]);

/* Find a song by id (returns null if not found) */
function getSongById(id) {
  return SONGS.find((s) => s.id === id) || null; // find match or null
}

/* Get the first song (useful as default) */
function getFirstSong() {
  return SONGS[0] || null; // first registry entry or null
}


export const LEVEL_TO_SONG = Object.freeze({
  1:  'itty-bitty-8bit',
  2:  'balloon-game',
  3:  'cfunk',
  4:  'stylefunk',
  5:  'funkorama',
  6:  'fluteyfunk',
  7:  'funkgameloop',
  8:  'aceshigh',
  9:  'protofunk',
  10: 'smoothmove',
  11: 'funkychunk',
  12: 'celebration',
  13: 'yourcall',
  14: 'entertheparty',
  15: 'forkandspoon',
});

/* Helper: pick song object for a given level.
   If no explicit mapping exists, fallback to cycling through SONGS. */
function getSongForLevel(level) {
  const byId = (id) => SONGS.find(s => s.id === id) || SONGS[0]; // resolve by id
  const mappedId = LEVEL_TO_SONG?.[Number(level)];               // explicit map
  if (mappedId) return byId(mappedId);                           // mapped → return
  const idx = Math.max(0, (Number(level) - 1) % SONGS.length);   // cycle fallback
  return SONGS[idx] || SONGS[0];                                  // safe return
}

/* ---- exports ---- */
export { getSongById, getFirstSong, getSongForLevel };
