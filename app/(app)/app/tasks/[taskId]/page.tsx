import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { TaskDetailClient } from "@/components/tasks/TaskDetailClient";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  return (
    <ProtectedRoute permission="complete_task">
      <PageHeader
        eyebrow="Care task"
        title="Task detail"
        description="Complete the care task and capture notes for the equipment history."
      />
      <TaskDetailClient taskId={taskId} />
    </ProtectedRoute>
  );
}
