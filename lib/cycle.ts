// The inspection cycle runs from the 1st of the current month to the 1st of the
// next month. A vehicle is "done this cycle" iff it has a completed inspection
// with conducted_at inside this window — so the queue resets every calendar
// month with no scheduled job.

export type CycleRange = { start: Date; end: Date };

export function currentCycleRange(now: Date = new Date()): CycleRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

// e.g. "מחזור יוני 2026"
export function cycleLabel(now: Date = new Date()): string {
  return `מחזור ${HEBREW_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}
