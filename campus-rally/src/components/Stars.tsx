import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { useTheme } from '@/theme';

const STAR = '12,1.5 15,8.5 22.5,9.2 16.8,14.2 18.6,21.6 12,17.6 5.4,21.6 7.2,14.2 1.5,9.2 9,8.5';

export function StarIcon({ filled, size = 20 }: { filled: boolean; size?: number }) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon
        points={STAR}
        fill={filled ? palette.primary : 'transparent'}
        stroke={filled ? palette.primary : palette.locked}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three-star rating. Announced as text ("2 of 3 stars"), never by color alone. */
export function Stars({ count, size = 20 }: { count: number; size?: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${count} of 3 stars`}
      style={{ flexDirection: 'row', gap: 2 }}
    >
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} filled={i < count} size={size} />
      ))}
    </View>
  );
}
