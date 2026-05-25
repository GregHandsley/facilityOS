import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { ManagerPulseClient } from "@/components/pulse/ManagerPulseClient";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { Button } from "@/components/ui/button";

export default function ManagerPulsePage() {
  return (
    <ProtectedRoute permission="view_manager_pulse">
      <PageHeader
        eyebrow="Manager workspace"
        title="Pulse"
        description="Live facility standards, issues, out-of-order equipment and overdue care work."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/app/equipment">Equipment</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/tasks">Tasks</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/issues">Issues</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/settings">Settings</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      <ManagerPulseClient />
    </ProtectedRoute>
  );
}
