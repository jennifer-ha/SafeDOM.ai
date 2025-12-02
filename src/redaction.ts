import { Redaction, RedactionRule } from "./types.js";

/**
 * Basic preflight to ensure global flag is present. Full ReDoS protection is out of scope;
 * prefer an allowlist of vetted patterns for untrusted input.
 */
export function validateRedactionRules(rules: RedactionRule[]): void {
  for (const rule of rules) {
    if (!rule.pattern.global) {
      throw new Error(`[SafeDOM] Redaction rule "${rule.type}" must include the global /g flag.`);
    }
  }
}

/**
 * Default redaction rules focused on common PII types.
 * These are heuristic and do not guarantee complete anonymisation.
 */
export const defaultRedactionRules: RedactionRule[] = [
  {
    type: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    placeholderPrefix: "__EMAIL_"
  },
  {
    type: "iban",
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[A-Z0-9]{7}[A-Z0-9]{0,16}\b/gi,
    placeholderPrefix: "__IBAN_"
  },
  {
    type: "creditcard",
    // Simplified credit card matcher: 13-19 digits allowing spaces or hyphens.
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    placeholderPrefix: "__CARD_"
  },
  {
    type: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholderPrefix: "__SSN_"
  },
  {
    type: "phone",
    // Generic international-ish phone pattern; matches 7-15 digits with common separators and keeps leading "+".
    pattern: /(?<!\w)(?=(?:\D*\d){7,15}\b)\+?(?:\d[ \t().-]?){6,14}\d(?!\w)/g,
    placeholderPrefix: "__PHONE_"
  }
];

/**
 * Apply configured redaction rules to input text in a deterministic order.
 * Placeholder numbering increments across all rules to avoid collisions.
 */
export function applyRedactions(
  input: string,
  rules: RedactionRule[],
  startIndex = 1
): { text: string; redactions: Redaction[] } {
  if (!input) {
    return { text: "", redactions: [] };
  }

  let working = input;
  const redactions: Redaction[] = [];
  let counter = startIndex;

  for (const rule of rules) {
    // Clone regex to avoid cross-call state via lastIndex when /g is used.
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    working = working.replace(pattern, (match) => {
      const placeholder = `${rule.placeholderPrefix}${counter}__`;
      counter += 1;
      redactions.push({
        placeholder,
        original: match,
        type: rule.type
      });
      return placeholder;
    });
  }

  return { text: working, redactions };
}
