import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { getSamplingStatesForTask } from "@/lib/db/sampling";
import { createSpotCheckForTask } from "@/lib/db/spot-checks";
import { firestore, firebaseStorage } from "@/lib/firebase/client";
import {
  getEffectiveSamplingState,
  shouldGenerateSpotCheck,
} from "@/lib/spot-checks/sampling";
import { getEvidenceValidationError } from "@/lib/tasks/evidence";
import type {
  CareTaskInstance,
  CareTaskSchedule,
  CreateCareScheduleInput,
} from "@/types/task";

export async function getFacilityTaskInstances(facilityId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "careTaskInstances"),
      where("facilityId", "==", facilityId),
    ),
  );

  return snapshot.docs
    .map((taskDoc) => normalizeTask(taskDoc.data() as CareTaskInstance))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function getStaffVisibleTaskInstances(facilityId: string, staffUserId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "careTaskInstances"),
      where("facilityId", "==", facilityId),
      where("assignedTo", "in", ["", staffUserId]),
    ),
  );

  return snapshot.docs
    .map((taskDoc) => normalizeTask(taskDoc.data() as CareTaskInstance))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export async function getFacilityCareSchedules(facilityId: string) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "careTaskSchedules"),
      where("facilityId", "==", facilityId),
    ),
  );

  return snapshot.docs
    .map((scheduleDoc) => normalizeSchedule(scheduleDoc.data() as CareTaskSchedule))
    .filter((schedule) => schedule.active)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getTaskInstance(taskId: string) {
  const snapshot = await getDoc(doc(firestore, "careTaskInstances", taskId));

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeTask(snapshot.data() as CareTaskInstance);
}

