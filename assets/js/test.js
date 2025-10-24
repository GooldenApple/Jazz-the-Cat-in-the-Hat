// test.js — developer console helpers (non-production)

import {
  state,
  gradeHit,
  spawnJudgedNote,
  clearAllNotes,
  init as initScoring,
} from './scoring.js';

import {
  doLeftMove, doRightMove, doUpMove, doDownMove,
} from './input.js';

import {
  showOverlay, setOverlayLabel, updatePlayMenuLabel, hideOverlay,
} from './ui.js';

//  everything under one namespace to avoid global clutter.
if (typeof window !== 'undefined') {
  window.dev = {
    // Read-only view of current game state
    state,

    // Visual-only moves (animation only, no scoring)
    move: {
      left:  () => doLeftMove(),
      right: () => doRightMove(),
      up:    () => doUpMove(),
      down:  () => doDownMove(),
    },

    // Move + judge (animation + scoring)
    hit: {
      left:  () => { doLeftMove();  gradeHit('left');  },
      right: () => { doRightMove(); gradeHit('right'); },
      up:    () => { doUpMove();    gradeHit('up');    },
      down:  () => { doDownMove();  gradeHit('down');  },
    },

    // Spawn a judged note into a lane
    // Usage: dev.spawn('left') or dev.spawn('up', 1.5, 120)
    spawn: (dir = 'left', beats = 2, bpm = 120) =>
      spawnJudgedNote(dir, beats, bpm),

    // Remove all notes (DOM + internal queue)
    clear: () => clearAllNotes(),

    // Full reset: clear, reset scoring/HUD, show overlay in paused state
    reset: () => {
      clearAllNotes();
      initScoring();
      document.body.setAttribute('data-paused', 'true');
      setOverlayLabel('Play');
      showOverlay();
      updatePlayMenuLabel();
    },

      // --- Quick control helpers (no random spawner) ---
    // Unpause the game without starting the random spawner
    play: () => {
      document.body.removeAttribute('data-paused'); // unfreeze CSS animations
      state.running = true;                          // mark game as running
      hideOverlay();                                 // hide overlay
    },

    // Pause the game (no random spawner involved)
    pause: () => {
      state.running = false;                         // stop accepting inputs
      document.body.setAttribute('data-paused', 'true'); // freeze animations
      setOverlayLabel('Paused');
      showOverlay();
    },

    // Schedule a hit after N ms (handy for timing tests)
    // Usage: dev.spawn('left',2,120); dev.hitIn(1000,'left')
    hitIn: (ms = 1000, dir = 'left') =>
      setTimeout(() => {
        const d = String(dir).toLowerCase();
        if (d === 'left')  { doLeftMove();  gradeHit('left');  }
        if (d === 'right') { doRightMove(); gradeHit('right'); }
        if (d === 'up')    { doUpMove();    gradeHit('up');    }
        if (d === 'down')  { doDownMove();  gradeHit('down');  }
      }, ms),


  };

}
