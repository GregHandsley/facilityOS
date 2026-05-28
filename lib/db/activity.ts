import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  type QueryConstraint,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import type {
  ActivityFeedItem,
  CreateActivityFeedItemInput,
} from "@/types/activity";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export async function createActivityFeedItem(input: CreateActivityFeedItemInput) {
  const now = new Date().toISOString();
  const activityRef = input.id
    ? doc(firestore, "activityFeedItems", input.id)
    : doc(collection(firestore, "activityFeedItems"));
  const activity: ActivityFeedItem = {
    ...input,
    id: activityRef.id,
    createdAt: now,
  };

  await setDoc(activityRef, activity);

  return activity;
}

export async function tryCreateActivityFeedItem(input: CreateActivityFeedItemInput) {
  try {
    return await createActivityFeedItem(input);
  } catch {
    return null;
  }
}

export async function getFacilityActivityFeed(
  facilityId: string,
  maxItems = 12,
  { includeManagerOnly = true }: { includeManagerOnly?: boolean } = {},
) {
  const constraints: QueryConstraint[] = [
    where("facilityId", "==", facilityId),
    limit(maxItems),
  ];

  if (!includeManagerOnly) {
    constraints.splice(1, 0, where("managerOnly", "==", false));
  }

  const snapshot = await getDocs(
    query(
      collection(firestore, "activityFeedItems"),
      ...constraints,
    ),
  );

  return sortActivity(snapshot.docs.map((activityDoc) => activityDoc.data() as ActivityFeedItem));
}

export async function getEquipmentActivityFeed({
  equipmentId,
  facilityId,
  maxItems = 8,
}: {
  equipmentId: string;
  facilityId: string;
  maxItems?: number;
}) {
  const storedActivity = await getStoredEquipmentActivityFeed({
    equipmentId,
    facilityId,
    maxItems,
  });
  const sourceActivity = await getSourceEquipmentActivityFeed({
    equipmentId,
    facilityId,
  });

  return sortActivity(mergeActivityItems(storedActivity, sourceActivity)).slice(0, maxItems);
}

function sortActivity(items: ActivityFeedItem[]) {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getStoredEquipmentActivityFeed({
  equipmentId,
  facilityId,
  maxItems,
}: {
  equipmentId: string;
  facilityId: string;
  maxItems: number;
}) {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, "activityFeedItems"),
        where("facilityId", "==", facilityId),
        where("equipmentId", "==", equipmentId),
        limit(maxItems),
      ),
    );

    return snapshot.docs.map((activityDoc) => activityDoc.data() as ActivityFeedItem);
  } catch {
    return [];
  }
}

async function getSourceEquipmentActivityFeed({
  equipmentId,
  facilityId,
}: {
  equipmentId: string;
  facilityId: string;
}) {
  const [issues, outOfOrderEvents, taskInstances, spotChecks] = await Promise.all([
    readEquipmentRecords<ManagedIssue>("issues", facilityId, equipmentId),
    readEquipmentRecords<OutOfOrderEvent>("outOfOrderEvents", facilityId, equipmentId),
    readEquipmentRecords<CareTaskInstance>("careTaskInstances", facilityId, equipmentId),
    readEquipmentRecords<SpotCheck>("spotChecks", facilityId, equipmentId),
  ]);

  return [
    ...issues.flatMap(issueToActivityItems),
    ...outOfOrderEvents.flatMap(outOfOrderEventToActivityItems),
    ...taskInstances.flatMap(taskInstanceToActivityItems),
    ...spotChecks.flatMap(spotCheckToActivityItems),
  ];
}

async function readEquipmentRecords<T>(
  collectionName: string,
  facilityId: string,
  equipmentId: string,
) {
  try {
    const snapshot = await getDocs(
      query(
        collection(firestore, collectionName),
        where("facilityId", "==", facilityId),
        where("equipmentId", "==", equipmentId),
      ),
    );

    return snapshot.docs.map((recordDoc) => recordDoc.data() as T);
  } catch {
    return [];
  }
}

