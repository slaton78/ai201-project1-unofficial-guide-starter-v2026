/**
 * Core match-three domain types.
 *
 * This module (and everything in `src/game/core`) is framework-agnostic: it must not
 * import React, React Native, Phaser, or any platform API. Both the React Native app
 * and the Phaser WebView bundle depend on it.
 */

export const TOKEN_COLORS = ['red', 'blue', 'gold', 'green', 'purple', 'orange'] as const;
export type TokenColor = (typeof TOKEN_COLORS)[number];

/** Player-facing names for each token type. Shape is listed so copy never relies on color alone. */
export const TOKEN_INFO: Record<TokenColor, { name: string; shape: string }> = {
  red: { name: 'Rally Red', shape: 'circle' },
  blue: { name: 'Spirit Blue', shape: 'diamond' },
  gold: { name: 'Gold Star', shape: 'star' },
  green: { name: 'Victory Green', shape: 'triangle' },
  purple: { name: 'Spark Purple', shape: 'hexagon' },
  orange: { name: 'Momentum Orange', shape: 'square' },
};

/**
 * Special tokens created by combos (see docs/architecture.md → "Combo rules").
 * - lineRow / lineColumn: "Line Rally" — clears the full row / column.
 * - burst: "Campus Burst" — clears the 3x3 area around it.
 * - colorRally: "Color Rally" — clears every token of one type.
 */
export type SpecialKind = 'lineRow' | 'lineColumn' | 'burst' | 'colorRally';

/** The booster family a special belongs to. Used for level unlock gating and the booster tray. */
export type BoosterType = 'lineRally' | 'campusBurst' | 'colorRally';
export const BOOSTER_TYPES: readonly BoosterType[] = ['lineRally', 'campusBurst', 'colorRally'];

export interface Token {
  readonly id: number;
  readonly color: TokenColor;
  readonly special: SpecialKind | null;
  /** Locked tokens cannot be swapped. The first clear that hits them unlocks them instead. */
  readonly locked: boolean;
}

export interface PenaltyBlock {
  readonly kind: 'penaltyBlock';
  /** Remaining adjacent clears needed: 1 = Penalty Block, 2 = Double Penalty Block. */
  readonly hits: number;
}

export interface Cell {
  readonly token: Token | null;
  /** A penalty block occupies the cell instead of a token and blocks gravity. */
  readonly obstacle: PenaltyBlock | null;
  /** Rally Tiles sit under tokens; clearing the token on top clears the tile. */
  readonly rallyTile: boolean;
}

export interface Position {
  readonly row: number;
  readonly col: number;
}

export interface BoardState {
  readonly width: number;
  readonly height: number;
  /** Row-major: `cells[row][col]`. Row 0 is the top of the board. */
  readonly cells: readonly (readonly Cell[])[];
}

export type MatchShape = 'line3' | 'line4' | 'line5' | 'cross';

export interface MatchGroup {
  readonly color: TokenColor;
  readonly cells: readonly Position[];
  readonly shape: MatchShape;
  /** Longest horizontal run length within the group (0 if none ≥ 3). */
  readonly horizontalLength: number;
  /** Longest vertical run length within the group (0 if none ≥ 3). */
  readonly verticalLength: number;
}

export type ClearCause = 'match' | 'special' | 'booster';

export interface ClearedToken {
  readonly pos: Position;
  readonly token: Token;
  readonly cause: ClearCause;
}

export interface TokenMove {
  readonly tokenId: number;
  readonly from: Position;
  readonly to: Position;
}

export interface SpawnedToken {
  readonly token: Token;
  readonly pos: Position;
  /** How many cells above its final slot the token should appear to fall from. */
  readonly dropDistance: number;
}

export interface ObstacleHit {
  readonly pos: Position;
  /** Hits remaining after this step; 0 means the block was destroyed. */
  readonly remaining: number;
}

export interface CreatedSpecial {
  readonly pos: Position;
  readonly token: Token;
}

export interface TriggeredSpecial {
  readonly pos: Position;
  readonly kind: SpecialKind;
}

/** One wave of clearing → gravity → refill. A move produces one or more steps. */
export interface CascadeStep {
  readonly index: number;
  readonly matches: readonly MatchGroup[];
  readonly cleared: readonly ClearedToken[];
  readonly unlocked: readonly Position[];
  readonly obstacleHits: readonly ObstacleHit[];
  readonly rallyTilesCleared: readonly Position[];
  readonly specialsCreated: readonly CreatedSpecial[];
  readonly specialsTriggered: readonly TriggeredSpecial[];
  readonly falls: readonly TokenMove[];
  readonly spawns: readonly SpawnedToken[];
  readonly scoreDelta: number;
  readonly boardAfter: BoardState;
}

export type SwapRejection = 'out-of-bounds' | 'not-adjacent' | 'empty-cell' | 'locked' | 'no-match';

export function specialToBooster(kind: SpecialKind): BoosterType {
  switch (kind) {
    case 'lineRow':
    case 'lineColumn':
      return 'lineRally';
    case 'burst':
      return 'campusBurst';
    case 'colorRally':
      return 'colorRally';
  }
}
