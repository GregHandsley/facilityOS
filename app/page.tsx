import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Dumbbell,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ActivityFeedCard } from "@/components/cards/ActivityFeedCard";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { StatusRing } from "@/components/status/StatusRing";
import { Button } from "@/components/ui/button";

const activityItems = [
  {
    id: "1",
    icon: CheckCircle2,
    title: "Cable Area Care Round completed",
    meta: "2 minutes ago",
    tone: "green" as const,
  },
  {
    id: "2",
    icon: Radio,
    title: "Treadmill 04 status checked",
    meta: "8 minutes ago",
    tone: "amber" as const,
  },
  {
    id: "3",
    icon: Sparkles,
    title: "AI insight placeholder ready",
    meta: "Sprint 0 component",
    tone: "ice" as const,
  },
];

export default function Home() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Sprint 0 Foundation"
        title="FacilityOS"
        description="A premium equipment care platform foundation: dark-mode-first styling, reusable interface components, and Firebase-ready configuration."
        action={
          <Button>
            Foundation ready
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PremiumCard className="overflow-hidden">
          <div className="facility-grid absolute inset-0 opacity-40" />
          <div className="relative flex flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Facility pulse</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                  Give every piece of equipment a memory.
                </h2>
              </div>
              <StatusRing status="green" label="Ready" value={92} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Care tasks" value="84%" status="green" />
              <Metric label="Open faults" value="3" status="amber" />
              <Metric label="Out of order" value="1" status="red" />
            </div>
          </div>
        </PremiumCard>

        <ActivityFeedCard title="Live activity" items={activityItems} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PremiumCard>
          <Dumbbell className="h-5 w-5 text-facility-green" />
          <h3 className="mt-5 text-lg font-semibold">Equipment identity</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            QR-linked profiles, live status and image-led equipment pages are
            ready to build on top of this foundation.
          </p>
        </PremiumCard>

        <PremiumCard>
          <ShieldCheck className="h-5 w-5 text-facility-ice" />
          <h3 className="mt-5 text-lg font-semibold">RBAC-ready structure</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The app structure is prepared for auth, route protection and
            permission utilities in Sprint 1.
          </p>
        </PremiumCard>

        <PremiumCard>
          <Activity className="h-5 w-5 text-facility-amber" />
          <h3 className="mt-5 text-lg font-semibold">Operational UI kit</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Status badges, rings, cards, loading and empty states are available
            as reusable building blocks.
          </p>
        </PremiumCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={Sparkles}
          title="Business features start in Sprint 1"
          description="Authentication, users and RBAC are the next layer. Sprint 0 keeps the product surface clean and foundational."
        />
        <LoadingCard title="Preparing facility data" />
      </section>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "green" | "amber" | "red";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
