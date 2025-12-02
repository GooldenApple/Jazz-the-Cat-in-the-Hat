/* =============================
   Jazz the Cat in the Hat – Base game.JS
   ============================= */

import { SONGS } from './songRegistry.js';

// ui (DOM helpers used during app bootstrap and UI wiring)
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

// inputs (maps buttons/keyboard to game intents)
import { initMoveControls } from './input.js'; // exposes input setup

// scoring (bootstraps score/lives state and HUD sync trigger)
import {
  init as initScoring,
  state,
  getSnapshot,
  setHooks,
  clearAllNotes,
  resetPerLevelForNextRun,
  setJudgeWindows,
} from './scoring.js'; // scoring API

// song player (chart-driven spawns + audio lifecycle)
import {
  startSongForLevel,
  stopSong,
} from './songPlayer.js';

// --- TEMP DEBUG: module loaded ---
console.log('[game] module loaded'); // prints that this module loaded


/**
 * getCountdownSec()
 * Resolve countdown seconds from settings/localStorage; fallback to 3.
 */
function getCountdownSec() {
  const live = Number(window.__settings?.countdown);      // read live value
  if (Number.isFinite(live) && live >= 0) return live;    // valid → return
  try {
    const raw = localStorage.getItem('settings');         // get settings json
    if (raw) {
      const s = JSON.parse(raw);                          // parse json
      const v = Number(s?.countdown);                     // read countdown
      if (Number.isFinite(v) && v >= 0) return v;         // valid → return
    }
  } catch {}                                              // ignore storage errors
  return 3;                                               // final fallback
}

let _startingRun = false;      // prevents double-start during countdown/loading
let _cdInterval = null;        // tick interval id
let _cdAfterGoTimer = null;    // brief GO! timeout id

/**
 * cancelOverlayCountdown()
 * Clear any active countdown timers to avoid stale label updates.
 */
function cancelOverlayCountdown() {
  if (_cdInterval) { clearInterval(_cdInterval); _cdInterval = null; }        // clear tick
  if (_cdAfterGoTimer) { clearTimeout(_cdAfterGoTimer); _cdAfterGoTimer = null; } // clear GO timeout
}

/**
 * runOverlayCountdown()
 * Show a 3-2-1 countdown on the overlay label; safe to restart and cancel.
 */
function runOverlayCountdown(seconds = 3) {
  cancelOverlayCountdown();                          // prevent overlap
  const total = Math.max(0, Math.floor(seconds));    // clamp integer ≥ 0

  if (total === 0) {                                  // zero = no countdown
    setOverlayLabel('');                              // no number on label
    return;                                           // skip timers entirely
  }

  let left = total;                                   // remaining seconds
  setOverlayLabel(String(left));                      // draw initial value
  _cdInterval = setInterval(() => {                   // start 1s tick
    left -= 1;                                        // decrement
    if (left > 0) {                                   // still ticking
      setOverlayLabel(String(left));                  // draw next number
      return;                                         // continue
    }
    clearInterval(_cdInterval);                       // stop ticking
    _cdInterval = null;                               // drop handle
    setOverlayLabel('GO!');                           // flash GO!
    _cdAfterGoTimer = setTimeout(() => {              // schedule restore
      setOverlayLabel('Play');                        // back to Play
      _cdAfterGoTimer = null;                         // drop handle
    }, 600);                                          // short flash
  }, 1000);                                           // 1s step
}

/**
 * startLevelWithCountdown()
 * Start current level with overlay countdown; safe against double-start.
 */
async function startLevelWithCountdown() {
  if (_startingRun || state.running) return;                 // guard re-entry
  _startingRun = true;                                       // lock start

  const hasSongs = Array.isArray(SONGS) && SONGS.length > 0; // registry check
  if (!hasSongs) {
    state.running = false;                                   // not running
    document.body.setAttribute('data-paused', 'true');       // freeze visuals
    document.body.removeAttribute('data-starting');          // clear starting flag
    setOverlayIcon('play');                                  // show play glyph
    updatePlayMenuLabel();                                   // sync labels
    setOverlayLabel('No songs installed');                   // message
    showOverlay();                                           // ensure visible
    _startingRun = false;                                    // unlock
    return;                                                  // exit
  }

  document.body.setAttribute('data-paused', 'true');         // freeze visuals
  state.running = false;                                     // disable judging
  document.body.setAttribute('data-starting', 'true');       // mark starting
  setOverlayIcon('pause');                                    // show pause glyph
  updatePlayMenuLabel();                                      // sync labels
  setOverlayLabel('');                                        // countdown draws
  showOverlay();                                              // ensure visible

  try {
    await startSongForLevel(state.level, { countdownSec: getCountdownSec() }); // start
  } catch (err) {
    console.error('[game] failed to start level:', err);      // log
    state.running = false;                                    // not running
    document.body.setAttribute('data-paused', 'true');        // freeze visuals
    document.body.removeAttribute('data-starting');           // clear starting
    setOverlayIcon('play');                                   // show play glyph
    updatePlayMenuLabel();                                    // sync labels
    setOverlayLabel('Play');                                  // neutral label
    showOverlay();                                            // visible overlay
  } finally {
    _startingRun = false;                                     // unlock
  }
}

