import type { Severity } from "@/lib/types";

// Shared presentational bits for the admin portal (server-safe).

export const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700" },
  warning: { label: "דורש טיפול", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "תקין", cls: "bg-green-100 text-green-700" },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const chip = SEVERITY_CHIP[severity];
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip.cls}`}
    >
      {chip.label}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const thCls =
  "px-3 py-2 text-right text-xs font-semibold text-slate-500";
export const tdCls = "px-3 py-2 text-sm text-slate-800";

export function Table({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return <p className="py-4 text-center text-sm text-slate-400">אין רשומות</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {headers.map((h) => (
              <th key={h} className={thCls}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export const submitCls =
  "rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700";
