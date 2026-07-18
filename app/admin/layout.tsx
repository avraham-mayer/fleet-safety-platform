import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import CompanyTree from "@/components/admin/CompanyTree";

export const dynamic = "force-dynamic";

// Desktop admin portal shell: role-gated (admin only), company tree sidebar
// mirroring the legacy Windows program, wide content area.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-lg font-bold text-slate-900">
              ניהול צי · פורטל מנהל
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                פיד משימות
              </Link>
              <Link
                href="/admin/settings/doc-types"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                סוגי מסמכים
              </Link>
            </nav>
          </div>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1 gap-6 px-6 py-6">
        <aside className="w-72 shrink-0">
          <CompanyTree companies={companies ?? []} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
