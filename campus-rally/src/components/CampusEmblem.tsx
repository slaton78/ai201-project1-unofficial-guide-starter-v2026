import Svg, { Circle, G, Path, Polygon } from 'react-native-svg';

import type { Campus, EmblemKind } from '@/content/campuses';

/** Original, abstract geometric emblems. They intentionally avoid any real team or school mark. */
function Glyph({ kind, color }: { kind: EmblemKind; color: string }) {
  switch (kind) {
    case 'fox':
      return (
        <G>
          <Polygon points="30,30 40,48 26,50" fill={color} />
          <Polygon points="70,30 60,48 74,50" fill={color} />
          <Polygon points="26,48 74,48 50,78" fill={color} />
          <Circle cx="41" cy="56" r="3.5" fill="#00000055" />
          <Circle cx="59" cy="56" r="3.5" fill="#00000055" />
        </G>
      );
    case 'comet':
      return (
        <G>
          <Path d="M28 70 L56 44" stroke={color} strokeWidth="6" strokeLinecap="round" opacity={0.55} />
          <Path d="M24 58 L50 36" stroke={color} strokeWidth="4" strokeLinecap="round" opacity={0.4} />
          <Path d="M38 76 L60 54" stroke={color} strokeWidth="4" strokeLinecap="round" opacity={0.4} />
          <Circle cx="62" cy="40" r="13" fill={color} />
        </G>
      );
    case 'owl':
      return (
        <G>
          <Circle cx="38" cy="50" r="12" fill={color} />
          <Circle cx="62" cy="50" r="12" fill={color} />
          <Circle cx="38" cy="50" r="5" fill="#00000066" />
          <Circle cx="62" cy="50" r="5" fill="#00000066" />
          <Polygon points="44,66 56,66 50,76" fill={color} />
        </G>
      );
    case 'spark':
      return <Polygon points="56,22 30,56 48,56 42,80 70,42 52,42" fill={color} />;
    case 'pilot':
      return (
        <G>
          <Polygon points="50,46 14,40 26,52 50,56" fill={color} />
          <Polygon points="50,46 86,40 74,52 50,56" fill={color} />
          <Circle cx="50" cy="51" r="9" fill={color} />
          <Polygon points="44,62 56,62 50,76" fill={color} opacity={0.8} />
        </G>
      );
  }
}

interface CampusEmblemProps {
  campus: Campus;
  size?: number;
}

export function CampusEmblem({ campus, size = 64 }: CampusEmblemProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessible
      accessibilityLabel={`${campus.name} emblem`}
    >
      <Path
        d="M50 4 L92 18 V50 C92 74 72 90 50 98 C28 90 8 74 8 50 V18 Z"
        fill={campus.colors.primary}
        stroke={campus.colors.secondary}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <Glyph kind={campus.emblem} color={campus.colors.secondary} />
    </Svg>
  );
}
