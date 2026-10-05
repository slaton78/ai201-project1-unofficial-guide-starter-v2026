import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { StarIcon } from '@/components/Stars';
import { useReduceMotion } from '@/theme';

/** One-to-three star reveal. Static when Reduce Motion is on. */
export function StarReveal({ stars }: { stars: number }) {
  const reduceMotion = useReduceMotion();
  const [scales] = useState(() => [0, 1, 2].map(() => new Animated.Value(reduceMotion ? 1 : 0)));

  useEffect(() => {
    if (reduceMotion) return;
    Animated.stagger(
      220,
      scales.map((value) =>
        Animated.spring(value, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ),
    ).start();
  }, [reduceMotion, scales]);

  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel={`${stars} of 3 stars`}>
      {scales.map((scale, i) => (
        <Animated.View key={i} style={{ transform: [{ scale }, { translateY: i === 1 ? -14 : 0 }] }}>
          <StarIcon filled={i < stars} size={i === 1 ? 84 : 68} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 8 },
});
