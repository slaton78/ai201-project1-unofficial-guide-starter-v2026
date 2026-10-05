import { View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

import { CampusEmblem } from '@/components/CampusEmblem';
import { Stars } from '@/components/Stars';
import { CAMPUSES } from '@/content/campuses';

export interface OnboardingSlide {
  title: string;
  body: string;
  art: React.ReactNode;
}

/** Decorative preview of three matching shapes in a row. Purely illustrative. */
function MatchPreview() {
  return (
    <Svg width={240} height={84} viewBox="0 0 240 84">
      <Rect x="2" y="2" width="236" height="80" rx="16" fill="#1E3262" stroke="#4FD1C5" strokeWidth="3" />
      {[0, 1, 2].map((i) => (
        <Polygon
          key={i}
          points={`${42 + i * 78},20 ${66 + i * 78},42 ${42 + i * 78},64 ${18 + i * 78},42`}
          fill="#3D8BFF"
          stroke="#123F8C"
          strokeWidth="4"
        />
      ))}
      <Circle cx="42" cy="42" r="6" fill="#B5D3FF" />
      <Circle cx="120" cy="42" r="6" fill="#B5D3FF" />
      <Circle cx="198" cy="42" r="6" fill="#B5D3FF" />
    </Svg>
  );
}

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    title: 'Match tokens. Build momentum.',
    body: 'Swap neighboring tokens to line up 3 or more of the same shape. Bigger matches build bigger rallies.',
    art: <MatchPreview />,
  },
  {
    title: 'Clear objectives. Earn stars.',
    body: 'Each level has a goal and a move limit. Finish the goal to win, score high for up to 3 stars, and unlock the next stop on the Championship Trail.',
    art: <Stars count={3} size={64} />,
  },
  {
    title: 'Choose your fan identity.',
    body: 'Pick one of five fictional campus fan crews. It’s just for style — you can switch anytime.',
    art: (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {CAMPUSES.map((campus) => (
          <CampusEmblem key={campus.id} campus={campus} size={52} />
        ))}
      </View>
    ),
  },
];
