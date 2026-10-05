import { describe, expect, it } from 'vitest';

import { createDefaultSave } from '@/features/persistence/migrations';
import {
  completedCount,
  currentLevelId,
  getProgress,
  isLevelUnlocked,
  totalStars,
} from '@/features/progression/progression';
import type { GameSave, LevelProgress } from '@/types/save';

const ORDER = ['level-001', 'level-002', 'level-003'];

function withProgress(...entries: Partial<LevelProgress>[]): GameSave {
  const save = createDefaultSave();
  for (const entry of entries) {
    const levelId = entry.levelId as string;
    save.levelProgressById[levelId] = { ...getProgress(save, levelId), ...entry, levelId };
  }
  return save;
}

describe('progression (read side)', () => {
  it('only the first level starts unlocked', () => {
    const save = createDefaultSave();
    expect(ORDER.map((id) => isLevelUnlocked(save, id, ORDER))).toEqual([true, false, false]);
    expect(currentLevelId(save, ORDER)).toBe('level-001');
  });

  it('completing a level unlocks the next one', () => {
    const save = withProgress({ levelId: 'level-001', completed: true, stars: 2 });
    expect(ORDER.map((id) => isLevelUnlocked(save, id, ORDER))).toEqual([true, true, false]);
    expect(currentLevelId(save, ORDER)).toBe('level-002');
  });

  it('respects an explicit unlocked flag', () => {
    const save = withProgress({ levelId: 'level-003', unlocked: true });
    expect(isLevelUnlocked(save, 'level-003', ORDER)).toBe(true);
  });

  it('rejects unknown level ids', () => {
    expect(isLevelUnlocked(createDefaultSave(), 'level-999', ORDER)).toBe(false);
  });

  it('points at the last level when everything is complete', () => {
    const save = withProgress(...ORDER.map((levelId) => ({ levelId, completed: true, stars: 3 as const })));
    expect(currentLevelId(save, ORDER)).toBe('level-003');
    expect(totalStars(save)).toBe(9);
    expect(completedCount(save)).toBe(3);
  });

  it('returns empty progress for unplayed levels', () => {
    expect(getProgress(createDefaultSave(), 'level-002')).toEqual({
      levelId: 'level-002',
      unlocked: false,
      completed: false,
      stars: 0,
      bestScore: 0,
      attempts: 0,
    });
  });
});
