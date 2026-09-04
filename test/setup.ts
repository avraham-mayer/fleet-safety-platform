// Global test setup — runs before each test file (see vitest.config.ts).
// Adds jest-dom matchers (toBeInTheDocument, toHaveTextContent, …) and clears
// the DOM between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
