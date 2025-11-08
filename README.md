
![Mockups of the game on desktop, tablet and mobile](assets/images/readme/mockup-multi-device.png)  
*Responsive view of Jazz the Cat in the Hat across devices.*

# Jazz the Cat in the Hat

A neon-styled, chart‑driven **web rhythm game** built with **HTML/CSS/vanilla ES modules**.

Players hit **Left / Up / Down / Right** to the beat. Notes fall toward a judge line; timing is scored as **Perfect / Great / Good / Miss**. The game includes **lives**, a **combo → multiplier** system, a **bonus mode** that can award **extra lives**, and **15 difficulty levels** mapped to a curated song set.

**Live Site:** <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>  
**Repo:** <https://github.com/GooldenApple/Jazz-the-Cat-in-the-Hat>

---

## Contents

- [User Experience (UX)](#user-experience-ux)
  - [Project Purpose](#project-purpose)
  - [UX Decisions](#ux-decisions)
  - [Initial Discussion](#initial-discussion)
  - [Key Information for the Game](#key-information-for-the-game)
  - [User Stories](#user-stories)
    - [Player Goals](#player-goals)
    - [First‑Time Player](#firsttime-player)
    - [Returning Player](#returning-player)
    - [Accessibility & Sensitivity](#accessibility--sensitivity)
    - [Developer / Maintainer](#developer--maintainer)
- [Design](#design)
  - [Colour Scheme](#colour-scheme)
  - [Typography](#typography)
  - [Imagery & Icons](#imagery--icons)
  - [Audio & Songs](#audio--songs)
  - [Wireframes](#wireframes)
- [Features](#features)
  - [Global Features](#global-features)
  - [Core Gameplay](#core-gameplay)
  - [Difficulty & Levels](#difficulty--levels)
  - [Settings](#settings)
  - [Controls](#controls)
- [Accessibility](#accessibility)
- [Technologies Used](#technologies-used)
- [Deployment & Local Development](#deployment--local-development)
  - [Deployment (GitHub Pages)](#deployment-github-pages)
  - [Local Development](#local-development)
  - [How to Fork](#how-to-fork)
  - [How to Clone](#how-to-clone)
- [Testing](#testing)
  - [Manual Feature Testing](#manual-feature-testing)
  - [Game Logic & Console Harness](#game-logic--console-harness)
  - [Accessibility Testing](#accessibility-testing)
  - [Browser & Device Testing](#browser--device-testing)
  - [Automated Testing](#automated-testing)
  - [Code Validation](#code-validation)
  - [Bug Fixes & Future Improvements](#bug-fixes--future-improvements)
- [Grading Criteria Mapping (Pass/Merit)](#grading-criteria-mapping-passmerit)
- [Appendix / Process & Artifacts](#appendix--process--artifacts)
  - [Architecture & File Structure](#architecture--file-structure)
  - [Event Protocol](#event-protocol)
  - [Difficulty Reference](#difficulty-reference)
  - [Testing Artifacts](#testing-artifacts)
- [Credits](#credits)
- [Acknowledgements](#acknowledgements)

---

## User Experience (UX)

### Project Purpose

Deliver a responsive rhythm game with:
- **Clear feedback** (combos, hearts, timing labels).
- **Fair progression** (levels ramp from very easy → boss tiers).
- **Accessibility toggles** (reduce motion / no flash).
- **Low friction** start (overlay Play button, quick play/pause).

### UX Decisions

- **Mobile‑first layout** with consistent rail/controls alignment and safe‑area insets respected on iOS.  
- **Overlay CTA** with **3‑2‑1 countdown** that can be paused immediately.  
- **Neon theme** with toned glow to keep legibility on small screens.  
- **HUD** emphasizes **score, lives, level, combo**, and **best**; readable even at 360px.  
- **Bonus mode banner** is persistent but unobtrusive; uses text/minimal glow.

### Initial Discussion

The game targets casual players learning rhythm timing. Early levels are extremely forgiving and **only spawn one note at a time**. The pace and simultaneity scale over time. **Natural misses do not instantly punish** at low tiers; damage accrues via tolerant steps to keep frustration low while still teaching timing.

### Key Information for the Game

- Fast to start; **no account** required.  
- **Arrows** = inputs; **touch** and **keyboard** supported.  
- **Lives & streaks** guide progress; **extra lives** possible in **bonus mode**.  
- **Songs are chart‑driven** so timing aligns with the music.

### User Stories

#### Player Goals
**User Story:**  
As a player, I want a quick start and clear feedback on my timing so I can improve while enjoying the music.

**Acceptance Criteria:**  
- Overlay Play starts a level with a short countdown.  
- Timing labels (Perfect/Great/Good/Miss) are visible.  
- Lives and combo are clearly shown and update instantly.  
- Bonus mode feedback shows progress toward extra life.

**Tasks:**  
- Implement overlay with countdown + Play/Pause.  
- Render HUD (score, best, lives, combo, level).  
- Emit feedback labels near judge line.  
- Dispatch bonus progress events to update the banner.

#### First‑Time Player
**User Story:**  
As a first‑time player, I want very easy early levels to practice one note at a time so I can learn timing without feeling overwhelmed.

**Acceptance Criteria:**  
- Levels 1–3 spawn single notes only; slow fall speed.  
- Level 1 has **no life loss** (training).  
- Hit windows are generous.  
- Charts simplified for low complexity.

**Tasks:**  
- Enforce `maxSimultaneous=1` for early levels.  
- Set generous judge windows and long travel time.  
- Simplify charts and block simultaneous spawns.

#### Returning Player
**User Story:**  
As a returning player, I want a longer game with increasing density and faster beats so I can challenge myself and track my best score.

**Acceptance Criteria:**  
- Gradual increase in density and simultaneity.  
- Best score is persisted to localStorage.  
- Levels get **longer overall** by repeating the song if needed.

**Tasks:**  
- Level policy ramps probabilities for pairs/trios/quads.  
- Persist and load `best` across sessions.  
- If a level target duration exceeds a single song, **loop the track** seamlessly.

#### Accessibility & Sensitivity
**User Story:**  
As a player with motion/light sensitivity, I want to reduce motion or disable bright flashes so I can play comfortably.

**Acceptance Criteria:**  
- Settings include **Reduce Motion** and **No Flash** options.  
- States are remembered and affect visuals immediately.  
- Buttons are **ARIA‑labeled** with visible focus outlines.

**Tasks:**  
- Implement `aria-pressed` buttons with proper `aria-describedby`.  
- Respect settings in CSS/JS (animation timing, glow/flash toggles).  
- Persist settings in localStorage and apply on load.

#### Developer / Maintainer
**User Story:**  
As a developer, I want clean modules and an event protocol so I can extend songs, difficulty, or UI without breaking the game loop.

**Acceptance Criteria:**  
- Modules: `game.js`, `ui.js`, `input.js`, `scoring.js`, `songPlayer.js`, `songRegistry.js`, `difficulty.js`.  
- Custom events: `song:*`, `ui:*`, `game:*`.  
- Charts in `/assets/charts/*.json` and audio in `/assets/audio/*.mp3`.

**Tasks:**  
- Keep public exports minimal and documented.  
- Avoid duplicate listeners; centralize start/stop.  
- Chart loader validates bpm, offset, travelBeats fields.

---

## Design

### Colour Scheme

![Neon color palette](assets/images/readme/palette.png)  
*Neon palette tuned for contrast: pink, purple, cyan, green on dark blue background.*

- Background: `#0b1221`  
- Ink (text): `#f5f7ff`  
- Neon Pink: `#ff4dd2`  
- Neon Purple: `#a64dff`  
- Neon Cyan: `#00ffd5`  
- Neon Green: `#39ff14`  

### Typography

- **Head‑up display (HUD)** and **buttons** use a bold display font; body text remains highly legible.  
- Mobile sizes favor readability; headings scale progressively with clamp().

### Imagery & Icons

- **Icon‑only quick play/pause** (glyph `'▶'` / `'⏸'`) with subtle glow.  
- Minimalist note orbs and rail markers for clarity.

### Audio & Songs

Songs by **Kevin MacLeod – Incompetech** (CC‑BY 3.0/4.0). Sample set used in levels (subject to change):  
C‑Funk, Style Funk, Funkorama, Flutey Funk, Funk Game Loop, Aces High, Protofunk, Smooth Move, Funky Chunk, Celebration, Your Call, Enter the Party, Fork and Spoon.  
See **Credits** for licensing notes.

### Wireframes

<details>
  <summary>📸 Game Screen Wireframe</summary>

![Game Screen Wireframe](assets/images/readme/wire-game.png)  
*Rails, judge line, HUD, overlay CTA and quick-pp button alignment.*
</details>

<details>
  <summary>📸 Settings & Accessibility Wireframe</summary>

![Settings Wireframe](assets/images/readme/wire-settings.png)  
*Reduce Motion / No Flash / HUD expand, labels and focus order.*
</details>

---

## Features

### Global Features

- Responsive grid, safe‑area aware spacing on iOS.  
- Top overlay with **Play/Pause** and 3‑2‑1 countdown.  
- **Quick Play/Pause** button (icon‑only) anchored near HUD row.  
- Persistent **best score** via localStorage.

### Core Gameplay

- Falling notes aligned to chart timing; **gid** grouping for simultaneous chords.  
- **Perfect / Great / Good / Miss** windows configurable per level.  
- **Combo → multiplier** grants modest score boosts.  
- **Lives** with tolerant damage (partial hearts) and **Game Over** route.  
- **Bonus mode** after a streak: +10 points per hit; **extra life** awarded upon reaching **hits/points goal**; resets the counter and continues.

### Difficulty & Levels

- 15 levels total; early levels restrict simultaneity and slow travel.  
- **Songs loop** to ensure later levels run longer without slowing the track.  
- Policy gradually allows **pairs → trios → quads** respecting `maxSimultaneous`.  
- Level config overrides **judge windows**, **travelBeats**, and **bonus thresholds**.

### Settings

- **Reduce Motion** — tones down animations and parallax.  
- **No Flash** — dims bright glows/flash cues.  
- **HUD Expand** — switch between compact and expanded modes.  
All settings reflect **immediately** and persist between sessions.

### Controls

- **Keyboard:** Arrow keys (← ↑ ↓ →) to hit lanes; **Space/Enter** to toggle Play/Pause.  
- **Touch:** On‑screen arrows; ghost‑click filtered for better mobile feel.  
- **Overlay Play/Pause** clickable during countdown; label shows a pause icon while starting.

---

## Accessibility

- Semantic regions (`<header>`, `<main>`, `<footer>`) and role hints.  
- Buttons use **`aria-pressed`** for toggle state and **`aria-describedby`** for hints.  
- Visible **focus rings** on all interactive elements.  
- **Reduce Motion** and **No Flash** settings to accommodate sensitivity.  
- Color palette checked for sufficient contrast against dark theme.  
- Mobile hit targets ≥ 44px.  
- **Known to watch:** avoid orphaned `<label>` elements; label buttons with `aria-labelledby` instead of `for=` when not using inputs.

---

## Technologies Used

### Languages
- **HTML5**, **CSS3**, **JavaScript (ES modules)**

### Libraries / Tools
- **Bootstrap 5** (navbar only)  
- **LocalStorage** for persistent settings and best score  
- **Chrome DevTools / Lighthouse / WAVE** for auditing  
- **VS Code** for development

---

## Deployment & Local Development

### Deployment (GitHub Pages)

The site is deployed to GitHub Pages from the `main` branch.

1. Open the repo → **Settings → Pages**.  
2. **Source**: Deploy from a branch → `main` → `/ (root)`.  
3. Save and wait for the deployment banner to confirm.

**Live:** <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>

### Local Development

```bash
git clone https://github.com/GooldenApple/Jazz-the-Cat-in-the-Hat.git
cd Jazz-the-Cat-in-the-Hat
# Open index.html directly or start a local server (e.g., Live Server in VS Code)
```

### How to Fork

1. Go to the repo and click **Fork** (top right).  
2. Work in your fork; submit PRs back to `main` when ready.

### How to Clone

```bash
git clone https://github.com/GooldenApple/Jazz-the-Cat-in-the-Hat.git
cd Jazz-the-Cat-in-the-Hat
```

---

## Testing

### Manual Feature Testing

| Area | Action | Expected | Status |
|------|--------|----------|--------|
| Overlay | Click Play | 3‑2‑1 then song starts; icon shows Pause during countdown | ✅ |
| Overlay | Click during countdown | Pauses immediately, overlay remains interactive | ✅ |
| Quick‑PP | Tap icon | Toggles Play/Pause, HUD label updates | ✅ |
| HUD | Lives/combo/score/best | Values update on hits/misses; best persists | ✅ |
| Bonus | Reach activate combo | Bonus banner appears and tracks progress | ✅ |
| Bonus | Reach hits/points goal | +1 life awarded (≥ L4), counters reset | ✅ |
| Settings | Reduce Motion | Animations toned down; persists | ✅ |
| Settings | No Flash | Bright glows reduced; persists | ✅ |
| Controls | Keyboard arrows | Inputs grade correctly | ✅ |
| Controls | Touch arrows | Responsive with ghost‑click filter | ✅ |

> See screenshots in **Testing Artifacts** (placeholders included).

### Game Logic & Console Harness

We built small **diagnostic runners** to simulate gameplay without manual input:

- **Orb density per level** – counts events and computed `orbsPerSec`, confirming density ramp.  
  Placeholder: `assets/images/readme/test-orb-stats.png`

- **Lives tolerance** – verifies partial‑heart logic:  
  - **Level 1:** immunity (no life loss).  
  - **Level 3:** **3 misses → ¼ heart**; after 4 quarters, −1 life.  
  - **Level 8:** **5 misses → ¼ heart**.  
  - **Bonus mode:** ends on miss; no life loss inside bonus.  
  Placeholder: `assets/images/readme/test-miss-logic.png`

- **Bonus progress** – auto‑generate hits to validate `bonus:progress` events, counters, and **life award** (+ reset).  
  Placeholder: `assets/images/readme/test-bonus.png`

- **Song cutoff** – confirms stop timer fires after last note + travel padding, showing **Results/Game Over** overlays properly.  
  Placeholder: `assets/images/readme/test-cutoff.png`

### Accessibility Testing

- **WAVE**: caught an *Orphaned form label* in Settings.  
  **Action:** Replace stray `<label for=…>` with either `<span id>` + `aria-labelledby` or associate labels with real inputs.  
  Placeholder: `assets/images/readme/wave-orphaned-label.png`

- **Keyboard‑only**: all interactive elements reachable; outline visible.  
- **Reduce Motion / No Flash** verified to affect visuals live and on reload.

### Browser & Device Testing

- Chrome (latest), Edge (latest), Firefox (latest), iOS Safari, Android Chrome.  


### Automated Testing

- **Lighthouse** (mobile & desktop): performance/accessibility/SEO recorded with screenshots.  
  Placeholders:  
  `assets/images/readme/lh-home-mobile.png`, `assets/images/readme/lh-home-desktop.png`

- **W3C Validators** for HTML & CSS (screenshots placed under `/assets/images/readme/validators/`).

### Code Validation

- HTML validated with W3C; resolved stray attributes and ensured alt text.  
- CSS validated; removed unused rules where identified.  
- JS run through **strict ES modules**; avoided duplicate event listeners.

### Bug Fixes & Future Improvements

**Implemented**
- Chart‑driven spawns with **gid** for grouped hits.  
- **Bonus mode** with points/hits goals and **life awards** (≥ L4).  
- **Tolerant miss** system (3 or 5 misses → ¼ heart).  
- Quick‑PP icon‑only button with subtle glow and better centering.  
- Song **looping** to keep higher levels longer without slowing audio.

**Planned / Known Issues**
- Rare overlay mis‑routing between **Results/Game Over** after stop — keep verifying after changes.  
- Replace any orphaned form labels in Settings and ensure ARIA mapping is correct.  
- Tighten difficulty pacing once final charts are locked; ensure anti‑simultaneous rules for L1–3.  
- Add sound FX toggle and volume slider to Settings.

---

## Grading Criteria Mapping (Pass/Merit)

> Based on Code Institute “Interactive Frontend / Web App” criteria (as provided).

| Criterion | Evidence in this project |
|---|---|
| **Responsive, accessible UI** | Mobile‑first CSS, visible focus, contrast‑checked palette, settings for motion/flash. |
| **Interactive features** | Chart‑driven notes, scoring, combo multiplier, bonus mode with life awards, settings toggles. |
| **Code quality** | ES modules, event protocol, single source of truth in `scoring.js`; comments and naming consistent. |
| **Testing** | Manual scenarios + console harness (orb density, lives tolerance, bonus awards, cutoff). Screenshots attached. |
| **Deployment** | GitHub Pages with reproducible steps. |
| **Documentation** | This README with UX, features, testing evidence, and future work. |
| **Merit focus** | Clear UX rationale, traceable user stories, testing depth (logic harness), accessibility accommodations, and maintainable architecture. |

---

## Appendix / Process & Artifacts

### Architecture & File Structure

```
/assets/
  /audio/                # songs (Kevin MacLeod), CC-BY
  /charts/               # chart JSON files (bpm, offsetMs, notes[])
  /css/style.css         # neon theme + HUD + overlays
  /images/readme/        # screenshots & diagrams (placeholders added)
/assets/js/
  game.js                # bootstrap + lifecycle + overlay countdown
  ui.js                  # DOM helpers, HUD, overlays, quick-pp
  input.js               # keyboard/touch handlers (ghost-click filter)
  scoring.js             # single source of truth: score/lives/combo/bonus
  songPlayer.js          # load audio+chart, schedule spawns, loop if needed
  songRegistry.js        # curated songs + level mapping
  difficulty.js          # LEVELS config and chart simplifier
  test.js                # console harness for local diagnostics (dev only)
index.html               # entry point (Bootstrap navbar + game layout)
```

### Event Protocol

- `ui:requestStartRun`, `ui:requestPause`  
- `song:ready`, `song:started`, `song:ended`, `song:error`  
- `game:livesDepleted`, `ui:nextLevel`, `ui:retryLevel`, `ui:restartLevel`  
- `bonus:started`, `bonus:progress`, `bonus:lifeAwarded`, `bonus:ended`

![Event flow diagram](assets/images/readme/event-flow.png)

### Difficulty Reference

| Level | Intent | Simultaneity | Travel | Judge Windows | Bonus |
|------:|--------|---------------|--------|----------------|-------|
| 1–3 | Training / Casual | 1 | long | generous | points only; no life awards |
| 4–6 | Casual+ / Groove | 2 | moderate | forgiving | life awards via hits/points goals |
| 7–10 | Challenge | 2–3 | faster | tighter | life awards |
| 11–15 | Boss tiers | 3–4 | fast | tightest | life awards |

### Testing Artifacts

- **Orb density per level:** `assets/images/readme/test-orb-stats.png`  
- **Miss tolerance:** `assets/images/readme/test-miss-logic.png`  
- **Bonus progress & award:** `assets/images/readme/test-bonus.png`  
- **Song cutoff & overlays:** `assets/images/readme/test-cutoff.png`  
- **WAVE reports:** `assets/images/readme/wave-orphaned-label.png`  
- **Lighthouse:** `assets/images/readme/lh-home-mobile.png`, `...desktop.png`  
- **Validators:** `/assets/images/readme/validators/*.png`

> Replace these placeholders with real screenshots after running the tests on the deployed site.

---

## Credits

### Code & Libraries
- **Bootstrap 5** (navbar) – <https://getbootstrap.com/>  
- Minor snippets and documentation support with **ChatGPT (OpenAI)**.  

### Media
- **Music:** Kevin MacLeod (Incompetech) – CC‑BY. Tracks include C‑Funk, Style Funk, Funkorama, Flutey Funk, Funk Game Loop, Aces High, Protofunk, Smooth Move, Funky Chunk, Celebration, Your Call, Enter the Party, Fork and Spoon. Each track credit will be listed in‑game and here with links in the final submission.  
- **Frame graphic** (HUD frame) from **Freepik** (credited in‑game and here).  
- **Icons:** built‑in glyphs (play/pause); any external icon packs will be credited if used.

---

## Acknowledgements

- **Code Institute** tutors and community for guidance.  
 
  Special thanks to Friends/family for testing and feedback.

---
