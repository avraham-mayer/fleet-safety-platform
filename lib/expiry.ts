import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import type { Severity } from "@/lib/types";

// Maps an expiry/due date to a severity tag used by the feed and colored chips.
// past or missing → expired; within EXPIRY_WARNING_DAYS → warning; else ok.
export function severityFor(
  date: string | null,
  now: Date = new Date(),
): Severity {
  if (!date) return "expired";
  const target = new Date(date);
  const days = Math.floor((target.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "warning";
  return "ok";
}
