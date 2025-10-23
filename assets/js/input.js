
import { state, judgeHit } from './scoring.js';
import { startBeatSpawner, stopBeatSpawner } from './scheduler.js';
import { setOverlayLabel, showOverlay, hideOverlay } from './ui.js';

/* =============================
   MOVE CONTROLLER (CSS-driven)
   - Adds/removes .move-left/right/up/down on #dancer.
   ============================= */

/* ----------------------------------------
   removeAllMoveClasses
   Purpose: Ensure only one move class lives at a time.
---------------------------------------- */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');   // clear left
  dancer.classList.remove('move-right');  // clear right
  dancer.classList.remove('move-up');     // clear up
  dancer.classList.remove('move-down');   // clear down
}

/* ----------------------------------------
   applyMove
   Purpose: Force-restart CSS animation by reflow; clean up on first animation end.
   Usage: applyMove('move-left')
---------------------------------------- */
function applyMove(moveClass) {
  if (!state.running) return;                              // ignore when paused
  const dancer = document.getElementById('dancer');       // cat wrapper
  if (!dancer) return;                                     // guard

  removeAllMoveClasses(dancer);                            // clear older move
  // Force a reflow so re-adding a class restarts the animation cleanly:
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;                                      // read layout to flush
  dancer.classList.add(moveClass);                         // add new move class

  const onEnd = () => {                                    // define cleanup handler
    dancer.classList.remove(moveClass);                    // remove the class
    dancer.removeEventListener('animationend', onEnd);     // detach listener
    dancer.removeEventListener('animationcancel', onEnd);  // detach cancel listener
  };
  dancer.addEventListener('animationend', onEnd,   { once:false }); // catch first bubbling end
  dancer.addEventListener('animationcancel', onEnd,{ once:false }); // safety
}

/* ----------------------------------------
   Convenience move triggers
   Purpose: Small wrappers for clarity (used by inputs).
---------------------------------------- */
function doLeftMove()  { applyMove('move-left');  } // trigger left move
function doRightMove() { applyMove('move-right'); } // trigger right move
function doUpMove()    { applyMove('move-up');    } // trigger up move
function doDownMove()  { applyMove('move-down');  } // trigger down move

/* ----------------------------------------
   wireMoveButtons
   Purpose: Map on-screen DDR buttons to moves + judge.
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {           // get all control buttons
    btn.addEventListener('click', () => {                              // on click/tap
      const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // read dir attribute
      if (!state.running) return;                                      // ignore when paused
      if (dir === 'left')  { doLeftMove();  judgeHit('left');  }       // play left + judge
      if (dir === 'right') { doRightMove(); judgeHit('right'); }       // play right + judge
      if (dir === 'up')    { doUpMove();    judgeHit('up');    }       // play up + judge
      if (dir === 'down')  { doDownMove();  judgeHit('down');  }       // play down + judge
    });
  });
}

/* ----------------------------------------
   wireMoveKeyboard
   Purpose: Map Arrow keys to moves + judge (no repeats).
---------------------------------------- */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {                          // listen for key down
    if (e.repeat) return;                                              // ignore repeats
    const isArrow =
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp'   || e.key === 'ArrowDown';                  // detect arrow keys
    if (isArrow) e.preventDefault();                                   // prevent scroll
    if (!state.running) return;                                        // ignore when paused

    if (e.key === 'ArrowLeft')  { doLeftMove();  judgeHit('left');  return; }
    if (e.key === 'ArrowRight') { doRightMove(); judgeHit('right'); return; }
    if (e.key === 'ArrowUp')    { doUpMove();    judgeHit('up');    return; }
    if (e.key === 'ArrowDown')  { doDownMove();  judgeHit('down');  return; }
  });
}


/* ----------------------------------------
   initMoveControls
   Purpose: Public setup to connect both input types.
---------------------------------------- */
function initMoveControls() {
  wireMoveButtons();   // on-screen
  wireMoveKeyboard();  // keyboard
}

/* ----------------------------------------
   Play/Pause toggle button
   Purpose: Toggle game state using the always visible quick button.
   Usage: Call wireMenuPlayToggle() on DOMContentLoaded.
---------------------------------------- */
function wireMenuPlayToggle() {
  const btn = document.getElementById('quickPlayPause'); // query quick button
  if (!btn) return; // guard if button missing

  btn.addEventListener('click', () => { // on click
    if (state.running) {
      // ----- PAUSE -----
      state.running = false;                      // mark paused
      stopBeatSpawner();                          // stop random spawner (existing fn)
      setOverlayLabel('Paused');                  // overlay label
      showOverlay();                              // show overlay
      document.body.setAttribute('data-paused', 'true');   /* freeze notes in place */
      btn.setAttribute('aria-pressed', 'false');  // a11y state
      btn.setAttribute('aria-label', 'Play');     // a11y label
      // (optional) if your quick button shows text/icon, update it here
      // btn.textContent = '▶ Play';
    } else {
      // ----- START/RESUME -----
      state.running = true;                       // mark running
      startBeatSpawner();                         // start random spawner (existing fn)
      setOverlayLabel('Play');                    // normalize overlay label
      hideOverlay();                              // hide overlay
      document.body.removeAttribute('data-paused');        /* unfreeze notes */
      btn.setAttribute('aria-pressed', 'true');   // a11y state
      btn.setAttribute('aria-label', 'Pause');    // a11y label
      // (optional) if your quick button shows text/icon, update it here
      // btn.textContent = '⏸ Pause';
      // TODO: resumeGameLoop() if/when you add a real loop
    }
  });
}


/* ---------------------------
   Export all Input functions
---------------------------- */
export {
  initMoveControls,
  wireMenuPlayToggle
};