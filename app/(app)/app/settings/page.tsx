import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { SettingsNav } from "@/components/settings/SettingsNav";

export default function SettingsPage() {
  return (
    <ProtectedRoute permission="manage_locations">
      <PageHeader
        eyebrow="Manager settings"
        title="Settings"
        description="Configure the facility structure that FacilityOS will use for equipment, care tasks and reporting."
      />
      <SettingsNav />
    </ProtectedRoute>
  );
}
