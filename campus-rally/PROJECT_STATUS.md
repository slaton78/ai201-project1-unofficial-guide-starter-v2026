# Project status — Campus Rally MVP (v0.1.0)

## Fully implemented

- Expo SDK 57 / React Native 0.86 app, TypeScript strict, Expo Router navigation, safe-area aware portrait layouts.
- Screens: startup redirect, 3-slide onboarding (Skip/Continue, persisted), campus selection (5 fictional campuses, cosmetic, changeable), Championship Trail (10 levels, lock/unlock, stars, Daily Practice card), pre-game, game, win, loss, settings (music, SFX, haptics, reduce motion, high contrast, change campus, reset with confirmation, privacy note, version).
- Framework-agnostic rules engine: board generation (no initial matches, ≥ 1 legal move, seeded), adjacent-swap validation with revert, match detection incl. T/L, cascades until stable, gravity with blocking obstacles, refill, reshuffle on dead boards, scoring, objectives, win/loss, stars.
- Obstacles: Penalty Block, Double Penalty Block, Locked Token, plus Rally Tiles.
- Boosters: Line Rally, Campus Burst, Color Rally — created by combos (progressively unlocked per level) and granted free per level in the tray. Never sold.
- 10 JSON-driven levels following the requested curve, schema-validated, with tutorial tips (levels 1–3 and later introductions) and idle move hints.
- Phaser 3 renderer in a locked-down WebView (sandboxed iframe on web), typed + validated bidirectional bridge with every required message.
- Local persistence via a repository interface, save versioning with migrations and field-level repair, serialized writes; a first win is saved before the win screen appears.
- Fan Badges and a local Daily Practice (date-seeded board of an already-completed level) with a streak.
- Accessibility: shape-coded tokens, high-contrast theme (applied live to the board), reduce motion, scalable text, labels/roles/states, screen-reader announcements, text instructions.
- Typed analytics and error-reporting wrappers with documented no-op behavior; notification and purchase interfaces only.
- 99 unit tests; ESLint, Prettier, `tsc` clean; GitHub Actions CI.

### Verified in this environment

- `npm run lint`, `format:check`, `typecheck`, `test` all pass.
- `expo export` succeeds for **web, iOS and Android** (Hermes bundles compile).
- The Phaser bundle and full app were driven in headless Chromium (web build, 390×844 and 320×568): onboarding → campus → trail → Level 1 played to a win by real drag input → Level 2 unlocked → progress survived reload → pause/settings/high contrast → reset. Game-side and Node-side sessions with the same seed produced identical scores. No console errors.

### Not verified here (needs a device)

- Running on physical iOS/Android devices or simulators (no simulator in this environment). WebView behavior, haptics, audio playback, safe areas on notched devices, and performance on low-end Android must be checked with `docs/qa-checklist.md`.

## Placeholder art and audio

- All visuals (icon, splash, logo, campus emblems, tokens, blocks, effects) are simple original vector/procedural placeholders.
- All sounds and the music loop are synthesized placeholders (`scripts/generate-audio.mjs`).
- Campus names/colors are placeholder fictional identities (`src/content/campuses.ts`).
- Trail map is a styled vertical path, not illustrated art. Level `theme.backdrop` is stored but not yet rendered.

## Requires Supabase setup (not done — no project exists)

- `SupabaseGameRepository` is a stub that rejects every call. Auth, tables, RLS, Edge Function score validation, server-driven daily challenges and remote config are designed in `docs/backend-roadmap.md` only.
- Client attempt recording (`seed` + move list) for server replay is not yet captured.

## Requires App Store / Google Play setup

- Apple Developer and Google Play Console accounts, real bundle identifiers (currently placeholder `com.example.campusrally`), signing, EAS project (`eas init`, `eas build`), store listings, screenshots, age rating, privacy nutrition label / data safety form, privacy policy URL.
- The current dependencies are standard Expo modules expected to run in Expo Go (not yet confirmed on a device); store releases need EAS production builds.

## Before a public beta

1. Device QA on a matrix of iOS and Android phones, including low-end Android performance profiling (consider a custom smaller Phaser build — the inline bundle is ~1.7 MB).
2. Final art, audio, and a professional trademark/IP clearance of the name "Campus Rally" and all campus identities.
3. Human playtesting to tune difficulty (simulation bot numbers are floors), first-time-user test of the < 60 s comprehension goal.
4. Screen-reader playable board alternative (currently the canvas board is not operable with VoiceOver/TalkBack; the HUD is).
5. Privacy policy, consent flow, then real PostHog/Sentry integrations behind the existing wrappers.
6. Supabase backend with server-side progression validation if cross-device progress or leaderboards are added.
7. Handle WebView process loss more gracefully (currently the level restarts).
8. Localization (copy is English-only and inline).
