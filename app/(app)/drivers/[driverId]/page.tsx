import { notFound } from "next/navigation";
import { getEntityDetail } from "@/lib/actions/officer";
import EntityDetailCard from "@/components/EntityDetailCard";

export const dynamic = "force-dynamic";

export default async function DriverStatusPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  const detail = await getEntityDetail("driver", driverId);
  if (!detail) notFound();
  return <EntityDetailCard detail={detail} />;
}
