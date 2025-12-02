import { applyRedactions, defaultRedactionRules, validateRedactionRules } from "./redaction.js";
import {
  AiContext,
  BuildAiContextOptions,
  Redaction,
  RedactionRule
} from "./types.js";
import {
  isExcluded,
  isInExcludedSubtree,
  isInLabeledSubtree,
  resolveRoot
} from "./utils/domUtils.js";

function appendField(fields: Record<string, string>, label: string | null, value: string) {
  if (!label) {
    return;
  }
  const existing = fields[label];
  fields[label] = existing ? `${existing}\n${value}` : value;
}

function collectAiElements(root: Element): Element[] {
  const elements: Element[] = [];
  const queue: Element[] = [root];

  while (queue.length) {
    const el = queue.shift() as Element;
    const dataAi = el.getAttribute("data-ai");
    const trimmed = dataAi?.trim();

    const isExclude = trimmed === "exclude";
    if (trimmed && !isExclude) {
      elements.push(el);
    }

    if (isExclude) {
      // Explicit exclusion includes children.
      continue;
    }

    for (const child of Array.from(el.children)) {
      queue.push(child);
    }
  }

  return elements;
}

function extractText(el: Element): string | null {
  // Prefer value for common form controls to reflect user edits at runtime.
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value?.trim() ?? "";
  }
  return el.textContent?.trim() ?? "";
}

function collectFallbackText(root: Element): string[] {
  const parts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;
    if (parent && !isInExcludedSubtree(parent) && !isInLabeledSubtree(parent)) {
      const text = node.textContent?.trim();
      if (text) {
        parts.push(text);
      }
    }
    node = walker.nextNode();
  }

  return parts;
}

function selectRules(requested: string[], available: RedactionRule[]): RedactionRule[] {
  if (!requested.length) {
    return available;
  }
  const requestedSet = new Set(requested);
  const matched = available.filter((rule) => requestedSet.has(rule.type.toString()));
  return matched.length ? matched : available;
}

/**
 * Build an AI-safe context from a DOM subtree.
 * - Applies "include", "exclude", and "redact:..." directives.
 * - Runs redaction on common PII types (email, phone, etc.).
 * - Returns fields, rawText, and redaction metadata.
 *
 * @param root - The root element or CSS selector under which to search.
 * @param options - Behaviour and redaction configuration.
 * @throws Error if the root element is not found.
 */
export function buildAiContext(
  root: Element | string,
  options?: BuildAiContextOptions
): AiContext {
  const resolvedRoot = resolveRoot(root);
  const {
    labeledOnly = true,
    redactionRules = defaultRedactionRules
    // region is intentionally unused in logic; host apps can switch rule sets based on this hint.
  } = options ?? {};
  validateRedactionRules(redactionRules);

  const fields: Record<string, string> = {};
  const rawParts: string[] = [];
  const combinedRedactions: Redaction[] = [];
  let placeholderCounter = 1;

  const aiElements = collectAiElements(resolvedRoot);

  for (const el of aiElements) {
    const directive = el.getAttribute("data-ai")?.trim();
    if (!directive || isExcluded(el)) {
      continue;
    }

    const text = extractText(el);
    if (!text) {
      continue;
    }

    const label = el.getAttribute("data-ai-label")?.trim() || null;

    if (directive === "include") {
      rawParts.push(text);
      appendField(fields, label, text);
      continue;
    }

    if (directive.startsWith("redact:")) {
      const requestedTypes = directive
        .replace("redact:", "")
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
      const rules = selectRules(requestedTypes, redactionRules);
      const result = applyRedactions(text, rules, placeholderCounter);
      placeholderCounter += result.redactions.length;
      rawParts.push(result.text);
      appendField(fields, label, result.text);
      combinedRedactions.push(...result.redactions);
      continue;
    }
  }

  if (!labeledOnly) {
    const fallbackParts = collectFallbackText(resolvedRoot);
    if (fallbackParts.length) {
      const fallbackText = fallbackParts.join("\n").trim();
      if (fallbackText) {
        const result = applyRedactions(fallbackText, redactionRules, placeholderCounter);
        placeholderCounter += result.redactions.length;
        rawParts.push(result.text);
        combinedRedactions.push(...result.redactions);
      }
    }
  }

  const rawText = rawParts.join("\n\n");
  return { fields, rawText, redactions: combinedRedactions };
}
