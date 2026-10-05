# Campus Rally — Architecture

## Overview

```
┌──────────────────────── React Native (Expo Router) ────────────────────────┐
│ app/ screens ─▶ Zustand store (src/store) ─▶ GameRepository (src/repositories)│
│      │                                         └─ LocalGameRepository → AsyncStorage
│      │ services/: analytics · errorReporting · haptics · audio (no-op safe)     │
│      ▼                                                                          │
│ GameContainer (WebView / web iframe) ◀── typed bridge (protocol.ts, zod) ──┐    │
└──────────────────────────────────────────────────────────────────────────┼────┘
                                                                           │ JSON strings
┌──────────────────────── WebView: inline HTML bundle ──────────────────────┼────┐
│ runtime/main.ts → GameController (validates messages, owns GameSession) ◀─┘    │
│                    └─ BoardScene (Phaser 3: drawing, input, tweens)            │
└────────────────────────────────────────────────────────────────────────────────┘
        both sides import ▶ src/game/core (pure TypeScript rules, fully unit-tested)
```

## Folder map

| Path                            | Responsibility                                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`                          | Expo Router screens: `index` (startup redirect), `onboarding`, `campus-select`, `trail`, `level/[id]` (pre-game), `play/[id]` (game), `win`, `loss`, `settings`.                                                                                  |
| `src/game/core/`                | Framework-agnostic rules: `Board`, `BoardGenerator`, `MatchFinder`, `MoveValidator`, `CascadeResolver`, `LevelEvaluator`, `GameSession`, `TokenFactory`, `level` (schema), `scoring`, `random`. ESLint forbids React/RN/Expo/Phaser imports here. |
| `src/game/shared/`              | Art geometry and callout copy shared by Phaser and RN (still framework-free).                                                                                                                                                                     |
| `src/game/phaser/`              | `bridge/` (protocol + RN hook), `runtime/` (WebView entry, controller, transport), `scenes/` (BoardScene, procedural textures, tweens), `GameContainer(.web).tsx`, `generated/` (build output, git-ignored).                                      |
| `src/features/`                 | Feature logic + UI: `persistence` (migrations), `progression` (unlocks, stars, daily practice), `play` (HUD pieces), `settings` (applying settings to services).                                                                                  |
| `src/content/`                  | Data only: `campuses.ts`, `levels/*.json`, `badges.ts`, `boosters.ts`.                                                                                                                                                                            |
| `src/repositories/`             | `GameRepository` interface, `LocalGameRepository`, `SupabaseGameRepository` (stub).                                                                                                                                                               |
| `src/services/`                 | Analytics, error reporting, haptics, audio, future notifications/purchases interfaces.                                                                                                                                                            |
| `src/store/`                    | Zustand store: in-memory save + actions that persist through the repository.                                                                                                                                                                      |
| `src/theme/`, `src/components/` | Palettes (standard + high contrast), type scale, shared accessible components.                                                                                                                                                                    |

## Game rules (core)

- **Board**: 8×8 (levels may use 5–10), row-major, `cells[row][col]`. A cell holds a token _or_ a Penalty Block, plus an optional Rally Tile flag.
- **Generation**: fills left→right, top→bottom avoiding colors that complete a run of three; retries until there is no match and at least one legal move. Deterministic per seed (mulberry32).
- **Swaps**: orthogonally adjacent, both cells hold unlocked tokens, and the swap creates a match that includes a swapped cell — or one token is a Color Rally, or both are specials. Anything else is rejected with a reason and the renderer animates a revert; no move is spent.
- **Matching**: horizontal and vertical runs ≥ 3 of the same type; runs sharing a cell are merged (union-find), which is how T/L shapes are detected. Color Rally tokens are colorless and never match by color.
- **Cascades**: each wave clears matches and forced clears → triggers specials (chaining) → damages blocks → unlocks locked tokens → clears Rally Tiles → places new specials → gravity → refill. Repeats until stable (hard cap 40 waves). If no legal move remains, regular tokens are re-colored in place (ids kept).
- **Gravity**: per column, split into segments by Penalty Blocks. Tokens never pass a block; empty cells at the top of each segment are refilled in place.
- **Obstacles**: a Penalty Block takes one hit per wave from any orthogonally adjacent match, or from a special/booster area covering it. Double blocks need two hits. Locked Tokens can't be swapped; the first clear that touches them unlocks them instead of removing them. Locked tokens do fall with gravity.

### Combo rules (documented special creation)

| Match                                         | Creates                                                                   | Effect when cleared                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4 in a line                                   | **Line Rally** (horizontal match → clears its row; vertical → its column) | Clears the full row/column                                                                                                                                |
| T or L (3+ across and 3+ down sharing a cell) | **Campus Burst** at the intersection                                      | Clears the 3×3 area                                                                                                                                       |
| 5+ in a line                                  | **Color Rally**                                                           | Swapped with a token: clears every token of that type. Swapped with another Color Rally: clears the board. Caught in a blast: clears its own stored type. |

The special appears on the cell the player moved, otherwise the T/L intersection, otherwise the middle of the run. Levels unlock booster families progressively (`boosters.unlocked`); a locked family downgrades (`colorRally → burst → line → none`, `burst → line → none`).

Tray boosters (granted per level, never sold) target a token: Line Rally clears its row, Campus Burst its 3×3 area, Color Rally every token of its type. Tray boosters do not cost a move.

### Scoring (`src/game/core/scoring.ts`)

Per wave: 60/token, 150/special created, 100/special triggered, 80/block hit, 40/Rally Tile, 60/unlock, multiplied by `1 + 0.5 × waveIndex`. Winning adds a **Rally Bonus** of 150 per unused move. Stars: any win = ★, then thresholds from the level JSON for ★★ and ★★★.

### Objectives (`LevelEvaluator`)

`makeMatches` (player-made matches only; cascades don't count), `clearRallyTiles`, `reachScore`, `clearPenaltyBlocks` (destroyed blocks), `collectTokens` (by type), `unlockTokens`. Win when all are complete after a move fully resolves; loss when moves hit 0 with any incomplete.

## Rendering

`BoardScene` draws every texture procedurally at the current cell size (`textures.ts`), so nothing is blurry and no image files ship. It keeps a map of token id → sprite container and animates each `CascadeStep` (clear → pop specials → falls/spawns). After every move it **rebuilds from the authoritative board**, so the view can't drift from the rules. Reduce Motion halves durations and removes bounces, sparks, shakes, and pulsing hints.

## State and persistence

- The Zustand store holds the whole `GameSave` in memory; each action computes a new save with pure functions (`features/progression`) and awaits `repository.save()` (writes are serialized).
- `LevelProgress` writes for a win are awaited **before** the win screen opens.
- `features/persistence/migrations.ts` versions saves (`schemaVersion`, currently 2) with a registry of `N → N+1` migrations, then sanitizes field-by-field so a partly corrupt save keeps its valid data. Unparseable JSON is backed up under `campus-rally/save.corrupt`.

## Analytics taxonomy (`src/services/analytics.ts`)

All events go through a typed `track(event, props)`; the default client is a no-op (logs in dev). No names, contacts, location, device ids, or free text are collected.

| Event                  | Properties                                                             |
| ---------------------- | ---------------------------------------------------------------------- |
| `app_opened`           | `first_launch`                                                         |
| `onboarding_started`   | —                                                                      |
| `onboarding_completed` | `skipped`                                                              |
| `campus_selected`      | `campus_id`, `source` (`onboarding`/`settings`)                        |
| `trail_viewed`         | `levels_completed`, `total_stars`                                      |
| `level_selected`       | `level_id`, `mode`                                                     |
| `level_started`        | `level_id`, `attempt`, `mode` (`trail`/`daily`)                        |
| `level_restarted`      | `level_id`, `moves_used`                                               |
| `level_failed`         | `level_id`, `score`, `moves_used`, `objectives_completed`              |
| `level_completed`      | `level_id`, `score`, `stars`, `moves_used`, `first_completion`, `mode` |
| `booster_used`         | `level_id`, `booster`                                                  |
| `objective_completed`  | `level_id`, `objective_type`                                           |
| `tutorial_hint_shown`  | `level_id`, `hint_kind` (`tip`/`suggested_move`)                       |
| `settings_changed`     | `setting`, `enabled`                                                   |
| `local_data_reset`     | —                                                                      |

## Accessibility

- Every token type has a unique **shape** plus an inner bevel of the same shape; Penalty Blocks show remaining hits as pips; locks use a padlock + cross; Rally Tiles have an outline. Nothing relies on color alone.
- High-contrast mode (black/white/yellow, thicker outlines) applies to RN screens and live to the board.
- Text uses `AppText` with OS font scaling enabled (capped at 1.6× to keep layouts intact); minimum body size 17pt, captions 14pt.
- All controls have roles/labels/hints; switches expose checked state; objectives, moves, and score are announced as text; objective completion and hints use `announceForAccessibility`.
- Instructions are always available as text (pre-game Tips card and in-game tip banner).
- Known limitation: the board itself is a canvas and is not screen-reader playable (see PROJECT_STATUS.md).
