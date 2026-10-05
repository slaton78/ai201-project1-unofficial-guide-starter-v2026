import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BrandLogo } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { CampusEmblem } from '@/components/CampusEmblem';
import { Screen } from '@/components/Screen';
import { Stars } from '@/components/Stars';
import { TokenGlyph } from '@/components/TokenGlyph';
import { CAMPUSES } from '@/content/campuses';
import { TOKEN_COLORS } from '@/game/core/types';
import { analytics } from '@/services/analytics';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

interface Slide {
  title: string;
  body: string;
  art: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    title: 'Match tokens. Build momentum.',
    body: 'Swipe a token into a neighbor to line up 3 or more of the same shape. Bigger matches create Rally boosters.',
    art: (
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 260 }}
      >
        {TOKEN_COLORS.map((color) => (
          <TokenGlyph key={color} color={color} size={52} />
        ))}
      </View>
    ),
  },
  {
    title: 'Clear objectives. Earn stars.',
    body: 'Each level has a goal and a move limit. Finish the goal to win, score high for up to 3 stars, and unlock the next stop on the Championship Trail.',
    art: <Stars count={3} size={64} />,
  },
  {
    title: 'Choose your fan identity.',
    body: 'Pick one of five fictional campus fan crews. It’s just for style — you can switch anytime.',
    art: (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {CAMPUSES.map((campus) => (
          <CampusEmblem key={campus.id} campus={campus} size={52} />
        ))}
      </View>
    ),
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const { palette, borderWidth } = useTheme();
  const slide = SLIDES[index] as Slide;
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    analytics.track('onboarding_started', {});
  }, []);

  const finish = async (skipped: boolean) => {
    setBusy(true);
    try {
      await completeOnboarding();
      analytics.track('onboarding_completed', { skipped });
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
          onPress={() => void finish(true)}
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
        <View style={styles.dots} accessible accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
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
          onPress={() => (last ? void finish(false) : setIndex(index + 1))}
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
