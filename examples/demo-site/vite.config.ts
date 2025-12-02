import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Match the GitHub Pages repo slug to avoid 404s for assets.
  base: "/SafeDOM.ai/",
  server: {
    port: 5174
  }
});
