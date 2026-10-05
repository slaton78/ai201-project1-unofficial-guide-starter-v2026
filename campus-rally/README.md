# Campus Rally

> **Match. Rally. Build your campus legacy.**

An original, portrait-mode match-three puzzle game for iOS and Android, built with Expo + React Native, with the board rendered by Phaser 3 inside a WebView. Players pick a fictional campus fan identity, clear puzzle boards, earn stars and Fan Badges, and advance along the Championship Trail.

_Not affiliated with, endorsed by, or depicting any real school, league, conference, team, or athlete. All campuses, art and audio are original._

## Quick start

Requirements: Node 20.19+ (22 recommended, see `.nvmrc`), npm 10+. For devices: the Expo Go app, or Xcode / Android Studio simulators.

```bash
cd campus-rally
npm install          # also builds the Phaser WebView bundle (postinstall)
npx expo start       # then press i (iOS), a (Android), or scan the QR code with Expo Go
```

No accounts, API keys, or network services are needed. `.env` is optional — copy `.env.example` only if you are wiring future services.

Web preview (for quick UI checks; the board runs in a sandboxed iframe): `npx expo start --web`.

## Scripts

| Command                            | What it does                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm start`                        | Expo dev server                                                                                 |
| `npm run build:game`               | Rebuilds `src/game/phaser/generated/gameHtml.ts` (run after editing anything under `src/game`)  |
| `npm run lint`                     | ESLint (Expo config + import order + architecture guard), zero warnings allowed                 |
| `npm run format` / `format:check`  | Prettier                                                                                        |
| `npm run typecheck`                | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`)                                             |
| `npm test`                         | Vitest unit tests (rules engine, bridge protocol, controller, migrations, progression, content) |
| `npm run validate`                 | lint + format check + typecheck + tests (what CI runs)                                          |
| `npm run simulate:levels [-- 100]` | Bot plays every level; prints win rates and score percentiles for tuning                        |
| `npm run generate:assets`          | Regenerates the original audio and (with `CHROME_PATH`) icon placeholders                       |

CI (`.github/workflows/ci.yml` at the repository root) runs install, lint, format check, type-check and tests on every push and pull request touching `campus-rally/`.

## How to play

Swipe a token into a neighbor (or tap one, then the next) to line up 3+ of the same shape. Each level has goals and a move limit. Matching 4 makes a **Line Rally**, a T or L makes a **Campus Burst**, and 5 in a row makes a **Color Rally**. **Penalty Blocks** break when you match next to them; **Locked Tokens** unlock when matched; **Rally Tiles** clear when the token on top is matched. Unused moves become a **Rally Bonus**.

## Project layout

```
app/                 Expo Router screens (startup, onboarding, campus-select, trail, level/[id], play/[id], win, loss, settings)
src/game/core/       Pure TypeScript match-three rules (shared by app + WebView, fully unit-tested)
src/game/phaser/     WebView host, typed bridge, Phaser scene, build output
src/features/        persistence (migrations), progression, play HUD, settings
src/content/         campuses.ts, levels/level-001…010.json, badges, boosters
src/repositories/    GameRepository, LocalGameRepository, SupabaseGameRepository (stub)
src/services/        analytics, errorReporting, haptics, audio, notifications/purchases interfaces
src/store/           Zustand store
tests/               Vitest suites
docs/                architecture, ADR, backend roadmap, content authoring, QA, assets
scripts/             build-game, simulate-levels, generate-audio, generate-icons
```

## Documentation

- [Architecture](docs/architecture.md): structure, rules, combo rules, scoring, analytics taxonomy, accessibility
- [ADR-001: Phaser in a WebView](docs/adr-001-phaser-webview.md): why, and how the message bridge works
- [Backend roadmap](docs/backend-roadmap.md): Supabase tables, RLS, Edge Function validation, PostHog/Sentry plans
- [Content authoring](docs/content-authoring.md): level JSON format, layout legend, difficulty curve
- [QA checklist](docs/qa-checklist.md)
- [Asset attribution](docs/asset-attribution.md)
- [Project status](PROJECT_STATUS.md): what's done, what's placeholder, what's needed before beta

## Security notes

- Only `EXPO_PUBLIC_*` keys are read, and they are public by nature. Never put a Supabase service-role key in the app; `src/lib/env.ts` refuses keys that look like one.
- The WebView loads only an inline document with a strict CSP, cannot navigate, has no file or storage access, and every bridge message is schema-validated.
