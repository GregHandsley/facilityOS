import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { NewEquipmentClient } from "@/components/equipment/NewEquipmentClient";

export default function NewEquipmentPage() {
  return (
    <ProtectedRoute permission="manage_equipment">
      <PageHeader
        eyebrow="Equipment setup"
        title="New equipment"
        description="Add an equipment profile, assign it to a location and generate its public QR identity."
      />
      <NewEquipmentClient />
    </ProtectedRoute>
  );
}
