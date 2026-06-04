import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type FadeInViewProps = {
  children: ReactNode;
  /** Delay in ms before the animation starts. Use for staggered lists. */
  delay?: number;
  /** Animation duration. Default 200ms for product UI. */
  duration?: number;
  /** Slide direction: up (default) or none (fade only). */
  slide?: 'up' | 'none';
  /** Additional styles for the animated wrapper (e.g. flex: 1). */
  style?: ViewStyle;
};

/**
 * Wraps children in a fade-in + slide-up entrance animation.
 * Skips animation entirely when reduced motion is preferred.
 * Use for: chat messages, list items, cards, empty states, tab content.
 */
export function FadeInView({ children, delay = 0, duration = 200, slide = 'up', style }: FadeInViewProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 8)).current;

  useEffect(() => {
    if (reducedMotion) return;
    const anims: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ];
    if (slide === 'up') {
      anims.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );
    }
    Animated.parallel(anims).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}
