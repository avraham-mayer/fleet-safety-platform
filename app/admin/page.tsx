import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskFeed } from "@/lib/actions/tasks";
import { cycleLabel } from "@/lib/cycle";
import type { FeedItem, Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700" },
  warning: { label: "דורש טיפול", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "תקין", cls: "bg-green-100 text-green-700" },
};

type RecentInspection = {
  id: string;
  conducted_at: string;
  vehicle: { license_plate: string } | null;
  driver: { name: string } | null;
};

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    feed,
    { count: companyCount },
    { count: driverCount },
    { data: vehicles },
    { data: recentRaw },
  ] = await Promise.all([
    getTaskFeed(),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("vehicles").select("id, status"),
    supabase
      .from("inspections")
      .select(
        "id, conducted_at, vehicle:vehicles(license_plate), driver:drivers(name)",
      )
      .order("conducted_at", { ascending: false })
      .limit(8),
  ]);

  const recent = (recentRaw ?? []) as unknown as RecentInspection[];

  // Count defects (failed checklist lines) per recent inspection.
  const defectCount = new Map<string, number>();
  if (recent.length > 0) {
    const { data: failedLines } = await supabase
      .from("inspection_checklist_lines")
      .select("inspection_id")
      .in("inspection_id", recent.map((i) => i.id))
      .eq("is_intact", false);
    for (const line of failedLines ?? []) {
      defectCount.set(
        line.inspection_id,
        (defectCount.get(line.inspection_id) ?? 0) + 1,
      );
    }
  }

  const activeVehicles = (vehicles ?? []).filter((v) => v.status === "active");
  // The feed's derived inspection items ARE the not-yet-inspected vehicles.
  const monthlyOpen = feed.filter((i) => i.id.startsWith("inspection-")).length;
  const monthlyDone = Math.max(activeVehicles.length - monthlyOpen, 0);
  const expired = feed.filter((i) => i.severity === "expired").length;

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "חברות", value: String(companyCount ?? 0) },
    {
      label: "רכבים פעילים",
      value: String(activeVehicles.length),
      sub: `מתוך ${vehicles?.length ?? 0} בצי`,
    },
    { label: "נהגים", value: String(driverCount ?? 0) },
    {
      label: `בדיקות חודשיות — ${cycleLabel()}`,
      value: `${monthlyDone}/${activeVehicles.length}`,
      sub: `${monthlyOpen} ממתינות`,
    },
    {
      label: "משימות פתוחות",
      value: String(feed.length),
      sub: `${expired} באיחור / פגות תוקף`,
    },
  ];

  const urgent = feed.slice(0, 8);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">סקירת מערך הבטיחות</h1>
        <p className="text-sm text-slate-500">{cycleLabel()}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
          >
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
            {s.sub && <p className="text-xs text-slate-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">משימות דחופות</h2>
            <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
              לכל המשימות
            </Link>
          </div>
          {urgent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              אין משימות פתוחות 🎉
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {urgent.map((item: FeedItem) => {
                const sev = SEVERITY_CHIP[item.severity];
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {item.subtitle}
                        {item.dueDate ? ` · יעד ${item.dueDate}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.cls}`}
                    >
                      {sev.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 font-bold text-slate-900">בדיקות אחרונות</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              טרם בוצעו בדיקות
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((i) => {
                const defects = defectCount.get(i.id) ?? 0;
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {i.vehicle?.license_plate ?? "—"} · {i.driver?.name ?? "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(i.conducted_at).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        defects > 0
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {defects > 0 ? `${defects} ליקויים` : "ללא ליקויים"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
