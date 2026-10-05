import { z } from 'zod';

import { DEFAULT_SETTINGS } from '@/types/save';
import type { GameSave, LevelProgress, PlayerProfile } from '@/types/save';

/**
 * Save-data versioning.
 *
 * - Bump CURRENT_SCHEMA_VERSION whenever the persisted shape changes.
 * - Add a migration `N → N+1` to MIGRATIONS that converts the old raw object.
 * - Never delete old migrations: a player may update from any earlier version.
 * - After migrating, the result is sanitized against the current schema so a partially
 *   corrupt save keeps every valid field instead of crashing the app.
 */
export const CURRENT_SCHEMA_VERSION = 2;

type RawSave = Record<string, unknown>;
type Migration = (input: RawSave) => RawSave;

const isRecord = (value: unknown): value is RawSave =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * v1 was the first internal prototype format:
 *   { schemaVersion: 1, profile: { id, campusId, onboarded, createdAt, music, sfx, haptics },
 *     progress: { [levelId]: { stars, bestScore, completed } }, streak }
 * v2 renames fields, adds reduce-motion / high-contrast settings, attempts and unlock state.
 */
const migrateV1toV2: Migration = (input) => {
  const profile = isRecord(input.profile) ? input.profile : {};
  const progress = isRecord(input.progress) ? input.progress : {};
  const levelProgressById: Record<string, unknown> = {};
  for (const [levelId, value] of Object.entries(progress)) {
    if (!isRecord(value)) continue;
    levelProgressById[levelId] = {
      levelId,
      unlocked: true,
      completed: value.completed === true,
      stars: value.stars,
      bestScore: value.bestScore,
      attempts: value.completed === true ? 1 : 0,
    };
  }
  return {
    schemaVersion: 2,
    playerProfile: {
      id: profile.id,
      selectedCampusId: profile.campusId ?? null,
      onboardingCompleted: profile.onboarded === true,
      createdAt: profile.createdAt,
      settings: {
        musicEnabled: profile.music,
        sfxEnabled: profile.sfx,
        hapticsEnabled: profile.haptics,
      },
    },
    levelProgressById,
    dailyStreak: input.streak,
  };
};

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1toV2,
};

// ---------------------------------------------------------------------------------------------
// Lenient current-version schema: every field falls back to a safe default instead of failing.

const bool = (fallback: boolean) => z.boolean().catch(fallback);

const settingsSchema = z
  .object({
    musicEnabled: bool(DEFAULT_SETTINGS.musicEnabled),
    sfxEnabled: bool(DEFAULT_SETTINGS.sfxEnabled),
    hapticsEnabled: bool(DEFAULT_SETTINGS.hapticsEnabled),
    reduceMotionEnabled: bool(DEFAULT_SETTINGS.reduceMotionEnabled),
    highContrastEnabled: bool(DEFAULT_SETTINGS.highContrastEnabled),
  })
  .catch({ ...DEFAULT_SETTINGS });

const levelProgressSchema = z.object({
  levelId: z.string().regex(/^level-\d{3}$/),
  unlocked: bool(false),
  completed: bool(false),
  stars: z
    .number()
    .int()
    .min(0)
    .max(3)
    .catch(0)
    .transform((n) => n as LevelProgress['stars']),
  bestScore: z.number().int().nonnegative().catch(0),
  attempts: z.number().int().nonnegative().catch(0),
  completedAt: z.string().optional().catch(undefined),
});

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function newLocalId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `local-${Date.now().toString(36)}-${random}`;
}

export function createDefaultSave(now: Date = new Date(), id: string = newLocalId()): GameSave {
  const profile: PlayerProfile = {
    id,
    selectedCampusId: null,
    onboardingCompleted: false,
    createdAt: now.toISOString(),
    settings: { ...DEFAULT_SETTINGS },
  };
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    playerProfile: profile,
    levelProgressById: {},
    dailyStreak: 0,
  };
}

function sanitize(raw: RawSave, fallback: GameSave): GameSave {
  const profileRaw = isRecord(raw.playerProfile) ? raw.playerProfile : {};
  const profile: PlayerProfile = {
    id:
      typeof profileRaw.id === 'string' && profileRaw.id.length > 0 && profileRaw.id.length <= 64
        ? profileRaw.id
        : fallback.playerProfile.id,
    selectedCampusId: typeof profileRaw.selectedCampusId === 'string' ? profileRaw.selectedCampusId : null,
    onboardingCompleted: profileRaw.onboardingCompleted === true,
    createdAt:
      typeof profileRaw.createdAt === 'string' && !Number.isNaN(Date.parse(profileRaw.createdAt))
        ? profileRaw.createdAt
        : fallback.playerProfile.createdAt,
    settings: settingsSchema.parse(profileRaw.settings ?? {}),
  };
  if (typeof profileRaw.displayName === 'string' && profileRaw.displayName.length <= 40) {
    profile.displayName = profileRaw.displayName;
  }

  const levelProgressById: Record<string, LevelProgress> = {};
  const progressRaw = isRecord(raw.levelProgressById) ? raw.levelProgressById : {};
  for (const [key, value] of Object.entries(progressRaw)) {
    const parsed = levelProgressSchema.safeParse(isRecord(value) ? { levelId: key, ...value } : value);
    if (parsed.success && parsed.data.levelId === key) {
      const { completedAt, ...rest } = parsed.data;
      levelProgressById[key] = completedAt ? { ...rest, completedAt } : rest;
    }
  }

  const save: GameSave = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    playerProfile: profile,
    levelProgressById,
    dailyStreak:
      typeof raw.dailyStreak === 'number' && Number.isInteger(raw.dailyStreak) && raw.dailyStreak >= 0
        ? raw.dailyStreak
        : 0,
  };
  if (typeof raw.lastDailyChallengeDate === 'string' && isoDate.test(raw.lastDailyChallengeDate)) {
    save.lastDailyChallengeDate = raw.lastDailyChallengeDate;
  }
  return save;
}

export interface MigrationResult {
  save: GameSave;
  /** Version found on disk (0 when there was no usable save). */
  fromVersion: number;
  /** True when the stored data should be rewritten in the current format. */
  changed: boolean;
}

/**
 * Converts any stored value into a valid current-version save. Never throws.
 * Saves from a *newer* app version are sanitized as current (unknown fields dropped) rather
 * than discarded, so a downgrade keeps as much progress as possible.
 */
export function migrateSave(raw: unknown, now: Date = new Date()): MigrationResult {
  const fallback = createDefaultSave(now);
  if (!isRecord(raw)) return { save: fallback, fromVersion: 0, changed: true };

  const fromVersion =
    typeof raw.schemaVersion === 'number' && Number.isInteger(raw.schemaVersion) && raw.schemaVersion > 0
      ? raw.schemaVersion
      : 1;

  let current: RawSave = raw;
  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version += 1) {
    const migrate = MIGRATIONS[version];
    if (!migrate) break;
    current = migrate(current);
  }
  const save = sanitize(current, fallback);
  return { save, fromVersion, changed: fromVersion !== CURRENT_SCHEMA_VERSION };
}
