import { describe, expect, it } from 'vitest';

import { countBoard } from '@/game/core/Board';
import { GameSession } from '@/game/core/GameSession';
import { hasAnyMatch } from '@/game/core/MatchFinder';
import { findLegalMoves, hasLegalMove } from '@/game/core/MoveValidator';
import { createRng } from '@/game/core/random';

import { makeLevel, parseBoard } from './helpers';

const LIVE = ['rrbgpo', 'gyrbog', 'ypgyrb', 'pgypbr', 'obporg', 'bopgyp'];

describe('GameSession', () => {
  it('rejects an invalid swap without using a move or changing the board', () => {
    const session = new GameSession(makeLevel({ moveLimit: 5 }), 1, parseBoard(LIVE));
    const before = session.board;
    const outcome = session.trySwap({ row: 5, col: 0 }, { row: 5, col: 1 });
    expect(outcome).toEqual({ kind: 'rejected', reason: 'no-match' });
    expect(session.board).toBe(before);
    expect(session.snapshot().movesRemaining).toBe(5);
  });

  it('rejects non-adjacent swaps', () => {
    const session = new GameSession(makeLevel(), 1, parseBoard(LIVE));
    expect(session.trySwap({ row: 0, col: 0 }, { row: 2, col: 0 })).toEqual({
      kind: 'rejected',
      reason: 'not-adjacent',
    });
  });

  it('applies a valid swap, uses one move, and scores', () => {
    const session = new GameSession(makeLevel({ moveLimit: 5 }), 1, parseBoard(LIVE));
    const outcome = session.trySwap({ row: 0, col: 2 }, { row: 1, col: 2 });
    expect(outcome.kind).toBe('resolved');
    const snap = session.snapshot();
    expect(snap.movesRemaining).toBe(4);
    expect(snap.movesMade).toBe(1);
    expect(snap.score).toBeGreaterThanOrEqual(180);
    expect(hasAnyMatch(session.board)).toBe(false);
  });

  it('wins when objectives complete and adds the Rally Bonus for unused moves', () => {
    const level = makeLevel({
      moveLimit: 5,
      objectives: [{ type: 'makeMatches', target: 1 }],
      starThresholds: [100, 5000, 9000],
    });
    const session = new GameSession(level, 1, parseBoard(LIVE));
    const outcome = session.trySwap({ row: 0, col: 2 }, { row: 1, col: 2 });
    if (outcome.kind !== 'resolved') throw new Error('expected resolved');
    expect(outcome.snapshot.status).toBe('won');
    expect(outcome.winBonus).toBe(4 * 150);
    expect(outcome.newlyCompletedObjectives).toEqual([0]);
    expect(outcome.snapshot.stars).toBeGreaterThanOrEqual(1);
    expect(session.trySwap({ row: 0, col: 0 }, { row: 0, col: 1 })).toEqual({
      kind: 'rejected',
      reason: 'not-playing',
    });
  });

  it('loses when the last move does not complete the objectives', () => {
    const level = makeLevel({ moveLimit: 1, objectives: [{ type: 'makeMatches', target: 50 }] });
    const session = new GameSession(level, 1, parseBoard(LIVE));
    const outcome = session.trySwap({ row: 0, col: 2 }, { row: 1, col: 2 });
    expect(outcome.kind === 'resolved' && outcome.snapshot.status).toBe('lost');
  });

  it('uses tray boosters without spending a move and rejects empty boosters', () => {
    const level = makeLevel({ boosters: { unlocked: [], starting: { lineRally: 1 } } });
    const session = new GameSession(level, 3, parseBoard(LIVE));
    expect(session.useBooster('campusBurst', { row: 2, col: 2 })).toEqual({
      kind: 'rejected',
      reason: 'no-booster',
    });
    const outcome = session.useBooster('lineRally', { row: 2, col: 2 });
    if (outcome.kind !== 'resolved') throw new Error('expected resolved');
    expect(outcome.steps[0]?.cleared.filter((c) => c.cause === 'booster')).toHaveLength(6);
    expect(outcome.snapshot.boosters.lineRally).toBe(0);
    expect(outcome.snapshot.movesRemaining).toBe(level.moveLimit);
  });

  it('Color Rally booster clears every token of the chosen type', () => {
    const level = makeLevel({ boosters: { unlocked: [], starting: { colorRally: 1 } } });
    const board = parseBoard(LIVE);
    const reds = board.cells.flat().filter((c) => c.token?.color === 'red').length;
    const session = new GameSession(level, 3, board);
    const outcome = session.useBooster('colorRally', { row: 0, col: 0 });
    if (outcome.kind !== 'resolved') throw new Error('expected resolved');
    expect(outcome.steps[0]?.cleared.filter((c) => c.token.color === 'red')).toHaveLength(reds);
  });

  it('swapping a Color Rally token clears all tokens of the partner type', () => {
    const board = parseBoard(LIVE, { specials: { '5,0': 'colorRally' } });
    // The partner at (5,1) is orange.
    const oranges = board.cells.flat().filter((c) => c.token?.color === 'orange').length;
    const session = new GameSession(makeLevel(), 3, board);
    const outcome = session.trySwap({ row: 5, col: 0 }, { row: 5, col: 1 });
    if (outcome.kind !== 'resolved') throw new Error('expected resolved');
    const first = outcome.steps[0]!;
    expect(first.cleared.filter((c) => c.token.color === 'orange')).toHaveLength(oranges);
    expect(first.cleared.some((c) => c.token.special === 'colorRally')).toBe(true);
  });

  it('stays consistent over many random games (no stuck matches, full board, always a move)', () => {
    const level = makeLevel({
      moveLimit: 25,
      board: {
        width: 8,
        height: 8,
        layout: [
          'TT....TT',
          '..#..%..',
          '..L..L..',
          '........',
          '...KK...',
          '.%....#.',
          '........',
          'TT....TT',
        ],
      },
      objectives: [{ type: 'reachScore', target: 100000 }],
    });
    for (let seed = 1; seed <= 25; seed += 1) {
      const session = new GameSession(level, seed);
      const rng = createRng(seed * 7);
      while (session.snapshot().status === 'playing') {
        const moves = findLegalMoves(session.board);
        expect(moves.length).toBeGreaterThan(0);
        const move = rng.pick(moves);
        const outcome = session.trySwap(move.from, move.to);
        expect(outcome.kind).toBe('resolved');
        expect(hasAnyMatch(session.board)).toBe(false);
        const counts = countBoard(session.board);
        expect(counts.tokens + counts.penaltyBlocks).toBe(64);
        if (session.snapshot().status === 'playing') expect(hasLegalMove(session.board)).toBe(true);
      }
      expect(session.snapshot().status).toBe('lost');
    }
  });
});
