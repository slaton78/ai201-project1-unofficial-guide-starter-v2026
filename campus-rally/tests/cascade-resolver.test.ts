import { describe, expect, it } from 'vitest';

import { allowedSpecial, resolveCascades } from '@/game/core/CascadeResolver';
import { findMatches, hasAnyMatch } from '@/game/core/MatchFinder';
import type { BoosterType } from '@/game/core/types';

import { cyclingFactory, parseBoard, printBoard } from './helpers';

const ALL: ReadonlySet<BoosterType> = new Set(['lineRally', 'campusBurst', 'colorRally']);
const NONE: ReadonlySet<BoosterType> = new Set();

function resolve(rows: string[], opts: Partial<Parameters<typeof resolveCascades>[1]> = {}, parse = {}) {
  return resolveCascades(parseBoard(rows, parse), {
    factory: cyclingFactory(),
    allowedBoosters: ALL,
    ...opts,
  });
}

describe('CascadeResolver', () => {
  it('clears a match, refills the board, and reports one step', () => {
    const { steps, board } = resolve(['rrrb', 'gyby', 'bgyg', 'ybgb']);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.cleared).toHaveLength(3);
    expect(steps[0]?.spawns).toHaveLength(3);
    expect(steps[0]?.scoreDelta).toBe(180);
    expect(printBoard(board)).toEqual(['popb', 'gyby', 'bgyg', 'ybgb']);
    expect(hasAnyMatch(board)).toBe(false);
  });

  it('resolves cascades until the board is stable, with a rising multiplier', () => {
    const { steps, board } = resolve(['gbyo', 'rybg', 'rboy', 'rggb']);
    expect(steps).toHaveLength(2);
    expect(steps[0]?.matches[0]?.color).toBe('red');
    expect(steps[1]?.matches[0]?.color).toBe('green');
    expect(steps[1]?.index).toBe(1);
    expect(steps[1]?.scoreDelta).toBe(270); // 3 tokens × 60 × 1.5
    expect(findMatches(board)).toEqual([]);
    expect(board.cells.flat().every((cell) => cell.token !== null)).toBe(true);
  });

  it('records falls for tokens above the cleared cells', () => {
    const { steps } = resolve(['gbyo', 'rybg', 'rboy', 'rggb']);
    expect(steps[0]?.falls).toContainEqual(
      expect.objectContaining({ from: { row: 0, col: 0 }, to: { row: 3, col: 0 } }),
    );
  });

  describe('obstacles', () => {
    it('clears a Penalty Block next to a match and lets tokens fall into its cell', () => {
      const { steps, board } = resolve(['gbyo', 'rrr#', 'byog', 'yogb']);
      expect(steps[0]?.obstacleHits).toEqual([{ pos: { row: 1, col: 3 }, remaining: 0 }]);
      expect(board.cells[1]?.[3]?.obstacle).toBeNull();
      expect(board.cells[1]?.[3]?.token?.color).toBe('orange');
    });

    it('needs two separate clears for a Double Penalty Block', () => {
      const first = resolve(['gbyo', 'rrr%', 'byog', 'yogb']);
      expect(first.steps[0]?.obstacleHits).toEqual([{ pos: { row: 1, col: 3 }, remaining: 1 }]);
      expect(first.board.cells[1]?.[3]?.obstacle?.hits).toBe(1);
    });

    it('does not damage blocks that are not adjacent to the match', () => {
      const { steps, board } = resolve(['rrrb', 'gyby', 'bgyg', 'ybg#']);
      expect(steps[0]?.obstacleHits).toEqual([]);
      expect(board.cells[3]?.[3]?.obstacle?.hits).toBe(1);
    });

    it('stops gravity at blocks and refills the segment below from the block', () => {
      const before = parseBoard(['gbyo', 'p%og', 'rrrb', 'byog']);
      const aboveId = before.cells[0]?.[1]?.token?.id;
      const { steps, board } = resolveCascades(before, {
        factory: cyclingFactory(),
        allowedBoosters: NONE,
      });
      expect(board.cells[0]?.[1]?.token?.id).toBe(aboveId);
      expect(board.cells[1]?.[1]?.obstacle?.hits).toBe(1);
      expect(steps[0]?.spawns.map((s) => s.pos)).toContainEqual({ row: 2, col: 1 });
      expect(printBoard(board)).toEqual(['pbpo', 'g#yg', 'poob', 'byog']);
      expect(hasAnyMatch(board)).toBe(false);
    });

    it('unlocks a Locked Token on the first match instead of clearing it', () => {
      const before = parseBoard(['gbyo', 'rRrb', 'byog', 'yogb']);
      const lockedId = before.cells[1]?.[1]?.token?.id;
      const { steps, board } = resolveCascades(before, {
        factory: cyclingFactory(),
        allowedBoosters: NONE,
      });
      expect(steps[0]?.unlocked).toEqual([{ row: 1, col: 1 }]);
      expect(steps[0]?.cleared).toHaveLength(2);
      const token = board.cells[1]?.[1]?.token;
      expect(token?.id).toBe(lockedId);
      expect(token?.locked).toBe(false);
    });

    it('clears Rally Tiles under cleared tokens', () => {
      const { steps, board } = resolve(
        ['rrrb', 'gyby', 'bgyg', 'ybgb'],
        {},
        {
          rallyTiles: ['TT.T', '....', '....', '....'],
        },
      );
      expect(steps[0]?.rallyTilesCleared).toHaveLength(2);
      expect(board.cells[0]?.[0]?.rallyTile).toBe(false);
      expect(board.cells[0]?.[3]?.rallyTile).toBe(true);
    });
  });

  describe('specials', () => {
    it('creates a Line Rally at the swapped cell for a match of four', () => {
      const { steps, board } = resolve(['bbbb', 'rgyp', 'gypr', 'yprg'], {
        swapHint: [{ row: 0, col: 3 }],
      });
      expect(steps[0]?.specialsCreated).toHaveLength(1);
      expect(steps[0]?.specialsCreated[0]?.pos).toEqual({ row: 0, col: 3 });
      expect(board.cells[0]?.[3]?.token?.special).toBe('lineRow');
      expect(board.cells[0]?.[3]?.token?.color).toBe('blue');
    });

    it('creates nothing when the level has not unlocked boosters', () => {
      const { steps } = resolve(['bbbb', 'rgyp', 'gypr', 'yprg'], { allowedBoosters: NONE });
      expect(steps[0]?.specialsCreated).toEqual([]);
    });

    it('downgrades a five-match to a Line Rally when only Line Rally is unlocked', () => {
      const [group] = findMatches(parseBoard(['ggggg', 'rbypo', 'bypor', 'yporb', 'porby']));
      expect(allowedSpecial('colorRally', group!, new Set<BoosterType>(['lineRally']))).toBe('lineRow');
      expect(allowedSpecial('colorRally', group!, new Set<BoosterType>(['campusBurst']))).toBe('burst');
    });

    it('triggers a Line Rally caught in a match and clears the whole row', () => {
      const { steps } = resolve(['gbyo', 'rrrp', 'byog', 'yogb'], {}, { specials: { '1,1': 'lineRow' } });
      expect(steps[0]?.specialsTriggered).toEqual([{ pos: { row: 1, col: 1 }, kind: 'lineRow' }]);
      expect(steps[0]?.cleared).toHaveLength(4);
    });

    it('triggers a Campus Burst over a 3x3 area, hitting blocks inside it', () => {
      const { steps } = resolve(['gbyo', 'rrr#', 'byog', 'yogb'], {}, { specials: { '1,2': 'burst' } });
      const clearedKeys = steps[0]?.cleared.map((c) => `${c.pos.row},${c.pos.col}`).sort();
      expect(clearedKeys).toEqual(['0,1', '0,2', '0,3', '1,0', '1,1', '1,2', '2,1', '2,2', '2,3']);
      expect(steps[0]?.obstacleHits).toEqual([{ pos: { row: 1, col: 3 }, remaining: 0 }]);
    });

    it('applies forced booster clears even without a match', () => {
      const { steps, board } = resolve(['rbyg', 'byrg', 'rgyb', 'gbry'], {
        initialClears: [0, 1, 2, 3].map((col) => ({ pos: { row: 2, col }, cause: 'booster' as const })),
      });
      expect(steps[0]?.cleared).toHaveLength(4);
      expect(steps[0]?.cleared.every((c) => c.cause === 'booster')).toBe(true);
      expect(hasAnyMatch(board)).toBe(false);
    });
  });
});
