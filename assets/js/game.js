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
   Rails + Notes (visual)
   ============================= */

/* ----------------------------------------
   getRailsMap
   Purpose: Cache references to rail elements.
   Returns: { left, up, down, right } or null.
---------------------------------------- */
function getRailsMap() {
  const root = document.querySelector('.rails');           // rails root
  if (!root) return null;                                  // guard
  return {
    left:  root.querySelector('.rail-left'),               // left rail
    up:    root.querySelector('.rail-up'),                 // up rail
    down:  root.querySelector('.rail-down'),               // down rail
    right: root.querySelector('.rail-right')               // right rail
  };
}

/* ----------------------------------------
   getJudgeDistancePx
   Purpose: Pixel distance from rail top to judge-line center.
   Notes: Uses a hidden .judge-line hook; falls back to an approximation.
---------------------------------------- */
function getJudgeDistancePx(railEl) {
  if (!railEl) return 0;                                        // guard
  const stageTop = railEl.getBoundingClientRect().top;          // rail top Y (viewport)
  const judge = document.querySelector('.judge-line');          // measurement hook
  if (!judge) {                                                 // no hook → approximate
    return Math.max(0, railEl.clientHeight * 0.62 - 20);        // crude approx to --judge-rel
  }
  const targetY = judge.getBoundingClientRect().top + (judge.clientHeight / 2); // center Y
  const dist = Math.max(0, targetY - stageTop - 9);             // align note center reasonably
  return dist;                                                  // pixels to judge line
}

/* ----------------------------------------
   getBottomDistancePx
   Purpose: Pixel distance from rail top to where the note stops at bottom.
   Notes: NOTE_H must match CSS .note height.
---------------------------------------- */
function getBottomDistancePx(railEl) {
  if (!railEl) return 0;                        // guard
  const NOTE_H = 40;                            // must match CSS
  return Math.max(0, railEl.clientHeight - NOTE_H); // top of note touches rail bottom
}

/* ----------------------------------------
   spawnNote
   Purpose: Create one falling orb (note) inside the given rail.
   - It sets CSS variables for judge distance and bottom distance.
   - It computes animation duration so that the orb passes the judge line
     exactly at the desired ETA (travelBeats @ bpm).
   - On hit: removed at judge line by gradeHit().
   - On miss: continues falling to the rail bottom and disappears on animationend.
   Usage: spawnNote('left', 2, 120)
---------------------------------------- */
function spawnNote(dir, travelBeats = 2, bpm = 120) {
  const rails = getRailsMap();                                  // get all rail refs
  if (!rails || !rails[dir]) return null;                       // guard: missing lane
  const rail = rails[dir];                                      // pick the correct lane

  const note = document.createElement('div');                   // make a new orb div
  note.className = `note note-${dir} note--${dir}`;             // add base + direction classes

  const judgePx  = getJudgeDistancePx(rail);                    // pixels to judge line
  const bottomPx = getBottomDistancePx(rail);                   // pixels to rail bottom

  note.style.setProperty('--drop-distance-judge',  `${judgePx}px`);   // feed CSS var for judge
  note.style.setProperty('--drop-distance-bottom', `${bottomPx}px`);  // feed CSS var for bottom

  const msPerBeat = 60000 / bpm;                                // how long one beat is
  const secondsToJudge = Math.max(0.08, travelBeats * (msPerBeat / 1000)); // time until judge
  const safeJudge = Math.max(1, judgePx);                       // avoid divide by zero
  const safeBottom = Math.max(safeJudge + 1, bottomPx);         // ensure > judge distance

  const totalSeconds = secondsToJudge * (safeBottom / safeJudge); // scale so ETA = judge
  note.style.animationDuration = `${totalSeconds}s`;            // assign fall duration

  note.dataset.state = 'alive';                                 // mark as active note
  rail.appendChild(note);                                       // attach note to DOM
  return note;                                                  // return reference
}



/* =============================
   TIME-BASED JUDGING (ETA queue)
   ============================= */

/* ----------------------------------------
   judgeConfig
   Purpose: Shared tempo + timing windows for grading.
---------------------------------------- */
const judgeConfig = {
  bpm: 120,                 // tempo used for ETA
  travelBeats: 2.0,         // beats from spawn to judge line
  windows: {                // centered hit windows (ms)
    perfect: 50,            // ≤ 50ms
    great:   90,            // ≤ 90ms
    good:   140             // ≤ 140ms
  }
};

/* ----------------------------------------
   Runtime queue
   Each entry: { id, dir, eta, el, hit:false }
---------------------------------------- */
const activeNotes = [];   // pending notes to judge
let _noteId = 0;         // simple id counter

