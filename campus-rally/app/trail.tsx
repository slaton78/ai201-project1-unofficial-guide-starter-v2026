import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { CampusEmblem } from '@/components/CampusEmblem';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { StarIcon, Stars } from '@/components/Stars';
import { getCampus } from '@/content/campuses';
import { LEVEL_ORDER, TRAIL_STOPS } from '@/content/trail';
import { currentLevelId, getProgress, isLevelUnlocked, totalStars } from '@/features/progression/progression';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

const NODE_SIZE = 76;
const LABEL_WIDTH = 160;
/** Horizontal offsets (-1..1 of the available swing) that make the trail wind back and forth. */
const WIND = [0, 0.65, 1, 0.65, 0, -0.65, -1, -0.65];

/** Championship Trail shell: lock state and stars come from the local save. */
export default function TrailScreen() {
  const save = useGameStore((s) => s.save);
  const { palette, borderWidth } = useTheme();
  const { width } = useWindowDimensions();
  const swing = Math.max(0, (Math.min(width, 520) - spacing.lg * 2 - LABEL_WIDTH) / 2);
  const campus = getCampus(save.playerProfile.selectedCampusId);
  const stars = totalStars(save);
  const current = currentLevelId(save, LEVEL_ORDER);

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: palette.border, borderBottomWidth: borderWidth }]}>
        <CampusEmblem campus={campus} size={44} />
        <View style={styles.flex}>
          <AppText variant="bodyLarge" accessibilityRole="header" style={styles.title}>
            Championship Trail
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {campus.name}
          </AppText>
          <View
            style={styles.starTotal}
            accessible
            accessibilityLabel={`${stars} of ${TRAIL_STOPS.length * 3} stars earned`}
          >
            <StarIcon filled size={16} />
            <AppText variant="caption">
              {stars} / {TRAIL_STOPS.length * 3}
            </AppText>
          </View>
        </View>
        <IconButton
          icon="settings"
          label="Settings"
          onPress={() => router.push('/settings')}
          testID="open-settings"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          testID="daily-card"
          accessible
          accessibilityLabel="Daily Challenge. Coming soon."
          style={[
            styles.daily,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
          ]}
        >
          <View style={styles.dailyTop}>
            <AppText variant="bodyLarge">Daily Challenge</AppText>
            <View
              style={[styles.badge, { backgroundColor: palette.surfaceRaised, borderColor: palette.accent }]}
            >
              <AppText variant="caption" color={palette.accent} style={styles.badgeText}>
                Coming Soon
              </AppText>
            </View>
          </View>
          <AppText variant="caption" muted>
            A fresh puzzle every day with streak tracking. Not available in this build.
          </AppText>
        </View>

        {TRAIL_STOPS.map((stop, index) => {
          const progress = getProgress(save, stop.id);
          const unlocked = isLevelUnlocked(save, stop.id, LEVEL_ORDER);
          const isCurrent = stop.id === current && unlocked && !progress.completed;
          const offset = WIND[index % WIND.length] ?? 0;
          const status = progress.completed
            ? `completed, ${progress.stars} of 3 stars`
            : unlocked
              ? 'ready to play'
              : 'locked';
          return (
            <View key={stop.id} style={styles.nodeRow}>
              {index > 0 && (
                <View
                  style={[styles.connector, { backgroundColor: unlocked ? palette.accent : palette.border }]}
                />
              )}
              <View style={{ transform: [{ translateX: offset * swing }], alignItems: 'center' }}>
                <Pressable
                  testID={`trail-${stop.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Level ${stop.levelNumber}, ${stop.title}, ${status}`}
                  accessibilityHint={
                    unlocked ? 'Opens the level' : `Complete level ${stop.levelNumber - 1} to unlock`
                  }
                  accessibilityState={{ disabled: !unlocked }}
                  disabled={!unlocked}
                  onPress={() => router.push({ pathname: '/level/[id]', params: { id: stop.id } })}
                  style={({ pressed }) => [
                    styles.node,
                    {
                      backgroundColor: progress.completed
                        ? campus.colors.primary
                        : unlocked
                          ? palette.surfaceRaised
                          : palette.surface,
                      borderColor: isCurrent
                        ? palette.primary
                        : progress.completed
                          ? campus.colors.secondary
                          : palette.border,
                      borderWidth: isCurrent ? 4 : Math.max(2, borderWidth),
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {unlocked ? (
                    <AppText
                      variant="heading"
                      color={progress.completed ? campus.colors.onPrimary : palette.text}
                    >
                      {stop.levelNumber}
                    </AppText>
                  ) : (
                    <Icon name="lock" color={palette.locked} size={26} />
                  )}
                </Pressable>
                <AppText variant="caption" muted={!unlocked} style={styles.nodeLabel} align="center">
                  {stop.title}
                </AppText>
                {progress.completed ? (
                  <Stars count={progress.stars} size={18} />
                ) : isCurrent ? (
                  <AppText variant="caption" color={palette.primary}>
                    Up next
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}
        <AppText variant="caption" muted align="center" style={styles.more}>
          More stops on the Championship Trail are coming soon.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontWeight: '800' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  starTotal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  daily: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontWeight: '700' },
  nodeRow: { alignItems: 'center' },
  connector: { width: 6, height: 26, borderRadius: 3, marginVertical: 4 },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeLabel: { marginTop: 4, maxWidth: LABEL_WIDTH },
  more: { marginTop: spacing.lg },
});
