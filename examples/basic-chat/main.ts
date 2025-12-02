import { buildAiContext } from "../../src/index.js";

const button = document.querySelector<HTMLButtonElement>("#collect");
const output = document.querySelector<HTMLElement>("#output");

button?.addEventListener("click", () => {
  const ctx = buildAiContext("#ticket-root", { labeledOnly: true, region: "global" });
  if (output) {
    output.textContent = JSON.stringify(ctx, null, 2);
  }
});
