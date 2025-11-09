// test.js — developer console helpers (non-production)

import {
  state,
  gradeHit,
  spawnJudgedNote,
  clearAllNotes,
  init as initScoring,
  getSnapshot,
  hit as takeHit,
  heal as giveHeart,
} from './scoring.js';

import {
  doLeftMove, doRightMove, doUpMove, doDownMove,
} from './input.js';

import {
  showOverlay, setOverlayLabel, updatePlayMenuLabel, hideOverlay, updateHUD, setFeedback,
} from './ui.js';

import { getBonusConfig } from './difficulty.js';

// --- TEMP DEBUG ---
console.log('[test] module loaded'); // show that dev helpers are available

// ------------------------------
// Internal small helpers
// ------------------------------

/* setAndPaint()
   Purpose: Push current scoring snapshot to HUD after manual state changes. */
function setAndPaint() {
  // Update HUD from current snapshot
  updateHUD(getSnapshot()); // refresh numbers on screen
  // Keep menu labels in sync
  updatePlayMenuLabel();    // refresh play/pause labels
}

/* toDir(v)
   Purpose: Normalize any input to one of: 'left'|'right'|'up'|'down'. */
function toDir(v) {
  // Lowercase once
  const s = String(v || '').toLowerCase(); // normalize
  // Map aliases
  if (s === 'l' || s === 'left')   return 'left';  // left
  if (s === 'r' || s === 'right')  return 'right'; // right
  if (s === 'u' || s === 'up')     return 'up';    // up
  if (s === 'd' || s === 'down')   return 'down';  // down
  // Default
  return 'left';                   // fallback
}

/* doMove(dir)
   Purpose: Trigger dancer animation for a given direction. */
function doMove(dir) {
  // Normalize direction
  const d = toDir(dir);                // ensure valid lane
  // Call the correct move
  if (d === 'left')  return doLeftMove();  // trigger left anim
  if (d === 'right') return doRightMove(); // trigger right anim
  if (d === 'up')    return doUpMove();    // trigger up anim
  if (d === 'down')  return doDownMove();  // trigger down anim
}

