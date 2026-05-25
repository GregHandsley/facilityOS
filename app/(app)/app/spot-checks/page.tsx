import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { SpotChecksClient } from "@/components/spot-checks/SpotChecksClient";

export default function SpotChecksPage() {
  return (
    <ProtectedRoute permission="review_spot_checks">
      <PageHeader
        eyebrow="Manager assurance"
        title="Spot checks"
        description="Review a sampled set of completed work so standards are trusted, not just recorded."
      />
      <SpotChecksClient />
    </ProtectedRoute>
  );
}
