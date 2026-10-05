import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useApplySettings } from '@/features/settings/useApplySettings';
import { analytics } from '@/services/analytics';
import { errorReporter } from '@/services/errorReporting';
import { useGameStore } from '@/store/gameStore';
import { spacing, standardPalette, useReduceMotion, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const hydrated = useGameStore((s) => s.hydrated);
  const { palette } = useTheme();
  const reduceMotion = useReduceMotion();
  useApplySettings();

  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => undefined);
    analytics.track('app_opened', { first_launch: useGameStore.getState().firstLaunch });
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: reduceMotion ? 'none' : 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="play/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="win"
          options={{ gestureEnabled: false, animation: reduceMotion ? 'none' : 'fade' }}
        />
        <Stack.Screen
          name="loss"
          options={{ gestureEnabled: false, animation: reduceMotion ? 'none' : 'fade' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

/** Last-resort screen for render errors; reports the error and offers a retry. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    errorReporter.captureException(error, { area: 'render' });
  }, [error]);
  return (
    <View style={styles.error}>
      <AppText variant="heading" align="center" color={standardPalette.text}>
        Something went sideways.
      </AppText>
      <AppText align="center" color={standardPalette.textMuted}>
        Your progress is saved on this device. Try again to get back in the game.
      </AppText>
      <Button label="Try again" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: standardPalette.background,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
