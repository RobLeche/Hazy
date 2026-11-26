import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/functions/**/*.test.ts", "tests/security/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", "dist/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
