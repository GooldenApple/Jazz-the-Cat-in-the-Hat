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

/* Quick HUD refs */
const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  best:  document.getElementById('best'),
  level: document.getElementById('level'),
};

/* ----------------------------------------
   Game init + HUD rendering
---------------------------------------- */
function init() {
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.partial = 0;
  updateHUD();
}

/* Build a single SVG heart with a given state class */
function createHeart(stateClass) {
  const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.classList.add('svg-heart', stateClass);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M12 21s-6.2-4.35-9.2-8.28C1 10.5 2.5 6 6.5 6c2.2 0 3.5 1.5 5.5 3.5C14 7.5 15.3 6 17.5 6c4 0 5.5 4.5 3.7 6.72C18.2 16.65 12 21 12 21z'
  );
  svg.appendChild(path);
  return svg;
}

/* Render the full lives row into the HUD */
function renderLives(container, lives, partial = 0, steps = 4) {
  container.innerHTML = '';

  const safeLives   = Math.max(0, lives);
  const safePartial = Math.min(Math.max(partial, 0), steps - 1);

  for (let i = 0; i < Math.max(safeLives - 1, 0); i++) {
    container.appendChild(createHeart('full'));
  }

  if (safeLives > 0) {
    let stateClass = 'full';
    if (safePartial === 1) stateClass = 'threequarter';
    if (safePartial === 2) stateClass = 'half';
    if (safePartial === 3) stateClass = 'quarter';
    container.appendChild(createHeart(stateClass));
  }

  if (safeLives <= 0) {
    container.appendChild(createHeart('empty'));
  }
}

/* Sync all HUD values from state */
function updateHUD() {
  renderLives(hud.lives, state.lives, state.partial);
  hud.score.textContent = state.score;
  hud.level.textContent = state.level;
  // best / soundMode will be wired later
}

/* Placeholder for input bindings (keyboard/touch) */
function bindControls() {
  // to be implemented
}

/* Take damage step-by-step; consume a life when needed */
function hit() {
  if (state.lives <= 0) return;
  if (state.partial < 3) {
    state.partial += 1;
  } else {
    state.lives -= 1;
    state.partial = 0;
  }
  updateHUD();
}

/* Gain one full heart */
function heal() {
  state.lives += 1;
  state.partial = 0;
  updateHUD();
}

/* =============================
   Overlay + Play Button Control
   ============================= */

const overlayEl = document.getElementById('overlay');
const playBtn   = overlayEl ? overlayEl.querySelector('.play-btn') : null;

/* Show overlay when not running */
function showOverlay() {
  overlayEl?.classList.remove('hidden');
}

/* Show overlay on initial load so the CTA is visible */
window.addEventListener('DOMContentLoaded', () => {
  overlayEl?.classList.remove('hidden');
});

/* Hide overlay when starting the game */
function hideOverlay() {
  overlayEl?.classList.add('hidden');
}

/* Start button → hide overlay, mark running (hook real start later) */
if (playBtn) {
  playBtn.addEventListener('click', () => {
    hideOverlay();
    state.running = true;
    // TODO: startGame();
  });
}

/* =============================
   Navbar / Hamburger behavior
   ============================= */

/* On page ready: init HUD and wire Bootstrap collapse events */
window.addEventListener('DOMContentLoaded', () => {
  init();
  bindControls();

  const navCollapse = document.getElementById('mainNav'); // Bootstrap .collapse
  if (navCollapse) {
    // When nav opens, mark <body> so CSS can morph burger into "X"
    navCollapse.addEventListener('shown.bs.collapse', () => {
      document.body.setAttribute('data-nav-open', '');
    });
    // When nav closes, remove the flag
    navCollapse.addEventListener('hidden.bs.collapse', () => {
      document.body.removeAttribute('data-nav-open');
    });
  }
});

/* Close the collapse when a nav button is clicked */
document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const collapseEl = document.getElementById('mainNav');
    if (collapseEl && collapseEl.classList.contains('show')) {
      const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl);
      collapse.hide();
    }
  });
});

/* ----------------------------------------
   Breakpoint guard (≤980px burger band)
   - Always start CLOSED when entering burger band
   - Clean up stray inline styles / aria state
   - Also clean up when leaving burger band
---------------------------------------- */
(() => {
  const mq = window.matchMedia('(max-width: 980px)');

  const syncCollapseOnBreakpoint = () => {
    const collapseEl = document.getElementById('mainNav');
    const toggler    = document.querySelector('.navbar-toggler.hamburger');
    if (!collapseEl) return;

    // Always reset to a clean, closed state on breakpoint flips
    collapseEl.classList.remove('show');   // remove sticky open
    collapseEl.style.height = '';          // clear inline height (Bootstrap may set it)
    document.body.removeAttribute('data-nav-open');

    // Keep ARIA in sync (prevents stuck "expanded" state)
    if (toggler) toggler.setAttribute('aria-expanded', 'false');
  };

  // Run on load and whenever the max-width:980 match flips
  window.addEventListener('load', syncCollapseOnBreakpoint);
  mq.addEventListener('change', syncCollapseOnBreakpoint);
  window.addEventListener('orientationchange', syncCollapseOnBreakpoint);
})();
