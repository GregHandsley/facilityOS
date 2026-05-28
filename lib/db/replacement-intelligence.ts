import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFacilityEquipment, getEquipment } from "@/lib/db/equipment";
import { firestore } from "@/lib/firebase/client";
import { evaluateReplacementIntelligence } from "@/lib/replacement-intelligence/evaluate";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type {
  ReplacementIntelligence,
  ReplacementReviewRecord,
  ReplacementReviewState,
} from "@/types/replacement";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export async function getFacilityReplacementIntelligence(facilityId: string) {
  const [equipment, issues, outOfOrderEvents, spotChecks, tasks, reviewRecords] =
    await Promise.all([
      getFacilityEquipment(facilityId),
      getFacilityCollection<ManagedIssue>("issues", facilityId),
      getFacilityCollection<OutOfOrderEvent>("outOfOrderEvents", facilityId),
      getFacilityCollection<SpotCheck>("spotChecks", facilityId),
      getFacilityCollection<CareTaskInstance>("careTaskInstances", facilityId),
      getFacilityCollection<ReplacementReviewRecord>("replacementReviews", facilityId),
    ]);
  const reviewMap = new Map(reviewRecords.map((review) => [review.equipmentId, review]));

  return equipment
    .map((item) =>
      mergeReplacementReview(
        evaluateReplacementIntelligence({
          equipment: item,
          issues,
          outOfOrderEvents,
          spotChecks,
          tasks,
        }),
        reviewMap.get(item.id),
      ),
    )
    .sort((a, b) => a.healthScore - b.healthScore);
}

export async function getEquipmentReplacementIntelligence(equipmentId: string) {
  const equipment = await getEquipment(equipmentId);

  if (!equipment) {
    return null;
  }

  const [issues, outOfOrderEvents, spotChecks, tasks, reviewRecord] = await Promise.all([
    getFacilityCollection<ManagedIssue>("issues", equipment.facilityId),
    getFacilityCollection<OutOfOrderEvent>("outOfOrderEvents", equipment.facilityId),
    getFacilityCollection<SpotCheck>("spotChecks", equipment.facilityId),
    getFacilityCollection<CareTaskInstance>("careTaskInstances", equipment.facilityId),
    getReplacementReviewRecord(equipment.id),
  ]);

  return mergeReplacementReview(
    evaluateReplacementIntelligence({
      equipment,
      issues,
      outOfOrderEvents,
      spotChecks,
      tasks,
    }),
    reviewRecord,
  );
}

export async function updateReplacementReviewState({
  equipmentId,
  facilityId,
  score,
  state,
  status,
  summary,
  userId,
}: {
  equipmentId: string;
  facilityId: string;
  score: number;
  state: Exclude<ReplacementReviewState, "active">;
  status: ReplacementIntelligence["status"];
  summary: string;
  userId: string;
}) {
  const now = new Date().toISOString();
  const review: ReplacementReviewRecord = {
    acknowledgedAt: state === "acknowledged" ? now : "",
    acknowledgedBy: state === "acknowledged" ? userId : "",
    dismissedAt: state === "dismissed" ? now : "",
    dismissedBy: state === "dismissed" ? userId : "",
    equipmentId,
    facilityId,
    id: equipmentId,
    score,
    state,
    status,
    summary,
    updatedAt: now,
  };

  await setDoc(doc(firestore, "replacementReviews", equipmentId), review);

  return review;
}

function mergeReplacementReview(
  intelligence: ReplacementIntelligence,
  review?: ReplacementReviewRecord | null,
): ReplacementIntelligence {
  if (!review || shouldReactivateReview(intelligence, review)) {
    return intelligence;
  }

  return {
    ...intelligence,
    acknowledgedAt: review.acknowledgedAt,
    acknowledgedBy: review.acknowledgedBy,
    dismissedAt: review.dismissedAt,
    dismissedBy: review.dismissedBy,
    state: review.state,
    updatedAt: review.updatedAt,
  };
}

function shouldReactivateReview(
  intelligence: ReplacementIntelligence,
  review: ReplacementReviewRecord,
) {
  if (intelligence.status === "none") {
    return false;
  }

  if (getStatusRank(intelligence.status) > getStatusRank(review.status)) {
    return true;
  }

  return intelligence.score > review.score;
}

function getStatusRank(status: ReplacementIntelligence["status"]) {
  const ranks: Record<ReplacementIntelligence["status"], number> = {
    high_priority_review: 3,
    none: 0,
    review_recommended: 2,
    watch: 1,
  };

  return ranks[status];
}

async function getReplacementReviewRecord(equipmentId: string) {
  let snapshot;

  try {
    snapshot = await getDoc(doc(firestore, "replacementReviews", equipmentId));
  } catch {
    return null;
  }

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as ReplacementReviewRecord;
}

async function getFacilityCollection<T>(collectionName: string, facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, collectionName), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs.map((record) => record.data() as T);
}
