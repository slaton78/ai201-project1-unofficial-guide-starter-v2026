import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameRepository } from './GameRepository';
import { LocalGameRepository } from './LocalGameRepository';

export type { GameRepository, KeyValueStore } from './GameRepository';

/**
 * The MVP always uses local persistence. When Supabase sync ships, this factory is the single
 * place that decides which repository (or a local-first syncing composite) to use.
 */
export function createGameRepository(): GameRepository {
  return new LocalGameRepository(AsyncStorage);
}
