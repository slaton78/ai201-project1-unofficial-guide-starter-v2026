import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ObjectiveIcon } from '@/components/ObjectiveIcon';
import { Screen } from '@/components/Screen';
import { Stars } from '@/components/Stars';
import { BOOSTER_INFO } from '@/content/boosters';
import { getLevel, LEVEL_ORDER } from '@/content/levels';
import { getProgress, isLevelUnlocked } from '@/features/progression/progression';
import { startingBoosters } from '@/game/core/level';
import { describeObjective } from '@/game/core/LevelEvaluator';
import { BOOSTER_TYPES } from '@/game/core/types';
import { analytics } from '@/services/analytics';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

export default function LevelPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = getLevel(id ?? '');
  const save = useGameStore((s) => s.save);
  const { palette, borderWidth } = useTheme();

  useEffect(() => {
    if (level) analytics.track('level_selected', { level_id: level.id, mode: 'trail' });
  }, [level]);

  if (!level || !isLevelUnlocked(save, level.id, LEVEL_ORDER)) {
    return (
      <Screen>
        <View style={styles.missing}>
          <AppText variant="heading" align="center">
            This level isn&apos;t available yet.
          </AppText>
          <Button label="Back to the Trail" onPress={() => router.replace('/trail')} />
        </View>
      </Screen>
    );
  }

  const progress = getProgress(save, level.id);
  const tray = startingBoosters(level);
  const trayList = BOOSTER_TYPES.filter((type) => tray[type] > 0);
  const card = { backgroundColor: palette.surface, borderColor: palette.border, borderWidth };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label="Back to the Championship Trail" onPress={() => router.back()} />
        <View style={styles.flex}>
          <AppText variant="caption" muted>
            {level.theme.name}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            Level {level.levelNumber}: {level.title}
          </AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {progress.completed && (
          <View style={styles.best}>
            <Stars count={progress.stars} size={22} />
            <AppText muted>Best: {progress.bestScore.toLocaleString('en-US')}</AppText>
          </View>
        )}

        <View style={[styles.card, card]}>
          <AppText variant="label">Goal</AppText>
          {level.objectives.map((objective) => (
            <View key={describeObjective(objective)} style={styles.objective}>
              <ObjectiveIcon definition={objective} />
              <AppText variant="bodyLarge" style={styles.flex}>
                {describeObjective(objective)}
              </AppText>
            </View>
          ))}
          <AppText muted>
            in <AppText variant="label">{level.moveLimit} moves</AppText>
          </AppText>
        </View>

        {(trayList.length > 0 || level.boosters.unlocked.length > 0) && (
          <View style={[styles.card, card]}>
            <AppText variant="label">Boosters</AppText>
            {trayList.map((type) => (
              <AppText key={type}>
                {BOOSTER_INFO[type].name} ×{tray[type]} in your tray
                {level.boosters.recommended === type ? ' (recommended here)' : ''}
              </AppText>
            ))}
            {level.boosters.unlocked.map((type) => (
              <AppText key={type} variant="caption" muted>
                {BOOSTER_INFO[type].name}: {BOOSTER_INFO[type].comboRule}
              </AppText>
            ))}
          </View>
        )}

        {level.tutorial && (
          <View style={[styles.card, card]}>
            <AppText variant="label">Tips</AppText>
            {level.tutorial.tips.map((tip) => (
              <AppText key={tip} muted>
                • {tip}
              </AppText>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Play"
          onPress={() => router.push({ pathname: '/play/[id]', params: { id: level.id } })}
          testID="level-play"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  best: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  objective: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  missing: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
});
