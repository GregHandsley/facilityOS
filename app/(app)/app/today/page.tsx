import Link from "next/link";
import { ClipboardCheck, Dumbbell, Wrench } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

const tasks = [
  {
    icon: ClipboardCheck,
    title: "Cable Area Care Round",
    meta: "6 machines · Daily cleaning · Due before 10:00",
    status: "green" as const,
  },
  {
    icon: Dumbbell,
    title: "Treadmill Weekly Checks",
    meta: "10 machines · Emergency stops and belt condition",
    status: "amber" as const,
  },
  {
    icon: Wrench,
    title: "Leg Press 02",
    meta: "Grease guide rods · QR confirmation required",
    status: "red" as const,
  },
];

export default function StaffTodayPage() {
  return (
    <>
      <PageHeader
        eyebrow="Staff workspace"
        title="Today"
        description="The focused staff landing page for operational tasks. Full task workflows arrive in later sprints."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/app/equipment">Equipment</Link>
            </Button>
            <LogoutButton />
          </div>
        }
      />

      <section className="grid gap-4">
        {tasks.map((task) => {
          const Icon = task.icon;

          return (
            <PremiumCard key={task.title}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-facility-green">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{task.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{task.meta}</p>
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>
            </PremiumCard>
          );
        })}
      </section>
    </>
  );
}
