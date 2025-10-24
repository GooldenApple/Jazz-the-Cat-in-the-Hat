/* =============================
   Jazz the Cat in the Hat – Base JS
   ============================= */


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
} from './ui.js';

// inputs (maps buttons/keyboard to game intents)
import { initMoveControls, wireMenuPlayToggle } from './input.js';

// scoring (bootstraps score/lives state and HUD sync trigger)
import { init as initScoring, state, getSnapshot, setHooks } from './scoring.js';

import { startBeatSpawner } from './scheduler.js';

// --- TEMP DEBUG: module loaded + DOMContentLoaded hook present ---
console.log('[game] module loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[game] DOMContentLoaded fired (before try)');
});

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

    /* Listens for a start-run request from the UI and enables gameplay */
    window.addEventListener('ui:requestStartRun', () => {
      console.log('[game] ui:requestStartRun received: paused(before)=', document.body.hasAttribute('data-paused'), ' running(before)=', state.running);

      state.running = true;                         // enable gameplay
      document.body.removeAttribute('data-paused'); // UI no longer paused

      console.log('[game] after unpause: paused=', document.body.hasAttribute('data-paused'), ' running=', state.running);

      updatePlayMenuLabel();                        // keep label in sync (safe if unused)
       startBeatSpawner();
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
