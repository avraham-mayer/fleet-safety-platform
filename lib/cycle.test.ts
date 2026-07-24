import { describe, it, expect } from "vitest";
import { currentCycleRange, cycleLabel } from "@/lib/cycle";

describe("currentCycleRange", () => {
  it("spans the 1st of this month to the 1st of next month", () => {
    const { start, end } = currentCycleRange(new Date(2026, 6, 24)); // Jul 2026
    expect(start).toEqual(new Date(2026, 6, 1));
    expect(end).toEqual(new Date(2026, 7, 1));
  });

  it("rolls the year over in December", () => {
    const { start, end } = currentCycleRange(new Date(2026, 11, 15)); // Dec
    expect(start).toEqual(new Date(2026, 11, 1));
    expect(end).toEqual(new Date(2027, 0, 1));
  });
});

describe("cycleLabel", () => {
  it("renders the Hebrew month + year", () => {
    expect(cycleLabel(new Date(2026, 6, 24))).toBe("מחזור יולי 2026");
  });
});
