import { isTaskOverdue } from "@/lib/pulse/summary";
import type {
  SamplingConfidence,
  SamplingScope,
  SamplingState,
  SpotCheckStatus,
} from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export const defaultSamplingState: Omit<SamplingState, "facilityId" | "id" | "scope" | "scopeId" | "updatedAt"> = {
  confidence: "green",
  explanation: "No failed spot checks recorded. Default sampling is active.",
  failedChecks: 0,
  passedChecks: 0,
  sampleRate: 0.1,
  totalReviewed: 0,
};

export function getSamplingStateId({
  facilityId,
  scope,
  scopeId,
}: {
  facilityId: string;
  scope: SamplingScope;
  scopeId: string;
}) {
  return `${facilityId}:${scope}:${scopeId || facilityId}`;
}

export function getSamplingScopes(task: CareTaskInstance) {
  return [
    { scope: "facility" as const, scopeId: task.facilityId },
    { scope: "location" as const, scopeId: task.locationId },
    { scope: "staff" as const, scopeId: task.completedBy },
    { scope: "category" as const, scopeId: task.category },
  ];
}

export function getEffectiveSamplingState(states: SamplingState[]) {
  if (states.some((state) => state.confidence === "red")) {
    return states.find((state) => state.confidence === "red") ?? null;
  }

  if (states.some((state) => state.confidence === "amber")) {
    return states.find((state) => state.confidence === "amber") ?? null;
  }

  return states[0] ?? null;
}

export function getSpotCheckSampleReason(
  task: CareTaskInstance,
  now = new Date(),
  state?: SamplingState | null,
) {
  if (task.sourceSpotCheckId) {
    return "Corrective rework requires review";
  }

  if (task.evidenceLevel === "photo_note") {
    return "Level 4 evidence always sampled";
  }

  if (isTaskOverdue(task, now)) {
    return "Overdue completion sampled";
  }

  if (state) {
    return `${state.confidence} confidence: ${state.explanation}`;
  }

  return "Default sample";
}

export function getSamplingRateForTask(
  task: CareTaskInstance,
  now = new Date(),
  state?: SamplingState | null,
) {
  if (task.sourceSpotCheckId) {
    return 1;
  }

  if (task.evidenceLevel === "photo_note") {
    return 1;
  }

  if (isTaskOverdue(task, now)) {
    return Math.max(0.3, state?.sampleRate ?? 0.3);
  }

  return state?.sampleRate ?? 0.1;
}

export function shouldGenerateSpotCheck(
  task: CareTaskInstance,
  now = new Date(),
  state?: SamplingState | null,
) {
  return Math.random() < getSamplingRateForTask(task, now, state);
}

export function getNextSamplingState({
  current,
  reviewedStatus,
}: {
  current: SamplingState;
  reviewedStatus: SpotCheckStatus;
}): SamplingState {
  const failedChecks =
    current.failedChecks + (isNegativeSpotCheckOutcome(reviewedStatus) ? 1 : 0);
  const passedChecks = current.passedChecks + (reviewedStatus === "passed" ? 1 : 0);
  const totalReviewed = current.totalReviewed + 1;
  const failureRate = totalReviewed > 0 ? failedChecks / totalReviewed : 0;
  const confidence = getConfidenceForFailureRate(failureRate, totalReviewed);

  return {
    ...current,
    confidence,
    explanation: getSamplingExplanation(confidence, passedChecks, failedChecks),
    failedChecks,
    passedChecks,
    sampleRate: getSampleRateForConfidence(confidence),
    totalReviewed,
  };
}

export function getSampleRateForConfidence(confidence: SamplingConfidence) {
  if (confidence === "red") {
    return 0.5;
  }

  if (confidence === "amber") {
    return 0.25;
  }

  return 0.08;
}

function getConfidenceForFailureRate(
  failureRate: number,
  totalReviewed: number,
): SamplingConfidence {
  if (totalReviewed >= 1 && failureRate >= 0.34) {
    return "red";
  }

  if (totalReviewed >= 2 && failureRate >= 0.15) {
    return "amber";
  }

  return "green";
}

function getSamplingExplanation(
  confidence: SamplingConfidence,
  passedChecks: number,
  failedChecks: number,
) {
  if (confidence === "red") {
    return `${failedChecks} failed check${failedChecks === 1 ? "" : "s"} recorded. Sampling increased to the red band.`;
  }

  if (confidence === "amber") {
    return `${failedChecks} failed check${failedChecks === 1 ? "" : "s"} recorded. Sampling increased to the amber band.`;
  }

  return `${passedChecks} passed check${passedChecks === 1 ? "" : "s"} and ${failedChecks} failed check${failedChecks === 1 ? "" : "s"}. Green sampling is active.`;
}

function isNegativeSpotCheckOutcome(status: SpotCheckStatus) {
  return status === "failed" || status === "recheck_required" || status === "escalated";
}
