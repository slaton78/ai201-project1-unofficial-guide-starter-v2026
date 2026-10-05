import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ONBOARDING_SLIDES } from '@/features/onboarding/slides';
import type { OnboardingSlide } from '@/features/onboarding/slides';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const { palette, borderWidth } = useTheme();
  const slide = ONBOARDING_SLIDES[index] as OnboardingSlide;
  const last = index === ONBOARDING_SLIDES.length - 1;

  const finish = async () => {
    setBusy(true);
    try {
      await completeOnboarding();
      router.replace({ pathname: '/campus-select', params: { from: 'onboarding' } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.top}>
        <BrandLogo size={44} />
        <Button
          label="Skip"
          variant="ghost"
          onPress={() => void finish()}
          accessibilityHint="Skips the introduction"
          testID="onboarding-skip"
        />
      </View>

      <View style={styles.body}>
        <View
          style={[
            styles.artCard,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
          ]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {slide.art}
        </View>
        <AppText variant="title" align="center" accessibilityRole="header" testID="onboarding-title">
          {slide.title}
        </AppText>
        <AppText variant="bodyLarge" muted align="center">
          {slide.body}
        </AppText>
      </View>

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_SLIDES.length}`}
        >
          {ONBOARDING_SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? palette.primary : palette.border,
                  width: i === index ? 28 : 10,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={last ? 'Choose my campus' : 'Continue'}
          onPress={() => (last ? void finish() : setIndex(index + 1))}
          busy={busy}
          testID="onboarding-continue"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  artCard: {
    alignSelf: 'center',
    minHeight: 180,
    minWidth: 260,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: { height: 10, borderRadius: 5 },
});
