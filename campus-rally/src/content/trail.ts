/**
 * Championship Trail manifest (Phase A shell).
 *
 * Only the stop list lives here: ids, numbers and display titles. Playable level definitions
 * (board layout, objectives, moves, boosters) arrive with the game core in a later phase and
 * will reuse these ids. Ids match the `levelId` format used by the save model (`level-NNN`).
 */
export interface TrailStop {
  id: string;
  levelNumber: number;
  title: string;
}

const TITLES = [
  'Opening Whistle',
  'Tile Time',
  'Score Surge',
  'Penalty Box',
  'Line Rally',
  'Green Wave',
  'Locked In',
  'Mixed Signals',
  'Campus Burst',
  'Rivalry Rush',
] as const;

export const TRAIL_STOPS: readonly TrailStop[] = TITLES.map((title, index) => ({
  id: `level-${String(index + 1).padStart(3, '0')}`,
  levelNumber: index + 1,
  title,
}));

export const LEVEL_ORDER: readonly string[] = TRAIL_STOPS.map((stop) => stop.id);

export function getTrailStop(id: string): TrailStop | undefined {
  return TRAIL_STOPS.find((stop) => stop.id === id);
}
