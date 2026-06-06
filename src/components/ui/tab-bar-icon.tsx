import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type IoniconsName = keyof typeof Ionicons.glyphMap;

/**
 * Animated tab icon that "fills from the bottom" when the tab becomes active.
 *
 * The outline icon serves as the empty vessel; the filled icon is revealed
 * upward from the bottom via an animated clip, like filling a Roman amphora.
 *
 * Respects the system reduce-motion preference by snapping instantly to the
 * target fill level without animation.
 */
export function TabBarIcon({
  baseName,
  size,
  focused,
}: {
  /** Base icon name without "-outline" suffix (e.g. "bookmark", not "bookmark-outline") */
  baseName: string;
  size: number;
  focused: boolean;
}) {
  const theme = useTheme();
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      reduceMotion.current = enabled;
    });
  }, []);

  const fillProgress = useSharedValue(focused ? 1 : 0);
  const prevFocused = useRef(focused);

  useEffect(() => {
    // Avoid animating on first mount
    const animate = prevFocused.current !== focused;
    prevFocused.current = focused;

    const target = focused ? 1 : 0;
    if (reduceMotion.current || !animate) {
      fillProgress.value = target;
    } else {
      fillProgress.value = withTiming(target, {
        duration: focused ? 380 : 200,
        easing: focused ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      });
    }
  }, [focused, fillProgress]);

  const fillClipStyle = useAnimatedStyle(() => ({
    height: fillProgress.value * size,
  }));

  const outlineName = `${baseName}-outline` as IoniconsName;
  const filledName = baseName as IoniconsName;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outline — the "empty vessel", always visible */}
      <Ionicons
        name={outlineName}
        size={size}
        color={theme.textSecondary}
        style={styles.icon}
      />

      {/* Fill clip — reveals filled icon from bottom upward */}
      <Animated.View style={[styles.fillClip, fillClipStyle]}>
        <Ionicons
          name={filledName}
          size={size}
          color={theme.primary}
          style={styles.filledIcon}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  icon: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  fillClip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  filledIcon: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
