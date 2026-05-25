export type ActivityFeedType =
  | "equipment_created"
  | "task_completed"
  | "fault_reported"
  | "issue_status_changed"
  | "equipment_marked_out_of_order"
  | "equipment_returned_to_service"
  | "spot_check_completed"
  | "ai_insight_created";

export type ActivityActorRole = "public" | "staff" | "manager" | "system";

export type ActivityFeedItem = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  taskId: string;
  issueId: string;
  type: ActivityFeedType;
  title: string;
  meta: string;
  actorId: string;
  actorName: string;
  actorRole: ActivityActorRole;
  managerOnly: boolean;
  createdAt: string;
};

export type CreateActivityFeedItemInput = Omit<ActivityFeedItem, "createdAt" | "id"> & {
  id?: string;
};
