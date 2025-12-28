// lib/premiumPipeline.ts
// Premium, manufacturable pipeline: emotion tagging, contour-based SVG, and logic trail.

import type { VisualFeatures } from '../types';
import { vectorizeToSVG } from './vectorizer';

export type EmotionTag =
  | 'comfort' | 'gentleness' | 'clarity' | 'alertness'
  | 'tranquility' | 'vitality' | 'hope' | 'lightness'
  | 'depth' | 'introspection' | 'calm' | 'curiosity'
  | 'stillness' | 'resilience' | 'nostalgia' | 'winter memory';

export type EmotionTaxonomy = EmotionTag[];
export type EmotionTags = EmotionTag[];

export interface ContourPoint { x: number; y: number }
export type ContourPath = ContourPoint[];

export interface SVGOptions {
  strokeColor: string;
  fillColor: string;
  scale: number; // 0.. ?; 1.0 normal scaling within 100x100 viewbox
  strokeWidth?: number; // px
  fillOpacity?: number; // 0..1
  desc?: string; // optional <desc> content
}

export function mapEmotionTags(features: VisualFeatures, taxonomy: EmotionTaxonomy): EmotionTags {
  const { shape, texture, brightness, complexity, seasonTags } = features as any;
  const tags: EmotionTag[] = [];

  // Texture
  if (texture === 'velvety') tags.push('comfort', 'gentleness');
  if (texture === 'crisp') tags.push('clarity', 'alertness');
  // Brand tuning
  if (texture && typeof texture === 'string' && texture.includes('spiky')) tags.push('resilience');
  if (texture === 'velvety' && shape === 'linear') tags.push('stillness');
  if (complexity === 'simple' && texture === 'clustered') tags.push('stillness');

  // Shape
  if (shape === 'linear') tags.push('tranquility');
  if (shape === 'radial' || shape === 'round') tags.push('vitality');

  // Brightness
  if (typeof brightness === 'number' && brightness > 0.85) tags.push('hope'); // tuned threshold
  if (typeof brightness === 'number' && brightness > 0.75) tags.push('lightness');
  if (typeof brightness === 'number' && brightness < 0.4) tags.push('depth', 'introspection');
  if (typeof brightness === 'number' && brightness < 0.5) tags.push('nostalgia');

  // Complexity
  if (complexity === 'simple') tags.push('calm');
  if (complexity === 'complex') tags.push('curiosity');

  // Seasonal nuance
  if (Array.isArray(seasonTags) && seasonTags.includes('winter')) tags.push('winter memory');

  // Deduplicate + validate against taxonomy
  const unique = Array.from(new Set(tags)) as EmotionTag[];
  return unique.filter(t => taxonomy.includes(t));
}

export function generateSVGFromContour(contour: ContourPath, options: SVGOptions): string {
  const { strokeColor, fillColor, scale, strokeWidth = 1.5, fillOpacity = 0.85, desc } = options;
  if (!contour || contour.length === 0) return '';
  const scaled = contour.map(p => ({ x: p.x * scale, y: p.y * scale }));
  const [first, ...rest] = scaled;
  const d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ` +
            rest.map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
  const descTag = desc ? `<desc>${escapeXml(desc)}</desc>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${descTag}<path d="${d}" stroke="${strokeColor}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke-width="${strokeWidth}"/></svg>`;
}

