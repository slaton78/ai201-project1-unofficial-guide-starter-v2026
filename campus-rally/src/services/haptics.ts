import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

let enabled = true;

/** Haptics are optional: controlled by the player setting and silently skipped where unsupported. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function triggerHaptic(kind: HapticKind): void {
  if (!enabled || Platform.OS === 'web') return;
  const run = (): Promise<void> => {
    switch (kind) {
      case 'selection':
        return Haptics.selectionAsync();
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run().catch(() => undefined);
}
