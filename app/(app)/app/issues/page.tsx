import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { IssueListClient } from "@/components/issues/IssueListClient";

export default function IssuesPage() {
  return (
    <ProtectedRoute permission="manage_issues">
      <PageHeader
        eyebrow="Issue management"
        title="Issues"
        description="Review public reports, prioritise operational problems and keep QR equipment status accurate."
      />
      <IssueListClient />
    </ProtectedRoute>
  );
}
