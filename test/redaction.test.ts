import { describe, expect, it } from "vitest";
import {
  applyRedactions,
  createRedactionRules,
  defaultRedactionRules,
  validateRedactionRules
} from "../src/redaction.js";

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

  it("skips credit card numbers that fail Luhn", () => {
    const input = "Card 4111 1111 1111 1112 exp 12/30.";
    // Remove generic phone so only the credit card rule is tested.
    const rules = createRedactionRules({ includeGenericPhone: false });
    const { text, redactions } = applyRedactions(input, rules);
    expect(text).toBe(input);
    expect(redactions.every((r) => r.type !== "creditcard")).toBe(true);
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

  it("applies country-specific rules when requested", () => {
    const rules = createRedactionRules({ countries: ["nl", "de"] });
    const input = "NL91ABNA0417164300 and DE89370400440532013000";
    const { text, redactions } = applyRedactions(input, rules);

    expect(text).toBe("__IBAN_NL_1__ and __IBAN_DE_2__");
    expect(redactions.map((r) => r.type)).toEqual(["iban-nl", "iban-de"]);
  });

  it("keeps generic rules by default", () => {
    const rules = createRedactionRules();
    const input = "Reach me at +1 212-555-7890";
    const { text, redactions } = applyRedactions(input, rules);
    expect(text).toContain("__PHONE_1__");
    expect(redactions[0].type).toBe("phone");
  });
});
