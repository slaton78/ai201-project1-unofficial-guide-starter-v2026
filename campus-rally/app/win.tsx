import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { FAN_BADGES } from '@/content/badges';
import { getCampus } from '@/content/campuses';
import { getLevel, nextLevelId } from '@/content/levels';
import { StarReveal } from '@/features/play/StarReveal';
import { describeObjective } from '@/game/core/LevelEvaluator';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

const clampStars = (value: string | undefined) => Math.max(1, Math.min(3, Number(value) || 1));

export default function WinScreen() {
  const params = useLocalSearchParams<{
    levelId: string;
    score?: string;
    stars?: string;
    bonus?: string;
    mode?: string;
    first?: string;
    badges?: string;
    unlocked?: string;
  }>();
  const level = getLevel(params.levelId ?? '');
  const campusId = useGameStore((s) => s.save.playerProfile.selectedCampusId);
  const campus = getCampus(campusId);
  const { palette, borderWidth } = useTheme();
  const stars = clampStars(params.stars);
  const score = Number(params.score) || 0;
  const bonus = Number(params.bonus) || 0;
  const daily = params.mode === 'daily';
  const badges = FAN_BADGES.filter((b) => (params.badges ?? '').split(',').includes(b.id));
  const next = level ? nextLevelId(level.id) : undefined;
  const unlockedLevel = params.unlocked ? getLevel(params.unlocked) : undefined;
  const card = { backgroundColor: palette.surface, borderColor: palette.border, borderWidth };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption" muted align="center">
          {daily ? 'Daily Practice complete' : `Level ${level?.levelNumber ?? ''} complete`}
        </AppText>
        <AppText variant="display" align="center" accessibilityRole="header">
          {level?.levelNumber === 10 ? 'Rivalry Won!' : 'Rally Won!'}
        </AppText>
        <AppText align="center" muted>
          {campus.rallyCry}
        </AppText>

        <StarReveal stars={stars} />

        <View
          style={[styles.card, card]}
          accessible
          accessibilityLabel={`Score ${score.toLocaleString('en-US')}`}
        >
          <AppText variant="caption" muted align="center">
            Score
          </AppText>
          <AppText variant="title" align="center" testID="win-score">
            {score.toLocaleString('en-US')}
          </AppText>
          {bonus > 0 && (
            <AppText variant="caption" muted align="center">
              Includes Rally Bonus +{bonus.toLocaleString('en-US')} for unused moves
            </AppText>
          )}
        </View>

        {level && (
          <View style={[styles.card, card]}>
            <AppText variant="label">Objectives</AppText>
            {level.objectives.map((o) => (
              <View key={describeObjective(o)} style={styles.line}>
                <Icon name="check" size={20} color={palette.success} />
                <AppText style={styles.flex}>{describeObjective(o)}</AppText>
              </View>
            ))}
          </View>
        )}

        {(badges.length > 0 || unlockedLevel || params.first === '1' || daily) && (
          <View style={[styles.card, card]}>
            <AppText variant="label">Progress</AppText>
            {params.first === '1' && <AppText>First win on this level, saved to your trail.</AppText>}
            {unlockedLevel && (
              <AppText>
                Unlocked Level {unlockedLevel.levelNumber}: {unlockedLevel.title}
              </AppText>
            )}
            {daily && <AppText>Daily streak updated.</AppText>}
            {badges.map((badge) => (
              <View
                key={badge.id}
                style={styles.line}
                accessible
                accessibilityLabel={`New Fan Badge: ${badge.name}. ${badge.description}`}
              >
                <Icon name="flame" size={20} color={palette.primary} />
                <AppText style={styles.flex}>
                  New Fan Badge: <AppText variant="label">{badge.name}</AppText>. {badge.description}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {!daily && next && (
          <Button
            label="Next Level"
            onPress={() => {
              router.dismissTo('/trail');
              router.push({ pathname: '/level/[id]', params: { id: next } });
            }}
            testID="win-next"
          />
        )}
        {level && (
          <Button
            label="Replay"
            variant="secondary"
            onPress={() =>
              router.replace({
                pathname: '/play/[id]',
                params: daily ? { id: level.id, mode: 'daily' } : { id: level.id },
              })
            }
            testID="win-replay"
          />
        )}
        <Button
          label="Championship Trail"
          variant="ghost"
          onPress={() => router.dismissTo('/trail')}
          testID="win-trail"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
});
