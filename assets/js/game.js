/* =============================
   Jazz the Cat in the Hat – Base JS
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
} from './ui.js';

// inputs (maps buttons/keyboard to game intents)
import { initMoveControls, wireMenuPlayToggle } from './input.js';

// scoring (bootstraps score/lives state and HUD sync trigger)
import { init as initScoring, state, getSnapshot, setHooks } from './scoring.js';

import { startSongById, stopSong } from './songPlayer.js'; 

// --- TEMP DEBUG: module loaded + DOMContentLoaded hook present ---
console.log('[game] module loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[game] DOMContentLoaded fired (before try)');
});

/** Run a simple 3-2-1 countdown on the overlay label. */
function runOverlayCountdown(seconds = 3) {                 // Show 3..2..1..GO! on overlay
  const total = Math.max(0, Math.floor(seconds));           // Sanitize input
  let left = total;                                         // Seconds remaining
  setOverlayLabel(String(left || ''));                      // Initial label (e.g., "3")
  const id = setInterval(() => {                            // Tick every second
    left -= 1;                                              // Decrement remaining
    if (left > 0) {                                         // Still counting
      setOverlayLabel(String(left));                        // Update label
      return;                                               // Keep ticking
    }
    clearInterval(id);                                      // Stop the interval
    setOverlayLabel('GO!');                                 // Tiny punch before song starts
    setTimeout(() => setOverlayLabel('Play'), 600);         // Normalize back after a short beat
  }, 1000);
}


/* =============================
   DOMContentLoaded bootstrap - Wire everything once DOM is ready.
   ============================= */ 

/* Orchestrates app bootstrap and UI wiring after DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('[game] DOMContentLoaded: start');

    // reset core state and render initial HUD
    initScoring();
    console.log('[game] after initScoring');

    /* Registers a scoring update hook so the HUD refreshes with each state change */
    setHooks({
      onUpdate: (snapshot) => updateHUD(snapshot)
    });
    console.log('[game] setHooks(onUpdate) registered');

    // renders the initial HUD from the fresh scoring state
    updateHUD(getSnapshot());
    console.log('[game] initial HUD rendered');

    // set initial overlay/menu labels
    setOverlayLabel('Play');                       // overlay text
    document.body.setAttribute('data-paused', 'true'); // paused flag for UI
    updatePlayMenuLabel();                         // navbar shows ▶ Play (safe if unused)
    console.log('[game] paused attr set:', document.body.hasAttribute('data-paused'));



    /* Listens for a start-run request from the UI and starts the current song */
window.addEventListener('ui:requestStartRun', async () => {
  // --- Guard: abort if no songs are registered ---
  const hasSongs = Array.isArray(SONGS) && SONGS.length > 0;
  if (!hasSongs) {
    state.running = false;                          // keep inputs locked
    document.body.setAttribute('data-paused', 'true'); // freeze UI anims
    setOverlayLabel('No songs installed');          // friendly message
    showOverlay();                                  // keep CTA visible
    console.warn('[game] start aborted: no songs in registry');
    return;
  }

  console.log(
    '[game] ui:requestStartRun received: paused(before)=',
    document.body.hasAttribute('data-paused'),
    ' running(before)=', state.running
  );

  state.running = true;                               // unlock input
  document.body.removeAttribute('data-paused');       // unfreeze UI
  updatePlayMenuLabel();                              // sync navbar

  // Show overlay and let the song events drive the countdown lifecycle.
  setOverlayLabel('');                                // clear any old text

  try {
    // Start the first registered song; 3s visual/audio countdown.
    await startSongById(undefined, {
      countdownSec: 3,                                // 3..2..1..GO!
      travelBeats: 2.0                                // keep current travel timing
    });
  } catch (err) {
    console.error('[game] failed to start song:', err);
    // fail-safe UI recovery
    state.running = false;
    document.body.setAttribute('data-paused', 'true');
    setOverlayLabel('Play');
    showOverlay();
  }
});



    /* Song lifecycle → drive overlay and countdown text */
    window.addEventListener('song:ready', () => {   // Chart+audio loaded, countdown about to run
      showOverlay();                                // make sure overlay is visible
      runOverlayCountdown(3);                       // show 3..2..1..GO!
    });

    window.addEventListener('song:started', () => { // Audio actually started
      hideOverlay();                                // hide overlay for gameplay
    });

    window.addEventListener('song:ended', () => {   // Song finished
      state.running = false;                        // lock inputs
      document.body.setAttribute('data-paused', 'true'); // freeze UI anims
      updatePlayMenuLabel();                        // sync navbar label
      setOverlayLabel('Play');                      // normalize CTA label
      showOverlay();                                // show overlay to let player start next
    });

    window.addEventListener('song:error', (e) => {  // Loading/decoding failed
      console.error('[game] song error:', e.detail); // surface the error
      state.running = false;                         // lock inputs
      document.body.setAttribute('data-paused', 'true'); // pause UI
      setOverlayLabel('Play');                       // back to neutral
      showOverlay();                                 // keep recovery UX
    });





    // ensure overlay is visible on first load
    const overlay = document.getElementById('overlay');
    console.log('[game] overlay exists:', !!overlay);
    if (overlay) overlay.classList.remove('hidden');

    // wire CTA play button, movement inputs, and navbar play/pause
    console.log('[game] typeof wirePlayButton:', typeof wirePlayButton);
    wirePlayButton();
    console.log('[game] wirePlayButton() called');

    console.log('[game] typeof initMoveControls:', typeof initMoveControls);
    initMoveControls();
    console.log('[game] initMoveControls() called');

    console.log('[game] typeof wireMenuPlayToggle:', typeof wireMenuPlayToggle);
    wireMenuPlayToggle();
    console.log('[game] wireMenuPlayToggle() called');

    // wire navbar collapse behavior and rotate overlay
    initNavbarCollapseSync();
    initRotateOverlay();
    console.log('[game] navbar/rotate wiring done');

    // bind future controls placeholder
    bindControls();
    console.log('[game] bindControls() called');




    /* ----- Inline HUD collapse (Score/Best/Level) ----- */
    const savedHud = localStorage.getItem(HUD_MODE_KEY);                  // fetch persisted mode
    const prefersCollapsed = window.matchMedia('(max-width: 732px)').matches; // breakpoint check
    setHudInlineMode(savedHud ? savedHud : (prefersCollapsed ? 'collapsed' : 'expanded'));
    wireHudInlineToggle();
    console.log('[game] HUD inline mode set + toggle wired');

    // auto-collapse/expand HUD at 732px if no saved preference exists
    const mqHud = window.matchMedia('(max-width: 732px)');
    mqHud.addEventListener('change', (e) => {
      if (localStorage.getItem(HUD_MODE_KEY)) return;
      if (e.matches) {
        setHudInlineMode('collapsed');
      } else {
        setHudInlineMode('expanded');
      }
    });
    console.log('[game] HUD breakpoint listener attached');



    /* ----- Mobile UX: close navbar collapse after clicking a nav button ----- */
    document.querySelectorAll('#primaryNav .nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const collapseEl = document.getElementById('mainNav');
        if (collapseEl && collapseEl.classList.contains('show')) {
          const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl);
          collapse.hide();
        }
      });
    });
    console.log('[game] nav buttons wired to close collapse');

  } catch (err) {
    // show overlay so the user can recover if initialization fails
    console.error('[INIT ERROR]', err);
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('hidden');
  }
});
