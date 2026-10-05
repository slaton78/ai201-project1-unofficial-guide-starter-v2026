import { completedCount, getProgress, totalStars } from '@/features/progression/progression';
import type { GameSave } from '@/types/save';

/**
 * Fan Badges are derived from progress (nothing extra is stored), so they can never drift out
 * of sync with the save and need no migration.
 */
export interface FanBadge {
  id: string;
  name: string;
  description: string;
  earned: (save: GameSave) => boolean;
}

const completed = (levelId: string) => (save: GameSave) => getProgress(save, levelId).completed;

export const FAN_BADGES: readonly FanBadge[] = [
  {
    id: 'first-rally',
    name: 'First Rally',
    description: 'Win your first level.',
    earned: (s) => completedCount(s) >= 1,
  },
  {
    id: 'hat-trick',
    name: 'Hat Trick',
    description: 'Earn 3 stars on any level.',
    earned: (s) => Object.values(s.levelProgressById).some((p) => p.stars === 3),
  },
  {
    id: 'block-buster',
    name: 'Block Buster',
    description: 'Clear the Penalty Block level (Level 4).',
    earned: completed('level-004'),
  },
  {
    id: 'halfway-hero',
    name: 'Halfway Hero',
    description: 'Complete Level 5.',
    earned: completed('level-005'),
  },
  {
    id: 'star-collector',
    name: 'Star Collector',
    description: 'Collect 15 stars.',
    earned: (s) => totalStars(s) >= 15,
  },
  {
    id: 'rivalry-ready',
    name: 'Rivalry Ready',
    description: 'Win the Rivalry Rush (Level 10).',
    earned: completed('level-010'),
  },
  {
    id: 'trail-legend',
    name: 'Trail Legend',
    description: 'Collect all 30 stars.',
    earned: (s) => totalStars(s) >= 30,
  },
];

export function earnedBadges(save: GameSave): FanBadge[] {
  return FAN_BADGES.filter((badge) => badge.earned(save));
}

export function newlyEarnedBadges(before: GameSave, after: GameSave): FanBadge[] {
  const had = new Set(earnedBadges(before).map((b) => b.id));
  return earnedBadges(after).filter((b) => !had.has(b.id));
}
