import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { syncEquipmentStatus } from "@/lib/db/equipment-status";
import { getSamplingStatesForTask, updateSamplingStatesForSpotCheck } from "@/lib/db/sampling";
import { firestore } from "@/lib/firebase/client";
import {
  getEffectiveSamplingState,
  getSpotCheckSampleReason,
} from "@/lib/spot-checks/sampling";
import type { SamplingState, SpotCheck, SpotCheckStatus } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export async function createSpotCheckForTask(
  task: CareTaskInstance,
  effectiveSamplingState?: SamplingState | null,
) {
  const now = new Date().toISOString();
  const spotCheckRef = doc(collection(firestore, "spotChecks"));
  const sampleState =
    effectiveSamplingState === undefined
      ? getEffectiveSamplingState(await getSamplingStatesForTask(task))
      : effectiveSamplingState;
  const spotCheck: SpotCheck = {
    id: spotCheckRef.id,
    facilityId: task.facilityId,
    locationId: task.locationId,
    equipmentId: task.equipmentId,
    taskId: task.id,
    staffUserId: task.completedBy,
    status: "pending",
    sampleReason: getSpotCheckSampleReason(task, new Date(), sampleState),
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
  const trimmedManagerNote = managerNote.trim();
  const updates = {
    managerNote: trimmedManagerNote,
    reviewedAt: now,
    reviewedBy,
    status,
    updatedAt: now,
  };
  const batch = writeBatch(firestore);
  const spotCheckRef = doc(firestore, "spotChecks", spotCheck.id);
  const correctiveTask = await buildCorrectiveTaskIfNeeded({
    managerNote: trimmedManagerNote,
    now,
    spotCheck,
    status,
    task,
  });

  batch.update(spotCheckRef, updates);

  if (correctiveTask) {
    batch.set(doc(firestore, "careTaskInstances", correctiveTask.id), correctiveTask);
  }

  await batch.commit();

  try {
    await updateSamplingStatesForSpotCheck({
      reviewedStatus: status,
      spotCheck,
      task,
    });
  } catch {
    // Sampling confidence is adaptive context. A review outcome should still save if this update fails.
  }

  try {
    await syncEquipmentStatus(spotCheck.equipmentId);
  } catch {
    // Status sync should not make the saved review appear to fail.
  }

  await tryCreateActivityFeedItem({
    actorId: reviewedBy,
    actorName: "Manager",
    actorRole: "manager",
    equipmentId: spotCheck.equipmentId,
    facilityId: spotCheck.facilityId,
    issueId: "",
    locationId: spotCheck.locationId,
    managerOnly: true,
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

async function buildCorrectiveTaskIfNeeded({
  managerNote,
  now,
  spotCheck,
  status,
  task,
}: {
  managerNote: string;
  now: string;
  spotCheck: SpotCheck;
  status: SpotCheckStatus;
  task: CareTaskInstance;
}) {
  if (status !== "failed" && status !== "recheck_required") {
    return null;
  }

  const existingCorrectiveTasks = await getDocs(
    query(
      collection(firestore, "careTaskInstances"),
      where("facilityId", "==", spotCheck.facilityId),
      where("sourceSpotCheckId", "==", spotCheck.id),
    ),
  );
  const hasOpenCorrectiveTask = existingCorrectiveTasks.docs.some((taskDoc) => {
    const taskData = taskDoc.data() as CareTaskInstance;

    return taskData.status !== "completed";
  });

  if (hasOpenCorrectiveTask) {
    return null;
  }

  const correctiveTaskRef = doc(collection(firestore, "careTaskInstances"));
  const reworkReason =
    status === "failed" ? "Manager failed the spot check." : "Manager requested a recheck.";

  return {
    assignedTo: spotCheck.staffUserId,
    category: task.category,
    checklistCompleted: [],
    checklistItems: task.checklistItems ?? [],
    completedAt: "",
    completedBy: "",
    createdAt: now,
    description: managerNote || reworkReason,
    dueAt: now,
    equipmentId: spotCheck.equipmentId,
    evidence: "",
    evidenceLevel: task.evidenceLevel,
    facilityId: spotCheck.facilityId,
    id: correctiveTaskRef.id,
    locationId: spotCheck.locationId,
    note: "",
    originalTaskId: task.id,
    photoUrl: "",
    qrConfirmation: "",
    scheduleId: "",
    sourceSpotCheckId: spotCheck.id,
    status: "pending",
    title: `Rework: ${task.title || "spot check follow-up"}`,
    updatedAt: now,
  } satisfies CareTaskInstance;
}
