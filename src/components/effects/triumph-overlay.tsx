import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedCounter } from '@/components/effects/animated-counter';
import { ParticleField } from '@/components/effects/particle-field';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Button } from '@/components/ui/button';
import { Fonts, palette, Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// ── Textures ────────────────────────────────────────────────────────────────
// CC0 stone & metal textures from OpenGameArt Base Material Pack
const stoneTex = require('../../../assets/textures/stone-dark.png');
const goldTex = require('../../../assets/textures/gold-emblem.png');

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ───────────────────────────────────────────────────────────────────

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

type TriumphScreenProps = {
  data: TriumphData;
  visible: boolean;
  onDismiss: () => void;
  /** Optional secondary action shown below the primary button (e.g. "Noch eine Runde" in free mode). */
  onPlayAgain?: () => void;
};

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Full-screen stone-tablet triumph ceremony.
 *
 * Replaces the previous semi-transparent overlay with an opaque, textured
 * surface inspired by Roman monumental inscriptions. A dark stone slab
 * carries a gold-emblem intaglio (carved recess), inscription-style stats,
 * and a single terracotta action to return home.
 */
export function TriumphOverlay({ data, visible, onDismiss, onPlayAgain }: TriumphScreenProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'showing' | 'exiting'>('hidden');

  // ── Animated values ──────────────────────────────────────────────────────
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const emblemScale = useRef(new Animated.Value(0.6)).current;
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const particleTrigger = useRef(0);

  // ── Entrance orchestration ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible || phase !== 'hidden') return;
    setPhase('entering');

    if (reducedMotion) {
      screenOpacity.setValue(1);
      emblemScale.setValue(1);
      emblemOpacity.setValue(1);
      contentOpacity.setValue(1);
      btnOpacity.setValue(1);
      particleTrigger.current++;
      setPhase('showing');
      return;
    }

    // 1. Stone slab fades in (300ms)
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // 2. Emblem rises from the stone with a subtle scale-in (450ms, slight overshoot)
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(emblemScale, {
            toValue: 1.08,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(emblemScale, {
            toValue: 1,
            duration: 170,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(emblemOpacity, {
          toValue: 1,
          duration: 350,
          delay: 50,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      particleTrigger.current++;

      // 3. Inscription fades up (250ms)
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        // 4. Button fades in last (200ms)
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setPhase('showing');
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Dismiss ──────────────────────────────────────────────────────────────
  const dismiss = () => {
    if (phase !== 'showing') return;
    setPhase('exiting');
    if (reducedMotion) {
      onDismiss();
      return;
    }
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setPhase('hidden');
      onDismiss();
    });
  };

  if (!visible && phase === 'hidden') return null;

  const heading = data.leveledUp ? 'Aufstieg!' : 'Gut gemacht!';
  const subtitle = data.leveledUp
    ? 'Du hast eine neue Stufe erreicht.'
    : 'Deine tägliche Übung trägt Früchte.';

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Stone texture background ─────────────────────────────────── */}
      <Image source={stoneTex} style={styles.stoneBg} resizeMode="repeat" />

      {/* ── Radial vignette (layered darkening toward edges) ──────────── */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* ── Safe-area content ────────────────────────────────────────── */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.scrollBody}>
          {/* ── Particle burst centered on emblem ────────────────────── */}
          <ParticleField trigger={particleTrigger.current} count={16} color="#E4C766" />

          {/* ════════════════════════════════════════════════════════════
             INSCRIBED EMBLEM — intaglio recess carved into the stone
             ════════════════════════════════════════════════════════════ */}
          <View style={styles.emblemSection}>
            {/* Recess shadow layer (outer, darker) */}
            <Animated.View
              style={[
                styles.recessOuter,
                { opacity: emblemOpacity, transform: [{ scale: emblemScale }] },
              ]}>
              {/* Recess inner — the carved hollow */}
              <View style={styles.recessInner}>
                {/* Highlight rim (bottom edge catches light) */}
                <View style={styles.recessRim} />

                {/* Gold emblem disc */}
                <View style={styles.emblemDisc}>
                  <Image source={goldTex} style={styles.emblemTex} resizeMode="cover" />
                  <View style={styles.emblemSheen} />
                  <Ionicons name="trophy" size={34} color="#E4C766" style={styles.emblemIcon} />
                </View>
              </View>
            </Animated.View>

            {/* Laurel leaves — flanking the recess */}
            <Animated.View style={{ opacity: emblemOpacity }}>
              <Ionicons
                name="leaf-outline"
                size={22}
                color="#C9A227"
                style={[styles.leaf, styles.leafLeft]}
              />
              <Ionicons
                name="leaf-outline"
                size={22}
                color="#C9A227"
                style={[styles.leaf, styles.leafRight]}
              />
            </Animated.View>
          </View>

          {/* ════════════════════════════════════════════════════════════
             INSCRIPTION — typographic stats, carved aesthetic
             ════════════════════════════════════════════════════════════ */}
          <Animated.View style={[styles.inscription, { opacity: contentOpacity }]}>
            {/* ── Heading ────────────────────────────────────────────── */}
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {data.leveledUp && data.newRank && (
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{data.newRank}</Text>
              </View>
            )}

            {/* ── Gold hairline ──────────────────────────────────────── */}
            <View style={styles.goldRule} />

            {/* ── XP + Streak tokens ─────────────────────────────────── */}
            <View style={styles.tokenRow}>
              <View style={styles.token}>
                <Ionicons name="star" size={16} color="#E4C766" />
                <AnimatedCounter
                  to={data.xp}
                  trigger={phase === 'showing' ? 1 : 0}
                  duration={500}
                  plusPrefix
                  style={styles.tokenValue}
                />
                <Text style={styles.tokenLabel}>XP erhalten</Text>
              </View>
              <View style={styles.tokenSep} />
              <View style={styles.token}>
                <Ionicons name="flame" size={16} color="#E4C766" />
                <AnimatedCounter
                  to={data.streak}
                  trigger={phase === 'showing' ? 1 : 0}
                  duration={400}
                  style={styles.tokenValue}
                />
                <Text style={styles.tokenLabel}>Tage am Stück</Text>
              </View>
            </View>

            {/* ── Progress toward next level ─────────────────────────── */}
            <View style={styles.progressBlock}>
              <AnimatedProgressBar
                progress={data.levelProgress}
                height={6}
                color="#E4C766"
                trackColor="rgba(228,199,102,0.12)"
              />
              <Text style={styles.progressLabel}>
                {data.xpTotal} / {data.xpForNext} XP
              </Text>
            </View>

            {/* ── Gold hairline ──────────────────────────────────────── */}
            <View style={styles.goldRule} />

            {/* ── Detail stats — inscription-style row ───────────────── */}
            <View style={styles.detailRow}>
              <View style={styles.detail}>
                <Text style={styles.detailValue}>{data.cardsDone}</Text>
                <Text style={styles.detailLabel}>Karten</Text>
              </View>
              <View style={styles.detailSep} />
              <View style={styles.detail}>
                <Text style={styles.detailValue}>
                  <AnimatedCounter
                    to={data.accuracy}
                    trigger={phase === 'showing' ? 1 : 0}
                    duration={600}
                    style={styles.detailValue}
                  />
                  %
                </Text>
                <Text style={styles.detailLabel}>Genauigkeit</Text>
              </View>
              <View style={styles.detailSep} />
              <View style={styles.detail}>
                <Text style={[styles.detailValue, styles.detailAccent]}>
                  +{data.newWords}
                </Text>
                <Text style={styles.detailLabel}>Neue Wörter</Text>
              </View>
            </View>

            {/* ── Gold hairline ──────────────────────────────────────── */}
            <View style={styles.goldRule} />

            {/* ── Action ─────────────────────────────────────────────── */}
            <Animated.View style={{ opacity: btnOpacity, width: '100%' }}>
              <Button
                title="Zur Übersicht"
                onPress={dismiss}
                variant="primary"
                haptic
              />
              {onPlayAgain && (
                <View style={{ marginTop: Spacing.two }}>
                  <Button
                    title="Noch eine Runde"
                    onPress={onPlayAgain}
                    variant="ghost"
                    haptic
                  />
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const recessSize = 120;
const emblemSize = 82;

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: palette.nightBg, // fallback behind texture
  },
  stoneBg: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: undefined,
    aspectRatio: 1, // square tile repeats
    opacity: 0.55,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,4,7,0.62)',
  },
  safeArea: {
    flex: 1,
  },
  scrollBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },

  // ── Emblem section ────────────────────────────────────────────────────
  emblemSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.five,
  },

  // ── Intaglio recess (carved hollow in the stone) ──────────────────────
  recessOuter: {
    // Outer shadow ring — darkest area, simulates the carved depth
    width: recessSize + 24,
    height: recessSize + 24,
    borderRadius: (recessSize + 24) / 2,
    backgroundColor: 'rgba(4,2,5,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow at top of recess (stone overhang casting down)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  recessInner: {
    // The carved-out hollow
    width: recessSize,
    height: recessSize,
    borderRadius: recessSize / 2,
    backgroundColor: 'rgba(5,3,6,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recessRim: {
    // Fine rim highlight at the bottom — catches light on the carved edge
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: 'rgba(228,199,102,0.10)',
    borderRadius: 1,
  },

  // ── Gold emblem disc ──────────────────────────────────────────────────
  emblemDisc: {
    width: emblemSize,
    height: emblemSize,
    borderRadius: emblemSize / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle inner shadow — emblem sits in the recess
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  emblemTex: {
    ...StyleSheet.absoluteFillObject,
    width: emblemSize,
    height: emblemSize,
    borderRadius: emblemSize / 2,
  },
  emblemSheen: {
    // Subtle gold sheen overlay — light catching the metal
    ...StyleSheet.absoluteFillObject,
    borderRadius: emblemSize / 2,
    backgroundColor: 'rgba(228,199,102,0.08)',
  },
  emblemIcon: {
    // Sits on top of the gold texture
  },

  // ── Laurel leaves ─────────────────────────────────────────────────────
  leaf: {
    position: 'absolute',
  },
  leafLeft: {
    left: -recessSize / 2 - 2,
    top: recessSize / 2 - 10,
    transform: [{ rotate: '-32deg' }],
  },
  leafRight: {
    right: -recessSize / 2 - 2,
    top: recessSize / 2 - 10,
    transform: [{ rotate: '32deg' }, { scaleX: -1 }],
  },

  // ── Inscription area ──────────────────────────────────────────────────
  inscription: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: '900',
    color: palette.nightText,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: palette.nightTextSoft,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  rankBadge: {
    marginTop: Spacing.two,
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(228,199,102,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(228,199,102,0.2)',
  },
  rankText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: '#E4C766',
    letterSpacing: 0.5,
  },

  // ── Gold hairline divider ─────────────────────────────────────────────
  goldRule: {
    width: 80,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(228,199,102,0.18)',
    marginVertical: Spacing.three,
  },

  // ── Token row ─────────────────────────────────────────────────────────
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  token: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  tokenSep: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: 'rgba(245,238,243,0.08)',
  },
  tokenValue: {
    fontSize: 30,
    fontWeight: '900',
    color: palette.nightText,
    fontVariant: ['tabular-nums'],
  },
  tokenLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.nightTextSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Progress block ────────────────────────────────────────────────────
  progressBlock: {
    width: '100%',
    gap: 6,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.nightTextSoft,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // ── Detail row ────────────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  detail: {
    alignItems: 'center',
    flex: 1,
  },
  detailSep: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(245,238,243,0.08)',
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '900',
    color: palette.nightText,
    fontVariant: ['tabular-nums'],
  },
  detailAccent: {
    color: '#E4C766',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: palette.nightTextSoft,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
