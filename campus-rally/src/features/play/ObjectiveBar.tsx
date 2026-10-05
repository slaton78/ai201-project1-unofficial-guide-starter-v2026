import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { ObjectiveIcon } from '@/components/ObjectiveIcon';
import { describeObjective, describeObjectiveShort } from '@/game/core/LevelEvaluator';
import type { ObjectiveProgress } from '@/game/core/LevelEvaluator';
import { radius, spacing, useTheme } from '@/theme';

/** Compact objective progress. Each item is announced as text, e.g. "Rally Tiles: 12 of 20". */
export function ObjectiveBar({ objectives }: { objectives: readonly ObjectiveProgress[] }) {
  const { palette, borderWidth } = useTheme();
  return (
    <View style={styles.row}>
      {objectives.map((o) => {
        const fraction = o.target > 0 ? Math.min(1, o.current / o.target) : 0;
        return (
          <View
            key={describeObjective(o.definition)}
            accessible
            accessibilityLabel={`${describeObjective(o.definition)}. ${o.current.toLocaleString('en-US')} of ${o.target.toLocaleString('en-US')}${o.completed ? ', complete' : ''}`}
            style={[
              styles.item,
              {
                backgroundColor: palette.surface,
                borderColor: o.completed ? palette.success : palette.border,
                borderWidth: o.completed ? 2 : borderWidth,
              },
            ]}
          >
            <View style={styles.top}>
              <ObjectiveIcon definition={o.definition} size={22} />
              <AppText variant="caption" style={styles.label} numberOfLines={1}>
                {describeObjectiveShort(o.definition)}
              </AppText>
              {o.completed ? (
                <Icon name="check" size={20} color={palette.success} />
              ) : (
                <AppText variant="caption">
                  {o.current.toLocaleString('en-US')}/{o.target.toLocaleString('en-US')}
                </AppText>
              )}
            </View>
            <View style={[styles.track, { backgroundColor: palette.surfaceRaised }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${fraction * 100}%`,
                    backgroundColor: o.completed ? palette.success : palette.accent,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  item: { flex: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
