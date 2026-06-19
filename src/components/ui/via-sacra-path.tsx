import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { getActiveCourse } from '@/courses';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { PARADIGMS } from '@/data/paradigms';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { TopicWithProgress } from '@/lib/grammar';
import { toRoman } from '@/lib/roman';

// Decorative statues + temples flanking the path. The source art is auto-traced
// "realistic" SVGs (5k–13k <path> nodes, 2.5–5.4 MB each). Rendering those with
// react-native-svg meant parsing megabytes of XML on the JS thread and creating
// tens of thousands of native nodes per instance — that was the ~minute stall.
// They are bitmaps in vector clothing, so we ship pre-rasterized WebP (built by
// scripts/rasterize-decorations.mjs from design/decorations-src/) and draw them
// with expo-image, which decodes natively and caches. ~13 MB SVG → ~340 KB WebP.
//
// Assets are course-specific: Latin gets Roman temples/statues, Japanese gets
// torii gates / stone lanterns / pagodas. Resolved once at module load.
const _d = getActiveCourse().decorations;
const StatueA = _d.statueA;
const StatueB = _d.statueB;
const TempleImg = _d.temple;
const PillarImg = _d.pillar;

// Aspect ratios + temple width are course-specific (Latin: landscape gateway;
// Japanese: portrait temple rendered as a centered, narrower centerpiece).
const STATUE_RATIO = _d.statueRatio;
const TEMPLE_RATIO = _d.templeRatio;
const PILLAR_RATIO = _d.pillarRatio;
const TEMPLE_WIDTH_FACTOR = _d.templeWidthFactor;


// ── Stage metadata ──────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  foundations: 'Grundlagen',
  morphology: 'Formenlehre',
  syntax: 'Syntax',
  advanced: 'Fortgeschritten',
};
const STAGE_ORDER = ['foundations', 'morphology', 'syntax', 'advanced'];

// ── Layout constants ────────────────────────────────────────────────────────

const NODE_R = 32;
const NODE_TOUCH_R = 48;
const PATH_LEFT_X = 72;
const PATH_RIGHT_X = 298;
const NODE_V_SPACING = 140;
const STAGE_GAP = 90;
const HEADER_SPACING = 70;
const PATH_STROKE_W = 40;
const PATH_BORDER_W = 20;
const PATH_DASH_W = 3;
const SVG_W = 370;

// ── Node position type ──────────────────────────────────────────────────────

interface NodePos {
  id: string;
  x: number;
  y: number;
  topic: TopicWithProgress;
  globalIndex: number;
  isTrainer: boolean;
  trainerTitle?: string;
}

// ── Laurel Wreath ───────────────────────────────────────────────────────────

function LaurelWreath({ cx, cy, size, color }: { cx: number; cy: number; size: number; color: string }) {
  const r = size / 2;
  return (
    <G opacity={0.85}>
      <Path
        d={`M ${cx} ${cy + r * 0.7} C ${cx - r * 0.6} ${cy + r * 0.3}, ${cx - r * 1.1} ${cy - r * 0.3}, ${cx - r * 0.2} ${cy - r * 0.65} C ${cx - r * 0.5} ${cy - r * 0.45}, ${cx - r * 0.3} ${cy - r * 0.15}, ${cx - r * 0.05} ${cy - r * 0.05}`}
        fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
      />
      <Path
        d={`M ${cx} ${cy + r * 0.7} C ${cx + r * 0.6} ${cy + r * 0.3}, ${cx + r * 1.1} ${cy - r * 0.3}, ${cx + r * 0.2} ${cy - r * 0.65} C ${cx + r * 0.5} ${cy - r * 0.45}, ${cx + r * 0.3} ${cy - r * 0.15}, ${cx + r * 0.05} ${cy - r * 0.05}`}
        fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
      />
      {[-0.5, 0, -0.3, 0.2, -0.6, 0.5].map((off, i) => {
        const a = (i / 6) * Math.PI * 2 - 0.3;
        const lx = cx + Math.cos(a) * r * 0.6;
        const ly = cy + Math.sin(a) * r * 0.6;
        return <Ellipse key={i} cx={lx} cy={ly} rx={2} ry={3.5} fill={color} opacity={i < 3 ? 0.7 : 0.6} />;
      })}
    </G>
  );
}

