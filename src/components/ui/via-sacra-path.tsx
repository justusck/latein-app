import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { TopicWithProgress } from '@/lib/grammar';
import { PARADIGMS } from '@/data/paradigms';

// Decorative statues + temples flanking the path. The source art is auto-traced
// "realistic" SVGs (5k–13k <path> nodes, 2.5–5.4 MB each). Rendering those with
// react-native-svg meant parsing megabytes of XML on the JS thread and creating
// tens of thousands of native nodes per instance — that was the ~minute stall.
// They are bitmaps in vector clothing, so we ship pre-rasterized WebP (built by
// scripts/rasterize-decorations.mjs from design/decorations-src/) and draw them
// with expo-image, which decodes natively and caches. ~13 MB SVG → ~340 KB WebP.
const StatueA = require('../../../assets/decorations/statue-a.webp');
const StatueB = require('../../../assets/decorations/statue-b.webp');
const TempleImg = require('../../../assets/decorations/temple.webp');

// Natural aspect ratios (source viewBox)
const STATUE_RATIO = 1024 / 1536; // ~0.67 portrait
const TEMPLE_RATIO = 1536 / 1024; // ~1.5 landscape

// ── Roman numerals ──────────────────────────────────────────────────────────

const ROMAN = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

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
const PATH_STROKE_W = 9;
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
    currentY += 52;

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

  // Decorative elements
  const decorations = useMemo(() => {
    interface Deco {
      type: 'statue' | 'temple';
      x: number; y: number; facingRight?: boolean;
      height: number; width: number;
      /** Index into the statue SVGs (0 = StatueA, 1 = StatueB) */
      statueVariant?: number;
    }
    const deco: Deco[] = [];
    let statueFlip = 0;

    for (const h of stageHeaders) {
      // Temple gateway at stage top — centered, wide landscape
      const templeW = 300;
      const templeH = templeW / TEMPLE_RATIO;
      deco.push({
        type: 'temple',
        x: (SVG_W - templeW) / 2,
        y: h.y - templeH - 4,
        width: templeW,
        height: templeH,
      });

      const stageNodeYs = nodes
        .filter((n) => !n.isTrainer && n.topic.topic.stage === h.stage)
        .map((n) => n.y);

      if (stageNodeYs.length === 0) continue;

      // Statues flanking the stage — taller, more imposing
      const statueH = 170;
      const statueW = statueH * STATUE_RATIO;

      // Left statue: aligned with first node
      deco.push({
        type: 'statue',
        x: 0,
        y: stageNodeYs[0] - statueH + 30,
        height: statueH,
        width: statueW,
        facingRight: true,
        statueVariant: statueFlip % 2,
      });
      statueFlip++;

      // Right statue: between first and second node
      if (stageNodeYs.length >= 2) {
        const rightY = (stageNodeYs[0] + stageNodeYs[1]) / 2 - statueH / 2;
        deco.push({
          type: 'statue',
          x: SVG_W - statueW - 4,
          y: rightY,
          height: statueH,
          width: statueW,
          facingRight: false,
          statueVariant: statueFlip % 2,
        });
        statueFlip++;
      }

      // Extra statues for larger stages (4+ topics)
      if (stageNodeYs.length >= 4) {
        deco.push({
          type: 'statue',
          x: 0,
          y: stageNodeYs[3] - statueH + 30,
          height: statueH * 0.85,
          width: statueW * 0.85,
          facingRight: true,
          statueVariant: statueFlip % 2,
        });
        statueFlip++;
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
          style={StyleSheet.absoluteFill}
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
              <Path d={pathData} fill="none" stroke={theme.border} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
              <Path d={pathData} fill="none" stroke={theme.textSecondary} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 22" opacity={0.09} />
            </>
          ) : null}

          {/* Node circles */}
          {nodes.map((n) => {
            if (n.isTrainer) {
              return (
                <G key={n.id}>
                  {/* Drop shadow */}
                  <Circle cx={n.x + 1.5} cy={n.y + 2.5} r={NODE_R - 2} fill="none" stroke={theme.text} strokeWidth={3} opacity={0.12} />
                  {/* Outer glow */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R} fill="none" stroke={theme.purple} strokeWidth={1.5} opacity={0.2} />
                  {/* Main sphere */}
                  <Circle cx={n.x} cy={n.y} r={NODE_R - 2} fill={theme.purple + '18'} stroke={theme.purple} strokeWidth={2.5} opacity={0.85} />
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
                {/* Drop shadow */}
                <Circle cx={n.x + 1.5} cy={n.y + 2.5} r={NODE_R} fill="none" stroke={theme.text} strokeWidth={3} opacity={0.1} />
                {/* Outer rim */}
                <Circle cx={n.x} cy={n.y} r={NODE_R + 4} fill="none" stroke={stroke} strokeWidth={1} opacity={0.15} />
                {/* Main sphere */}
                <Circle cx={n.x} cy={n.y} r={NODE_R} fill={fill} stroke={stroke} strokeWidth={strokeW} />
                {/* Inner rim — depth */}
                <Circle cx={n.x} cy={n.y} r={NODE_R - 3} fill="none" stroke={stroke} strokeWidth={0.8} opacity={0.12} />
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

        {/* ── Stage Headers ──────────────────────────────────── */}
        {stageHeaders.map((h) => (
          <View key={h.stage} style={[styles.stageOverlay, { top: h.y - 8 }]}>
            <Text style={[styles.stageLabel, { color: theme.primary }]}>
              {STAGE_LABELS[h.stage] ?? h.stage}
            </Text>
            <View style={[styles.stageMeta, { backgroundColor: theme.muted }]}>
              <Text style={[styles.stageMetaText, { color: theme.textSecondary }]}>
                {h.completed}/{h.total}
              </Text>
            </View>
          </View>
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
  stageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    height: 40,
    zIndex: 5,
  },
  stageLabel: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stageMeta: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  stageMetaText: {
    fontSize: 12,
    fontWeight: '700',
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
    zIndex: 1,
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
