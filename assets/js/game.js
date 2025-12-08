/* =============================
   Jazz the Cat in the Hat – Base game.JS
   ============================= */

import { SONGS } from './songRegistry.js';

// UI helpers used during app bootstrap and UI wiring
import {
  setOverlayLabel,
  updatePlayMenuLabel,
  wirePlayButton,
  initNavbarCollapseSync,
  initRotateOverlay,
  HUD_MODE_KEY,
  setHudInlineMode,
  wireHudInlineToggle,
  bindControls,
  bindFutureControlsPlaceholder,
  showOverlay,
  hideOverlay,
  setFeedback,
  showPauseOverlay,
  showResultsOverlay,
  showGameOverOverlay,
  initResultOverlays,
  setOverlayIcon,
  initTopbarAutoHeight,
  wireMenuPlayToggle,
  setPlayTip,
  updateHUD,
  initBonusBannerFX,
  unlockFxOnce,
} from './ui.js';

import {
  ensureContext,      /* create/get shared AudioContext + master gain */
  loadAudioBuffer,    /* fetch & decode -> AudioBuffer (cached) */
  playBuffer,         /* play current/given buffer via master */
  stop,               /* stop current source */
  getSongTimeMs,      /* current playback time in ms */
  setMasterVolume,    /* master volume 0..1 */
  isPlaying           /* boolean, playing flag */
} from './audio.js';

// Input: maps buttons/keyboard to game intents
import { initMoveControls } from './input.js';

// Scoring: bootstraps score/lives state and HUD sync trigger
import {
  init as initScoring,
  state,
  getSnapshot,
  setHooks,
  clearAllNotes,
  resetPerLevelForNextRun,
  setJudgeWindows,
} from './scoring.js';

// Song player: chart-driven spawns + audio lifecycle
import {
  startSongForLevel,
  stopSong,
  cancelPendingStart,
} from './songPlayer.js';

// Lightweight dev sanity check: confirms module load
console.log('[game] module loaded');


// Countdown helpers and state

/**
 * Resolve countdown seconds from live settings or localStorage.
 * Falls back to 3 seconds if value is missing or invalid.
 */
function getCountdownSec() {
  const live = Number(window.__settings?.countdown);
  if (Number.isFinite(live) && live >= 0) return live;
  try {
    const raw = localStorage.getItem('settings');
    if (raw) {
      const s = JSON.parse(raw);
      const v = Number(s?.countdown);
      if (Number.isFinite(v) && v >= 0) return v;
    }
  } catch {}
  return 3;
}

let _startingRun = false;      // prevents double-start during countdown/loading
let _cdInterval = null;        // countdown tick interval id
let _cdAfterGoTimer = null;    // short GO! timeout id

/**
 * Clear any active countdown timers to avoid stale label updates.
 */
function cancelOverlayCountdown() {
  if (_cdInterval) {
    clearInterval(_cdInterval);
    _cdInterval = null;
  }
  if (_cdAfterGoTimer) {
    clearTimeout(_cdAfterGoTimer);
    _cdAfterGoTimer = null;
  }
}

/**
 * Show a 3–2–1 countdown on the overlay label.
 * Safe to restart and cancel; supports 0s (no countdown).
 */
function runOverlayCountdown(seconds = 3) {
  cancelOverlayCountdown();
  const total = Math.max(0, Math.floor(seconds));

  if (total === 0) {
    setOverlayLabel('');
    return;
  }

  let left = total;
  setOverlayLabel(String(left));
  _cdInterval = setInterval(() => {
    left -= 1;
    if (left > 0) {
      setOverlayLabel(String(left));
      return;
    }
    clearInterval(_cdInterval);
    _cdInterval = null;
    setOverlayLabel('GO!');
    _cdAfterGoTimer = setTimeout(() => {
      setOverlayLabel('Play');
      _cdAfterGoTimer = null;
    }, 600);
  }, 1000);
}

/**
 * Start the current level with a countdown.
 * Guards against double-start while a run or countdown is already active.
 */
