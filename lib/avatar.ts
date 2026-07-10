/**
 * Avatar generator inspired by popular libraries:
 * - Boring Avatars (beam, marble, ring, sunset styles)
 * - GitHub identicons (pixel/grid style)
 *
 * All avatars are deterministic SVGs generated from a seed string.
 * No external dependencies required.
 */
import crypto from 'crypto';

// ─── Color Palettes ────────────────────────────────────────────────
// Curated palettes inspired by Boring Avatars / modern design systems.
// Each palette is a set of 4-5 harmonious colors.

const PALETTES: string[][] = [
  ['#FF8A65', '#FFD54F', '#81C784', '#4DB6AC'], // warm earth
  ['#42A5F5', '#26C6DA', '#66BB6A', '#9CCC65'], // cool greens
  ['#AB47BC', '#7E57C2', '#5C6BC0', '#42A5F5'], // purple-blue
  ['#EF5350', '#FF7043', '#FFA726', '#FFCA28'], // sunset fire
  ['#26C6DA', '#26A69A', '#66BB6A', '#9CCC65'], // teal-green
  ['#5C6BC0', '#7E57C2', '#AB47BC', '#EC407A'], // indigo-pink
  ['#42A5F5', '#1E88E5', '#3949AB', '#5C6BC0'], // ocean blue
  ['#FFA726', '#FF7043', '#EF5350', '#EC407A'], // warm coral
  ['#66BB6A', '#9CCC65', '#D4E157', '#FFEE58'], // fresh lime
  ['#26A69A', '#4DB6AC', '#80CBC4', '#B2DFDB'], // mint
  ['#7E57C2', '#9575CD', '#B39DDB', '#D1C4E9'], // lavender
  ['#EC407A', '#F06292', '#F48FB1', '#F8BBD0'], // rose
  ['#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9'], // periwinkle
  ['#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2'], // cyan
  ['#FFCA28', '#FFD54F', '#FFE082', '#FFECB3'], // gold
  ['#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8'], // mocha
  ['#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC'], // steel
  ['#9CCC65', '#AED581', '#C5E1A5', '#DCEDC8'], // sage
];

