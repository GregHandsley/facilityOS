import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { FacilitySettingsClient } from "@/components/settings/FacilitySettingsClient";

export default function FacilitySettingsPage() {
  return (
    <ProtectedRoute permission="manage_locations">
      <PageHeader
        eyebrow="Manager settings"
        title="Facility"
        description="Create or update the core facility record for your assigned FacilityOS workspace."
      />
      <FacilitySettingsClient />
    </ProtectedRoute>
  );
}
