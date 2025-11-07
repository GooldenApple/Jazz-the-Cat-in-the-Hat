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
  updateHUD,
  showOverlay,
  hideOverlay,
  showPauseOverlay,
  showResultsOverlay,
  showGameOverOverlay,
  initResultOverlays,
  setOverlayIcon,
  initTopbarAutoHeight,
  wireMenuPlayToggle,
  setPlayTip,
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
} from './scoring.js'; // scoring API

import { startSongForLevel, stopSong } from './songPlayer.js'; // song engine entry points

// --- TEMP DEBUG: module loaded ---
console.log('[game] module loaded'); // prints that this module loaded

/* ------------------
   Countdown seconds 
-------------------- */

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
  let left = total;                                  // remaining seconds
  setOverlayLabel(String(left || ''));               // draw initial value
  _cdInterval = setInterval(() => {                  // start 1s tick
    left -= 1;                                       // decrement
    if (left > 0) {                                  // still ticking
      setOverlayLabel(String(left));                 // draw next number
      return;                                        // continue
    }
    clearInterval(_cdInterval);                      // stop ticking
    _cdInterval = null;                              // drop handle
    setOverlayLabel('GO!');                          // flash GO!
    _cdAfterGoTimer = setTimeout(() => {             // schedule restore
      setOverlayLabel('Play');                       // back to Play
      _cdAfterGoTimer = null;                        // drop handle
    }, 600);                                         // short flash
  }, 1000);                                          // 1s step
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
 * Init scoring, hook HUD updates, paint initial HUD and baseline overlay.
 */
function setupScoringAndHUD() {
  initScoring();                                              // reset scoring
  setHooks({ onUpdate: (snapshot) => updateHUD(snapshot) });  // hook HUD updates
  updateHUD(getSnapshot());                                   // paint HUD once
  setOverlayLabel('Play');                                    // default overlay label
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
  if (overlay) overlay.classList.remove('hidden');            // reveal if present
}

/**
 * wireOverlayAndInput()
 * Wire overlay CTA button and movement controls.
 */
function wireOverlayAndInput() {
  console.log('[game] typeof wirePlayButton:', typeof wirePlayButton); // debug type
  wirePlayButton();                                           // wire overlay CTA
  console.log('[game] wirePlayButton() called');              // debug
  console.log('[game] typeof initMoveControls:', typeof initMoveControls); // debug type
  initMoveControls();                                         // wire input
  console.log('[game] initMoveControls() called');            // debug
}

/**
 * initTopbarAndNav()
 * Keep topbar height in sync; wire navbar/rotate/result overlays.
 */
function initTopbarAndNav() {
  initTopbarAutoHeight();                                     // keep --topbar-h fresh
  initNavbarCollapseSync();                                   // navbar collapse sync
  initRotateOverlay();                                        // rotate overlay a11y
  initResultOverlays();                                       // results/game over actions
  console.log('[game] navbar/rotate wiring done');            // debug
  window.dispatchEvent(new Event('orientationchange'));       // nudge listeners
}

/**
 * setupHUDInlineMode()
 * Apply HUD inline mode and wire toggle + breakpoint watcher.
 */
function setupHUDInlineMode() {
  const savedHud = localStorage.getItem(HUD_MODE_KEY);        // read saved mode
  const prefersCollapsed = window.matchMedia('(max-width: 732px)').matches; // breakpoint
  setHudInlineMode(savedHud ? savedHud : (prefersCollapsed ? 'collapsed' : 'expanded')); // apply
  wireHudInlineToggle();                                      // wire toggle
  console.log('[game] HUD inline mode set + toggle wired');   // debug

  const mqHud = window.matchMedia('(max-width: 732px)');      // define query
  mqHud.addEventListener('change', (e) => {                   // watch changes
    if (localStorage.getItem(HUD_MODE_KEY)) return;           // respect user choice
    if (e.matches) { setHudInlineMode('collapsed'); }         // collapse on narrow
    else { setHudInlineMode('expanded'); }                    // expand on wide
  });
  console.log('[game] HUD breakpoint listener attached');     // debug
}

/**
 * wireMobileNavClose()
 * Close navbar collapse after clicking any nav button on mobile.
 */
function wireMobileNavClose() {
  document.querySelectorAll('#primaryNav .nav-btn')           // select nav buttons
    .forEach((btn) => {                                       // iterate
      btn.addEventListener('click', () => {                    // on click
        const collapseEl = document.getElementById('mainNav'); // collapsible area
        if (collapseEl && collapseEl.classList.contains('show')) { // if open
          const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl); // instance
          collapse.hide();                                     // close
        }
      });
    });
  console.log('[game] nav buttons wired to close collapse');   // debug
}

/**
 * bindFutureControlsPlaceholder()
 * Keep placeholder for future control wiring.
 */
function bindFutureControlsPlaceholder() {
  bindControls();                                             // call placeholder
  console.log('[game] bindControls() called');                // debug
}

/* -----------------------------
   event handler helpers
------------------------------ */

