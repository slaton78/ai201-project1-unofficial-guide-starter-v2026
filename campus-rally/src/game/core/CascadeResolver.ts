import {
  allPositions,
  fromGrid,
  getCell,
  gridCell,
  inBounds,
  isMatchable,
  orthogonalNeighbors,
  posKey,
  setGridCell,
  toGrid,
} from './Board';
import type { MutableGrid } from './Board';
import { findMatches, placementForMatch, specialForMatch } from './MatchFinder';
import { scoreForStep } from './scoring';
import type { TokenFactory } from './TokenFactory';
import { specialToBooster } from './types';
import type {
  BoardState,
  BoosterType,
  CascadeStep,
  ClearCause,
  ClearedToken,
  CreatedSpecial,
  MatchGroup,
  ObstacleHit,
  Position,
  SpawnedToken,
  SpecialKind,
  Token,
  TokenMove,
  TriggeredSpecial,
} from './types';

/** Hard stop for pathological boards; real cascades end long before this. */
export const MAX_CASCADE_STEPS = 40;

export interface ForcedClear {
  readonly pos: Position;
  readonly cause: Exclude<ClearCause, 'match'>;
}

export interface ResolveOptions {
  readonly factory: TokenFactory;
  /** Booster families that combos may create on this level. */
  readonly allowedBoosters: ReadonlySet<BoosterType>;
  /** Cells cleared in the first wave regardless of matches (special combos, tray boosters). */
  readonly initialClears?: readonly ForcedClear[];
  /** Ids of specials consumed by the move itself, which must not trigger their own effect. */
  readonly consumedSpecialIds?: ReadonlySet<number>;
  /** The two swapped cells, used to place a created special where the player acted. */
  readonly swapHint?: readonly Position[];
}

export interface ResolveResult {
  readonly steps: CascadeStep[];
  readonly board: BoardState;
}

/** Positions affected when a special token at `pos` is triggered. */
export function specialArea(
  board: BoardState,
  pos: Position,
  kind: SpecialKind,
  color: Token['color'],
): Position[] {
  switch (kind) {
    case 'lineRow':
      return Array.from({ length: board.width }, (_, col) => ({ row: pos.row, col }));
    case 'lineColumn':
      return Array.from({ length: board.height }, (_, row) => ({ row, col: pos.col }));
    case 'burst': {
      const area: Position[] = [];
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const p = { row: pos.row + dr, col: pos.col + dc };
          if (inBounds(board, p)) area.push(p);
        }
      }
      return area;
    }
    case 'colorRally':
      return allPositions(board).filter((p) => {
        const token = getCell(board, p).token;
        return isMatchable(token) && token.color === color;
      });
  }
}

/** Downgrades a desired special to one the level has unlocked (documented in architecture.md). */
export function allowedSpecial(
  desired: SpecialKind | null,
  group: MatchGroup,
  allowed: ReadonlySet<BoosterType>,
): SpecialKind | null {
  const line: SpecialKind = group.horizontalLength >= group.verticalLength ? 'lineRow' : 'lineColumn';
  const chain: Record<SpecialKind, SpecialKind[]> = {
    colorRally: ['colorRally', 'burst', line],
    burst: ['burst', line],
    lineRow: ['lineRow'],
    lineColumn: ['lineColumn'],
  };
  if (desired === null) return null;
  return chain[desired].find((kind) => allowed.has(specialToBooster(kind))) ?? null;
}

interface PendingClear {
  pos: Position;
  cause: ClearCause;
}

