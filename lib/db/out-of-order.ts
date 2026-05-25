import { collection, doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { firestore, firebaseStorage } from "@/lib/firebase/client";
import { getPublicStatusCopy } from "@/lib/equipment/public-status";
import { getIssuePriorityForOutOfOrder } from "@/lib/out-of-order/labels";
import type { ManagedIssue } from "@/types/issue";
import type {
  CreateOutOfOrderInput,
  OutOfOrderEvent,
} from "@/types/out-of-order";

const outOfOrderMessage =
  "This equipment is currently out of use. The issue has been logged and the team has been notified.";

export async function createOutOfOrderEvent(input: CreateOutOfOrderInput) {
  if (!input.reason.trim()) {
    throw new Error("Add a reason before marking this equipment out of order.");
  }

  const now = new Date().toISOString();
  const eventRef = input.eventId
    ? doc(firestore, "outOfOrderEvents", input.eventId)
    : doc(collection(firestore, "outOfOrderEvents"));
  const issueRef = doc(collection(firestore, "issues"));
  const issue: ManagedIssue = {
    id: issueRef.id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    equipmentId: input.equipmentId,
    publicSlug: input.publicSlug,
    category: input.unsafe ? "safety_concern" : "equipment_fault",
    description: input.reason.trim(),
    photoUrl: input.photoUrl?.trim() ?? "",
    contactEmail: "",
    reporterType: "staff",
    status: "new",
    priority: getIssuePriorityForOutOfOrder(input.severity),
    createdAt: now,
    internalNotes: input.note?.trim() ?? "",
  };
  const event: OutOfOrderEvent = {
    id: eventRef.id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    equipmentId: input.equipmentId,
    createdBy: input.createdBy,
    reason: input.reason.trim(),
    severity: input.severity,
    photoUrl: input.photoUrl?.trim() ?? "",
    unsafe: input.unsafe,
    unavailable: input.unavailable,
    note: input.note?.trim() ?? "",
    linkedIssueId: issue.id,
    resolvedAt: "",
    returnedToServiceBy: "",
    createdAt: now,
  };

  await setDoc(eventRef, event);
  await setDoc(issueRef, issue);
  await updateDoc(doc(firestore, "equipment", input.equipmentId), {
    status: "red",
    updatedAt: now,
  });
  await updateDoc(doc(firestore, "publicEquipment", input.publicSlug), {
    hasActivePublicFault: true,
    outOfOrderMessage,
    publicStatus: "red",
    publicStatusCopy: getPublicStatusCopy("red"),
  });
  await tryCreateActivityFeedItem({
    actorId: input.createdBy,
    actorName: "Staff member",
    actorRole: "staff",
    equipmentId: input.equipmentId,
    facilityId: input.facilityId,
    issueId: issue.id,
    locationId: input.locationId,
    managerOnly: false,
    meta: input.severity,
    taskId: "",
    title: "Equipment marked out of order",
    type: "equipment_marked_out_of_order",
  });

  return { event, issue };
}

export async function returnEquipmentToService({
  facilityId,
  equipmentId,
  locationId,
  publicSlug,
}: {
  facilityId: string;
  equipmentId: string;
  locationId: string;
  publicSlug: string;
}) {
  const now = new Date().toISOString();

  await updateDoc(doc(firestore, "equipment", equipmentId), {
    status: "green",
    updatedAt: now,
  });
  await updateDoc(doc(firestore, "publicEquipment", publicSlug), {
    outOfOrderMessage: "",
    publicStatus: "green",
    publicStatusCopy: getPublicStatusCopy("green"),
  });
  await tryCreateActivityFeedItem({
    actorId: "",
    actorName: "Manager",
    actorRole: "manager",
    equipmentId,
    facilityId,
    issueId: "",
    locationId,
    managerOnly: false,
    meta: "Returned to service",
    taskId: "",
    title: "Equipment returned to service",
    type: "equipment_returned_to_service",
  });
}

export async function uploadOutOfOrderPhoto({
  facilityId,
  file,
  eventId,
}: {
  facilityId: string;
  file: File;
  eventId: string;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const imageRef = ref(
    firebaseStorage,
    `facilities/${facilityId}/out-of-order/${eventId}/photo-${Date.now()}.${extension}`,
  );

  await uploadBytes(imageRef, file, { contentType: file.type });

  return imageRef.fullPath;
}

export function createOutOfOrderEventId() {
  return doc(collection(firestore, "outOfOrderEvents")).id;
}