// ------------------------------
// Expose helpers under window.dev
// ------------------------------
if (typeof window !== 'undefined') {
  window.dev = {
    // --- Read-only peek ---
    state, // live scoring state reference

    /* move: visual-only dancer moves (no judging) */
    move: {
      /* left() — Purpose: play left animation only. */
      left:  () => doLeftMove(),   // anim left
      /* right() — Purpose: play right animation only. */
      right: () => doRightMove(),  // anim right
      /* up() — Purpose: play up animation only. */
      up:    () => doUpMove(),     // anim up
      /* down() — Purpose: play down animation only. */
      down:  () => doDownMove(),   // anim down
    },

    /* hit: move + judge in one call */
    hit: {
      /* left() — Purpose: perform left move and judge. */
      left:  () => { doLeftMove();  gradeHit('left');  }, // anim+judge left
      /* right() — Purpose: perform right move and judge. */
      right: () => { doRightMove(); gradeHit('right'); }, // anim+judge right
      /* up() — Purpose: perform up move and judge. */
      up:    () => { doUpMove();    gradeHit('up');    }, // anim+judge up
      /* down() — Purpose: perform down move and judge. */
      down:  () => { doDownMove();  gradeHit('down');  }, // anim+judge down
    },

    /* spawn(dir='left', beats=2, bpm=120)
       Purpose: spawn a judged note in a lane (falls to judge line). */
    spawn: (dir = 'left', beats = 2, bpm = 120) =>
      spawnJudgedNote(toDir(dir), Number(beats)||2, Number(bpm)||120), // spawn orb

    /* clear()
       Purpose: remove all notes (DOM + internal queue). */
    clear: () => clearAllNotes(), // wipe spawns

    /* reset()
       Purpose: full reset → scoring + HUD + overlay paused. */
    reset: () => {
      clearAllNotes();                            // remove notes
      initScoring();                              // reset scoring
      document.body.setAttribute('data-paused', 'true'); // pause visuals
      setOverlayLabel('Play');                    // restore label
      showOverlay();                              // show play overlay
      updatePlayMenuLabel();                      // sync menus
      setAndPaint();                              // paint HUD
    },

    /* play()
       Purpose: unpause visuals and mark game as running (no song). */
    play: () => {
      document.body.removeAttribute('data-paused'); // unfreeze CSS anim
      state.running = true;                          // allow input
      hideOverlay();                                 // hide overlay
      setAndPaint();                                 // paint HUD
    },

    /* pause()
       Purpose: pause visuals and show overlay (no song). */
    pause: () => {
      state.running = false;                         // stop input
      document.body.setAttribute('data-paused', 'true'); // freeze
      setOverlayLabel('Paused');                     // overlay text
      showOverlay();                                 // show layer
      setAndPaint();                                 // paint HUD
    },

    /* hitIn(ms=1000, dir='left')
       Purpose: schedule a hit after N ms (quick timing test). */
    hitIn: (ms = 1000, dir = 'left') =>
      setTimeout(() => {                            // delay
        const d = toDir(dir);                       // lane
        doMove(d);                                  // anim
        gradeHit(d);                                // judge
      }, Math.max(0, Number(ms)||0)),               // non-neg delay

    // ------------------------------
    // New: Level / Lives / Score controls
    // ------------------------------

    /* setLevel(n)
       Purpose: set current level number and repaint HUD. */
    setLevel: (n) => {
      state.level = Math.max(1, Math.floor(Number(n)||1)); // clamp to 1+
      setFeedback(`Level ${state.level}`, 'good');         // small toast
      setAndPaint();                                       // refresh HUD
    },

    /* setLives(n)
       Purpose: set lives to an exact value and repaint. */
    setLives: (n) => {
      state.lives = Math.max(0, Math.floor(Number(n)||0)); // non-neg int
      state.partial = 0;                                    // clear quarters
      setAndPaint();                                       // refresh HUD
    },

    /* giveHeart()
       Purpose: +1 full heart and repaint. */
    giveHeart: () => {
      giveHeart();                                         // +1 life
      setFeedback('EXTRA LIFE +❤', 'good');               // toast
      setAndPaint();                                       // refresh
    },

    /* hurt(quarters=1)
       Purpose: apply quarter-damage N times and repaint. */
    hurt: (quarters = 1) => {
      const q = Math.max(0, Math.floor(Number(quarters)||0)); // sanitize
      for (let i = 0; i < q; i++) takeHit();                  // apply
      setAndPaint();                                          // refresh
    },

    // ------------------------------
    // New: Combo / Bonus controls
    // ------------------------------

    /* setCombo(n)
       Purpose: force combo length, update HUD, and show a hint.
       Note: bonus will actually auto-activate on the next successful hit
             if combo >= threshold (as per scoring logic). */
    setCombo: (n) => {
      state.combo = Math.max(0, Math.floor(Number(n)||0)); // set combo
      if (state.combo > state.maxCombo) state.maxCombo = state.combo; // track max
      const cfg = getBonusConfig(state.level);             // thresholds
      const msg = `Combo ${state.combo} (bonus at ${cfg.activateCombo})`; // text
      setFeedback(msg, 'good');                            // toast
      setAndPaint();                                       // paint
    },

    /* bonus.start()
       Purpose: force-enter bonus mode immediately for UI/logic checks. */
    bonus: {
      start: () => {
        state.bonusActive = true;                          // set flag
        state.bonusHits = 0;                               // reset counter
        const cfg = getBonusConfig(state.level);           // thresholds
        window.dispatchEvent(new CustomEvent('bonus:started')); // notify UI
        window.dispatchEvent(new CustomEvent('bonus:progress', {
          detail: { hits: 0, goal: cfg.hitsPerHeart || null }  // initial
        }));                                              // progress
        setFeedback('BONUS!', 'good');                     // show banner
        setAndPaint();                                     // paint
      },

      /* bonus.end()
         Purpose: exit bonus mode and notify UI. */
      end: () => {
        state.bonusActive = false;                         // clear flag
        window.dispatchEvent(new CustomEvent('bonus:ended')); // notify UI
        setFeedback('Bonus ended', 'miss');                // toast
        setAndPaint();                                     // paint
      },

      /* bonus.hits(n=1)
         Purpose: simulate n successful bonus hits:
                  - +10 points each
                  - progress meter events
                  - auto-award hearts when threshold is reached (L8+)
         Note: This bypasses timing/judging; it’s for UI/flow testing. */
      hits: (n = 1) => {
        const count = Math.max(0, Math.floor(Number(n)||0)); // sanitize
        if (!state.bonusActive || count === 0) return;       // guard
        const cfg = getBonusConfig(state.level);             // thresholds
        for (let i = 0; i < count; i++) {
          state.bonusHits += 1;                              // add bonus hit
          state.score += 10;                                 // +10 per hit
          window.dispatchEvent(new CustomEvent('bonus:progress', {
            detail: { hits: state.bonusHits, goal: cfg.hitsPerHeart || null } // update
          }));                                              // emit
          if (cfg.hitsPerHeart && state.bonusHits % cfg.hitsPerHeart === 0) {
            giveHeart();                                     // +1 life
            setFeedback('EXTRA LIFE +❤', 'good');           // toast
          } else {
            setFeedback('Bonus +10', 'good');               // toast
          }
        }
        if (state.score > (state.best || 0)) {               // best?
          state.best = state.score;                          // update
          try { localStorage.setItem('best', String(state.best)); } catch {} // persist
        }
        setAndPaint();                                       // repaint
      },
    },

    // ------------------------------
    // New: Quick automation helpers
    // ------------------------------

    /* autoPerfect(count=10, dir='left', bpm=120, travelBeats=2)
       Purpose: spawn a stream and auto-hit them perfectly to build combo/bonus fast. */
    autoPerfect: (count = 10, dir = 'left', bpm = 120, travelBeats = 2) => {
      const c = Math.max(0, Math.floor(Number(count)||0));  // sanitize
      const d = toDir(dir);                                 // lane
      const msPerBeat = 60000 / (Number(bpm) || 120);       // beat ms
      const travelMs  = (Number(travelBeats)||2) * msPerBeat; // fall time
      const gap = msPerBeat;                                // 1 note per beat
      for (let i = 0; i < c; i++) {
        const at = i * gap;                                 // schedule offset
        setTimeout(() => {                                  // spawn at t
          spawnJudgedNote(d, Number(travelBeats)||2, Number(bpm)||120); // spawn
          setTimeout(() => {                                // hit near ETA
            doMove(d);                                      // anim
            gradeHit(d);                                    // judge
          }, Math.max(0, travelMs - 10));                   // tiny early
        }, at);                                             // offset start
      }
    },

    /* status()
       Purpose: quick snapshot in console for sanity checks. */
    status: () => {
      // Log a compact status line
      const s = getSnapshot();                              // read snapshot
      console.log(`[status] L${s.level} score=${s.score} best=${s.best} lives=${s.lives} combo=${s.combo} bonus=${s.bonusActive?'on':'off'}(+${s.bonusHits})`); // print
      return s;                                             // return data
    },
  };
}


