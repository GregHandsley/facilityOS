import type { IssueCategory, IssuePriority, IssueStatus } from "@/types/issue";

export const issueStatusOptions: Array<{ label: string; value: IssueStatus }> = [
  { label: "New", value: "new" },
  { label: "Acknowledged", value: "acknowledged" },
  { label: "Assigned", value: "assigned" },
  { label: "In progress", value: "in_progress" },
  { label: "Waiting", value: "waiting" },
  { label: "Resolved", value: "resolved" },
  { label: "Closed", value: "closed" },
];

export const issuePriorityOptions: Array<{ label: string; value: IssuePriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export const issueCategoryLabels: Record<IssueCategory, string> = {
  equipment_fault: "Equipment fault",
  cleaning_issue: "Cleaning issue",
  safety_concern: "Safety concern",
  stock_issue: "Stock issue",
  building_issue: "Building issue",
  other: "Other",
};

export const issueStatusLabels = Object.fromEntries(
  issueStatusOptions.map((status) => [status.value, status.label]),
) as Record<IssueStatus, string>;

export const issuePriorityLabels = Object.fromEntries(
  issuePriorityOptions.map((priority) => [priority.value, priority.label]),
) as Record<IssuePriority, string>;

export function isIssueOpen(status: IssueStatus) {
  return status !== "resolved" && status !== "closed";
}

export function getIssueTone(status: IssueStatus, priority: IssuePriority) {
  if (status === "resolved" || status === "closed") {
    return "green";
  }

  if (priority === "critical" || priority === "high") {
    return "red";
  }

  return "amber";
}
