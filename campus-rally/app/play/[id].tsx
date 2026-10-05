import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, BackHandler, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { getLevel, LEVEL_ORDER } from '@/content/levels';
import { BoosterTray } from '@/features/play/BoosterTray';
import { ObjectiveBar } from '@/features/play/ObjectiveBar';
import { PauseOverlay } from '@/features/play/PauseOverlay';
import { isLevelUnlocked } from '@/features/progression/progression';
import { startingBoosters } from '@/game/core/level';
import { describeObjective, initialObjectiveProgress } from '@/game/core/LevelEvaluator';
import type { ObjectiveProgress } from '@/game/core/LevelEvaluator';
import { BOOSTER_TYPES } from '@/game/core/types';
import type { BoosterType } from '@/game/core/types';
import { nativeMessage } from '@/game/phaser/bridge/protocol';
import type { GameToNativeMessage } from '@/game/phaser/bridge/protocol';
import { useGameBridge } from '@/game/phaser/bridge/useGameBridge';
import { GameContainer } from '@/game/phaser/GameContainer';
import { analytics } from '@/services/analytics';
import type { PlayMode } from '@/services/analytics';
import { audio } from '@/services/audio';
import { errorReporter } from '@/services/errorReporting';
import { triggerHaptic } from '@/services/haptics';
import { useGameStore } from '@/store/gameStore';
import { radius, spacing, useTheme } from '@/theme';

interface Hud {
  movesRemaining: number;
  moveLimit: number;
  score: number;
  objectives: readonly ObjectiveProgress[];
  boosters: Record<BoosterType, number>;
  armed: BoosterType | null;
}

const randomSeed = () => Math.floor(Math.random() * 0xffffffff);

