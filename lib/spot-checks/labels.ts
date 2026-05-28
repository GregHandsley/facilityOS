import type { SpotCheckStatus } from "@/types/spot-check";

export const spotCheckStatusOptions: Array<{
  label: string;
  value: SpotCheckStatus;
}> = [
  { label: "Pending", value: "pending" },
  { label: "Passed", value: "passed" },
  { label: "Failed", value: "failed" },
  { label: "Recheck required", value: "recheck_required" },
  { label: "Escalated", value: "escalated" },
];

export const spotCheckStatusLabels = Object.fromEntries(
  spotCheckStatusOptions.map((status) => [status.value, status.label]),
) as Record<SpotCheckStatus, string>;

export function getSpotCheckTone(status: SpotCheckStatus) {
  if (status === "passed") {
    return "green";
  }

  if (status === "failed" || status === "escalated") {
    return "red";
  }

  return "amber";
}

export function isSpotCheckOpen(status: SpotCheckStatus) {
  return status === "pending" || status === "failed" || status === "recheck_required";
}
