import { create } from 'zustand';

import { newlyEarnedBadges } from '@/content/badges';
import type { FanBadge } from '@/content/badges';
import { LEVEL_ORDER } from '@/content/levels';
import { createDefaultSave } from '@/features/persistence/migrations';
import {
  applyLevelResult,
  recordAttemptStart,
  recordDailyPractice,
} from '@/features/progression/progression';
import type { LevelResult } from '@/features/progression/progression';
import { createGameRepository } from '@/repositories';
import type { GameRepository } from '@/repositories';
import { errorReporter } from '@/services/errorReporting';
import type { GameSave, PlayerSettings } from '@/types/save';

export interface RecordedResult {
  firstCompletion: boolean;
  newBestScore: boolean;
  unlockedLevelId: string | null;
  newBadges: FanBadge[];
}

interface GameStoreState {
  hydrated: boolean;
  /** True on the very first launch (no save existed before this session). */
  firstLaunch: boolean;
  save: GameSave;
  hydrate(): Promise<void>;
  completeOnboarding(): Promise<void>;
  selectCampus(campusId: string): Promise<void>;
  updateSettings(partial: Partial<PlayerSettings>): Promise<void>;
  startAttempt(levelId: string): Promise<number>;
  recordLevelResult(result: LevelResult): Promise<RecordedResult>;
  recordDailyWin(today: Date): Promise<void>;
  resetLocalData(): Promise<void>;
}

let repository: GameRepository = createGameRepository();

/** Test/DI hook: swap the persistence implementation (e.g. an in-memory repository). */
export function setGameRepository(next: GameRepository): void {
  repository = next;
}

export const useGameStore = create<GameStoreState>()((set, get) => {
  /** Updates memory first (UI stays responsive), then persists. Rejects if the write fails. */
  const commit = async (save: GameSave): Promise<void> => {
    set({ save });
    try {
      await repository.save(save);
    } catch (error) {
      errorReporter.captureException(error, { area: 'persistence' });
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
        const save = await repository.load();
        set({ save, hydrated: true, firstLaunch: !save.playerProfile.onboardingCompleted });
      } catch (error) {
        errorReporter.captureException(error, { area: 'persistence', extra: { phase: 'hydrate' } });
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
        playerProfile: {
          ...save.playerProfile,
          settings: { ...save.playerProfile.settings, ...partial },
        },
      });
    },

    async startAttempt(levelId) {
      const next = recordAttemptStart(get().save, levelId);
      await commit(next);
      return next.levelProgressById[levelId]?.attempts ?? 1;
    },

    async recordLevelResult(result) {
      const before = get().save;
      const applied = applyLevelResult(before, result, LEVEL_ORDER);
      await commit(applied.save);
      return {
        firstCompletion: applied.firstCompletion,
        newBestScore: applied.newBestScore,
        unlockedLevelId: applied.unlockedLevelId,
        newBadges: newlyEarnedBadges(before, applied.save),
      };
    },

    async recordDailyWin(today) {
      await commit(recordDailyPractice(get().save, today));
    },

    async resetLocalData() {
      const fresh = await repository.reset();
      set({ save: fresh, firstLaunch: true });
    },
  };
});

export const selectSettings = (state: GameStoreState): PlayerSettings => state.save.playerProfile.settings;
