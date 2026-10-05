import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CampusEmblem } from '@/components/CampusEmblem';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { CAMPUSES, DEFAULT_CAMPUS_ID, getCampus } from '@/content/campuses';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

export default function CampusSelectScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromSettings = from === 'settings';
  const current = useGameStore((s) => s.save.playerProfile.selectedCampusId);
  const selectCampus = useGameStore((s) => s.selectCampus);
  const [selected, setSelected] = useState(current ?? DEFAULT_CAMPUS_ID);
  const [busy, setBusy] = useState(false);
  const { palette, borderWidth } = useTheme();

  const confirm = async () => {
    setBusy(true);
    try {
      await selectCampus(selected);
      if (fromSettings && router.canGoBack()) router.back();
      else router.replace('/trail');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        {fromSettings && <IconButton icon="back" label="Back" onPress={() => router.back()} />}
        <View style={{ flex: 1 }}>
          <AppText variant="title" accessibilityRole="header">
            Pick your fan crew
          </AppText>
        </View>
      </View>
      <AppText muted style={styles.note} testID="campus-cosmetic-note">
        Cosmetic only: your campus sets your colors and emblem, not gameplay. You can change it anytime in
        Settings. All campuses are fictional.
      </AppText>

      <ScrollView contentContainerStyle={styles.list} accessibilityRole="radiogroup">
        {CAMPUSES.map((campus) => {
          const isSelected = campus.id === selected;
          return (
            <Pressable
              key={campus.id}
              testID={`campus-${campus.id}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={`${campus.name}. ${campus.description}`}
              onPress={() => setSelected(campus.id)}
              style={[
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: isSelected ? palette.primary : palette.border,
                  borderWidth: isSelected ? 3 : borderWidth,
                },
              ]}
            >
              <CampusEmblem campus={campus} size={64} />
              <View style={styles.cardText}>
                <AppText variant="bodyLarge">{campus.name}</AppText>
                <AppText variant="caption" muted>
                  {campus.description}
                </AppText>
                <View
                  style={styles.swatches}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  <View style={[styles.swatch, { backgroundColor: campus.colors.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: campus.colors.secondary }]} />
                </View>
              </View>
              <AppText variant="label" color={isSelected ? palette.primary : palette.textMuted}>
                {isSelected ? 'Selected' : ''}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={`Join the ${getCampus(selected).name}`}
          onPress={() => void confirm()}
          busy={busy}
          testID="campus-confirm"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  note: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    minHeight: 88,
  },
  cardText: { flex: 1, gap: 2 },
  swatches: { flexDirection: 'row', gap: 6, marginTop: 4 },
  swatch: { width: 22, height: 10, borderRadius: 5 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm },
});
