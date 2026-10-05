import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ObjectiveIcon } from '@/components/ObjectiveIcon';
import { Screen } from '@/components/Screen';
import { getLevel } from '@/content/levels';
import { describeObjective } from '@/game/core/LevelEvaluator';
import { radius, spacing, useTheme } from '@/theme';

const ENCOURAGEMENT = [
  'So close! Every rally builds momentum.',
  'Shake it off — the crowd is still with you.',
  'Good hustle. Fresh board, fresh chances.',
];

export default function LossScreen() {
  const params = useLocalSearchParams<{
    levelId: string;
    score?: string;
    mode?: string;
    progress?: string;
  }>();
  const level = getLevel(params.levelId ?? '');
  const { palette, borderWidth } = useTheme();
  const score = Number(params.score) || 0;
  const progress = (params.progress ?? '').split(',');
  const line = ENCOURAGEMENT[(level?.levelNumber ?? 0) % ENCOURAGEMENT.length];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption" muted align="center">
          Level {level?.levelNumber ?? ''}
        </AppText>
        <AppText variant="display" align="center" accessibilityRole="header">
          Out of moves
        </AppText>
        <AppText variant="bodyLarge" align="center" muted>
          {line}
        </AppText>

        {level && (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
            ]}
          >
            <AppText variant="label">Where you got to</AppText>
            {level.objectives.map((o, i) => (
              <View key={describeObjective(o)} style={styles.line}>
                <ObjectiveIcon definition={o} size={22} />
                <AppText style={styles.flex}>{describeObjective(o)}</AppText>
                <AppText variant="label">{progress[i] ?? ''}</AppText>
              </View>
            ))}
            <AppText muted>Score: {score.toLocaleString('en-US')}</AppText>
            <AppText variant="caption" muted>
              Tip: matches of 4 or 5, or T and L shapes, make boosters that clear lots of tokens at once.
            </AppText>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        {level && (
          <Button
            label="Try Again"
            onPress={() =>
              router.replace({
                pathname: '/play/[id]',
                params: params.mode === 'daily' ? { id: level.id, mode: 'daily' } : { id: level.id },
              })
            }
            testID="loss-retry"
          />
        )}
        <Button
          label="Championship Trail"
          variant="secondary"
          onPress={() => router.dismissTo('/trail')}
          testID="loss-trail"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
});
