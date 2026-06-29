/**
 * Iniciales cortas (máx. 2 letras): primera del nombre y del apellido.
 * Una sola palabra → solo la primera letra.
 * Ej: "María Fernanda Torres" → "MT", "MONTE" → "M", "corriente continua" → "CC"
 */
export function getPersonInitials(name = '', max = 2) {
  const limit = Math.min(Math.max(1, max), 2);
  const cleaned = String(name || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!cleaned) return '?';

  const words = cleaned.split(/\s+/).filter((w) => /[a-zA-Z]/i.test(w));
  if (words.length === 0) return '?';

  const pick = (word) => word.replace(/[^a-zA-Z]/gi, '').charAt(0) || '';

  let letters = '';
  if (words.length === 1) {
    letters = pick(words[0]);
  } else {
    letters = `${pick(words[0])}${pick(words[words.length - 1])}`;
  }

  return letters.slice(0, limit).toUpperCase() || '?';
}

export const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#2563eb' },
  { bg: '#d1fae5', text: '#059669' },
  { bg: '#ede9fe', text: '#7c3aed' },
  { bg: '#ffedd5', text: '#ea580c' },
  { bg: '#fce7f3', text: '#db2777' },
];

export function getAvatarPalette(seed = '') {
  const idx = [...String(seed)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}
