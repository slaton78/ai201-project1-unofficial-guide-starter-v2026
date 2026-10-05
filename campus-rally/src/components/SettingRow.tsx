import { StyleSheet, Switch, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

interface SettingRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

/** Labeled switch; the whole row is one accessible "switch" element with an on/off state. */
export function SettingRow({ label, description, value, onChange, testID }: SettingRowProps) {
  const { palette, borderWidth } = useTheme();
  return (
    <View
      style={[styles.row, { borderBottomColor: palette.border, borderBottomWidth: borderWidth }]}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onChange(!value)}
    >
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" muted>
          {description}
        </AppText>
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.surfaceRaised, true: palette.accent }}
        thumbColor={value ? palette.text : palette.textMuted}
        ios_backgroundColor={palette.surfaceRaised}
        importantForAccessibility="no"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  text: { flex: 1, gap: 2 },
});
