// Import from built browser bundle output path to avoid depending on source files at runtime.
import type { Redaction } from "../../dist/types.js";

/**
 * Reinserts original values back into text, replacing placeholders like "__EMAIL_1__" with the original value.
 * Uses deterministic string replacement to avoid regex injection or accidental pattern expansion.
 *
 * @param text - Text that may contain placeholders.
 * @param redactions - Redaction objects from buildAiContext.
 */
export function reinjectPlaceholders(text: string, redactions: Redaction[]): string {
  if (!text) {
    return "";
  }

  if (!Array.isArray(redactions) || redactions.length === 0) {
    return text;
  }

  let result = text;
  for (const { placeholder, original } of redactions) {
    if (!placeholder) {
      continue;
    }
    // Avoid RegExp replacement to keep user-provided values from affecting patterns.
    result = result.split(placeholder).join(original ?? "");
  }
  return result;
}
