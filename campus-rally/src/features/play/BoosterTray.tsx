import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { BOOSTER_INFO } from '@/content/boosters';
import type { BoosterType } from '@/game/core/types';
import { radius, spacing, useTheme } from '@/theme';

function BoosterIcon({ type, color }: { type: BoosterType; color: string }) {
  return (
    <Svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      {type === 'lineRally' && (
        <>
          <Rect x="2" y="10" width="20" height="4" rx="2" fill={color} />
          <Path
            d="M2 12 L6 8 M2 12 L6 16 M22 12 L18 8 M22 12 L18 16"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {type === 'campusBurst' && (
        <>
          <Circle cx="12" cy="12" r="4" fill={color} />
          <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" fill="none" />
        </>
      )}
      {type === 'colorRally' && (
        <>
          <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Circle
              key={i}
              cx={12 + Math.cos((i * Math.PI) / 3) * 5}
              cy={12 + Math.sin((i * Math.PI) / 3) * 5}
              r="1.8"
              fill={color}
            />
          ))}
        </>
      )}
    </Svg>
  );
}

interface BoosterTrayProps {
  available: readonly BoosterType[];
  inventory: Readonly<Record<BoosterType, number>>;
  armed: BoosterType | null;
  disabled: boolean;
  onToggle: (type: BoosterType) => void;
}

/** Free, per-level boosters. Nothing here is ever sold. */
export function BoosterTray({ available, inventory, armed, disabled, onToggle }: BoosterTrayProps) {
  const { palette, borderWidth } = useTheme();
  if (available.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.row} accessibilityRole="toolbar" accessibilityLabel="Boosters">
        {available.map((type) => {
          const count = inventory[type];
          const isArmed = armed === type;
          const empty = count <= 0;
          const info = BOOSTER_INFO[type];
          return (
            <Pressable
              key={type}
              testID={`booster-${type}`}
              disabled={disabled || (empty && !isArmed)}
              onPress={() => onToggle(type)}
              accessibilityRole="button"
              accessibilityLabel={`${info.name}, ${count} left`}
              accessibilityHint={isArmed ? 'Cancels aiming' : info.trayHint}
              accessibilityState={{ selected: isArmed, disabled: disabled || (empty && !isArmed) }}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: isArmed ? palette.primary : palette.surfaceRaised,
                  borderColor: isArmed ? palette.primary : palette.border,
                  borderWidth: isArmed ? 2 : borderWidth,
                  opacity: empty && !isArmed ? 0.45 : pressed ? 0.8 : 1,
                },
              ]}
            >
              <BoosterIcon type={type} color={isArmed ? palette.onPrimary : palette.text} />
              <AppText
                variant="caption"
                color={isArmed ? palette.onPrimary : palette.text}
                style={styles.name}
                numberOfLines={1}
              >
                {info.name}
              </AppText>
              <View
                style={[styles.badge, { backgroundColor: isArmed ? palette.onPrimary : palette.background }]}
              >
                <AppText
                  variant="caption"
                  color={isArmed ? palette.primary : palette.text}
                  style={styles.count}
                >
                  {count}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      {armed && (
        <AppText variant="caption" align="center" accessibilityLiveRegion="polite">
          {BOOSTER_INFO[armed].trayHint} Tap the booster again to cancel.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  button: {
    flex: 1,
    maxWidth: 140,
    minHeight: 56,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  name: { flex: 1, fontWeight: '700' },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  count: { fontWeight: '800' },
});
