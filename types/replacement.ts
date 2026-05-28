export type ReplacementReviewStatus =
  | "none"
  | "watch"
  | "review_recommended"
  | "high_priority_review";

export type ReplacementReviewState = "active" | "acknowledged" | "dismissed";

export type ReplacementSignalDetail = {
  href?: string;
  id: string;
  label: string;
  meta: string;
};

export type ReplacementSignal = {
  details: ReplacementSignalDetail[];
  label: string;
  points: number;
  severity: "low" | "medium" | "high";
};

export type ReplacementIntelligence = {
  equipmentId: string;
  facilityId: string;
  healthScore: number;
  lastRecoveryAt?: string;
  recoveryWindowDays: number;
  status: ReplacementReviewStatus;
  state: ReplacementReviewState;
  score: number;
  summary: string;
  signals: ReplacementSignal[];
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dismissedAt?: string;
  dismissedBy?: string;
  updatedAt?: string;
};

export type ReplacementReviewRecord = {
  id: string;
  equipmentId: string;
  facilityId: string;
  state: ReplacementReviewState;
  status: ReplacementReviewStatus;
  score: number;
  summary: string;
  acknowledgedAt: string;
  acknowledgedBy: string;
  dismissedAt: string;
  dismissedBy: string;
  updatedAt: string;
};
