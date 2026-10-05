import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  accessibilityHint?: string;
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Large (≥48pt) accessible button used across all screens. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  accessibilityHint,
  disabled,
  busy,
  icon,
  style,
  testID,
}: ButtonProps) {
  const { palette, borderWidth } = useTheme();
  const background =
    variant === 'primary'
      ? palette.primary
      : variant === 'secondary'
        ? palette.surfaceRaised
        : variant === 'danger'
          ? palette.danger
          : 'transparent';
  const foreground = variant === 'primary' || variant === 'danger' ? palette.onPrimary : palette.text;
  const inactive = disabled || busy;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor: variant === 'ghost' || variant === 'secondary' ? palette.border : background,
          borderWidth: variant === 'ghost' || variant === 'secondary' ? borderWidth : 0,
          opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {busy ? <ActivityIndicator color={foreground} /> : icon}
        <AppText variant="label" color={foreground} align="center">
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