async function startLevelWithCountdown() {
  if (_startingRun || state.running) return;
  _startingRun = true;

  const hasSongs = Array.isArray(SONGS) && SONGS.length > 0;
  if (!hasSongs) {
    state.running = false;
    document.body.setAttribute('data-paused', 'true');
    document.body.removeAttribute('data-starting');
    setOverlayIcon('play');
    updatePlayMenuLabel();
    setOverlayLabel('No songs installed');
    showOverlay();
    _startingRun = false;
    return;
  }

  document.body.setAttribute('data-paused', 'true');
  state.running = false;
  document.body.setAttribute('data-starting', 'true');
  setOverlayIcon('pause');
  updatePlayMenuLabel();
  setOverlayLabel('');
  showOverlay();

  try {
    await startSongForLevel(state.level, { countdownSec: getCountdownSec() });
  } catch (err) {
    console.error('[game] failed to start level:', err);
    state.running = false;
    document.body.setAttribute('data-paused', 'true');
    document.body.removeAttribute('data-starting');
    setOverlayIcon('play');
    updatePlayMenuLabel();
    setOverlayLabel('Play');
    showOverlay();
  } finally {
    _startingRun = false;
  }
}

/**
 * Initialise scoring state, wire HUD hooks and paint HUD once.
 */
function setupScoringAndHUD() {
  initScoring();
  setHooks({ onUpdate: (snapshot) => updateHUD(snapshot) });
  updateHUD(getSnapshot());
  setOverlayLabel('Play');
  setOverlayIcon('play');
  setPlayTip('Hit the correct arrow when an orb crosses the neon target!');
  document.body.setAttribute('data-paused', 'true');
  updatePlayMenuLabel();
}

/**
 * Ensure the overlay element is visible when the app boots.
 */
function ensureOverlayVisibleOnBoot() {
  const overlay = document.getElementById('overlay');
  console.log('[game] overlay exists:', !!overlay);
  if (overlay) overlay.classList.remove('hidden');
}

/**
 * Wire Play button, menu Play/Pause, and keyboard/touch controls.
 */
function wireOverlayAndInput() {
  wirePlayButton(() => {
    if (_startingRun || state.running) {
      window.dispatchEvent(new CustomEvent('ui:requestPause'));
    } else {
      startLevelWithCountdown();
    }
  });

  wireMenuPlayToggle(() => {
    if (_startingRun || state.running) {
      window.dispatchEvent(new CustomEvent('ui:requestPause'));
    } else {
      startLevelWithCountdown();
    }
  });

  initMoveControls();
  bindControls();
}

/**
 * Initialise topbar height, navbar collapse sync, and rotate overlay behaviour.
 */
function initTopbarAndNav() {
  initTopbarAutoHeight();
  initNavbarCollapseSync();
  initRotateOverlay();
}

/**
 * Restore HUD inline/collapsed mode from storage and wire its toggle.
 */
function setupHUDInlineMode() {
  try {
    const hv = localStorage.getItem(HUD_MODE_KEY);
    if (hv) setHudInlineMode(hv);
  } catch {}
  wireHudInlineToggle();
}

/**
 * Bind all global window-level listeners used by the game lifecycle.
 */
function wireGlobalListeners() {
  window.addEventListener('song:ready', onSongReady);
  window.addEventListener('song:started', onSongStarted);
  window.addEventListener('song:ended', onSongEnded);
  window.addEventListener('song:error', onSongError);
  window.addEventListener('ui:requestPause', onPauseRequested);
  window.addEventListener('game:livesDepleted', onLivesDepleted);
  window.addEventListener('ui:requestStartRun', () => startLevelWithCountdown());

  window.addEventListener('ui:nextLevel', onNextLevel);
  window.addEventListener('ui:restartLevel', onRestartLevel);
  window.addEventListener('ui:retryLevel', onRetryAfterGameOver);
}

/**
 * Prepare overlay for countdown when the song is ready.
 * Hides any result/game-over panels and starts the countdown label.
 */
function onSongReady() {
  cancelOverlayCountdown();
  showOverlay();
  document.body.setAttribute('data-paused', 'true');

  const res = document.getElementById('resultsCta');
  const go  = document.getElementById('gameOverCta');
  if (res) res.classList.add('hidden');
  if (go)  go.classList.add('hidden');

  const baseCta = document.querySelector('#overlay .play-cta');
  if (baseCta) baseCta.classList.remove('hidden');

  runOverlayCountdown(getCountdownSec());
  setOverlayIcon('pause');
  updatePlayMenuLabel();
}

