import { defineConfig } from "vitest/config";

// Convex functions run in an edge-like runtime; convex-test needs that env.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
