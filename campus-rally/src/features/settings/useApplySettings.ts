import { useEffect } from 'react';
import { AppState } from 'react-native';

import { audio } from '@/services/audio';
import { setHapticsEnabled } from '@/services/haptics';
import { useGameStore } from '@/store/gameStore';

/** Pushes persisted player settings into the audio and haptics services, and tracks foreground. */
export function useApplySettings(): void {
  const settings = useGameStore((s) => s.save.playerProfile.settings);
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    setHapticsEnabled(settings.hapticsEnabled);
    audio.configure({ sfxEnabled: settings.sfxEnabled, musicEnabled: settings.musicEnabled });
  }, [hydrated, settings.hapticsEnabled, settings.sfxEnabled, settings.musicEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      audio.setForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);
}
