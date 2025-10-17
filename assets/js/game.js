/* =============================
   Jazz the Cat in the Hat – Base Skeleton JS
   =============================
*/

// keeps track of all game values I need
const state = {
  running: false,   // game is running or not
  score: 0,         // my score
  lives: 3,         // how many hearts I have
  level: 1,         // current level
  partial: 0,       // how damaged the current heart is (0=full → 3=almost empty)
};

// quick refs so I don’t have to type getElementById all the time
const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  level: document.getElementById('level'),
};

const overlay = document.getElementById('overlay');

/* reset everything when game starts, Draws a fresh HUD with full lives, score 0, level 1.
   example: calling init() will set score=0, lives=3, level=1, and draw full hearts
*/
function init() {
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.partial = 0; // hearts start full

  updateHUD(); // make HUD match these values
}

/* 
  Creates a single SVG heart element with a given state.
  States: "full", "threequarter", "half", "quarter", "empty".
  
  Example:
    const heart = createHeart("half");
    hud.lives.appendChild(heart); 
*/
function createHeart(stateClass) {
  // create the <svg> element in the SVG namespace
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.classList.add("svg-heart", stateClass);

  // path that makes the heart shape
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z"
  );

  // attach the path into the svg
  svg.appendChild(path);

  return svg; // return the finished <svg>
}

/* 
  Renders all hearts into the HUD container.

  - container: the DOM node where hearts go (hud.lives).
  - lives: how many total lives are left.
  - partial: how damaged the current active heart is (0=full → 3=quarter).
  - steps: how many depletion steps exist (default = 4).

  Example:
    renderLives(hud.lives, 3, 0)   → [full, full, full]
    renderLives(hud.lives, 2, 1)   → [full, threequarter]
    renderLives(hud.lives, 0, 0)   → [empty]
*/
function renderLives(container, lives, partial = 0, steps = 4) {
  // clear out any old hearts
  container.innerHTML = "";

  // keep values safe
  const safeLives = Math.max(0, lives);
  const safePartial = Math.min(Math.max(partial, 0), steps - 1);

  // draw all full hearts except the active one
  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart("full"));
  }

  // if at least one life remains → draw the active heart
  if (safeLives > 0) {
    let stateClass = "full";
    if (safePartial === 1) stateClass = "threequarter";
    if (safePartial === 2) stateClass = "half";
    if (safePartial === 3) stateClass = "quarter";
    container.appendChild(createHeart(stateClass));
  }

  // if no lives left → show one faint empty heart
  if (safeLives <= 0) {
    container.appendChild(createHeart("empty"));
  }
}

/* 
  Refreshes all HUD values so they match the state object.
  Example:
    state.score = 50;
    updateHUD(); // HUD shows 50 in score box
*/
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial); // update hearts
  hud.score.textContent = state.score;               // update score
  hud.level.textContent = state.level;               // update level
  // best + soundMode will be added later
}

/* 
  Placeholder function for connecting keyboard + touch controls.
  Will be implemented later.
*/
function bindControls() {
  // nothing here yet
}

/* 
  Damages the current heart step by step.
  If the heart is fully damaged, removes one life.
  
  Example:
    hit(); // reduces partial damage or removes a life
*/
function hit() {
  if (state.lives <= 0) return; // no lives left
  if (state.partial < 3) {
    state.partial += 1; // damage current heart more
  } else {
    state.lives -= 1;   // lose one full heart
    state.partial = 0;  // reset partial for next heart
  }
  updateHUD(); // refresh HUD to show changes
}

/* 
  Adds one extra heart (life). New heart always starts full.
  Example: heal(); // +1 full heart to lives
*/
function heal() {
  state.lives += 1;     // add one heart
  state.partial = 0;    // reset partial
  updateHUD();          // refresh HUD
}


/* =============================
   Overlay + Play Button Control
   ============================= */

/* I want to cache these elements so I don't query them again */
const overlayEl = document.getElementById('overlay');
const playBtn = overlayEl.querySelector('.play-btn');

/* showOverlay()
   shows the overlay when game is not running
   example: showOverlay() → overlay becomes visible */
function showOverlay() {
  overlayEl.classList.remove('hidden');
}

/* show overlay on load so I can style the play button */
window.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.remove('hidden'); // reveal the play CTA
});

/* hideOverlay()
   hides the overlay when game starts running
   example: hideOverlay() → overlay disappears */
function hideOverlay() {
  overlayEl.classList.add('hidden');
}

/* handle clicking the play button
   example: user clicks → hide overlay and start game */
playBtn.addEventListener('click', () => {
  hideOverlay();
  state.running = true;   // game is running now
  // later I will call actual startGame() logic here
});

/* ----------------------------------------
   Mobile nav toggle (hamburger)
   ---------------------------------------- */
(() => {
  const btn = document.getElementById('navToggle');
  const list = document.getElementById('primaryNav');
  if (!btn || !list) return;

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    document.body.toggleAttribute('data-nav-open'); // CSS reads this
  });
})();




/* 
  DOMContentLoaded
  Runs when the page is ready.
  Calls init() to reset HUD and bindControls() (later).
*/
window.addEventListener('DOMContentLoaded', () => {
  init();
  bindControls();
  
const nav = document.getElementById('mainNav'); // Get the collapsible nav element (Bootstrap controls this)

// Safeguard: only if the collapse element exists (mobile/Bootstrap present)
if (nav) {
  // When the menu opens → mark <body> so CSS can morph bars into an "X"
  nav.addEventListener('shown.bs.collapse', () => {
    document.body.setAttribute('data-nav-open', '');
  });

  // When it closes, remove the flag so bars go back to hamburger
  nav.addEventListener('hidden.bs.collapse', () => {
    document.body.removeAttribute('data-nav-open');
  });
}
});

document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const collapseEl = document.getElementById('mainNav');
    if (collapseEl && collapseEl.classList.contains('show')) {
      
      const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl);
      collapse.hide();
    }
  });
});


/* ----------------------------------------------
   Landscape overlay control (session opt-out)
   - Shows overlay in landscape
   - "Try anyway" hides it (for this session)
   ---------------------------------------------- */
(() => {
  const blocker = document.getElementById('rotateBlocker'); // overlay node
  const btnTry  = blocker?.querySelector('.rb-try');        // continue button

  // show/hide depending on orientation + user choice
  const syncBlocker = () => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches; // state
    const allowed = sessionStorage.getItem('allowLandscape') === '1';          // user opt-out
    blocker.style.display = (!allowed && isLandscape) ? 'flex' : 'none';       // toggle
  };

  // allow landscape for this tab/session
  btnTry?.addEventListener('click', () => {
    sessionStorage.setItem('allowLandscape', '1');           // remember choice
    document.body.setAttribute('data-allow-landscape', '');  // CSS hook
    syncBlocker();                                           // update view
  });

  // keep in sync on rotate/resize/load
  window.addEventListener('orientationchange', syncBlocker); // device rotate
  window.addEventListener('resize', syncBlocker);            // viewport changes
  window.addEventListener('DOMContentLoaded', syncBlocker);  // initial
})();

/* Prevent pinch-zoom gestures on iOS Safari */
(() => {
  const block = (e) => e.preventDefault(); // stop default zoom
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('gestureend', block,   { passive: false });
})();