/* Small helpers */
function nowMs() { return performance.now(); }             // monotonic clock
function removeActiveById(id) {
  const idx = activeNotes.findIndex(n => n.id === id);     // find by id
  if (idx !== -1) activeNotes.splice(idx, 1);              // remove if found
}

/* ----------------------------------------
   registerNote
   Purpose: Compute ETA and push into activeNotes.
   Returns: meta so caller can link DOM element later.
---------------------------------------- */
function registerNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const msPerBeat = 60000 / bpm;                           // beat length in ms
  const eta = nowMs() + (travelBeats * msPerBeat);         // expected crossing time
  const meta = { id: ++_noteId, dir, eta, el: null, hit: false }; // runtime meta
  activeNotes.push(meta);                                   // store
  return meta;                                              // return
}

/* ----------------------------------------
   gradeHit
   Purpose: On input, pick closest note in same dir and grade by |eta-now|.
   Returns: {hit:true,label:'Perfect'|'Great'|'Good'} or {hit:false,label:'Miss'}
---------------------------------------- */
function gradeHit(dir) {
  const t = nowMs();                                       // current time
  let bestIdx = -1;                                        // best candidate index
  let bestAbs = Infinity;                                  // best |Δt|

  for (let i = 0; i < activeNotes.length; i++) {           // scan queue
    const n = activeNotes[i];                              // candidate
    if (n.dir !== dir) continue;                           // must match direction
    const adt = Math.abs(n.eta - t);                       // |Δt| to ETA
    if (adt < bestAbs) { bestAbs = adt; bestIdx = i; }     // keep tighter one
  }

  if (bestIdx === -1) {                                    // none in lane
    setFeedback('MISS', 'miss');                           // UI miss
    return { hit:false, label:'Miss' };
  }

  const w = judgeConfig.windows;                           // window cfg
  let label = 'Miss';                                      // default
  if (bestAbs <= w.perfect) label = 'Perfect';
  else if (bestAbs <= w.great) label = 'Great';
  else if (bestAbs <= w.good)  label = 'Good';

  if (label !== 'Miss') {                                  // a valid hit
    const n = activeNotes[bestIdx];                        // note meta
    n.hit = true;                                          // mark hit
    if (n.el) n.el.remove();                               // remove DOM if still there
    activeNotes.splice(bestIdx, 1);                        // consume

    if (label === 'Perfect') state.score += 100;           // score bumps
    else if (label === 'Great') state.score += 70;
    else if (label === 'Good')  state.score += 50;
    updateHUD();                                           // refresh HUD
    setFeedback(label, 'good');                            // UI good flash
    return { hit:true, label };
  }

  setFeedback('MISS', 'miss');                             // outside windows
  return { hit:false, label:'Miss' };                      // miss
}

/* ----------------------------------------
   tryJudge
   Purpose: Public entry from inputs → perform time-based judgement.
---------------------------------------- */
function tryJudge(dir) {
  if (!state.running) return;                              // ignore when paused
  gradeHit(dir);                                           // compute grade
}

/* ----------------------------------------
   spawnJudgedNote
   Purpose: Register ETA + spawn DOM, and auto-MISS if animation finishes unhit.
   Usage: use this from your test spawner (and later from chart playback).
---------------------------------------- */
function spawnJudgedNote(dir, travelBeats = judgeConfig.travelBeats, bpm = judgeConfig.bpm) {
  const meta = registerNote(dir, travelBeats, bpm);        // create meta with ETA
  const el = spawnNote(dir, travelBeats, bpm);             // create DOM note
  if (!el) return;                                         // guard
  meta.el = el;                                            // link DOM→meta
  el.__noteId = meta.id;                                   // store id on DOM (debug)

  el.addEventListener('animationend', () => {              // when fall ends
    const still = activeNotes.find(n => n.id === meta.id); // still pending?
    if (!still) return;                                    // already hit → ignore
    setFeedback('MISS', 'miss');                           // UI miss
    hit();                                                 // apply damage step
    updateHUD();                                           // refresh HUD
    removeActiveById(meta.id);                             // drop from queue
    el.remove();                                           // clean DOM
  }, { once:true });
}


/* ----------------------------------------
   clearAllNotes
   Purpose: Remove all visual notes and clear ETA queue.
---------------------------------------- */
function clearAllNotes() {
  document.querySelectorAll('.rail .note').forEach(n => n.remove()); // purge nodes
  activeNotes.length = 0;                                            // purge queue
}





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





