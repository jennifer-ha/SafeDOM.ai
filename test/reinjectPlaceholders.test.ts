import { describe, expect, it } from "vitest";
import { reinjectPlaceholders } from "../node/src/reinject.js";

describe("reinjectPlaceholders", () => {
  it("replaces placeholders deterministically", () => {
    const text =
      "Hello __EMAIL_1__, we masked your card __CARD_2__. Again, __EMAIL_1__ is hidden.";
    const redactions = [
      { placeholder: "__EMAIL_1__", original: "person@example.com", type: "email" },
      { placeholder: "__CARD_2__", original: "4111 1111 1111 1111", type: "creditcard" }
    ];

    const result = reinjectPlaceholders(text, redactions);
    expect(result).toContain("person@example.com");
    expect(result).toContain("4111 1111 1111 1111");
    expect(result.match(/person@example.com/g)).toHaveLength(2);
  });

  it("returns original text when no redactions provided", () => {
    const text = "No placeholders here.";
    expect(reinjectPlaceholders(text, [])).toBe(text);
  });
});
