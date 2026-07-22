import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentRenewal from "@/components/DocumentRenewal";
import type { Document } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RenewPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();
  if (!doc) notFound();

  const document = doc as Document;

  // Recurrence from the doc-type catalog → prefill the next expiry date.
  let defaultExpiry: string | null = null;
  if (document.doc_type_id) {
    const { data: dt } = await supabase
      .from("doc_types")
      .select("recurrence_months")
      .eq("id", document.doc_type_id)
      .single();
    if (dt?.recurrence_months) {
      const next = new Date();
      next.setMonth(next.getMonth() + dt.recurrence_months);
      defaultExpiry = next.toISOString().slice(0, 10);
    }
  }

  // Resolve the owning entity's label for display.
  let entityLabel = "";
  if (document.entity_type === "company") {
    const { data: c } = await supabase
      .from("companies")
      .select("name")
      .eq("id", document.company_id)
      .single();
    entityLabel = c?.name ?? "";
  } else if (document.entity_type === "vehicle") {
    const { data: v } = await supabase
      .from("vehicles")
      .select("license_plate")
      .eq("id", document.entity_id)
      .single();
    entityLabel = v?.license_plate ?? "";
  } else {
    const { data: d } = await supabase
      .from("drivers")
      .select("name")
      .eq("id", document.entity_id)
      .single();
    entityLabel = d?.name ?? "";
  }

  return (
    <DocumentRenewal
      document={document}
      entityLabel={entityLabel}
      defaultExpiry={defaultExpiry}
    />
  );
}