function hashString(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function hashToNumber(str: string, max: number): number {
  const hash = hashString(str);
  return parseInt(hash.substring(0, 8), 16) % max;
}

function getPalette(seed: string): string[] {
  return PALETTES[hashToNumber(seed, PALETTES.length)];
}

// ─── Style: Beam (Boring Avatars inspired) ─────────────────────────
// Layered geometric shapes on a rounded-square background.
// Very popular in modern apps (Linear, Vercel, etc.)

function generateBeamSvg(seed: string, size: number): string {
  const palette = getPalette(seed);
  const [bg, c1, c2, c3] = palette;

  // Deterministic shape selection
  const shape1 = hashToNumber(seed + '-s1', 3); // 0: circle, 1: rect, 2: triangle
  const shape2 = hashToNumber(seed + '-s2', 3);
  const shape3 = hashToNumber(seed + '-s3', 3);

  // Positions (deterministic)
  const x1 = hashToNumber(seed + '-x1', 3) / 2; // 0, 0.5, or 1
  const y1 = hashToNumber(seed + '-y1', 3) / 2;
  const x2 = hashToNumber(seed + '-x2', 3) / 2;
  const y2 = hashToNumber(seed + '-y2', 3) / 2;

  const s = size;

  function shape(type: number, cx: number, cy: number, r: number, color: string): string {
    const px = cx * s;
    const py = cy * s;
    if (type === 0) {
      return `<circle cx="${px}" cy="${py}" r="${r}" fill="${color}"/>`;
    } else if (type === 1) {
      const w = r * 1.8;
      return `<rect x="${px - w / 2}" y="${py - w / 2}" width="${w}" height="${w}" rx="${r * 0.15}" fill="${color}"/>`;
    } else {
      return `<polygon points="${px},${py - r} ${px - r * 0.866},${py + r * 0.5} ${px + r * 0.866},${py + r * 0.5}" fill="${color}"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${bg}"/>
    ${shape(shape1, x1, y1, s * 0.28, c1)}
    ${shape(shape2, x2, y2, s * 0.22, c2)}
    ${shape(shape3, 0.5, 0.5, s * 0.14, c3)}
  </svg>`;
}

// ─── Style: Marble (Boring Avatars inspired) ───────────────────────
// Smooth radial gradient blobs for an organic, polished look.

function generateMarbleSvg(seed: string, size: number): string {
  const palette = getPalette(seed);
  const [c1, c2, c3, c4] = palette;
  const s = size;

  // Deterministic blob positions
  const cx1 = 0.2 + (hashToNumber(seed + '-cx1', 60) / 100);
  const cy1 = 0.2 + (hashToNumber(seed + '-cy1', 60) / 100);
  const cx2 = 0.5 + (hashToNumber(seed + '-cx2', 50) / 100);
  const cy2 = 0.5 + (hashToNumber(seed + '-cy2', 50) / 100);
  const cx3 = 0.3 + (hashToNumber(seed + '-cx3', 40) / 100);
  const cy3 = 0.6 + (hashToNumber(seed + '-cy3', 40) / 100);

  const uid = seed.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <defs>
      <radialGradient id="g1-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c1}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g2-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c2}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="g3-${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c3}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${c4}"/>
    <circle cx="${cx1 * s}" cy="${cy1 * s}" r="${s * 0.5}" fill="url(#g1-${uid})"/>
    <circle cx="${cx2 * s}" cy="${cy2 * s}" r="${s * 0.45}" fill="url(#g2-${uid})"/>
    <circle cx="${cx3 * s}" cy="${cy3 * s}" r="${s * 0.4}" fill="url(#g3-${uid})"/>
  </svg>`;
}

// ─── Style: Pixel / Identicon (GitHub-inspired) ────────────────────
// Symmetric 5x5 grid where each cell is filled based on hash bits.

function generatePixelSvg(seed: string, size: number): string {
  const palette = getPalette(seed);
  const [bg, c1, c2, c3] = palette;
  const s = size;

  // Use hash bits to determine which cells are filled
  const hash = hashString(seed);
  const cells = 5;
  const cellSize = s / cells;

  let rects = '';
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < Math.ceil(cells / 2); col++) {
      const bitIndex = row * Math.ceil(cells / 2) + col;
      const bit = parseInt(hash[bitIndex % hash.length], 16) % 2 === 1;
      if (bit) {
        // Mirror column for symmetry
        const colorIdx = (row + col) % 3;
        const color = [c1, c2, c3][colorIdx];
        const x = col * cellSize;
        const y = row * cellSize;
        rects += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        // Mirror
        const mirrorCol = cells - 1 - col;
        if (mirrorCol !== col) {
          const mx = mirrorCol * cellSize;
          rects += `<rect x="${mx}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="${bg}"/>
    ${rects}
  </svg>`;
}

// ─── Style: Ring (Boring Avatars inspired) ─────────────────────────
// Concentric colored rings.

function generateRingSvg(seed: string, size: number): string {
  const palette = getPalette(seed);
  const s = size;
  const cx = s / 2;
  const cy = s / 2;

  const rings = palette.length;
  let circles = '';
  for (let i = rings - 1; i >= 0; i--) {
    const r = (s / 2) * ((i + 1) / rings);
    circles += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${palette[i]}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <clipPath id="clip-${seed.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)}">
      <rect width="${s}" height="${s}" rx="${s * 0.22}"/>
    </clipPath>
    <g clip-path="url(#clip-${seed.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)})">
      ${circles}
    </g>
  </svg>`;
}

// ─── Style: Sunset (Boring Avatars inspired) ───────────────────────
// Smooth linear gradient blend across the avatar.

function generateSunsetSvg(seed: string, size: number): string {
  const palette = getPalette(seed);
  const [c1, c2, c3, c4] = palette;
  const s = size;
  const uid = seed.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);

  // Deterministic angle
  const angle = hashToNumber(seed + '-angle', 360);

  const x1 = 50 + Math.cos((angle * Math.PI) / 180) * 50;
  const y1 = 50 + Math.sin((angle * Math.PI) / 180) * 50;
  const x2 = 50 - Math.cos((angle * Math.PI) / 180) * 50;
  const y2 = 50 - Math.sin((angle * Math.PI) / 180) * 50;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <defs>
      <linearGradient id="sunset-${uid}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="33%" stop-color="${c2}"/>
        <stop offset="66%" stop-color="${c3}"/>
        <stop offset="100%" stop-color="${c4}"/>
      </linearGradient>
    </defs>
    <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="url(#sunset-${uid})"/>
  </svg>`;
}

// ─── Style dispatch ────────────────────────────────────────────────

export type AvatarStyle = 'beam' | 'marble' | 'pixel' | 'ring' | 'sunset';

const STYLE_GENERATORS: Record<AvatarStyle, (seed: string, size: number) => string> = {
  beam: generateBeamSvg,
  marble: generateMarbleSvg,
  pixel: generatePixelSvg,
  ring: generateRingSvg,
  sunset: generateSunsetSvg,
};

// ─── Public API ────────────────────────────────────────────────────

/**
 * Generate an SVG avatar from a seed string.
 * @param seed - Any string (user ID, username, etc.)
 * @param size - Pixel size of the SVG (default 64)
 * @param style - Avatar style (default: 'beam')
 */
export function generateAvatarSvg(seed: string, size: number = 64, style: AvatarStyle = 'beam'): string {
  return STYLE_GENERATORS[style](seed, size);
}

/**
 * Generate an SVG avatar as a data URI (for use in <img src="...">).
 */
export function generateAvatarDataUri(seed: string, size: number = 64, style: AvatarStyle = 'beam'): string {
  const svg = generateAvatarSvg(seed, size, style);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Generate a random avatar seed string.
 */
export function generateRandomSeed(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate avatar from a stored seed string.
 * This is the primary function for rendering a user's current avatar.
 * The style is deterministically chosen from the seed for variety.
 */
export function generateAvatarFromSeed(seed: string, size: number = 64): string {
  const styles: AvatarStyle[] = ['beam', 'marble', 'pixel', 'ring', 'sunset'];
  const style = styles[hashToNumber(seed + '-style', styles.length)];
  return generateAvatarDataUri(seed, size, style);
}

/**
 * Generate 3 avatar preview options for the reroll modal.
 * Each option uses a different random seed for maximum variety.
 * Returns both the data URIs and the seeds so the client can tell the
 * server which seed to save.
 */
export function generateAvatarOptions(_userId: string, size: number = 64): { dataUri: string; seed: string }[] {
  const seeds = [generateRandomSeed(), generateRandomSeed(), generateRandomSeed()];
  return seeds.map(seed => ({
    dataUri: generateAvatarFromSeed(seed, size),
    seed,
  }));
}
