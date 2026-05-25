import { notFound } from "next/navigation";
import { getPublicEquipmentBySlug } from "@/lib/db/equipment";
import { PublicFaultReportClient } from "@/components/public/PublicFaultReportClient";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const equipment = await getPublicEquipmentBySlug(slug);

  if (!equipment) {
    notFound();
  }

  return <PublicFaultReportClient equipment={equipment} />;
}
