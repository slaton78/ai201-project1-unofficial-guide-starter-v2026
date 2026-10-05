import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { ObjectiveDefinition } from '@/game/core/level';

import { Icon } from './Icon';
import { StarIcon } from './Stars';
import { TokenGlyph } from './TokenGlyph';

/** Visual cue for an objective. Always paired with text, so it is hidden from screen readers. */
export function ObjectiveIcon({ definition, size = 26 }: { definition: ObjectiveDefinition; size?: number }) {
  let content: React.ReactNode;
  switch (definition.type) {
    case 'collectTokens':
      content = <TokenGlyph color={definition.color} size={size} />;
      break;
    case 'reachScore':
      content = <StarIcon filled size={size} />;
      break;
    case 'unlockTokens':
      content = <Icon name="lock" color="#FFC94A" size={size} />;
      break;
    case 'clearPenaltyBlocks':
      content = (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="2" y="2" width="20" height="20" rx="4" fill="#5A6788" stroke="#C9D2EA" strokeWidth="2" />
          <Path d="M7 7 L17 17 M17 7 L7 17" stroke="#E8ECF8" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
      );
      break;
    case 'clearRallyTiles':
      content = (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="5"
            fill="#4FD1C5"
            opacity={0.35}
            stroke="#4FD1C5"
            strokeWidth="2.5"
          />
          <Rect x="8" y="8" width="8" height="8" rx="2" fill="#4FD1C5" />
        </Svg>
      );
      break;
    case 'makeMatches':
      content = (
        <View style={{ flexDirection: 'row', gap: 1 }}>
          <TokenGlyph color="red" size={size * 0.55} />
          <TokenGlyph color="red" size={size * 0.55} />
        </View>
      );
      break;
  }
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {content}
    </View>
  );
}
