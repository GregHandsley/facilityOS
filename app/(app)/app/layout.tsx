import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AppShell>
  );
}
