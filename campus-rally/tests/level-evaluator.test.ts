import { describe, expect, it } from 'vitest';

import type { ObjectiveDefinition } from '@/game/core/level';
import {
  applyStepsToObjectives,
  describeObjective,
  evaluateLevel,
  initialObjectiveProgress,
  starsForScore,
} from '@/game/core/LevelEvaluator';
import type { CascadeStep, Token } from '@/game/core/types';

const token = (color: Token['color'], special: Token['special'] = null): Token => ({
  id: Math.floor(Math.random() * 1e9),
  color,
  special,
  locked: false,
});

function step(partial: Partial<CascadeStep>): CascadeStep {
  return {
    index: 0,
    matches: [],
    cleared: [],
    unlocked: [],
    obstacleHits: [],
    rallyTilesCleared: [],
    specialsCreated: [],
    specialsTriggered: [],
    falls: [],
    spawns: [],
    scoreDelta: 0,
    boardAfter: { width: 0, height: 0, cells: [] },
    ...partial,
  };
}

const p = { row: 0, col: 0 };
const OBJECTIVES: ObjectiveDefinition[] = [
  { type: 'makeMatches', target: 2 },
  { type: 'clearRallyTiles', target: 3 },
  { type: 'clearPenaltyBlocks', target: 1 },
  { type: 'collectTokens', color: 'green', target: 2 },
  { type: 'unlockTokens', target: 1 },
  { type: 'reachScore', target: 500 },
];

describe('LevelEvaluator', () => {
  it('accumulates objective progress from cascade steps', () => {
    const progress = applyStepsToObjectives(
      initialObjectiveProgress(OBJECTIVES),
      [
        step({
          matches: [
            { color: 'green', cells: [p, p, p], shape: 'line3', horizontalLength: 3, verticalLength: 0 },
          ],
          cleared: [
            { pos: p, token: token('green'), cause: 'match' },
            { pos: p, token: token('green', 'colorRally'), cause: 'special' },
            { pos: p, token: token('red'), cause: 'match' },
          ],
          rallyTilesCleared: [p, p],
          obstacleHits: [
            { pos: p, remaining: 1 },
            { pos: p, remaining: 0 },
          ],
          unlocked: [p],
        }),
      ],
      300,
    );
    expect(progress.map((o) => o.current)).toEqual([1, 2, 1, 1, 1, 300]);
    expect(progress.map((o) => o.completed)).toEqual([false, false, true, false, true, false]);
  });

  it('counts only player-made matches toward "make matches", not cascades', () => {
    const group = {
      color: 'red' as const,
      cells: [],
      shape: 'line3' as const,
      horizontalLength: 3,
      verticalLength: 0,
    };
    const [matches] = applyStepsToObjectives(
      initialObjectiveProgress([{ type: 'makeMatches', target: 5 }]),
      [step({ index: 0, matches: [group] }), step({ index: 1, matches: [group, group] })],
      0,
    );
    expect(matches?.current).toBe(1);
  });

  it('clamps progress at the target', () => {
    const [matches] = applyStepsToObjectives(
      initialObjectiveProgress([{ type: 'makeMatches', target: 1 }]),
      [
        step({
          matches: [{ color: 'red', cells: [], shape: 'line3', horizontalLength: 3, verticalLength: 0 }],
        }),
        step({
          matches: [{ color: 'red', cells: [], shape: 'line3', horizontalLength: 3, verticalLength: 0 }],
        }),
      ],
      0,
    );
    expect(matches?.current).toBe(1);
    expect(matches?.completed).toBe(true);
  });

  it('wins when every objective is complete, even on the last move', () => {
    const objectives = applyStepsToObjectives(
      initialObjectiveProgress([{ type: 'reachScore', target: 100 }]),
      [],
      150,
    );
    expect(
      evaluateLevel({ objectives, movesRemaining: 0, score: 150, starThresholds: [100, 200, 300] }),
    ).toEqual({
      status: 'won',
      stars: 1,
    });
  });

  it('loses when moves run out with objectives incomplete', () => {
    const objectives = initialObjectiveProgress([{ type: 'makeMatches', target: 5 }]);
    expect(evaluateLevel({ objectives, movesRemaining: 0, score: 9999, starThresholds: [1, 2, 3] })).toEqual({
      status: 'lost',
      stars: 0,
    });
    expect(evaluateLevel({ objectives, movesRemaining: 3, score: 0, starThresholds: [1, 2, 3] }).status).toBe(
      'playing',
    );
  });

  it('awards stars from score thresholds, minimum one on a win', () => {
    expect(starsForScore(50, [100, 200, 300], true)).toBe(1);
    expect(starsForScore(200, [100, 200, 300], true)).toBe(2);
    expect(starsForScore(999, [100, 200, 300], true)).toBe(3);
    expect(starsForScore(999, [100, 200, 300], false)).toBe(0);
  });

  it('describes objectives in plain language that names the token shape', () => {
    expect(describeObjective({ type: 'collectTokens', color: 'green', target: 18 })).toBe(
      'Collect 18 Victory Green (triangle)',
    );
    expect(describeObjective({ type: 'reachScore', target: 1500 })).toBe('Earn 1,500 points');
  });
});
