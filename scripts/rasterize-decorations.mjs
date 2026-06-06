// Rasterize the heavy Via-Sacra decoration SVGs into small WebP images.
//
// The source files in design/decorations-src/ are auto-traced "realistic"
// images: 5k–13k <path> nodes, 2.5–5.4 MB each. Rendering them with
// react-native-svg (SvgXml) means parsing the XML on the JS thread and
// creating one native view per path — tens of thousands of nodes, multiplied
// by every statue/temple instance on the path. That is the ~minute-long stall.
//
// These are bitmaps wearing a vector costume, so the right format is a bitmap.
// We render once, here, at roughly the on-screen size × pixel density and ship
// the WebP. Re-run after editing a source SVG:  node scripts/rasterize-decorations.mjs
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'design/decorations-src');
const outDir = join(root, 'assets/decorations');

// renderWidth = largest on-screen width (dp) × 3 (for @3x screens), rounded up
// with headroom. Temple shows at 300 dp, statues at ~113–170 dp.
const JOBS = [
  { in: 'temple.svg', out: 'temple.webp', renderWidth: 1024 },
  { in: 'statue-a.svg', out: 'statue-a.webp', renderWidth: 640 },
  { in: 'statue-b.svg', out: 'statue-b.webp', renderWidth: 640 },
];

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

for (const job of JOBS) {
  const srcPath = join(srcDir, job.in);
  const outPath = join(outDir, job.out);
  const svg = readFileSync(srcPath, 'utf8');

  // resvg → PNG buffer (transparent background, fit to target width).
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: job.renderWidth },
    background: 'rgba(0,0,0,0)',
    shapeRendering: 2, // geometricPrecision — smooth anti-aliased edges
  });
  const png = resvg.render();
  const { width, height } = png;
  const pngBuf = png.asPng();

  // sharp: PNG → WebP, keeping alpha, high effort for smallest size.
  await sharp(pngBuf)
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(outPath);

  const before = statSync(srcPath).size;
  const after = statSync(outPath).size;
  console.log(
    `${job.in.padEnd(14)} → ${job.out.padEnd(14)} ${width}×${height}  ` +
      `${kb(before).padStart(9)} → ${kb(after).padStart(7)}  ` +
      `(${(before / after).toFixed(0)}× smaller)`,
  );
}
