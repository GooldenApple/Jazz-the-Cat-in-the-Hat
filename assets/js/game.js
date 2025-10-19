/* =============================
   Jazz the Cat in the Hat – Base Skeleton JS
   ============================= */

/* ----------------------------------------
   Global game state
---------------------------------------- */
const state = {
  running: false,  // game is running or not
  score: 0,        // current score
  lives: 3,        // hearts left
  level: 1,        // current level
  partial: 0,      // damage on the active heart (0..3)
};

/* ----------------------------------------
   Quick HUD refs
   - Stores references to key HUD elements
   - Lets us update lives, score, best, and level quickly
   Usage: hud.score.textContent = 10;
---------------------------------------- */
const hud = {
  lives: document.getElementById('lives'), // container that holds heart icons
  score: document.getElementById('score'), // span/div that shows current score
  best:  document.getElementById('best'),  // element for best/high score display
  level: document.getElementById('level'), // element that shows current level
};

/* ----------------------------------------
   init
   - Resets base game state
   - Renders HUD once
   Usage: call once on DOMContentLoaded
---------------------------------------- */
function init() {
  state.running = false; // ensure stopped
  state.score = 0;       // reset score
  state.lives = 3;       // default lives
  state.level = 1;       // default level
  state.partial = 0;     // no partial damage
  updateHUD();           // sync HUD
}

/* ----------------------------------------
   createHeart
   - Builds one SVG heart with a given state class
   Usage: container.appendChild(createHeart('full'))
---------------------------------------- */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); // create SVG root
  svg.setAttribute('viewBox', '0 0 24 24');                                     // fixed viewbox
  svg.classList.add('svg-heart', stateClass);                                   // shape state

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // heart path
  path.setAttribute(
    'd',
    'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'
  );
  svg.appendChild(path);                                                        // attach path
  return svg;                                                                   // return node
}

/* ----------------------------------------
   renderLives
   - Rebuilds the heart row based on lives + partial
   Usage: renderLives(hud.lives, state.lives, state.partial)
---------------------------------------- */
function renderLives(container, lives, partial = 0, steps = 4) {
  container.innerHTML = '';                                       // clear row

  const safeLives   = Math.max(0, lives);                         // clamp lives
  const safePartial = Math.min(Math.max(partial, 0), steps - 1);  // clamp partial

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart('full'));                   // full hearts
  }

  if (safeLives > 0) {
    let stateClass = 'full';                                      // default full
    if (safePartial === 1) stateClass = 'threequarter';           // degrade 3/4
    if (safePartial === 2) stateClass = 'half';                   // degrade 1/2
    if (safePartial === 3) stateClass = 'quarter';                // degrade 1/4
    container.appendChild(createHeart(stateClass));               // append partial
  }

  if (safeLives <= 0) {
    container.appendChild(createHeart('empty'));                  // at least one empty
  }
}

/* ----------------------------------------
   updateHUD
   - Syncs HUD numbers and lives from state
   Usage: updateHUD()
---------------------------------------- */
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial); // hearts row
  hud.score.textContent = state.score;                // score text
  hud.level.textContent = state.level;                // level text
  // best / soundMode will be wired later               // reserved
}

/* ----------------------------------------
   bindControls
   - Placeholder for keyboard/touch bindings
   Usage: bindControls()
---------------------------------------- */
function bindControls() {
  // to be implemented
}

/* ----------------------------------------
   hit
   - Applies damage in steps; consumes a life after 4 hits
   Usage: hit()
---------------------------------------- */
function hit() {
  if (state.lives <= 0) return;      // no-op if dead
  if (state.partial < 3) {           // step partial damage
    state.partial += 1;              // next notch
  } else {
    state.lives -= 1;                // consume heart
    state.partial = 0;               // reset partial
  }
  updateHUD();                       // refresh HUD
}

/* ----------------------------------------
   heal
   - Restores one full heart and clears partial damage
   Usage: heal()
---------------------------------------- */
function heal() {
  state.lives += 1;  // add life
  state.partial = 0; // clear partial
  updateHUD();       // refresh HUD
}

