import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Vitest config for unit / component / server-action-logic tests.
// - tsconfigPaths resolves the `@/…` alias the same way Next does. Both configs
//   must be listed: vite-tsconfig-paths only rewrites imports for files a
//   project actually includes, and tsconfig.json *excludes* test files (so
//   `next build` doesn't typecheck them) while tsconfig.test.json includes only
//   test files. tsconfig.json covers `@/…` inside app/lib/components sources,
//   tsconfig.test.json covers it inside *.test.ts(x); either one alone leaves
//   half the graph unresolved.
// - jsdom + the setup file give React Testing Library a DOM and jest-dom matchers.
// Test files live next to their source as `*.test.ts(x)` (or under __tests__/).
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({ projects: ["./tsconfig.json", "./tsconfig.test.json"] }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
