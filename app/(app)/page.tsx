import { getTaskFeed } from "@/lib/actions/tasks";
import { cycleLabel } from "@/lib/cycle";
import { createClient } from "@/lib/supabase/server";
import TaskFeed from "@/components/TaskFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin";

  // Officers see only their assigned companies; admins see the full fleet.
  const items = await getTaskFeed(
    isAdmin || !user ? undefined : { forHandlerId: user.id },
  );

  const { count: myCompanies } =
    isAdmin || !user
      ? { count: 1 }
      : await supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .eq("handler_id", user.id);

  return (
    <main className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">משימות</h1>
          <p className="text-sm text-slate-500">{cycleLabel()}</p>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
          {items.length} פתוחות
        </span>
      </div>

      {!myCompanies ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          לא הוקצו לך חברות עדיין — פנה למנהל המערכת
        </p>
      ) : (
        <TaskFeed items={items} />
      )}
    </main>
  );
}
