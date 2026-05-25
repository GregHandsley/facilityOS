import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { getSamplingStatesForTask, updateSamplingStatesForSpotCheck } from "@/lib/db/sampling";
import { firestore } from "@/lib/firebase/client";
import {
  getEffectiveSamplingState,
  getSpotCheckSampleReason,
} from "@/lib/spot-checks/sampling";
import type { SpotCheck, SpotCheckStatus } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export async function createSpotCheckForTask(task: CareTaskInstance) {
  const now = new Date().toISOString();
  const spotCheckRef = doc(collection(firestore, "spotChecks"));
  const samplingStates = await getSamplingStatesForTask(task);
  const effectiveSamplingState = getEffectiveSamplingState(samplingStates);
  const spotCheck: SpotCheck = {
    id: spotCheckRef.id,
    facilityId: task.facilityId,
    locationId: task.locationId,
    equipmentId: task.equipmentId,
    taskId: task.id,
    staffUserId: task.completedBy,
    status: "pending",
    sampleReason: getSpotCheckSampleReason(task, new Date(), effectiveSamplingState),
    managerNote: "",
    reviewedBy: "",
    reviewedAt: "",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(spotCheckRef, spotCheck);

  return spotCheck;
}

export async function getFacilitySpotChecks(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "spotChecks"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((spotCheckDoc) => spotCheckDoc.data() as SpotCheck)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateSpotCheckReview({
  managerNote,
  reviewedBy,
  spotCheck,
  status,
  task,
}: {
  managerNote: string;
  reviewedBy: string;
  spotCheck: SpotCheck;
  status: SpotCheckStatus;
  task: CareTaskInstance;
}) {
  const now = new Date().toISOString();
  const updates = {
    managerNote: managerNote.trim(),
    reviewedAt: now,
    reviewedBy,
    status,
    updatedAt: now,
  };

  await updateDoc(doc(firestore, "spotChecks", spotCheck.id), updates);
  await updateSamplingStatesForSpotCheck({
    reviewedStatus: status,
    spotCheck,
    task,
  });

  await tryCreateActivityFeedItem({
    actorId: reviewedBy,
    actorName: "Manager",
    actorRole: "manager",
    equipmentId: spotCheck.equipmentId,
    facilityId: spotCheck.facilityId,
    issueId: "",
    locationId: spotCheck.locationId,
    managerOnly: false,
    meta: status.replaceAll("_", " "),
    taskId: spotCheck.taskId,
    title: "Spot check completed",
    type: "spot_check_completed",
  });

  return {
    ...spotCheck,
    ...updates,
  };
}
