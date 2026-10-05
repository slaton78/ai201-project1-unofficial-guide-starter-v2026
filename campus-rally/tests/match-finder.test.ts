import { describe, expect, it } from 'vitest';

import { findMatches, hasAnyMatch, placementForMatch, specialForMatch } from '@/game/core/MatchFinder';

import { parseBoard } from './helpers';

const sortCells = (cells: readonly { row: number; col: number }[]) =>
  [...cells].sort((a, b) => a.row - b.row || a.col - b.col);

describe('MatchFinder', () => {
  it('detects a horizontal match of three', () => {
    const board = parseBoard(['rrrb', 'bgyp', 'gypb', 'ypbg']);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.color).toBe('red');
    expect(sortCells(matches[0]?.cells ?? [])).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(matches[0]?.shape).toBe('line3');
    expect(specialForMatch(matches[0]!)).toBeNull();
  });

  it('detects a vertical match of three', () => {
    const board = parseBoard(['gbyp', 'gyrp', 'gpyb', 'ypbg']);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.color).toBe('green');
    expect(matches[0]?.verticalLength).toBe(3);
    expect(matches[0]?.horizontalLength).toBe(0);
  });

  it('reports no matches on a stable board', () => {
    const board = parseBoard(['rbyg', 'byrg', 'rgyb', 'gbry']);
    expect(findMatches(board)).toEqual([]);
    expect(hasAnyMatch(board)).toBe(false);
  });

  it('finds multiple independent matches', () => {
    const board = parseBoard(['rrrb', 'gyby', 'pppg', 'ygby']);
    expect(
      findMatches(board)
        .map((m) => m.color)
        .sort(),
    ).toEqual(['purple', 'red']);
  });

  it('creates a row Line Rally from a horizontal match of four', () => {
    const board = parseBoard(['bbbb', 'rgyp', 'gypr', 'yprg']);
    const [group] = findMatches(board);
    expect(group?.shape).toBe('line4');
    expect(specialForMatch(group!)).toBe('lineRow');
  });

  it('creates a column Line Rally from a vertical match of four', () => {
    const board = parseBoard(['bgyp', 'brpy', 'bgyp', 'bpgr']);
    const [group] = findMatches(board);
    expect(group?.shape).toBe('line4');
    expect(specialForMatch(group!)).toBe('lineColumn');
  });

  it('creates a Color Rally from five in a line', () => {
    const board = parseBoard(['ggggg', 'rbypo', 'bypor', 'yporb', 'porby']);
    const [group] = findMatches(board);
    expect(group?.shape).toBe('line5');
    expect(specialForMatch(group!)).toBe('colorRally');
  });

  it('merges a T-shape into one group and creates a Campus Burst at the intersection', () => {
    const board = parseBoard(['yyyb', 'gyrp', 'bypg', 'rgbo']);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    const group = matches[0]!;
    expect(group.shape).toBe('cross');
    expect(group.cells).toHaveLength(5);
    expect(specialForMatch(group)).toBe('burst');
    expect(placementForMatch(group, [])).toEqual({ row: 0, col: 1 });
  });

  it('merges an L-shape into one group and creates a Campus Burst at the corner', () => {
    const board = parseBoard(['pbrg', 'pgyb', 'pppo', 'gyrb']);
    const matches = findMatches(board);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.shape).toBe('cross');
    expect(specialForMatch(matches[0]!)).toBe('burst');
    expect(placementForMatch(matches[0]!, [])).toEqual({ row: 2, col: 0 });
  });

  it('prefers the swapped cell for special placement', () => {
    const board = parseBoard(['bbbb', 'rgyp', 'gypr', 'yprg']);
    const [group] = findMatches(board);
    expect(placementForMatch(group!, [{ row: 0, col: 3 }])).toEqual({ row: 0, col: 3 });
  });

  it('does not match Color Rally tokens by color', () => {
    const board = parseBoard(['rrrb', 'gypo', 'ypog', 'pogy'], { specials: { '0,1': 'colorRally' } });
    expect(findMatches(board)).toEqual([]);
  });

  it('matches locked tokens like normal tokens', () => {
    const board = parseBoard(['rRrb', 'gypo', 'ypog', 'pogy']);
    expect(findMatches(board)).toHaveLength(1);
  });

  it('ignores Penalty Blocks and empty cells inside a run', () => {
    const board = parseBoard(['rr#rr', 'r.rgb', 'gybop', 'ybopg', 'bopgy']);
    expect(findMatches(board)).toEqual([]);
  });
});
