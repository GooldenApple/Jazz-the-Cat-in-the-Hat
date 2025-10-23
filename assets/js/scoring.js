import { createHeart } from './ui.js';

/* ----------------------------------------
   Global game state
   - Single source of truth for HUD + run state.
   Usage: mutate via functions (hit/heal/start/stop).
---------------------------------------- */
const state = {
  running: false,  // game running flag
  score:   0,      // current score
  lives:   3,      // hearts left
  level:   1,      // current level
  partial: 0       // damage steps on the active heart (0..3)
};
/* 

/* ----------------------------------------
   Quick HUD refs
   - Cache key DOM nodes used by updateHUD().
   Usage: hud.score.textContent = '10'
---------------------------------------- */
const hud = {
  lives: document.getElementById('lives'), // lives container (hearts)
  score: document.getElementById('score'), // score number
  best:  document.getElementById('best'),  // (placeholder) best/high score
  level: document.getElementById('level')  // level number
};

/* ----------------------------------------
   init
   Purpose: Reset state and render the HUD once.
   Usage: call once on DOMContentLoaded.
   TODO: load best score from storage when you add persistence.
---------------------------------------- */
function init() {
  state.running = false;  // ensure not running
  state.score   = 0;      // reset score
  state.lives   = 5;      // default lives
  state.level   = 1;      // default level
  state.partial = 0;      // clear partial damage
  updateHUD();            // render HUD to match state
}

/* ----------------------------------------
   Quick HUD refs
   - Cache key DOM nodes used by updateHUD().
   Usage: hud.score.textContent = '10'
---------------------------------------- */
const hud = {
  lives: document.getElementById('lives'), // lives container (hearts)
  score: document.getElementById('score'), // score number
  best:  document.getElementById('best'),  // (placeholder) best/high score
  level: document.getElementById('level')  // level number
};

/* ----------------------------------------
   updateHUD
   Purpose: Sync HUD numbers and hearts from state.
   Usage: updateHUD()
---------------------------------------- */
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial); // render lives strip
  hud.score.textContent = state.score;                // update score text
  hud.level.textContent = state.level;                // update level text
  // TODO: show best/high score when you add persistence.
}

/* ----------------------------------------
   renderLives
   Purpose: Render hearts row according to lives + partial damage step.
   Usage: renderLives(hud.lives, state.lives, state.partial)
---------------------------------------- */
function renderLives(container, lives, partial = 0, steps = 4) {
  container.innerHTML = '';                                  // clear old hearts
  const safeLives   = Math.max(0, lives);                    // clamp negative
  const safePartial = Math.min(Math.max(partial, 0), steps - 1); // clamp step

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {     // for all but last
    container.appendChild(createHeart('full'));              // render full heart
  }

  if (safeLives > 0) {                                       // last heart may be partial
    let klass = 'full';                                      // default full
    if (safePartial === 1) klass = 'threequarter';           // 3/4
    if (safePartial === 2) klass = 'half';                   // 1/2
    if (safePartial === 3) klass = 'quarter';                // 1/4
    container.appendChild(createHeart(klass));               // append the last one
  }

  if (safeLives <= 0) {                                      // no lives → show empty
    container.appendChild(createHeart('empty'));
  }
}


/* ----------------------------------------
   hit
   Purpose: Apply damage in steps; every 4th step consumes one life.
   Usage: hit()
---------------------------------------- */
function hit() {
  if (state.lives <= 0) return;            // already dead → ignore
  if (state.partial < 3) {                 // not yet at 4th step
    state.partial += 1;                    // increment step
  } else {
    state.lives -= 1;                      // lose one heart
    state.partial = 0;                     // reset step
  }
  updateHUD();                              // refresh HUD
}

/* ----------------------------------------
   heal
   Purpose: Restore a full heart and clear partial damage.
   Usage: heal()
---------------------------------------- */
function heal() {
  state.lives += 1;                         // add life
  state.partial = 0;                        // clear damage step
  updateHUD();                              // refresh HUD
}


/* ----------------------------------------
   judgeHit
   Purpose: Wrapper for note judging so input.js 
   does not call game.js directly.
   Usage: judgeHit('left'|'right'|'up'|'down')
---------------------------------------- */
function judgeHit(dir) {
  tryJudge(dir); // delegate to main game logic
}

/* ---------------------------
   Export all Scoring functions
---------------------------- */
export {
  // Core state
  state, init, hud,
  // Hearts
  renderLives,
  // HUD updates
  updateHUD,
  // Gameplay
  hit, heal, judgeHit
};