/* -------------------------------------------------
   Small, focused helpers to keep code readable
-------------------------------------------------- */

/**
 * setupScoringAndHUD()
 * Initialize scoring state, wire HUD update hook, and paint HUD once.
 */
function setupScoringAndHUD() {
  initScoring();                                              // reset scoring
  setHooks({ onUpdate: (snapshot) => updateHUD(snapshot) });  // hook HUD updates
  updateHUD(getSnapshot());                                   // paint HUD once
  setOverlayLabel('Play');                                    // default overlay label
  setOverlayIcon('play');                                   // default overlay ICON
  setPlayTip('Hit the correct arrow when an orb crosses the neon target!'); // tip text
  document.body.setAttribute('data-paused', 'true');          // visuals paused
  updatePlayMenuLabel();                                      // sync labels
}

/**
 * ensureOverlayVisibleOnBoot()
 * Make sure overlay element is visible at first load.
 */
function ensureOverlayVisibleOnBoot() {
  const overlay = document.getElementById('overlay');         // read element
  console.log('[game] overlay exists:', !!overlay);           // log existence
  if (overlay) overlay.classList.remove('hidden');            // ensure visible
}

/**
 * wireOverlayAndInput()
 * Wire Play button, menu Play/Pause, and on-screen/keyboard controls.
 */
function wireOverlayAndInput() {
  wirePlayButton(() => {                                      // overlay CTA
    if (_startingRun || state.running) {                      // running → pause
      window.dispatchEvent(new CustomEvent('ui:requestPause')); // request pause
    } else {                                                  // idle → start
      startLevelWithCountdown();                              // start with countdown
    }
  });

  // Menu Play/Pause toggle in navbar
  wireMenuPlayToggle(() => {
    if (_startingRun || state.running) {
      window.dispatchEvent(new CustomEvent('ui:requestPause'));
    } else {
      startLevelWithCountdown();
    }
  });

  // Input (keyboard + on-screen arrows)
  initMoveControls();                                         // map inputs
  bindControls();                                             // onscreen arrows active
}

/**
 * initTopbarAndNav()
 * Initialize topbar auto-height, navbar collapse sync, rotate overlay.
 */
function initTopbarAndNav() {
  initTopbarAutoHeight();          // compute/meaure topbar height
  initNavbarCollapseSync();        // sync body[data-nav-open]
  initRotateOverlay();             // wire rotate overlay a11y
}

/**
 * setupHUDInlineMode()
 * Restore HUD inline/collapsed mode from storage and wire toggle.
 */
function setupHUDInlineMode() {
  try {
    const hv = localStorage.getItem(HUD_MODE_KEY);  // read value
    if (hv) setHudInlineMode(hv);                   // apply
  } catch {}
  wireHudInlineToggle();                            // wire toggle
}

/**
 * wireGlobalListeners()
 * Bind all window-level event listeners to named handlers (guarded)
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
 * onSongReady()
 * Prepare overlay for countdown; hide residual panels.
 */
function onSongReady() {
  cancelOverlayCountdown();                                   // clear timers
  showOverlay();                                              // show overlay
  document.body.setAttribute('data-paused', 'true');          // freeze visuals

  const res = document.getElementById('resultsCta');          // results panel
  const go  = document.getElementById('gameOverCta');         // game over panel
  if (res) res.classList.add('hidden');                       // hide results
  if (go)  go.classList.add('hidden');                        // hide game over

  const baseCta = document.querySelector('#overlay .play-cta'); // base CTA block
  if (baseCta) baseCta.classList.remove('hidden');            // ensure visible

  runOverlayCountdown(getCountdownSec());                     // drive label
  setOverlayIcon('pause');                                    // show pause glyph
  updatePlayMenuLabel();                                      // sync menu label
}

/**
 * onSongStarted()
 * Enter running state: unfreeze visuals and hide overlay.
 */
function onSongStarted() {
  cancelOverlayCountdown();                                   // clear timers
  document.body.removeAttribute('data-paused');               // unfreeze
  state.running = true;                                       // enable judging
  updatePlayMenuLabel();                                      // sync labels
  hideOverlay();                                              // hide overlay
  setOverlayIcon(null);                                       // release glyph
  document.body.removeAttribute('data-starting');             // clear starting flag
}

/**
 * Pause intent from quick PP or menu
 * If countdown is active, abort it and freeze in Pause
 */

