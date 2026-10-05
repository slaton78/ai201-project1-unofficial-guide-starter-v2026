import type { BoosterType } from '@/game/core/types';

export const BOOSTER_INFO: Record<BoosterType, { name: string; trayHint: string; comboRule: string }> = {
  lineRally: {
    name: 'Line Rally',
    trayHint: 'Tap a token to clear its whole row.',
    comboRule: 'Match 4 in a line to create one.',
  },
  campusBurst: {
    name: 'Campus Burst',
    trayHint: 'Tap a token to clear the 3×3 area around it.',
    comboRule: 'Match in a T or L shape to create one.',
  },
  colorRally: {
    name: 'Color Rally',
    trayHint: 'Tap a token to clear every token of that type.',
    comboRule: 'Match 5 in a line to create one.',
  },
};
