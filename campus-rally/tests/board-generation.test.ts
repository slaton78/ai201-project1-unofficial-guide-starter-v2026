import { describe, expect, it } from 'vitest';

import { countBoard } from '@/game/core/Board';
import { generateBoard, reshuffleBoard } from '@/game/core/BoardGenerator';
import { hasAnyMatch } from '@/game/core/MatchFinder';
import { hasLegalMove } from '@/game/core/MoveValidator';
import type { TokenColor } from '@/game/core/types';

import { makeLevel, testFactory } from './helpers';

const PALETTES: TokenColor[][] = [
  ['red', 'blue', 'gold', 'green'],
  ['red', 'blue', 'gold', 'green', 'purple'],
  ['red', 'blue', 'gold', 'green', 'purple', 'orange'],
];

const LAYOUT = [
  'TT....TT',
  'T.#..%.T',
  '..LL....',
  '...KK...',
  '........',
  '.#....#.',
  'T......T',
  'TT....TT',
];

describe('Board generation', () => {
  it.each(PALETTES)('never starts with a match and always has a legal move (%#)', (...colors) => {
    const level = makeLevel({ tokenTypes: colors });
    for (let seed = 1; seed <= 60; seed += 1) {
      const board = generateBoard(level, testFactory(seed, colors));
      expect(hasAnyMatch(board)).toBe(false);
      expect(hasLegalMove(board)).toBe(true);
      expect(board.cells.flat().every((cell) => cell.token && colors.includes(cell.token.color))).toBe(true);
    }
  });

  it('honours the level layout for blocks, locked tokens and Rally Tiles', () => {
    const level = makeLevel({ board: { width: 8, height: 8, layout: LAYOUT } });
    for (let seed = 1; seed <= 20; seed += 1) {
      const board = generateBoard(level, testFactory(seed));
      expect(hasAnyMatch(board)).toBe(false);
      expect(hasLegalMove(board)).toBe(true);
      expect(countBoard(board)).toEqual({ rallyTiles: 14, penaltyBlocks: 4, lockedTokens: 4, tokens: 60 });
      expect(board.cells[1]?.[2]?.obstacle).toEqual({ kind: 'penaltyBlock', hits: 1 });
      expect(board.cells[1]?.[5]?.obstacle).toEqual({ kind: 'penaltyBlock', hits: 2 });
      expect(board.cells[3]?.[3]?.token?.locked).toBe(true);
      expect(board.cells[3]?.[3]?.rallyTile).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    const level = makeLevel();
    const a = generateBoard(level, testFactory(42));
    const b = generateBoard(level, testFactory(42));
    expect(a).toEqual(b);
  });

  it('reshuffles into a match-free playable board, keeping token ids', () => {
    const level = makeLevel({ board: { width: 8, height: 8, layout: LAYOUT } });
    const factory = testFactory(7);
    const board = generateBoard(level, factory);
    const shuffled = reshuffleBoard(board, factory);
    expect(hasAnyMatch(shuffled)).toBe(false);
    expect(hasLegalMove(shuffled)).toBe(true);
    const ids = (b: typeof board) => b.cells.flat().map((c) => c.token?.id ?? null);
    expect(ids(shuffled)).toEqual(ids(board));
    expect(countBoard(shuffled)).toEqual(countBoard(board));
  });
});
