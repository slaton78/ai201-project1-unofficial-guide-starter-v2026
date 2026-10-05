import type { GameSave, LevelProgress } from '@/types/save';

/**
 * Read-side progression helpers used by the Championship Trail shell. They only interpret the
 * save; recording wins, stars and unlocks is added together with gameplay in a later phase.
 */
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

export function totalStars(save: GameSave): number {
  return Object.values(save.levelProgressById).reduce((sum, p) => sum + p.stars, 0);
}

export function completedCount(save: GameSave): number {
  return Object.values(save.levelProgressById).filter((p) => p.completed).length;
}
