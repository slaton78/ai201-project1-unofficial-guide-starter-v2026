# Campus Rally

> **Match. Rally. Build your campus legacy.**

An original, portrait-mode match-three puzzle game for iOS and Android, built with Expo, React Native and TypeScript. Players pick a fictional campus fan identity and advance along the Championship Trail.

_Not affiliated with, endorsed by, or depicting any real school, league, conference, team, or athlete. All campuses and art are original._

**Current state: Phase A (foundation).** Onboarding, campus selection, the Championship Trail shell, settings, and versioned local persistence work. Gameplay is not built yet; trail stops open a placeholder. See [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Requirements

- Node 20.19+ (22 recommended, see `.nvmrc`) and npm 10+
- To run on a device: the Expo Go app; or Xcode (iOS Simulator) / Android Studio (emulator)

## Commands

Run everything from the `campus-rally/` folder.

```bash
npm install            # install dependencies
npx expo start         # dev server; press i (iOS), a (Android), w (web), or scan the QR code with Expo Go
npm run lint           # ESLint, zero warnings allowed
npm run format:check   # Prettier check (npm run format to fix)
npm run typecheck      # TypeScript strict, no emit
npm test               # Vitest unit tests
npm run validate       # all four checks above, as CI runs them
```

No accounts, API keys or network services are needed. `.env` is optional and nothing reads it yet.

CI (`.github/workflows/ci.yml` at the repository root) runs install, lint, format check, type-check and tests on every push and pull request that touches `campus-rally/`.

## Project layout

```
app/                    Expo Router screens: index, onboarding, campus-select, trail, level/[id], settings
src/components/         Accessible UI kit (text, buttons, icons, emblems, dialogs, setting rows)
src/content/            campuses.ts (fictional identities), trail.ts (Championship Trail stops)
src/features/           onboarding (slides), persistence (save migrations), progression (unlock rules)
src/repositories/       GameRepository interface + LocalGameRepository (AsyncStorage)
src/store/              Zustand store
src/theme/              Palettes (standard, high contrast), spacing, type scale
src/types/              Save data types
tests/                  Vitest suites
docs/                   Architecture, ADR, backend roadmap, content authoring, QA checklist, asset attribution
scripts/                generate-icons.mjs (regenerates the original placeholder icons)
```

## Documentation

- [Architecture](docs/architecture.md)
- [ADR-001: Phaser in a WebView](docs/adr-001-phaser-webview.md) (accepted design for Phase B)
- [Backend roadmap](docs/backend-roadmap.md)
- [Content authoring](docs/content-authoring.md)
- [QA checklist](docs/qa-checklist.md)
- [Asset attribution](docs/asset-attribution.md)
- [Project status](PROJECT_STATUS.md)

## Security notes

- Only `EXPO_PUBLIC_*` variables may be used in the client, and they are public. Never put a Supabase service-role or secret key in this app.
- `.env` is git-ignored; only `.env.example` (blank values) is committed.
