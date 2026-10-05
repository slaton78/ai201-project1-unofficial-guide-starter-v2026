import type { ObjectiveDefinition } from './level';
import { TOKEN_INFO } from './types';
import type { CascadeStep } from './types';

export interface ObjectiveProgress {
  readonly definition: ObjectiveDefinition;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

export type LevelStatus = 'playing' | 'won' | 'lost';

export interface LevelEvaluation {
  readonly status: LevelStatus;
  readonly stars: 0 | 1 | 2 | 3;
}

function progressOf(definition: ObjectiveDefinition, current: number): ObjectiveProgress {
  const clamped = Math.min(current, definition.target);
  return { definition, current: clamped, target: definition.target, completed: clamped >= definition.target };
}

export function initialObjectiveProgress(definitions: readonly ObjectiveDefinition[]): ObjectiveProgress[] {
  return definitions.map((definition) => progressOf(definition, 0));
}

/** How much a single cascade step advances one objective. Score objectives are handled separately. */
export function objectiveDelta(definition: ObjectiveDefinition, step: CascadeStep): number {
  switch (definition.type) {
    case 'makeMatches':
      // Only matches the player makes with a swap count; cascades still score but don't count,
      // so tutorial goals can't be finished by one lucky chain.
      return step.index === 0 ? step.matches.length : 0;
    case 'clearRallyTiles':
      return step.rallyTilesCleared.length;
    case 'clearPenaltyBlocks':
      return step.obstacleHits.filter((hit) => hit.remaining === 0).length;
    case 'collectTokens':
      return step.cleared.filter(
        (c) => c.token.color === definition.color && c.token.special !== 'colorRally',
      ).length;
    case 'unlockTokens':
      return step.unlocked.length;
    case 'reachScore':
      return 0;
  }
}

export function applyStepsToObjectives(
  progress: readonly ObjectiveProgress[],
  steps: readonly CascadeStep[],
  score: number,
): ObjectiveProgress[] {
  return progress.map((p) => {
    if (p.definition.type === 'reachScore') return progressOf(p.definition, score);
    const delta = steps.reduce((sum, step) => sum + objectiveDelta(p.definition, step), 0);
    return progressOf(p.definition, p.current + delta);
  });
}

export function starsForScore(
  score: number,
  thresholds: readonly [number, number, number],
  won: boolean,
): 0 | 1 | 2 | 3 {
  if (!won) return 0;
  const met = thresholds.filter((t) => score >= t).length;
  return Math.max(1, met) as 1 | 2 | 3;
}

/**
 * Win: every objective complete (checked after the move fully resolves, so the last move can win).
 * Loss: no moves left with any objective incomplete. Otherwise still playing.
 */
export function evaluateLevel(input: {
  objectives: readonly ObjectiveProgress[];
  movesRemaining: number;
  score: number;
  starThresholds: readonly [number, number, number];
}): LevelEvaluation {
  const allComplete = input.objectives.every((o) => o.completed);
  if (allComplete) {
    return { status: 'won', stars: starsForScore(input.score, input.starThresholds, true) };
  }
  if (input.movesRemaining <= 0) return { status: 'lost', stars: 0 };
  return { status: 'playing', stars: 0 };
}

/** Plain-language objective text. Shared by the React Native UI and the Phaser scene. */
export function describeObjective(definition: ObjectiveDefinition): string {
  const n = definition.target.toLocaleString('en-US');
  switch (definition.type) {
    case 'makeMatches':
      return `Make ${n} matches`;
    case 'clearRallyTiles':
      return `Clear ${n} Rally Tiles`;
    case 'reachScore':
      return `Earn ${n} points`;
    case 'clearPenaltyBlocks':
      return `Clear ${n} Penalty Blocks`;
    case 'collectTokens': {
      const info = TOKEN_INFO[definition.color];
      return `Collect ${n} ${info.name} (${info.shape})`;
    }
    case 'unlockTokens':
      return `Unlock ${n} Locked Tokens`;
  }
}

export function describeObjectiveShort(definition: ObjectiveDefinition): string {
  switch (definition.type) {
    case 'makeMatches':
      return 'Matches';
    case 'clearRallyTiles':
      return 'Rally Tiles';
    case 'reachScore':
      return 'Points';
    case 'clearPenaltyBlocks':
      return 'Penalty Blocks';
    case 'collectTokens':
      return TOKEN_INFO[definition.color].name;
    case 'unlockTokens':
      return 'Locked Tokens';
  }
}
