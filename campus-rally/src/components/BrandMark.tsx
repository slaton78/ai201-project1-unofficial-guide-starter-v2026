import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { spacing } from '@/theme';

import { AppText } from './AppText';

/** The Campus Rally mark: an original pennant-and-star badge. */
export function BrandLogo({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible accessibilityLabel="Campus Rally logo">
      <Circle cx="50" cy="50" r="46" fill="#15244A" stroke="#FFC94A" strokeWidth="5" />
      <Path d="M30 24 L30 80" stroke="#F5F7FF" strokeWidth="5" strokeLinecap="round" />
      <Polygon points="32,26 78,40 32,56" fill="#4FD1C5" />
      <Polygon
        points="52,64 55.5,72 64,72.5 57.5,78 59.8,86 52,81.5 44.2,86 46.5,78 40,72.5 48.5,72"
        fill="#FFC94A"
      />
    </Svg>
  );
}

export function BrandMark({ size = 96, showTagline = true }: { size?: number; showTagline?: boolean }) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel="Campus Rally">
      <BrandLogo size={size} />
      <AppText variant="display" align="center">
        Campus Rally
      </AppText>
      {showTagline && (
        <AppText variant="bodyLarge" muted align="center">
          Match. Rally. Build your campus legacy.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
});
