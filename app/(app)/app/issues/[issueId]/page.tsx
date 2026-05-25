import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { IssueDetailClient } from "@/components/issues/IssueDetailClient";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;

  return (
    <ProtectedRoute permission="manage_issues">
      <PageHeader
        eyebrow="Issue management"
        title="Issue detail"
        description="Update issue status, priority and manager notes. Resolving the final active issue updates the public QR profile."
      />
      <IssueDetailClient issueId={issueId} />
    </ProtectedRoute>
  );
}
