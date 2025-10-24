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
  showOverlay, setOverlayLabel, updatePlayMenuLabel,
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
  };
}
