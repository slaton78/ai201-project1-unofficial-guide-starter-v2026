# Project status — Phase A (foundation)

## Implemented in Phase A

- Expo SDK 57 / React Native 0.86 / TypeScript strict (`noUncheckedIndexedAccess`), Expo Router, Safe Area Context, Zustand, AsyncStorage, expo-status-bar, react-native-svg.
- Navigation shell: startup redirect, onboarding, campus selection, Championship Trail, level placeholder, settings; root error boundary; native splash held until the save loads.
- Onboarding: three slides, Skip and Continue, completion persisted.
- Campus selection: five fictional campuses from `src/content/campuses.ts`, labeled cosmetic and changeable from Settings, persisted.
- Championship Trail shell: ten stops, locked/unlocked and stars read from the save, "Coming Soon" Daily Challenge card, settings access.
- Settings: music, sound effects, haptics, reduce motion, high contrast (all persisted; reduce motion and high contrast already apply to the UI), change campus, reset with confirmation dialog, privacy placeholder, version display.
- Persistence: `GameRepository` interface, `LocalGameRepository` (single JSON document, serialized writes, corrupt-data backup), versioned saves (schema v2) with a v1 → v2 migration and field-level repair.
- Theme: standard and high-contrast palettes, minimum text sizes, capped Dynamic Type scaling, 48pt touch targets.
- Tooling: ESLint (Expo flat config + import order + purity guard), Prettier, Vitest (23 tests), GitHub Actions CI.
- Docs: README, architecture, ADR-001, backend roadmap, content authoring, QA checklist, asset attribution, this file. `.env.example` with blank values.

## Deliberately not in Phase A

Phaser, WebView, game core/mechanics, levels, boosters, win/loss screens, audio, haptics output, analytics, error-reporting services, Supabase, payments, push notifications.

## Placeholder content

- App icon, splash, logo, campus emblems and onboarding illustration are simple original vector placeholders.
- Campus names, colors and rally cries are placeholder fictional identities.
- Music, sound effects and haptics toggles are stored but have no effect until Phase D.
- The trail is a styled vertical path, not illustrated map art.

## Requires Supabase setup (future)

Nothing is set up. Tables, row-level security, Edge Function validation and sync are only designed (`docs/backend-roadmap.md`).

## Requires App Store / Google Play setup (future)

Developer accounts, real bundle identifiers (currently `com.example.campusrally`), signing, EAS project and builds, store listings, age rating, privacy labels / data-safety form, privacy policy URL.

## Before a public beta

Phases B–D (gameplay, content, quality), device QA on iOS and Android, final art and audio, trademark/IP clearance for the name and campus identities, playtesting, privacy policy and consent, then optional backend and analytics.
