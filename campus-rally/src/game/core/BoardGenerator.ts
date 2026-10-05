import { fromGrid, gridCell, isMatchable, setGridCell } from './Board';
import type { MutableGrid } from './Board';
import { layoutCell } from './level';
import type { LevelDefinition } from './level';
import { hasAnyMatch } from './MatchFinder';
import { hasLegalMove } from './MoveValidator';
import type { TokenFactory } from './TokenFactory';
import type { BoardState, Position, TokenColor } from './types';

const MAX_ATTEMPTS = 250;

/** Colors that would complete a run of three with the two cells to the left or above. */
export function colorsThatWouldMatch(grid: MutableGrid, pos: Position): Set<TokenColor> {
  const avoid = new Set<TokenColor>();
  const check = (a: Position, b: Position): void => {
    const ta = grid[a.row]?.[a.col]?.token ?? null;
    const tb = grid[b.row]?.[b.col]?.token ?? null;
    if (isMatchable(ta) && isMatchable(tb) && ta.color === tb.color) avoid.add(ta.color);
  };
  check({ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col - 2 });
  check({ row: pos.row - 1, col: pos.col }, { row: pos.row - 2, col: pos.col });
  // Also look right/below so recoloring an already-filled board stays match-free.
  check({ row: pos.row, col: pos.col + 1 }, { row: pos.row, col: pos.col + 2 });
  check({ row: pos.row + 1, col: pos.col }, { row: pos.row + 2, col: pos.col });
  check({ row: pos.row, col: pos.col - 1 }, { row: pos.row, col: pos.col + 1 });
  check({ row: pos.row - 1, col: pos.col }, { row: pos.row + 1, col: pos.col });
  return avoid;
}

function fillOnce(level: LevelDefinition, factory: TokenFactory): BoardState {
  const { width, height } = level.board;
  const grid: MutableGrid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ token: null, obstacle: null, rallyTile: false })),
  );
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const pos = { row, col };
      const spec = layoutCell(level, row, col);
      if (spec.blockHits > 0) {
        setGridCell(grid, pos, {
          token: null,
          obstacle: { kind: 'penaltyBlock', hits: spec.blockHits },
          rallyTile: false,
        });
        continue;
      }
      const token = factory.random(colorsThatWouldMatch(grid, pos), { locked: spec.locked });
      setGridCell(grid, pos, { token, obstacle: null, rallyTile: spec.rallyTile });
    }
  }
  return fromGrid(width, height, grid);
}

/**
 * Generates a starting board that (1) honours the level layout, (2) contains no automatic
 * matches, and (3) has at least one legal move.
 */
export function generateBoard(level: LevelDefinition, factory: TokenFactory): BoardState {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const board = fillOnce(level, factory);
    if (!hasAnyMatch(board) && hasLegalMove(board)) return board;
  }
  throw new Error(`Could not generate a playable board for ${level.id}`);
}

/**
 * Re-colors regular, unlocked tokens in place (ids are kept so the renderer can animate)
 * until the board has no matches and at least one legal move. Specials, locked tokens,
 * obstacles and Rally Tiles are untouched.
 */
export function reshuffleBoard(board: BoardState, factory: TokenFactory): BoardState {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const grid: MutableGrid = board.cells.map((row) => row.slice());
    for (let row = 0; row < board.height; row += 1) {
      for (let col = 0; col < board.width; col += 1) {
        const pos = { row, col };
        const cell = gridCell(grid, pos);
        if (!cell.token || cell.token.locked || cell.token.special !== null) continue;
        // Clear first so the avoidance check only sees already-decided neighbours.
        setGridCell(grid, pos, { ...cell, token: null });
        const token = factory.recolor(cell.token, colorsThatWouldMatch(grid, pos));
        setGridCell(grid, pos, { ...cell, token });
      }
    }
    const candidate = fromGrid(board.width, board.height, grid);
    if (!hasAnyMatch(candidate) && hasLegalMove(candidate)) return candidate;
  }
  throw new Error('Could not reshuffle the board into a playable state');
}
