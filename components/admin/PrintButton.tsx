"use client";

// Screen-only button that triggers the browser print dialog (→ print or
// "Save as PDF"). Reports render as plain HTML; print CSS in globals.css
// strips the app chrome. This is our lightweight stand-in for the legacy
// program's FastReport print/PDF export — no PDF library needed.
export default function PrintButton({
  label = "הדפסה / שמירה כ-PDF",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      {label}
    </button>
  );
}