function onPauseRequested() {
  if (document.body.dataset.starting === 'true') {
    cancelOverlayCountdown();                      // stop countdown UI/timers
    document.body.removeAttribute('data-starting'); // no longer starting
    document.body.setAttribute('data-paused', 'true'); // keep visuals frozen
    setOverlayIcon('play');                        // show big Play to resume
    updatePlayMenuLabel();                         // sync menu label
    showPauseOverlay();                            // show Pause panel
    state.running = false;                         // not running
    return;                                        // do NOT stopSong() here
  }

  // Normal pause during gameplay
  stopSong('paused');                              // this path is fine
  showPauseOverlay();                              // show Pause panel
}


/**
 * onSongEnded(e)
 * Decide whether to show Results or Game Over based on reason/lives.
 */
function onSongEnded(e) {
  cancelOverlayCountdown();                                   // clear timers
  document.body.setAttribute('data-paused', 'true');          // freeze visuals
  state.running = false;                                      // not running
  setOverlayIcon('play');                                     // play glyph
  updatePlayMenuLabel();                                      // sync labels

  const reason = e?.detail?.reason || 'completed';            // stop reason

  // Guard: pause should NOT route to Results/Game Over.
  if (reason === 'paused') {                                  // pause flow already handled
    return;                                                   // exit early
  }

  const snap = getSnapshot();                                 // read score/level/combo
  const payload = {                                           // overlay payload
    level: snap.level,
    score: snap.score,
    maxCombo: snap.maxCombo
  };

  if (reason === 'failed' || state.lives <= 0) {              // failure route
    showGameOverOverlay(payload);                             // show Game Over
  } else {                                                    // success route
    showResultsOverlay(payload);                              // show Results
  }
}



/**
 * onSongError(e)
 * Handle audio/chart load errors gracefully and keep UI usable.
 */
function onSongError(e) {
  cancelOverlayCountdown();                         // stop any countdown
  state.running = false;                            // not running
  document.body.setAttribute('data-paused', 'true');// freeze visuals
  setOverlayIcon('play');                           // show play glyph
  updatePlayMenuLabel();                            // sync labels

  const msg = e?.detail?.message || 'Could not load the song';
  setOverlayLabel(msg);                             // tell the user
  showOverlay();                                    // keep overlay visible
  console.error('[song:error]', e?.detail || e);    // log details
}

/**
 * onRestartLevel()
 * Retry current level: reset per-level state and start with countdown.
 */
function onRestartLevel() {
  resetPerLevelForNextRun();                                  // reset level-specific
  clearAllNotes();                                            // drop visuals
  startLevelWithCountdown();                                  // start next
}

/**
 * onNextLevel()
 * Move to next level and start with countdown.
 */
function onNextLevel() {
  state.level = state.level + 1;                              // bump level
  resetPerLevelForNextRun();                                  // reset per-level
  clearAllNotes();                                            // drop visuals
  startLevelWithCountdown();                                  // start next
}

/**
 * onLivesDepleted()
 * Stop playback and route to Game Over.
 */
function onLivesDepleted() {
  try { stopSong('failed'); } catch {}                        // stop as failure
}

/**
 * onRetryAfterGameOver()
 * Full new-run reset after Game Over: lives = 5, level = 1, score = 0.
 * Keeps BEST score. Cleans notes and starts countdown fresh.
 */
function onRetryAfterGameOver() {
  cancelOverlayCountdown();              // ensure no stale countdown
  try { stopSong('stopped'); } catch {}  // ensure audio is fully stopped
  clearAllNotes();                       // clean playfield

  // Full scoring reset (lives to 5, level to 1, score/combo reset)
  initScoring();

  // Paint fresh HUD before starting
  updateHUD(getSnapshot());

  // Start from level 1 with the normal countdown
  startLevelWithCountdown();
}


/**
 * bootstrap()
 * Entry point: wire everything and show overlay on boot.
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupScoringAndHUD();                                     // baseline HUD/overlay
    ensureOverlayVisibleOnBoot();                             // show overlay if present
    initResultOverlays();                                     // wire Next/Restart/Retry buttons
    initBonusBannerFX();                                      // wire bonus flash FX (one-time)
    wireOverlayAndInput();                                    // CTA + input
    initTopbarAndNav();                                       // topbar/nav/overlays
    setupHUDInlineMode();                                     // HUD mode + watcher
    wireMobileNavClose();                                     // mobile UX
    bindFutureControlsPlaceholder();                          // placeholder
    wireGlobalListeners();                                    // window events (guarded)
  } catch (err) {                                             // catch init errors
    console.error('[INIT ERROR]', err);                       // log
    const overlay = document.getElementById('overlay');       // read overlay
    if (overlay) overlay.classList.remove('hidden');          // ensure visible
  }
});

/* -----------------------------------------
   Extra helpers (navbar close, placeholders)
------------------------------------------ */

/**
 * wireMobileNavClose()
 * Close navbar on item click for better mobile UX.
 */
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
