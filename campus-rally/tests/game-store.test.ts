import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalGameRepository, MemoryKeyValueStore, SAVE_KEY } from '@/repositories/LocalGameRepository';

// The store imports the AsyncStorage-backed factory; tests inject an in-memory repository instead.
vi.mock('@/repositories', () => ({ createGameRepository: () => null }));

const { setGameRepository, useGameStore } = await import('@/store/gameStore');

let store: MemoryKeyValueStore;

beforeEach(() => {
  store = new MemoryKeyValueStore();
  setGameRepository(new LocalGameRepository(store));
  useGameStore.setState({ hydrated: false, firstLaunch: false });
});

const persisted = () => JSON.parse(store.data.get(SAVE_KEY) ?? '{}');

describe('game store', () => {
  it('hydrates a first launch with defaults', async () => {
    await useGameStore.getState().hydrate();
    const state = useGameStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.firstLaunch).toBe(true);
    expect(state.save.playerProfile.onboardingCompleted).toBe(false);
  });

  it('persists onboarding, campus choice and settings', async () => {
    await useGameStore.getState().hydrate();
    await useGameStore.getState().completeOnboarding();
    await useGameStore.getState().selectCampus('solstice-sparks');
    await useGameStore.getState().updateSettings({ highContrastEnabled: true, musicEnabled: false });
    expect(persisted().playerProfile).toMatchObject({
      onboardingCompleted: true,
      selectedCampusId: 'solstice-sparks',
      settings: { highContrastEnabled: true, musicEnabled: false, sfxEnabled: true },
    });

    // A "restart": fresh in-memory state, same storage.
    useGameStore.setState({ hydrated: false });
    await useGameStore.getState().hydrate();
    expect(useGameStore.getState().firstLaunch).toBe(false);
    expect(useGameStore.getState().save.playerProfile.selectedCampusId).toBe('solstice-sparks');
  });

  it('reset clears stored data and returns to first-launch state', async () => {
    await useGameStore.getState().hydrate();
    await useGameStore.getState().completeOnboarding();
    await useGameStore.getState().resetLocalData();
    expect(store.data.has(SAVE_KEY)).toBe(false);
    expect(useGameStore.getState().firstLaunch).toBe(true);
    expect(useGameStore.getState().save.playerProfile.onboardingCompleted).toBe(false);
  });
});
