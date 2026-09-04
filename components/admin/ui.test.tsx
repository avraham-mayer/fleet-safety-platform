import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityChip, SEVERITY_CHIP } from "@/components/admin/ui";

describe("SeverityChip", () => {
  it("renders the Hebrew label for each severity", () => {
    for (const severity of ["expired", "warning", "ok"] as const) {
      const { unmount } = render(<SeverityChip severity={severity} />);
      expect(screen.getByText(SEVERITY_CHIP[severity].label)).toBeInTheDocument();
      unmount();
    }
  });

  it("applies the severity color classes", () => {
    render(<SeverityChip severity="expired" />);
    const chip = screen.getByText(SEVERITY_CHIP.expired.label);
    expect(chip.className).toContain("bg-red-100");
  });
});