// ── Compute layout ──────────────────────────────────────────────────────────

function computeLayout(
  topics: TopicWithProgress[],
  paradigmsByStage: Map<string, typeof PARADIGMS>,
): {
  nodes: NodePos[];
  pathData: string;
  totalHeight: number;
  stageHeaders: { y: number; stage: string; completed: number; total: number }[];
} {
  const nodes: NodePos[] = [];
  const headers: { y: number; stage: string; completed: number; total: number }[] = [];
  let globalIdx = 0;
  let currentY = 80;

  for (const stage of STAGE_ORDER) {
    const stageTopics = topics.filter((t) => t.topic.stage === stage);
    if (stageTopics.length === 0) continue;

    const stageParadigms = paradigmsByStage.get(stage) ?? [];
    const completed = stageTopics.filter((t) => t.completed).length;

    headers.push({ y: currentY, stage, completed, total: stageTopics.length });
    currentY += HEADER_SPACING;

    for (let i = 0; i < stageTopics.length; i++) {
      const side = i % 2 === 0;
      const x = side ? PATH_RIGHT_X : PATH_LEFT_X;
      nodes.push({
        id: stageTopics[i].topic.id,
        x,
        y: currentY,
        topic: stageTopics[i],
        globalIndex: globalIdx,
        isTrainer: false,
      });
      globalIdx++;
      currentY += NODE_V_SPACING;
    }

    if (stageParadigms.length > 0) {
      currentY += 10;
      for (let pi = 0; pi < stageParadigms.length; pi++) {
        const side = (stageTopics.length + pi) % 2 === 0;
        const x = side ? PATH_RIGHT_X : PATH_LEFT_X;
        const p = stageParadigms[pi];
        nodes.push({
          id: `trainer-${p.id}`,
          x,
          y: currentY,
          topic: {} as TopicWithProgress,
          globalIndex: -1,
          isTrainer: true,
          trainerTitle: p.title,
        });
        currentY += NODE_V_SPACING * 0.65;
      }
    }

    currentY += STAGE_GAP;
  }

  const allPoints: { x: number; y: number }[] = nodes.filter((n) => !n.isTrainer).map((n) => ({ x: n.x, y: n.y }));
  let pathData = '';
  if (allPoints.length >= 2) {
    pathData = `M ${allPoints[0].x} ${allPoints[0].y}`;
    for (let i = 1; i < allPoints.length; i++) {
      const prev = allPoints[i - 1];
      const curr = allPoints[i];
      const bow = (i % 3 === 0) ? 18 : (i % 3 === 1) ? -12 : 6;
      const cp1x = prev.x + bow;
      const cp2x = curr.x - bow * 1.3;
      pathData += ` C ${cp1x} ${prev.y + NODE_V_SPACING * 0.35}, ${cp2x} ${curr.y - NODE_V_SPACING * 0.35}, ${curr.x} ${curr.y}`;
    }
  }

  return {
    nodes,
    pathData,
    totalHeight: currentY + 120,
    stageHeaders: headers,
  };
}

// ── Detail Card (shown on tap) ──────────────────────────────────────────────

