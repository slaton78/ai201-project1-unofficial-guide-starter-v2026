/** Score tuning lives in one place so balancing never touches game logic. */
export const SCORING = {
  tokenCleared: 60,
  specialCreated: 150,
  specialTriggered: 100,
  blockHit: 80,
  rallyTileCleared: 40,
  tokenUnlocked: 60,
  /** Each cascade wave after the first adds +50% to that wave's points. */
  cascadeMultiplierStep: 0.5,
  /** Awarded per unused move when a level is won ("Rally Bonus"). */
  movesLeftBonus: 150,
} as const;

export interface StepScoreInput {
  index: number;
  tokensCleared: number;
  specialsCreated: number;
  specialsTriggered: number;
  blockHits: number;
  rallyTilesCleared: number;
  unlocked: number;
}

export function cascadeMultiplier(index: number): number {
  return 1 + index * SCORING.cascadeMultiplierStep;
}

export function scoreForStep(input: StepScoreInput): number {
  const base =
    input.tokensCleared * SCORING.tokenCleared +
    input.specialsCreated * SCORING.specialCreated +
    input.specialsTriggered * SCORING.specialTriggered +
    input.blockHits * SCORING.blockHit +
    input.rallyTilesCleared * SCORING.rallyTileCleared +
    input.unlocked * SCORING.tokenUnlocked;
  return Math.round(base * cascadeMultiplier(input.index));
}

export function movesLeftBonus(movesRemaining: number): number {
  return Math.max(0, movesRemaining) * SCORING.movesLeftBonus;
}
