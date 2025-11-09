![Background art preview](assets/images/bgpng1440.png)  
*Neon backdrop used across the game (PNG fallback so it renders on GitHub).*

# Jazz the Cat in the Hat

A neon-arcade, rhythm‑reaction game lovingly built for kids — and fun for teens and grown‑ups, too. Inspired by my daughter and especially my son, who tested, gave feedback, and kept the vision grounded in joy: **big buttons, clear timing, instant celebration** when you nail a beat. The design prioritises comfort and accessibility: calm modes for sensitive players, short sessions for family life, and a gentle difficulty curve that still lets score hunters chase perfection.

**Live Site:** <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>  
**Repo:** <https://github.com/GooldenApple/Jazz-the-Cat-in-the-Hat>

---

## Contents

- [User Experience (UX)](#user-experience-ux)
  - [Project Purpose](#project-purpose)
  - [UX Decisions](#ux-decisions)
  - [User Stories](#user-stories)
  - [User Story Testing (Traceability)](#user-story-testing-traceability)
  - [Wireframes & Mockups](#wireframes--mockups)
- [Gameplay](#gameplay)
  - [Timing & Scoring](#timing--scoring)
  - [Hearts & Forgiveness](#hearts--forgiveness)
  - [Bonus Mode](#bonus-mode)
  - [Level Progression](#level-progression)
- [Features](#features)
- [Design](#design)
  - [Visual Language](#visual-language)
  - [Layout & Responsiveness](#layout--responsiveness)
  - [Accessibility](#accessibility)
- [Technologies](#technologies)
- [Deployment](#deployment)
- [Usage](#usage)
- [Testing](#testing)
  - [Tools & Methods](#tools--methods)
  - [Manual Test Matrix](#manual-test-matrix)
  - [Developer Console Sanity Tests](#developer-console-sanity-tests)
  - [Regression Tests (Recent Fixes)](#regression-tests-recent-fixes)
  - [Validation](#validation)
  - [Known Issues / Non‑blocking](#known-issues--non-blocking)
  - [Future Testing](#future-testing)
- [Credits](#credits)
- [Acknowledgements](#acknowledgements)

---

## User Experience (UX)

### Project Purpose
- Deliver a **simple, responsive rhythm game** with clear controls and satisfying feedback.
- Offer an **approachable learning curve**: Levels 1–3 introduce one note at a time; later levels gradually increase challenge.
- Keep **performance and accessibility** in focus: low‑glow mode, reduce motion, and transparent UI states.

### UX Decisions
- **Overlay‑first flow:** Big Play/Pause overlay makes it obvious how to start and stop.
- **Legible HUD:** Score, combo, and lives are readable at a glance; Quick Play/Pause is available but unobtrusive.
- **Mobile‑first:** Controls and rails align consistently across breakpoints; no awkward gaps; navbar behavior is predictable.
- **Accessibility toggles:** *Reduce Motion* and *No Flash* make effects and animations optional.
- **Clear lifecycle panels:** Results vs Game Over panels appear at the right time, with Next/Retry actions.

### User Stories

#### 1) Young Player (6–10)
**Persona:** Plays on phone/tablet; loves cats, bright colors, and instant feedback. Reading optional.  
**User Story:** As a young player, I want big, friendly arrows and a simple “3‑2‑1” start so I can jump in and dance with Jazz without needing to read instructions.  
**Acceptance Criteria**
- Large tap targets with clear labels and strong contrast
- **Level 1** is “practice”: no health loss, slow notes, **one note at a time**
- Big Play/Pause with clear label; overlay always explains current state
- One‑screen tutorial with minimal text
- Adjustable **countdown** (0/3/5s), default 3s
- **Reduce motion** and **No flash** toggles available
- Cute sounds with a single **Mute** switch

---

#### 2) Pre‑Teen / Teen Rhythm Fan (11–16)
**Persona:** Keyboard or mobile; wants legit rhythm feel, combos, and grindable BEST scores.  
**User Story:** As a teen, I want a fair difficulty ramp, responsive input, and a visible combo so I can chase scores and feel my skill improving.  
**Acceptance Criteria**
- Clear curve across **Levels 1–13** (L1–3 solo notes; L4–7 occasional doubles; L8+ frequent chords)
- Consistent timing windows (**Perfect / Great / Good / Miss**)
- Combo, max combo, and **BEST** persist to localStorage
- **Retry** and **Next level** after a run
- Keyboard + touch are equally responsive; no ghost clicks
- Bonus mode during streaks (extra points on lower levels; extra life on higher)

---

#### 3) Adult Casual Player (Parent with 5 minutes)
**Persona:** One hand on phone, needs zero friction.  
**User Story:** As a busy parent, I want tap‑to‑play and quick pause, with remembered volume, so I can enjoy a short break without fiddling.  
**Acceptance Criteria**
- One‑tap **Play**, one‑tap **Pause**
- **Mute** + **Volume** remembered between sessions
- HUD collapse remembered
- Fast load on mobile (good Lighthouse scores)
- No sign‑ups, no ads, no distractions

---

#### 4) Parent/Guardian (Safety & Comfort)
**Persona:** Observes a child playing; wants calm visuals and a safe space.  
**User Story:** As a parent, I want gentle visual options and a safe environment so my child can play without flashing lights or unwanted links.  
**Acceptance Criteria**
- **No ads**, no IAP, no outbound links from play area
- **Reduce motion** and **No flash** visibly reduce intensity
- Clear language; friendly tone
- Overlays explain **Paused**, **Play**, **Level cleared**, **Game Over**

---

#### 5) Teacher/Therapist (Short, repeatable sessions)
**Persona:** Uses short runs for focus/timing/motor practice.  
**User Story:** As a teacher, I want short, repeatable runs with clear feedback and minimal text so I can use the game for warm‑ups.  
**Acceptance Criteria**
- Quick starts with short countdown
- Immediate **Restart** option
- Minimal reading; icons and short labels
- Predictable patterns and steady pacing on early levels
- Works well in **portrait** on tablets/phones

---

#### 6) Accessibility‑First Player (ADHD / Dyslexia / Autism traits)
**Persona:** Sensitive to overload; needs clarity and control over effects.  
**User Story:** As a player who gets overwhelmed by busy screens, I want simple visuals, adjustable countdown, and reduced effects so I can enjoy the rhythm without stress.  
**Acceptance Criteria**
- **Reduce motion** disables non‑essential animations
- **No flash** removes broad flashes/glow bursts
- Big, consistent **countdown** numerals
- High‑contrast HUD labels; legible pixel font
- Comfortable spacing; no time‑critical menus

---

#### 7) Mobile‑First Player (Slow network / older device)
**Persona:** Mid‑range Android, spotty 4G.  
**User Story:** As a mobile player on a slow device, I want fast load and smooth input so I’m not waiting or dropping notes.  
**Acceptance Criteria**
- Compressed hero/background (AVIF/WebP with PNG fallback)
- Optimized CSS; minimal render‑blocking
- Low‑latency input; animation scales with **Reduce motion**
- Stable layout (no CLS); strategic preloads

---

#### 8) Power‑User / Score Hunter
**Persona:** Chases PBs; demands consistency.  
**User Story:** As a score hunter, I want consistent timing windows, quick retries, and a visible BEST so I can grind levels and improve.  
**Acceptance Criteria**
- **Retry level** in one tap
- Stable judgment windows between runs
- BEST persists and shows after a run
- Optional **0s** countdown for instant restarts

---

#### 9) Site Visitor / Curious Onlooker
**Persona:** Drops in from a link; needs a 5‑second explanation.  
**User Story:** As a first‑time visitor, I want a welcoming first screen that explains the basics so I know how to play before I start.  
**Acceptance Criteria**
- **Play overlay** gives a one‑line how‑to with iconography
- **Tutorial** tab shows the core rule (hit target at judge line)
- Clear Play/Pause wording and icons; no jargon

---

#### 10) Maintainer / Future Me
**Persona:** Future me after a long week.  
**User Story:** As the maintainer, I want clean modules and a predictable UI lifecycle so I can add a song or tweak levels without breaking overlays.  
**Acceptance Criteria**
- ES modules with named exports; no duplicate listeners
- Overlay lifecycle: `data-starting` during countdown, `data-paused` on pause; events `song:ready|started|ended|error`
- Settings persist via localStorage (volume, HUD, motion/flash, countdown)
- README includes testing steps, validators, Lighthouse, and known issues

---

### User Story Testing (Traceability)

| Story ID | Key Checks | How Verified | Status |
|---|---|---|---|
| 1 — Young Player | Big arrows; L1 practice; countdown; calm modes; mute | Manual mobile test (360–480px); visual L1 density check; Settings toggles; audio mute; validator/Lighthouse a11y pass | ✅ |
| 2 — Teen Rhythm Fan | Difficulty ramp; timing windows; combo/BEST; input parity | Playthrough L1–3 (solo), L4–7 (occasional doubles); HUD combo/BEST persistence; keyboard vs touch parity | ✅ |
| 3 — Adult Casual | One‑tap Play/Pause; remembered volume/HUD; fast load | Overlay flow; localStorage keys; Lighthouse mobile perf; no extra dialogs | ✅ |
| 4 — Parent/Guardian | Safe visuals; calm options; clear overlays | “Reduce motion/No flash” dampen effects; overlays show Paused/Play/Cleared/Game Over | ✅ |
| 5 — Teacher/Therapist | Short runs; instant Restart; minimal reading | Results/Game Over overlays expose Restart; tutorial short; countdown adjustable | ✅ |
| 6 — Accessibility‑First | Reduce motion; No flash; contrast; spacing | Toggle checks; HUD label contrast; button spacing and focus styles | ✅ |
| 7 — Mobile‑First | Optimized background; minimal blocking; stable layout | AVIF/WebP/PNG pipeline; CSS order; CLS ~0; Lighthouse mobile pass | ✅ |
| 8 — Score Hunter | Quick retry; consistent windows; 0s countdown | Retry flow; stable judgment feel; Settings→countdown=0 tested | ✅ |
| 9 — Visitor | 5‑sec explanation; icons; Tutorial tab | Overlay copy & icons visible; tutorial succinct | ✅ |
| 10 — Maintainer | Clean modules; lifecycle; persistence; docs | No duplicate listeners; `song:*` events fire; localStorage keys present; README testing notes | ✅ |

> **Evidence:** Manual device testing (Chrome DevTools responsive + real phone), W3C HTML/CSS validators, Lighthouse (mobile & desktop), WebAIM contrast checks, in‑app Settings/overlay behavior, and console sanity tests.

---

## Wireframes & Mockups

![Wireframe overview](assets/images/bgpng1440.png)  
*Placeholder preview (PNG). Replace with your device mockups if desired.*

---

## Gameplay

**One song = one level.** Press **Play**, hit notes at the judge line, build a combo, clear the song. Short, snackable runs for five‑minute breaks.

### Timing & Scoring
- Judgement: **Perfect / Great / Good / Miss** with crisp feedback at the judge line.  
- **Combo** rewards consistency; your **BEST** is saved locally.

### Hearts & Forgiveness
- **Level 1** = practice: slow notes, one at a time, **no health loss**.  
- From **Level 2+**, repeated misses chip hearts. When hearts reach zero → **Game Over** (one‑tap **Retry**).

### Bonus Mode
- Appears on a **clean streak**, usually **after halfway** into the song.  
- **Levels 1–5:** extra points per hit.  
- **Level 4+ (harder):** may occasionally grant **extra life**.  
- Subtle, comfort‑aware cues (respects *Reduce Motion* / *No Flash*).

### Level Progression
- **Lv 1–3:** One note at a time, generous spacing.  
- **Lv 4–6:** Occasional pairs (readable, slightly spicier).  
- **Lv 7–10:** Denser patterns, more movement.  
- **Lv 11–13:** Boss‑vibe, fair but challenging.

---

## Features

- **Overlay Play/Pause** with large CTA and configurable **countdown** (0 = instant).  
- **Keyboard** (`← ↑ ↓ →`) **and touch controls** (large buttons).  
- **Results / Game Over / Pause** panels with Next / Retry flows.  
- **Reduce Motion** & **No Flash** comfort toggles; settings persist.  
- **Best score** saved locally; clean, readable HUD.

---

## Design

### Visual Language
- Neon arcade palette over deep space‑blue.  
- Pixel‑arcade type (Press Start 2P + VT323).  
- Friendly feedback; no harsh error walls.

### Layout & Responsiveness
- **Mobile‑first CSS**; rails and controls share the same width model.  
- Stable stage: `body { display:block }`, `main.game { min-block-size: calc(100svh - 4rem) }` to avoid vertical gaps.  
- Quick Play/Pause icon hides under open navbar; overlay icon reflects state.

### Accessibility
- **Reduce Motion:** disables dancer movement and rail tick animations.  
- **No Flash:** disables rail flash and heart glow (also applied to SVG hearts).  
- Clear focus states and large tap targets.

---

## Technologies
- **HTML5**, **CSS3**, **Vanilla JS (ES modules)**  
- **Bootstrap 5** (navbar only)  
- **Google Fonts** (Press Start 2P, VT323)  
- **GitHub Pages** for hosting

---

## Deployment
1. Push to the `main` branch.  
2. Ensure `index.html` is at the site root.  
3. In GitHub Pages settings, select the correct branch/folder.  
4. Hard refresh after deploy (**Ctrl/Cmd+Shift+R**).

Live: <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>

---

## Usage
- **Start / Pause:** Big overlay CTA or navbar Play/Pause.  
- **Hit notes:** Arrow keys or on‑screen arrows at the judge line.  
- **Settings:** Toggle *Reduce Motion*, *No Flash*, and set **countdown**.  
- **Instant restarts:** Set countdown to **0** in Settings.

---

## Testing

### Testing strategy (overview)
 manual UX checks, HTML/CSS validation, Lighthouse audits, and targeted **console sanity tests** for overlay lifecycle, HUD rendering (hearts/score), input judging, and song events. Automated unit tests are planned.

### Tools & Methods
- **Browsers:** Chrome (desktop) + DevTools device emulation.  
- **Validation:** W3C HTML Validator, W3C CSS Validator (pass).  
- **Audits:** Lighthouse (Performance/Best Practices/Accessibility).  
- **Accessibility toggles:** *Reduce Motion* and *No Flash* verified visually and via DOM state.  
- **Console tests:** Quick commands to verify flows after changes/deploys.

### Manual Test Matrix

| Area | Scenario | Expected | Result |
|---|---|---|---|
| Overlay (Play) | First load → Play visible | Overlay visible, label “Play”, icon=play | Pass |
| Countdown | Default 3s | Label 3→2→1→GO, then start | Pass |
| Countdown = 0 | Settings set to 0 | No countdown, starts immediately | Pass |
| Pause | Press Play while running | Paused, `data-paused="true"`, Pause panel | Pass |
| End (clear) | Survive to end | Results panel, Next available | Pass |
| End (fail) | Lose all hearts | Game Over, Retry available | Pass |
| Hearts | On load | Hearts render in `#lives` | Pass |
| Hearts | On miss | Hearts update reflect damage | Pass |
| Navbar | Toggle | `data-nav-open` syncs; Quick Play/Pause hides under open navbar | Pass |
| Rotate overlay | Orientation changes | Rotate overlay appears/disappears correctly | Pass |
| Reduce Motion | Toggle on | Animations stop (dancer/rails) | Pass |
| No Flash | Toggle on | Rail flash + heart glow disabled | Pass |
| Persistence | Reload | Settings persist | Pass |

### Developer Console Sanity Tests

```js
!!document.getElementById('overlay');                      // true on boot
document.body.hasAttribute('data-paused');                 // true before start
document.querySelectorAll('#lives .svg-heart').length>=1;  // hearts drawn
document.querySelectorAll('.rail .note').length;           // active notes count
window.clearAllNotes?.();                                  // clears visuals

// Moves (if test helpers available)
window.doLeftMove?.(); window.doRightMove?.();
window.doUpMove?.();   window.doDownMove?.();

// Lifecycle
addEventListener('song:ready',   e=>console.log('ready', e.detail));
addEventListener('song:started', e=>console.log('started', e.detail));
addEventListener('song:ended',   e=>console.log('ended', e.detail));
addEventListener('song:error',   e=>console.error('error', e.detail));

// Instant starts
localStorage.setItem('countdownSec','0'); location.reload();
```

### Regression Tests (Recent Fixes)
1) **Overlay/hearts missing after JS cleanup** → Export `setPlayTip`, `setOverlayIcon`, `initTopbarAutoHeight` from `ui.js` to match imports.  
2) **Countdown=0 ignored** → Replace `||` with `??`, zero‑safe parsing; `runOverlayCountdown(0)` skips timer.  
3) **Layout gap** → Keep `body { display:block }`; ensure `main.game { min-block-size: calc(100svh - 4rem) }`.  
4) **A11y toggles** → Verify *Reduce Motion* halts animations; *No Flash* disables flash + heart glow.

### Validation
- **HTML:** W3C – no blocking errors.  
- **CSS:** W3C – pass.  
- **Lighthouse:** Minor “preload not used soon” warnings may appear; non‑blocking.

### Known Issues / Non‑blocking
- Preload warnings for background/fonts in some sessions; acceptable for this scope.

### Future Testing
- **Jest unit tests:** scoring (combo/lives/bonus), difficulty spacing.  
- **Integration:** song scheduling alignment and event order.  
- **E2E:** overlay flows and responsive checkpoints with visual diffs.  
- **Automated console harness:** script streaks/misses and assert score/lives.

---

## Credits

### Music — Kevin MacLeod (Incompetech), CC BY 3.0/4.0
C‑Funk • Style Funk • Funkorama • Flutey Funk • Funk Game Loop • Aces High • Protofunk • Smooth Move • Funky Chunk • Celebration • Your Call • Enter the Party • Fork and Spoon

### Background Artwork
The neon space backdrop is delivered as an optimised ladder: `assets/images/background.(avif|webp|png)` and responsive variants (`bg1024.*`, `bg1440.*`, `bg1920.*`, `bg2560.webp`).  
**Credit:** *[Add title/description]* by *[Author]* — *[Source URL]* — *[License]*. Transcoded to AVIF/WebP/PNG for performance.

### Fonts
Press Start 2P & VT323 — Google Fonts.

### Frameworks & Libraries
Bootstrap 5 (navbar only).

### Icons / Graphics 
Custom SVG character and UI graphics created for this project.

---

## Acknowledgements
- Code Institute guidance and materials.  
- Patient playtesting from friends & family.  
- Thanks to Kevin MacLeod (Incompetech) for generous CC‑licensed music.
