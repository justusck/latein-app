import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

type ThinkingBubbleProps = {
  /** The accumulated reasoning text (may be partial during streaming). */
  reasoning: string;
  /** Whether tokens are still streaming in. */
  streaming: boolean;
  /** Extra styles applied to the container. */
  style?: ViewStyle;
};

/**
 * Collapsible chain-of-thought display for AI reasoning output.
 *
 * - Streaming: pulsing "Denkt nach…" indicator bar
 * - Complete: static bar with reasoning preview; tap to expand
 * - Empty: renders nothing (no reasoning was produced)
 *
 * Respects reduced-motion: disables pulse, crossfades instantly.
 */
export function ThinkingBubble({ reasoning, streaming, style }: ThinkingBubbleProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  // Pulse animation for the streaming indicator
  const pulse = useRef(new Animated.Value(1)).current;
  const chevronRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streaming && !reducedMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 0.45,
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(1);
    }
  }, [streaming, reducedMotion, pulse]);

  // Chevron rotation on expand/collapse
  useEffect(() => {
    Animated.timing(chevronRotate, {
      toValue: expanded ? 1 : 0,
      duration: reducedMotion ? 0 : 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, reducedMotion, chevronRotate]);

  // Nothing to show if there's no reasoning at all (and not streaming).
  if (!reasoning && !streaming) return null;

  const chevronDeg = chevronRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const hasContent = reasoning.length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.muted,
          borderColor: streaming ? theme.primary : theme.border,
          borderWidth: streaming ? 1 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      <Pressable
        onPress={() => {
          if (!streaming && hasContent) setExpanded((v) => !v);
        }}
        disabled={streaming || !hasContent}
        style={({ pressed }) => [
          styles.bar,
          pressed && !streaming && { opacity: 0.7 },
        ]}
      >
        {/* Streaming indicator */}
        {streaming && (
          <Animated.View style={[styles.streamingRow, { opacity: pulse }]}>
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.label, { color: theme.primary }]}>
              Denkt nach…
            </Text>
          </Animated.View>
        )}

        {/* Complete collapsed state */}
        {!streaming && !expanded && hasContent && (
          <View style={styles.collapsedRow}>
            <Ionicons name="bulb-outline" size={14} color={theme.textSecondary} />
            <Text
              style={[styles.label, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              Gedankengang
            </Text>
            <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={1}>
              {reasoning.slice(0, 60)}{reasoning.length > 60 ? '…' : ''}
            </Text>
            <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
              <Ionicons name="chevron-down" size={12} color={theme.textSecondary} />
            </Animated.View>
          </View>
        )}

        {/* Complete expanded state — header row only (content below) */}
        {!streaming && expanded && hasContent && (
          <View style={styles.collapsedRow}>
            <Ionicons name="bulb-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Gedankengang
            </Text>
            <View style={styles.spacer} />
            <Animated.View style={{ transform: [{ rotate: chevronDeg }] }}>
              <Ionicons name="chevron-down" size={12} color={theme.textSecondary} />
            </Animated.View>
          </View>
        )}

        {/* Empty complete state — nothing to show */}
        {!streaming && !hasContent && null}
      </Pressable>

      {/* Expanded reasoning content */}
      {!streaming && expanded && hasContent && (
        <View style={[styles.reasoningBody, { borderTopColor: theme.border }]}>
          <Text
            style={[styles.reasoningText, { color: theme.textSecondary }]}
            selectable
          >
            {reasoning}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  bar: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    minHeight: 28,
    justifyContent: 'center',
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    fontSize: 11,
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  reasoningBody: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reasoningText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
