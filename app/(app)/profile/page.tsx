import { getMyProfile } from "@/lib/actions/profile";
import ProfileSignature from "@/components/ProfileSignature";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getMyProfile();

  return (
    <main className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">פרופיל קצין בטיחות</h1>
        <p className="text-sm text-slate-500">
          {profile?.full_name ?? ""} · תפקיד: {profile?.role ?? "officer"}
        </p>
      </div>

      <ProfileSignature initialSignature={profile?.signature_url ?? null} />
    </main>
  );
}
