import type {
  CareTaskCategory,
  CareTaskFrequency,
  CareTaskStatus,
} from "@/types/task";

export const taskCategoryOptions: Array<{
  label: string;
  value: CareTaskCategory;
}> = [
  { label: "Cleaning", value: "cleaning" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Inspection", value: "inspection" },
  { label: "Compliance", value: "compliance" },
  { label: "Safety", value: "safety" },
];

export const taskFrequencyOptions: Array<{
  label: string;
  value: CareTaskFrequency;
}> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "One-off", value: "one_off" },
];

export const taskStatusLabels: Record<CareTaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
  skipped: "Skipped",
};

export const taskCategoryLabels = Object.fromEntries(
  taskCategoryOptions.map((category) => [category.value, category.label]),
) as Record<CareTaskCategory, string>;

export const taskFrequencyLabels = Object.fromEntries(
  taskFrequencyOptions.map((frequency) => [frequency.value, frequency.label]),
) as Record<CareTaskFrequency, string>;

export function getTaskStatusTone(status: CareTaskStatus) {
  if (status === "completed") {
    return "green";
  }

  if (status === "overdue" || status === "skipped") {
    return "red";
  }

  return "amber";
}

export function formatTaskDueLabel(dueAt: string) {
  if (!dueAt) {
    return "No due date";
  }

  return new Date(dueAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
