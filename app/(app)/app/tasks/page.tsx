import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { TaskDashboardClient } from "@/components/tasks/TaskDashboardClient";

export default function TasksPage() {
  return (
    <ProtectedRoute permission="view_staff_tasks">
      <PageHeader
        eyebrow="Care tasks"
        title="Tasks"
        description="Create care schedules, view due work and complete equipment care tasks."
      />
      <TaskDashboardClient />
    </ProtectedRoute>
  );
}
