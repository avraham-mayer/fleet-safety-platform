import { getTaskFeed } from "@/lib/actions/tasks";
import { getMyProfile } from "@/lib/actions/profile";
import { cycleLabel } from "@/lib/cycle";
import TaskFeed from "@/components/TaskFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [items, profile] = await Promise.all([getTaskFeed(), getMyProfile()]);

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

      <TaskFeed items={items} myId={profile?.id ?? null} />
    </main>
  );
}
