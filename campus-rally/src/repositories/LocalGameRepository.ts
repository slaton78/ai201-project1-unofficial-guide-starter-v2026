import { createDefaultSave, migrateSave } from '@/features/persistence/migrations';
import type { GameSave } from '@/types/save';

import type { GameRepository, KeyValueStore } from './GameRepository';

export const SAVE_KEY = 'campus-rally/save';
export const CORRUPT_BACKUP_KEY = 'campus-rally/save.corrupt';

/** Stores the whole save as one JSON document in device-local storage. */
export class LocalGameRepository implements GameRepository {
  readonly kind = 'local' as const;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string = SAVE_KEY,
  ) {}

  async load(): Promise<GameSave> {
    await this.writeChain;
    let text: string | null;
    try {
      text = await this.store.getItem(this.key);
    } catch {
      return createDefaultSave();
    }
    if (text === null) return createDefaultSave();

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      // Keep the unreadable payload for diagnosis instead of silently discarding it.
      await this.store.setItem(CORRUPT_BACKUP_KEY, text).catch(() => undefined);
      return createDefaultSave();
    }
    const { save, changed } = migrateSave(raw);
    if (changed) await this.save(save);
    return save;
  }

  save(save: GameSave): Promise<void> {
    const payload = JSON.stringify(save);
    const next = this.writeChain.then(() => this.store.setItem(this.key, payload));
    // Keep the chain alive even if one write fails; the caller still sees the rejection.
    this.writeChain = next.catch(() => undefined);
    return next;
  }

  async reset(): Promise<GameSave> {
    await this.writeChain;
    await this.store.removeItem(this.key);
    await this.store.removeItem(CORRUPT_BACKUP_KEY).catch(() => undefined);
    return createDefaultSave();
  }
}

/** In-memory store for tests and environments without persistent storage. */
export class MemoryKeyValueStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.data.delete(key);
  }
}
