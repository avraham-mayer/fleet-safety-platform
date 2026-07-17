"use client";

import Link from "next/link";

// Explicit back affordance for sub-pages. In RTL "back" points right, so the
// chevron sits on the leading (right) edge. Pass `confirm` on flows that hold
// unsaved input (e.g. the inspection wizard) to guard against accidental loss.
export default function BackLink({
  href = "/",
  label = "חזרה למשימות",
  confirm,
}: {
  href?: string;
  label?: string;
  confirm?: string;
}) {
  function handleClick(e: React.MouseEvent) {
    if (confirm && !window.confirm(confirm)) {
      e.preventDefault();
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </Link>
  );
}
