/**
 * Local save model. Versioned via `schemaVersion`; see `src/features/persistence/migrations.ts`.
 * Shapes intentionally mirror the future Supabase tables in docs/backend-roadmap.md.
 */

export interface PlayerSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  reduceMotionEnabled: boolean;
  highContrastEnabled: boolean;
}

export interface PlayerProfile {
  /** Random, device-local identifier. Not tied to any personal information. */
  id: string;
  displayName?: string;
  selectedCampusId: string | null;
  onboardingCompleted: boolean;
  /** ISO-8601 timestamp. */
  createdAt: string;
  settings: PlayerSettings;
}

export interface LevelProgress {
  levelId: string;
  unlocked: boolean;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  attempts: number;
  /** ISO-8601 timestamp of the first completion. */
  completedAt?: string;
}

export interface GameSave {
  schemaVersion: number;
  playerProfile: PlayerProfile;
  levelProgressById: Record<string, LevelProgress>;
  dailyStreak: number;
  /** Local calendar date (YYYY-MM-DD) of the last completed Daily Practice. */
  lastDailyChallengeDate?: string;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  hapticsEnabled: true,
  reduceMotionEnabled: false,
  highContrastEnabled: false,
};
