import { Stack } from 'expo-router';
import type { ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { logError } from '@/lib/logger';
import { useGameStore } from '@/store/gameStore';
import { spacing, standardPalette, useReduceMotion, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Root navigation shell: loads the local save once, then hides the native splash. */
export default function RootLayout() {
  const hydrated = useGameStore((s) => s.hydrated);
  const { palette } = useTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: reduceMotion ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

/** Last-resort screen for render errors. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    logError('render', error);
  }, [error]);
  return (
    <View style={styles.error}>
      <AppText variant="heading" align="center" color={standardPalette.text}>
        Something went sideways.
      </AppText>
      <AppText align="center" color={standardPalette.textMuted}>
        Your progress is saved on this device. Try again to get back in.
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
