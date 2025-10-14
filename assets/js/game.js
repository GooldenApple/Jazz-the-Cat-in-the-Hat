// =============================
// Jazz the Cat in the Hat – Base Skeleton JS
// =============================

// --- State (minimal right now) ---
const state = {
  running: false,   // true when game loop is active
  score: 0,
  lives: 3,
  level: 1,
};

// --- DOM refs ---
const hud = {
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  best: document.getElementById('best'),
  level: document.getElementById('level'),
  soundMode: document.getElementById('soundMode'),
};

const overlay = document.getElementById('overlay');

// --- Init ---
function init() {
  // reset state values
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.level = 1;

  // update HUD to match reset values
  updateHUD();
}

// --- HUD update ---
function updateHUD() {
  hud.lives.textContent = "❤️".repeat(state.lives);
  hud.score.textContent = state.score;
  hud.level.textContent = state.level;
  // best + soundMode will be handled later
}

// --- Controls (placeholder for now) ---
function bindControls() {
  // attach listeners later (keyboard + touch)
}

// --- Start ---
window.addEventListener('DOMContentLoaded', () => {
  init();
  bindControls();
});