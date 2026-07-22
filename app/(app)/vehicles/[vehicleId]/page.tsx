import { notFound } from "next/navigation";
import { getEntityDetail } from "@/lib/actions/officer";
import EntityDetailCard from "@/components/EntityDetailCard";

export const dynamic = "force-dynamic";

export default async function VehicleStatusPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const detail = await getEntityDetail("vehicle", vehicleId);
  if (!detail) notFound();
  return <EntityDetailCard detail={detail} />;
}
