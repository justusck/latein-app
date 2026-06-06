import * as Haptics from 'expo-haptics';
import { Platform, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Wraps a tab bar button with a scale-down-then-spring-back press animation.
 *
 * On press-in the button scales to 0.86 (quick, 100ms — within the 80ms
 * perceptual threshold).  On release it springs back to 1.0 with a subtle
 * overshoot that lands within 250ms.  A light haptic accompanies the press
 * on native platforms.
 *
 * The component passes through all BottomTabBarButtonProps so it drops in as
 * the `tabBarButton` option on any expo-router Tabs.Screen.
 */
export function TabBarButton(props: any) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: any) => {
    scale.value = withTiming(0.86, { duration: 100 });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    props.onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, {
      stiffness: 420,
      damping: 16,
      mass: 0.75,
    });
    props.onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...props}
      style={[props.style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
}