/* =============================
   Overlay + Play Button Control
   ============================= */
const overlayEl = document.getElementById('overlay');                     // play overlay container
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null; // play button inside

/* ----------------------------------------
   showOverlay
   - Reveals the play overlay
   Usage: showOverlay()
---------------------------------------- */
function showOverlay() {
  overlayEl?.classList.remove('hidden'); // remove hidden flag
}

/* ----------------------------------------
   hideOverlay
   - Hides the play overlay
   Usage: hideOverlay()
---------------------------------------- */
function hideOverlay() {
  overlayEl?.classList.add('hidden');    // add hidden flag
}

/* ----------------------------------------
   wirePlayButton
   - Hides overlay and marks game running when clicked
   Usage: call once on DOMContentLoaded
---------------------------------------- */
function wirePlayButton() {
  if (!playBtn) return;                          // skip if button missing
  playBtn.addEventListener('click', () => {      // on click
    hideOverlay();                               // hide CTA
    state.running = true;                        // mark running
    // TODO: startGame();                        // hook real start here
  });
}

/* =============================
   MOVE CONTROLLER (directional dance)
   - Adds/removes CSS classes to play animations:
     .move-left / .move-right / .move-up / .move-down
   - Exposes one function per move for clarity:
     doLeftMove(), doRightMove(), doUpMove(), doDownMove()
   - Wires both on-screen buttons and keyboard arrows
============================= */

/* ----------------------------------------
   removeAllMoveClasses
   - Ensures we start clean before applying a new move
---------------------------------------- */
function removeAllMoveClasses(dancer) {
  dancer.classList.remove('move-left');  // remove left class if present
  dancer.classList.remove('move-right'); // remove right class if present
  dancer.classList.remove('move-up');    // remove up class if present
  dancer.classList.remove('move-down');  // remove down class if present
}

/* ----------------------------------------
   applyMove
   - Cancels any current move and applies the requested class
   - Automatically removes the class after the first animation end
   Usage: applyMove('move-left')
---------------------------------------- */
function applyMove(moveClass) {
  const dancer = document.getElementById('dancer'); // reference to the cat wrapper
  if (!dancer) return;                               // guard if missing

  removeAllMoveClasses(dancer);                      // clear previous move classes

  // Force a reflow so re-adding a class restarts the CSS animation cleanly
  // (reading offsetWidth is a common way to flush styles)
  // eslint-disable-next-line no-unused-expressions
  dancer.offsetWidth;                                // trigger reflow

  dancer.classList.add(moveClass);                   // apply the requested move

  /* ------------------------------------------------------
     Cleanup after animation:
     - We listen on the wrapper and accept the FIRST event
       bubbling from any animated child (svg, #pose-down, etc.)
     - This works for LEFT/RIGHT/UP (anim on <svg>) and
       for DOWN (anim on #pose-down).
  ------------------------------------------------------ */
  const onEnd = () => {
    dancer.classList.remove(moveClass);              // cleanup move class
    dancer.removeEventListener('animationend', onEnd);// detach listener
    dancer.removeEventListener('animationcancel', onEnd);// safety: cancel also cleans
  };
  dancer.addEventListener('animationend', onEnd, { once: false });
  dancer.addEventListener('animationcancel', onEnd, { once: false });
}

/* ----------------------------------------
   doLeftMove
   - Triggers the LEFT animation (slide + tilt + hat tip)
---------------------------------------- */
function doLeftMove() {
  applyMove('move-left');                            // play left move
}

/* ----------------------------------------
   doRightMove
   - Triggers the RIGHT animation (slide + tilt + hat tip)
---------------------------------------- */
function doRightMove() {
  applyMove('move-right');                           // play right move
}

/* ----------------------------------------
   doUpMove
   - Triggers the UP animation (jump + arms up + micro shake)
---------------------------------------- */
function doUpMove() {
  applyMove('move-up');                              // play up move
}

/* ----------------------------------------
   doDownMove
   - Triggers the DOWN animation (switch to back pose + twerk)
---------------------------------------- */
function doDownMove() {
  applyMove('move-down');                            // play down move
}

