const PLACEHOLDER_PATTERN = /__([A-Z]+)_\d+__/g;

/**
 * Detect placeholder-shaped tokens in text that are not present in the redactions list.
 * Useful for UI warnings to avoid user confusion when they manually type placeholder-like strings.
 */
export function findUnknownPlaceholders(text: string, known: string[]): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const knownSet = new Set(known);
  let match: RegExpExecArray | null;
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, PLACEHOLDER_PATTERN.flags);
  while ((match = pattern.exec(text)) !== null) {
    const token = match[0];
    if (!knownSet.has(token)) {
      seen.add(token);
    }
  }
  return Array.from(seen);
}
