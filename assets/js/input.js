// input.js
import { state, gradeHit } from './scoring.js'; // imports game state and judging function

// --- TEMP DEBUG ---
console.log('[input] module loaded'); // logs that this module loaded

// MOVE CONTROLLER (CSS-driven)

/*
 *removeAllMoveClasses
 *Purpose: Ensure only one move class lives at a time.
 */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');   // removes left class
  dancer.classList.remove('move-right');  // removes right class
  dancer.classList.remove('move-up');     // removes up class
  dancer.classList.remove('move-down');   // removes down class
}

/**
  *applyMove
  *Purpose: Force-restart CSS animation by reflow; clean up on first animation end.
  *Usage: applyMove('move-left')
  */

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

/**
  *Convenience move triggers
  *Purpose: Small wrappers for clarity.
  */

function doLeftMove()  { applyMove('move-left');  } // triggers left move
function doRightMove() { applyMove('move-right'); } // triggers right move
function doUpMove()    { applyMove('move-up');    } // triggers up move
function doDownMove()  { applyMove('move-down');  } // triggers down move

/* ----------------------------------------
   wireMoveButtons
   Purpose: Map on-screen DDR buttons to moves + judge with snappy mobile touch.
   Notes:
   - Uses pointerdown for instant feedback on touch/pen.
   - Filters the subsequent "ghost" click so we don't double-fire.
   - Ignores non-left mouse buttons.
   - Keeps keyboard activation via the click listener.
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {
    const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // read lane

    // Small helper to trigger the correct move + judge
    const fire = () => {
      if (!state.running) return;                      // no input if paused
      if (dir === 'left')  { doLeftMove();  gradeHit('left');  return; }
      if (dir === 'right') { doRightMove(); gradeHit('right'); return; }
      if (dir === 'up')    { doUpMove();    gradeHit('up');    return; }
      if (dir === 'down')  { doDownMove();  gradeHit('down');  return; }
    };

    let lastPointerDown = 0;                           // timestamp to filter ghost clicks

    // Instant response for touch/pen; preserve mouse focus behavior
    btn.addEventListener('pointerdown', (e) => {
      // Ignore non-left mouse buttons (right/middle)
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // For touch/pen, prevent default to avoid delayed "ghost" click
      if (e.pointerType !== 'mouse' && e.cancelable) e.preventDefault();

      lastPointerDown = performance.now();            // record time to filter next click
      fire();                                         // trigger move + judge immediately

      // Tiny haptic nudge on mobile (best-effort)
      try { if (e.pointerType !== 'mouse') navigator.vibrate?.(10); } catch (_) {}
    }, { passive: false });

    // Fallback for keyboard (Space/Enter dispatches click) and mouse
    btn.addEventListener('click', (e) => {
      // If a pointerdown just happened, this is likely the ghost click → skip
      if ((performance.now() - lastPointerDown) < 400) return;
      fire();                                         // trigger for keyboard/mouse click
    });
  });
}

/**
  *wireMoveKeyboard
  *Purpose: Map Arrow keys to moves + judge (no repeats).
*/
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

/**
  *initMoveControls
  *Purpose: Public setup to connect both input types.
  */

function initMoveControls() {
  wireMoveButtons();   // wires on-screen controls
  wireMoveKeyboard();  // wires keyboard controls
}



//Export all Input functions

export {
  initMoveControls, doLeftMove, doRightMove, doUpMove, doDownMove, 
};
