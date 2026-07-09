/**
 * SVG avatar generator
 * Generates deterministic avatars based on user ID or username
 */
import crypto from 'crypto';

// Color palette - warm, muted tones
const colors = [
  '#1D1F23', '#2D3436', '#636E72', '#6C5CE7', '#A29BFE',
  '#E17055', '#FDCB6E', '#00CEC9', '#55A3E8', '#FD79A8',
  '#00B894', '#E84393', '#6C5CE7', '#F39C12', '#2ECC71'
];

function hashToNumber(str: string, max: number): number {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return parseInt(hash.substring(0, 8), 16) % max;
}

export function generateAvatarSvg(seed: string, size: number = 64): string {
  const colorIndex = hashToNumber(seed, colors.length);
  const primaryColor = colors[colorIndex];
  const secondaryColor = colors[(colorIndex + 1) % colors.length];
  const bgColor = colors[(colorIndex + 7) % colors.length];

  // Generate a simple 2-letter initial
  const initial = seed.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() || '?';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${bgColor}" opacity="0.15"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="${primaryColor}" opacity="0.2"/>
    <text x="${size/2}" y="${size/2 + size * 0.1}" font-family="system-ui" font-size="${size * 0.35}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
}

export function generateAvatarDataUri(seed: string, size: number = 64): string {
  const svg = generateAvatarSvg(seed, size);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}