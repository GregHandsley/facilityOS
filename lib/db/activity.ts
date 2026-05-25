import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import type {
  ActivityFeedItem,
  CreateActivityFeedItemInput,
} from "@/types/activity";

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

export async function getFacilityActivityFeed(facilityId: string, maxItems = 12) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "activityFeedItems"),
      where("facilityId", "==", facilityId),
      limit(maxItems),
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
  const snapshot = await getDocs(
    query(
      collection(firestore, "activityFeedItems"),
      where("facilityId", "==", facilityId),
      where("equipmentId", "==", equipmentId),
      limit(maxItems),
    ),
  );

  return sortActivity(snapshot.docs.map((activityDoc) => activityDoc.data() as ActivityFeedItem));
}

function sortActivity(items: ActivityFeedItem[]) {
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
