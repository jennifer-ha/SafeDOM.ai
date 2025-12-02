# SafeDOM.ai – Privacy-first DOM-to-AI context builder with automatic PII redaction

Build prompt context from real UI state while minimizing the risk of leaking sensitive data. Annotate the DOM with `data-ai` attributes, automatically redact common PII, and reinject values safely on the backend when needed.

## What it does

- `data-ai` annotations decide what to include, exclude, or redact.
- Produces structured `fields`, combined `rawText`, and a detailed `redactions` list.
- Redacts common PII (email, phone, IBAN, credit card, SSN) before sending data to AI providers.
- Backend helper reinjects placeholders after the model responds, keeping sensitive data away from the model.

## Why it matters

- Users routinely paste emails, tickets, and documents into support tools.
- AI prompts often collect PII by accident; this helps enforce privacy-by-design defaults.
- Heuristic redaction provides a lightweight data minimisation layer for EU/US style privacy expectations.

## Quickstart

Install (workspace root):

```bash
npm install
```

Annotate DOM:

```html
<div id="ticket-root">
  <h2 data-ai="include" data-ai-label="subject">Login blocked</h2>
  <p data-ai="redact:email phone" data-ai-label="customer">
    Contact: alice@example.com, phone +1 212-555-7890
  </p>
  <p data-ai="exclude">Internal notes never leave the browser.</p>
</div>
```

Build context in the browser:

```ts
import { buildAiContext } from "safedom-ai";

const ctx = buildAiContext("#ticket-root", { labeledOnly: true, region: "eu" });

// ctx.fields.subject -> "Login blocked"
// ctx.rawText -> includes placeholders like "__EMAIL_1__"
// ctx.redactions -> [{ placeholder: "__EMAIL_1__", original: "alice@example.com", type: "email" }, ...]
```

Send to a provider (example with OpenAI; ensure you comply with their data handling terms):

```ts
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: ctx.rawText }]
});
```

Reinject placeholders on the backend (Node):

```ts
import { reinjectPlaceholders } from "@safedom/ai-node";
import type { Redaction } from "safedom-ai";

function finalizeAnswer(modelText: string, redactions: Redaction[]) {
  // Deterministic, regex-free replacement to avoid accidental pattern injection.
  return reinjectPlaceholders(modelText, redactions);
}
```

## API Reference

### `buildAiContext(root, options?): AiContext`

Builds a privacy-minded context from a DOM subtree.

- `root`: Element or CSS selector. Throws if not found.
- `options.labeledOnly` (default `true`): When `true`, only `data-ai` annotated elements are processed. When `false`, unlabeled text within the root is collected as a fallback with redaction applied (excluding subtrees already annotated or excluded).
- `options.redactionRules`: Override default redaction rules. Provide an array of `{ type, pattern, placeholderPrefix }`. Patterns **must** include the global `/g` flag.
- `options.region`: `"eu" | "us" | "global"` hint for host apps to select policy; not used for any network or geolocation.

Returns:

- `fields`: Key-value map keyed by `data-ai-label`; multiple occurrences concatenate with newlines.
- `rawText`: Combined string of included/redacted text separated by double newlines for easy prompt construction.
- `redactions`: Array of `{ placeholder, original, type }`.

### `data-ai` directives

- `data-ai="include"`: Include text content as-is.
- `data-ai="exclude"`: Exclude element and children.
- `data-ai="redact:email phone iban creditcard ssn"`: Apply selected redaction rules. Unknown types fall back to the available ruleset.
- `data-ai-label="subject"`: Optional logical label; concatenates across multiple elements.
- `data-ai-sensitivity` (optional/future): `high|medium|low` hint for downstream tooling; not used by core logic yet.

### `defaultRedactionRules`

Heuristic regexes for:
- Email: `__EMAIL_n__`
- Phone (generic): `__PHONE_n__`
- IBAN: `__IBAN_n__`
- Credit card (simplified): `__CARD_n__`
- US SSN (simplified): `__SSN_n__`

Rules run in deterministic order. Placeholder numbering increments across all rules within a call.

