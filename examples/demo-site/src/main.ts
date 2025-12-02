import { buildAiContext, findUnknownPlaceholders, type Redaction } from "../../../src/index.js";
import { reinjectPlaceholders } from "../../../node/src/reinject.js";

const button = document.querySelector<HTMLButtonElement>("#analyze");
const output = document.querySelector<HTMLPreElement>("#output");
const aiReply = document.querySelector<HTMLTextAreaElement>("#ai-reply");
const reinjected = document.querySelector<HTMLPreElement>("#reinjected");
const reinjectButton = document.querySelector<HTMLButtonElement>("#reinject");
const placeholderWarning = document.querySelector<HTMLDivElement>("#placeholder-warning");

let lastRedactions: Redaction[] = [];

button?.addEventListener("click", () => {
  // data-ai attributes on the page decide what is included/redacted.
  // Labeled-only keeps privacy-by-default: unlabeled text is ignored.
  const ctx = buildAiContext("#ticket", {
    labeledOnly: true,
    region: "eu"
  });

  if (output) {
    // Pretty-print while keeping placeholders visible for quick inspection.
    output.textContent = JSON.stringify(ctx, null, 2);
  }

  lastRedactions = ctx.redactions;

  if (placeholderWarning) {
    const unknown = findUnknownPlaceholders(ctx.rawText, ctx.redactions.map((r) => r.placeholder));
    placeholderWarning.textContent = unknown.length
      ? `Let op: handmatige placeholder(s) gevonden die niet worden teruggeplaatst: ${unknown.join(", ")}`
      : "";
    placeholderWarning.style.display = unknown.length ? "block" : "none";
  }

  // Provide a mock AI response using the generated placeholders for demo purposes.
  if (aiReply) {
    const email = ctx.redactions.find((r) => r.type === "email")?.placeholder ?? "__EMAIL_1__";
    const phone = ctx.redactions.find((r) => r.type === "phone")?.placeholder ?? "__PHONE_1__";
    aiReply.value =
      `Thanks for reaching out. We will follow up with you at ${email} ` +
      `or call ${phone}. Let us know if the delay resolves.`;
  }

  if (reinjected) {
    reinjected.textContent = "// Reinjected response will appear here";
  }
});

reinjectButton?.addEventListener("click", () => {
  if (!aiReply || !reinjected) {
    return;
  }

  const text = aiReply.value ?? "";
  const safeRedactions = Array.isArray(lastRedactions) ? lastRedactions : [];
  const restored = reinjectPlaceholders(text, safeRedactions);
  reinjected.textContent = restored || "// No content to reinject";
});
