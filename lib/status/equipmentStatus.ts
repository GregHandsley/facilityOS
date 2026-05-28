import type {
  Equipment,
  EquipmentStatus,
  PublicEquipmentSummary,
} from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export type EquipmentStatusReason = {
  message: string;
  severity: EquipmentStatus;
};

export type EquipmentStatusResult = {
  reasons: EquipmentStatusReason[];
  status: EquipmentStatus;
  statusCopy: string;
};

export type EquipmentStatusInput = {
  equipment: Equipment;
  issues?: ManagedIssue[];
  now?: Date;
  outOfOrderEvents?: OutOfOrderEvent[];
  publicEquipment?: PublicEquipmentSummary | null;
  spotChecks?: SpotCheck[];
  tasks?: CareTaskInstance[];
};

const openIssueStatuses = ["new", "acknowledged", "assigned", "in_progress", "waiting"];

export function calculateEquipmentStatus({
  issues = [],
  now = new Date(),
  outOfOrderEvents = [],
  publicEquipment = null,
  spotChecks = [],
  tasks = [],
}: EquipmentStatusInput): EquipmentStatusResult {
  const reasons: EquipmentStatusReason[] = [];
  const openIssues = issues.filter((issue) => openIssueStatuses.includes(issue.status));
  const unresolvedOutOfOrderEvents = outOfOrderEvents.filter((event) => !event.resolvedAt);

  if (unresolvedOutOfOrderEvents.length > 0) {
    reasons.push({
      message: "Equipment is marked out of order",
      severity: "red",
    });
  }

  if (publicEquipment?.publicStatus === "red") {
    reasons.push({
      message: "Public status is out of order",
      severity: "red",
    });
  }

  if (
    openIssues.some(
      (issue) => issue.priority === "critical" || issue.category === "safety_concern",
    )
  ) {
    reasons.push({
      message: "Active critical or safety-related issue",
      severity: "red",
    });
  }

  if (
    spotChecks.some(
      (spotCheck) => spotCheck.status === "escalated",
    )
  ) {
    reasons.push({
      message: "Escalated manager spot check",
      severity: "red",
    });
  }

  if (
    tasks.some(
      (task) =>
        isTaskCurrentlyOverdue(task, now) &&
        (task.category === "safety" || task.category === "compliance"),
    )
  ) {
    reasons.push({
      message: "Critical safety or compliance task is overdue",
      severity: "red",
    });
  }

  if (openIssues.some((issue) => issue.priority === "high")) {
    reasons.push({
      message: "High-priority issue is active",
      severity: "amber",
    });
  }

  if (spotChecks.some((spotCheck) => spotCheck.status === "failed")) {
    reasons.push({
      message: "Failed manager spot check needs review",
      severity: "amber",
    });
  }

  if (openIssues.some((issue) => issue.priority === "low" || issue.priority === "medium")) {
    reasons.push({
      message: "Minor issue is active",
      severity: "amber",
    });
  }

  if (
    openIssues.length === 0 &&
    (publicEquipment?.hasActivePublicFault || publicEquipment?.publicStatus === "amber")
  ) {
    reasons.push({
      message: "Public fault is active",
      severity: "amber",
    });
  }

  if (tasks.some((task) => isTaskCurrentlyOverdue(task, now))) {
    reasons.push({
      message: "Care task is overdue",
      severity: "amber",
    });
  }

  if (spotChecks.some((spotCheck) => spotCheck.status === "pending")) {
    reasons.push({
      message: "Manager spot check is pending",
      severity: "amber",
    });
  }

  if (spotChecks.some((spotCheck) => spotCheck.status === "recheck_required")) {
    reasons.push({
      message: "Spot check rework is required",
      severity: "amber",
    });
  }

  if (reasons.some((reason) => reason.severity === "red")) {
    return {
      reasons,
      status: "red",
      statusCopy: "Out of order",
    };
  }

  if (reasons.some((reason) => reason.severity === "amber")) {
    return {
      reasons,
      status: "amber",
      statusCopy: "Use with awareness",
    };
  }

  return {
    reasons: [
      {
        message: "No active issues, overdue care tasks or failed checks",
        severity: "green",
      },
    ],
    status: "green",
    statusCopy: "Ready to use",
  };
}

export function getPrimaryEquipmentStatusReason(result: EquipmentStatusResult) {
  return result.reasons[0]?.message ?? "No status reason available";
}

function isTaskCurrentlyOverdue(task: CareTaskInstance, now: Date) {
  if (task.status === "completed" || task.status === "skipped") {
    return false;
  }

  if (task.status === "overdue") {
    return true;
  }

  return new Date(task.dueAt).getTime() < now.getTime();
}