// Derive a simple 12-point contour from a background-removed image (data URL)
export async function deriveContourFromImage(imageDataUrl: string): Promise<ContourPath> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Draw at manageable size for scanning
      const MAX = 200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(defaultRoundedPolygon()); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      // Compute bounding box of non-transparent pixels
      let minX = w, minY = h, maxX = 0, maxY = 0; let hasPixels = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 10) { // visible
            hasPixels = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (!hasPixels) { resolve(defaultRoundedPolygon()); return; }

      // Center and radii
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = Math.max(8, (maxX - minX) / 2);
      const ry = Math.max(8, (maxY - minY) / 2);

      // Sample 12 directions and walk outward until transparency
      const N = 12;
      const contour: ContourPath = [];
      for (let i = 0; i < N; i++) {
        const theta = (i / N) * Math.PI * 2;
        // Max radius along this direction based on bbox ellipse approximation
        const maxR = 1.05 * (rx * ry) / Math.sqrt((ry * Math.cos(theta)) ** 2 + (rx * Math.sin(theta)) ** 2);
        let r = 0;
        let lastInsideX = cx, lastInsideY = cy;
        while (r <= maxR) {
          const x = Math.round(cx + r * Math.cos(theta));
          const y = Math.round(cy + r * Math.sin(theta));
          if (x < 0 || x >= w || y < 0 || y >= h) break;
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 10) {
            lastInsideX = x; lastInsideY = y;
            r += 1;
          } else {
            break;
          }
        }
        // Map to 100x100 coordinate space preserving aspect based on bbox
        const normX = 50 + ((lastInsideX - cx) / (rx || 1)) * 45;
        const normY = 50 + ((lastInsideY - cy) / (ry || 1)) * 45;
        contour.push({ x: clamp(normX, 5, 95), y: clamp(normY, 5, 95) });
      }
      resolve(contour);
    };
    img.onerror = () => resolve(defaultRoundedPolygon());
    img.src = imageDataUrl;
  });
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

function defaultRoundedPolygon(): ContourPath {
  // Simple 8-point rounded flower-like polygon
  const pts: ContourPath = [];
  const N = 8; const r = 38;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const wobble = 1 + 0.12 * Math.sin(3 * t);
    pts.push({ x: 50 + r * wobble * Math.cos(t), y: 50 + r * wobble * Math.sin(t) });
  }
  return pts;
}

export interface PremiumPipelineResult {
  svg: string;
  tags: EmotionTags;
  logicTrail: string[];
}

export async function runPremiumPipeline(
  imageDataUrl: string,
  features: VisualFeatures,
  taxonomy: EmotionTaxonomy,
  svgColors?: { stroke?: string; fill?: string },
): Promise<PremiumPipelineResult> {
  const logicTrail: string[] = [];
  logicTrail.push(`Visual features: shape=${(features as any).shape}, texture=${(features as any).texture}, brightness=${(features as any).brightness?.toFixed?.(2) ?? features['brightness']}, complexity=${(features as any).complexity}`);

  const derivedTags = mapEmotionTags(features, taxonomy);
  logicTrail.push(`Emotion tags mapped via taxonomy: ${derivedTags.join(', ') || 'none'}`);

  let svg = '';
  try {
    // Use ImageTracer for complex textures/spiky needles; fall back to contour silhouette
    if ((features as any).texture === 'spiky' || (features as any).complexity === 'complex') {
      svg = await vectorizeToSVG(imageDataUrl);
      logicTrail.push('SVG generated via ImageTracer vectorization for high-fidelity foliage.');
    } else {
      const contour = await deriveContourFromImage(imageDataUrl);
      logicTrail.push(`Contour derived with ${contour.length} points from background-removed image.`);
      const stroke = svgColors?.stroke || '#4B3F2F';
      const fill = svgColors?.fill || '#9CA3AF';
      const svgDesc = `Emotion tags: ${derivedTags.join(', ')}`;
      svg = generateSVGFromContour(contour, { strokeColor: stroke, fillColor: fill, scale: 1.0, strokeWidth: 1.5, fillOpacity: 0.85, desc: svgDesc });
      logicTrail.push(`SVG generated with fill=${fill}, stroke=${stroke}, strokeWeight=1.5px, fillOpacity=0.85`);
    }
  } catch (e) {
    const contour = await deriveContourFromImage(imageDataUrl);
    logicTrail.push(`Vectorization failed; falling back. Contour derived with ${contour.length} points.`);
    const stroke = svgColors?.stroke || '#4B3F2F';
    const fill = svgColors?.fill || '#9CA3AF';
    const svgDesc = `Emotion tags: ${derivedTags.join(', ')}`;
    svg = generateSVGFromContour(contour, { strokeColor: stroke, fillColor: fill, scale: 1.0, strokeWidth: 1.5, fillOpacity: 0.85, desc: svgDesc });
  }

  // Smart fallbacks
  const tags = derivedTags.length ? derivedTags : (['calm'] as EmotionTags);
  if (derivedTags.length === 0) logicTrail.push('No emotion tags matched; applied fallback tag: calm. Flag for manual review.');
  if (!svg) logicTrail.push('SVG generation returned empty; consider botanical illustration or tone-based overlay fallback.');

  return { svg, tags, logicTrail };
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
