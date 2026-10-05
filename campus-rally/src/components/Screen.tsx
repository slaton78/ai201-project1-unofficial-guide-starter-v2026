import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Full-screen container that respects safe-area insets and draws the stadium-light backdrop. */
export function Screen({ children, edges = ['top', 'bottom', 'left', 'right'], style }: ScreenProps) {
  const { palette, highContrast } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {!highContrast && (
        <View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: palette.backgroundGlow }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        />
      )}
      <SafeAreaView edges={edges} style={[styles.content, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  glow: {
    position: 'absolute',
    top: -220,
    alignSelf: 'center',
    width: 520,
    height: 420,
    borderRadius: 260,
    opacity: 0.55,
  },
  content: { flex: 1 },
});
