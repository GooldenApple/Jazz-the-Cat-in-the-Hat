# Jazz the Cat in the Hat

*A neon-arcade reaction game built **for you** — quick to learn and satisfying to master*

![Mockup overview](assets/images/mockup.png)  
*Mockup overview*

**Live Site:** <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>  
**Repository:** <https://github.com/GooldenApple/Jazz-the-Cat-in-the-Hat>

<br>

---

## Table of Contents
- [Project Overview](#project-overview)
- [UX](#ux)
  - [Target Audience](#target-audience)
  - [User Stories](#user-stories)
- [Design](#design)
  - [Wireframes](#wireframes)
  - [Colour Scheme](#colour-scheme)
  - [Typography](#typography)
- [Features](#features)
  - [Core Gameplay](#core-gameplay)
  - [Bonus Mode](#bonus-mode)
  - [Accessibility Features](#accessibility-features)
- [Technologies Used](#technologies-used)
- [Testing](#testing)
  - [User Story Testing](#user-story-testing)
  - [Manual Testing](#manual-testing)
  - [Validation](#validation)
  - [Responsiveness Testing](#responsiveness-testing)
  - [Browser Compatibility](#browser-compatibility)
  - [Known Issues](#known-limitationsissues)
- [Deployment](#deployment--local-development)
  - [GitHub Pages](#deployment-github-pages)
  - [404 Page](#404-page)
  - [Local Development](#local-development)
  - [How to Fork](#how-to-fork)
  - [How to Clone](#how-to-clone)
- [Credits](#credits)
- [Acknowledgements](#acknowledgements)

<br>

---

## Project Overview

This project grew at the kitchen table with two very honest testers: my kids. My son especially shaped the early levels: “make it easier at the start, mom!”.  
**Jazz the Cat in the Hat** was built to feel playful, quick, and beginner-friendly — something you can pick up for a few minutes, smile, and try again.

The focus has been on a warm, family-friendly vibe with clear feedback, simple progression, and comfort options that help more people enjoy the game.

<br>

---

## What the Game Is

**Jazz the Cat in the Hat** is a neon-arcade reaction game designed to be easy to pick up and satisfying to master!

Orbs fall down four lanes, and your job is to hit the matching direction at the right moment as the orb crosses the neon target. Timing is graded as **Perfect**, **Great**, or **Good**, and consistent hits build streaks to trigger **Bonus Mode**.  
Reach the end of the song to clear the level. Early levels are gentle and forgiving, then difficulty ramps in small, safe steps.

<br>

---

## UX

### Target Audience
- **Children and younger players** who benefit from simple controls, clear visuals, quick feedback, and a gentle learning curve.
- **Teens and adults** who want a fun break from reality and enjoy fast-paced reaction games with score-chasing and progression.
- **Mobile/tablet players** who prefer touch controls.
- **Desktop players** who prefer the feeling of pressing real buttons and bigger screens.

### Initial Discussion

The UX goal for this project was to remove friction and keep the player in the flow. Because the game is timing-based and fast, the interface is designed to be readable at a glance, with clear feedback and simple choices on every screen.

The overall experience aims to feel friendly and “safe to try”: quick restarts, predictable Play/Pause behaviour, and comfort settings that let players adjust motion, flash, and audio without leaving the game.

### UX Decisions

- The game is built **mobile-first**, with tap-friendly controls and a layout that adapts cleanly across common screen sizes.
- The HUD and feedback are intentionally **large and easy to scan** (score, lives, timing grade), so important information is readable during fast gameplay.
- The Play/Pause flow is designed to be predictable: a clear **Play** call-to-action, a short **countdown**, and a consistent pause/resume experience.
- Inputs are flexible by design — **touch**, **keyboard**, and **mouse** are all supported so players can use what feels natural.
- Comfort options are treated as real features: **Reduce Motion**, **No Flash**, and **Volume/Mute** help make the game playable for more people.
- Difficulty ramps in small steps, so players can build confidence early instead of hitting sudden difficulty spikes.

### Key Information for the Game

- Clear **Play/Pause** flow with a short **countdown**  
- Multiple control options: **keyboard**, **mouse**, and **touch**  
- Simple scoring feedback: **Perfect / Great / Good / Miss**  
- HUD showing **score**, **combo**, **level**, and **lives**  
- **Bonus Mode** rewards streaks with extra points and from Level 4+ potential extra lives  
- Accessibility settings: **Reduce Motion**, **No Flash**, **Volume**, and **Mute**

<br>

---

### User Stories

#### Child Player / first-time player
**User Story:**  
As a child player, I want the game to be easy to start and understand, so I can play right away without needing to read lots of instructions.

**Acceptance Criteria:**  
- The **Play** button is clearly visible when the site loads.  
- A short **countdown** runs before the game starts, so I have time to get ready.  
- Controls work with **touch** on mobile as well as **keyboard** on desktop.  
- Feedback is clear and immediate, so I know how I did.  
- The first level feels safe and beginner-friendly, level 1 does not reduce lives on misses.

**Tasks:**  
- Design a clear overlay with a visible **Play** call-to-action.  
- Implement a countdown before gameplay begins.  
- Ensure touch controls are responsive and easy to tap.  
- Display timing feedback near the target area.  
- Configure Level 1 as a warm-up level with no life loss on misses.

#### Player (Mobile)
**User Story:**  
As a mobile player, I want touch controls that are responsive, so I can play comfortably on a phone.

**Acceptance Criteria:**
- Touch buttons respond immediately.
- No accidental double inputs occur from taps.
- Controls remain aligned across screen sizes.

**Tasks:**
- Implement touch input handlers for arrow buttons.
- Add basic protection against ghost clicks.
- Test controls at 320px and 375px widths.

#### Player (Desktop)
**User Story:**  
As a desktop player, I want keyboard controls, so I can play with precision.

**Acceptance Criteria:**
- Arrow keys trigger the matching lane.
- Input feels consistent during gameplay.
- Pause/Resume works during play.

**Tasks:**
- Add keyboard listeners for lane inputs.
- Support Play/Pause flow during gameplay.
- Verify input behaviour through manual testing.

#### Player (Progression)
**User Story:**  
As a player, I want early levels to feel forgiving, so I can improve gradually.

**Acceptance Criteria:**
- Level 1 does not reduce lives on misses.
- Difficulty increases in small steps from Level 2 onwards.
- The player can replay or continue after clearing a level.

**Tasks:**
- Configure Level 1 rules.
- Configure Level 2+ miss rules.
- Add Results overlay with Next/Replay options.

#### Player (Rewards)
**User Story:**  
As a player, I want a reward mechanic, so streaks feel exciting.

**Acceptance Criteria:**
- Bonus Mode activates at a streak threshold.
- Bonus hits grant +10 extra points.
- Bonus Mode ends on a miss.
- Extra lives can be earned from Level 4+.

**Tasks:**
- Implement Bonus Mode activation/ending logic.
- Show Bonus banner and bonus feedback text.
- Add extra-life award logic from Level 4+.

#### Player (Accessibility)
**User Story:**  
As a sensitive player, I want Reduce Motion and No Flash options, so I can play comfortably.

**Acceptance Criteria:**
- Reduce Motion reduces or disables key animations.
- No Flash disables intense glow/flash effects.
- Settings are available from the UI.

**Tasks:**
- Add settings toggles and persist choices if applicable.
- Apply CSS/JS hooks for reduce-motion and no-flash.
- Add screenshots demonstrating the settings.

_Traceability:_ These user stories are verified in **Testing → User Story Testing**.

<br>

---

## Features


### Core Gameplay

- Play/Pause overlay with countdown  
- Four lanes with falling orbs  
- Timing feedback: Perfect / Great / Good / Miss  
- Score, best high score, level and lives shown on HUD  

<details>
  <summary><strong>Show screenshots: Core Gameplay</strong></summary>

  ![Countdown showing 3 seconds](assets/images/testing/countdown-3.png)  
  *Countdown (3 seconds).*

  ![Gameplay started with falling orbs](assets/images/testing/gameplay-started.png)  
  *Gameplay started.*

  ![Pause overlay shown during gameplay](assets/images/testing/pause-overlay.png)  
  *Pause overlay.*

  ![Timing feedback shown near the target: Perfect / Great / Good](assets/images/testing/feedback-perfect.png)  
  *Timing feedback (Perfect / Great / Good).*

  ![Results overlay after clearing a level](assets/images/testing/results-overlay.png)  
  *Results overlay (Level Clear).*

  ![Game Over overlay after losing all lives](assets/images/testing/game-over.png)  
  *Game Over overlay.*

</details>

<br>

---

### Bonus Mode – How It Works

When you build up a strong streak, you trigger **Bonus Mode** — a reward phase that makes every hit feel extra satisfying.

- **How to trigger it:** Reach a hit streak threshold without missing.  
- **What it gives you:** Every successful hit during Bonus Mode grants **+10 extra points** on top of your normal **Good/Great/Perfect** scoring.  
- **How it ends:** Bonus Mode ends immediately when you make a **miss**.  
- **Extra rewards:** On later levels, Bonus Mode can also award **extra lives** when you reach specific bonus goals.  

<details>
  <summary><strong>Show screenshots: Bonus Mode</strong></summary>

  ![Bonus mode activated](assets/images/testing/bonus-mode.png)  
  *Bonus Mode activated.*

  ![Bonus feedback good +10](assets/images/testing/bonus-good.png)  
  *Bonus feedback — GOOD +10.*

  ![Bonus feedback great +10](assets/images/testing/bonus-great.png)  
  *Bonus feedback — GREAT +10.*

  ![Bonus feedback perfect +10](assets/images/testing/bonus-perfect.png)  
  *Bonus feedback — PERFECT +10.*

  ![Bonus mode extra life awarded](assets/images/testing/bonus-extra-life.png)  
  *Bonus Mode awarding an extra life (Level 4+).*

  ![Bonus mode ended](assets/images/testing/bonus-ended.png)  
  *Bonus Mode ended after a miss.*

</details>

<br>

---

### Levels

**Level 1** is designed as a calm introduction and a safe practice space.  
To help new players learn the timing and controls without pressure, **Level 1 does not reduce lives** when you miss. This makes it easier to focus on reaction, accuracy, and building confidence before the challenge increases in later levels.

<details>
  <summary><strong>Show screenshot: Level 1 (no life loss)</strong></summary>

  ![Level 1 showing full hearts](assets/images/testing/level1-full-hearts.png)  
  *Level 1: misses do not reduce lives (verified in MT17).*

</details>

<br>

From **Level 2 and onwards**, misses become more punishing and lives can be lost, so the difficulty ramps up gradually while keeping the early experience friendly and approachable.

<details>
  <summary><strong>Show screenshot: Losing lives on higher levels</strong></summary>

  ![Life loss on Level 2+](assets/images/testing/level2-heart-loss.png)  
  *Life loss on Level 2+.*

</details>

<br>

From **Level 4 and onwards**, the game introduces a new reward: **extra lives**.  
If you perform well during **Bonus Mode** and reach the bonus goal, you can earn an **additional life**, giving you a small safety net for longer and more challenging runs.

This reward is intentionally locked until Level 4 so new players can first learn the core rhythm and timing before the game adds higher-stakes mechanics.

<details>
  <summary><strong>Show screenshot: Winning lives on higher levels</strong></summary>

  ![Extra life Level 4+](assets/images/testing/bo-extra.png)  
  *Extra life awarded during Bonus Mode on higher levels.*

</details>

<br>

---

### Win / Lose

- **Level Clear:** Reach the end of the song, and you can either replay the same level or go to the next one.  
- **Game Over:** Lose all lives from Level 2+, and you will have to start over from level 1 again.  

<details>
  <summary><strong>Show screenshot: Win</strong></summary>

  ![Win](assets/images/testing/win.png)  
  *Win overlay.*

  <summary><strong>Show screenshot: Game Over</strong></summary>

  ![Game over](assets/images/testing/gameover.png)  
  *Game Over overlay.*

</details>

<br>

---

### Controls

Play using **keyboard**, **mouse**, or **touch**. Hit the matching direction for the lane as the orb reaches the neon target.

<details>
  <summary><strong>Show screenshots: arrow controls</strong></summary>

  ![On-screen arrow controls](assets/images/arrows.png)  
  *On-screen arrow controls.*

</details>

---

### Tutorial

The game includes two layers of guidance:

- A short message on the Play and Pause overlay (“Hit the correct arrow when an orb crosses the neon target!”) so new players instantly know what to do.  
- A full Tutorial panel in the Settings menu that explains timing grades, streaks, Bonus Mode, extra lives, and the difference between Level 1 and higher levels.  

<details>
  <summary><strong>Show screenshot: Pause overlay</strong></summary>

  ![Pause overlay](assets/images/testing/paused.png)  
  *Paused overlay.*

</details>

<details>
  <summary><strong>Show screenshot: Tutorial panel</strong></summary>

  ![Tutorial panel](assets/images/testing/tutorial.png)  
  *Tutorial panel.*

</details>

<br>

---

### Overlays (Play, Pause, Countdown)

The game uses clear, animated overlays to guide the player flow:
- **Play overlay**: shows tutorial text and Play button  
- **Countdown overlay**: appears before gameplay starts (0/3/5 seconds)  
- **Pause overlay**: lets players safely stop the action mid-run  

<details>
  <summary><strong>Show screenshots</strong></summary>

  ![Countdown](assets/images/testing/countdown.png)  
  *Countdown overlay.*

  ![Play Overlay](assets/images/testing/short.png)  
  *Play overlay.*

  ![Pause Overlay](assets/images/testing/paused.png)  
  *Paused overlay.*

</details>

<br>

---

### Quick Play/Pause Button

A dedicated floating pause button allows players to stop the game instantly  
without needing to open the menu.  
It is always visible during gameplay and automatically hides when the navigation menu is open.

<details>
  <summary><strong>Show screenshot</strong></summary>

  ![Quick Pause](assets/images/testing/quick.png)  
  *Quick pause button.*

</details>

<br>

---

### HUD (Heads-Up Display)

The HUD shows:
- Score  
- Best score  
- Level  
- Lives  

Players can collapse or expand the HUD at any time during gameplay,
and the layout adjusts automatically for small screens.

<details>
  <summary><strong>Show screenshot</strong></summary>

  ![HUD screenshot](assets/images/testing/hud.png)  
  *HUD panel and stats.*

</details>

<br>

---

### Feedback Box & Messages

To keep the game readable and rewarding, all important feedback is grouped in a clear feedback box near the target area.  
This box shows:

- Timing grades: **Perfect / Great / Good / Miss**  
- Bonus Mode messages (e.g. `GOOD +10`, `PERFECT +10`)  
- End-of-streak / bonus ended messages  

The feedback box is designed to be:

- **Large and high-contrast**, so players can read it quickly while focusing on the orbs  
- **Consistent across levels**, so players always know where to look  

<details>
  <summary><strong>Show screenshot: Feedback box</strong></summary>

  ![Feedback box showing Miss](assets/images/testing/miss.png)  
  *Feedback box showing  Miss during normal run*

</details>

<br>

---
### Settings Menu

The game includes a full settings system accessible from the navigation menu:
- **Audio**: master volume + mute  
- **Countdown**: choose 0s / 3s / 5s  
- **Accessibility**: Reduce Motion + No Flash  
- **Best Score**: view or reset your high score  
- **Tutorial**: full written guide to gameplay  

Each panel is fully responsive and can be opened at any time while the game is paused.

---

### Accessibility Features

Comfort and accessibility were core goals from day one:
- **Reduce Motion** can tone down animations.  
- **No Flash** can disable intense glow/flash effects.  
- Sound can be adjusted with **Volume** or fully muted with **Mute**.  
- Countdown length can be adjusted.  

You can adjust all this in the settings panel.

<details>
  <summary><strong>Show screenshots: Accessibility Features</strong></summary>

  ![Accessibility panel – default visuals](assets/images/testing/accessibility-before.png)  
  *Accessibility with default visuals before enabling Reduce Motion / No Flash.*

  ![Accessibility settings panel](assets/images/testing/accessibility-visuals.png)  
  *Accessibility settings panel showing Reduce Motion and Disable screen glow and flashes.*

  ![Reduce Motion and No Flash enabled](assets/images/testing/less-motion.png)  
  *Gameplay with Reduce Motion and No Flash enabled – animations and glow are toned down.*

  ![Audio and countdown settings panel](assets/images/testing/countdown-menu.png)  
  *Audio controls and adjustable countdown length (0s, 3s, 5s).*

</details>

<br>

---

### Best Score & Reset Game Data Panel

Shows the highest score achieved on the device.  
Players can reset the high score independently of other progress.

A dedicated button lets players wipe stored game settings, best scores,  
and accessibility preferences, restoring the game to its default state.

<details>
  <summary><strong>Show screenshot</strong></summary>

  ![Reset Score data](assets/images/testing/reset-data.png)  
  *Reset score and game data panel.*

</details>

<br>

---

## Design

The visual design of **Jazz the Cat in the Hat** is inspired by classic neon-arcade games: bold glow, high contrast, and playful “stage” lighting. 
The goal is to make the important gameplay elements stand out instantly — lanes, target line, timing feedback, and score — while still keeping the world fun and full of personality.

- A deep, dark background is used to make neon colours pop without overwhelming the player.  
- The four lanes are designed as a clear “rhythm runway”, so it’s always obvious where to focus.  
- Feedback (Perfect/Great/Good/Miss) is intentionally big and bright, placed close to the target to support fast reactions.  
- Jazz the Cat is a central visual reward — the game is meant to feel lively and humorous.  

### Wireframes

<details>
  <summary>Show screenshot: wireframe</summary>

  ![Wireframe mobile](assets/images/wireframe/wireframe.avif)  
  *Wireframes.*

</details>

### Colour Scheme

The colour palette leans on bright neon tones (pink/purple/cyan) against a dark base. This keeps contrast high and supports readability during fast gameplay, while still matching the arcade theme.

<details>
  <summary>Show screenshot: color scheme</summary>

  ![Color scheme](assets/images/colors.avif)  
  *Color scheme.*

</details>

### Typography

The typography is chosen to reinforce the retro arcade vibe without sacrificing readability:

- **Press Start 2P** is used for HUD labels and key UI elements to create an authentic arcade feel.  
- **VT323** is used for score-related text to keep fast-changing numbers easy to read, especially on smaller screens.  
- A subtle neon text glow supports the theme while keeping UI clear and high-contrast.  

### Layout

The layout is designed so the player never has to “look around” while playing:
- The HUD stays readable and separated from the action.  
- The target line and lane area are visually dominant to guide focus.  
- Overlays (Play/Pause/Results/Game Over) are styled to be clear, bold, and easy to understand in a quick glance.  

---

## Technologies Used

- HTML5  
- CSS3  
- JavaScript (ES modules)  
- Bootstrap 5 (navbar only)  
- Git + GitHub  

---

## Testing

A full detailed testing report including HTML, CSS and JavaScript validation, responsiveness checks, and manual testing is available in a separate document:

➡️ [View full Testing report](TESTING.md)

---

## Deployment & Local Development

### Deployment (GitHub Pages)

This site is deployed using **GitHub Pages**.

**Live site:** <https://gooldenapple.github.io/Jazz-the-Cat-in-the-Hat/>

**Steps to deploy:**
1. Log in (or sign up) to **GitHub**.  
2. Open the repository: **gooldenapple/Jazz-the-Cat-in-the-Hat**.  
3. Go to **Settings → Pages**.  
4. Under **Build and deployment**, set:  
   - **Source:** `Deploy from a branch`  
   - **Branch:** `main`  
   - **Folder:** `/ (root)`  
5. Click **Save**. GitHub Pages will build and publish the site.  
6. When the deployment banner shows success (or in **Actions/Pages**), visit the **Live site** URL.  

Any commit pushed to `main` triggers an automatic redeploy.

### 404 Page

A custom `404.html` is included for GitHub Pages to handle broken links with a clear return path to the homepage (Back to Home) and a visible, clickable homepage URL.

<details>
  <summary><strong>Screenshot: 404 page</strong></summary>

  ![404 page](assets/images/testing/404-page.png)  
  *404 page.*

</details>

### Local Development

To run this project locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/gooldenapple/Jazz-the-Cat-in-the-Hat.git


2. **Navigate into the project folder**
   ```bash
   cd Jazz-the-Cat-in-the-Hat
   ```
3. **Open the site in a browser**
   - Double-click `index.html`, **or**
   - Use a local server (recommended):
     - VS Code: install the *Live Server* extension and click **Go Live**.

This project is an HTML/CSS/JavaScript game — no build steps or extra dependencies are required.
Third-party libraries (Bootstrap, Font Awesome) are loaded via CDN.


### How to Fork

1. Log in (or sign up) to **GitHub**.
2. Go to the original repository: <https://github.com/gooldenapple/Jazz-the-Cat-in-the-Hat>.
3. Click **Fork** (top-right) to create a copy under your GitHub account.


### How to Clone

Clone the project to your local machine. You can clone your fork (recommended if you plan to push changes) or the original repository (read-only).

**Clone your fork (recommended):**

1. On your fork’s page (`<your-username>/Jazz-the-Cat-in-the-Hat`), click **Code**, choose **HTTPS** or **SSH** (or **GitHub CLI**), and copy the clone URL.
2. In your terminal, navigate to the folder where you want the project, then run:
```bash
git clone https://github.com/<your-username>/Jazz-the-Cat-in-the-Hat.git
cd Jazz-the-Cat-in-the-Hat
```
**or clone the original (read-only):**
```bash
git clone https://github.com/gooldenapple/Jazz-the-Cat-in-the-Hat.git
cd Jazz-the-Cat-in-the-Hat
```

---

## Future Improvements

Planned or potential future improvements:

  - Add a sad face to Jazz the Cat on Game Over and confetti rain when a level is cleared.  
  - Make orbs fully controlled by beat and endless levels.  
  - Add more expressive dance moves and fluffier, groovier animations.  
  - Add checkpoints or “resume from level X” options for longer runs.  
  - Further organise and group options in the settings panel.
  - Add additional levels and songs.
  - Add more visual feedback for streaks and Bonus Mode.


---

## Credits
- Music: Kevin MacLeod / Incompetech (CC BY) (list each track + link)
- Any images/icons/fonts used (with source links)

---

## Acknowledgements
- Code Institute
- (Any inspirations / thanks)
