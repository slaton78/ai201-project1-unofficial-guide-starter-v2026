import { useGameStore } from '@/store/gameStore';

export interface Palette {
  background: string;
  backgroundGlow: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  success: string;
  danger: string;
  locked: string;
  focus: string;
}

/** Default theme: deep navy surfaces, bright accents. Text pairs meet WCAG AA (most AAA). */
export const standardPalette: Palette = {
  background: '#0B1630',
  backgroundGlow: '#1A2C5C',
  surface: '#15244A',
  surfaceRaised: '#1E3262',
  border: '#34508F',
  text: '#F5F7FF',
  textMuted: '#C2CCE6',
  primary: '#FFC94A',
  onPrimary: '#1A1300',
  accent: '#4FD1C5',
  success: '#5DD39E',
  danger: '#FF8A8A',
  locked: '#7F8BAD',
  focus: '#FFFFFF',
};

/** High-contrast theme: pure black/white with a single saturated yellow accent and thick borders. */
export const highContrastPalette: Palette = {
  background: '#000000',
  backgroundGlow: '#000000',
  surface: '#0D0D0D',
  surfaceRaised: '#1A1A1A',
  border: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#F0F0F0',
  primary: '#FFE500',
  onPrimary: '#000000',
  accent: '#00E5FF',
  success: '#7CFF8A',
  danger: '#FF9E9E',
  locked: '#D0D0D0',
  focus: '#FFE500',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;

/** Minimum sizes keep text readable; fonts still scale with the OS text-size setting. */
export const fontSize = {
  caption: 14,
  body: 17,
  bodyLarge: 19,
  heading: 22,
  title: 30,
  display: 38,
} as const;

/** Caps OS font scaling so large Dynamic Type sizes enlarge text without breaking layouts. */
export const MAX_FONT_SCALE = 1.6;

export interface Theme {
  palette: Palette;
  highContrast: boolean;
  borderWidth: number;
}

export function useTheme(): Theme {
  const highContrast = useGameStore((s) => s.save.playerProfile.settings.highContrastEnabled);
  return {
    palette: highContrast ? highContrastPalette : standardPalette,
    highContrast,
    borderWidth: highContrast ? 2 : 1,
  };
}

export function useReduceMotion(): boolean {
  return useGameStore((s) => s.save.playerProfile.settings.reduceMotionEnabled);
}