import { getSongForLevel } from './songRegistry.js';              // resolve song for current level
import { LEVELS, simplifyChartForLevel } from './difficulty.js';  // level cfg + chart simplifier
import { stopSong } from './songPlayer.js';                       // stop playback when done

/* ----------------------------------------
   _loadAndPlanSchedule
   Purpose: Load chart for current level, apply difficulty rules,
            and compute absolute hit times (ms) from audio start.
---------------------------------------- */
async function _loadAndPlanSchedule() {
  const lvl = Number(state.level) || 1;                           // current level
  const song = getSongForLevel(lvl);                              // song meta for level
  if (!song) throw new Error('No song for current level');        // guard if missing
  const chartRes = await fetch(song.chart, { cache: 'no-cache' }); // fetch chart JSON
  if (!chartRes.ok) throw new Error('Chart fetch failed');        // network guard
  const chart = await chartRes.json();                            // parse JSON

  const bpm = Number(chart.bpm) || 120;                           // chart BPM
  const offsetMs = Number(chart.offsetMs) || 0;                   // chart offset
  const lvlCfg = LEVELS[lvl] || LEVELS[1];                        // level config
  const rate = Number(lvlCfg.playbackRate) || 1;                  // playbackRate
  const travelBeats = Number(lvlCfg.travelBeats) || 2.0;          // fall beats

  const msPerBeatEff = (60000 / bpm) / rate;                      // scaled ms/beat
  const travelMs = travelBeats * msPerBeatEff;                     // fall time in ms
  const offsetEff = offsetMs / rate;                               // scaled offset

  const raw = Array.isArray(chart.notes) ? chart.notes : [];       // chart notes
  const simplified = simplifyChartForLevel(raw, bpm, lvlCfg) || []; // apply level filter

  // Build due list using same rules as songPlayer (beat/timeMs/time)
  const events = simplified.map(ev => {
    const dir = String(ev.dir || ev.direction || '').toLowerCase(); // lane
    let baseMs = null;                                              // note time from audio start
    if (Number.isFinite(ev.beat))   baseMs = ev.beat * msPerBeatEff; // beat → ms
    else if (Number.isFinite(ev.timeMs)) baseMs = ev.timeMs / rate;  // timeMs scaled
    else if (Number.isFinite(ev.time))   baseMs = ev.time / rate;    // time scaled
    else if (Number.isFinite(ev.t))      baseMs = ev.t / rate;
    if (!Number.isFinite(baseMs)) return null;                      // skip invalid rows
    const due = offsetEff + baseMs;                                 // judge ETA (ms)
    return { dir, due };
  }).filter(Boolean);                                              // keep valid

  // Provide schedule + timing helpers to caller
  return {
    song, bpm, rate, travelMs, offsetEff,                          // timing context
    events,                                                        // [{dir, due}]
    totalMs: events.length ? Math.max(...events.map(e => e.due)) : 0, // duration
  };
}

