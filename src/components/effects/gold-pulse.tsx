import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type GoldPulseProps = {
  /** Increment to trigger the pulse. */
  trigger: number;
  /** Size of the pulse ring in px. */
  size?: number;
  /** Color, defaults to gold. */
  color?: string;
};

/**
 * A ring that expands outward from center and fades — like a coin dropping into water.
 * Use for: streak increment, XP gain, tab bar active indicator.
 */
export function GoldPulse({ trigger, size = 44, color = '#E4C766' }: GoldPulseProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    scale.setValue(0.3);
    opacity.setValue(0.7);
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.8,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (reducedMotion) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: color,
          opacity,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}