/* ----------------------------------------
   wireMoveButtons
   - Hooks on-screen arrow buttons to the corresponding moves
---------------------------------------- */
function wireMoveButtons() {
  document.querySelectorAll('.ctrl-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = String(btn.getAttribute('data-dir') || '').toLowerCase(); // read data-dir
      if (dir === 'left')  doLeftMove();                                     // LEFT button
      if (dir === 'right') doRightMove();                                    // RIGHT button
      if (dir === 'up')    doUpMove();                                       // UP button
      if (dir === 'down')  doDownMove();                                     // DOWN button
    });
  });
}

/* ----------------------------------------
   wireMoveKeyboard
   - Hooks keyboard arrow keys to the corresponding moves
   - Ignores repeated keydown events to avoid spam
---------------------------------------- */
function wireMoveKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;                              // ignore held-down repeats

    // Map Arrow keys to moves (WASD can be added later if needed)
    if (e.key === 'ArrowLeft')  { doLeftMove();  return; }   // ← triggers left
    if (e.key === 'ArrowRight') { doRightMove(); return; }   // → triggers right
    if (e.key === 'ArrowUp')    { doUpMove();    return; }   // ↑ triggers up
    if (e.key === 'ArrowDown')  { doDownMove();  return; }   // ↓ triggers down
  });
}

/* ----------------------------------------
   initMoveControls
   - Public setup to call once after DOM is ready
---------------------------------------- */
function initMoveControls() {
  wireMoveButtons();      // enable on-screen buttons
  wireMoveKeyboard();     // enable keyboard arrows
}

/* =============================
   Navbar / Hamburger behavior
   ============================= */

/* ----------------------------------------
   syncCollapseOnBreakpoint (IIFE context below)
   - Ensures nav is closed and aria cleaned when
     entering/leaving burger band (≤980px)
   Usage: registered on load + matchMedia + orientationchange
---------------------------------------- */
(() => {
  const mq = window.matchMedia('(max-width: 980px)');  // burger band media query

  /* ---------------------------------------------------------
     syncCollapseOnBreakpoint
     - Resets collapse state and ARIA when breakpoint flips
     Usage: internal only
  --------------------------------------------------------- */
  function syncCollapseOnBreakpoint() {
    const collapseEl = document.getElementById('mainNav');         // collapse root
    const toggler    = document.querySelector('.navbar-toggler.hamburger'); // burger button
    if (!collapseEl) return;                                       // nothing to do

    collapseEl.classList.remove('show');                           // force closed
    collapseEl.style.height = '';                                  // clear inline height
    document.body.removeAttribute('data-nav-open');                // clear body flag

    if (toggler) toggler.setAttribute('aria-expanded', 'false');   // aria sync
  }

  window.addEventListener('load', syncCollapseOnBreakpoint);       // run on load
  mq.addEventListener('change', syncCollapseOnBreakpoint);         // on MQ change
  window.addEventListener('orientationchange', syncCollapseOnBreakpoint); // on rotate
})();

