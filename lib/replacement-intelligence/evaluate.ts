import type { Equipment } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type {
  ReplacementIntelligence,
  ReplacementSignal,
  ReplacementSignalDetail,
} from "@/types/replacement";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export type ReplacementIntelligenceInput = {
  equipment: Equipment;
  issues?: ManagedIssue[];
  now?: Date;
  outOfOrderEvents?: OutOfOrderEvent[];
  recoveryWindowDays?: number;
  spotChecks?: SpotCheck[];
  tasks?: CareTaskInstance[];
};

const activeIssueStatuses = ["new", "acknowledged", "assigned", "in_progress", "waiting"];
const DEFAULT_RECOVERY_WINDOW_DAYS = 90;
const CLEAN_SERVICE_RECOVERY_DAYS = 90;
const IMMEDIATE_REPAIR_RECOVERY_FACTOR = 0.1;
const replacementRelevantIssueCategories = ["equipment_fault", "safety_concern"];

export function evaluateReplacementIntelligence({
  equipment,
  issues = [],
  now = new Date(),
  outOfOrderEvents = [],
  recoveryWindowDays = DEFAULT_RECOVERY_WINDOW_DAYS,
  spotChecks = [],
  tasks = [],
}: ReplacementIntelligenceInput): ReplacementIntelligence {
  const signals: ReplacementSignal[] = [];
  const equipmentTasks = tasks.filter((task) => task.equipmentId === equipment.id);
  const equipmentOutOfOrderEvents = outOfOrderEvents.filter(
    (event) => event.equipmentId === equipment.id,
  );
  const lastRecoveryAt = getLastRecoveryAt({
    now,
    outOfOrderEvents: equipmentOutOfOrderEvents,
    tasks: equipmentTasks,
  });
  const equipmentIssues = issues
    .filter((issue) => issue.equipmentId === equipment.id)
    .filter((issue) => replacementRelevantIssueCategories.includes(issue.category))
    .filter((issue) =>
      shouldIncludeCurrentSignal({
        createdAt: issue.createdAt,
        isActive: activeIssueStatuses.includes(issue.status),
        lastRecoveryAt,
        now,
        recoveryWindowDays,
      }),
    );
  const activeIssues = equipmentIssues.filter((issue) =>
    activeIssueStatuses.includes(issue.status),
  );
  const activeIssueIds = new Set(activeIssues.map((issue) => issue.id));
  const severeIssues = equipmentIssues.filter(
    (issue) => issue.priority === "critical" || issue.category === "safety_concern",
  );
  const repeatIssueCount = Math.max(0, equipmentIssues.length - 1);
  const repeatedCategories = getRepeatedIssueCategories(equipmentIssues);
  const currentOutOfOrderEvents = equipmentOutOfOrderEvents.filter((event) =>
    shouldIncludeCurrentSignal({
      createdAt: event.createdAt,
      isActive: !event.resolvedAt,
      lastRecoveryAt,
      now,
      recoveryWindowDays,
    }),
  );
  const currentServiceIncidentDetails = [
    ...activeIssues.map(issueToDetail),
    ...currentOutOfOrderEvents
      .filter((event) => !activeIssueIds.has(event.linkedIssueId))
      .map((event) => outOfOrderEventToDetail(event, now)),
  ];
  const downtimeHours = getDowntimeHours(currentOutOfOrderEvents, now);
  const failedSpotChecks = spotChecks.filter(
    (spotCheck) =>
      spotCheck.equipmentId === equipment.id &&
      (spotCheck.status === "failed" || spotCheck.status === "escalated") &&
      shouldIncludeCurrentSignal({
        createdAt: spotCheck.reviewedAt || spotCheck.createdAt,
        isActive: spotCheck.status === "escalated",
        lastRecoveryAt,
        now,
        recoveryWindowDays,
      }),
  );
  const failedInspections = equipmentTasks.filter(
    (task) =>
      (task.category === "inspection" || task.category === "safety") &&
      (task.status === "skipped" || task.status === "overdue") &&
      shouldIncludeCurrentSignal({
        createdAt: task.dueAt,
        isActive: task.status === "overdue",
        lastRecoveryAt,
        now,
        recoveryWindowDays,
      }),
  );
  const hasRepeatedReliabilityPattern =
    equipmentIssues.length >= 2 ||
    repeatedCategories.length > 0 ||
    currentOutOfOrderEvents.length >= 2 ||
    severeIssues.length >= 2 ||
    activeIssues.length >= 3;

  if (currentServiceIncidentDetails.length > 0 && !hasRepeatedReliabilityPattern) {
    signals.push({
      details: currentServiceIncidentDetails,
      label:
        currentServiceIncidentDetails.length === 1
          ? "Current service incident"
          : `${currentServiceIncidentDetails.length} current service incidents`,
      points: Math.min(30, 15 + (currentServiceIncidentDetails.length - 1) * 5),
      severity: "low",
    });
  }

  if (equipmentIssues.length >= 2) {
    const repeatedCategoryPoints = repeatedCategories.length * 14;
    const issuePoints = Math.min(40, 14 + repeatIssueCount * 10);
    signals.push({
      details: equipmentIssues.map(issueToDetail),
      label:
        repeatedCategories.length > 0
          ? `${equipmentIssues.length} repeated ${repeatedCategories.join(", ").replaceAll("_", " ")} reports`
          : `${equipmentIssues.length} fault reports recorded`,
      points: issuePoints + repeatedCategoryPoints,
      severity: equipmentIssues.length >= 4 || repeatedCategories.length > 1 ? "high" : "medium",
    });
  }

  if (currentOutOfOrderEvents.length >= 2) {
    signals.push({
      details: currentOutOfOrderEvents.map((event) => outOfOrderEventToDetail(event, now)),
      label: `${currentOutOfOrderEvents.length} recent out-of-order events`,
      points: Math.min(45, currentOutOfOrderEvents.length * 16),
      severity: currentOutOfOrderEvents.length >= 3 ? "high" : "medium",
    });
  }

  if (downtimeHours >= 24) {
    signals.push({
      details: currentOutOfOrderEvents.map((event) => downtimeEventToDetail(event, now)),
      label: `${Math.round(downtimeHours)} recent hours of downtime recorded`,
      points: downtimeHours >= 168 ? 40 : downtimeHours >= 72 ? 25 : 15,
      severity: downtimeHours >= 168 ? "high" : "medium",
    });
  }

  if (severeIssues.length >= 2) {
    signals.push({
      details: severeIssues.map(issueToDetail),
      label: `${severeIssues.length} repeated safety or critical issues`,
      points: Math.min(50, severeIssues.length * 22),
      severity: "high",
    });
  }

  if (activeIssues.length >= 3) {
    signals.push({
      details: activeIssues.map(issueToDetail),
      label: `${activeIssues.length} active unresolved issues`,
      points: Math.min(36, activeIssues.length * 12),
      severity: activeIssues.length >= 3 ? "high" : "medium",
    });
  }

  if (failedSpotChecks.length > 0) {
    signals.push({
      details: failedSpotChecks.map(spotCheckToDetail),
      label: `${failedSpotChecks.length} failed or escalated spot check${failedSpotChecks.length === 1 ? "" : "s"}`,
      points: Math.min(36, failedSpotChecks.length * 18),
      severity: failedSpotChecks.some((spotCheck) => spotCheck.status === "escalated")
        ? "high"
        : "medium",
    });
  }

  if (failedInspections.length > 0) {
    signals.push({
      details: failedInspections.map(taskToDetail),
      label: `${failedInspections.length} failed or missed inspection signal${failedInspections.length === 1 ? "" : "s"}`,
      points: Math.min(30, failedInspections.length * 15),
      severity: "medium",
    });
  }

  const signalScore = signals.reduce((total, signal) => total + signal.points, 0);
  const recoveryPenalty = getRecoveryPenalty({
    issues: issues.filter((issue) => issue.equipmentId === equipment.id),
    lastRecoveryAt,
    now,
    outOfOrderEvents: equipmentOutOfOrderEvents,
    recoveryWindowDays,
    spotChecks: spotChecks.filter((spotCheck) => spotCheck.equipmentId === equipment.id),
    tasks: equipmentTasks,
  });
  const score = signalScore + recoveryPenalty;
  const healthScore = Math.max(0, Math.round(100 - score));
  const status = getReplacementStatus(healthScore);

  return {
    equipmentId: equipment.id,
    facilityId: equipment.facilityId,
    healthScore,
    lastRecoveryAt: lastRecoveryAt?.toISOString(),
    recoveryWindowDays,
    score,
    signals,
    state: status === "none" ? "dismissed" : "active",
    status,
    summary: getReplacementSummary(equipment.name, status, signals),
  };
}

