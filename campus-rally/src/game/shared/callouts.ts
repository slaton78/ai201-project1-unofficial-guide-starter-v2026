import type { CascadeStep, SpecialKind } from '@/game/core/types';

/** Original combo callout copy. Kept short so it reads in a glance. */
const SPECIAL_CALLOUTS: Record<SpecialKind, string> = {
  lineRow: 'Line Rally!',
  lineColumn: 'Line Rally!',
  burst: 'Campus Burst!',
  colorRally: 'Color Rally!',
};

const CASCADE_CALLOUTS = ['Rally On!', 'Momentum!', 'Campus Charge!', 'Unstoppable!'];

/** Picks at most one callout for a resolved move, or null when the move was ordinary. */
export function calloutForSteps(steps: readonly CascadeStep[]): string | null {
  const created = steps.flatMap((s) => s.specialsCreated);
  const last = created[created.length - 1];
  if (steps.length >= 2) {
    return CASCADE_CALLOUTS[Math.min(steps.length - 2, CASCADE_CALLOUTS.length - 1)] ?? null;
  }
  if (last?.token.special) return SPECIAL_CALLOUTS[last.token.special];
  return null;
}
