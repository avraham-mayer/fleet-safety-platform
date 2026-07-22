"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/types";

// Checklist-template management (admin settings). Lives outside
// lib/actions/admin.ts on purpose — that file is being worked on concurrently;
// the requireAdmin check is deliberately duplicated here.
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("נדרשת הרשאת מנהל");

  return { supabase, user };
}

// The items textarea is one label per line. On edit, labels that already exist
// on the template keep their key, so historical inspection_checklist_lines
// stay comparable across template edits; new labels get fresh keys.
function parseItems(raw: string, existing: ChecklistItem[]): ChecklistItem[] {
  const byLabel = new Map(existing.map((i) => [i.label, i.key]));
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({
      key: byLabel.get(label) ?? crypto.randomUUID(),
      label,
    }));
}

export async function saveTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const itemsRaw = String(formData.get("items") ?? "");

  if (!name) throw new Error("נדרש שם תבנית");
  if (!type) throw new Error("נדרש סוג תבנית");

  let existing: ChecklistItem[] = [];
  if (id) {
    const { data } = await supabase
      .from("checklist_templates")
      .select("items")
      .eq("id", id)
      .single();
    existing = (data?.items ?? []) as ChecklistItem[];
  }

  const items = parseItems(itemsRaw, existing);
  if (items.length === 0) throw new Error("נדרש לפחות סעיף אחד");

  const row = { name, type, items };
  const { error } = id
    ? await supabase.from("checklist_templates").update(row).eq("id", id)
    : await supabase.from("checklist_templates").insert(row);
  if (error) throw error;

  revalidatePath("/", "layout");
}

export async function toggleTemplate(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("תבנית לא נמצאה");

  const { data: tpl } = await supabase
    .from("checklist_templates")
    .select("active")
    .eq("id", id)
    .single();
  const { error } = await supabase
    .from("checklist_templates")
    .update({ active: !tpl?.active })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/", "layout");
}
