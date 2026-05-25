import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ActivityFeedCard } from "@/components/cards/ActivityFeedCard";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProtectedRoute } from "@/components/rbac/ProtectedRoute";
import { StatusRing } from "@/components/status/StatusRing";
import { Button } from "@/components/ui/button";

const feed = [
  {
    id: "task",
    icon: CheckCircle2,
    title: "Becky completed Cable Area Care Round",
    meta: "Manager-visible activity placeholder",
    tone: "green" as const,
  },
  {
    id: "fault",
    icon: AlertTriangle,
    title: "User reported a fault on Bench 05",
    meta: "Issue workflows arrive in Sprint 5",
    tone: "amber" as const,
  },
  {
    id: "pulse",
    icon: Radio,
    title: "Facility pulse route protected",
    meta: "Manager permission required",
    tone: "ice" as const,
  },
];

export default function ManagerPulsePage() {
  return (
    <ProtectedRoute permission="view_manager_pulse">
      <PageHeader
        eyebrow="Manager workspace"
        title="Pulse"
        description="A manager-only facility pulse foundation with RBAC route protection in place."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/app/equipment">Equipment</Link>
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

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <PremiumCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Facility standard</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                Operations visible at a glance.
              </h2>
            </div>
            <StatusRing status="green" label="Pulse" value={88} />
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <PulseMetric label="Tasks done" value="24" />
            <PulseMetric label="Open faults" value="3" />
            <PulseMetric label="Overdue" value="1" />
          </div>
        </PremiumCard>

        <ActivityFeedCard title="Live activity" items={feed} />
      </section>
    </ProtectedRoute>
  );
}

function PulseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Activity className="h-4 w-4 text-facility-green" />
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
