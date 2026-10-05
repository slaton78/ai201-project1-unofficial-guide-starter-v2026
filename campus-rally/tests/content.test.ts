import { describe, expect, it } from 'vitest';

import { CAMPUSES } from '@/content/campuses';
import { LEVEL_ORDER, LEVELS } from '@/content/levels';
import { countBoard } from '@/game/core/Board';
import { generateBoard } from '@/game/core/BoardGenerator';
import { GameSession } from '@/game/core/GameSession';
import { createRng } from '@/game/core/random';
import { TokenFactory } from '@/game/core/TokenFactory';

describe('level content', () => {
  it('has ten sequential, schema-valid levels', () => {
    expect(LEVELS).toHaveLength(10);
    LEVELS.forEach((level, i) => {
      expect(level.levelNumber).toBe(i + 1);
      expect(level.id).toBe(`level-${String(i + 1).padStart(3, '0')}`);
    });
    expect(new Set(LEVEL_ORDER).size).toBe(10);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    '%s has achievable objectives and playable boards',
    (_id, level) => {
      const board = generateBoard(level, new TokenFactory(createRng(1), level.tokenTypes));
      const counts = countBoard(board);
      for (const objective of level.objectives) {
        if (objective.type === 'clearRallyTiles')
          expect(objective.target).toBeLessThanOrEqual(counts.rallyTiles);
        if (objective.type === 'clearPenaltyBlocks')
          expect(objective.target).toBeLessThanOrEqual(counts.penaltyBlocks);
        if (objective.type === 'unlockTokens')
          expect(objective.target).toBeLessThanOrEqual(counts.lockedTokens);
        if (objective.type === 'reachScore')
          expect(objective.target).toBeLessThanOrEqual(level.starThresholds[0]);
      }
      for (let seed = 1; seed <= 10; seed += 1) {
        expect(new GameSession(level, seed).hint()).not.toBeNull();
      }
    },
  );

  it('follows the suggested difficulty curve and booster unlocks', () => {
    const byNumber = (n: number) => LEVELS[n - 1]!;
    expect(byNumber(1).objectives[0]).toEqual({ type: 'makeMatches', target: 5 });
    expect(byNumber(1).moveLimit).toBe(12);
    expect(byNumber(2).objectives[0]).toEqual({ type: 'clearRallyTiles', target: 20 });
    expect(byNumber(3).objectives[0]).toEqual({ type: 'reachScore', target: 1500 });
    expect(byNumber(4).objectives[0]).toEqual({ type: 'clearPenaltyBlocks', target: 8 });
    expect(byNumber(5).boosters.unlocked).toContain('lineRally');
    expect(byNumber(6).objectives[0]).toEqual({ type: 'collectTokens', color: 'green', target: 18 });
    expect(byNumber(7).objectives[0]?.type).toBe('unlockTokens');
    expect(byNumber(8).objectives).toHaveLength(2);
    expect(byNumber(9).boosters.unlocked).toContain('campusBurst');
    expect(byNumber(10).title).toBe('Rivalry Rush');
    expect(byNumber(10).objectives).toHaveLength(2);
    expect(LEVELS.slice(0, 3).every((l) => l.tutorial)).toBe(true);
  });
});

describe('campus content', () => {
  it('defines five unique fictional campuses with readable colors', () => {
    expect(CAMPUSES).toHaveLength(5);
    expect(new Set(CAMPUSES.map((c) => c.id)).size).toBe(5);
    for (const campus of CAMPUSES) {
      expect(campus.colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(campus.colors.secondary).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
