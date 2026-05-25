import { isIssueOpen } from "@/lib/issues/labels";
import type { Equipment } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { CareTaskInstance } from "@/types/task";

export type PulseTone = "green" | "amber" | "red";

export type PulseSummary = {
  completedTasks: number;
  criticalIssues: number;
  openIssues: number;
  overdueTasks: number;
  outOfOrderEquipment: number;
  pulseScore: number;
  tone: PulseTone;
};

export function getPulseSummary({
  equipment,
  issues,
  now = new Date(),
  tasks,
}: {
  equipment: Equipment[];
  issues: ManagedIssue[];
  now?: Date;
  tasks: CareTaskInstance[];
}): PulseSummary {
  const openIssues = issues.filter((issue) => isIssueOpen(issue.status));
  const criticalIssues = openIssues.filter((issue) => issue.priority === "critical");
  const outOfOrderEquipment = equipment.filter((item) => item.status === "red");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, now));
  const riskLoad =
    criticalIssues.length * 25 +
    outOfOrderEquipment.length * 18 +
    overdueTasks.length * 12 +
    Math.max(0, openIssues.length - criticalIssues.length) * 6;
  const pulseScore = Math.max(0, Math.min(100, 100 - riskLoad));

  return {
    completedTasks: completedTasks.length,
    criticalIssues: criticalIssues.length,
    openIssues: openIssues.length,
    overdueTasks: overdueTasks.length,
    outOfOrderEquipment: outOfOrderEquipment.length,
    pulseScore,
    tone: pulseScore < 60 ? "red" : pulseScore < 82 ? "amber" : "green",
  };
}

export function isTaskOverdue(task: CareTaskInstance, now = new Date()) {
  if (task.status === "completed" || task.status === "skipped") {
    return false;
  }

  if (task.status === "overdue") {
    return true;
  }

  return Boolean(task.dueAt) && new Date(task.dueAt).getTime() < now.getTime();
}
