import { allPositions, getCell, inBounds, isMatchable, swapTokens } from './Board';
import { generateBoard, reshuffleBoard } from './BoardGenerator';
import { resolveCascades, specialArea } from './CascadeResolver';
import type { ForcedClear } from './CascadeResolver';
import { startingBoosters } from './level';
import type { LevelDefinition } from './level';
import { applyStepsToObjectives, evaluateLevel, initialObjectiveProgress } from './LevelEvaluator';
import type { LevelStatus, ObjectiveProgress } from './LevelEvaluator';
import { hasLegalMove, suggestMove, validateSwap } from './MoveValidator';
import type { Move } from './MoveValidator';
import { createRng } from './random';
import { movesLeftBonus } from './scoring';
import { TokenFactory } from './TokenFactory';
import type { BoardState, BoosterType, CascadeStep, Position, SwapRejection } from './types';

export interface GameSnapshot {
  readonly levelId: string;
  readonly moveLimit: number;
  readonly movesRemaining: number;
  readonly movesMade: number;
  readonly score: number;
  readonly objectives: readonly ObjectiveProgress[];
  readonly boosters: Readonly<Record<BoosterType, number>>;
  readonly status: LevelStatus;
  readonly stars: 0 | 1 | 2 | 3;
}

export type MoveRejection = SwapRejection | 'not-playing' | 'no-booster' | 'invalid-target';

export type MoveOutcome =
  | { readonly kind: 'rejected'; readonly reason: MoveRejection }
  | {
      readonly kind: 'resolved';
      readonly steps: readonly CascadeStep[];
      /** Set when no legal moves remained and tokens were re-colored. */
      readonly reshuffledBoard: BoardState | null;
      /** Rally Bonus for unused moves, added when the move wins the level. */
      readonly winBonus: number;
      readonly newlyCompletedObjectives: readonly number[];
      readonly snapshot: GameSnapshot;
    };

/**
 * One play-through of a level. Owns the board and all rules; renderers only call
 * `trySwap` / `useBooster` and animate the returned steps.
 */
export class GameSession {
  private boardState: BoardState;
  private readonly factory: TokenFactory;
  private movesRemaining: number;
  private movesMade = 0;
  private score = 0;
  private objectives: ObjectiveProgress[];
  private boosters: Record<BoosterType, number>;
  private status: LevelStatus = 'playing';
  private stars: 0 | 1 | 2 | 3 = 0;
  private readonly allowedBoosters: ReadonlySet<BoosterType>;

  /**
   * @param initialBoard Optional pre-built board (tests, replays, server validation). When
   *   omitted, a playable board is generated from the level layout and seed.
   */
  constructor(
    readonly level: LevelDefinition,
    readonly seed: number,
    initialBoard?: BoardState,
  ) {
    // Token ids for a supplied board are offset so refills never collide with existing ids.
    this.factory = new TokenFactory(createRng(seed), level.tokenTypes, initialBoard ? 100000 : 1);
    this.boardState = initialBoard ?? generateBoard(level, this.factory);
    this.movesRemaining = level.moveLimit;
    this.objectives = initialObjectiveProgress(level.objectives);
    this.boosters = startingBoosters(level);
    this.allowedBoosters = new Set(level.boosters.unlocked);
  }

  get board(): BoardState {
    return this.boardState;
  }

  snapshot(): GameSnapshot {
    return {
      levelId: this.level.id,
      moveLimit: this.level.moveLimit,
      movesRemaining: this.movesRemaining,
      movesMade: this.movesMade,
      score: this.score,
      objectives: this.objectives,
      boosters: { ...this.boosters },
      status: this.status,
      stars: this.stars,
    };
  }

  hint(): Move | null {
    return this.status === 'playing' ? suggestMove(this.boardState) : null;
  }

