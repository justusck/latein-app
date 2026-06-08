import { type ReactNode, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

const SPRING = {
  damping: 22,
  stiffness: 280,
  mass: 0.55,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

interface SwipeableTabsProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
  /** Override page width — defaults to screen width. */
  pageWidth?: number;
  children: ReactNode[];
}

/**
 * Horizontal swipe container that snaps between tab pages.
 *
 * Uses native gesture handling (RNGH v2) + Reanimated for 60 fps swipes
 * that feel as responsive as a native pager. The gesture only activates
 * when the user swipes predominantly horizontally, so vertical ScrollViews
 * inside each page continue to work without conflict.
 *
 * Syncs with an external `activeTab` / `onTabChange` pair so a segmented
 * control or tab bar above it stays in lockstep.
 */
export function SwipeableTabs({
  activeTab,
  onTabChange,
  pageWidth = SCREEN_W,
  children,
}: SwipeableTabsProps) {
  const translateX = useSharedValue(-activeTab * pageWidth);
  const numPages = children.length;

  // Shared value so worklets always read the live tab, never a stale snapshot.
  // (Regular JS refs are serialized into the worklet and don't stay in sync.)
  const activeTabSV = useSharedValue(activeTab);

  // Keep the UI-thread shared value in sync when the JS prop changes
  // (e.g. segmented control tap).
  useEffect(() => {
    activeTabSV.value = activeTab;
  }, [activeTab, activeTabSV]);

  // Animate when the segmented control changes the tab.
  // When a gesture triggers the change, onEnd already started a spring to
  // the same target — the useEffect runs a second one which restarts the
  // animation trivially. That's imperceptible; missing an animation is not.
  useEffect(() => {
    translateX.value = withSpring(-activeTab * pageWidth, SPRING);
  }, [activeTab, pageWidth, translateX]);

  // ── Pan gesture ─────────────────────────────────────────────────────
  const panGesture = Gesture.Pan()
    // Only activate after a clear horizontal intent
    .activeOffsetX([-10, 10])
    // Give up immediately if the user is scrolling vertically
    .failOffsetY([-10, 10])
    .onBegin(() => {
      // Anchor to the current tab so translation builds from zero
      translateX.value = -activeTabSV.value * pageWidth;
    })
    .onUpdate((e) => {
      const tab = activeTabSV.value;
      let next = -tab * pageWidth + e.translationX;

      // Rubber-band at the edges — you can pull a little, but it resists
      if (tab === 0 && next > 0) {
        next *= 0.3;
      } else if (tab === numPages - 1 && next < -(numPages - 1) * pageWidth) {
        const overflow = next + (numPages - 1) * pageWidth;
        next = -(numPages - 1) * pageWidth + overflow * 0.3;
      }

      translateX.value = next;
    })
    .onEnd((e) => {
      const tab = activeTabSV.value;
      const threshold = pageWidth * 0.3;
      let target = tab;

      if (e.translationX > threshold && tab > 0) {
        target = tab - 1;
      } else if (e.translationX < -threshold && tab < numPages - 1) {
        target = tab + 1;
      }

      translateX.value = withSpring(-target * pageWidth, SPRING);

      if (target !== tab) {
        runOnJS(onTabChange)(target);
      }
    });

  // ── Animated style ──────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.row,
          { width: pageWidth * numPages },
          animatedStyle,
        ]}>
        {children.map((child, i) => (
          <View key={i} style={{ width: pageWidth, flex: 1 }}>
            {child}
          </View>
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});
