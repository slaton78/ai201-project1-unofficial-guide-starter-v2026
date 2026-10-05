import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/Screen';
import { useGameStore } from '@/store/gameStore';

/** Startup: shows the brand mark only while the local save loads, then routes immediately. */
export default function StartupScreen() {
  const hydrated = useGameStore((s) => s.hydrated);
  const profile = useGameStore((s) => s.save.playerProfile);

  if (hydrated) {
    if (!profile.onboardingCompleted) return <Redirect href="/onboarding" />;
    if (!profile.selectedCampusId) return <Redirect href="/campus-select" />;
    return <Redirect href="/trail" />;
  }

  return (
    <Screen>
      <View style={styles.center}>
        <BrandMark size={120} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
