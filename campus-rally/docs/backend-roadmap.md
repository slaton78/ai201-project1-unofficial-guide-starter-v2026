# Backend roadmap (future — nothing here is implemented or configured)

The MVP is **local-only**. No Supabase project, PostHog project, or Sentry project exists for this app. `SupabaseGameRepository` is a stub whose methods reject. This document is the plan.

## Principles

- **Local-first**: the game must stay fully playable offline. Remote sync is additive.
- The client only ever holds the **publishable (anon) key**. The **service-role key never ships in the app**; `src/lib/env.ts` refuses keys that look like service-role/secret keys.
- **The server is the authority for progression.** Clients submit attempts; an Edge Function validates and writes progress.
- Collect the minimum data needed (see the analytics taxonomy in `architecture.md`).

## Planned tables (Postgres)

```sql
-- One row per auth user (anonymous sign-in first, upgradeable later).
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  selected_campus_id text not null default 'aurora-foxes',
  onboarding_completed boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table levels (
  id text primary key,                       -- 'level-001'
  chapter_id text not null,
  level_number int not null unique,
  definition jsonb not null,                 -- validated against the same schema as src/game/core/level.ts
  version int not null default 1,
  published boolean not null default false
);

create table player_progress (
  user_id uuid references profiles(id) on delete cascade,
  level_id text references levels(id),
  unlocked boolean not null default false,
  completed boolean not null default false,
  stars smallint not null default 0 check (stars between 0 and 3),
  best_score int not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  primary key (user_id, level_id)
);

create table level_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  level_id text references levels(id),
  level_version int not null,
  seed bigint not null,
  moves jsonb not null,                      -- ordered swaps/booster uses, for server replay
  claimed_score int not null,
  verified_score int,
  result text check (result in ('won','lost','abandoned','rejected')),
  client_version text,
  created_at timestamptz not null default now()
);

create table daily_challenges (
  challenge_date date primary key,
  level_id text references levels(id),
  seed bigint not null,
  modifiers jsonb not null default '{}'::jsonb
);

create table event_configuration (           -- remote config / feature flags
  key text primary key,
  value jsonb not null,
  starts_at timestamptz,
  ends_at timestamptz,
  audience jsonb not null default '{}'::jsonb
);
```

## Row-level security

- Enable RLS on every table.
- `profiles`: `select/update` where `id = auth.uid()`; insert via trigger on sign-up.
- `player_progress`, `level_attempts`: clients may **select their own rows only**. No client `insert/update` policies — writes happen inside the Edge Function with the service role (server-side only).
- `levels`, `daily_challenges`, `event_configuration`: `select` for authenticated users where published/active; writes only from the dashboard/CI.

## Server-side validation (Edge Function `submit-level-attempt`)

1. Authenticate the caller (JWT), rate-limit per user.
2. Load the level definition + version from `levels`.
3. **Replay** the submitted seed and move list with the same `src/game/core` package (it is pure TypeScript and runs in Deno). Reject illegal moves, mismatched scores, impossible move counts, or stale level versions.
4. Insert the attempt with `verified_score`, then upsert `player_progress` (best stars/score, unlock next level) in one transaction.
5. Return the authoritative progress; the client reconciles its local save.

To support replay, the client will need to record `{seed, moves[]}` per attempt (the `GameSession` API already takes a seed and is deterministic).

## Client integration steps

1. `npx expo install @supabase/supabase-js` and use AsyncStorage for the auth session.
2. Implement `SupabaseGameRepository` (load → profiles + player_progress; save → queue attempts to the Edge Function).
3. Add a `SyncingGameRepository` that writes locally first and syncs in the background, resolving conflicts by max(stars/best score) and server truth for unlocks.
4. Map `GameSave` ↔ tables (the local types already mirror these columns).

## Analytics, crash reporting, flags

- **PostHog**: install `posthog-react-native`, implement `AnalyticsClient` in `src/services/analytics.ts` only when `EXPO_PUBLIC_POSTHOG_KEY` is set and the player has consented. Disable autocapture and session replay; send only the typed events.
- **Sentry**: install `@sentry/react-native` with its Expo config plugin; implement `ErrorReporter`. Scrub breadcrumbs; no PII.
- **Feature flags**: read from `event_configuration` (or PostHog flags) with local defaults so the game works offline.
- **Push notifications / RevenueCat**: interfaces exist in `src/services/notifications.ts` and `purchases.ts`. Neither is implemented; any future purchases must be cosmetic only, never chance-based.
