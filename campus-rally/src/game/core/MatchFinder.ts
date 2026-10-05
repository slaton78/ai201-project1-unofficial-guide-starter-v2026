import { getCell, isMatchable, posKey } from './Board';
import type { BoardState, MatchGroup, MatchShape, Position, SpecialKind, TokenColor } from './types';

interface Run {
  readonly color: TokenColor;
  readonly cells: Position[];
  readonly direction: 'horizontal' | 'vertical';
}

function scanRuns(board: BoardState, direction: Run['direction']): Run[] {
  const runs: Run[] = [];
  const outer = direction === 'horizontal' ? board.height : board.width;
  const inner = direction === 'horizontal' ? board.width : board.height;

  for (let o = 0; o < outer; o += 1) {
    let current: Position[] = [];
    let currentColor: TokenColor | null = null;
    const flush = (): void => {
      if (currentColor !== null && current.length >= 3) {
        runs.push({ color: currentColor, cells: current, direction });
      }
    };
    for (let i = 0; i < inner; i += 1) {
      const pos: Position = direction === 'horizontal' ? { row: o, col: i } : { row: i, col: o };
      const token = getCell(board, pos).token;
      if (isMatchable(token) && token.color === currentColor) {
        current.push(pos);
      } else {
        flush();
        current = isMatchable(token) ? [pos] : [];
        currentColor = isMatchable(token) ? token.color : null;
      }
    }
    flush();
  }
  return runs;
}

/**
 * Finds every match on the board. Runs (≥3 in a row horizontally or vertically) that share a
 * cell are merged into a single group, which is how T- and L-shapes are detected.
 */
export function findMatches(board: BoardState): MatchGroup[] {
  const runs = [...scanRuns(board, 'horizontal'), ...scanRuns(board, 'vertical')];
  if (runs.length === 0) return [];

  // Union-find over runs that share at least one cell.
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root] as number;
    parent[i] = root;
    return root;
  };
  const owner = new Map<string, number>();
  runs.forEach((run, index) => {
    for (const cell of run.cells) {
      const key = posKey(cell);
      const existing = owner.get(key);
      if (existing === undefined) owner.set(key, index);
      else parent[find(index)] = find(existing);
    }
  });

  const grouped = new Map<number, Run[]>();
  runs.forEach((run, index) => {
    const root = find(index);
    grouped.set(root, [...(grouped.get(root) ?? []), run]);
  });

  return [...grouped.values()].map((groupRuns) => buildGroup(groupRuns));
}

function buildGroup(groupRuns: Run[]): MatchGroup {
  const seen = new Map<string, Position>();
  for (const run of groupRuns) for (const cell of run.cells) seen.set(posKey(cell), cell);
  const horizontalLength = Math.max(
    0,
    ...groupRuns.filter((r) => r.direction === 'horizontal').map((r) => r.cells.length),
  );
  const verticalLength = Math.max(
    0,
    ...groupRuns.filter((r) => r.direction === 'vertical').map((r) => r.cells.length),
  );
  const longest = Math.max(horizontalLength, verticalLength);
  let shape: MatchShape;
  if (longest >= 5) shape = 'line5';
  else if (horizontalLength >= 3 && verticalLength >= 3) shape = 'cross';
  else if (longest === 4) shape = 'line4';
  else shape = 'line3';

  const first = groupRuns[0];
  if (!first) throw new Error('Match group without runs');
  return {
    color: first.color,
    cells: [...seen.values()],
    shape,
    horizontalLength,
    verticalLength,
  };
}

export function hasAnyMatch(board: BoardState): boolean {
  return findMatches(board).length > 0;
}

/**
 * Documented combo rule (see docs/architecture.md):
 * - 5+ in a straight line            → Color Rally
 * - T or L shape (3+ across and down) → Campus Burst
 * - exactly 4 in a line               → Line Rally (horizontal match clears a row,
 *                                        vertical match clears a column)
 * - 3 in a line                       → no special
 */
export function specialForMatch(group: MatchGroup): SpecialKind | null {
  switch (group.shape) {
    case 'line5':
      return 'colorRally';
    case 'cross':
      return 'burst';
    case 'line4':
      return group.horizontalLength === 4 ? 'lineRow' : 'lineColumn';
    case 'line3':
      return null;
  }
}

/**
 * Picks the cell where a created special appears: the swapped cell if it is part of the match,
 * otherwise the intersection of a T/L, otherwise the middle of the run.
 */
export function placementForMatch(group: MatchGroup, preferred: readonly Position[]): Position {
  const keys = new Set(group.cells.map(posKey));
  const hint = preferred.find((p) => keys.has(posKey(p)));
  if (hint) return hint;
  if (group.shape === 'cross') {
    const rows = new Map<number, number>();
    const cols = new Map<number, number>();
    for (const c of group.cells) {
      rows.set(c.row, (rows.get(c.row) ?? 0) + 1);
      cols.set(c.col, (cols.get(c.col) ?? 0) + 1);
    }
    const intersection = group.cells.find((c) => (rows.get(c.row) ?? 0) >= 3 && (cols.get(c.col) ?? 0) >= 3);
    if (intersection) return intersection;
  }
  const sorted = [...group.cells].sort((a, b) => a.row - b.row || a.col - b.col);
  const middle = sorted[Math.floor(sorted.length / 2)];
  if (!middle) throw new Error('Empty match group');
  return middle;
}
