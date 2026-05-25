import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskDashboardClient } from "@/components/tasks/TaskDashboardClient";
import { Button } from "@/components/ui/button";

export default function StaffTodayPage() {
  return (
    <>
      <PageHeader
        eyebrow="Staff workspace"
        title="Today"
        description="A focused view of the care tasks due across your assigned facility."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/app/tasks">Tasks</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/equipment">Equipment</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      <TaskDashboardClient />
    </>
  );
}
