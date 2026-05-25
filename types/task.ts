export type CareTaskCategory =
  | "cleaning"
  | "maintenance"
  | "inspection"
  | "compliance"
  | "safety";

export type CareTaskFrequency = "daily" | "weekly" | "monthly" | "one_off";

export type EvidenceLevel = "quick" | "checklist" | "qr" | "photo_note";

export type CareTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "overdue"
  | "skipped";

export type CareTaskSchedule = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  title: string;
  description: string;
  category: CareTaskCategory;
  evidenceLevel: EvidenceLevel;
  checklistItems: string[];
  frequency: CareTaskFrequency;
  dueTime: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CareTaskInstance = {
  id: string;
  scheduleId: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  title: string;
  description: string;
  category: CareTaskCategory;
  evidenceLevel: EvidenceLevel;
  checklistItems: string[];
  checklistCompleted: string[];
  qrConfirmation: string;
  photoUrl: string;
  status: CareTaskStatus;
  dueAt: string;
  completedAt: string;
  completedBy: string;
  evidence: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCareScheduleInput = {
  facilityId: string;
  locationId: string;
  equipmentId: string;
  title: string;
  description: string;
  category: CareTaskCategory;
  evidenceLevel: EvidenceLevel;
  checklistItems: string[];
  frequency: CareTaskFrequency;
  dueDate: string;
  dueTime: string;
};