function getRepeatedIssueCategories(issues: ManagedIssue[]) {
  const counts = new Map<string, number>();

  issues.forEach((issue) => {
    counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
  });

  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([category]) => category);
}

function getDowntimeHours(events: OutOfOrderEvent[], now: Date) {
  return events.reduce((total, event) => {
    const start = new Date(event.createdAt).getTime();
    const end = event.resolvedAt ? new Date(event.resolvedAt).getTime() : now.getTime();

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return total;
    }

    return total + (end - start) / 1000 / 60 / 60;
  }, 0);
}

function shouldIncludeCurrentSignal({
  createdAt,
  isActive,
  lastRecoveryAt,
  now,
  recoveryWindowDays,
}: {
  createdAt: string;
  isActive: boolean;
  lastRecoveryAt?: Date;
  now: Date;
  recoveryWindowDays: number;
}) {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return false;
  }

  if (isActive) {
    return true;
  }

  if (lastRecoveryAt && created <= lastRecoveryAt) {
    return false;
  }

  return daysBetween(created, now) <= recoveryWindowDays;
}

function getLastRecoveryAt({
  now,
  outOfOrderEvents,
  tasks,
}: {
  now: Date;
  outOfOrderEvents: OutOfOrderEvent[];
  tasks: CareTaskInstance[];
}) {
  const recoveryDates = [
    ...outOfOrderEvents
      .map((event) => event.resolvedAt)
      .filter(Boolean),
    ...tasks
      .filter((task) => task.category === "maintenance" && task.status === "completed")
      .map((task) => task.completedAt)
      .filter(Boolean),
  ]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()) && date <= now)
    .sort((a, b) => b.getTime() - a.getTime());

  return recoveryDates[0];
}

function daysBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 1000 / 60 / 60 / 24;
}

function getRecoveryPenalty({
  issues,
  lastRecoveryAt,
  now,
  outOfOrderEvents,
  recoveryWindowDays,
  spotChecks,
  tasks,
}: {
  issues: ManagedIssue[];
  lastRecoveryAt?: Date;
  now: Date;
  outOfOrderEvents: OutOfOrderEvent[];
  recoveryWindowDays: number;
  spotChecks: SpotCheck[];
  tasks: CareTaskInstance[];
}) {
  if (!lastRecoveryAt) {
    return 0;
  }

  const daysSinceRecovery = daysBetween(lastRecoveryAt, now);

  if (daysSinceRecovery >= CLEAN_SERVICE_RECOVERY_DAYS) {
    return 0;
  }

  const recentBeforeRecovery = (createdAt: string) => {
    const created = new Date(createdAt);

    if (Number.isNaN(created.getTime())) {
      return false;
    }

    return (
      created <= lastRecoveryAt &&
      daysBetween(created, lastRecoveryAt) <= recoveryWindowDays
    );
  };
  const repairedIssues = issues.filter(
    (issue) =>
      replacementRelevantIssueCategories.includes(issue.category) &&
      recentBeforeRecovery(issue.createdAt),
  );
  const repairedOutOfOrderEvents = outOfOrderEvents.filter((event) =>
    recentBeforeRecovery(event.createdAt),
  );
  const repairedSpotChecks = spotChecks.filter(
    (spotCheck) =>
      (spotCheck.status === "failed" || spotCheck.status === "escalated") &&
      recentBeforeRecovery(spotCheck.reviewedAt || spotCheck.createdAt),
  );
  const repairedInspectionTasks = tasks.filter(
    (task) =>
      (task.category === "inspection" || task.category === "safety") &&
      (task.status === "skipped" || task.status === "overdue") &&
      recentBeforeRecovery(task.dueAt),
  );
  const repairedDowntimeHours = getDowntimeHours(repairedOutOfOrderEvents, lastRecoveryAt);
  const preRepairLoad =
    getIssueLoad(repairedIssues) +
    getOutOfOrderLoad(repairedOutOfOrderEvents) +
    getDowntimeLoad(repairedDowntimeHours) +
    Math.min(18, repairedSpotChecks.length * 8) +
    Math.min(14, repairedInspectionTasks.length * 6);

  if (preRepairLoad === 0) {
    return 0;
  }

  const cleanServiceProgress = Math.max(
    0,
    Math.min(1, daysSinceRecovery / CLEAN_SERVICE_RECOVERY_DAYS),
  );

  return Math.round(
    preRepairLoad *
      (1 - IMMEDIATE_REPAIR_RECOVERY_FACTOR) *
      (1 - cleanServiceProgress),
  );
}

