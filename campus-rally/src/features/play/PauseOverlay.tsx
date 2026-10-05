import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { radius, spacing, useTheme } from '@/theme';

interface PauseOverlayProps {
  levelLabel: string;
  objectivesText: string;
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export function PauseOverlay({
  levelLabel,
  objectivesText,
  onResume,
  onRestart,
  onSettings,
  onQuit,
}: PauseOverlayProps) {
  const { palette, borderWidth } = useTheme();
  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <View
        style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth }]}
      >
        <AppText variant="title" align="center" accessibilityRole="header">
          Paused
        </AppText>
        <AppText align="center" muted>
          {levelLabel} · {objectivesText}
        </AppText>
        <Button label="Resume" onPress={onResume} testID="pause-resume" />
        <Button label="Restart level" variant="secondary" onPress={onRestart} testID="pause-restart" />
        <Button label="Settings" variant="secondary" onPress={onSettings} testID="pause-settings" />
        <Button label="Championship Trail" variant="ghost" onPress={onQuit} testID="pause-quit" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3,8,22,0.82)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
});