export async function createCareTaskSchedule(input: CreateCareScheduleInput) {
  const now = new Date().toISOString();
  const scheduleRef = doc(collection(firestore, "careTaskSchedules"));
  const taskRef = doc(collection(firestore, "careTaskInstances"));
  const dueAt = new Date(`${input.dueDate}T${input.dueTime || "09:00"}`).toISOString();

  const schedule: CareTaskSchedule = {
    id: scheduleRef.id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    equipmentId: input.equipmentId,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    evidenceLevel: input.evidenceLevel,
    checklistItems: input.checklistItems,
    frequency: input.frequency,
    dueTime: input.dueTime || "09:00",
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  const task: CareTaskInstance = {
    id: taskRef.id,
    scheduleId: schedule.id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    equipmentId: input.equipmentId,
    title: schedule.title,
    description: schedule.description,
    category: schedule.category,
    evidenceLevel: schedule.evidenceLevel,
    checklistItems: schedule.checklistItems,
    checklistCompleted: [],
    assignedTo: "",
    qrConfirmation: "",
    photoUrl: "",
    status: "pending",
    dueAt,
    completedAt: "",
    completedBy: "",
    evidence: "",
    note: "",
    originalTaskId: "",
    sourceSpotCheckId: "",
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(scheduleRef, schedule);
  await setDoc(taskRef, task);

  return { schedule, task };
}

export async function updateTaskStatus({
  checklistCompleted,
  completedBy,
  evidence,
  note,
  photoUrl,
  publicSlug,
  qrConfirmation,
  status,
  task,
}: {
  checklistCompleted?: string[];
  completedBy: string;
  evidence?: string;
  note?: string;
  photoUrl?: string;
  publicSlug: string;
  qrConfirmation?: string;
  status: CareTaskInstance["status"];
  task: CareTaskInstance;
}) {
  const now = new Date().toISOString();
  const nextTask = {
    ...task,
    checklistCompleted: checklistCompleted ?? task.checklistCompleted,
    evidence: evidence?.trim() ?? task.evidence,
    note: note?.trim() ?? task.note,
    photoUrl: photoUrl?.trim() ?? task.photoUrl,
    qrConfirmation: qrConfirmation?.trim() ?? task.qrConfirmation,
  };
  const evidenceValidationError =
    status === "completed"
      ? getEvidenceValidationError({ publicSlug, task: nextTask })
      : null;

  if (evidenceValidationError) {
    throw new Error(evidenceValidationError);
  }

  const updates = {
    status,
    completedAt: status === "completed" ? now : task.completedAt,
    completedBy: status === "completed" ? completedBy : task.completedBy,
    checklistCompleted: nextTask.checklistCompleted,
    evidence: nextTask.evidence,
    note: nextTask.note,
    photoUrl: nextTask.photoUrl,
    qrConfirmation: nextTask.qrConfirmation,
    updatedAt: now,
  };

  await updateDoc(doc(firestore, "careTaskInstances", task.id), updates);

  if (status === "completed") {
    const completedTask = {
      ...task,
      ...updates,
    };

    try {
      await updateEquipmentCareSummary(task, now);
    } catch {
      // Public care summaries are helpful context, but should not block task completion.
    }

    await tryCreateActivityFeedItem({
      actorId: completedBy,
      actorName: "Staff member",
      actorRole: "staff",
      equipmentId: task.equipmentId,
      facilityId: task.facilityId,
      issueId: "",
      locationId: task.locationId,
      managerOnly: Boolean(task.sourceSpotCheckId),
      meta: task.category,
      taskId: task.id,
      title: `${task.title} completed`,
      type: "task_completed",
    });

    let effectiveSamplingState: ReturnType<typeof getEffectiveSamplingState> = null;

    try {
      effectiveSamplingState = getEffectiveSamplingState(
        await getSamplingStatesForTask(completedTask),
      );
    } catch {
      // Staff can complete tasks without access to manager-controlled adaptive sampling state.
    }

    if (shouldGenerateSpotCheck(completedTask, new Date(), effectiveSamplingState)) {
      try {
        await createSpotCheckForTask(completedTask, effectiveSamplingState);
      } catch {
        // Spot checks are an assurance layer. Task completion must not fail if sampling cannot be written.
      }
    }
  }

  return {
    ...task,
    ...updates,
  };
}

export async function uploadTaskEvidencePhoto({
  facilityId,
  file,
  taskId,
}: {
  facilityId: string;
  file: File;
  taskId: string;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const imageRef = ref(
    firebaseStorage,
    `facilities/${facilityId}/task-evidence/${taskId}/photo-${Date.now()}.${extension}`,
  );

  await uploadBytes(imageRef, file, { contentType: file.type });

  return imageRef.fullPath;
}

export async function getTaskEvidencePhotoDownloadUrl(photoPath: string) {
  if (!photoPath) {
    return "";
  }

  return getDownloadURL(ref(firebaseStorage, photoPath));
}

async function updateEquipmentCareSummary(task: CareTaskInstance, completedAt: string) {
  const label = new Date(completedAt).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const publicEquipmentUpdates =
    task.category === "cleaning"
      ? { lastCleanedAt: label }
      : task.category === "maintenance"
        ? { lastMaintainedAt: label }
        : task.category === "inspection"
          ? { lastInspectedAt: label }
          : null;

  if (!publicEquipmentUpdates) {
    return;
  }

  const equipmentSnapshot = await getDoc(doc(firestore, "equipment", task.equipmentId));

  if (!equipmentSnapshot.exists()) {
    return;
  }

  const publicSlug = String(equipmentSnapshot.data().publicSlug ?? "");

  if (!publicSlug) {
    return;
  }

  await updateDoc(doc(firestore, "publicEquipment", publicSlug), publicEquipmentUpdates);
}

function normalizeSchedule(schedule: CareTaskSchedule): CareTaskSchedule {
  return {
    ...schedule,
    checklistItems: schedule.checklistItems ?? [],
    evidenceLevel: schedule.evidenceLevel ?? "quick",
  };
}

function normalizeTask(task: CareTaskInstance): CareTaskInstance {
  return {
    ...task,
    assignedTo: task.assignedTo ?? "",
    checklistCompleted: task.checklistCompleted ?? [],
    checklistItems: task.checklistItems ?? [],
    evidenceLevel: task.evidenceLevel ?? "quick",
    originalTaskId: task.originalTaskId ?? "",
    photoUrl: task.photoUrl ?? "",
    qrConfirmation: task.qrConfirmation ?? "",
    sourceSpotCheckId: task.sourceSpotCheckId ?? "",
  };
}
