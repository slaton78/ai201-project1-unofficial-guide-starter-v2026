import type { GameSave } from '@/types/save';

/**
 * Persistence boundary for player data. The app only talks to this interface, so the local
 * implementation can later be swapped for (or combined with) a Supabase-backed one.
 */
export interface GameRepository {
  readonly kind: 'local' | 'supabase';
  /** Loads the save, migrating older formats. Never rejects for corrupt data. */
  load(): Promise<GameSave>;
  /** Persists the full save. Writes are serialized in call order. */
  save(save: GameSave): Promise<void>;
  /** Deletes all local prototype data and returns a fresh save. */
  reset(): Promise<GameSave>;
}

/** Minimal async key-value contract satisfied by AsyncStorage and by in-memory test doubles. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