function DetailCard({
  node,
  theme,
  onEnter,
  onDismiss,
  isNext,
}: {
  node: NodePos;
  theme: ReturnType<typeof useTheme>;
  onEnter: () => void;
  onDismiss: () => void;
  isNext: boolean;
}) {
  const t = node.topic;
  const isCompleted = t.completed;
  const stars = t.stars ?? 0;
  const summary = t.topic.summary ?? '';
  const title = t.topic.title;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent>
      <Pressable onPress={onDismiss} style={styles.cardBackdrop}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.detailCard,
            {
              backgroundColor: theme.card,
              borderColor: isCompleted ? theme.accent : isNext ? theme.primary : theme.border,
            },
          ]}>
          {/* Close hint */}
          <View style={styles.cardHandle}>
            <View style={[styles.cardHandleBar, { backgroundColor: theme.border }]} />
          </View>

          {/* Roman numeral + title */}
          <View style={styles.cardHeadRow}>
            <View
              style={[
                styles.cardNumeral,
                {
                  backgroundColor: isCompleted
                    ? theme.accent + '20'
                    : isNext
                      ? theme.primary + '15'
                      : theme.muted,
                },
              ]}>
              <Text
                style={[
                  styles.cardNumeralText,
                  {
                    color: isCompleted
                      ? theme.accent
                      : isNext
                        ? theme.primary
                        : theme.textSecondary,
                  },
                ]}>
                {toRoman(node.globalIndex + 1)}
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          {/* Summary */}
          {summary ? (
            <Text style={[styles.cardSummary, { color: theme.textSecondary }]} numberOfLines={3}>
              {summary}
            </Text>
          ) : null}

          {/* Stars */}
          {isCompleted ? (
            <View style={styles.cardStars}>
              {[1, 2, 3].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={20}
                  color={s <= stars ? theme.accent : theme.border}
                />
              ))}
              <Text style={[styles.cardStarsLabel, { color: theme.textSecondary }]}>
                Abgeschlossen
              </Text>
            </View>
          ) : isNext ? (
            <Text style={[styles.cardHint, { color: theme.primary }]}>Nächste Lektion</Text>
          ) : null}

          {/* Enter button */}
          <Pressable
            onPress={onEnter}
            style={({ pressed }) => [
              styles.enterBtn,
              { backgroundColor: isCompleted ? theme.accent : theme.primary },
              pressed && { opacity: 0.85 },
            ]}>
            <Text style={styles.enterBtnText}>
              {isCompleted ? 'Wiederholen' : 'Zur Lektion'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Stage Tablet ────────────────────────────────────────────────────────────

function StageTablet({
  y,
  label,
  completed,
  total,
  theme,
}: {
  y: number;
  label: string;
  completed: number;
  total: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={[
        tabletStyles.slab,
        {
          top: y - 14,
          backgroundColor: theme.card,
          borderColor: theme.accent + '45',
          shadowColor: theme.text,
        },
      ]}>
      <View style={tabletStyles.row}>
        <Text style={[tabletStyles.label, { color: theme.primary }]}>
          {label}
        </Text>
        <View style={[tabletStyles.meta, { borderColor: theme.accent + '50' }]}>
          <Text style={[tabletStyles.metaText, { color: theme.accent }]}>
            {completed}/{total}
          </Text>
        </View>
      </View>
    </View>
  );
}

const tabletStyles = StyleSheet.create({
  slab: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: Spacing.four,
    zIndex: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  meta: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

// ── Main Component ──────────────────────────────────────────────────────────

interface ViaSacraPathProps {
  topics: TopicWithProgress[];
  paradigmsByStage: Map<string, typeof PARADIGMS>;
}

export function ViaSacraPath({ topics, paradigmsByStage }: ViaSacraPathProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [expandedNode, setExpandedNode] = useState<NodePos | null>(null);

  const { nodes, pathData, totalHeight, stageHeaders } = useMemo(
    () => computeLayout(topics, paradigmsByStage),
    [topics, paradigmsByStage],
  );

  const firstUnlockedId = useMemo(() => {
    for (const n of nodes) {
      if (!n.isTrainer && n.topic.unlocked && !n.topic.completed) return n.topic.topic.id;
    }
    return null;
  }, [nodes]);

  const handleNodePress = useCallback((node: NodePos) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (node.isTrainer) {
      const id = node.id.replace('trainer-', '');
      router.push(`/trainer/${id}`);
      return;
    }
    if (!node.topic.unlocked) return;
    setExpandedNode(node);
  }, []);

  const handleEnter = useCallback(() => {
    if (!expandedNode) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setExpandedNode(null);
    router.push(`/grammar/${expandedNode.id}`);
  }, [expandedNode]);

  const handleDismiss = useCallback(() => {
    setExpandedNode(null);
  }, []);

  // ── Decoration system ───────────────────────────────────────────────
  //
  // Decorations (statues, pillars, temples) are placed in pairs flanking
  // the path, anchored to node rows so they follow the same rhythm as the
  // content. A single `addDecoPair` helper handles both sides at once —
  // no per-statue coordinate tweaking.

  const decorations = useMemo(() => {
    interface Deco {
      type: 'statue' | 'temple' | 'pillar';
      x: number; y: number; facingRight?: boolean;
      height: number; width: number;
      statueVariant?: number;
    }

    // ── Sizing constants (change these to scale all decorations) ──────
    const BASE_STATUE_H = 220;
    const BASE_PILLAR_H = 220;

    // X anchors — statues bleed slightly past the SVG edge for drama;
    // pillars use a smaller bleed so they stay on-screen on both sides.
    const STATUE_LEFT_X = -6;
    const PILLAR_LEFT_X = -18;

    // Y anchor: what fraction of the decoration sits above the node row
    const DECO_Y_ANCHOR = 0.65;

    // ── Reusable pair placer ──────────────────────────────────────────
    const deco: Deco[] = [];
    let variant = 0;

    function addDecoPair(
      nodeY: number,
      opts?: { includePillars?: boolean; statueScale?: number; pillarsOnly?: boolean },
    ) {
      const { includePillars = false, statueScale = 1, pillarsOnly = false } = opts ?? {};

      if (!pillarsOnly) {
        const sH = BASE_STATUE_H * statueScale;
        const sW = sH * STATUE_RATIO;
        const sY = nodeY - sH * DECO_Y_ANCHOR;
        const rightStatueX = SVG_W - sW - STATUE_LEFT_X;

        // Left statue (faces inward → right)
        deco.push({
          type: 'statue', x: STATUE_LEFT_X, y: sY,
          height: sH, width: sW,
          facingRight: true, statueVariant: variant % 2,
        });
        // Right statue (faces inward → left)
        deco.push({
          type: 'statue', x: rightStatueX, y: sY,
          height: sH, width: sW,
          facingRight: false, statueVariant: (variant + 1) % 2,
        });
        variant++;
      }

      if (includePillars || pillarsOnly) {
        const pH = BASE_PILLAR_H * statueScale;
        const pW = pH * PILLAR_RATIO;
        const pY = nodeY - pH * DECO_Y_ANCHOR;
        const rightPillarX = SVG_W - pW - PILLAR_LEFT_X;

        deco.push({ type: 'pillar', x: PILLAR_LEFT_X, y: pY, height: pH, width: pW });
        deco.push({ type: 'pillar', x: rightPillarX, y: pY, height: pH, width: pW });
      }
    }

    // ── Per-stage layout ──────────────────────────────────────────────
    for (const h of stageHeaders) {
      // Temple gateway — centered above the stage header. Latin spans full
      // width (landscape arch); Japanese is a narrower portrait centerpiece.
      const templeW = SVG_W * TEMPLE_WIDTH_FACTOR;
      const templeH = templeW / TEMPLE_RATIO;
      deco.push({
        type: 'temple', x: (SVG_W - templeW) / 2, y: h.y - templeH - 2,
        width: templeW, height: templeH,
      });

      const stageNodeYs = nodes
        .filter((n) => !n.isTrainer && n.topic.topic.stage === h.stage)
        .map((n) => n.y);

      if (stageNodeYs.length === 0) continue;

      // Entry pair — always present, with pillars framing the gateway
      addDecoPair(stageNodeYs[0], { includePillars: false });

      // Mid-stage pillars — only when the stage has enough depth to breathe
      if (stageNodeYs.length >= 5) {
        const midIdx = Math.floor(stageNodeYs.length / 2);
        addDecoPair(stageNodeYs[midIdx], { pillarsOnly: true, statueScale: 1.0 });
      }
    }
    return deco;
  }, [stageHeaders, nodes]);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 210, paddingBottom: Spacing.six }}
        contentOffset={{ x: 0, y: 210 }}
        style={{ flex: 1 }}>
        <View style={{ height: totalHeight, overflow: 'visible' }}>
        {/* ── SVG Layer ──────────────────────────────────────── */}
        <Svg
          width={SVG_W}
          height={totalHeight}
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          viewBox={`0 0 ${SVG_W} ${totalHeight}`}>
          <Defs>
            <LinearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.border} stopOpacity="0.08" />
              <Stop offset="0.2" stopColor={theme.border} stopOpacity="0.35" />
              <Stop offset="0.8" stopColor={theme.border} stopOpacity="0.35" />
              <Stop offset="1" stopColor={theme.border} stopOpacity="0.08" />
            </LinearGradient>
            {/* Gold accent gradient for completed path segments */}
            <LinearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.accent} stopOpacity="0" />
              <Stop offset="0.5" stopColor={theme.accent} stopOpacity="0.25" />
              <Stop offset="1" stopColor={theme.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Decorations (statues + temples rendered in RN overlay below) */}

          {/* Main path */}
          {pathData ? (
            <>
              <Path d={pathData} fill="none" stroke="url(#pathGrad)" strokeWidth={PATH_STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
              <Path d={pathData} fill="none" stroke={theme.border} strokeWidth={PATH_BORDER_W} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
              <Path d={pathData} fill="none" stroke={theme.textSecondary} strokeWidth={PATH_DASH_W} strokeLinecap="round" strokeDasharray="1 22" opacity={0.25} />
            </>
          ) : null}

          {/* Node circles */}
          {nodes.map((n) => {
            if (n.isTrainer) {
              return (
                <G key={n.id}>
                  {/* Solid base — blocks decorations behind */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R - 2} fill={theme.card} />
                  {/* Outer glow */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R} fill="none" stroke={theme.purple} strokeWidth={1.5} opacity={0.25} />
                  {/* Purple tint overlay */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R - 2} fill={theme.purple + '18'} />
                  {/* Stroke */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R - 2} fill="none" stroke={theme.purple} strokeWidth={2.5} opacity={0.85} />
                  {/* Top highlight */}
                  <Ellipse cx={n.x - 7} cy={n.y - 9} rx={6} ry={4} fill="#FFFFFF" opacity={0.18} />
                </G>
              );
            }
            const t = n.topic;
            const isNext = t.topic.id === firstUnlockedId;
            const isCompleted = t.completed;
            const isUnlocked = t.unlocked;
            let fill: string;
            let stroke: string;
            let strokeW: number;
            if (isCompleted) {
              fill = theme.accent + '1A';
              stroke = theme.accent;
              strokeW = 2.5;
            } else if (!isUnlocked) {
              fill = theme.muted;
              stroke = theme.border;
              strokeW = 2;
            } else if (isNext) {
              fill = theme.primary + '14';
              stroke = theme.primary;
              strokeW = 3;
            } else {
              fill = theme.card;
              stroke = theme.border;
              strokeW = 1.5;
            }
            return (
              <G key={n.id}>
                {/* Pulse ring for next unlocked */}
                {isNext && (
                  <Circle cx={n.x} cy={n.y} r={NODE_R + 12} fill="none" stroke={theme.primary} strokeWidth={1.5} opacity={0.12} />
                )}
                {/* Solid base — blocks decorations behind transparent fills */}
                {(isCompleted || isNext) && (
                  <Circle cx={n.x} cy={n.y} r={NODE_R} fill={theme.card} />
                )}
                {/* Outer rim */}
                <Circle cx={n.x} cy={n.y} r={NODE_R + 4} fill="none" stroke={stroke} strokeWidth={1} opacity={0.12} />
                {/* Main sphere */}
                <Circle cx={n.x} cy={n.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={strokeW} />
                {/* Top highlight (light reflection) */}
                <Ellipse cx={n.x - 8} cy={n.y - 10} rx={7} ry={4.5} fill="#FFFFFF" opacity={0.22} />
                {/* Completed laurel wreath */}
                {isCompleted && <LaurelWreath cx={n.x} cy={n.y - 2} size={26} color={theme.accent} />}
              </G>
            );
          })}
        </Svg>

        {/* ── Temples (RN overlay) ──────────────────────────── */}
        {decorations
          .filter((d) => d.type === 'temple')
          .map((d, i) => (
            <View
              key={`temple-${i}`}
              style={[styles.decoWrap, { left: d.x, top: d.y, width: d.width, height: d.height }]}>
              <Image
                source={TempleImg}
                style={[styles.decoImage, { opacity: 0.55 }]}
                contentFit="contain"
                transition={reducedMotion ? 0 : 240}
                cachePolicy="memory-disk"
              />
            </View>
          ))}

        {/* ── Statues (RN overlay, alternating two cut-out WebP) ────── */}
        {decorations
          .filter((d) => d.type === 'statue')
          .map((d, i) => {
            const statueImg = d.statueVariant === 0 ? StatueA : StatueB;
            const flip = d.facingRight ? 1 : -1;
            return (
              <View
                key={`statue-${i}`}
                style={[
                  styles.decoWrap,
                  {
                    left: d.x,
                    top: d.y,
                    width: d.width,
                    height: d.height,
                    transform: [{ scaleX: flip }],
                  },
                ]}>
                <Image
                  source={statueImg}
                  style={[styles.decoImage, { opacity: 0.7 }]}
                  contentFit="contain"
                  transition={reducedMotion ? 0 : 240}
                  cachePolicy="memory-disk"
                />
              </View>
            );
          })}

        {/* ── Pillars (RN overlay, gateway columns inside statues) ── */}
        {decorations
          .filter((d) => d.type === 'pillar')
          .map((d, i) => (
            <View
              key={`pillar-${i}`}
              style={[styles.decoWrap, { left: d.x, top: d.y, width: d.width, height: d.height }]}>
              <Image
                source={PillarImg}
                style={[styles.decoImage, { opacity: 0.6 }]}
                contentFit="contain"
                transition={reducedMotion ? 0 : 240}
                cachePolicy="memory-disk"
              />
            </View>
          ))}

        {/* ── Stage Headers — inscribed tablets ──────────────── */}
        {stageHeaders.map((h) => (
          <StageTablet
            key={h.stage}
            y={h.y}
            label={STAGE_LABELS[h.stage] ?? h.stage}
            completed={h.completed}
            total={h.total}
            theme={theme}
          />
        ))}

        {/* ── Interactive Nodes ──────────────────────────────── */}
        {nodes.map((n) => {
          if (n.isTrainer) {
            return (
              <Pressable
                key={n.id}
                onPress={() => {
                  router.push(`/trainer/${n.id.replace('trainer-', '')}`);
                }}
                style={[styles.nodeTouch, { left: n.x - NODE_TOUCH_R, top: n.y - NODE_TOUCH_R }]}>
                <Ionicons name="flash-outline" size={17} color={theme.purple} />
              </Pressable>
            );
          }
          const t = n.topic;
          const isCompleted = t.completed;
          const isUnlocked = t.unlocked;
          const isNext = t.topic.id === firstUnlockedId;
          const romanLabel = toRoman(n.globalIndex + 1);

          return (
            <Pressable
              key={n.id}
              onPress={() => handleNodePress(n)}
              style={[styles.nodeTouch, { left: n.x - NODE_TOUCH_R, top: n.y - NODE_TOUCH_R }]}>
              {isCompleted ? (
                <Ionicons name="star" size={24} color={theme.accent} />
              ) : !isUnlocked ? (
                <Ionicons name="lock-closed" size={18} color={theme.textSecondary} />
              ) : (
                <Text style={[styles.nodeNumeral, { color: isNext ? theme.primary : theme.text, fontSize: isNext ? 22 : 17 }]}>
                  {romanLabel}
                </Text>
              )}
            </Pressable>
          );
        })}

      </View>
    </ScrollView>

    {/* ── Detail Card (modal overlay, outside ScrollView to fill viewport) ── */}
    {expandedNode && (
      <DetailCard
        node={expandedNode}
        theme={theme}
        onEnter={handleEnter}
        onDismiss={handleDismiss}
        isNext={expandedNode.topic.topic.id === firstUnlockedId}
      />
    )}
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const screenW = Dimensions.get('window').width;

const styles = StyleSheet.create({
  // ── Stage header: inscribed tablet ─────────────────────────────────────────
  stageSlab: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: Spacing.four,
    zIndex: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  slabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slabLabel: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.5,
    // Engraved depth: subtle dark shadow below glyphs
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  slabMeta: {
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  slabMetaText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  nodeTouch: {
    position: 'absolute',
    width: NODE_TOUCH_R * 2,
    height: NODE_TOUCH_R * 2,
    borderRadius: NODE_TOUCH_R,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  nodeNumeral: {
    fontWeight: '800',
    fontFamily: Fonts.serif,
    letterSpacing: 0.5,
  },
  decoWrap: {
    position: 'absolute',
    zIndex: 0,
  },
  decoImage: {
    width: '100%',
    height: '100%',
  },

  // ── Detail Card ──────────────────────────────────────────
  cardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCard: {
    width: Math.min(screenW - 48, 320),
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHandle: {
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  cardHandleBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardNumeral: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardNumeralText: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '800',
  },
  cardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.2,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStarsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: Spacing.one,
  },
  cardHint: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  enterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 4,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
  },
  enterBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