/**
 * Enter running state when the song actually starts.
 * Clears countdown and hides the overlay.
 */
function onSongStarted() {
  cancelOverlayCountdown();
  document.body.removeAttribute('data-paused');
  state.running = true;
  updatePlayMenuLabel();
  hideOverlay();
  setOverlayIcon(null);
  document.body.removeAttribute('data-starting');
}

/**
 * Handle pause requests from quick button, menu or overlay.
 * If a countdown is active, cancels it and cancels the pending start.
 */
function onPauseRequested() {
  if (document.body.dataset.starting === 'true') {
    cancelOverlayCountdown();
    cancelPendingStart();

    document.body.removeAttribute('data-starting');
    document.body.setAttribute('data-paused', 'true');
    setOverlayIcon('play');
    updatePlayMenuLabel();
    showPauseOverlay();
    state.running = false;
    return;
  }

  // Normal pause path during active gameplay
  stopSong('paused');
  showPauseOverlay();
}

/**
 * Handle song end and decide between Results or Game Over overlays.
 */
function onSongEnded(e) {
  cancelOverlayCountdown();
  document.body.setAttribute('data-paused', 'true');
  state.running = false;
  setOverlayIcon('play');
  updatePlayMenuLabel();

  const reason = e?.detail?.reason || 'completed';

  // Pause is handled separately and should not show a result panel.
  if (reason === 'paused') {
    return;
  }

  const snap = getSnapshot();
  const payload = {
    level: snap.level,
    score: snap.score,
    maxCombo: snap.maxCombo
  };

  if (reason === 'failed' || state.lives <= 0) {
    showGameOverOverlay(payload);
  } else {
    showResultsOverlay(payload);
  }
}

/**
 * Handle audio/chart load errors gracefully and keep UI usable.
 */
function onSongError(e) {
  cancelOverlayCountdown();
  state.running = false;
  document.body.setAttribute('data-paused', 'true');
  setOverlayIcon('play');
  updatePlayMenuLabel();

  const msg = e?.detail?.message || 'Could not load the song';
  setOverlayLabel(msg);
  showOverlay();
  console.error('[song:error]', e?.detail || e);
}

/**
 * Restart the current level:
 * reset per-level scoring and notes, then start with a countdown.
 */
function onRestartLevel() {
  resetPerLevelForNextRun();
  clearAllNotes();
  startLevelWithCountdown();
}

/**
 * Move to the next level and start with a countdown.
 */
function onNextLevel() {
  state.level = state.level + 1;
  resetPerLevelForNextRun();
  clearAllNotes();
  startLevelWithCountdown();
}

/**
 * Handle "lives depleted" events by stopping the song as failure.
 */
function onLivesDepleted() {
  try { stopSong('failed'); } catch {}
}

/**
 * Full new-run reset after Game Over.
 * Resets scoring, clears notes, repaints HUD and starts from level 1.
 */
function onRetryAfterGameOver() {
  cancelOverlayCountdown();
  try { stopSong('stopped'); } catch {}
  clearAllNotes();

  initScoring();
  updateHUD(getSnapshot());
  startLevelWithCountdown();
}

/**
 * Bootstrap entry point: wires all systems on DOM ready
 * and ensures a visible, interactive overlay on first load.
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupScoringAndHUD();
    ensureOverlayVisibleOnBoot();
    initResultOverlays();
    initBonusBannerFX();
    wireOverlayAndInput();
    initTopbarAndNav();
    setupHUDInlineMode();
    wireMobileNavClose();
    bindFutureControlsPlaceholder();
    wireGlobalListeners();
  } catch (err) {
    console.error('[INIT ERROR]', err);
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
});

// Close the collapsed navbar when a link is clicked (improves mobile UX).

function wireMobileNavClose() {
  const nav = document.getElementById('navbarNav');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const toggler = document.querySelector('.navbar-toggler');
    if (toggler && getComputedStyle(toggler).display !== 'none') {
      toggler.click();
    }
  });
}
