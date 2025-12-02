export type RedactionType =
  | "email"
  | "phone"
  | "iban"
  | "creditcard"
  | "ssn"
  | "custom";

export interface RedactionRule {
  /**
   * Logical type of the redaction. For example: "email", "phone", "iban".
   * Used for documentation, auditing, and analytics tooling.
   */
  type: RedactionType | string;

  /**
   * Regular expression that matches sensitive values.
   * MUST be created with the global /g flag.
   */
  pattern: RegExp;

  /**
   * Prefix used to build placeholders, e.g. "__EMAIL_".
   * Placeholder format should be: prefix + number + "__"
   * For example: "__EMAIL_1__".
   */
  placeholderPrefix: string;
}

export interface Redaction {
  placeholder: string;
  original: string;
  type: string;
}

export interface BuildAiContextOptions {
  /**
   * If true, only elements with data-ai attributes are processed.
   * Default: true (privacy by default).
   * If false, unlabeled text may be processed as a fallback, but that is less privacy-preserving.
   */
  labeledOnly?: boolean;

  /**
   * Optional custom redaction rules.
   * If provided, these override the default rule set.
   */
  redactionRules?: RedactionRule[];

  /**
   * Optional region hint ("eu", "us", "global").
   * This library itself must NOT make network calls or geolocate users.
   * This is only a hint, so apps can choose different behaviour or rule sets.
   */
  region?: "eu" | "us" | "global";
}

export interface AiContext {
  /**
   * Key-value pairs mapping from data-ai-label to the cleaned text.
   */
  fields: Record<string, string>;

  /**
   * A single combined string of all included/redacted text, separated by double newlines.
   * Intended as a convenient prompt body.
   */
  rawText: string;

  /**
   * All redactions performed (placeholder -> original).
   */
  redactions: Redaction[];
}
