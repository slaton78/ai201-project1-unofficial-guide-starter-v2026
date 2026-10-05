import { Modal, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-app confirmation (same behavior on iOS, Android and web, unlike native alerts). */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { palette, borderWidth } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
          ]}
        >
          <AppText variant="heading">{title}</AppText>
          <AppText muted>{message}</AppText>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} testID="confirm-cancel" />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              busy={busy}
              testID="confirm-accept"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
