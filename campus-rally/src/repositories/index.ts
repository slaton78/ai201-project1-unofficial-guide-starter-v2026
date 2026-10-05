import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameRepository } from './GameRepository';
import { LocalGameRepository } from './LocalGameRepository';

export type { GameRepository, KeyValueStore } from './GameRepository';

/**
 * The single place that decides which persistence implementation the app uses. Today it is
 * always device-local; a remote-sync implementation can be introduced here later without
 * touching screens or the store.
 */
export function createGameRepository(): GameRepository {
  return new LocalGameRepository(AsyncStorage);
}
