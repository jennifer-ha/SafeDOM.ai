import { describe, expect, it } from "vitest";
import { applyRedactions, defaultRedactionRules, validateRedactionRules } from "../src/redaction.js";

describe("applyRedactions", () => {
  it("redacts multiple emails with stable placeholders", () => {
    const input = "Contact a@example.com and b@example.org.";
    const { text, redactions } = applyRedactions(input, defaultRedactionRules);

    expect(text).toBe("Contact __EMAIL_1__ and __EMAIL_2__.");
    expect(redactions).toHaveLength(2);
    expect(redactions[0]).toEqual({
      placeholder: "__EMAIL_1__",
      original: "a@example.com",
      type: "email"
    });
    expect(redactions[1]).toEqual({
      placeholder: "__EMAIL_2__",
      original: "b@example.org",
      type: "email"
    });
  });

  it("redacts phone numbers", () => {
    const input = "Call me at +1 212-555-7890 tomorrow.";
    const { text, redactions } = applyRedactions(input, defaultRedactionRules);
    expect(text).toContain("__PHONE_1__");
    expect(redactions[0].type).toBe("phone");
  });

  it("redacts IBANs", () => {
    const input = "IBAN NL91ABNA0417164300 for transfers.";
    const { text, redactions } = applyRedactions(input, defaultRedactionRules);
    expect(text).toContain("__IBAN_1__");
    expect(redactions[0].original).toBe("NL91ABNA0417164300");
  });

  it("redacts credit cards", () => {
    const input = "Card 4111 1111 1111 1111 exp 12/30.";
    const { text, redactions } = applyRedactions(input, defaultRedactionRules);
    expect(text).toContain("__CARD_1__");
    expect(redactions[0].original).toBe("4111 1111 1111 1111");
  });

  it("redacts US SSNs", () => {
    const input = "SSN 123-45-6789 required.";
    const { text, redactions } = applyRedactions(input, defaultRedactionRules);
    expect(text).toContain("__SSN_1__");
    expect(redactions[0].original).toBe("123-45-6789");
  });

  it("rejects unsafe regex rules (missing /g or complex pattern)", () => {
    expect(() =>
      validateRedactionRules([{ type: "bad", pattern: /foo/, placeholderPrefix: "__BAD_" }])
    ).toThrow();
    expect(() =>
      validateRedactionRules([{ type: "ok", pattern: /(a+)+b/g, placeholderPrefix: "__OK_" }])
    ).not.toThrow();
  });
});
