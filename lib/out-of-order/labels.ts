import type { OutOfOrderSeverity } from "@/types/out-of-order";

export const outOfOrderSeverityOptions: Array<{
  label: string;
  value: OutOfOrderSeverity;
}> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

export const outOfOrderSeverityLabels = Object.fromEntries(
  outOfOrderSeverityOptions.map((severity) => [severity.value, severity.label]),
) as Record<OutOfOrderSeverity, string>;

export function getIssuePriorityForOutOfOrder(severity: OutOfOrderSeverity) {
  if (severity === "critical") {
    return "critical";
  }

  if (severity === "high") {
    return "high";
  }

  return "medium";
}
