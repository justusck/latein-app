import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedCounter } from '@/components/effects/animated-counter';
import { ParticleField } from '@/components/effects/particle-field';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type TriumphData = {
  /** XP earned this session. */
  xp: number;
  /** Total XP after earning. */
  xpTotal: number;
  /** XP needed for next level. */
  xpForNext: number;
  /** Progress toward next level (0..1). */
  levelProgress: number;
  /** New streak count. */
  streak: number;
  /** Cards reviewed. */
  cardsDone: number;
  /** Cards correct. */
  cardsCorrect: number;
  /** Accuracy 0..100. */
  accuracy: number;
  /** New words introduced. */
  newWords: number;
  /** Whether the user leveled up. */
  leveledUp: boolean;
  /** New rank name if leveled up. */
  newRank?: string;
};

type TriumphOverlayProps = {
  data: TriumphData;
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Full-screen triumph ceremony shown after completing a study session.
 * Darkens the screen, shows a golden emblem with particles,
 * counts up stats, then waits for dismissal.
 *
 * Tapping anywhere dismisses early.
 */
export function TriumphOverlay({ data, visible, onDismiss }: TriumphOverlayProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'showing' | 'exiting'>('hidden');

  // Animated values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const emblemScale = useRef(new Animated.Value(0)).current;
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const particleTrigger = useRef(0);

  // Entrance animation
  useEffect(() => {
    if (!visible || phase !== 'hidden') return;
    setPhase('entering');

    if (reducedMotion) {
      overlayOpacity.setValue(1);
      emblemScale.setValue(1);
      emblemOpacity.setValue(1);
      contentOpacity.setValue(1);
      particleTrigger.current++;
      setPhase('showing');
      return;
    }

    // Orchestrated sequence
    Animated.sequence([
      // 1. Darken overlay (200ms)
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // 2. Emblem pops in with spring-like scale (400ms)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(emblemScale, {
            toValue: 1.15,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(emblemScale, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(emblemOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // 3. Fire particles
      particleTrigger.current++;
      // 4. Show content
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setPhase('showing');
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = () => {
    if (phase !== 'showing') return;
    setPhase('exiting');
    if (reducedMotion) {
      onDismiss();
      return;
    }
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setPhase('hidden');
      onDismiss();
    });
  };

  if (!visible && phase === 'hidden') return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      pointerEvents={phase === 'showing' ? 'auto' : 'none'}>
      <Pressable style={styles.touchable} onPress={dismiss}>
        {/* Particle field centered on the emblem */}
        <ParticleField trigger={particleTrigger.current} count={22} color="#E4C766" />

        {/* ── Emblem ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.emblemWrap,
            { opacity: emblemOpacity, transform: [{ scale: emblemScale }] },
          ]}>
          <View style={styles.emblemRing}>
            <View style={styles.emblemInner}>
              <Ionicons name="trophy" size={36} color="#C9981A" />
            </View>
          </View>
          {/* Laurel leaves */}
          <Ionicons
            name="leaf-outline"
            size={24}
            color="#C9981A"
            style={[styles.leaf, styles.leafLeft]}
          />
          <Ionicons
            name="leaf-outline"
            size={24}
            color="#C9981A"
            style={[styles.leaf, styles.leafRight]}
          />
        </Animated.View>

        {/* ── Result text ────────────────────────────────────── */}
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <Text style={styles.heading}>
            {data.leveledUp ? 'Aufstieg!' : 'Gut gemacht!'}
          </Text>

          {data.leveledUp && data.newRank && (
            <Text style={styles.rankName}>{data.newRank}</Text>
          )}

          {/* XP + Streak */}
          <View style={styles.tokenRow}>
            <View style={styles.token}>
              <Ionicons name="star" size={18} color="#E4C766" />
              <AnimatedCounter
                to={data.xp}
                trigger={phase === 'showing' ? 1 : 0}
                duration={600}
                plusPrefix
                style={styles.tokenValue}
              />
              <Text style={styles.tokenLabel}>XP</Text>
            </View>
            <View style={styles.token}>
              <Ionicons name="flame" size={18} color="#E4C766" />
              <AnimatedCounter
                to={data.streak}
                trigger={phase === 'showing' ? 1 : 0}
                duration={400}
                style={styles.tokenValue}
              />
              <Text style={styles.tokenLabel}>Streak</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <AnimatedProgressBar
              progress={data.levelProgress}
              height={6}
              color="#E4C766"
              trackColor="rgba(228,199,102,0.15)"
            />
            <Text style={styles.xpText}>
              {data.xpTotal} / {data.xpForNext} XP
            </Text>
          </View>

          {/* Detail stats */}
          <View style={styles.detailRow}>
            <View style={styles.detail}>
              <Text style={styles.detailValue}>{data.cardsDone}</Text>
              <Text style={styles.detailLabel}>Karten</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detail}>
              <Text style={styles.detailValue}>
                <AnimatedCounter
                  to={data.accuracy}
                  trigger={phase === 'showing' ? 1 : 0}
                  duration={700}
                  style={styles.detailValue}
                />
                %
              </Text>
              <Text style={styles.detailLabel}>Genauigkeit</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detail}>
              <Text style={[styles.detailValue, { color: '#E4C766' }]}>
                +{data.newWords}
              </Text>
              <Text style={styles.detailLabel}>Neue Wörter</Text>
            </View>
          </View>

          <Text style={styles.dismissHint}>Antippen zum Fortfahren</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,10,13,0.92)',
    zIndex: 999,
  },
  touchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },

  // ── Emblem ────────────────────────────────────────────────
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },
  emblemRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#C9981A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,152,26,0.08)',
  },
  emblemInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(201,152,26,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    position: 'absolute',
  },
  leafLeft: {
    left: -8,
    top: 40,
    transform: [{ rotate: '-30deg' }],
  },
  leafRight: {
    right: -8,
    top: 40,
    transform: [{ rotate: '30deg' }, { scaleX: -1 }],
  },

  // ── Content ───────────────────────────────────────────────
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  heading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F5EEF3',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rankName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E4C766',
    marginBottom: Spacing.five,
  },

  // ── Token row ─────────────────────────────────────────────
  tokenRow: {
    flexDirection: 'row',
    gap: Spacing.five,
    marginBottom: Spacing.four,
  },
  token: {
    alignItems: 'center',
    gap: 2,
  },
  tokenValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F5EEF3',
  },
  tokenLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(245,238,243,0.5)',
    letterSpacing: 0.5,
  },

  // ── Progress ──────────────────────────────────────────────
  progressWrap: {
    width: '100%',
    marginBottom: Spacing.four,
    gap: 6,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(245,238,243,0.5)',
    textAlign: 'center',
  },

  // ── Detail row ────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.five,
    gap: Spacing.three,
  },
  detail: {
    alignItems: 'center',
    flex: 1,
  },
  detailDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(245,238,243,0.12)',
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F5EEF3',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(245,238,243,0.45)',
    marginTop: 2,
  },

  dismissHint: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(245,238,243,0.3)',
  },
});
