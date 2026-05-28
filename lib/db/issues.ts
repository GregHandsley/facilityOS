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
import { syncEquipmentStatus } from "@/lib/db/equipment-status";
import { firestore, firebaseStorage } from "@/lib/firebase/client";
import {
  createPublicIssueReport,
  validatePublicIssueReport,
} from "@/lib/issues/public-report";
import type {
  AiIssueAnalysis,
  IssueCategory,
  IssuePriority,
  IssueStatus,
  ManagedIssue,
  PublicIssueReportInput,
} from "@/types/issue";

export async function createPublicFaultReport(input: PublicIssueReportInput) {
  const validationError = validatePublicIssueReport(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const issueRef = doc(collection(firestore, "issues"));
  const issue = createPublicIssueReport(issueRef.id, input);

  await setDoc(issueRef, issue);
  await markPublicEquipmentFaultActive(input.publicSlug);
  await syncEquipmentStatus(input.equipmentId);
  await tryCreateActivityFeedItem({
    actorId: "",
    actorName: "Public user",
    actorRole: "public",
    equipmentId: input.equipmentId,
    facilityId: input.facilityId,
    issueId: issue.id,
    locationId: input.locationId,
    managerOnly: false,
    meta: issue.category.replaceAll("_", " "),
    taskId: "",
    title: "New public fault reported",
    type: "fault_reported",
  });

  return issue;
}

export function createPublicIssueId() {
  return doc(collection(firestore, "issues")).id;
}

export async function createPublicFaultReportWithId({
  id,
  input,
}: {
  id: string;
  input: PublicIssueReportInput;
}) {
  const validationError = validatePublicIssueReport(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const issue = createPublicIssueReport(id, input);

  await setDoc(doc(firestore, "issues", id), issue);
  await markPublicEquipmentFaultActive(input.publicSlug);
  await syncEquipmentStatus(input.equipmentId);
  await tryCreateActivityFeedItem({
    actorId: "",
    actorName: "Public user",
    actorRole: "public",
    equipmentId: input.equipmentId,
    facilityId: input.facilityId,
    issueId: issue.id,
    locationId: input.locationId,
    managerOnly: false,
    meta: issue.category.replaceAll("_", " "),
    taskId: "",
    title: "New public fault reported",
    type: "fault_reported",
  });

  return issue;
}

export async function uploadPublicFaultPhoto({
  facilityId,
  file,
  issueId,
}: {
  facilityId: string;
  file: File;
  issueId: string;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const imageRef = ref(
    firebaseStorage,
    `public-reports/${facilityId}/issues/${issueId}/photo-${Date.now()}.${extension}`,
  );

  await uploadBytes(imageRef, file, { contentType: file.type });

  return imageRef.fullPath;
}

export async function getFacilityIssues(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "issues"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((issueDoc) => issueDoc.data() as ManagedIssue)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getIssue(issueId: string) {
  const snapshot = await getDoc(doc(firestore, "issues", issueId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as ManagedIssue;
}

export async function updateIssueManagement(input: {
  category: IssueCategory;
  issue: ManagedIssue;
  internalNotes: string;
  priority: IssuePriority;
  status: IssueStatus;
}) {
  const now = new Date().toISOString();
  const updates = {
    category: input.category,
    internalNotes: input.internalNotes.trim(),
    priority: input.priority,
    status: input.status,
    updatedAt: now,
    ...(input.status === "resolved" ? { resolvedAt: now } : {}),
    ...(input.status === "closed" ? { closedAt: now } : {}),
  };

  await updateDoc(doc(firestore, "issues", input.issue.id), updates);

  await syncEquipmentStatus(input.issue.equipmentId);
  await tryCreateActivityFeedItem({
    actorId: "",
    actorName: "Manager",
    actorRole: "manager",
    equipmentId: input.issue.equipmentId,
    facilityId: input.issue.facilityId,
    issueId: input.issue.id,
    locationId: input.issue.locationId,
    managerOnly: false,
    meta: `${input.issue.status} to ${input.status}`,
    taskId: "",
    title: "Issue status changed",
    type: "issue_status_changed",
  });

  return {
    ...input.issue,
    ...updates,
  };
}

export async function updateIssueAiAnalysis(input: {
  analysis?: AiIssueAnalysis;
  error?: string;
  issue: ManagedIssue;
}) {
  const now = new Date().toISOString();
  const updates = input.analysis
    ? {
        aiAnalysis: input.analysis,
        aiAnalyzedAt: now,
        aiError: "",
        category: input.analysis.category,
        priority: input.analysis.priority,
        updatedAt: now,
      }
      : {
        aiAnalyzedAt: now,
        aiError: input.error?.trim() || "Assistant review could not be generated.",
        updatedAt: now,
      };

  await updateDoc(doc(firestore, "issues", input.issue.id), updates);
  await syncEquipmentStatus(input.issue.equipmentId);

  return {
    ...input.issue,
    ...updates,
  };
}

export async function getIssuePhotoDownloadUrl(photoPath: string) {
  if (!photoPath) {
    return "";
  }

  return getDownloadURL(ref(firebaseStorage, photoPath));
}

async function markPublicEquipmentFaultActive(publicSlug: string) {
  try {
    await updateDoc(doc(firestore, "publicEquipment", publicSlug), {
      hasActivePublicFault: true,
      publicStatus: "amber",
      publicStatusCopy: "Use with awareness",
    });
  } catch {
    await updateDoc(doc(firestore, "publicEquipment", publicSlug), {
      hasActivePublicFault: true,
    });
  }
}
