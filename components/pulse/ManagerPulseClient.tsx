"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Radio,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { ActivityFeedCard } from "@/components/cards/ActivityFeedCard";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusRing } from "@/components/status/StatusRing";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFacilityEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import { getFacilityIssues } from "@/lib/db/issues";
import { getFacilityTaskInstances } from "@/lib/db/tasks";
import { getIssueTone, isIssueOpen, issuePriorityLabels } from "@/lib/issues/labels";
import { getPulseSummary, isTaskOverdue } from "@/lib/pulse/summary";
import { formatTaskDueLabel } from "@/lib/tasks/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type { ManagedIssue } from "@/types/issue";
import type { CareTaskInstance } from "@/types/task";

type AttentionItemData = {
  href: string;
  id: string;
  meta: string;
  title: string;
  tone: "green" | "amber" | "red";
  type: string;
};

export function ManagerPulseClient() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [issues, setIssues] = useState<ManagedIssue[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [tasks, setTasks] = useState<CareTaskInstance[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPulse() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setMessage(null);

      try {
        const [equipmentRecords, issueRecords, locationRecords, taskRecords] =
          await Promise.all([
            getFacilityEquipment(user.facilityId),
            getFacilityIssues(user.facilityId),
            getFacilityLocations(user.facilityId),
            getFacilityTaskInstances(user.facilityId),
          ]);

        if (!isMounted) {
          return;
        }

        setEquipment(equipmentRecords);
        setIssues(issueRecords);
        setLocations(locationRecords);
        setTasks(taskRecords);
      } catch {
        if (isMounted) {
          setMessage("Pulse data could not be loaded.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPulse();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const summary = useMemo(
    () => getPulseSummary({ equipment, issues, tasks }),
    [equipment, issues, tasks],
  );
  const locationNames = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );
  const equipmentNames = useMemo(
    () => new Map(equipment.map((item) => [item.id, item.name])),
    [equipment],
  );
  const openIssues = useMemo(
    () => issues.filter((issue) => isIssueOpen(issue.status)),
    [issues],
  );
  const outOfOrderEquipment = useMemo(
    () => equipment.filter((item) => item.status === "red"),
    [equipment],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => isTaskOverdue(task)),
    [tasks],
  );
  const attentionItems = useMemo(
    () =>
      [
        ...openIssues
          .filter((issue) => issue.priority === "critical" || issue.priority === "high")
          .slice(0, 3)
          .map(
            (issue): AttentionItemData => ({
              href: `/app/issues/${issue.id}`,
              id: `issue-${issue.id}`,
              meta: `${issuePriorityLabels[issue.priority]} priority · ${
                locationNames.get(issue.locationId) ?? "Facility area"
              }`,
              title: equipmentNames.get(issue.equipmentId) ?? "Open issue",
              tone: getIssueTone(issue.status, issue.priority),
              type: "Issue",
            }),
          ),
        ...outOfOrderEquipment.slice(0, 3).map((item) => ({
          href: `/app/equipment/${item.id}`,
          id: `equipment-${item.id}`,
          meta: `${locationNames.get(item.locationId) ?? "Facility area"} · out of order`,
          title: item.name,
          tone: "red" as const,
          type: "Equipment",
        })),
        ...overdueTasks.slice(0, 3).map((task) => ({
          href: `/app/tasks/${task.id}`,
          id: `task-${task.id}`,
          meta: `${equipmentNames.get(task.equipmentId) ?? "Equipment"} · due ${formatTaskDueLabel(task.dueAt)}`,
          title: task.title,
          tone: "amber" as const,
          type: "Task",
        })),
      ].slice(0, 6),
    [equipmentNames, locationNames, openIssues, outOfOrderEquipment, overdueTasks],
  );
  const feedItems = useMemo(
    () =>
      [
        ...tasks
          .filter((task) => task.status === "completed")
          .map((task) => ({
            createdAt: task.completedAt || task.updatedAt,
            icon: CheckCircle2,
            id: `completed-${task.id}`,
            meta: equipmentNames.get(task.equipmentId) ?? "Equipment",
            title: `Completed ${task.title}`,
            tone: "green" as const,
          })),
        ...issues.map((issue) => ({
          createdAt: issue.updatedAt || issue.createdAt,
          icon: AlertTriangle,
          id: `issue-${issue.id}`,
          meta: `${issuePriorityLabels[issue.priority]} priority`,
          title: `${isIssueOpen(issue.status) ? "Open" : "Resolved"} issue on ${
            equipmentNames.get(issue.equipmentId) ?? "equipment"
          }`,
          tone: getIssueTone(issue.status, issue.priority),
        })),
        ...outOfOrderEquipment.map((item) => ({
          createdAt: item.updatedAt,
          icon: ShieldAlert,
          id: `out-of-order-${item.id}`,
          meta: locationNames.get(item.locationId) ?? "Facility area",
          title: `${item.name} is out of order`,
          tone: "red" as const,
        })),
      ]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [equipmentNames, issues, locationNames, outOfOrderEquipment, tasks],
  );

  return (
    <section className="space-y-4">
      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <PremiumCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-facility-green">Facility Pulse</p>
              <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-normal">
                {isLoading ? "Reading live operations." : getPulseHeadline(summary.tone)}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Live signal from care tasks, open faults and out-of-order equipment.
              </p>
            </div>
            <StatusRing status={summary.tone} label="Pulse" value={summary.pulseScore} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <PulseMetric icon={CheckCircle2} label="Completed tasks" value={summary.completedTasks} />
            <PulseMetric icon={AlertTriangle} label="Open issues" value={summary.openIssues} />
            <PulseMetric icon={ShieldAlert} label="Out of order" value={summary.outOfOrderEquipment} />
            <PulseMetric icon={Clock3} label="Overdue tasks" value={summary.overdueTasks} />
          </div>
        </PremiumCard>

        <PremiumCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Needs Your Attention</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                High-priority issues, downtime and overdue work.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/app/issues">
                Issues
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 space-y-3">
            {attentionItems.length > 0 ? (
              attentionItems.map((item) => <AttentionItem item={item} key={item.id} />)
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Nothing urgent right now"
                description="Open faults, out-of-order equipment and overdue tasks will appear here."
              />
            )}
          </div>
        </PremiumCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PulseList
          actionHref="/app/issues"
          actionLabel="View issues"
          empty="No open issues."
          icon={AlertTriangle}
          items={openIssues.slice(0, 4).map((issue) => ({
            href: `/app/issues/${issue.id}`,
            meta: `${issuePriorityLabels[issue.priority]} · ${
              locationNames.get(issue.locationId) ?? "Facility area"
            }`,
            title: equipmentNames.get(issue.equipmentId) ?? "Equipment issue",
          }))}
          title="Open Issues"
        />
        <PulseList
          actionHref="/app/equipment"
          actionLabel="View equipment"
          empty="No equipment is out of order."
          icon={ShieldAlert}
          items={outOfOrderEquipment.slice(0, 4).map((item) => ({
            href: `/app/equipment/${item.id}`,
            meta: locationNames.get(item.locationId) ?? "Facility area",
            title: item.name,
          }))}
          title="Out-of-Order Equipment"
        />
        <PulseList
          actionHref="/app/tasks"
          actionLabel="View tasks"
          empty="No overdue tasks."
          icon={CalendarClock}
          items={overdueTasks.slice(0, 4).map((task) => ({
            href: `/app/tasks/${task.id}`,
            meta: formatTaskDueLabel(task.dueAt),
            title: task.title,
          }))}
          title="Overdue Tasks"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <ActivityFeedCard
          title="Live Activity"
          items={
            feedItems.length > 0
              ? feedItems
              : [
                  {
                    id: "empty-feed",
                    icon: Radio,
                    title: "Activity will appear as work happens",
                    meta: "Task completions, reports and equipment changes",
                    tone: "ice",
                  },
                ]
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <PlaceholderInsight
            icon={Wrench}
            label="Equipment at Risk"
            title="Replacement intelligence placeholder"
          />
          <PlaceholderInsight
            icon={ClipboardCheck}
            label="Spot Checks"
            title="Manager assurance arrives next"
          />
          <PlaceholderInsight icon={Bot} label="AI Insights" title="Pattern detection coming soon" />
        </div>
      </div>
    </section>
  );
}

function getPulseHeadline(tone: "green" | "amber" | "red") {
  if (tone === "red") {
    return "Several standards need manager attention.";
  }

  if (tone === "amber") {
    return "Operations are moving, with a few risks to clear.";
  }

  return "The facility is looking steady.";
}

function PulseMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="min-h-28 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-4 w-4 text-facility-green" />
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function AttentionItem({
  item,
}: {
  item: AttentionItemData;
}) {
  const toneClass =
    item.tone === "red"
      ? "bg-facility-red/15 text-facility-red"
      : item.tone === "amber"
        ? "bg-facility-amber/15 text-facility-amber"
        : "bg-facility-green/15 text-facility-green";

  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-primary/40 hover:bg-white/[0.065]"
      href={item.href}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>
            {item.type}
          </span>
          <p className="truncate text-sm font-semibold">{item.title}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{item.meta}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function PulseList({
  actionHref,
  actionLabel,
  empty,
  icon: Icon,
  items,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  empty: string;
  icon: LucideIcon;
  items: Array<{ href: string; meta: string; title: string }>;
  title: string;
}) {
  return (
    <PremiumCard>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-facility-green" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              className="block rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-primary/40 hover:bg-white/[0.065]"
              href={item.href}
              key={item.href}
            >
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
            </Link>
          ))
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </PremiumCard>
  );
}

function PlaceholderInsight({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <PremiumCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-facility-ice/15 text-facility-ice">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-facility-green">{label}</p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            Reserved for the intelligence layer.
          </p>
        </div>
      </div>
    </PremiumCard>
  );
}
