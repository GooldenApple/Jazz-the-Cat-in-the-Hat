/* =============================
   RANDOM TEST SPAWNER (dev)
   ============================= */

let _beatTimer = null;                                     // interval handle
const rhythm = {
  bpm: 120,            // tempo
  stepDiv: 1,          // ticks per beat (1=each beat)
  travelBeats: 2.0     // travel beats to judge line
};


/* =============================
   DEV test hooks
   ============================= */
/* ----------------------------------------
   exposeDevHooks
   Purpose: Attach useful helpers to window for console testing.
   Safe to keep in production; only references are exposed.
---------------------------------------- */
(function exposeDevHooks() {
  if (typeof window === 'undefined') return;  // guard

  // Moves (Console: doLeftMove(), doRightMove(), doUpMove(), doDownMove())
  window.doLeftMove  = doLeftMove;
  window.doRightMove = doRightMove;
  window.doUpMove    = doUpMove;
  window.doDownMove  = doDownMove;

  // Time-based judge entry (Console: tryJudge('left'|'right'|'up'|'down'))
  window.tryJudge    = tryJudge;

  // TODO: expose start/stop helpers if you want quick testing:
  // window.startBeatSpawner = startBeatSpawner;
  // window.stopBeatSpawner  = stopBeatSpawner;
})();


export{ exposeDevHooks };