import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { syncEquipmentStatus } from "@/lib/db/equipment-status";
import { firestore, firebaseStorage } from "@/lib/firebase/client";
import { getIssuePriorityForOutOfOrder } from "@/lib/out-of-order/labels";
import type { ManagedIssue } from "@/types/issue";
import type {
  CreateOutOfOrderInput,
  OutOfOrderEvent,
} from "@/types/out-of-order";

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
  await syncEquipmentStatus(input.equipmentId);
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
  const snapshot = await getDocs(
    query(
      collection(firestore, "outOfOrderEvents"),
      where("facilityId", "==", facilityId),
      where("equipmentId", "==", equipmentId),
    ),
  );
  const issueSnapshot = await getDocs(
    query(
      collection(firestore, "issues"),
      where("facilityId", "==", facilityId),
      where("equipmentId", "==", equipmentId),
    ),
  );
  const batch = writeBatch(firestore);
  const linkedIssueIds = snapshot.docs
    .filter((eventDoc) => !String(eventDoc.data().resolvedAt ?? ""))
    .map((eventDoc) => String(eventDoc.data().linkedIssueId ?? ""))
    .filter(Boolean);

  snapshot.docs
    .filter((eventDoc) => !String(eventDoc.data().resolvedAt ?? ""))
    .forEach((eventDoc) => {
      batch.update(eventDoc.ref, {
        resolvedAt: now,
        returnedToServiceBy: "",
      });
    });

  issueSnapshot.docs
    .filter((issueDoc) => {
      const issue = issueDoc.data();
      const status = String(issue.status ?? "");
      const reporterType = String(issue.reporterType ?? "");
      const category = String(issue.category ?? "");

      return (
        status !== "resolved" &&
        status !== "closed" &&
        (linkedIssueIds.includes(issueDoc.id) ||
          (reporterType === "staff" &&
            (category === "safety_concern" || category === "equipment_fault")))
      );
    })
    .forEach((issueDoc) => {
      batch.update(issueDoc.ref, {
        closedAt: now,
        status: "closed",
        updatedAt: now,
      });
    });

  await batch.commit();

  await updateDoc(doc(firestore, "equipment", equipmentId), {
    status: "green",
    updatedAt: now,
  });
  await updateDoc(doc(firestore, "publicEquipment", publicSlug), {
    outOfOrderMessage: "",
    publicStatus: "green",
    publicStatusCopy: "Ready to use",
  });
  const updatedEquipment = await syncEquipmentStatus(equipmentId);
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

  return updatedEquipment;
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