/**
 * onStartRunRequested()
 * Respond to ui:requestStartRun by starting the countdown flow.
 */
function onStartRunRequested() {
  startLevelWithCountdown();                                  // start with countdown
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
  updatePlayMenuLabel();                                      // sync labels
}

/**
 * onSongStarted()
 * Unfreeze visuals, enable judging, hide overlay.
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
 * onPauseRequested()
 * Pause flow: stop playback via stopSong('paused').
 */
function onPauseRequested() {
  cancelOverlayCountdown();                                   // clear timers
  try { stopSong('paused'); } catch {}                        // route to pause overlay
}

/**
 * onSongEnded()
 * Route to Pause / Results / Game Over panels.
 */
function onSongEnded(e) {
  cancelOverlayCountdown();                                   // clear timers
  const reason = e?.detail?.reason || 'completed';            // stop reason
  state.running = false;                                      // lock inputs
  document.body.setAttribute('data-paused', 'true');          // freeze visuals
  updatePlayMenuLabel();                                      // sync labels
  document.body.removeAttribute('data-starting');             // clear starting
  setOverlayIcon('play');                                     // show play glyph

  const summary = {                                           // build summary
    level: state.level,                                       // current level
    score: state.score,                                       // final score
    maxCombo: state.maxCombo,                                 // best combo
  };

  if (reason === 'paused' || reason === 'stopped') {          // manual stop
    showPauseOverlay();                                       // show pause overlay
    return;                                                   // done
  }

  if (reason === 'failed') {                                  // out of lives
    showGameOverOverlay(summary);                             // show game over
    return;                                                   // done
  }

  if (state.lives > 0) {                                      // finished alive
    showResultsOverlay(summary);                              // show results
  } else {                                                    // zero lives at end
    showGameOverOverlay(summary);                             // show game over
  }
}

/**
 * onSongError()
 * Recover UI when song loading/decoding fails.
 */
function onSongError(e) {
  console.error('[game] song error:', e.detail);              // log detail
  state.running = false;                                      // not running
  document.body.setAttribute('data-paused', 'true');          // freeze UI
  document.body.removeAttribute('data-starting');             // clear starting
  setOverlayIcon('play');                                     // show play glyph
  updatePlayMenuLabel();                                      // sync labels
  setOverlayLabel('Play');                                    // neutral label
  showOverlay();                                              // show overlay
}

/**
 * onNextLevel()
 * Move to next level, reset per-level, clear stage, start with countdown.
 */
async function onNextLevel() {
  state.level = (state.level || 1) + 1;                       // bump level
  resetPerLevelForNextRun();                                  // reset per-level counters
  updateHUD(getSnapshot());                                   // refresh HUD
  clearAllNotes();                                            // remove leftovers
  await startLevelWithCountdown();                            // start next
}

/**
 * onRestartLevel()
 * Restart same level with countdown.
 */
function onRestartLevel() {
  startLevelWithCountdown();                                  // restart
}

/**
 * onLivesDepleted()
 * Stop playback as failure to route to Game Over.
 */
function onLivesDepleted() {
  try { stopSong('failed'); } catch {}                        // fail stop
}

/**
 * onRetryLevel()
 * Reset scoring but keep current level; clear notes; start countdown.
 */
async function onRetryLevel() {
  const prevLevel = state.level;                              // remember level
  initScoring();                                              // reset scoring
  state.level = prevLevel;                                    // restore level
  updateHUD(getSnapshot());                                   // refresh HUD
  clearAllNotes();                                            // clear notes
  await startLevelWithCountdown();                            // start fresh
}

/**
 * wireGlobalListeners()
 * Bind all window-level event listeners to named handlers (guarded).
 */
function wireGlobalListeners() {
  if (window.__globalWired) return;                           // guard double-bind
  window.__globalWired = true;                                // set guard

  window.addEventListener('ui:requestStartRun', onStartRunRequested); // start
  window.addEventListener('song:ready', onSongReady);          // ready
  window.addEventListener('song:started', onSongStarted);      // started
  window.addEventListener('ui:requestPause', onPauseRequested);// pause request
  window.addEventListener('song:ended', onSongEnded);          // ended
  window.addEventListener('game:livesDepleted', onLivesDepleted); // lives 0
  window.addEventListener('ui:retryLevel', onRetryLevel);      // retry
  window.addEventListener('ui:restartLevel', onRestartLevel);  // restart
  window.addEventListener('ui:nextLevel', onNextLevel);        // next level
  window.addEventListener('song:error', onSongError);          // error
}

/* -----------------------------------------------
   DOMContentLoaded bootstrap — small and tidy
------------------------------------------------ */

/**
 * (DOMContentLoaded handler)
 * Bootstrap wiring and initial UI state once DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {         // on DOM ready
  try {                                                       // guard init
    console.log('[game] DOMContentLoaded: start');            // debug
    setupScoringAndHUD();                                     // baseline HUD/overlay
    ensureOverlayVisibleOnBoot();                             // show overlay if present
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
