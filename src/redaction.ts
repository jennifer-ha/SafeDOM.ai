import { Redaction, RedactionRule } from "./types.js";

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function luhnCheck(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(digits[i] ?? "0", 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isE164Like(match: string): boolean {
  const normalized = match.replace(/[^\d+]/g, "");
  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);
    return digits.length >= 7 && digits.length <= 15 && !digits.startsWith("0");
  }
  const digits = normalized.replace(/[^\d]/g, "");
  return digits.length >= 7 && digits.length <= 15 && !digits.startsWith("0");
}

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
export const defaultCoreRedactionRules: RedactionRule[] = [
  {
    type: "email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    placeholderPrefix: "__EMAIL_"
  },
  {
    type: "iban-generic",
    // ISO 13616 structure: country + checksum + BBAN (up to 30 alphanumerics).
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,28}\b/g,
    placeholderPrefix: "__IBAN_"
  },
  {
    type: "creditcard",
    // 13-19 digits with common separators; post-filtered by Luhn.
    pattern: /\b(?:\d[ -]?){12,18}\d\b/g,
    placeholderPrefix: "__CARD_",
    validate: luhnCheck
  },
  {
    type: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholderPrefix: "__SSN_"
  },
  {
    type: "phone",
    // Generic E.164-ish, keeps leading "+" and tolerates separators.
    pattern: /(?<!\w)\+?(?:\d[ \t().-]?){6,14}\d(?!\w)/g,
    placeholderPrefix: "__PHONE_",
    validate: isE164Like
  }
];

export const countryRedactionRules: Record<string, RedactionRule[]> = {
  nl: [
    {
      type: "iban-nl",
      pattern: /\bNL\d{2}[A-Z]{4}\d{10}\b/g,
      placeholderPrefix: "__IBAN_NL_"
    },
    {
      type: "phone-nl",
      pattern: /\b\+?31[\s-]?(?:6\d|[1-9]\d)\s?(?:\d[\s-]?){7,8}\b/g,
      placeholderPrefix: "__PHONE_NL_",
      validate: isE164Like
    }
  ],
  de: [
    {
      type: "iban-de",
      pattern: /\bDE\d{20}\b/g,
      placeholderPrefix: "__IBAN_DE_"
    },
    {
      type: "phone-de",
      pattern: /\b\+?49[\d\s()/-]{7,15}\b/g,
      placeholderPrefix: "__PHONE_DE_",
      validate: isE164Like
    }
  ],
  gb: [
    {
      type: "iban-gb",
      pattern: /\bGB\d{2}[A-Z]{4}\d{14}\b/g,
      placeholderPrefix: "__IBAN_GB_"
    },
    {
      type: "phone-gb",
      pattern: /\b\+?44[\d\s()/-]{7,13}\b/g,
      placeholderPrefix: "__PHONE_GB_",
      validate: isE164Like
    }
  ],
  fr: [
    {
      type: "iban-fr",
      pattern: /\bFR\d{12}[A-Z0-9]{11}\d{2}\b/g,
      placeholderPrefix: "__IBAN_FR_"
    },
    {
      type: "phone-fr",
      pattern: /\b\+?33[\d\s()/.]{8,13}\b/g,
      placeholderPrefix: "__PHONE_FR_",
      validate: isE164Like
    }
  ],
  us: [
    {
      type: "phone-us",
      pattern: /\b\+?1[\d\s().-]{10,14}\b/g,
      placeholderPrefix: "__PHONE_US_",
      validate: isE164Like
    },
    {
      type: "ssn",
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      placeholderPrefix: "__SSN_"
    }
  ]
};

export interface CreateRedactionRulesOptions {
  countries?: string[];
  includeGenericPhone?: boolean;
  includeGenericIban?: boolean;
  extraRules?: RedactionRule[];
}

export function createRedactionRules(options: CreateRedactionRulesOptions = {}): RedactionRule[] {
  const {
    countries = [],
    includeGenericPhone = true,
    includeGenericIban = true,
    extraRules = []
  } = options;

  const base = defaultCoreRedactionRules.filter((rule) => {
    if (rule.type === "phone" && !includeGenericPhone) return false;
    if (rule.type === "iban-generic" && !includeGenericIban) return false;
    return true;
  });

  const countryRules = countries.flatMap((code) => countryRedactionRules[code] ?? []);
  const merged = [...countryRules, ...base, ...extraRules];
  validateRedactionRules(merged);
  return merged;
}

export const defaultRedactionRules: RedactionRule[] = createRedactionRules();

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
      if (rule.validate && !rule.validate(match)) {
        return match;
      }

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
