import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, type TextProps } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type AnimatedCounterProps = TextProps & {
  /** Target value to count up to. */
  to: number;
  /** Increment to re-trigger. */
  trigger: number;
  /** Duration of the count-up in ms. Default 500ms. */
  duration?: number;
  /** Show "+" prefix for positive numbers. */
  plusPrefix?: boolean;
  /** Static suffix appended after the number (e.g. "%"). */
  suffix?: string;
};

/**
 * Counts up from 0 to `to` on trigger, easing out smoothly.
 * Use for: XP gain display, streak counter, accuracy percentage.
 */
export function AnimatedCounter({
  to,
  trigger,
  duration = 500,
  plusPrefix,
  suffix = '',
  style,
  ...textProps
}: AnimatedCounterProps) {
  const reducedMotion = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(reducedMotion ? to : 0);

  useEffect(() => {
    if (reducedMotion) {
      setRendered(to);
      return;
    }
    setRendered(0);
    anim.setValue(0);
    const id = anim.addListener(({ value }) => {
      setRendered(Math.round(value * to));
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, to, duration, reducedMotion]);

  const text = `${plusPrefix && rendered > 0 ? `+${rendered}` : String(rendered)}${suffix}`;

  return (
    <Text style={style} {...textProps}>
      {text}
    </Text>
  );
}
