# Campus Rally — Architecture

> Status: **Phase A (foundation)**. Sections marked _Planned_ describe later phases and have no code yet.

## Overview

```
app/ (Expo Router screens)
  │  read state / call actions
  ▼
src/store/gameStore.ts (Zustand, whole GameSave in memory)
  │  pure transforms                      │ persist
  ▼                                       ▼
src/features/progression (read-side)   src/repositories/GameRepository (interface)
src/features/persistence (migrations)    └─ LocalGameRepository → AsyncStorage (one JSON document)
src/content (campuses, trail manifest)
src/theme + src/components (accessible UI kit)
```

## Folder map

| Path                            | Responsibility                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `app/_layout.tsx`               | Root stack, safe-area provider, status bar, one-time save hydration, splash hide, error boundary.                             |
| `app/index.tsx`                 | Startup: shows the brand mark while the save loads, then redirects to onboarding → campus selection → trail.                  |
| `app/onboarding.tsx`            | Three slides with Skip/Continue; completion is persisted.                                                                     |
| `app/campus-select.tsx`         | Pick one of five fictional campuses (cosmetic); reused from Settings via `?from=settings`.                                    |
| `app/trail.tsx`                 | Championship Trail shell: 10 stops, lock/unlock and stars from the save, "Coming Soon" Daily Challenge card, settings access. |
| `app/level/[id].tsx`            | Navigation placeholder for a trail stop until gameplay exists.                                                                |
| `app/settings.tsx`              | Five toggles, change campus, reset with confirmation, privacy note, version.                                                  |
| `src/content/`                  | Data only: `campuses.ts` (fictional identities), `trail.ts` (stop ids/titles).                                                |
| `src/features/onboarding/`      | Slide content and illustrations.                                                                                              |
| `src/features/persistence/`     | Save schema versioning and migrations.                                                                                        |
| `src/features/progression/`     | Pure read-side helpers: unlock rules, current stop, star totals.                                                              |
| `src/repositories/`             | `GameRepository` interface, `LocalGameRepository`, in-memory store for tests, factory.                                        |
| `src/store/`                    | Zustand store with injectable repository.                                                                                     |
| `src/theme/`, `src/components/` | Palettes (standard + high contrast), type scale, shared accessible components.                                                |
| `src/types/save.ts`             | `PlayerProfile`, `PlayerSettings`, `LevelProgress`, `GameSave`.                                                               |
| `src/lib/logger.ts`             | Dev-only error logging (placeholder for a real reporter).                                                                     |

ESLint forbids UI/platform imports in `src/features/persistence`, `src/features/progression` and `src/types`, so those stay testable in plain Node.

## Data model and persistence

`GameSave { schemaVersion, playerProfile, levelProgressById, dailyStreak, lastDailyChallengeDate? }` — see `src/types/save.ts`. The whole save is stored as one JSON document under `campus-rally/save`.

Write path: a store action builds a new save → `set()` updates the UI immediately → `await repository.save()`. `LocalGameRepository` chains writes so they land in call order even when fired concurrently.

### Versioning and migrations (`src/features/persistence/migrations.ts`)

1. Read raw JSON. Unparseable text is copied to `campus-rally/save.corrupt` and a fresh save is used.
2. Determine `schemaVersion` (missing → treated as 1).
3. Apply registered `N → N+1` migrations up to `CURRENT_SCHEMA_VERSION` (currently **2**; the v1 → v2 migration converts the earliest prototype layout).
4. **Sanitize field by field** against the current shape: invalid fields fall back to defaults, invalid level entries are dropped, valid data is kept. A save from a _newer_ app version keeps its known fields.
5. If the version changed, rewrite the save in the current format.

To change the save shape: bump `CURRENT_SCHEMA_VERSION`, add a migration to `MIGRATIONS`, update `sanitize`, and add a test in `tests/save-migration.test.ts`. Never delete old migrations.

## Navigation flow

```
index ──(not onboarded)──▶ onboarding ──▶ campus-select ──▶ trail ──▶ level/[id] (placeholder)
  │──(no campus)──────────────────────────▶ campus-select        └──▶ settings ──▶ campus-select?from=settings
  └──(ready)─────────────────────────────────────────────────▶ trail
settings → Reset → onboarding (stack dismissed)
```

## Accessibility baseline

- `AppText` keeps OS font scaling on (capped at 1.6× to protect layouts); body text 17pt minimum, captions 14pt.
- High-contrast palette (black/white/yellow, 2px borders) switches live from Settings. Reduce Motion disables screen transition animations.
- All interactive elements are ≥ 48pt with roles, labels, hints and states (`radio` for campuses, `switch` with checked state for settings, disabled state + unlock hint for locked trail stops).
- Status is always expressed in text (e.g. "Level 2, Tile Time, locked"; "2 of 3 stars"), never by color alone; locked stops also show a padlock.
- Campus `onPrimary` text colors are tested for WCAG AA contrast.

## Planned (later phases — no code yet)

- **Phase B:** framework-agnostic match-three core (`src/game/core`) with tests; Phaser 3 rendering in a WebView behind a typed message bridge (see `adr-001-phaser-webview.md`); game screen.
- **Phase C:** 10 JSON levels (format in `content-authoring.md`), obstacles, boosters, win/loss, stars and unlocking writes, tutorial hints.
- **Phase D:** haptics and audio services wired to the existing settings, reduce-motion in gameplay, analytics and error-reporting wrappers with no-op defaults, full QA pass.
- **Backend:** see `backend-roadmap.md`.
