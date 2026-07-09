/**
 * Anonymous username generator
 */
const adjectives = [
  'Swift', 'Calm', 'Bold', 'Bright', 'Clever', 'Quiet', 'Sharp', 'Gentle',
  'Lively', 'Noble', 'Wise', 'Brave', 'Fierce', 'Kind', 'Proud', 'Royal',
  'Silent', 'Steady', 'Smooth', 'Fluffy', 'Spicy', 'Cosmic', 'Lunar', 'Solar'
];

const nouns = [
  'Panda', 'Tiger', 'Falcon', 'Otter', 'Fox', 'Wolf', 'Raven', 'Bear',
  'Lynx', 'Phoenix', 'Drake', 'Heron', 'Lynx', 'Owl', 'Seal', 'Dove',
  'Wren', 'Hawk', 'Elk', 'Moth', 'Coral', 'Nova', 'Comet', 'Ember'
];

export function generateUsername(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export function isValidUsername(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(name);
}