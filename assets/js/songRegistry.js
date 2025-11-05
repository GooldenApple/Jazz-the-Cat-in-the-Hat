// songRegistry.js
// Read-only song registry (immutable). Prevents accidental runtime mutations.

export const SONGS = Object.freeze([
  Object.freeze({
    id: 'balloon-game',
    title: 'Balloon Game',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/balloon-game.mp3',
    chart: 'assets/charts/balloon-game.json',
  }),
  Object.freeze({
    id: 'itty-bitty-8bit',
    title: 'Itty Bitty 8-Bit',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/itty-bitty-8bit.mp3',
    chart: 'assets/charts/itty-bitty-8bit.json',
  }),
]);

/** Find a song by id (returns null if not found) */
function getSongById(id) {
  return SONGS.find((s) => s.id === id) || null;
}

/** Get the first song (useful as default) */
function getFirstSong() {
  return SONGS[0] || null;
}

// Map levels to song ids 
export const LEVEL_TO_SONG = Object.freeze({
  1: 'balloon-game',
  2: 'itty-bitty-8bit',
  // 3: 'balloon-game',
  // 4: 'itty-bitty-8bit',
});

// Helper: pick song object for a given level.
// If no explicit mapping exists, fallback to cycling through SONGS.
function getSongForLevel(level) {
  const byId = (id) => SONGS.find(s => s.id === id) || SONGS[0];

  // explicit mapping first
  const mappedId = LEVEL_TO_SONG?.[Number(level)];
  if (mappedId) return byId(mappedId);

  // fallback: cycle (level 1→index 0, level 2→index 1, etc.)
  const idx = Math.max(0, (Number(level) - 1) % SONGS.length);
  return SONGS[idx] || SONGS[0];
}



/* ---- exports  ---- */
export { getSongById, getFirstSong, getSongForLevel };
