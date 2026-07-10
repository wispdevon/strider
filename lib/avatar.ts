/**
 * SVG avatar generator
 * Generates deterministic animalistic/abstract avatars based on user ID or username
 */
import crypto from 'crypto';

// Color palette - soft, natural tones for animalistic feel
const colors = [
  '#A0AEC0', '#8A9BA8', '#718BAE', '#6B9AC4', '#7FB3D5',
  '#95A0B5', '#B8A9C9', '#C5A3C9', '#D4A5A5', '#D4B88C',
  '#A3BE8C', '#B5CEA8', '#8CA37F', '#A8C080', '#C0B080'
];

// Simple geometric shapes for animalistic/abstract avatars
const shapeStyles = [
  // Bear face (circle with ears)
  (size: number, primary: string, secondary: string) => `
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${primary}"/>
    <circle cx="${size/2 - size/4}" cy="${size/2 - size/3}" r="${size/8}" fill="${primary}"/>
    <circle cx="${size/2 + size/4}" cy="${size/2 - size/3}" r="${size/8}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2 + size/6}" r="${size/6}" fill="${secondary}"/>
  `,
  // Bird (oval body with wing)
  (size: number, primary: string, secondary: string) => `
    <ellipse cx="${size/2}" cy="${size/2 + size/8}" rx="${size/3}" ry="${size/3.5}" fill="${primary}"/>
    <path d="M${size/2 - size/4},${size/2 - size/4} Q${size/2},${size/2 - size/2} ${size/2 + size/4},${size/2 - size/4}" stroke="${secondary}" stroke-width="${size/12}" fill="none"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/3}" r="${size/12}" fill="${secondary}"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 - size/3}" r="${size/12}" fill="${secondary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/8}" fill="${secondary}"/>
  `,
  // Fish (body with tail and fin)
  (size: number, primary: string, secondary: string) => `
    <ellipse cx="${size/2}" cy="${size/2}" rx="${size/3}" ry="${size/4}" fill="${primary}"/>
    <path d="M${size/2 + size/3},${size/2} L${size/2 + size/4},${size/2 - size/6} L${size/2 + size/4},${size/2 + size/6} Z" fill="${secondary}"/>
    <path d="M${size/2},${size/2 - size/4} Q${size/2 - size/6},${size/2 - size/3} ${size/2 - size/5},${size/2 - size/6}" fill="${secondary}"/>
    <circle cx="${size/2 - size/4}" cy="${size/2 - size/3}" r="${size/10}" fill="${secondary}"/>
  `,
  // Cat face (circle with ears and eyes)
  (size: number, primary: string, secondary: string) => `
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${primary}"/>
    <polygon points="${size/2 - size/4},${size/2 - size/3} ${size/2 - size/3},${size/2 - size/2} ${size/2},${size/2 - size/3}" fill="${primary}"/>
    <polygon points="${size/2 + size/4},${size/2 - size/3} ${size/2 + size/3},${size/2 - size/2} ${size/2},${size/2 - size/3}" fill="${primary}"/>
    <circle cx="${size/2 - size/5}" cy="${size/2}" r="${size/8}" fill="${secondary}"/>
    <circle cx="${size/2 + size/5}" cy="${size/2}" r="${size/8}" fill="${secondary}"/>
    <circle cx="${size/2 - size/5}" cy="${size/2}" r="${size/12}" fill="#FFFFFF"/>
    <circle cx="${size/2 + size/5}" cy="${size/2}" r="${size/12}" fill="#FFFFFF"/>
    <circle cx="${size/2}" cy="${size/2 + size/4}" r="${size/5}" fill="${secondary}"/>
  `,
  // Rabbit (long ears)
  (size: number, primary: string, secondary: string) => `
    <ellipse cx="${size/2}" cy="${size/2 + size/6}" rx="${size/3}" ry="${size/3}" fill="${primary}"/>
    <rect x="${size/2 - size/12}" y="${size/2 - size/2}" width="${size/6}" height="${size/3}" rx="${size/12}" fill="${primary}"/>
    <rect x="${size/2 + size/12 - size/6}" y="${size/2 - size/2}" width="${size/6}" height="${size/3}" rx="${size/12}" fill="${primary}"/>
    <circle cx="${size/2 - size/6}" cy="${size/2 + size/6}" r="${size/10}" fill="${secondary}"/>
    <circle cx="${size/2 + size/6}" cy="${size/2 + size/6}" r="${size/10}" fill="${secondary}"/>
  `,
  // Owl (round with big eyes)
  (size: number, primary: string, secondary: string) => `
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${primary}"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/6}" r="${size/6}" fill="${secondary}"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 - size/6}" r="${size/6}" fill="${secondary}"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/6}" r="${size/10}" fill="#FFFFFF"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 - size/6}" r="${size/10}" fill="#FFFFFF"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/6}" r="${size/12}" fill="#333333"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 - size/6}" r="${size/12}" fill="#333333"/>
    <ellipse cx="${size/2}" cy="${size/2 + size/4}" rx="${size/6}" ry="${size/10}" fill="${secondary}"/>
  `,
  // Fox (pointed ears)
  (size: number, primary: string, secondary: string) => `
    <path d="M${size/2 - size/3},${size/2} Q${size/2},${size/2 - size/2} ${size/2 + size/3},${size/2} Q${size/2},${size/2 + size/2} ${size/2 - size/3},${size/2} Z" fill="${primary}"/>
    <polygon points="${size/2 - size/4},${size/2 - size/3} ${size/2 - size/3},${size/2 - size/2} ${size/2 - size/5},${size/2 - size/3}" fill="${primary}"/>
    <polygon points="${size/2 + size/4},${size/2 - size/3} ${size/2 + size/3},${size/2 - size/2} ${size/2 + size/5},${size/2 - size/3}" fill="${primary}"/>
    <circle cx="${size/2 - size/6}" cy="${size/2}" r="${size/10}" fill="${secondary}"/>
    <circle cx="${size/2 + size/6}" cy="${size/2}" r="${size/10}" fill="${secondary}"/>
    <circle cx="${size/2}" cy="${size/2 + size/5}" r="${size/6}" fill="${secondary}"/>
  `,
  // Whale (curved body)
  (size: number, primary: string, secondary: string) => `
    <path d="M${size/2 - size/3},${size/2 + size/6} Q${size/2},${size/2 - size/4} ${size/2 + size/3},${size/2 + size/6} Q${size/2 + size/2},${size/2 + size/3} ${size/2},${size/2 + size/2}" fill="${primary}"/>
    <circle cx="${size/2 - size/4}" cy="${size/2}" r="${size/8}" fill="${secondary}"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/5}" r="${size/12}" fill="#FFFFFF"/>
    <path d="M${size/2 + size/3},${size/2 + size/6} L${size/2 + size/2.5},${size/2 + size/4}" stroke="${secondary}" stroke-width="${size/10}" fill="none"/>
  `,
  // Elephant (trunk)
  (size: number, primary: string, secondary: string) => `
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${primary}"/>
    <rect x="${size/2 - size/12}" y="${size/2 + size/6}" width="${size/6}" height="${size/4}" rx="${size/12}" fill="${primary}"/>
    <path d="M${size/2},${size/2 + size/6 + size/4} Q${size/2 - size/8},${size/2 + size/2} ${size/2},${size/2 + size/2.5} Q${size/2 + size/8},${size/2 + size/2} ${size/2},${size/2 + size/6 + size/4}" stroke="${secondary}" stroke-width="${size/10}" fill="none"/>
    <circle cx="${size/2 - size/5}" cy="${size/2 - size/6}" r="${size/10}" fill="${secondary}"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 - size/6}" r="${size/10}" fill="${secondary}"/>
  `
];