### `applyRedactions(input, rules, startIndex?)`

Utility that replaces matches with placeholders and returns `{ text, redactions }`. Exported for advanced use-cases.

### `validateRedactionRules(rules)`

Ensures rules include the global `/g` flag. For untrusted patterns, prefer an allowlist of vetted regexes to avoid ReDoS risk.

### `findUnknownPlaceholders(text, knownPlaceholders)`

Helper to detect placeholder-shaped tokens in text that do not appear in the current `redactions` list. Useful for UI warnings when users type placeholder-like strings manually.

### `@safedom/ai-node – reinjectPlaceholders(text, redactions)`

Backend-only helper to replace placeholders with originals. Uses `split/join` to avoid regex injection and MUST NOT be used in the browser with real PII.

## Privacy & security notes

- No network calls or telemetry; the library only reads the DOM.
- Uses `textContent` (not `innerHTML`) to avoid HTML injection paths.
- Redaction is heuristic pseudonymisation. It **does not guarantee full anonymisation** or legal compliance.
- Defaults follow privacy-by-default: `labeledOnly` is `true`, and common PII redaction rules are enabled.
- EU/US friendly: encourages data minimisation and keeping sensitive data off third-party AI providers. You must still assess lawfulness, consent, and processor agreements.
- Avoid logging redactions; they contain sensitive originals.

## Limitations

- Regex-based detection can miss edge cases or produce false positives.
- Does not manage consent, audit logs, DSAR/subject-access, or data retention policies.
- Not a substitute for a full privacy/compliance program. Consult legal/privacy experts.

## Example scenario: support dashboard

```html
<section id="ticket-root">
  <h3 data-ai="include" data-ai-label="subject">Cannot reset password</h3>
  <p data-ai="redact:email phone" data-ai-label="customer">
    Customer: j.doe@example.com, phone +31 6 1234 5678
  </p>
  <p data-ai="include" data-ai-label="summary">
    User reports password reset emails are not arriving.
  </p>
  <div data-ai="exclude">Admin-only debug info</div>
</section>
```

```ts
import { buildAiContext } from "safedom-ai";

const ctx = buildAiContext("#ticket-root", { labeledOnly: true, region: "eu" });

const prompt = `You are a support assistant.\n\nTicket:\n${ctx.rawText}`;
// Send prompt to your chosen model...
```

On the backend:

```ts
import { reinjectPlaceholders } from "@safedom/ai-node";

const finalAnswer = reinjectPlaceholders(modelResponse, ctx.redactions);
```

## Development

- Prerequisite: Node.js 18+.
- Install dependencies: `npm install`
- Lint: `npm run lint`
- Test: `npm test`
- Build: `npm run build`

## Contributing

Contributions welcome! See `CONTRIBUTING.md` for guidelines. When proposing new redaction rules, include:

- Rationale and threat/privacy considerations.
- Tests demonstrating realistic matches and avoiding obvious false positives.
- Documentation updates if the public API or defaults change.

## License

MIT. See `LICENSE`.

## Demo

A live demo shows SafeDOM.ai annotations and redaction flow on GitHub Pages (set the URL in repo settings after enabling Pages):  
`https://<your-username>.github.io/safedom-ai/`

Run the demo locally:

```bash
cd examples/demo-site
npm install
npm run dev
```

Core snippet from the demo:

```html
<div id="ticket">
  <h2 data-ai="include" data-ai-label="subject">Delayed delivery for order 1234</h2>
  <p data-ai="redact:email phone">Customer: john.doe@example.com, +31 6 12345678</p>
  <textarea data-ai="redact:email phone" data-ai-label="message"></textarea>
  <p data-ai="exclude">Internal admin note</p>
</div>
```

```ts
import { buildAiContext } from "safedom-ai";

const ctx = buildAiContext("#ticket", { labeledOnly: true, region: "eu" });
console.log(ctx);

// (Demo) mock AI response that includes placeholders:
// "We will reach you at __EMAIL_1__ or call __PHONE_2__."
// Use reinjectPlaceholders on the backend to restore originals.
```
