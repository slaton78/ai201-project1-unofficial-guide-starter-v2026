import { create } from 'zustand';

import { createDefaultSave } from '@/features/persistence/migrations';
import { logError } from '@/lib/logger';
import { createGameRepository } from '@/repositories';
import type { GameRepository } from '@/repositories';
import type { GameSave, PlayerSettings } from '@/types/save';

export interface GameStoreState {
  hydrated: boolean;
  /** True when no completed onboarding was found at startup. */
  firstLaunch: boolean;
  save: GameSave;
  hydrate(): Promise<void>;
  completeOnboarding(): Promise<void>;
  selectCampus(campusId: string): Promise<void>;
  updateSettings(partial: Partial<PlayerSettings>): Promise<void>;
  resetLocalData(): Promise<void>;
}

let repository: GameRepository | null = null;
const getRepository = (): GameRepository => (repository ??= createGameRepository());

/** Dependency-injection hook (tests, future sync): swap the persistence implementation. */
export function setGameRepository(next: GameRepository): void {
  repository = next;
}

/**
 * App-level state. The whole save lives in memory; every action builds a new save, updates the
 * UI immediately, then awaits the repository write (writes are serialized by the repository).
 */
export const useGameStore = create<GameStoreState>()((set, get) => {
  const commit = async (save: GameSave): Promise<void> => {
    set({ save });
    try {
      await getRepository().save(save);
    } catch (error) {
      logError('persistence', error);
      throw error;
    }
  };

  return {
    hydrated: false,
    firstLaunch: false,
    save: createDefaultSave(),

    async hydrate() {
      if (get().hydrated) return;
      try {
        const save = await getRepository().load();
        set({ save, hydrated: true, firstLaunch: !save.playerProfile.onboardingCompleted });
      } catch (error) {
        logError('persistence', error);
        set({ hydrated: true, firstLaunch: true });
      }
    },

    async completeOnboarding() {
      const { save } = get();
      await commit({ ...save, playerProfile: { ...save.playerProfile, onboardingCompleted: true } });
    },

    async selectCampus(campusId) {
      const { save } = get();
      await commit({ ...save, playerProfile: { ...save.playerProfile, selectedCampusId: campusId } });
    },

    async updateSettings(partial) {
      const { save } = get();
      await commit({
        ...save,
        playerProfile: { ...save.playerProfile, settings: { ...save.playerProfile.settings, ...partial } },
      });
    },

    async resetLocalData() {
      const fresh = await getRepository().reset();
      set({ save: fresh, firstLaunch: true });
    },
  };
});
