import { describe, expect, it } from 'vitest';

import { earnedBadges, newlyEarnedBadges } from '@/content/badges';
import { createDefaultSave } from '@/features/persistence/migrations';
import { dailyPractice } from '@/features/progression/daily';
import {
  applyLevelResult,
  currentLevelId,
  isLevelUnlocked,
  recordAttemptStart,
  recordDailyPractice,
  totalStars,
  visibleStreak,
} from '@/features/progression/progression';

const ORDER = ['level-001', 'level-002', 'level-003'];
const AT = '2026-03-01T12:00:00.000Z';

describe('progression', () => {
  it('only the first level starts unlocked', () => {
    const save = createDefaultSave();
    expect(ORDER.map((id) => isLevelUnlocked(save, id, ORDER))).toEqual([true, false, false]);
    expect(currentLevelId(save, ORDER)).toBe('level-001');
  });

  it('a win completes the level, records stars/score and unlocks the next level', () => {
    const { save, firstCompletion, unlockedLevelId } = applyLevelResult(
      createDefaultSave(),
      { levelId: 'level-001', won: true, score: 2000, stars: 2, at: AT },
      ORDER,
    );
    expect(firstCompletion).toBe(true);
    expect(unlockedLevelId).toBe('level-002');
    expect(save.levelProgressById['level-001']).toMatchObject({
      completed: true,
      stars: 2,
      bestScore: 2000,
      completedAt: AT,
    });
    expect(isLevelUnlocked(save, 'level-002', ORDER)).toBe(true);
    expect(isLevelUnlocked(save, 'level-003', ORDER)).toBe(false);
    expect(currentLevelId(save, ORDER)).toBe('level-002');
  });

  it('replays keep the best stars and score and the first completion date', () => {
    let save = applyLevelResult(
      createDefaultSave(),
      { levelId: 'level-001', won: true, score: 3000, stars: 3, at: AT },
      ORDER,
    ).save;
    const replay = applyLevelResult(
      save,
      { levelId: 'level-001', won: true, score: 1000, stars: 1, at: '2027-01-01T00:00:00Z' },
      ORDER,
    );
    save = replay.save;
    expect(replay.firstCompletion).toBe(false);
    expect(replay.unlockedLevelId).toBeNull();
    expect(save.levelProgressById['level-001']).toMatchObject({ stars: 3, bestScore: 3000, completedAt: AT });
  });

  it('a loss never reduces progress or unlocks anything', () => {
    const won = applyLevelResult(
      createDefaultSave(),
      { levelId: 'level-001', won: true, score: 3000, stars: 3, at: AT },
      ORDER,
    ).save;
    const lost = applyLevelResult(
      won,
      { levelId: 'level-002', won: false, score: 99999, stars: 0, at: AT },
      ORDER,
    );
    expect(lost.save.levelProgressById['level-002']).toMatchObject({
      completed: false,
      stars: 0,
      bestScore: 0,
    });
    expect(lost.unlockedLevelId).toBeNull();
    expect(totalStars(lost.save)).toBe(3);
  });

  it('counts attempts', () => {
    const save = recordAttemptStart(recordAttemptStart(createDefaultSave(), 'level-001'), 'level-001');
    expect(save.levelProgressById['level-001']?.attempts).toBe(2);
  });

  it('awards Fan Badges derived from progress', () => {
    const before = createDefaultSave();
    const after = applyLevelResult(
      before,
      { levelId: 'level-001', won: true, score: 9000, stars: 3, at: AT },
      ORDER,
    ).save;
    expect(earnedBadges(before)).toEqual([]);
    expect(newlyEarnedBadges(before, after).map((b) => b.id)).toEqual(['first-rally', 'hat-trick']);
  });

  it('tracks consecutive-day Daily Practice streaks', () => {
    let save = recordDailyPractice(createDefaultSave(), new Date(2026, 2, 1));
    expect(save.dailyStreak).toBe(1);
    save = recordDailyPractice(save, new Date(2026, 2, 1));
    expect(save.dailyStreak).toBe(1);
    save = recordDailyPractice(save, new Date(2026, 2, 2));
    expect(save.dailyStreak).toBe(2);
    expect(visibleStreak(save, new Date(2026, 2, 3))).toBe(2);
    expect(visibleStreak(save, new Date(2026, 2, 5))).toBe(0);
    save = recordDailyPractice(save, new Date(2026, 2, 5));
    expect(save.dailyStreak).toBe(1);
  });

  it('daily practice is deterministic per date and only uses completed levels', () => {
    const save = applyLevelResult(
      createDefaultSave(),
      { levelId: 'level-002', won: true, score: 1, stars: 1, at: AT },
      ORDER,
    ).save;
    const a = dailyPractice(save, ORDER, new Date(2026, 4, 9));
    const b = dailyPractice(save, ORDER, new Date(2026, 4, 9, 23, 0));
    expect(a).toEqual(b);
    expect(a.levelId).toBe('level-002');
    expect(dailyPractice(createDefaultSave(), ORDER, new Date(2026, 4, 9)).levelId).toBe('level-001');
  });
});