function resolveStep(
  board: BoardState,
  index: number,
  matches: readonly MatchGroup[],
  options: ResolveOptions,
  forced: readonly ForcedClear[],
  consumed: Set<number>,
  hint: readonly Position[],
): CascadeStep {
  const clears = new Map<string, PendingClear>();
  const blockHits = new Set<string>();
  const blockPositions = new Map<string, Position>();
  const hitBlock = (pos: Position): void => {
    if (getCell(board, pos).obstacle) {
      blockHits.add(posKey(pos));
      blockPositions.set(posKey(pos), pos);
    }
  };

  for (const group of matches) {
    for (const cell of group.cells) {
      clears.set(posKey(cell), { pos: cell, cause: 'match' });
      // Penalty blocks take one hit per wave from any orthogonally adjacent match.
      for (const neighbor of orthogonalNeighbors(board, cell)) hitBlock(neighbor);
    }
  }
  for (const f of forced) {
    if (getCell(board, f.pos).token && !clears.has(posKey(f.pos))) {
      clears.set(posKey(f.pos), { pos: f.pos, cause: f.cause });
    }
    hitBlock(f.pos);
  }

  // Trigger specials caught in the clear, chaining through any specials they hit.
  const triggered: TriggeredSpecial[] = [];
  const queue = [...clears.values()].map((c) => c.pos);
  while (queue.length > 0) {
    const pos = queue.shift() as Position;
    const token = getCell(board, pos).token;
    if (!token || token.special === null || token.locked || consumed.has(token.id)) continue;
    consumed.add(token.id);
    triggered.push({ pos, kind: token.special });
    for (const target of specialArea(board, pos, token.special, token.color)) {
      hitBlock(target);
      const targetToken = getCell(board, target).token;
      if (!targetToken) continue;
      if (!clears.has(posKey(target))) {
        clears.set(posKey(target), { pos: target, cause: 'special' });
      }
      if (targetToken.special !== null && !consumed.has(targetToken.id)) queue.push(target);
    }
  }

  // Decide which specials this wave creates (placed after clearing).
  const created: { pos: Position; group: MatchGroup; kind: SpecialKind }[] = [];
  for (const group of matches) {
    const kind = allowedSpecial(specialForMatch(group), group, options.allowedBoosters);
    if (!kind) continue;
    let pos = placementForMatch(group, hint);
    if (getCell(board, pos).token?.locked) {
      const alternative = group.cells.find((c) => !getCell(board, c).token?.locked);
      if (!alternative) continue;
      pos = alternative;
    }
    created.push({ pos, group, kind });
  }

  const grid = toGrid(board);
  const cleared: ClearedToken[] = [];
  const unlocked: Position[] = [];
  const rallyTilesCleared: Position[] = [];
  for (const { pos, cause } of clears.values()) {
    const cell = gridCell(grid, pos);
    const token = cell.token;
    if (!token) continue;
    if (token.locked) {
      setGridCell(grid, pos, { ...cell, token: { ...token, locked: false } });
      unlocked.push(pos);
      continue;
    }
    cleared.push({ pos, token, cause });
    setGridCell(grid, pos, { ...cell, token: null, rallyTile: false });
    if (cell.rallyTile) rallyTilesCleared.push(pos);
  }

  const obstacleHits: ObstacleHit[] = [];
  for (const key of blockHits) {
    const pos = blockPositions.get(key) as Position;
    const cell = gridCell(grid, pos);
    if (!cell.obstacle) continue;
    const remaining = cell.obstacle.hits - 1;
    setGridCell(grid, pos, {
      ...cell,
      obstacle: remaining > 0 ? { ...cell.obstacle, hits: remaining } : null,
    });
    obstacleHits.push({ pos, remaining });
  }

  const specialsCreated: CreatedSpecial[] = [];
  for (const { pos, group, kind } of created) {
    const cell = gridCell(grid, pos);
    if (cell.token) continue;
    const token = options.factory.create(group.color, { special: kind });
    setGridCell(grid, pos, { ...cell, token });
    specialsCreated.push({ pos, token });
  }

  const { falls, spawns } = applyGravity(grid, board.width, board.height, options.factory);
  const boardAfter = fromGrid(board.width, board.height, grid);

  return {
    index,
    matches,
    cleared,
    unlocked,
    obstacleHits,
    rallyTilesCleared,
    specialsCreated,
    specialsTriggered: triggered,
    falls,
    spawns,
    scoreDelta: scoreForStep({
      index,
      tokensCleared: cleared.length,
      specialsCreated: specialsCreated.length,
      specialsTriggered: triggered.length,
      blockHits: obstacleHits.length,
      rallyTilesCleared: rallyTilesCleared.length,
      unlocked: unlocked.length,
    }),
    boardAfter,
  };
}

/**
 * Drops tokens down within each column segment (segments are separated by Penalty Blocks)
 * and spawns new tokens at the top of each segment. Mutates `grid`.
 */
export function applyGravity(
  grid: MutableGrid,
  width: number,
  height: number,
  factory: TokenFactory,
): { falls: TokenMove[]; spawns: SpawnedToken[] } {
  const falls: TokenMove[] = [];
  const spawns: SpawnedToken[] = [];
  for (let col = 0; col < width; col += 1) {
    let segmentBottom = height - 1;
    while (segmentBottom >= 0) {
      if (gridCell(grid, { row: segmentBottom, col }).obstacle) {
        segmentBottom -= 1;
        continue;
      }
      let segmentTop = segmentBottom;
      while (segmentTop - 1 >= 0 && !gridCell(grid, { row: segmentTop - 1, col }).obstacle) {
        segmentTop -= 1;
      }
      let writeRow = segmentBottom;
      for (let row = segmentBottom; row >= segmentTop; row -= 1) {
        const from = { row, col };
        const token = gridCell(grid, from).token;
        if (!token) continue;
        if (row !== writeRow) {
          const to = { row: writeRow, col };
          setGridCell(grid, to, { ...gridCell(grid, to), token });
          setGridCell(grid, from, { ...gridCell(grid, from), token: null });
          falls.push({ tokenId: token.id, from, to });
        }
        writeRow -= 1;
      }
      const missing = writeRow - segmentTop + 1;
      for (let row = segmentTop; row <= writeRow; row += 1) {
        const pos = { row, col };
        const token = factory.random();
        setGridCell(grid, pos, { ...gridCell(grid, pos), token });
        spawns.push({ token, pos, dropDistance: missing });
      }
      segmentBottom = segmentTop - 1;
    }
  }
  return { falls, spawns };
}

/**
 * Resolves the board after a move: clears matches (and any forced clears), triggers specials,
 * damages obstacles, creates new specials, applies gravity/refill, and repeats until stable.
 */
export function resolveCascades(board: BoardState, options: ResolveOptions): ResolveResult {
  const steps: CascadeStep[] = [];
  const consumed = new Set(options.consumedSpecialIds ?? []);
  let current = board;
  let forced = options.initialClears ?? [];
  let hint = options.swapHint ?? [];

  for (let index = 0; index < MAX_CASCADE_STEPS; index += 1) {
    const matches = findMatches(current);
    if (matches.length === 0 && forced.length === 0) break;
    const step = resolveStep(current, index, matches, options, forced, consumed, hint);
    steps.push(step);
    current = step.boardAfter;
    forced = [];
    hint = [];
  }
  return { steps, board: current };
}
