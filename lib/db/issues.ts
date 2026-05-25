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
import { firestore, firebaseStorage } from "@/lib/firebase/client";
import {
  createPublicIssueReport,
  validatePublicIssueReport,
} from "@/lib/issues/public-report";
import type {
  IssuePriority,
  IssueStatus,
  ManagedIssue,
  PublicIssueReportInput,
} from "@/types/issue";

const activeIssueStatuses: IssueStatus[] = [
  "new",
  "acknowledged",
  "assigned",
  "in_progress",
  "waiting",
];

export async function createPublicFaultReport(input: PublicIssueReportInput) {
  const validationError = validatePublicIssueReport(input);

  if (validationError) {
    throw new Error(validationError);
  }

  const issueRef = doc(collection(firestore, "issues"));
  const issue = createPublicIssueReport(issueRef.id, input);

  await setDoc(issueRef, issue);
  await updateDoc(doc(firestore, "publicEquipment", input.publicSlug), {
    hasActivePublicFault: true,
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
  await updateDoc(doc(firestore, "publicEquipment", input.publicSlug), {
    hasActivePublicFault: true,
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
  issue: ManagedIssue;
  internalNotes: string;
  priority: IssuePriority;
  status: IssueStatus;
}) {
  const now = new Date().toISOString();
  const updates = {
    internalNotes: input.internalNotes.trim(),
    priority: input.priority,
    status: input.status,
    updatedAt: now,
    ...(input.status === "resolved" ? { resolvedAt: now } : {}),
    ...(input.status === "closed" ? { closedAt: now } : {}),
  };

  await updateDoc(doc(firestore, "issues", input.issue.id), updates);

  if (input.status === "resolved" || input.status === "closed") {
    await syncPublicFaultState({
      equipmentId: input.issue.equipmentId,
      facilityId: input.issue.facilityId,
      publicSlug: input.issue.publicSlug,
    });
  } else {
    await updateDoc(doc(firestore, "publicEquipment", input.issue.publicSlug), {
      hasActivePublicFault: true,
    });
  }

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

async function syncPublicFaultState({
  equipmentId,
  facilityId,
  publicSlug,
}: {
  equipmentId: string;
  facilityId: string;
  publicSlug: string;
}) {
  const facilityIssues = await getFacilityIssues(facilityId);
  const hasActivePublicFault = facilityIssues.some(
    (issue) =>
      issue.equipmentId === equipmentId &&
      issue.publicSlug === publicSlug &&
      activeIssueStatuses.includes(issue.status),
  );

  await updateDoc(doc(firestore, "publicEquipment", publicSlug), {
    hasActivePublicFault,
  });
}
