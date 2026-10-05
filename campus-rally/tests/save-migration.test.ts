import { describe, expect, it } from 'vitest';

import { createDefaultSave, CURRENT_SCHEMA_VERSION, migrateSave } from '@/features/persistence/migrations';
import {
  CORRUPT_BACKUP_KEY,
  LocalGameRepository,
  MemoryKeyValueStore,
  SAVE_KEY,
} from '@/repositories/LocalGameRepository';

const V1_SAVE = {
  schemaVersion: 1,
  profile: {
    id: 'local-abc',
    campusId: 'granite-owls',
    onboarded: true,
    createdAt: '2025-01-02T03:04:05.000Z',
    music: false,
    sfx: true,
    haptics: false,
  },
  progress: {
    'level-001': { stars: 3, bestScore: 4200, completed: true },
    'level-002': { stars: 1, bestScore: 900, completed: true },
    'not-a-level': { stars: 3, bestScore: 1, completed: true },
  },
  streak: 4,
};

describe('save migration', () => {
  it('migrates a v1 save to the current schema without losing progress', () => {
    const { save, fromVersion, changed } = migrateSave(V1_SAVE);
    expect(fromVersion).toBe(1);
    expect(changed).toBe(true);
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(save.playerProfile).toMatchObject({
      id: 'local-abc',
      selectedCampusId: 'granite-owls',
      onboardingCompleted: true,
      createdAt: '2025-01-02T03:04:05.000Z',
      settings: {
        musicEnabled: false,
        sfxEnabled: true,
        hapticsEnabled: false,
        reduceMotionEnabled: false,
        highContrastEnabled: false,
      },
    });
    expect(save.levelProgressById['level-001']).toMatchObject({
      completed: true,
      stars: 3,
      bestScore: 4200,
      unlocked: true,
    });
    expect(save.levelProgressById['not-a-level']).toBeUndefined();
    expect(save.dailyStreak).toBe(4);
  });

  it('keeps a current save unchanged', () => {
    const current = createDefaultSave(new Date('2026-01-01T00:00:00Z'), 'local-x');
    current.levelProgressById['level-003'] = {
      levelId: 'level-003',
      unlocked: true,
      completed: true,
      stars: 2,
      bestScore: 3000,
      attempts: 5,
      completedAt: '2026-01-02T00:00:00.000Z',
    };
    current.lastDailyChallengeDate = '2026-01-02';
    const { save, changed } = migrateSave(JSON.parse(JSON.stringify(current)));
    expect(changed).toBe(false);
    expect(save).toEqual(current);
  });

  it('repairs invalid fields individually instead of discarding the save', () => {
    const { save } = migrateSave({
      schemaVersion: 2,
      playerProfile: {
        id: 42,
        onboardingCompleted: true,
        selectedCampusId: 'harbor-comets',
        settings: { musicEnabled: 'yes', sfxEnabled: false },
      },
      levelProgressById: {
        'level-001': { levelId: 'level-001', completed: true, stars: 7, bestScore: -5, attempts: 2 },
        'level-002': 'garbage',
      },
      dailyStreak: -3,
      lastDailyChallengeDate: 'yesterday',
    });
    expect(save.playerProfile.onboardingCompleted).toBe(true);
    expect(save.playerProfile.selectedCampusId).toBe('harbor-comets');
    expect(typeof save.playerProfile.id).toBe('string');
    expect(save.playerProfile.settings.musicEnabled).toBe(true);
    expect(save.playerProfile.settings.sfxEnabled).toBe(false);
    expect(save.levelProgressById['level-001']).toMatchObject({
      completed: true,
      stars: 0,
      bestScore: 0,
      attempts: 2,
    });
    expect(save.levelProgressById['level-002']).toBeUndefined();
    expect(save.dailyStreak).toBe(0);
    expect(save.lastDailyChallengeDate).toBeUndefined();
  });

  it('returns a fresh save for non-object input', () => {
    for (const raw of [null, 'text', 42, [1, 2]]) {
      const { save, fromVersion } = migrateSave(raw);
      expect(fromVersion).toBe(0);
      expect(save.playerProfile.onboardingCompleted).toBe(false);
    }
  });

  it('accepts saves from a newer app version by keeping known fields', () => {
    const future = { ...createDefaultSave(), schemaVersion: 99, futureField: { x: 1 } };
    future.playerProfile.onboardingCompleted = true;
    const { save } = migrateSave(future);
    expect(save.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(save.playerProfile.onboardingCompleted).toBe(true);
    expect('futureField' in save).toBe(false);
  });
});

describe('LocalGameRepository', () => {
  it('returns a default save when storage is empty, and round-trips saves', async () => {
    const repo = new LocalGameRepository(new MemoryKeyValueStore());
    const save = await repo.load();
    expect(save.playerProfile.onboardingCompleted).toBe(false);
    save.playerProfile.onboardingCompleted = true;
    await repo.save(save);
    expect((await repo.load()).playerProfile.onboardingCompleted).toBe(true);
  });

  it('migrates and rewrites an old save on load', async () => {
    const store = new MemoryKeyValueStore();
    store.data.set(SAVE_KEY, JSON.stringify(V1_SAVE));
    const save = await new LocalGameRepository(store).load();
    expect(save.playerProfile.selectedCampusId).toBe('granite-owls');
    expect(JSON.parse(store.data.get(SAVE_KEY) ?? '{}').schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('backs up unreadable JSON and starts fresh', async () => {
    const store = new MemoryKeyValueStore();
    store.data.set(SAVE_KEY, '{not json');
    const save = await new LocalGameRepository(store).load();
    expect(save.playerProfile.onboardingCompleted).toBe(false);
    expect(store.data.get(CORRUPT_BACKUP_KEY)).toBe('{not json');
  });

  it('serializes writes so the last save wins', async () => {
    const store = new MemoryKeyValueStore();
    const repo = new LocalGameRepository(store);
    const a = createDefaultSave();
    const b = { ...a, dailyStreak: 9 };
    await Promise.all([repo.save(a), repo.save(b)]);
    expect(JSON.parse(store.data.get(SAVE_KEY) ?? '{}').dailyStreak).toBe(9);
  });

  it('reset removes stored data', async () => {
    const store = new MemoryKeyValueStore();
    const repo = new LocalGameRepository(store);
    await repo.save({ ...createDefaultSave(), dailyStreak: 3 });
    const fresh = await repo.reset();
    expect(fresh.dailyStreak).toBe(0);
    expect(store.data.has(SAVE_KEY)).toBe(false);
  });
});
