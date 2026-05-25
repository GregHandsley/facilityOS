import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { OutOfOrderClient } from "@/components/equipment/OutOfOrderClient";

export default async function OutOfOrderPage({
  params,
}: {
  params: Promise<{ equipmentId: string }>;
}) {
  const { equipmentId } = await params;

  return (
    <ProtectedRoute permission="mark_out_of_order">
      <PageHeader
        eyebrow="Equipment safety"
        title="Out of order"
        description="Remove unsafe or unavailable equipment from service and notify managers immediately."
      />
      <OutOfOrderClient equipmentId={equipmentId} />
    </ProtectedRoute>
  );
}
