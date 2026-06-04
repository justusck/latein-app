import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type GoldShimmerProps = {
  children: ReactNode;
  /** Trigger the shimmer: change this value (e.g. increment a counter). */
  trigger: number;
};

/**
 * Wraps children in a brief golden shimmer — a diagonal highlight sweep
 * that lasts ~600ms. Triggers every time `trigger` changes.
 * Use for: rank card on first view, milestone moments, streak highlight.
 */
export function GoldShimmer({ children, trigger }: GoldShimmerProps) {
  const reducedMotion = useReducedMotion();
  const shimmerPos = useRef(new Animated.Value(-1)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    shimmerOpacity.setValue(0.35);
    shimmerPos.setValue(-1);
    Animated.parallel([
      Animated.timing(shimmerPos, {
        toValue: 2,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 0.35,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <Animated.View style={{ overflow: 'hidden' }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: shimmerOpacity,
          transform: [
            {
              translateX: shimmerPos.interpolate({
                inputRange: [-1, 2],
                outputRange: [-300, 300],
              }),
            },
            { rotate: '25deg' },
          ],
        }}>
        <Animated.View
          style={{
            width: 40,
            height: '300%',
            backgroundColor: '#E4C766',
            opacity: 0.5,
            alignSelf: 'center',
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}
