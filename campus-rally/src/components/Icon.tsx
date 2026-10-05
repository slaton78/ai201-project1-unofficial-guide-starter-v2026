import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'back' | 'pause' | 'settings' | 'lock' | 'close' | 'play' | 'flame' | 'check';

/** Minimal original line icons. Decorative: parents provide the accessibility label. */
export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: string }) {
  const stroke = {
    stroke: color,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      {name === 'back' && <Path d="M15 5 L8 12 L15 19" {...stroke} />}
      {name === 'pause' && (
        <>
          <Rect x="6" y="5" width="4" height="14" rx="1" fill={color} />
          <Rect x="14" y="5" width="4" height="14" rx="1" fill={color} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3.2" {...stroke} />
          <Path
            d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"
            {...stroke}
          />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="5" y="11" width="14" height="10" rx="2" fill={color} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...stroke} />
        </>
      )}
      {name === 'close' && <Path d="M6 6 L18 18 M18 6 L6 18" {...stroke} />}
      {name === 'play' && <Path d="M8 5 L19 12 L8 19 Z" fill={color} />}
      {name === 'flame' && (
        <Path
          d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.5 2 3 .2-3-.5-5.5.5-8z"
          fill={color}
        />
      )}
      {name === 'check' && <Path d="M5 12.5 L10 17.5 L19 7" {...stroke} />}
    </Svg>
  );
}
