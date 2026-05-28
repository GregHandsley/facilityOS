"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Inbox, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { firebaseAuth } from "@/lib/firebase/client";
import { can } from "@/lib/rbac/can";
import { getFacilityIssues, updateIssueAiAnalysis } from "@/lib/db/issues";
import { getFacilityEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import {
  getIssueTone,
  isIssueOpen,
  issueCategoryLabels,
  issuePriorityLabels,
  issueStatusLabels,
} from "@/lib/issues/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type {
  AiIssueAnalysis,
  IssuePriority,
  IssueStatus,
  ManagedIssue,
} from "@/types/issue";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { EmptyState } from "@/components/shared/EmptyState";

type StatusFilter = "all" | "open" | "resolved" | IssueStatus;
type PriorityFilter = "all" | IssuePriority;

export function IssueListClient() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<ManagedIssue[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const [issueRecords, equipmentRecords, locationRecords] = await Promise.all([
          getFacilityIssues(user.facilityId),
          getFacilityEquipment(user.facilityId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        setIssues(issueRecords);
        setEquipment(equipmentRecords);
        setLocations(locationRecords);
      } catch {
        if (isMounted) {
          setMessage("Issues could not be loaded.");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !can(user, "view_ai_insights") || issues.length === 0) {
      return;
    }

    const unanalyzedIssues = issues
      .filter((issue) => isIssueOpen(issue.status) && !issue.aiAnalysis && !issue.aiError)
      .slice(0, 3);

    if (unanalyzedIssues.length === 0) {
      return;
    }

    let isCancelled = false;

    async function analyzeOpenIssues() {
      const token = await firebaseAuth.currentUser?.getIdToken();

      if (!token) {
        return;
      }

      for (const issue of unanalyzedIssues) {
        if (isCancelled) {
          return;
        }

        try {
          const response = await fetch("/api/ai/fault-analysis", {
            body: JSON.stringify({
              equipmentName:
                equipment.find((item) => item.id === issue.equipmentId)?.name ??
                "Equipment",
              issue,
              locationName:
                locations.find((location) => location.id === issue.locationId)?.name ??
                "Facility area",
              recentIssues: issues,
            }),
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            method: "POST",
          });

          if (!response.ok) {
            throw new Error("AI analysis request failed.");
          }

          const payload = (await response.json()) as { analysis?: AiIssueAnalysis };

          if (!payload.analysis) {
            throw new Error("AI analysis response was empty.");
          }

          const updatedIssue = await updateIssueAiAnalysis({
            analysis: payload.analysis,
            issue,
          });

          if (!isCancelled) {
            setIssues((currentIssues) =>
              currentIssues.map((currentIssue) =>
                currentIssue.id === updatedIssue.id ? updatedIssue : currentIssue,
              ),
            );
          }
        } catch {
          // Background triage should never interrupt the manager's issue list.
        }
      }
    }

    void analyzeOpenIssues();

    return () => {
      isCancelled = true;
    };
  }, [equipment, issues, locations, user]);

  const equipmentNames = useMemo(
    () => new Map(equipment.map((item) => [item.id, item.name])),
    [equipment],
  );
  const locationNames = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && isIssueOpen(issue.status)) ||
        (statusFilter === "resolved" && !isIssueOpen(issue.status)) ||
        issue.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || issue.priority === priorityFilter;

      return matchesStatus && matchesPriority;
    });
  }, [issues, priorityFilter, statusFilter]);

  const openCount = issues.filter((issue) => isIssueOpen(issue.status)).length;
  const criticalCount = issues.filter(
    (issue) => isIssueOpen(issue.status) && issue.priority === "critical",
  ).length;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <IssueMetric label="Open issues" value={String(openCount)} />
        <IssueMetric label="Critical" value={String(criticalCount)} />
        <IssueMetric label="Total reports" value={String(issues.length)} />
      </div>

      <PremiumCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4 text-facility-green" />
            Filter reports
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="h-11 rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              value={statusFilter}
            >
              <option value="open">Open</option>
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In progress</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved / closed</option>
            </select>
            <select
              className="h-11 rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) =>
                setPriorityFilter(event.target.value as PriorityFilter)
              }
              value={priorityFilter}
            >
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </PremiumCard>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {filteredIssues.length > 0 ? (
        <div className="grid gap-4">
          {filteredIssues.map((issue) => (
            <Link href={`/app/issues/${issue.id}`} key={issue.id}>
              <IssueCard
                equipmentName={equipmentNames.get(issue.equipmentId) ?? "Equipment"}
                issue={issue}
                locationName={locationNames.get(issue.locationId) ?? "Facility area"}
              />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No issues in this view"
          description="New public reports and manager-created issues will appear here when they match the selected filters."
        />
      )}
    </section>
  );
}

function IssueMetric({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </PremiumCard>
  );
}

function IssueCard({
  equipmentName,
  issue,
  locationName,
}: {
  equipmentName: string;
  issue: ManagedIssue;
  locationName: string;
}) {
  const tone = getIssueTone(issue.status, issue.priority);
  const Icon = tone === "green" ? CheckCircle2 : AlertTriangle;

  return (
    <PremiumCard className="transition hover:border-primary/40 hover:bg-white/[0.065]">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            tone === "green"
              ? "bg-facility-green/15 text-facility-green"
              : tone === "red"
                ? "bg-facility-red/15 text-facility-red"
                : "bg-facility-amber/15 text-facility-amber"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {issueCategoryLabels[issue.category]} · {locationName}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{equipmentName}</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                {issueStatusLabels[issue.status]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                {issuePriorityLabels[issue.priority]}
              </span>
              {issue.aiAnalysis?.isSafetyRelated ? (
                <span className="rounded-full border border-facility-red/20 bg-facility-red/10 px-3 py-1 text-facility-red">
                  AI safety signal
                </span>
              ) : null}
              {issue.aiAnalysis?.duplicateOrRepeat ? (
                <span className="rounded-full border border-facility-amber/20 bg-facility-amber/10 px-3 py-1 text-facility-amber">
                  Possible repeat
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {issue.description}
          </p>
        </div>
      </div>
    </PremiumCard>
  );
}
