import type { BoardState, Cell, Position, Token } from './types';

/** Mutable grid used while computing a new board. Never exposed outside the core. */
export type MutableGrid = Cell[][];

export const EMPTY_CELL: Cell = { token: null, obstacle: null, rallyTile: false };

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function samePos(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Position, b: Position): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function inBounds(board: Pick<BoardState, 'width' | 'height'>, pos: Position): boolean {
  return pos.row >= 0 && pos.row < board.height && pos.col >= 0 && pos.col < board.width;
}

export function getCell(board: BoardState, pos: Position): Cell {
  const cell = board.cells[pos.row]?.[pos.col];
  if (!cell) throw new RangeError(`Position ${posKey(pos)} is outside the board`);
  return cell;
}

export function getToken(board: BoardState, pos: Position): Token | null {
  return inBounds(board, pos) ? getCell(board, pos).token : null;
}

/** Tokens that take part in color matches. Color Rally specials are "colorless". */
export function isMatchable(token: Token | null): token is Token {
  return token !== null && token.special !== 'colorRally';
}

export function orthogonalNeighbors(board: BoardState, pos: Position): Position[] {
  return [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ].filter((p) => inBounds(board, p));
}

export function toGrid(board: BoardState): MutableGrid {
  return board.cells.map((row) => row.slice());
}

export function fromGrid(width: number, height: number, grid: MutableGrid): BoardState {
  return { width, height, cells: grid };
}

export function gridCell(grid: MutableGrid, pos: Position): Cell {
  const cell = grid[pos.row]?.[pos.col];
  if (!cell) throw new RangeError(`Position ${posKey(pos)} is outside the grid`);
  return cell;
}

export function setGridCell(grid: MutableGrid, pos: Position, cell: Cell): void {
  const row = grid[pos.row];
  if (!row || pos.col < 0 || pos.col >= row.length) {
    throw new RangeError(`Position ${posKey(pos)} is outside the grid`);
  }
  row[pos.col] = cell;
}

export function createEmptyBoard(width: number, height: number): BoardState {
  const cells = Array.from({ length: height }, () => Array.from({ length: width }, () => EMPTY_CELL));
  return { width, height, cells };
}

/** Returns a new board with the tokens at `a` and `b` exchanged. Obstacles and tiles stay put. */
export function swapTokens(board: BoardState, a: Position, b: Position): BoardState {
  const grid = toGrid(board);
  const cellA = gridCell(grid, a);
  const cellB = gridCell(grid, b);
  setGridCell(grid, a, { ...cellA, token: cellB.token });
  setGridCell(grid, b, { ...cellB, token: cellA.token });
  return fromGrid(board.width, board.height, grid);
}

export function allPositions(board: Pick<BoardState, 'width' | 'height'>): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) positions.push({ row, col });
  }
  return positions;
}

export interface BoardCounts {
  rallyTiles: number;
  penaltyBlocks: number;
  lockedTokens: number;
  tokens: number;
}

export function countBoard(board: BoardState): BoardCounts {
  const counts: BoardCounts = { rallyTiles: 0, penaltyBlocks: 0, lockedTokens: 0, tokens: 0 };
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.rallyTile) counts.rallyTiles += 1;
      if (cell.obstacle) counts.penaltyBlocks += 1;
      if (cell.token) {
        counts.tokens += 1;
        if (cell.token.locked) counts.lockedTokens += 1;
      }
    }
  }
  return counts;
}