// Abstract geometric patterns
const abstractPatterns = [
  // Triangle pattern
  (size: number, primary: string, secondary: string) => `
    <polygon points="${size/2},${size/2 - size/3} ${size/2 - size/3},${size/2 + size/4} ${size/2 + size/3},${size/2 + size/4}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/8}" fill="${secondary}"/>
  `,
  // Diamond with center
  (size: number, primary: string, secondary: string) => `
    <rect x="${size/2 - size/4}" y="${size/2 - size/12}" width="${size/2}" height="${size/6}" fill="${primary}"/>
    <rect x="${size/2 - size/12}" y="${size/2 - size/4}" width="${size/6}" height="${size/2}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/5}" fill="${secondary}"/>
  `,
  // Hexagon
  (size: number, primary: string, secondary: string) => `
    <polygon points="${size/2},${size/2 - size/3} ${size/2 + size/4},${size/2 - size/6} ${size/2 + size/4},${size/2 + size/6} ${size/2},${size/2 + size/3} ${size/2 - size/4},${size/2 + size/6} ${size/2 - size/4},${size/2 - size/6}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/5}" fill="${secondary}"/>
  `,
  // Cross
  (size: number, primary: string, secondary: string) => `
    <rect x="${size/2 - size/8}" y="${size/2 - size/3}" width="${size/4}" height="${size*2/3}" fill="${primary}"/>
    <rect x="${size/2 - size/3}" y="${size/2 - size/8}" width="${size*2/3}" height="${size/4}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${secondary}"/>
  `,
  // Three circles
  (size: number, primary: string, secondary: string) => `
    <circle cx="${size/2 - size/5}" cy="${size/2}" r="${size/6}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2 - size/5}" r="${size/6}" fill="${primary}"/>
    <circle cx="${size/2 + size/5}" cy="${size/2 + size/5}" r="${size/6}" fill="${primary}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="${secondary}"/>
  `
];

function hashToNumber(str: string, max: number): number {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return parseInt(hash.substring(0, 8), 16) % max;
}

export function generateAvatarSvg(seed: string, size: number = 64): string {
  const primaryColor = colors[hashToNumber(seed, colors.length)];
  const secondaryColor = colors[hashToNumber(seed + '-secondary', colors.length)];
  
  // Decide if we use animalistic or abstract (50/50 split)
  const useAbstract = hashToNumber(seed + '-style', 2) === 0;
  const patternIndex = hashToNumber(seed + '-pattern', useAbstract ? abstractPatterns.length : shapeStyles.length);
  
  const background = '<rect width="' + size + '" height="' + size + '" rx="' + size * 0.2 + '" fill="' + secondaryColor + '" opacity="0.1"/>';
  
  const pattern = useAbstract 
    ? abstractPatterns[patternIndex](size, primaryColor, secondaryColor)
    : shapeStyles[patternIndex](size, primaryColor, secondaryColor);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background}
    ${pattern}
  </svg>`;
}

export function generateAvatarDataUri(seed: string, size: number = 64): string {
  const svg = generateAvatarSvg(seed, size);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}