import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { getTrailStop, LEVEL_ORDER } from '@/content/trail';
import { isLevelUnlocked } from '@/features/progression/progression';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

/**
 * Navigation placeholder for a trail stop. The pre-game details (objectives, moves, boosters)
 * and the playable board replace this screen once the game core is built.
 */
export default function LevelPlaceholderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const stop = getTrailStop(id ?? '');
  const unlocked = useGameStore((s) => (stop ? isLevelUnlocked(s.save, stop.id, LEVEL_ORDER) : false));
  const { palette, borderWidth } = useTheme();

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label="Back to the Championship Trail" onPress={() => router.back()} />
        <AppText variant="title" accessibilityRole="header" style={styles.flex}>
          {stop ? `Level ${stop.levelNumber}: ${stop.title}` : 'Level not found'}
        </AppText>
      </View>
      <View style={styles.body}>
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
          ]}
          testID="level-placeholder"
        >
          <AppText variant="heading">
            {stop && unlocked ? 'Gameplay is on the way' : 'This level is locked'}
          </AppText>
          <AppText muted>
            {stop && unlocked
              ? 'The match-three board, objectives and moves for this stop arrive in the next build.'
              : 'Complete the previous stop on the Championship Trail to open this one.'}
          </AppText>
        </View>
        <Button label="Back to the Trail" onPress={() => router.back()} testID="level-back" />
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
  body: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm },
});
