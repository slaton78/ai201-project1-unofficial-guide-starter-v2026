import { seedFromString } from '@/game/core/random';
import type { GameSave } from '@/types/save';

import { getProgress, localDateKey } from './progression';

export interface DailyPractice {
  dateKey: string;
  levelId: string;
  seed: number;
}

/**
 * Deterministic local Daily Practice: everyone on the same local date gets the same board for
 * the same level (seeded by date). It picks from levels the player has already completed so it
 * never spoils new content. Server-driven daily challenges are on the backend roadmap.
 */
export function dailyPractice(save: GameSave, order: readonly string[], today: Date): DailyPractice {
  const dateKey = localDateKey(today);
  const completed = order.filter((id) => getProgress(save, id).completed);
  const pool = completed.length > 0 ? completed : order.slice(0, 1);
  const seed = seedFromString(`daily:${dateKey}`);
  const levelId = pool[seed % pool.length] as string;
  return { dateKey, levelId, seed };
}
