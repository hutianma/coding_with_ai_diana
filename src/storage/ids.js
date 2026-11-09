// A random id for new records. crypto.randomUUID only works on https/localhost,
// so fall back to getRandomValues (which works everywhere) when it's missing.
export function makeId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}-${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
