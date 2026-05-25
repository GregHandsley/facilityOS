export type SpotCheckStatus =
  | "pending"
  | "passed"
  | "failed"
  | "recheck_required"
  | "escalated";

export type SpotCheck = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  taskId: string;
  staffUserId: string;
  status: SpotCheckStatus;
  sampleReason: string;
  managerNote: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SamplingScope = "facility" | "location" | "staff" | "category";

export type SamplingConfidence = "green" | "amber" | "red";

export type SamplingState = {
  id: string;
  facilityId: string;
  scope: SamplingScope;
  scopeId: string;
  confidence: SamplingConfidence;
  sampleRate: number;
  passedChecks: number;
  failedChecks: number;
  totalReviewed: number;
  explanation: string;
  updatedAt: string;
};