/* ----------------------------------------
   dev.test.twoThirds
   Purpose: Start current level, auto-hit notes up to 2/3 of the chart,
            then pause. Uses tiny lead (-10 ms) to land inside window.
   Usage: dev.test.twoThirds()
---------------------------------------- */
if (typeof window !== 'undefined') {
  window.dev = window.dev || {};                                   // ensure namespace
  window.dev.test = window.dev.test || {};                         // ensure test bag

  window.dev.test.twoThirds = async (leadMs = -10) => {            // negative = hit slightly early
    // Trigger normal start so songPlayer sets its own timers
    window.dispatchEvent(new Event('ui:requestStartRun'));         // request start run

    // Prepare schedule in parallel while countdown runs
    const planPromise = _loadAndPlanSchedule();                    // start loading chart/plan

    // Wait for actual audio start to align timebase
    const startRef = await new Promise((resolve) => {              // promise for song start
      const onStart = () => {                                      // handler
        window.removeEventListener('song:started', onStart);       // detach
        resolve(performance.now());                                // ref time at start
      };
      window.addEventListener('song:started', onStart, { once: true }); // listen once
    });

    const plan = await planPromise;                                // get computed plan
    const cutoff = plan.totalMs * (2 / 3);                         // 2/3 of song duration

    // Schedule graded hits up to cutoff
    for (const ev of plan.events) {                                // iterate events
      if (ev.due > cutoff) break;                                  // stop planning past 2/3
      const when = startRef + ev.due + leadMs;                     // absolute time to fire
      const delay = Math.max(0, when - performance.now());         // non-negative delay
      setTimeout(() => {
        // Call the matching move + judge for the lane
        if (ev.dir === 'left')  { doLeftMove();  gradeHit('left');  return; }
        if (ev.dir === 'right') { doRightMove(); gradeHit('right'); return; }
        if (ev.dir === 'up')    { doUpMove();    gradeHit('up');    return; }
        if (ev.dir === 'down')  { doDownMove();  gradeHit('down');  return; }
      }, delay);
    }

    // Pause shortly after cutoff so last scheduled hits land
    const pauseAt = startRef + cutoff + plan.travelMs + 120;       // grace so notes clear
    setTimeout(() => { try { stopSong('paused'); } catch (_) {} }, // pause song cleanly
      Math.max(0, pauseAt - performance.now()));                   // schedule pause
  };

  /* ----------------------------------------
     dev.test.level
     Purpose: Jump to a level, then run twoThirds autoplay.
     Usage: dev.test.level(7)       // jump to L7 and test
---------------------------------------- */
  window.dev.test.level = (lvl, leadMs = -10) => {
    state.level = Math.max(1, Math.floor(Number(lvl) || 1));       // set level safely
    window.dev.test.twoThirds(leadMs);                             // run 2/3 autoplay
  };

  /* ----------------------------------------
     dev.test.range
     Purpose: Loop through a range of levels running twoThirds on each.
     Usage: dev.test.range(1, 5)     // test L1→L5
---------------------------------------- */
  window.dev.test.range = async (from = 1, to = 3, gapMs = 1200) => {
    const a = Math.max(1, Math.floor(from));                       // sanitize start
    const b = Math.max(a, Math.floor(to));                         // sanitize end
    for (let L = a; L <= b; L++) {                                 // iterate levels
      console.log('[dev.test] level', L);                          // log current level
      await new Promise((r) => {                                   // sequential loop
        state.level = L;                                           // set level
        window.dev.test.twoThirds(-10);                            // run autoplay
        // rough wait: 2/3 of chart + fallback delay
        const waitMs = 12000;                                      // conservative fallback
        setTimeout(r, waitMs + gapMs);                             // proceed after wait
      });
    }
  };

}
