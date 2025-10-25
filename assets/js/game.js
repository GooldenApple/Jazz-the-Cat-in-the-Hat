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
} from './ui.js';

// inputs (maps buttons/keyboard to game intents)
import { initMoveControls, wireMenuPlayToggle } from './input.js'; // exposes input setup

// scoring (bootstraps score/lives state and HUD sync trigger)
import { init as initScoring, state, getSnapshot, setHooks } from './scoring.js'; // scoring API

import { startSongById, stopSong } from './songPlayer.js'; // song engine entry points

// --- TEMP DEBUG: module loaded ---
console.log('[game] module loaded'); // prints that this module loaded

let _startingRun = false; // prevents double-start during countdown/loading

/** Run a simple 3-2-1 countdown on the overlay label. */
function runOverlayCountdown(seconds = 3) {              // declares countdown helper
  const total = Math.max(0, Math.floor(seconds));        // clamps input to non-negative int
  let left = total;                                      // holds remaining seconds
  setOverlayLabel(String(left || ''));                   // paints initial number
  const id = setInterval(() => {                         // creates 1s ticker
    left -= 1;                                           // decrements per tick
    if (left > 0) {                                      // continues until zero
      setOverlayLabel(String(left));                     // updates number
      return;                                            // exits this tick
    }
    clearInterval(id);                                   // stops the ticker
    setOverlayLabel('GO!');                              // shows a quick punch
    setTimeout(() => setOverlayLabel('Play'), 600);      // restores neutral label
  }, 1000);                                              // 1 second interval
}


/* =============================
   DOMContentLoaded bootstrap - Wire everything once DOM is ready.
   ============================= */

