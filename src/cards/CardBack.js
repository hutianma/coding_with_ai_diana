// The back of a photocard: a color, a pattern and an optional line of text.

export const BACK_COLORS = [
  { value: '#f7c6d9', name: 'Pink' },
  { value: '#cfe3ff', name: 'Sky' },
  { value: '#d6f0cf', name: 'Mint' },
  { value: '#fff0b3', name: 'Butter' },
  { value: '#e2d4ff', name: 'Lilac' },
  { value: '#2b2230', name: 'Night' },
];

export const BACK_PATTERNS = [
  { value: 'plain', name: 'Plain' },
  { value: 'dots', name: 'Dots' },
  { value: 'stripes', name: 'Stripes' },
  { value: 'checks', name: 'Checks' },
  { value: 'grid', name: 'Grid' },
];

export const DEFAULT_BACK = { color: BACK_COLORS[0].value, pattern: 'dots', text: '' };
export const BACK_TEXT_MAX = 40;

export function createCardBack(back) {
  const el = document.createElement('div');
  const pattern = BACK_PATTERNS.some((p) => p.value === back.pattern) ? back.pattern : 'plain';
  el.className = `card-back card-back--${pattern}${isDark(back.color) ? ' card-back--dark' : ''}`;
  el.style.setProperty('--back-color', back.color);
  const text = document.createElement('span');
  text.className = 'card-back__text';
  text.textContent = back.text ?? ''; // plain text, never HTML
  el.append(text);
  return el;
}

// Light text on dark backs, dark text on light backs
function isDark(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}
