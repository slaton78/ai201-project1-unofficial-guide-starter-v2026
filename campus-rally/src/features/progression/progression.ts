import type { GameSave, LevelProgress } from '@/types/save';

export interface LevelResult {
  levelId: string;
  won: boolean;
  score: number;
  stars: 0 | 1 | 2 | 3;
  /** ISO timestamp used for first-completion bookkeeping. */
  at: string;
}

export function emptyProgress(levelId: string, unlocked = false): LevelProgress {
  return { levelId, unlocked, completed: false, stars: 0, bestScore: 0, attempts: 0 };
}

export function getProgress(save: GameSave, levelId: string): LevelProgress {
  return save.levelProgressById[levelId] ?? emptyProgress(levelId);
}

/** The first level is always open; every other level opens when the previous one is completed. */
export function isLevelUnlocked(save: GameSave, levelId: string, order: readonly string[]): boolean {
  const index = order.indexOf(levelId);
  if (index < 0) return false;
  if (index === 0) return true;
  if (save.levelProgressById[levelId]?.unlocked) return true;
  const previous = order[index - 1];
  return previous !== undefined && (save.levelProgressById[previous]?.completed ?? false);
}

/** Next level the player should play: the first unlocked level that is not completed. */
export function currentLevelId(save: GameSave, order: readonly string[]): string | undefined {
  return (
    order.find((id) => isLevelUnlocked(save, id, order) && !getProgress(save, id).completed) ??
    order[order.length - 1]
  );
}

export function recordAttemptStart(save: GameSave, levelId: string): GameSave {
  const progress = getProgress(save, levelId);
  return {
    ...save,
    levelProgressById: {
      ...save.levelProgressById,
      [levelId]: { ...progress, unlocked: true, attempts: progress.attempts + 1 },
    },
  };
}

export interface ResultApplication {
  save: GameSave;
  firstCompletion: boolean;
  newBestScore: boolean;
  unlockedLevelId: string | null;
}

/**
 * Applies a finished level. Wins keep the best stars/score ever achieved and unlock the next
 * level; losses never reduce existing progress.
 */
export function applyLevelResult(
  save: GameSave,
  result: LevelResult,
  order: readonly string[],
): ResultApplication {
  const previous = getProgress(save, result.levelId);
  const firstCompletion = result.won && !previous.completed;
  const newBestScore = result.won && result.score > previous.bestScore;
  const updated: LevelProgress = {
    ...previous,
    unlocked: true,
    completed: previous.completed || result.won,
    stars: result.won ? (Math.max(previous.stars, result.stars) as LevelProgress['stars']) : previous.stars,
    bestScore: result.won ? Math.max(previous.bestScore, result.score) : previous.bestScore,
  };
  if (firstCompletion) updated.completedAt = result.at;

  const byId = { ...save.levelProgressById, [result.levelId]: updated };
  let unlockedLevelId: string | null = null;
  const nextId = order[order.indexOf(result.levelId) + 1];
  if (result.won && nextId !== undefined && !(byId[nextId]?.unlocked ?? false)) {
    byId[nextId] = { ...(byId[nextId] ?? emptyProgress(nextId)), unlocked: true };
    unlockedLevelId = nextId;
  }
  return { save: { ...save, levelProgressById: byId }, firstCompletion, newBestScore, unlockedLevelId };
}

export function totalStars(save: GameSave): number {
  return Object.values(save.levelProgressById).reduce((sum, p) => sum + p.stars, 0);
}

export function completedCount(save: GameSave): number {
  return Object.values(save.levelProgressById).filter((p) => p.completed).length;
}

// --- Daily Practice ---------------------------------------------------------------------------

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return localDateKey(new Date(y, m - 1, d - 1));
}

/** A streak counts consecutive local days with a completed Daily Practice. */
export function recordDailyPractice(save: GameSave, today: Date): GameSave {
  const key = localDateKey(today);
  if (save.lastDailyChallengeDate === key) return save;
  const continues = save.lastDailyChallengeDate === previousDateKey(key);
  return { ...save, dailyStreak: continues ? save.dailyStreak + 1 : 1, lastDailyChallengeDate: key };
}

/** Streak shown to the player: resets visually once a day has been missed. */
export function visibleStreak(save: GameSave, today: Date): number {
  const key = localDateKey(today);
  if (save.lastDailyChallengeDate === key || save.lastDailyChallengeDate === previousDateKey(key)) {
    return save.dailyStreak;
  }
  return 0;
}
