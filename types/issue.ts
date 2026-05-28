export type IssueCategory =
  | "equipment_fault"
  | "cleaning_issue"
  | "safety_concern"
  | "stock_issue"
  | "building_issue"
  | "other";

export type IssueStatus =
  | "new"
  | "acknowledged"
  | "assigned"
  | "in_progress"
  | "waiting"
  | "resolved"
  | "closed";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type ReporterType = "public" | "staff" | "manager";

export type AiIssueAnalysis = {
  affectedComponent: string;
  category: IssueCategory;
  duplicateOrRepeat: boolean;
  isSafetyRelated: boolean;
  priority: IssuePriority;
  recommendedAction: string;
  summary: string;
};

export type PublicIssueReport = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  publicSlug: string;
  category: IssueCategory;
  description: string;
  photoUrl: string;
  contactEmail: string;
  reporterType: "public";
  status: "new";
  priority: "medium";
  createdAt: string;
};

export type ManagedIssue = Omit<
  PublicIssueReport,
  "reporterType" | "status" | "priority"
> & {
  reporterType: ReporterType;
  status: IssueStatus;
  priority: IssuePriority;
  aiAnalysis?: AiIssueAnalysis;
  aiAnalyzedAt?: string;
  aiError?: string;
  assignedTo?: string;
  internalNotes?: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
};

export type PublicIssueReportInput = {
  facilityId: string;
  locationId: string;
  equipmentId: string;
  publicSlug: string;
  category: IssueCategory;
  description: string;
  photoUrl?: string;
  contactEmail?: string;
};
