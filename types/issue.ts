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
