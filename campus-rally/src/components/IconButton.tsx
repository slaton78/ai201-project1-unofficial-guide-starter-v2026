import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Icon } from './Icon';
import type { IconName } from './Icon';

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  hint?: string;
  testID?: string;
}

/** 48×48 touch target with a required accessibility label. */
export function IconButton({ icon, label, onPress, hint, testID }: IconButtonProps) {
  const { palette, borderWidth } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.surfaceRaised,
          borderColor: palette.border,
          borderWidth,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Icon name={icon} color={palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
