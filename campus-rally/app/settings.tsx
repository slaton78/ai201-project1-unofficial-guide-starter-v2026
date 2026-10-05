import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { CampusEmblem } from '@/components/CampusEmblem';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { SettingRow } from '@/components/SettingRow';
import { getCampus } from '@/content/campuses';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';
import type { PlayerSettings } from '@/types/save';

const TOGGLES: { key: keyof PlayerSettings; label: string; description: string }[] = [
  {
    key: 'musicEnabled',
    label: 'Music',
    description: 'Background music. Saved now; plays once audio is added.',
  },
  {
    key: 'sfxEnabled',
    label: 'Sound effects',
    description: 'Game sounds. Saved now; plays once audio is added.',
  },
  {
    key: 'hapticsEnabled',
    label: 'Haptic feedback',
    description: 'Vibration on supported devices. Saved now; used once gameplay is added.',
  },
  {
    key: 'reduceMotionEnabled',
    label: 'Reduce motion',
    description: 'Turns off screen transition animations.',
  },
  {
    key: 'highContrastEnabled',
    label: 'High contrast',
    description: 'Black background, white text and bolder outlines.',
  },
];

export default function SettingsScreen() {
  const settings = useGameStore((s) => s.save.playerProfile.settings);
  const campusId = useGameStore((s) => s.save.playerProfile.selectedCampusId);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const resetLocalData = useGameStore((s) => s.resetLocalData);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { palette, borderWidth } = useTheme();
  const campus = getCampus(campusId);
  const version = Constants.expoConfig?.version ?? '0.0.0';

  const toggle = (key: keyof PlayerSettings, value: boolean) => {
    void updateSettings({ [key]: value });
  };

  const reset = async () => {
    setResetting(true);
    try {
      await resetLocalData();
      setConfirmVisible(false);
      router.dismissAll();
      router.replace('/onboarding');
    } finally {
      setResetting(false);
    }
  };

  const card = { backgroundColor: palette.surface, borderColor: palette.border, borderWidth };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} testID="settings-back" />
        <AppText variant="title" accessibilityRole="header">
          Settings
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, card]}>
          {TOGGLES.map((t) => (
            <SettingRow
              key={t.key}
              label={t.label}
              description={t.description}
              value={settings[t.key]}
              onChange={(value) => toggle(t.key, value)}
              testID={`toggle-${t.key}`}
            />
          ))}
        </View>

        <View style={[styles.card, card, styles.campusRow]}>
          <CampusEmblem campus={campus} size={48} />
          <View style={styles.flex}>
            <AppText variant="label">{campus.name}</AppText>
            <AppText variant="caption" muted>
              Cosmetic fan identity
            </AppText>
          </View>
          <Button
            label="Change"
            variant="secondary"
            onPress={() => router.push({ pathname: '/campus-select', params: { from: 'settings' } })}
            testID="settings-change-campus"
          />
        </View>

        <View style={[styles.card, card]}>
          <AppText variant="label">Privacy</AppText>
          <AppText variant="caption" muted>
            This prototype stores your progress and settings only on this device. It has no accounts, ads, or
            purchases, and does not send analytics or crash reports. A full privacy policy will be published
            before any public release.
          </AppText>
        </View>

        <View style={[styles.card, card]}>
          <AppText variant="label">Reset local data</AppText>
          <AppText variant="caption" muted>
            Erases onboarding, campus choice, settings, stars and level progress on this device.
          </AppText>
          <Button
            label="Reset prototype data"
            variant="danger"
            onPress={() => setConfirmVisible(true)}
            testID="settings-reset"
          />
        </View>

        <AppText variant="caption" muted align="center">
          Campus Rally v{version} · prototype build · {Platform.OS}
        </AppText>
        <AppText variant="caption" muted align="center">
          An original game. Not affiliated with any school, league, or conference.
        </AppText>
      </ScrollView>

      <ConfirmDialog
        visible={confirmVisible}
        title="Reset all progress?"
        message="This permanently deletes your stars, unlocked levels, campus and settings on this device. This can't be undone."
        confirmLabel="Yes, reset everything"
        destructive
        busy={resetting}
        onConfirm={() => void reset()}
        onCancel={() => setConfirmVisible(false)}
      />
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  campusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
