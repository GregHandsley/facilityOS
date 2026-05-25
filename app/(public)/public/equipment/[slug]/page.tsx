import { notFound } from "next/navigation";
import { getPublicEquipmentBySlug } from "@/lib/db/equipment";
import { PublicEquipmentStatusClient } from "@/components/public/PublicEquipmentStatusClient";

export default async function PublicEquipmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const equipment = await getPublicEquipmentBySlug(slug);

  if (!equipment) {
    notFound();
  }

  return <PublicEquipmentStatusClient equipment={equipment} />;
}
