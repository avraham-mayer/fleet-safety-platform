"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

// The officer's pre-saved signature, auto-appended to trainings.
export async function getOfficerSignature(): Promise<string | null> {
  const profile = await getMyProfile();
  return profile?.signature_url ?? null;
}

export async function saveSignature(dataUrl: string) {
  if (!dataUrl) throw new Error("חתימה ריקה");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  const { error } = await supabase
    .from("profiles")
    .update({ signature_url: dataUrl })
    .eq("id", user.id);
  if (error) throw error;

  revalidatePath("/profile");
}
