import Svg, { Circle, Polygon } from 'react-native-svg';

import { TOKEN_INFO } from '@/game/core/types';
import type { TokenColor } from '@/game/core/types';
import { shapePoints, TOKEN_ART } from '@/game/shared/tokenArt';

interface TokenGlyphProps {
  color: TokenColor;
  size?: number;
}

/** Small SVG preview of a token (same geometry the Phaser board uses). */
export function TokenGlyph({ color, size = 28 }: TokenGlyphProps) {
  const art = TOKEN_ART[color];
  const r = size / 2;
  const toPoints = (scale: number) =>
    shapePoints(art.shape, r * scale)
      .map((p) => `${(p.x + r).toFixed(2)},${(p.y + r).toFixed(2)}`)
      .join(' ');
  const info = TOKEN_INFO[color];
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessible
      accessibilityLabel={`${info.name}, ${info.shape}`}
    >
      {art.shape === 'circle' ? (
        <>
          <Circle cx={r} cy={r} r={r * 0.92} fill={art.fill} stroke={art.dark} strokeWidth={size * 0.06} />
          <Circle cx={r} cy={r} r={r * 0.4} fill={art.light} />
        </>
      ) : (
        <>
          <Polygon
            points={toPoints(0.88)}
            fill={art.fill}
            stroke={art.dark}
            strokeWidth={size * 0.06}
            strokeLinejoin="round"
          />
          <Polygon points={toPoints(0.4)} fill={art.light} />
        </>
      )}
    </Svg>
  );
}
