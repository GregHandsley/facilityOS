import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { LocationsSettingsClient } from "@/components/settings/LocationsSettingsClient";

export default function LocationsSettingsPage() {
  return (
    <ProtectedRoute permission="manage_locations">
      <PageHeader
        eyebrow="Manager settings"
        title="Locations"
        description="Create zones, rooms and areas. Staff will use these labels later when viewing equipment and tasks."
      />
      <LocationsSettingsClient />
    </ProtectedRoute>
  );
}