// Orchestrates app bootstrap and UI wiring after DOM is ready
document.addEventListener('DOMContentLoaded', () => {     // waits for DOM readiness
  try {                                                   // guards initialization
    console.log('[game] DOMContentLoaded: start');        // logs boot start

    initScoring();                                        // resets scoring state
    console.log('[game] after initScoring');              // logs scoring init

    setHooks({                                            // registers HUD update hook
      onUpdate: (snapshot) => updateHUD(snapshot),        // forwards snapshots to HUD
    });                                                   // stores hook
    console.log('[game] setHooks(onUpdate) registered');  // logs hook registration

    updateHUD(getSnapshot());                             // paints initial HUD
    console.log('[game] initial HUD rendered');           // logs HUD paint

    setOverlayLabel('Play');                              // sets default overlay label
    document.body.setAttribute('data-paused', 'true');    // marks visuals paused
    updatePlayMenuLabel();                                // syncs navbar/quick labels
    console.log('[game] paused attr set:',                // logs paused flag presence
      document.body.hasAttribute('data-paused'));         // prints boolean


    // Listens for a start-run request and delegates the whole lifecycle to the song engine.
    window.addEventListener('ui:requestStartRun', async () => { // reacts to start intent
      const hasSongs = Array.isArray(SONGS) && SONGS.length > 0; // verifies registry
      if (!hasSongs) {                                           // handles empty registry
        state.running = false;                                   // keeps inputs locked
        document.body.setAttribute('data-paused', 'true');       // keeps visuals paused
        setOverlayLabel('No songs installed');                   // shows user message
        showOverlay();                                           // keeps overlay visible
        return;                                                  // aborts start
      }

      if (_startingRun || state.running) return;                 // avoids re-entrance
      _startingRun = true;                                       // takes start lock

      document.body.setAttribute('data-starting', 'true');       // flags countdown phase
      setOverlayIcon('pause');                                    // shows pause icon during countdown
      updatePlayMenuLabel();                                      // syncs labels for starting state

      setOverlayLabel('');                                        // clears old text
      showOverlay();                                              // ensures overlay is visible

      try {                                                       // attempts start
        await startSongById(undefined, { countdownSec: 3 });      // defers to player with countdown
      } catch (err) {                                             // handles start failure
        state.running = false;                                    // keeps input locked
        document.body.setAttribute('data-paused', 'true');        // keeps visuals paused
        setOverlayLabel('Play');                                  // restores neutral label
        showOverlay();                                            // keeps overlay visible
        document.body.removeAttribute('data-starting');           // clears starting flag
        setOverlayIcon('play');                                   // shows play icon for retry
        updatePlayMenuLabel();                                    // resyncs labels
        console.error('[game] failed to start song:', err);       // logs error
      } finally {                                                 // always executed
        _startingRun = false;                                     // releases start lock
      }
    });                                                           // done start intent listener


    /* =========================================
       Song lifecycle: song:ready
       Brief: When audio + chart are ready, show overlay, freeze visuals, and run the 3-2-1 label.
       ========================================= */
    window.addEventListener('song:ready', () => {                 // reacts to assets ready
      showOverlay();                                              // ensures overlay visible
      document.body.setAttribute('data-paused', 'true');          // freezes visuals
      runOverlayCountdown(3);                                     // runs countdown label
      setOverlayIcon('pause');                                    // keeps pause icon visible
      updatePlayMenuLabel();                                      // keeps labels consistent
    });                                                           // done song:ready


    /* =========================================
       Song lifecycle: song:started
       Brief: When audio actually starts, unfreeze visuals, enable input, sync UI, and hide overlay.
       ========================================= */
    window.addEventListener('song:started', () => {               // reacts to audio start
      document.body.removeAttribute('data-paused');               // unfreezes visuals
      state.running = true;                                       // enables judging
      updatePlayMenuLabel();                                      // syncs labels
      hideOverlay();                                              // hides overlay for gameplay
      setOverlayIcon(null);                                       // releases icon to CSS control
      document.body.removeAttribute('data-starting');             // clears starting flag
    });                                                           // done song:started


    /** Handle a UI pause request by stopping playback with reason "paused". */
    window.addEventListener('ui:requestPause', () => {            // reacts to pause intent
      try { stopSong('paused'); } catch {}                        // stops playback and emits ended
    });                                                           // done pause intent


    /* =========================================
       Song lifecycle: song:ended
       Brief: Route to Pause / Results / Game Over depending on reason and remaining lives.
       ========================================= */
    window.addEventListener('song:ended', (e) => {                // reacts to end of song
      const reason = e?.detail?.reason || 'completed';            // reads stop reason

      state.running = false;                                      // locks inputs
      document.body.setAttribute('data-paused', 'true');          // freezes visuals
      updatePlayMenuLabel();                                      // syncs labels
      document.body.removeAttribute('data-starting');             // clears starting flag if any
      setOverlayIcon('play');                                     // shows play icon after end

      const summary = {                                           // prepares overlay stats
        level: state.level,                                       // level to show
        score: state.score,                                       // score to show
        maxCombo: state.maxCombo,                                 // best combo to show
      };                                                          // summary object

      if (reason === 'paused' || reason === 'stopped') {          // manual stop path
        showPauseOverlay();                                       // shows pause overlay
        return;                                                   // stops routing
      }

      if (reason === 'failed') {                                  // out-of-lives path
        showGameOverOverlay(summary);                             // shows game over overlay
        return;                                                   // stops routing
      }

      if (state.lives > 0) {                                      // finished with lives left
        showResultsOverlay(summary);                              // shows results overlay
      } else {                                                    // finished with zero lives
        showGameOverOverlay(summary);                             // shows game over overlay
      }
    });                                                           // done song:ended


    /**
     * startLevelWithCountdown()
     * Brief: Starts the current level with a 3-second overlay countdown; keeps visuals frozen until the audio actually starts.
     */
    async function startLevelWithCountdown() {                    // declares helper for next/restart/retry
      document.body.setAttribute('data-paused', 'true');          // freezes visuals for countdown
      state.running = false;                                      // disables judging during countdown
      updatePlayMenuLabel();                                      // syncs labels to paused
      setOverlayLabel('');                                        // clears label (countdown will paint)
      showOverlay();                                              // ensures overlay visible
      try {                                                       // protects start
        await startSongById(undefined, { countdownSec: 3 });      // starts first song with countdown
      } catch (err) {                                             // handles failure
        console.error('[game] failed to start level:', err);      // logs error
        state.running = false;                                    // keeps inputs locked
        document.body.setAttribute('data-paused', 'true');        // keeps visuals paused
        setOverlayLabel('Play');                                  // restores neutral label
        showOverlay();                                            // keeps overlay visible for retry
      }                                                           // error path ends
    }                                                             // helper ends


    /**
     * Listen for "Next level" click from Results overlay.
     * Brief: Increments level and restarts with countdown.
     */
    window.addEventListener('ui:nextLevel', async () => {         // reacts to next-level
      state.level = (state.level || 1) + 1;                       // increments level
      await startLevelWithCountdown();                            // starts next level
    });                                                           // done next-level


    /**
     * Listen for "Restart level" click from Results overlay.
     * Brief: Restarts the same level with countdown.
     */
    window.addEventListener('ui:restartLevel', async () => {      // reacts to restart-level
      await startLevelWithCountdown();                            // restarts current level
    });                                                           // done restart-level

    // When lives reach zero mid-song: stop playback as failure (will route to Game Over via song:ended)
    window.addEventListener('game:livesDepleted', () => {
      try { stopSong('failed'); } catch {}
    });

    /**
     * Listen for "Retry" click from Game Over overlay.
     * Brief: Retries the same level with countdown.
     */
    window.addEventListener('ui:retryLevel', async () => {        // reacts to retry-level
      await startLevelWithCountdown();                            // retries current level
    });                                                           // done retry-level

    window.addEventListener('song:error', (e) => {                // reacts to loading/decoding error
      console.error('[game] song error:', e.detail);              // logs error detail
      state.running = false;                                      // locks inputs
      document.body.setAttribute('data-paused', 'true');          // freezes UI
      document.body.removeAttribute('data-starting');             // clears starting flag
      setOverlayIcon('play');                                     // shows play for retry
      updatePlayMenuLabel();                                      // syncs labels
      setOverlayLabel('Play');                                    // restores neutral label
      showOverlay();                                              // keeps recovery UX
    });                                                           // done song:error


    // ensure overlay is visible on first load
    const overlay = document.getElementById('overlay');           // reads overlay element
    console.log('[game] overlay exists:', !!overlay);             // logs existence
    if (overlay) overlay.classList.remove('hidden');              // reveals overlay if present

    // wire CTA play button, movement inputs, and navbar play/pause
    console.log('[game] typeof wirePlayButton:', typeof wirePlayButton); // logs type
    wirePlayButton();                                             // wires overlay CTA click
    console.log('[game] wirePlayButton() called');                // logs wiring

    console.log('[game] typeof initMoveControls:', typeof initMoveControls); // logs type
    initMoveControls();                                           // wires on-screen + keyboard input
    console.log('[game] initMoveControls() called');              // logs wiring

    console.log('[game] typeof wireMenuPlayToggle:', typeof wireMenuPlayToggle); // logs type
    wireMenuPlayToggle();                                         // wires quick Play/Pause button
    console.log('[game] wireMenuPlayToggle() called');            // logs wiring

    // wire navbar collapse behavior and rotate overlay
    initNavbarCollapseSync();                                     // initializes navbar collapse
    initRotateOverlay();                                          // initializes rotate overlay
    initResultOverlays();                                         // wires overlay actions
    console.log('[game] navbar/rotate wiring done');              // logs wiring

    // bind future controls placeholder
    bindControls();                                               // calls placeholder
    console.log('[game] bindControls() called');                  // logs placeholder call


    /* ----- Inline HUD collapse (Score/Best/Level) ----- */
    const savedHud = localStorage.getItem(HUD_MODE_KEY);          // reads saved HUD mode
    const prefersCollapsed = window.matchMedia('(max-width: 732px)').matches; // checks breakpoint
    setHudInlineMode(                                            // applies HUD mode
      savedHud ? savedHud : (prefersCollapsed ? 'collapsed' : 'expanded') // saved or default
    );                                                            // sets body attr and persists
    wireHudInlineToggle();                                        // wires HUD toggle
    console.log('[game] HUD inline mode set + toggle wired');     // logs HUD setup

    // auto-collapse/expand HUD at 732px if no saved preference exists
    const mqHud = window.matchMedia('(max-width: 732px)');        // defines media query
    mqHud.addEventListener('change', (e) => {                     // listens for changes
      if (localStorage.getItem(HUD_MODE_KEY)) return;             // respects saved user choice
      if (e.matches) {                                            // matches compact width
        setHudInlineMode('collapsed');                            // collapses HUD
      } else {                                                    // matches wide width
        setHudInlineMode('expanded');                             // expands HUD
      }
    });                                                           // attaches listener
    console.log('[game] HUD breakpoint listener attached');       // logs listener

    /* ----- Mobile UX: close navbar collapse after clicking a nav button ----- */
    document.querySelectorAll('#primaryNav .nav-btn')             // selects nav buttons
      .forEach((btn) => {                                         // iterates buttons
        btn.addEventListener('click', () => {                      // handles click
          const collapseEl = document.getElementById('mainNav');   // finds collapsible area
          if (collapseEl && collapseEl.classList.contains('show')) { // checks open state
            const collapse = bootstrap.Collapse                    // gets/creates instance
              .getOrCreateInstance(collapseEl);                    // ensures instance
            collapse.hide();                                       // closes the collapse
          }
        });                                                        // attaches handler
      });                                                          // finishes wiring
    console.log('[game] nav buttons wired to close collapse');     // logs mobile UX wiring

  } catch (err) {                                                  // catches init errors
    console.error('[INIT ERROR]', err);                            // logs error
    const overlay = document.getElementById('overlay');            // reads overlay
    if (overlay) overlay.classList.remove('hidden');               // ensures overlay visible
  }                                                                // end try/catch
});                                                                // attaches bootstrap listener