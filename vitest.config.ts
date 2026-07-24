import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest config for unit / component / server-action-logic tests.
// - tsconfigPaths resolves the `@/…` alias the same way Next does.
// - jsdom + the setup file give React Testing Library a DOM and jest-dom matchers.
// Test files live next to their source as `*.test.ts(x)` (or under __tests__/).
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