function getIssueLoad(issues: ManagedIssue[]) {
  if (issues.length < 2) {
    return 0;
  }

  const repeatedCategories = getRepeatedIssueCategories(issues);
  const severeIssues = issues.filter(
    (issue) => issue.priority === "critical" || issue.category === "safety_concern",
  );
  const repeatIssueCount = Math.max(0, issues.length - 1);

  const repeatedCategoryPoints = repeatedCategories.length * 14;

  return Math.min(40, 14 + repeatIssueCount * 10) +
    repeatedCategoryPoints +
    (severeIssues.length >= 2 ? Math.min(50, severeIssues.length * 22) : 0);
}

function getOutOfOrderLoad(events: OutOfOrderEvent[]) {
  if (events.length < 2) {
    return 0;
  }

  return Math.min(45, events.length * 16);
}

function getDowntimeLoad(downtimeHours: number) {
  if (downtimeHours < 24) {
    return 0;
  }

  return downtimeHours >= 168 ? 40 : downtimeHours >= 72 ? 25 : 15;
}

function issueToDetail(issue: ManagedIssue): ReplacementSignalDetail {
  return {
    href: `/app/issues/${issue.id}`,
    id: issue.id,
    label: issue.description || issue.category.replaceAll("_", " "),
    meta: `${issue.priority} priority - ${issue.status.replaceAll("_", " ")} - ${formatDate(issue.createdAt)}`,
  };
}

function outOfOrderEventToDetail(
  event: OutOfOrderEvent,
  now: Date,
): ReplacementSignalDetail {
  return {
    id: event.id,
    label: event.reason || "Out-of-order event",
    meta: `${event.severity} severity - ${event.resolvedAt ? "resolved" : "open"} - ${formatDate(event.createdAt)} - ${Math.round(getEventDowntimeHours(event, now))}h downtime`,
  };
}

function downtimeEventToDetail(
  event: OutOfOrderEvent,
  now: Date,
): ReplacementSignalDetail {
  return {
    id: `downtime-${event.id}`,
    label: event.reason || "Downtime event",
    meta: `${Math.round(getEventDowntimeHours(event, now))}h from ${formatDate(event.createdAt)}${event.resolvedAt ? ` to ${formatDate(event.resolvedAt)}` : " to now"}`,
  };
}

function spotCheckToDetail(spotCheck: SpotCheck): ReplacementSignalDetail {
  return {
    href: "/app/spot-checks",
    id: spotCheck.id,
    label: `Spot check ${spotCheck.status.replaceAll("_", " ")}`,
    meta: `${spotCheck.sampleReason || "Sample review"} - ${formatDate(spotCheck.reviewedAt || spotCheck.createdAt)}`,
  };
}

function taskToDetail(task: CareTaskInstance): ReplacementSignalDetail {
  return {
    href: `/app/tasks/${task.id}`,
    id: task.id,
    label: task.title,
    meta: `${task.category} - ${task.status} - due ${formatDate(task.dueAt)}`,
  };
}

function getEventDowntimeHours(event: OutOfOrderEvent, now: Date) {
  const start = new Date(event.createdAt).getTime();
  const end = event.resolvedAt ? new Date(event.resolvedAt).getTime() : now.getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return (end - start) / 1000 / 60 / 60;
}

function formatDate(value: string) {
  if (!value) {
    return "date unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date unknown";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getReplacementStatus(healthScore: number): ReplacementIntelligence["status"] {
  if (healthScore < 35) {
    return "high_priority_review";
  }

  if (healthScore < 60) {
    return "review_recommended";
  }

  if (healthScore < 80) {
    return "watch";
  }

  return "none";
}

function getReplacementSummary(
  equipmentName: string,
  status: ReplacementIntelligence["status"],
  signals: ReplacementSignal[],
) {
  if (status === "none") {
    return `${equipmentName} does not currently show equipment-health review signals.`;
  }

  const strongestSignal = [...signals].sort((a, b) => b.points - a.points)[0];

  if (status === "high_priority_review") {
    return `${equipmentName} has strong current reliability signals. Review what action is needed to restore equipment health.`;
  }

  if (status === "review_recommended") {
    return `${equipmentName} has repeated current operational signals. Manager health review is recommended.`;
  }

  return `${equipmentName} is on watch. ${strongestSignal?.label ?? "Monitor future reliability signals."}`;
}
