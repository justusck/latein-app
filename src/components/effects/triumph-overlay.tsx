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
import { LaurelWreath } from '@/components/effects/laurel-wreath';
import { ParticleField } from '@/components/effects/particle-field';
import { AnimatedProgressBar } from '@/components/ui/animated-progress';
import { Button } from '@/components/ui/button';
import { Fonts, palette, Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { toRoman } from '@/lib/roman';

// ── Textures ────────────────────────────────────────────────────────────────
// CC0 stone & metal textures from OpenGameArt Base Material Pack
const stoneTex = require('../../../assets/textures/stone-dark.png');
const goldTex = require('../../../assets/textures/gold-emblem.png');

const { width: SCREEN_W } = Dimensions.get('window');

const GOLD = '#E4C766';
const GOLD_DEEP = '#C9A227';

// ── Types ───────────────────────────────────────────────────────────────────

export type TriumphData = {
  /** XP earned this session. */
  xp: number;
  /** XP collected within the current level. */
  xpIntoLevel: number;
  /** XP needed to finish the current level. */
  xpForNext: number;
  /** Progress toward next level (0..1). */
  levelProgress: number;
  /** Current level after earning. */
  level: number;
  /** Latin rank name for the current level. */
  rankLatin: string;
  /** New streak count. */
  streak: number;
  /** Cards reviewed (including in-session relearns). */
  cardsDone: number;
  /** Cards answered correctly. */
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
 * Full-screen stone-tablet triumph ceremony: dark stone slab, gold-emblem
 * intaglio framed by a laurel wreath, inscription-style stats, terracotta
 * action back home.
 */
export function TriumphOverlay({ data, visible, onDismiss, onPlayAgain }: TriumphScreenProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'hidden' | 'entering' | 'showing' | 'exiting'>('hidden');
  // State (not a ref!) — particles must re-render to fire.
  const [burst, setBurst] = useState(0);

  // ── Animated values ──────────────────────────────────────────────────────
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const emblemScale = useRef(new Animated.Value(0.6)).current;
  const emblemOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

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

    // 2. Wreath + emblem rise from the stone (450ms, slight overshoot)
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
      setBurst((b) => b + 1); // gold burst exactly when the emblem lands

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

  const epigraph = data.leveledUp ? 'ASCENSVS' : 'VICTORIA';
  const heading = data.leveledUp ? 'Neue Stufe erreicht!' : 'Gut gemacht!';
  const subtitle = data.leveledUp
    ? `Du trägst nun den Rang ${data.newRank ?? data.rankLatin}.`
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
          {/* ════════════════════════════════════════════════════════════
             LAUREL EMBLEM — wreath framing an intaglio recess
             ════════════════════════════════════════════════════════════ */}
          <Animated.View
            style={[
              styles.emblemSection,
              { opacity: emblemOpacity, transform: [{ scale: emblemScale }] },
            ]}>
            <LaurelWreath size={wreathSize} color={GOLD_DEEP} />

            {/* Recess carved into the stone, centered in the wreath */}
            <View style={styles.recessOuter}>
              <View style={styles.recessInner}>
                <View style={styles.recessRim} />
                <View style={styles.emblemDisc}>
                  <Image source={goldTex} style={styles.emblemTex} resizeMode="cover" />
                  <View style={styles.emblemSheen} />
                  <Ionicons name="trophy" size={30} color={GOLD} />
                </View>
              </View>
            </View>

            {/* Particle burst centered on the emblem */}
            <ParticleField trigger={burst} count={18} color={GOLD} />
          </Animated.View>

          {/* ════════════════════════════════════════════════════════════
             INSCRIPTION — typographic stats, carved aesthetic
             ════════════════════════════════════════════════════════════ */}
          <Animated.View style={[styles.inscription, { opacity: contentOpacity }]}>
            <Text style={styles.epigraph}>{epigraph}</Text>
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            {/* Rank · level — always inscribed */}
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>
                {data.rankLatin.toUpperCase()} · GRADVS {toRoman(data.level)}
              </Text>
            </View>

            <OrnamentRule />

            {/* ── XP + Streak tokens ─────────────────────────────────── */}
            <View style={styles.tokenRow}>
              <View style={styles.token}>
                <Ionicons name="star" size={16} color={GOLD} />
                <AnimatedCounter
                  to={data.xp}
                  trigger={burst}
                  duration={500}
                  plusPrefix
                  style={styles.tokenValue}
                />
                <Text style={styles.tokenLabel}>XP erhalten</Text>
              </View>
              <View style={styles.tokenSep} />
              <View style={styles.token}>
                <Ionicons name="flame" size={16} color={GOLD} />
                <AnimatedCounter
                  to={data.streak}
                  trigger={burst}
                  duration={400}
                  style={styles.tokenValue}
                />
                <Text style={styles.tokenLabel}>{data.streak === 1 ? 'Tag in Folge' : 'Tage in Folge'}</Text>
              </View>
            </View>

            {/* ── Progress toward next level ─────────────────────────── */}
            <View style={styles.progressBlock}>
              <AnimatedProgressBar
                progress={data.levelProgress}
                height={6}
                color={GOLD}
                trackColor="rgba(228,199,102,0.12)"
              />
              <Text style={styles.progressLabel}>
                {data.xpIntoLevel} / {data.xpForNext} XP bis Stufe {toRoman(data.level + 1)}
              </Text>
            </View>

            <OrnamentRule />

            {/* ── Detail stats — inscription-style row ───────────────── */}
            <View style={styles.detailRow}>
              <View style={styles.detail}>
                <Text style={styles.detailValue}>{data.cardsDone}</Text>
                <Text style={styles.detailLabel}>Karten</Text>
              </View>
              <View style={styles.detailSep} />
              <View style={styles.detail}>
                <AnimatedCounter
                  to={data.accuracy}
                  trigger={burst}
                  duration={600}
                  suffix="%"
                  style={styles.detailValue}
                />
                <Text style={styles.detailLabel}>Genauigkeit</Text>
              </View>
              <View style={styles.detailSep} />
              {data.newWords > 0 ? (
                <View style={styles.detail}>
                  <Text style={[styles.detailValue, styles.detailAccent]}>+{data.newWords}</Text>
                  <Text style={styles.detailLabel}>Neue Wörter</Text>
                </View>
              ) : (
                <View style={styles.detail}>
                  <Text style={[styles.detailValue, styles.detailAccent]}>{data.cardsCorrect}</Text>
                  <Text style={styles.detailLabel}>Richtig</Text>
                </View>
              )}
            </View>

            <OrnamentRule />

            {/* ── Action ─────────────────────────────────────────────── */}
            <Animated.View style={{ opacity: btnOpacity, width: '100%' }}>
              <Button title="Zur Übersicht" onPress={dismiss} variant="primary" haptic />
              {onPlayAgain && (
                <View style={{ marginTop: Spacing.two }}>
                  <Button title="Noch eine Runde" onPress={onPlayAgain} variant="ghost" haptic />
                </View>
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

/** Gold hairline with a small central diamond — inscription divider. */
function OrnamentRule() {
  return (
    <View style={styles.ornamentRow}>
      <View style={styles.ornamentLine} />
      <View style={styles.ornamentDiamond} />
      <View style={styles.ornamentLine} />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const wreathSize = 200;
const recessSize = 96;
const emblemSize = 64;

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
    width: wreathSize,
    height: wreathSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },

  // ── Intaglio recess (carved hollow in the stone) ──────────────────────
  recessOuter: {
    position: 'absolute',
    width: recessSize + 20,
    height: recessSize + 20,
    borderRadius: (recessSize + 20) / 2,
    backgroundColor: 'rgba(4,2,5,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: recessSize,
    height: recessSize,
    borderRadius: recessSize / 2,
    backgroundColor: 'rgba(5,3,6,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recessRim: {
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
    ...StyleSheet.absoluteFillObject,
    borderRadius: emblemSize / 2,
    backgroundColor: 'rgba(228,199,102,0.08)',
  },

  // ── Inscription area ──────────────────────────────────────────────────
  inscription: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  epigraph: {
    fontFamily: Fonts.serifBody,
    fontSize: 13,
    color: GOLD_DEEP,
    letterSpacing: 5,
    marginBottom: 4,
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
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(228,199,102,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(228,199,102,0.25)',
  },
  rankText: {
    fontFamily: Fonts.serifBody,
    fontSize: 13,
    color: GOLD,
    letterSpacing: 1.6,
  },

  // ── Ornament divider ──────────────────────────────────────────────────
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    marginVertical: Spacing.three,
  },
  ornamentLine: {
    width: 56,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(228,199,102,0.25)',
  },
  ornamentDiamond: {
    width: 5,
    height: 5,
    backgroundColor: 'rgba(228,199,102,0.45)',
    transform: [{ rotate: '45deg' }],
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
    color: GOLD,
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
