import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type AnimatedProgressBarProps = {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
};

/**
 * Progress bar with smooth fill animation.
 * Falls back to instant when reduced motion is preferred.
 * Used everywhere a ProgressBar currently renders: vocab groups, profile stats, rank XP.
 */
export function AnimatedProgressBar({
  progress,
  color,
  trackColor,
  height = 10,
}: AnimatedProgressBarProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, progress));

  // Drive the fill width with an animated value (0..1).
  const anim = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(clamped);
      return;
    }
    Animated.timing(anim, {
      toValue: clamped,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, reducedMotion, anim]);

  const animWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const barHeight = height;
  const fillColor = color ?? theme.primary;
  const trackBg = trackColor ?? theme.muted;

  return (
    <View style={[styles.track, { backgroundColor: trackBg, height: barHeight, borderRadius: barHeight }]}>
      <Animated.View
        style={{
          width: animWidth,
          height: barHeight,
          borderRadius: barHeight,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
});
