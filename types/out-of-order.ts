export type OutOfOrderSeverity = "low" | "medium" | "high" | "critical";

export type OutOfOrderEvent = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  createdBy: string;
  reason: string;
  severity: OutOfOrderSeverity;
  photoUrl: string;
  unsafe: boolean;
  unavailable: boolean;
  note: string;
  linkedIssueId: string;
  resolvedAt: string;
  returnedToServiceBy: string;
  createdAt: string;
};

export type CreateOutOfOrderInput = {
  createdBy: string;
  equipmentId: string;
  eventId?: string;
  facilityId: string;
  locationId: string;
  publicSlug: string;
  reason: string;
  severity: OutOfOrderSeverity;
  photoUrl?: string;
  unsafe: boolean;
  unavailable: boolean;
  note?: string;
};
