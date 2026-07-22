import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentCapture from "@/components/DocumentCapture";
import type { DocType } from "@/lib/types";

export const dynamic = "force-dynamic";

// New-document capture. Entered from a vehicle/driver page with the entity
// preselected: /documents/new?entity_type=vehicle&entity_id=...
export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ entity_type?: string; entity_id?: string }>;
}) {
  const { entity_type: entityType, entity_id: entityId } = await searchParams;
  if (
    (entityType !== "vehicle" &&
      entityType !== "driver" &&
      entityType !== "company") ||
    !entityId
  )
    notFound();

  const supabase = await createClient();

  let entityLabel = "";
  if (entityType === "company") {
    const { data: c } = await supabase
      .from("companies")
      .select("name")
      .eq("id", entityId)
      .single();
    if (!c) notFound();
    entityLabel = c.name;
  } else if (entityType === "vehicle") {
    const { data: v } = await supabase
      .from("vehicles")
      .select("license_plate")
      .eq("id", entityId)
      .single();
    if (!v) notFound();
    entityLabel = v.license_plate;
  } else {
    const { data: d } = await supabase
      .from("drivers")
      .select("name")
      .eq("id", entityId)
      .single();
    if (!d) notFound();
    entityLabel = d.name;
  }

  const { data: docTypes } = await supabase
    .from("doc_types")
    .select("*")
    .eq("entity_type", entityType)
    .eq("active", true)
    .order("name");

  return (
    <DocumentCapture
      entityType={entityType}
      entityId={entityId}
      entityLabel={entityLabel}
      docTypes={(docTypes ?? []) as DocType[]}
    />
  );
}
