import PrintButton from "@/components/admin/PrintButton";
import { thCls, tdCls } from "@/components/admin/ui";

// Shared building blocks for printable dossier reports (vehicle/driver cards).
// All server-safe. The print bar is screen-only (.no-print); everything inside
// the white sheet prints.

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL");
}

export function ReportShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <p className="text-sm text-slate-400">
            הופק: {new Date().toLocaleDateString("he-IL")}
          </p>
        </div>
        <div className="mt-4 space-y-6">{children}</div>
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-r-4 border-blue-500 pr-2 text-base font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Key/value detail grid (entity fields).
export function KV({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-sm">
          <dt className="shrink-0 font-medium text-slate-500">{k}:</dt>
          <dd className="text-slate-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// Compact record table; renders an empty note when there are no rows.
export function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">אין רשומות</p>;
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
        <tbody className="divide-y divide-slate-100">
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} className={tdCls}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
