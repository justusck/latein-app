import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';

type ParticleFieldProps = {
  /** Number of particles. Keep under 30 for mobile perf. */
  count?: number;
  /** Trigger: increment to re-fire. */
  trigger: number;
  /** Particle color. Default: gold. */
  color?: string;
};

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  size: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
}

/**
 * A burst of small circular particles that fly outward and fade.
 * Pure Animated API, no canvas/Skia needed. ~20 particles at 60fps.
 * Use for: triumph ceremony, XP gain, milestone celebrations.
 */
export function ParticleField({ count = 20, trigger, color = '#E4C766' }: ParticleFieldProps) {
  const reducedMotion = useReducedMotion();

  const particles: Particle[] = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 0 : count }, () => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(1),
        size: 2 + Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        distance: 30 + Math.random() * 80,
        delay: Math.random() * 200,
        duration: 400 + Math.random() * 300,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, trigger, reducedMotion],
  );

  const fireAll = useRef(false);
  useEffect(() => {
    if (reducedMotion) return;
    fireAll.current = true;
  }, [trigger, reducedMotion]);

  useEffect(() => {
    if (!fireAll.current || reducedMotion) return;
    fireAll.current = false;
    particles.forEach((p) => {
      p.opacity.setValue(0);
      p.x.setValue(0);
      p.y.setValue(0);
      p.scale.setValue(1);
      const dx = Math.cos(p.angle) * p.distance;
      const dy = Math.sin(p.angle) * p.distance;
      Animated.parallel([
        Animated.timing(p.x, {
          toValue: dx,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: dy,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.opacity, {
            toValue: 0.9,
            duration: 80,
            delay: p.delay,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: p.duration - 80,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.scale, {
          toValue: 0,
          duration: p.duration,
          delay: p.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [trigger, particles, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: color,
            opacity: p.opacity,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { scale: p.scale },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
