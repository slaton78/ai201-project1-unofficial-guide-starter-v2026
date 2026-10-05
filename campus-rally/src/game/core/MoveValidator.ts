import { getCell, inBounds, isAdjacent, posKey, swapTokens } from './Board';
import { findMatches } from './MatchFinder';
import type { BoardState, Position, SwapRejection } from './types';

export interface Move {
  readonly from: Position;
  readonly to: Position;
}

export type SwapValidation =
  | { readonly ok: true; readonly kind: 'match' | 'special-combo' }
  | { readonly ok: false; readonly reason: SwapRejection };

/**
 * Decides whether swapping two cells is a legal player move. Pure: does not modify the board.
 *
 * Legal when the cells are orthogonally adjacent, both hold unlocked tokens, and either
 * - the swap produces at least one match that includes a swapped cell, or
 * - one token is a Color Rally, or both tokens are specials (a "special combo").
 */
export function validateSwap(board: BoardState, a: Position, b: Position): SwapValidation {
  if (!inBounds(board, a) || !inBounds(board, b)) return { ok: false, reason: 'out-of-bounds' };
  if (!isAdjacent(a, b)) return { ok: false, reason: 'not-adjacent' };
  const tokenA = getCell(board, a).token;
  const tokenB = getCell(board, b).token;
  if (!tokenA || !tokenB) return { ok: false, reason: 'empty-cell' };
  if (tokenA.locked || tokenB.locked) return { ok: false, reason: 'locked' };

  if (tokenA.special === 'colorRally' || tokenB.special === 'colorRally') {
    return { ok: true, kind: 'special-combo' };
  }
  if (tokenA.special !== null && tokenB.special !== null) {
    return { ok: true, kind: 'special-combo' };
  }

  const swapped = swapTokens(board, a, b);
  const keys = new Set([posKey(a), posKey(b)]);
  const producesMatch = findMatches(swapped).some((group) =>
    group.cells.some((cell) => keys.has(posKey(cell))),
  );
  return producesMatch ? { ok: true, kind: 'match' } : { ok: false, reason: 'no-match' };
}

/** All legal moves, scanning each cell's right and down neighbor once. */
export function findLegalMoves(board: BoardState, limit = Number.POSITIVE_INFINITY): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const from = { row, col };
      for (const to of [
        { row, col: col + 1 },
        { row: row + 1, col },
      ]) {
        if (validateSwap(board, from, to).ok) {
          moves.push({ from, to });
          if (moves.length >= limit) return moves;
        }
      }
    }
  }
  return moves;
}

export function hasLegalMove(board: BoardState): boolean {
  return findLegalMoves(board, 1).length > 0;
}

/** A move to suggest as a hint: prefers the one that clears the most tokens. */
export function suggestMove(board: BoardState): Move | null {
  let best: Move | null = null;
  let bestSize = -1;
  for (const move of findLegalMoves(board)) {
    const size = findMatches(swapTokens(board, move.from, move.to)).reduce(
      (sum, group) => sum + group.cells.length,
      0,
    );
    if (size > bestSize) {
      best = move;
      bestSize = size;
    }
  }
  return best;
}