export default function PlayScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string; seed?: string }>();
  const level = getLevel(params.id ?? '');
  const mode: PlayMode = params.mode === 'daily' ? 'daily' : 'trail';
  const save = useGameStore((s) => s.save);
  const settings = save.playerProfile.settings;
  const { palette, borderWidth } = useTheme();

  const initialSeed = useMemo(() => {
    const fromParam = Number(params.seed);
    if (Number.isInteger(fromParam) && fromParam >= 0) return fromParam;
    return level?.seed ?? randomSeed();
  }, [params.seed, level]);

  const [hud, setHud] = useState<Hud | null>(() =>
    level
      ? {
          movesRemaining: level.moveLimit,
          moveLimit: level.moveLimit,
          score: 0,
          objectives: initialObjectiveProgress(level.objectives),
          boosters: startingBoosters(level),
          armed: null,
        }
      : null,
  );
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [boardSize, setBoardSize] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipsVisible, setTipsVisible] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);
  const finishingRef = useRef(false);
  const seedRef = useRef(initialSeed);
  const boostersRef = useRef<Record<BoosterType, number> | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // The bridge forwards to the latest handler through a ref, so the bridge itself stays stable.
  const onMessageRef = useRef<(message: GameToNativeMessage) => void>(() => undefined);
  const forward = useCallback((message: GameToNativeMessage) => onMessageRef.current(message), []);
  const bridge = useGameBridge(forward);

  const finishLevel = useCallback(
    async (message: Extract<GameToNativeMessage, { type: 'LEVEL_WON' | 'LEVEL_LOST' }>) => {
      if (!level || finishingRef.current) return;
      finishingRef.current = true;
      setFinishing(true);
      const { score, stars, movesUsed, objectives, winBonus } = message.payload;
      const objectivesCompleted = objectives.filter((o) => o.completed).length;

      if (message.type === 'LEVEL_LOST') {
        analytics.track('level_failed', {
          level_id: level.id,
          score,
          moves_used: movesUsed,
          objectives_completed: objectivesCompleted,
        });
        router.replace({
          pathname: '/loss',
          params: {
            levelId: level.id,
            score: String(score),
            mode,
            progress: objectives.map((o) => `${o.current}/${o.target}`).join(','),
          },
        });
        return;
      }

      let firstCompletion = false;
      let badges = '';
      let unlocked = '';
      try {
        if (mode === 'trail') {
          const result = await useGameStore
            .getState()
            .recordLevelResult({ levelId: level.id, won: true, score, stars, at: new Date().toISOString() });
          firstCompletion = result.firstCompletion;
          badges = result.newBadges.map((b) => b.id).join(',');
          unlocked = result.unlockedLevelId ?? '';
        } else {
          await useGameStore.getState().recordDailyWin(new Date());
        }
      } catch (error) {
        errorReporter.captureException(error, { area: 'persistence', extra: { phase: 'level-won' } });
      }
      analytics.track('level_completed', {
        level_id: level.id,
        score,
        stars,
        moves_used: movesUsed,
        first_completion: firstCompletion,
        mode,
      });
      router.replace({
        pathname: '/win',
        params: {
          levelId: level.id,
          score: String(score),
          stars: String(stars),
          bonus: String(winBonus),
          mode,
          first: firstCompletion ? '1' : '0',
          badges,
          unlocked,
        },
      });
    },
    [level, mode],
  );

  const onMessage = useCallback(
    (message: GameToNativeMessage) => {
      if (!level) return;
      switch (message.type) {
        case 'GAME_READY': {
          const s = settingsRef.current;
          bridge.send(
            nativeMessage('LOAD_LEVEL', {
              level,
              seed: seedRef.current,
              settings: { reduceMotion: s.reduceMotionEnabled, highContrast: s.highContrastEnabled },
            }),
          );
          bridge.send(nativeMessage('START_LEVEL', {}));
          break;
        }
        case 'LEVEL_STARTED': {
          const snap = message.payload.snapshot;
          boostersRef.current = { ...snap.boosters };
          setHud({
            movesRemaining: snap.movesRemaining,
            moveLimit: snap.moveLimit,
            score: snap.score,
            objectives: snap.objectives,
            boosters: { ...snap.boosters },
            armed: null,
          });
          setStarted(true);
          setGameError(null);
          const attemptPromise =
            mode === 'trail' ? useGameStore.getState().startAttempt(level.id) : Promise.resolve(1);
          void attemptPromise
            .then((attempt) => analytics.track('level_started', { level_id: level.id, attempt, mode }))
            .catch((error: unknown) => errorReporter.captureException(error, { area: 'persistence' }));
          if (level.tutorial)
            analytics.track('tutorial_hint_shown', { level_id: level.id, hint_kind: 'tip' });
          break;
        }
        case 'MOVES_CHANGED':
          setHud((h) =>
            h
              ? { ...h, movesRemaining: message.payload.movesRemaining, moveLimit: message.payload.moveLimit }
              : h,
          );
          break;
        case 'SCORE_CHANGED':
          setHud((h) => (h ? { ...h, score: message.payload.score } : h));
          break;
        case 'OBJECTIVE_PROGRESS_CHANGED': {
          const { objectives, newlyCompleted } = message.payload;
          setHud((h) => (h ? { ...h, objectives } : h));
          for (const index of newlyCompleted) {
            const objective = objectives[index];
            if (!objective) continue;
            analytics.track('objective_completed', {
              level_id: level.id,
              objective_type: objective.definition.type,
            });
            AccessibilityInfo.announceForAccessibility(
              `Objective complete: ${describeObjective(objective.definition)}`,
            );
          }
          break;
        }
        case 'BOOSTER_STATE_CHANGED': {
          const { inventory, armed } = message.payload;
          const previous = boostersRef.current;
          for (const type of BOOSTER_TYPES) {
            if (previous && inventory[type] < previous[type]) {
              analytics.track('booster_used', { level_id: level.id, booster: type });
            }
          }
          boostersRef.current = { ...inventory };
          setHud((h) => (h ? { ...h, boosters: { ...inventory }, armed } : h));
          break;
        }
        case 'HAPTIC_EVENT':
          triggerHaptic(message.payload.kind);
          break;
        case 'SOUND_EVENT':
          audio.play(message.payload.sound);
          break;
        case 'HINT_SHOWN':
          if (message.payload.kind === 'suggested_move') {
            analytics.track('tutorial_hint_shown', { level_id: level.id, hint_kind: 'suggested_move' });
            AccessibilityInfo.announceForAccessibility('Hint: two tokens on the board are highlighted.');
          } else if (message.payload.text) {
            AccessibilityInfo.announceForAccessibility(message.payload.text);
          }
          break;
        case 'LEVEL_WON':
        case 'LEVEL_LOST':
          void finishLevel(message);
          break;
        case 'GAME_ERROR':
          errorReporter.captureException(new Error(message.payload.message), {
            area: 'game',
            extra: { code: message.payload.code },
          });
          if (message.payload.code === 'LEVEL_LOAD_FAILED') setGameError('This level could not be loaded.');
          break;
        case 'GAME_STATE_RESPONSE':
          break;
      }
    },
    [level, mode, finishLevel, bridge],
  );

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const pause = useCallback(() => {
    if (finishingRef.current) return;
    setPaused(true);
    bridge.send(nativeMessage('PAUSE_GAME', {}));
  }, [bridge]);

  const resume = useCallback(() => {
    setPaused(false);
    bridge.send(nativeMessage('RESUME_GAME', {}));
  }, [bridge]);

  // Pause whenever the app leaves the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pause();
    });
    return () => subscription.remove();
  }, [pause]);

  // Android back button opens the pause menu instead of abandoning the level.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        pause();
        return true;
      });
      return () => sub.remove();
    }, [pause]),
  );

  // Visual settings changed (e.g. from the Settings screen while paused).
  useEffect(() => {
    bridge.send(
      nativeMessage('UPDATE_SETTINGS', {
        reduceMotion: settings.reduceMotionEnabled,
        highContrast: settings.highContrastEnabled,
      }),
    );
  }, [bridge, settings.reduceMotionEnabled, settings.highContrastEnabled]);

  if (!level || !hud || (mode === 'trail' && !isLevelUnlocked(save, level.id, LEVEL_ORDER))) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="heading" align="center">
            This level isn&apos;t available.
          </AppText>
          <Button label="Back to the Trail" onPress={() => router.replace('/trail')} />
        </View>
      </Screen>
    );
  }

  const restart = () => {
    analytics.track('level_restarted', {
      level_id: level.id,
      moves_used: hud.moveLimit - hud.movesRemaining,
    });
    seedRef.current = level.seed ?? randomSeed();
    setPaused(false);
    bridge.send(nativeMessage('RESUME_GAME', {}));
    bridge.send(nativeMessage('RESTART_LEVEL', { seed: seedRef.current }));
  };

  const toggleBooster = (type: BoosterType) => {
    const next = hud.armed === type ? null : type;
    bridge.send(nativeMessage('USE_BOOSTER', { booster: next }));
  };

  const trayTypes = BOOSTER_TYPES.filter(
    (type) => level.boosters.unlocked.includes(type) || (level.boosters.starting[type] ?? 0) > 0,
  );
  const tips = level.tutorial?.tips ?? [];
  const lowMoves = hud.movesRemaining <= 3;

  const onBoardAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const size = Math.floor(Math.min(width, height));
    if (size > 0 && Math.abs(size - boardSize) > 2) setBoardSize(size);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <IconButton
          icon="pause"
          label="Pause"
          hint="Opens the pause menu"
          onPress={pause}
          testID="play-pause"
        />
        <View style={styles.headerTitle}>
          <AppText variant="caption" muted numberOfLines={1}>
            {mode === 'daily' ? 'Daily Practice' : level.title}
          </AppText>
          <AppText
            variant="heading"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Level {level.levelNumber}
          </AppText>
        </View>
        <View
          style={[
            styles.stat,
            {
              backgroundColor: palette.surface,
              borderColor: lowMoves ? palette.danger : palette.border,
              borderWidth: lowMoves ? 2 : borderWidth,
            },
          ]}
          accessible
          accessibilityLabel={`${hud.movesRemaining} moves left`}
          accessibilityLiveRegion="polite"
        >
          <AppText variant="caption" muted>
            Moves
          </AppText>
          <AppText variant="heading" color={lowMoves ? palette.danger : palette.text} testID="hud-moves">
            {hud.movesRemaining}
          </AppText>
        </View>
        <View
          style={[
            styles.stat,
            styles.score,
            { backgroundColor: palette.surface, borderColor: palette.border, borderWidth },
          ]}
          accessible
          accessibilityLabel={`Score ${hud.score.toLocaleString('en-US')}`}
        >
          <AppText variant="caption" muted>
            Score
          </AppText>
          <AppText variant="bodyLarge" testID="hud-score">
            {hud.score.toLocaleString('en-US')}
          </AppText>
        </View>
      </View>

      <View style={styles.objectives}>
        <ObjectiveBar objectives={hud.objectives} />
      </View>

      {tips.length > 0 && tipsVisible && (
        <View
          style={[
            styles.tip,
            {
              backgroundColor: palette.surfaceRaised,
              borderColor: palette.accent,
              borderWidth: Math.max(1, borderWidth),
            },
          ]}
        >
          <AppText
            variant="caption"
            style={styles.tipText}
            accessibilityLiveRegion="polite"
            testID="play-tip"
          >
            {tips[tipIndex]}
          </AppText>
          <Button
            label={tipIndex < tips.length - 1 ? 'Next tip' : 'Got it'}
            variant="ghost"
            style={styles.tipButton}
            onPress={() => (tipIndex < tips.length - 1 ? setTipIndex(tipIndex + 1) : setTipsVisible(false))}
            testID="play-tip-next"
          />
        </View>
      )}

      <View style={styles.boardArea} onLayout={onBoardAreaLayout}>
        {boardSize > 0 && (
          <View style={{ width: boardSize, height: boardSize }} accessible={false}>
            <GameContainer onRawMessage={bridge.receive} registerSender={bridge.registerSender} />
          </View>
        )}
        {!started && !gameError && (
          <View style={styles.loading} pointerEvents="none">
            <AppText muted>Setting up the board…</AppText>
          </View>
        )}
        {gameError && (
          <View style={styles.loading}>
            <AppText align="center">{gameError}</AppText>
            <Button label="Back to the Trail" onPress={() => router.replace('/trail')} />
          </View>
        )}
      </View>

      <View style={styles.tray}>
        <BoosterTray
          available={trayTypes}
          inventory={hud.boosters}
          armed={hud.armed}
          disabled={!started || paused || finishing}
          onToggle={toggleBooster}
        />
      </View>

      {paused && (
        <PauseOverlay
          levelLabel={`Level ${level.levelNumber}`}
          objectivesText={hud.objectives.map((o) => describeObjective(o.definition)).join(' · ')}
          onResume={resume}
          onRestart={restart}
          onSettings={() => router.push('/settings')}
          onQuit={() => router.dismissTo('/trail')}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  headerTitle: { flex: 1 },
  stat: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 64,
  },
  score: { minWidth: 92 },
  objectives: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  tip: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    paddingLeft: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: { flex: 1, paddingVertical: spacing.xs },
  tipButton: { minHeight: 44, paddingHorizontal: spacing.md },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  tray: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs },
});
