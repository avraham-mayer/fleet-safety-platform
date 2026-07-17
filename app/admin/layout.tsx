import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/actions/profile";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/SignOutButton";

// Desktop admin portal shell. The proxy already gates /admin by role; this is
// defense in depth so a stale/bypassed edge check can't render admin pages.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen">
      {/* RTL: first flex child sits on the right — the leading edge. */}
      <aside className="flex w-56 shrink-0 flex-col border-l border-slate-200 bg-white px-3 py-5">
        <Link href="/admin" className="px-3 text-lg font-bold text-slate-900">
          פורטל ניהול
        </Link>
        <p className="mb-5 px-3 text-xs text-slate-500">
          {profile.full_name ?? ""}
        </p>

        <AdminNav />

        <div className="mt-auto flex flex-col gap-1 border-t border-slate-200 pt-3">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            תצוגת קצין בטיחות
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-6 py-6 lg:px-10">{children}</div>
    </div>
  );
}
