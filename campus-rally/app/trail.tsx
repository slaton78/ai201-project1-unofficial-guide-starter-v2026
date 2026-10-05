import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CampusEmblem } from '@/components/CampusEmblem';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { Stars } from '@/components/Stars';
import { getCampus } from '@/content/campuses';
import { LEVEL_ORDER, LEVELS } from '@/content/levels';
import { dailyPractice } from '@/features/progression/daily';
import {
  completedCount,
  currentLevelId,
  getProgress,
  isLevelUnlocked,
  totalStars,
  visibleStreak,
} from '@/features/progression/progression';
import { analytics } from '@/services/analytics';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

const NODE_SIZE = 76;
/** Horizontal offsets (-1..1 of the available swing) that make the trail wind back and forth. */
const WIND = [0, 0.65, 1, 0.65, 0, -0.65, -1, -0.65];
const LABEL_WIDTH = 160;

export default function TrailScreen() {
  const save = useGameStore((s) => s.save);
  const { palette, borderWidth } = useTheme();
  const { width } = useWindowDimensions();
  const swing = Math.max(0, (Math.min(width, 520) - spacing.lg * 2 - LABEL_WIDTH) / 2);
  const campus = getCampus(save.playerProfile.selectedCampusId);
  const stars = totalStars(save);
  const current = currentLevelId(save, LEVEL_ORDER);
  const today = useMemo(() => new Date(), []);
  const daily = dailyPractice(save, LEVEL_ORDER, today);
  const streak = visibleStreak(save, today);
  const dailyDone = save.lastDailyChallengeDate === daily.dateKey;

  useFocusEffect(
    useCallback(() => {
      const s = useGameStore.getState().save;
      analytics.track('trail_viewed', { levels_completed: completedCount(s), total_stars: totalStars(s) });
    }, []),
  );

  return (
    <Screen>
      <View style={[styles.header, { borderBottomColor: palette.border, borderBottomWidth: borderWidth }]}>
        <CampusEmblem campus={campus} size={52} />
        <View style={{ flex: 1 }}>
          <AppText
            variant="heading"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            Championship Trail
          </AppText>
          <AppText variant="caption" muted>
            {campus.name} · {campus.rallyCry}
          </AppText>
        </View>
        <View
          style={styles.starTotal}
          accessible
          accessibilityLabel={`${stars} of ${LEVELS.length * 3} stars earned`}
        >
          <Stars count={1} size={18} />
          <AppText variant="label">{stars}</AppText>
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
          style={[
            styles.daily,
            {
              backgroundColor: palette.surface,
              borderColor: palette.accent,
              borderWidth: Math.max(2, borderWidth),
            },
          ]}
        >
          <View style={styles.dailyTop}>
            <AppText variant="bodyLarge">Daily Practice</AppText>
            <View
              style={styles.streak}
              accessible
              accessibilityLabel={`Daily streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
            >
              <Icon name="flame" size={20} color={palette.primary} />
              <AppText variant="label">{streak}</AppText>
            </View>
          </View>
          <AppText variant="caption" muted>
            A fresh, date-seeded board of a level you&apos;ve already beaten. Practice only — daily rewards
            are coming soon.
          </AppText>
          <Button
            label={dailyDone ? 'Practice again' : "Play today's practice"}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/play/[id]',
                params: { id: daily.levelId, mode: 'daily', seed: String(daily.seed) },
              })
            }
            testID="daily-practice"
          />
        </View>

        {LEVELS.map((level, index) => {
          const progress = getProgress(save, level.id);
          const unlocked = isLevelUnlocked(save, level.id, LEVEL_ORDER);
          const isCurrent = level.id === current && unlocked && !progress.completed;
          const offset = WIND[index % WIND.length] ?? 0;
          const status = progress.completed
            ? `completed, ${progress.stars} of 3 stars`
            : unlocked
              ? 'ready to play'
              : 'locked';
          return (
            <View key={level.id} style={styles.nodeRow}>
              {index > 0 && (
                <View
                  style={[styles.connector, { backgroundColor: unlocked ? palette.accent : palette.border }]}
                />
              )}
              <View style={{ transform: [{ translateX: offset * swing }], alignItems: 'center' }}>
                <Pressable
                  testID={`trail-${level.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Level ${level.levelNumber}, ${level.title}, ${status}`}
                  accessibilityHint={
                    unlocked ? 'Opens the level details' : `Complete level ${level.levelNumber - 1} to unlock`
                  }
                  accessibilityState={{ disabled: !unlocked }}
                  disabled={!unlocked}
                  onPress={() => router.push({ pathname: '/level/[id]', params: { id: level.id } })}
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
                      {level.levelNumber}
                    </AppText>
                  ) : (
                    <Icon name="lock" color={palette.locked} size={26} />
                  )}
                </Pressable>
                <AppText variant="caption" muted={!unlocked} style={styles.nodeLabel} align="center">
                  {level.title}
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
        <AppText variant="caption" muted align="center" style={{ marginTop: spacing.lg }}>
          More stops on the Championship Trail are coming soon.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  starTotal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, alignItems: 'stretch' },
  daily: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, marginBottom: spacing.xl },
  dailyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
});
