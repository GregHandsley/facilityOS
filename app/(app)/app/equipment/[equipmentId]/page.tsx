import { PageHeader } from "@/components/layout/PageHeader";
import { EquipmentDetailClient } from "@/components/equipment/EquipmentDetailClient";

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;

  return (
    <>
      <PageHeader
        eyebrow="Equipment profile"
        title="Equipment detail"
        description="Live equipment identity, location, QR slug and operational status."
      />
      <EquipmentDetailClient equipmentId={equipmentId} />
    </>
  );
}
