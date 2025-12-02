/**
 * Resolve a root element from an Element reference or CSS selector.
 * Throws a clear error when selector does not resolve to an element.
 */
export function resolveRoot(root: Element | string): Element {
  if (typeof root === "string") {
    const el = document.querySelector(root);
    if (!el) {
      throw new Error(`[SafeDOM] Root element not found for selector: ${root}`);
    }
    return el;
  }

  return root;
}

export function hasDataAi(el: Element): boolean {
  const value = el.getAttribute("data-ai");
  return value !== null && value.trim().length > 0;
}

export function isExcluded(el: Element): boolean {
  return el.getAttribute("data-ai") === "exclude";
}

export function isInExcludedSubtree(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (isExcluded(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

export function isInLabeledSubtree(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (hasDataAi(current)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
