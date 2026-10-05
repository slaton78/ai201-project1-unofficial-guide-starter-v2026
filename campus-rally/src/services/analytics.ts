import type { ObjectiveType } from '@/game/core/level';
import type { BoosterType } from '@/game/core/types';
import { readPublicEnv } from '@/lib/env';
import type { PlayerSettings } from '@/types/save';

/**
 * Typed analytics taxonomy (documented in docs/architecture.md → Analytics).
 * Properties are deliberately minimal and non-sensitive: no names, contacts, location,
 * device identifiers, or free text. Level ids and counts only.
 */
export interface AnalyticsEvents {
  app_opened: { first_launch: boolean };
  onboarding_started: Record<string, never>;
  onboarding_completed: { skipped: boolean };
  campus_selected: { campus_id: string; source: 'onboarding' | 'settings' };
  trail_viewed: { levels_completed: number; total_stars: number };
  level_selected: { level_id: string; mode: PlayMode };
  level_started: { level_id: string; attempt: number; mode: PlayMode };
  level_restarted: { level_id: string; moves_used: number };
  level_failed: { level_id: string; score: number; moves_used: number; objectives_completed: number };
  level_completed: {
    level_id: string;
    score: number;
    stars: number;
    moves_used: number;
    first_completion: boolean;
    mode: PlayMode;
  };
  booster_used: { level_id: string; booster: BoosterType };
  objective_completed: { level_id: string; objective_type: ObjectiveType };
  tutorial_hint_shown: { level_id: string; hint_kind: 'tip' | 'suggested_move' };
  settings_changed: { setting: keyof PlayerSettings; enabled: boolean };
  local_data_reset: Record<string, never>;
}

export type PlayMode = 'trail' | 'daily';
export type AnalyticsEventName = keyof AnalyticsEvents;

export interface AnalyticsClient {
  readonly enabled: boolean;
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]): void;
}

/** Default client: does nothing (optionally echoes events in development builds). */
export class NoopAnalytics implements AnalyticsClient {
  readonly enabled = false;
  constructor(private readonly debugLog = false) {}
  track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]): void {
    if (this.debugLog) console.info(`[analytics:noop] ${event}`, properties);
  }
}

/**
 * Chooses the analytics client. PostHog is NOT bundled in this prototype: even with
 * EXPO_PUBLIC_POSTHOG_KEY set we stay on the no-op client and log a notice, rather than
 * pretending events are delivered. See docs/backend-roadmap.md → "Analytics".
 */
export function createAnalytics(): AnalyticsClient {
  const env = readPublicEnv();
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (env.posthogKey && dev) {
    console.info('[analytics] EXPO_PUBLIC_POSTHOG_KEY is set, but the PostHog SDK is not installed yet.');
  }
  return new NoopAnalytics(dev);
}

export const analytics: AnalyticsClient = createAnalytics();
