import { StyleSheet, Text } from 'react-native';
import type { TextProps } from 'react-native';

import { fontSize, MAX_FONT_SCALE, useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyLarge' | 'caption' | 'label';

interface AppTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** Text with the app's type scale, theme color, and capped (but enabled) font scaling. */
export function AppText({ variant = 'body', muted, color, align, style, ...rest }: AppTextProps) {
  const { palette } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        styles[variant],
        { color: color ?? (muted ? palette.textMuted : palette.text) },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize.display, fontWeight: '900', letterSpacing: 0.5 },
  title: { fontSize: fontSize.title, fontWeight: '800' },
  heading: { fontSize: fontSize.heading, fontWeight: '800' },
  bodyLarge: { fontSize: fontSize.bodyLarge, fontWeight: '600' },
  body: { fontSize: fontSize.body, lineHeight: 24 },
  caption: { fontSize: fontSize.caption, lineHeight: 19 },
  label: { fontSize: fontSize.body, fontWeight: '700' },
});
