
// Song registry 
export const SONGS = [
  {
    id: 'balloon-game',
    title: 'Balloon Game',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/balloon-game.mp3',
    chart: 'assets/charts/balloon-game.json'
  },
  {
    id: 'itty-bitty-8bit',
    title: 'Itty Bitty 8-Bit',
    artist: 'Kevin MacLeod',
    audio: 'assets/audio/itty-bitty-8bit.mp3',
    chart: 'assets/charts/itty-bitty-8bit.json'
  }
];
/** Find a song by id */
export function getSongById(id) {
  return SONGS.find(s => s.id === id) || null;
}

/** Get the first song (useful as a default) */
export function getFirstSong() {
  return SONGS[0] || null;
}
