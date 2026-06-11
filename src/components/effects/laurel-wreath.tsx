import { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * Hand-built laurel wreath (two branches, leaves shrinking toward the top
 * opening, berries near the base). ~45 SVG nodes total — cheap to render,
 * unlike the auto-traced decoration SVGs that must stay rasterized.
 */

const C = 60; // viewBox center
const R = 44; // branch radius

function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

type LeafSpec =
  | { kind: 'stem'; d: string }
  | { kind: 'leaf'; x: number; y: number; rx: number; ry: number; rot: number; opacity: number }
  | { kind: 'berry'; x: number; y: number };

function buildBranch(side: 1 | -1): LeafSpec[] {
  const out: LeafSpec[] = [];
  const N = 9;
  const startDeg = 90 + side * 14;
  const endDeg = 90 + side * 152;

  const [sx, sy] = polar(startDeg, R);
  const [ex, ey] = polar(endDeg, R);
  out.push({
    kind: 'stem',
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${R} ${R} 0 0 ${side === 1 ? 1 : 0} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
  });

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const deg = startDeg + side * (10 + t * 132);
    const scale = 1 - t * 0.45;
    const [lx, ly] = polar(deg, R + 4.5);
    out.push({ kind: 'leaf', x: lx, y: ly, rx: 3.2 * scale, ry: 8.2 * scale, rot: deg + side * 32, opacity: 0.95 });
    const [ix, iy] = polar(deg + side * 4, R - 4.5);
    out.push({ kind: 'leaf', x: ix, y: iy, rx: 2.7 * scale, ry: 7 * scale, rot: deg - side * 6, opacity: 0.78 });
  }
  for (const off of [26, 64, 102]) {
    const [bx, by] = polar(90 + side * off, R + 7.5);
    out.push({ kind: 'berry', x: bx, y: by });
  }
  return out;
}

const BRANCHES: LeafSpec[] = [...buildBranch(1), ...buildBranch(-1)];

type LaurelWreathProps = {
  /** Rendered width/height in px. */
  size: number;
  color?: string;
  opacity?: number;
};

export const LaurelWreath = memo(function LaurelWreath({
  size,
  color = '#C9A227',
  opacity = 1,
}: LaurelWreathProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" pointerEvents="none">
      <G opacity={opacity}>
        {BRANCHES.map((s, i) => {
          if (s.kind === 'stem') {
            return (
              <Path
                key={i}
                d={s.d}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          }
          if (s.kind === 'berry') {
            return <Circle key={i} cx={s.x} cy={s.y} r={1.7} fill={color} opacity={0.9} />;
          }
          return (
            <Ellipse
              key={i}
              cx={s.x}
              cy={s.y}
              rx={s.rx}
              ry={s.ry}
              fill={color}
              opacity={s.opacity}
              transform={`rotate(${s.rot.toFixed(1)} ${s.x.toFixed(1)} ${s.y.toFixed(1)})`}
            />
          );
        })}
      </G>
    </Svg>
  );
});