function issueToActivityItems(issue: ManagedIssue): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [
    {
      actorId: "",
      actorName:
        issue.reporterType === "public"
          ? "Public user"
          : issue.reporterType === "staff"
            ? "Staff member"
            : "Manager",
      actorRole: issue.reporterType,
      createdAt: issue.createdAt,
      equipmentId: issue.equipmentId,
      facilityId: issue.facilityId,
      id: `issue-${issue.id}-reported`,
      issueId: issue.id,
      locationId: issue.locationId,
      managerOnly: false,
      meta: issue.category.replaceAll("_", " "),
      taskId: "",
      title:
        issue.reporterType === "public"
          ? "New public fault reported"
          : "Internal fault reported",
      type: "fault_reported",
    },
  ];

  if (issue.updatedAt && issue.status !== "new") {
    items.push({
      actorId: "",
      actorName: "Manager",
      actorRole: "manager",
      createdAt: issue.updatedAt,
      equipmentId: issue.equipmentId,
      facilityId: issue.facilityId,
      id: `issue-${issue.id}-${issue.status}`,
      issueId: issue.id,
      locationId: issue.locationId,
      managerOnly: false,
      meta: issue.status.replaceAll("_", " "),
      taskId: "",
      title: "Issue status changed",
      type: "issue_status_changed",
    });
  }

  return items;
}

function outOfOrderEventToActivityItems(event: OutOfOrderEvent): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [
    {
      actorId: event.createdBy,
      actorName: "Staff member",
      actorRole: "staff",
      createdAt: event.createdAt,
      equipmentId: event.equipmentId,
      facilityId: event.facilityId,
      id: `out-of-order-${event.id}`,
      issueId: event.linkedIssueId,
      locationId: event.locationId,
      managerOnly: false,
      meta: event.severity,
      taskId: "",
      title: "Equipment marked out of order",
      type: "equipment_marked_out_of_order",
    },
  ];

  if (event.resolvedAt) {
    items.push({
      actorId: event.returnedToServiceBy,
      actorName: "Manager",
      actorRole: "manager",
      createdAt: event.resolvedAt,
      equipmentId: event.equipmentId,
      facilityId: event.facilityId,
      id: `out-of-order-${event.id}-returned`,
      issueId: event.linkedIssueId,
      locationId: event.locationId,
      managerOnly: false,
      meta: "Returned to service",
      taskId: "",
      title: "Equipment returned to service",
      type: "equipment_returned_to_service",
    });
  }

  return items;
}

function taskInstanceToActivityItems(task: CareTaskInstance): ActivityFeedItem[] {
  if (task.status !== "completed" || !task.completedAt) {
    return [];
  }

  return [
    {
      actorId: task.completedBy,
      actorName: "Staff member",
      actorRole: "staff",
      createdAt: task.completedAt,
      equipmentId: task.equipmentId,
      facilityId: task.facilityId,
      id: `task-${task.id}-completed`,
      issueId: "",
      locationId: task.locationId,
      managerOnly: Boolean(task.sourceSpotCheckId),
      meta: task.category,
      taskId: task.id,
      title: `${task.title} completed`,
      type: "task_completed",
    },
  ];
}

function spotCheckToActivityItems(spotCheck: SpotCheck): ActivityFeedItem[] {
  if (spotCheck.status === "pending") {
    return [];
  }

  return [
    {
      actorId: spotCheck.reviewedBy,
      actorName: "Manager",
      actorRole: "manager",
      createdAt: spotCheck.reviewedAt || spotCheck.updatedAt || spotCheck.createdAt,
      equipmentId: spotCheck.equipmentId,
      facilityId: spotCheck.facilityId,
      id: `spot-check-${spotCheck.id}-${spotCheck.status}`,
      issueId: "",
      locationId: spotCheck.locationId,
      managerOnly: true,
      meta: spotCheck.status.replaceAll("_", " "),
      taskId: spotCheck.taskId,
      title: "Spot check completed",
      type: "spot_check_completed",
    },
  ];
}

function mergeActivityItems(
  storedActivity: ActivityFeedItem[],
  sourceActivity: ActivityFeedItem[],
) {
  const itemsByKey = new Map<string, ActivityFeedItem>();

  [...sourceActivity, ...storedActivity].forEach((item) => {
    itemsByKey.set(getActivityKey(item), item);
  });

  return Array.from(itemsByKey.values());
}

function getActivityKey(item: ActivityFeedItem) {
  if (item.issueId) {
    return `${item.type}:issue:${item.issueId}:${item.title}`;
  }

  if (item.taskId) {
    return `${item.type}:task:${item.taskId}:${item.title}`;
  }

  return `${item.type}:${item.equipmentId}:${item.createdAt}:${item.title}`;
}
