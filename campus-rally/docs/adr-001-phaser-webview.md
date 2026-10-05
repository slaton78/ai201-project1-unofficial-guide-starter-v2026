# ADR-001: Run Phaser inside a WebView behind a typed message bridge

- **Status:** Accepted (MVP)
- **Date:** 2026-10-05

## Context

We want a polished, animated 2D board (tweens, particles, texture generation) and React Native for everything else (navigation, accessibility, settings, persistence). Phaser 3 is a mature 2D engine but targets the browser DOM/canvas; it cannot run directly in React Native's JS runtime.

Options considered:

1. **Phaser in a WebView** (chosen).
2. **react-native-skia / Reanimated board**: native performance, but we'd hand-build sprite, tween, and input systems the engine already provides, and the team would learn two rendering stacks.
3. **expo-gl + a Phaser/PIXI shim**: fragile, poorly maintained compatibility layers.
4. **Full web app in a WebView**: loses native navigation, accessibility, haptics, and store-native feel.

## Decision

- All **game rules** live in `src/game/core` as pure TypeScript with no platform imports (enforced by ESLint). They are unit-tested in Node and bundled into both sides.
- The Phaser runtime (`src/game/phaser/runtime/main.ts`) is bundled by `scripts/build-game.mjs` (esbuild) into **one self-contained HTML string** — no CDN, no network, no file access. `GameContainer.tsx` loads it with `source={{ html }}`.
- The WebView is locked down: navigation to anything except the inline document is blocked, file access and multiple windows are disabled, it is incognito with no DOM storage, and the page sets a strict CSP (`default-src 'none'`, inline script only, `connect-src 'none'`).
- On web (preview/testing only) `GameContainer.web.tsx` uses an `<iframe sandbox="allow-scripts">` (opaque origin).

## The message bridge

`src/game/phaser/bridge/protocol.ts` is the single source of truth. Every message is `{ v: 1, type, payload }`, defined as a zod discriminated union, and **validated on receipt on both sides**. Unknown types, wrong versions, extra fields, and messages over 256 KB are rejected; the game replies with `GAME_ERROR`, the app reports to the error reporter. There is no `any` anywhere in message handling.

| React Native → Game                            | Purpose                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `LOAD_LEVEL {level, seed, settings}`           | Validates the level JSON again and builds a `GameSession`. Content stays owned by the app (future: served by the backend). |
| `START_LEVEL`                                  | Enables input; game replies `LEVEL_STARTED {snapshot}`.                                                                    |
| `PAUSE_GAME` / `RESUME_GAME`                   | Freezes tweens, timers and input. Sent on Pause, app backgrounding, Android back.                                          |
| `USE_BOOSTER {booster \| null}`                | Arms (or disarms) a tray booster; the player then taps a target.                                                           |
| `UPDATE_SETTINGS {reduceMotion, highContrast}` | Applied live.                                                                                                              |
| `REQUEST_GAME_STATE {requestId}`               | Game replies `GAME_STATE_RESPONSE`.                                                                                        |
| `RESTART_LEVEL {seed}`                         | New board, same level.                                                                                                     |

| Game → React Native                                                                                      | Purpose                                                                                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GAME_READY {protocolVersion}`                                                                           | Sent once the scene exists. The app sends nothing before this; a reloaded WebView sends it again and the app reloads the level. |
| `LEVEL_STARTED`, `MOVES_CHANGED`, `SCORE_CHANGED`, `OBJECTIVE_PROGRESS_CHANGED`, `BOOSTER_STATE_CHANGED` | Drive the React Native HUD (which is also what screen readers read).                                                            |
| `LEVEL_WON` / `LEVEL_LOST`                                                                               | Final result; the app persists, then navigates.                                                                                 |
| `HAPTIC_EVENT`, `SOUND_EVENT`                                                                            | The game never touches device APIs; RN plays sounds/haptics if the player enabled them.                                         |
| `HINT_SHOWN`                                                                                             | Analytics + accessibility announcements.                                                                                        |
| `GAME_ERROR`                                                                                             | Invalid input or internal failure.                                                                                              |

Transport: RN → game uses `injectJavaScript("window.__campusRallyReceive(<JSON string literal>)")` (deterministic on both platforms); game → RN uses `window.ReactNativeWebView.postMessage(json)`. The game has **no access to React Native state** — it only knows what it has been sent.

## Consequences

- ✅ Rules are testable without a device; the same code could validate results server-side (Edge Function) later.
- ✅ Rich animation for little code; easy to iterate on visuals.
- ⚠️ ~1.7 MB inline HTML (Phaser full build). Acceptable for MVP; a custom Phaser build or tree-shaken renderer can cut it.
- ⚠️ WebView startup adds ~100–300 ms before the board appears; a "Setting up the board…" state covers it.
- ⚠️ The canvas is not screen-reader accessible; the RN HUD provides text equivalents.
- ⚠️ If the OS kills the WebView process, it reloads and the level restarts (documented in the QA checklist).
- Revisit if profiling on low-end Android shows frame drops, or when moving to a native renderer (Skia) — the core rules and protocol shapes carry over unchanged.