/* =============================
   Rotate Overlay Controller 
   - Shows the rotate overlay by CSS when:
       (max-width: 980px) AND (orientation: landscape)
       OR (max-width: 980px) AND (max-height: 480px)
   - Close button hides overlay UNTIL we return to portrait.
   - ARIA kept in sync with visual state.
   Usage:
   - Requires CSS final override (placed last in CSS file):
     body[data-rotate-dismissed="true"] #rotateOverlay { display: none !important; }
============================= */
(() => {
  const body = document.body;                                              // <body> to store dismissal flag
  const rotateOverlay = document.getElementById('rotateOverlay');          // rotate blocker container
  const closeBtn = rotateOverlay ? rotateOverlay.querySelector('.rb-try') : null; // close button inside

  const mqLandscape = window.matchMedia('(orientation: landscape)');       // true if landscape
  const mqBurgerMax = window.matchMedia('(max-width: 980px)');             // true if ≤980px

  /* ---------------------------------------------------------
     updateRotateOverlayAria
     - Syncs aria-hidden to reflect whether overlay SHOULD show
     Usage: call on load / resize / MQ change
  --------------------------------------------------------- */
  function updateRotateOverlayAria() {
    const dismissed = body.getAttribute('data-rotate-dismissed') === 'true';     // has user dismissed?
    const visibleByCSS = mqLandscape.matches && mqBurgerMax.matches;             // CSS would show now?
    const shouldBeVisible = visibleByCSS && !dismissed;                          // final visibility

    if (rotateOverlay) {
      rotateOverlay.setAttribute('aria-hidden', shouldBeVisible ? 'false' : 'true'); // sync aria
    }
  }

  /* ---------------------------------------------------------
     dismissRotateUntilPortrait
     - Hides rotate overlay by setting a data-flag on <body>
     - Overlay stays hidden until we switch back to portrait
     Usage: bound to close button
  --------------------------------------------------------- */
  function dismissRotateUntilPortrait() {
    body.setAttribute('data-rotate-dismissed', 'true'); // mark dismissed
    updateRotateOverlayAria();                           // refresh aria
  }

  /* ---------------------------------------------------------
     resetDismissalIfPortrait
     - Clears dismissal flag after leaving landscape (portrait)
     - Allows overlay to appear again next time in landscape
     Usage: bound to orientation MQ change
  --------------------------------------------------------- */
  function resetDismissalIfPortrait() {
    if (!mqLandscape.matches) {
      body.removeAttribute('data-rotate-dismissed');     // clear flag on portrait
    }
    updateRotateOverlayAria();                           // refresh aria
  }

  // Wire events if overlay exists in DOM
  if (rotateOverlay && closeBtn) {
    closeBtn.addEventListener('click', (e) => {          // handle close click
      e.preventDefault();                                // prevent default
      dismissRotateUntilPortrait();                      // hide until portrait
    });

    mqLandscape.addEventListener('change', resetDismissalIfPortrait); // orientation changes
    mqBurgerMax.addEventListener('change', updateRotateOverlayAria);  // width changes
    window.addEventListener('resize', updateRotateOverlayAria);       // safety on resize

    updateRotateOverlayAria();                           // initial sync on load
  }
})();

/* =============================
   DOM Ready bootstrap
   - Initializes HUD, shows Play CTA, wires nav collapse flags,
     and binds nav button close + play button handler.
============================= */
document.addEventListener('DOMContentLoaded', () => {
  init();                          // reset game + HUD
  bindControls();                  // (placeholder) input setup
  showOverlay();                   // show Play CTA on first load
  wirePlayButton();                // hook play button
  initMoveControls();              // wire buttons + keyboard for moves

  const navCollapse = document.getElementById('mainNav'); // Bootstrap collapse root
  if (navCollapse) {
    // When nav opens, mark <body> so CSS can morph burger into "X"
    navCollapse.addEventListener('shown.bs.collapse', () => {
      document.body.setAttribute('data-nav-open', '');    // set open flag
    });
    // When nav closes, remove the body flag
    navCollapse.addEventListener('hidden.bs.collapse', () => {
      document.body.removeAttribute('data-nav-open');     // clear flag
    });
  }

  // Close collapse when a nav button is clicked (mobile UX)
  document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const collapseEl = document.getElementById('mainNav');                 // collapse root
      if (collapseEl && collapseEl.classList.contains('show')) {             // only if open
        const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl); // get instance
        collapse.hide();                                                     // close
      }
    });
  });
});

/* ----------------------------------------
   DEV test hooks (Console helpers)
   - Expose move functions on window so you can call them in DevTools
   - Safe in production; only attaches references
---------------------------------------- */
(function exposeDevHooks() {
  // guard: make sure window exists (it does in browsers)
  if (typeof window === 'undefined') return;

  // map our internal functions to global names for quick testing
  window.doLeftMove  = doLeftMove;   // call in Console: doLeftMove()
  window.doRightMove = doRightMove;  // call in Console: doRightMove()
  window.doUpMove    = doUpMove;     // call in Console: doUpMove()
  window.doDownMove  = doDownMove;   // call in Console: doDownMove()
})();
