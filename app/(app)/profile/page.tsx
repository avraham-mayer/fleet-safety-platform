import { getMyProfile } from "@/lib/actions/profile";
import BackLink from "@/components/BackLink";
import ProfileSignature from "@/components/ProfileSignature";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const profile = await getMyProfile();

  // Reached via a flow's signature gate → back/save returns to that flow.
  // Reached from the header → back goes to the feed.
  const backHref = returnTo || "/";
  const backLabel = returnTo ? "חזרה" : "חזרה למשימות";

  return (
    <main className="space-y-5">
      <BackLink href={backHref} label={backLabel} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">פרופיל קצין בטיחות</h1>
        <p className="text-sm text-slate-500">
          {profile?.full_name ?? ""} · תפקיד: {profile?.role ?? "officer"}
        </p>
      </div>

      {returnTo && (
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          יש לשמור חתימה כדי להמשיך. לאחר השמירה תוחזרו למשימה.
        </p>
      )}

      <ProfileSignature
        initialSignature={profile?.signature_url ?? null}
        returnTo={returnTo ?? null}
      />
    </main>
  );
}