  trySwap(a: Position, b: Position): MoveOutcome {
    if (this.status !== 'playing') return { kind: 'rejected', reason: 'not-playing' };
    const validation = validateSwap(this.boardState, a, b);
    if (!validation.ok) return { kind: 'rejected', reason: validation.reason };

    const before = this.boardState;
    const swapped = swapTokens(before, a, b);
    const tokenA = getCell(before, a).token;
    const tokenB = getCell(before, b).token;
    let initialClears: ForcedClear[] = [];
    const consumed = new Set<number>();

    if (tokenA && tokenB && validation.kind === 'special-combo') {
      // Positions after the swap: tokenA now sits at b, tokenB at a.
      const rallyAt = tokenA.special === 'colorRally' ? b : tokenB.special === 'colorRally' ? a : null;
      if (rallyAt) {
        const rally = getCell(swapped, rallyAt).token;
        const partnerAt = rallyAt === b ? a : b;
        const partner = getCell(swapped, partnerAt).token;
        if (rally) consumed.add(rally.id);
        const targets =
          partner?.special === 'colorRally'
            ? allPositions(swapped).filter((p) => getCell(swapped, p).token !== null)
            : allPositions(swapped).filter((p) => {
                const t = getCell(swapped, p).token;
                return isMatchable(t) && t.color === partner?.color;
              });
        initialClears = [rallyAt, ...targets].map((pos) => ({ pos, cause: 'special' as const }));
      } else {
        initialClears = [a, b].map((pos) => ({ pos, cause: 'special' as const }));
      }
    }

    const { steps, board } = resolveCascades(swapped, {
      factory: this.factory,
      allowedBoosters: this.allowedBoosters,
      initialClears,
      consumedSpecialIds: consumed,
      swapHint: [b, a],
    });
    this.movesRemaining -= 1;
    this.movesMade += 1;
    return this.finishMove(steps, board);
  }

  useBooster(type: BoosterType, target: Position): MoveOutcome {
    if (this.status !== 'playing') return { kind: 'rejected', reason: 'not-playing' };
    if ((this.boosters[type] ?? 0) <= 0) return { kind: 'rejected', reason: 'no-booster' };
    if (!inBounds(this.boardState, target)) return { kind: 'rejected', reason: 'invalid-target' };
    const targetToken = getCell(this.boardState, target).token;

    let area: Position[];
    if (type === 'colorRally') {
      if (!isMatchable(targetToken)) return { kind: 'rejected', reason: 'invalid-target' };
      area = specialArea(this.boardState, target, 'colorRally', targetToken.color);
    } else {
      area = specialArea(this.boardState, target, type === 'lineRally' ? 'lineRow' : 'burst', 'red');
    }

    this.boosters = { ...this.boosters, [type]: this.boosters[type] - 1 };
    const { steps, board } = resolveCascades(this.boardState, {
      factory: this.factory,
      allowedBoosters: this.allowedBoosters,
      initialClears: area.map((pos) => ({ pos, cause: 'booster' as const })),
    });
    // Boosters never cost a move.
    return this.finishMove(steps, board);
  }

  private finishMove(steps: readonly CascadeStep[], board: BoardState): MoveOutcome {
    const wasComplete = this.objectives.map((o) => o.completed);
    this.boardState = board;
    this.score += steps.reduce((sum, step) => sum + step.scoreDelta, 0);
    this.objectives = applyStepsToObjectives(this.objectives, steps, this.score);

    let evaluation = evaluateLevel({
      objectives: this.objectives,
      movesRemaining: this.movesRemaining,
      score: this.score,
      starThresholds: this.level.starThresholds,
    });
    let winBonus = 0;
    if (evaluation.status === 'won') {
      winBonus = movesLeftBonus(this.movesRemaining);
      this.score += winBonus;
      evaluation = evaluateLevel({
        objectives: this.objectives,
        movesRemaining: this.movesRemaining,
        score: this.score,
        starThresholds: this.level.starThresholds,
      });
    }
    this.status = evaluation.status;
    this.stars = evaluation.stars;

    let reshuffledBoard: BoardState | null = null;
    if (this.status === 'playing' && !hasLegalMove(this.boardState)) {
      reshuffledBoard = reshuffleBoard(this.boardState, this.factory);
      this.boardState = reshuffledBoard;
    }

    const newlyCompletedObjectives = this.objectives
      .map((o, i) => (o.completed && !wasComplete[i] ? i : -1))
      .filter((i) => i >= 0);

    return {
      kind: 'resolved',
      steps,
      reshuffledBoard,
      winBonus,
      newlyCompletedObjectives,
      snapshot: this.snapshot(),
    };
  }
}
