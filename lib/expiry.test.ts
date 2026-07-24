import { describe, it, expect } from "vitest";
import { severityFor } from "@/lib/expiry";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";

// Fixed "now" at UTC midnight so day math against date-only strings
// (which parse as UTC midnight) is exact — no sub-day truncation.
const NOW = new Date("2026-07-24T00:00:00Z");

function daysFromNow(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("severityFor", () => {
  it("treats a missing date as expired", () => {
    expect(severityFor(null, NOW)).toBe("expired");
  });

  it("marks a past date expired", () => {
    expect(severityFor(daysFromNow(-1), NOW)).toBe("expired");
  });

  it("marks a date inside the warning window as warning", () => {
    expect(severityFor(daysFromNow(1), NOW)).toBe("warning");
    expect(severityFor(daysFromNow(EXPIRY_WARNING_DAYS), NOW)).toBe("warning");
  });

  it("marks a date beyond the warning window as ok", () => {
    expect(severityFor(daysFromNow(EXPIRY_WARNING_DAYS + 1), NOW)).toBe("ok");
  });
});
