// input.js
import { state, gradeHit } from './scoring.js'; // imports game state and judging function

// --- TEMP DEBUG ---
console.log('[input] module loaded'); // logs that this module loaded

/* =============================
   MOVE CONTROLLER (CSS-driven)
   - Adds/removes .move-left/right/up/down on #dancer.
   ============================= */

/* ----------------------------------------
   removeAllMoveClasses
   Purpose: Ensure only one move class lives at a time.
---------------------------------------- */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');   // removes left class
  dancer.classList.remove('move-right');  // removes right class
  dancer.classList.remove('move-up');     // removes up class
  dancer.classList.remove('move-down');   // removes down class
}

/* ----------------------------------------
   applyMove
   Purpose: Force-restart CSS animation by reflow; clean up on first animation end.
   Usage: applyMove('move-left')
---------------------------------------- */
function applyMove(moveClass) {
  if (!state.running) return;                              // exits when game is paused
  const dancer = document.getElementById('dancer');       // reads dancer element
  if (!dancer) return;                                     // exits if missing element

  removeAllMoveClasses(dancer);                            // clears any previous move
  // Force a reflow so re-adding a class restarts the animation cleanly:
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;                                      // triggers reflow by reading layout
  dancer.classList.add(moveClass);                         // applies requested move class

  const onEnd = () => {                                    // declares cleanup handler
    dancer.classList.remove(moveClass);                    // removes the move class
    dancer.removeEventListener('animationend', onEnd);     // detaches end listener
    dancer.removeEventListener('animationcancel', onEnd);  // detaches cancel listener
  };
  dancer.addEventListener('animationend', onEnd,   { once:false }); // listens for animation end
  dancer.addEventListener('animationcancel', onEnd,{ once:false }); // listens for animation cancel
}

/* ----------------------------------------
   Convenience move triggers
   Purpose: Small wrappers for clarity.
---------------------------------------- */
function doLeftMove()  { applyMove('move-left');  } // triggers left move
function doRightMove() { applyMove('move-right'); } // triggers right move
function doUpMove()    { applyMove('move-up');    } // triggers up move
function doDownMove()  { applyMove('move-down');  } // triggers down move

/* ----------------------------------------
   wireMoveButtons
   Purpose: Map on-screen DDR buttons to moves + judge.
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {            // iterates all control buttons
    btn.addEventListener('click', () => {                               // handles click/tap
      const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // reads direction attribute
      if (!state.running) return;                                       // exits if paused
      if (dir === 'left')  { doLeftMove();  gradeHit('left');  }        // plays left and judges
      if (dir === 'right') { doRightMove(); gradeHit('right'); }        // plays right and judges
      if (dir === 'up')    { doUpMove();    gradeHit('up');    }        // plays up and judges
      if (dir === 'down')  { doDownMove();  gradeHit('down');  }        // plays down and judges
    });
  }); 
}

/* ----------------------------------------
   wireMoveKeyboard
   Purpose: Map Arrow keys to moves + judge (no repeats).
---------------------------------------- */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {                           // listens for keydown
    if (e.repeat) return;                                               // ignores repeat presses
    const isArrow =
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp'   || e.key === 'ArrowDown';                   // checks arrow keys
    if (isArrow) e.preventDefault();                                    // prevents page scroll
    if (!state.running) return;                                         // exits if paused

    if (e.key === 'ArrowLeft')  { doLeftMove();  gradeHit('left');  return; } // handles left
    if (e.key === 'ArrowRight') { doRightMove(); gradeHit('right'); return; } // handles right
    if (e.key === 'ArrowUp')    { doUpMove();    gradeHit('up');    return; } // handles up
    if (e.key === 'ArrowDown')  { doDownMove();  gradeHit('down');  return; } // handles down
  });
}

/* ----------------------------------------
   initMoveControls
   Purpose: Public setup to connect both input types.
---------------------------------------- */
function initMoveControls() {
  wireMoveButtons();   // wires on-screen controls
  wireMoveKeyboard();  // wires keyboard controls
}

/* Play/Pause toggle buttons
   Wires both the quick button and the navbar menu button to emit intents; UI/playback is handled elsewhere. */
/*function wireMenuPlayToggle() {
  // gather both possible toggles (quick + navbar)
  const targets = [
    document.getElementById('quickPlayPause'),  // always-visible quick button
    document.getElementById('menuPlayToggle')   // navbar/hamburger Play/Pause button
  ].filter(Boolean);                             // keep only existing elements

  if (targets.length === 0) return;              // nothing to wire

  targets.forEach((btn) => {
    if (btn.dataset.wired === 'true') return;    // avoid duplicate listeners
    btn.dataset.wired = 'true';                  // mark as wired once

    btn.addEventListener('click', () => {        // handle button click
      const isStarting = document.body.getAttribute('data-starting') === 'true'; // countdown phase
      if (state.running || isStarting) {         // treat countdown as running-like
        window.dispatchEvent(new CustomEvent('ui:requestPause'));   // emit pause intent
        return;
      }
      window.dispatchEvent(new CustomEvent('ui:requestStartRun'));  // emit start intent
    });
  });
}
*/

/* ---------------------------
   Export all Input functions
---------------------------- */
export {
  initMoveControls, doLeftMove, doRightMove, doUpMove, doDownMove, 
};
