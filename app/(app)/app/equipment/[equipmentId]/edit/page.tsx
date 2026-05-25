import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { EditEquipmentClient } from "@/components/equipment/EditEquipmentClient";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;

  return (
    <ProtectedRoute permission="manage_equipment">
      <PageHeader
        eyebrow="Equipment setup"
        title="Edit equipment"
        description="Update the equipment profile, image, location and public QR visibility."
      />
      <EditEquipmentClient equipmentId={equipmentId} />
    </ProtectedRoute>
  );
}
