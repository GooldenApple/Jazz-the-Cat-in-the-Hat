/* =============================
   Jazz the Cat in the Hat – Base Skeleton JS
   ============================= */


// Import everything 
import * as UI from './ui.js';
import * as Input from './input.js';
import * as Scoring from './scoring.js';
import * as Scheduler from './scheduler.js';
import * as Songs from './songs.js';
import * as Storage from './storage.js';
import * as Audio from './audio.js';
import * as test from './test.js';


/* =============================
   DOMContentLoaded bootstrap
   ============================= */
/* ----------------------------------------
   Purpose: Wire everything once DOM is ready.
---------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();                                  // reset core state + render HUD once
    setOverlayLabel('Play');                 // set initial overlay label
    updatePlayMenuLabel();                   // navbar shows ▶ Play initially

    const overlay = document.getElementById('overlay'); // grab overlay node
    if (overlay) overlay.classList.remove('hidden');    // ensure overlay is visible on first load

    wirePlayButton();                        // hook up CTA play button
    initMoveControls();                      // map buttons + keyboard → tryJudge()
    wireMenuPlayToggle();                    // navbar ▶ Play / ⏸ Pause toggle
    initNavbarCollapseSync();                // keep burger/collapse correct across breakpoints
    UI.initRotateOverlay();                   // sets up rotate overlay logic and a11y sync on load
    bindControls();                          // placeholder for future settings, etc.

    /* ----- Inline HUD collapse (Score/Best/Level) ----- */
    const savedHud = localStorage.getItem(HUD_MODE_KEY);                  // fetch persisted mode
    const prefersCollapsed = window.matchMedia('(max-width: 732px)').matches; // breakpoint check
    setHudInlineMode(                                                      // apply initial mode
      savedHud ? savedHud : (prefersCollapsed ? 'collapsed' : 'expanded')
    );

    wireHudInlineToggle();                                                // wire the HUD toggle chip (+ hotkey 'H')

    // Auto-collapse on resize when under 732px,
    // but only if user has not chosen a mode (no savedHud).
    const mqHud = window.matchMedia('(max-width: 732px)');                // watch breakpoint
    mqHud.addEventListener('change', (e) => {                             // when crossing threshold
      if (localStorage.getItem(HUD_MODE_KEY)) return;                     // user preference exists → skip
      if (e.matches) {                                                    // now under 732px
        setHudInlineMode('collapsed');                                    // collapse HUD
      } else {                                                            // above 732px
        setHudInlineMode('expanded');                                     // expand HUD
      }
    });

    /* ----- Mobile UX: close navbar collapse after clicking a nav button ----- */
    document.querySelectorAll('#primaryNav .nav-btn').forEach(btn => {   // get all nav buttons
      btn.addEventListener('click', () => {                               // on any nav button click
        const collapseEl = document.getElementById('mainNav');            // collapse root
        if (collapseEl && collapseEl.classList.contains('show')) {        // only if currently open
          const collapse = bootstrap.Collapse.getOrCreateInstance(collapseEl); // get instance
          collapse.hide();                                                // close the panel
        }
      });
    });

  } catch (err) {
    console.error('[INIT ERROR]', err);           // log any failure
    const overlay = document.getElementById('overlay'); // best-effort: show overlay so user can recover
    if (overlay) overlay.classList.remove('hidden');    // unhide overlay on error
  }
});





