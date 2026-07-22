import type { Severity } from "@/lib/types";
import { SEVERITY_CHIP } from "@/components/admin/ui";

// Officer-app status chips. Severity palette comes from the shared
// SEVERITY_CHIP source of truth in components/admin/ui.tsx.

export function SeverityChip({ severity }: { severity: Severity | null }) {
  const chip = SEVERITY_CHIP[severity ?? "ok"];
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${chip.cls}`}
    >
      {chip.label}
    </span>
  );
}

export function MonthlyChip({ done }: { done: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
        done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {done ? "✓ בדיקה חודשית" : "בדיקה חודשית חסרה"}
    </span>
  );
}
