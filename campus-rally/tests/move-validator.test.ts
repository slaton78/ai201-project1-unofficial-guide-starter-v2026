import { describe, expect, it } from 'vitest';

import { findLegalMoves, hasLegalMove, suggestMove, validateSwap } from '@/game/core/MoveValidator';

import { parseBoard } from './helpers';

describe('MoveValidator', () => {
  it('accepts an adjacent swap that produces a match', () => {
    // Swapping (0,2) 'b' with (1,2) 'r' completes a red run on row 0.
    const board = parseBoard(['rrbg', 'gyrb', 'ypgy', 'pgyp']);
    expect(validateSwap(board, { row: 0, col: 2 }, { row: 1, col: 2 })).toEqual({
      ok: true,
      kind: 'match',
    });
  });

  it('rejects non-adjacent and diagonal swaps', () => {
    const board = parseBoard(['rrbr', 'gyrb', 'ypgy', 'pgyp']);
    // (0,2)->(0,3) would be adjacent; (0,1)->(0,3) is two apart.
    expect(validateSwap(board, { row: 0, col: 1 }, { row: 0, col: 3 })).toEqual({
      ok: false,
      reason: 'not-adjacent',
    });
    expect(validateSwap(board, { row: 0, col: 1 }, { row: 1, col: 2 })).toEqual({
      ok: false,
      reason: 'not-adjacent',
    });
    expect(validateSwap(board, { row: 0, col: 0 }, { row: 0, col: 0 })).toEqual({
      ok: false,
      reason: 'not-adjacent',
    });
  });

  it('rejects an adjacent swap that produces no match (the move reverts)', () => {
    const board = parseBoard(['rbyg', 'byrg', 'rgyb', 'gbry']);
    expect(validateSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toEqual({
      ok: false,
      reason: 'no-match',
    });
  });

  it('rejects swaps out of bounds, into empty cells, blocks, or locked tokens', () => {
    const board = parseBoard(['rR#g', 'gy.b', 'ypgy', 'pgyp']);
    expect(validateSwap(board, { row: 0, col: 3 }, { row: 0, col: 4 })).toEqual({
      ok: false,
      reason: 'out-of-bounds',
    });
    expect(validateSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toEqual({
      ok: false,
      reason: 'locked',
    });
    expect(validateSwap(board, { row: 0, col: 3 }, { row: 0, col: 2 })).toEqual({
      ok: false,
      reason: 'empty-cell',
    });
    expect(validateSwap(board, { row: 1, col: 1 }, { row: 1, col: 2 })).toEqual({
      ok: false,
      reason: 'empty-cell',
    });
  });

  it('always allows swapping a Color Rally with a neighbour', () => {
    const board = parseBoard(['rbyg', 'byrg', 'rgyb', 'gbry'], { specials: { '0,0': 'colorRally' } });
    expect(validateSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 })).toEqual({
      ok: true,
      kind: 'special-combo',
    });
  });

  it('allows swapping two specials together', () => {
    const board = parseBoard(['rbyg', 'byrg', 'rgyb', 'gbry'], {
      specials: { '0,0': 'lineRow', '0,1': 'burst' },
    });
    expect(validateSwap(board, { row: 0, col: 0 }, { row: 0, col: 1 }).ok).toBe(true);
  });

  it('lists legal moves and detects dead boards', () => {
    const live = parseBoard(['rrbg', 'gyrb', 'ypgy', 'pgyp']);
    expect(hasLegalMove(live)).toBe(true);
    expect(findLegalMoves(live)).toContainEqual({ from: { row: 0, col: 2 }, to: { row: 1, col: 2 } });
    expect(suggestMove(live)).not.toBeNull();

    const dead = parseBoard(['rbrb', 'gygy', 'rbrb', 'gygy']);
    expect(hasLegalMove(dead)).toBe(false);
    expect(suggestMove(dead)).toBeNull();
  });
});
