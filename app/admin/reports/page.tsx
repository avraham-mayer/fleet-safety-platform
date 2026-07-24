import Link from "next/link";

export const dynamic = "force-dynamic";

// Reports hub. Each report renders as a print-friendly page (print → PDF).
// This replaces the legacy program's FastReport output. Built reports link
// through; roadmap entries are disabled until implemented.
const REPORTS: {
  href: string | null;
  title: string;
  desc: string;
}[] = [
  {
    href: "/admin/reports/worklist",
    title: "יומן עבודה — משימות פתוחות",
    desc: "כל הבדיקות, ההדרכות והמסמכים שדורשים טיפול, מקובצים לפי חברה. סינון לפי מטפל/חברה/סוג. להדפסה או שמירה כ-PDF.",
  },
  {
    href: null,
    title: "כרטיס רכב",
    desc: "דף מרוכז לרכב בודד: פרטים, מסמכים, בדיקות, תאונות, נהגים צמודים. נפתח מתוך כרטיס הרכב → ״כרטיס להדפסה״.",
  },
  {
    href: null,
    title: "כרטיס נהג",
    desc: "דף מרוכז לנהג בודד: רישיון, קורסים, בדיקות רפואיות/טכוגרף, עבירות, תאונות. נפתח מתוך כרטיס הנהג → ״כרטיס להדפסה״.",
  },
  {
    href: null,
    title: "דוח היסטוריית טיפולים",
    desc: "רשומות עבר לפי סוג (תאונות/קורסים/טכוגרף/רפואי) לביקורת. (בפיתוח)",
  },
];

export default function ReportsIndexPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">דוחות</h1>
        <p className="text-sm text-slate-500">
          דוחות להדפסה ולשמירה כ-PDF — למסירה לחברות ולביקורת.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => {
          const inner = (
            <>
              <h2 className="text-base font-semibold text-slate-900">
                {r.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
            </>
          );
          return r.href ? (
            <Link
              key={r.title}
              href={r.href}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={r.title}
              className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200 opacity-60"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
