// input.js
import { state, gradeHit } from './scoring.js'; // game state and judging helper

// Lightweight dev sanity check: confirms module load
console.log('[input] module loaded');

// MOVE CONTROLLER (CSS-driven)

// Remove all movement classes so only one move can be active at a time.
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');
  dancer.classList.remove('move-right');
  dancer.classList.remove('move-up');
  dancer.classList.remove('move-down');
}

/**
 * Apply a move class to the dancer and force-restart its CSS animation.
 * Uses a layout reflow trick so the same class can retrigger the animation.
 * Example: applyMove('move-left')
 */
function applyMove(moveClass) {
  if (!state.running) return;
  const dancer = document.getElementById('dancer');
  if (!dancer) return;

  removeAllMoveClasses(dancer);

  // Force a reflow so re-adding the class restarts the animation cleanly
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;

  dancer.classList.add(moveClass);

  const onEnd = () => {
    dancer.classList.remove(moveClass);
    dancer.removeEventListener('animationend', onEnd);
    dancer.removeEventListener('animationcancel', onEnd);
  };

  dancer.addEventListener('animationend', onEnd, { once: false });
  dancer.addEventListener('animationcancel', onEnd, { once: false });
}

// Trigger left move animation.
function doLeftMove() {
  applyMove('move-left');
}

// Trigger right move animation.
function doRightMove() {
  applyMove('move-right');
}

// Trigger up move animation.
function doUpMove() {
  applyMove('move-up');
}

// Trigger down move animation.
function doDownMove() {
  applyMove('move-down');
}

/**
 * Wire on-screen DDR buttons to moves and judging.
 * Uses pointerdown for snappy touch/pen input, filters ghost clicks,
 * and keeps keyboard activation via the click handler.
 */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {
    const dir = String(btn.getAttribute('data-dir') || '').toLowerCase();

    const fire = () => {
      if (!state.running) return;
      if (dir === 'left')  { doLeftMove();  gradeHit('left');  return; }
      if (dir === 'right') { doRightMove(); gradeHit('right'); return; }
      if (dir === 'up')    { doUpMove();    gradeHit('up');    return; }
      if (dir === 'down')  { doDownMove();  gradeHit('down');  return; }
    };

    let lastPointerDown = 0; // used to filter the follow-up ghost click

    btn.addEventListener('pointerdown', (e) => {
      // Ignore non-left mouse buttons
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // On touch/pen, prevent default to avoid delayed ghost click
      if (e.pointerType !== 'mouse' && e.cancelable) e.preventDefault();

      lastPointerDown = performance.now();
      fire();

      // Best-effort haptic nudge on mobile
      try {
        if (e.pointerType !== 'mouse') navigator.vibrate?.(10);
      } catch (_) {}
    }, { passive: false });

    btn.addEventListener('click', () => {
      // Skip the ghost click that follows a recent pointerdown
      if ((performance.now() - lastPointerDown) < 400) return;
      fire();
    });
  });
}

/**
 * Map Arrow keys to moves and judging.
 * Ignores key repeat and prevents page scroll when arrows are pressed.
 */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    const isArrow =
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp'   || e.key === 'ArrowDown';

    if (isArrow) e.preventDefault();
    if (!state.running) return;

    if (e.key === 'ArrowLeft')  { doLeftMove();  gradeHit('left');  return; }
    if (e.key === 'ArrowRight') { doRightMove(); gradeHit('right'); return; }
    if (e.key === 'ArrowUp')    { doUpMove();    gradeHit('up');    return; }
    if (e.key === 'ArrowDown')  { doDownMove();  gradeHit('down');  return; }
  });
}

// Public setup to wire both on-screen and keyboard controls.
function initMoveControls() {
  wireMoveButtons();
  wireMoveKeyboard();
}

// Export input helpers used by tests and other modules
export {
  initMoveControls,
  doLeftMove,
  doRightMove,
  doUpMove,
  doDownMove,
};
