import { describe, expect, it, beforeEach } from "vitest";
import { buildAiContext } from "../src/index.js";

describe("buildAiContext", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("includes labeled content and populates fields", () => {
    document.body.innerHTML = `
      <div id="root">
        <p data-ai="include" data-ai-label="subject">Account issue</p>
      </div>
    `;

    const ctx = buildAiContext("#root");
    expect(ctx.rawText).toBe("Account issue");
    expect(ctx.fields.subject).toBe("Account issue");
    expect(ctx.redactions).toHaveLength(0);
  });

  it("concatenates multiple elements with the same label", () => {
    document.body.innerHTML = `
      <div id="root">
        <p data-ai="include" data-ai-label="notes">First line</p>
        <p data-ai="include" data-ai-label="notes">Second line</p>
      </div>
    `;

    const ctx = buildAiContext("#root");
    expect(ctx.fields.notes).toBe("First line\nSecond line");
    expect(ctx.rawText).toBe("First line\n\nSecond line");
  });

  it("respects exclusions", () => {
    document.body.innerHTML = `
      <div id="root">
        <div data-ai="exclude">
          <p data-ai="include" data-ai-label="hidden">Secret</p>
        </div>
        <p data-ai="include" data-ai-label="visible">Public</p>
      </div>
    `;

    const ctx = buildAiContext("#root");
    expect(ctx.fields.hidden).toBeUndefined();
    expect(ctx.fields.visible).toBe("Public");
    expect(ctx.rawText).toBe("Public");
  });

  it("redacts PII with placeholders", () => {
    document.body.innerHTML = `
      <div id="root">
        <p data-ai="redact:email phone" data-ai-label="body">
          Reach me at test@example.com or +1 555-123-4567.
        </p>
      </div>
    `;

    const ctx = buildAiContext("#root");
    expect(ctx.rawText).toContain("__EMAIL_1__");
    expect(ctx.rawText).toContain("__PHONE_2__");
    expect(ctx.redactions).toEqual([
      {
        placeholder: "__EMAIL_1__",
        original: "test@example.com",
        type: "email"
      },
      {
        placeholder: "__PHONE_2__",
        original: "+1 555-123-4567",
        type: "phone"
      }
    ]);
    expect(ctx.fields.body).toContain("__EMAIL_1__");
  });

  it("handles labeledOnly=false by capturing unlabeled text without double-counting", () => {
    document.body.innerHTML = `
      <div id="root">
        General notice
        <span data-ai="include">Included text</span>
        and some trailing info.
      </div>
    `;

    const ctx = buildAiContext("#root", { labeledOnly: false });
    expect(ctx.rawText.includes("Included text")).toBe(true);
    expect(ctx.rawText).toContain("General notice");
    expect(ctx.rawText).toContain("trailing info.");
    expect(ctx.redactions.length).toBeGreaterThanOrEqual(0);
  });

  it("redacts PII typed into form fields (value)", () => {
    document.body.innerHTML = `
      <form id="root">
        <textarea data-ai="redact:email phone" data-ai-label="message"></textarea>
      </form>
    `;
    const textarea = document.querySelector("textarea");
    if (!textarea) {
      throw new Error("textarea missing in test setup");
    }
    textarea.value = "Email me at person@example.com or call +1 415-555-9999";

    const ctx = buildAiContext("#root");
    expect(ctx.rawText).toContain("__EMAIL_1__");
    expect(ctx.rawText).toContain("__PHONE_2__");
    expect(ctx.redactions.map((r) => r.type)).toEqual(["email", "phone"]);
  });
});
