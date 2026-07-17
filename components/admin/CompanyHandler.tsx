"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignHandler } from "@/lib/actions/admin";
import type { Profile } from "@/lib/types";

// Inline מטפל אחראי assignment on the company card. Saves on change.
export default function CompanyHandler({
  companyId,
  handlerId,
  profiles,
}: {
  companyId: string;
  handlerId: string | null;
  profiles: Profile[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(handlerId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    setError(null);
    const res = await assignHandler(companyId, next || null);
    setBusy(false);
    if (!res.ok) {
      setValue(prev);
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-700">מטפל אחראי:</label>
      <select
        value={value}
        disabled={busy}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
      >
        <option value="">ללא שיוך</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name ?? p.id}
          </option>
        ))}
      </select>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
