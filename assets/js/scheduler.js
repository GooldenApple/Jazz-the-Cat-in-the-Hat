/* ----------------------------------------
   startBeatSpawner
   Purpose: Start a simple random spawner aligned to BPM (for testing).
   TODO: replace with real chart/music syncing later.
---------------------------------------- */
function startBeatSpawner() {
  if (_beatTimer) return;                                  // already running
  const msPerBeat = 60000 / rhythm.bpm;                    // ms per beat
  const tickMs    = msPerBeat / rhythm.stepDiv;            // tick interval

  _beatTimer = setInterval(() => {                         // interval loop
    if (!state.running) return;                            // spawn only if playing
    const dirs = ['left', 'up', 'down', 'right'];          // available lanes
    const dir  = dirs[(Math.random() * dirs.length) | 0];  // random lane
    spawnJudgedNote(dir, rhythm.travelBeats, rhythm.bpm);  // spawn + register
  }, Math.max(80, tickMs));                                // guard too-fast timers
}

/* ----------------------------------------
   stopBeatSpawner
   Purpose: Stop the random spawner.
---------------------------------------- */
function stopBeatSpawner() {
  if (_beatTimer) { clearInterval(_beatTimer); _beatTimer = null; } // clear timer
}

export { startBeatSpawner,stopBeatSpawner };