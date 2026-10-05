import type { LevelDefinition } from '@/game/core/level';
import { createRng } from '@/game/core/random';
import { TokenFactory } from '@/game/core/TokenFactory';
import type { BoardState, Cell, SpecialKind, TokenColor } from '@/game/core/types';

const LETTERS: Record<string, TokenColor> = {
  r: 'red',
  b: 'blue',
  y: 'gold',
  g: 'green',
  p: 'purple',
  o: 'orange',
};

export interface ParseOptions {
  /** Same shape as rows; 'T' marks a Rally Tile. */
  rallyTiles?: string[];
  /** Map of "row,col" → special kind to attach to the token there. */
  specials?: Record<string, SpecialKind>;
}

/**
 * Builds a board from a compact text picture:
 *   r b y g p o  → tokens (uppercase = locked)
 *   #            → Penalty Block, % → Double Penalty Block, . → empty cell
 */
export function parseBoard(rows: string[], options: ParseOptions = {}): BoardState {
  let id = 1000;
  const cells: Cell[][] = rows.map((line, row) =>
    [...line].map((ch, col): Cell => {
      const rallyTile = options.rallyTiles?.[row]?.[col] === 'T';
      if (ch === '#') return { token: null, obstacle: { kind: 'penaltyBlock', hits: 1 }, rallyTile: false };
      if (ch === '%') return { token: null, obstacle: { kind: 'penaltyBlock', hits: 2 }, rallyTile: false };
      if (ch === '.') return { token: null, obstacle: null, rallyTile };
      const color = LETTERS[ch.toLowerCase()];
      if (!color) throw new Error(`Unknown board char ${ch}`);
      id += 1;
      return {
        token: {
          id,
          color,
          special: options.specials?.[`${row},${col}`] ?? null,
          locked: ch !== ch.toLowerCase(),
        },
        obstacle: null,
        rallyTile,
      };
    }),
  );
  return { width: rows[0]?.length ?? 0, height: rows.length, cells };
}

/** Prints a board back to the compact picture (specials shown as '*'). */
export function printBoard(board: BoardState): string[] {
  const reverse = Object.fromEntries(Object.entries(LETTERS).map(([k, v]) => [v, k]));
  return board.cells.map((row) =>
    row
      .map((cell) => {
        if (cell.obstacle) return cell.obstacle.hits === 2 ? '%' : '#';
        if (!cell.token) return '.';
        if (cell.token.special) return '*';
        const letter = reverse[cell.token.color] ?? '?';
        return cell.token.locked ? letter.toUpperCase() : letter;
      })
      .join(''),
  );
}

export function testFactory(
  seed = 1,
  colors: TokenColor[] = ['red', 'blue', 'gold', 'green', 'purple', 'orange'],
) {
  return new TokenFactory(createRng(seed), colors, 1);
}

/**
 * A factory that refills with a repeating color pattern that can never form a run of three,
 * so cascade tests are deterministic.
 */
export function cyclingFactory(colors: TokenColor[] = ['purple', 'orange', 'purple', 'orange', 'blue']) {
  let i = 0;
  const factory = testFactory(99);
  factory.random = () => {
    const color = colors[i % colors.length] as TokenColor;
    i += 1;
    return factory.create(color);
  };
  return factory;
}

export function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'level-999',
    chapterId: 'test',
    levelNumber: 999,
    title: 'Test Level',
    board: { width: 8, height: 8 },
    tokenTypes: ['red', 'blue', 'gold', 'green', 'purple', 'orange'],
    moveLimit: 10,
    objectives: [{ type: 'reachScore', target: 1000 }],
    boosters: { unlocked: ['lineRally', 'campusBurst', 'colorRally'], starting: {} },
    starThresholds: [1000, 2000, 3000],
    theme: { name: 'Test', backdrop: 'night', accentColor: '#123456' },
    ...overrides,
  };
}
