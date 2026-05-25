import { PageHeader } from "@/components/layout/PageHeader";
import { EquipmentListClient } from "@/components/equipment/EquipmentListClient";

export default function EquipmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Equipment"
        title="Equipment"
        description="Create and inspect the QR-linked equipment profiles that FacilityOS will care for."
      />
      <EquipmentListClient />
    </>
  );
}
