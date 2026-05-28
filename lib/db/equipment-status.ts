import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import {
  calculateEquipmentStatus,
  getPrimaryEquipmentStatusReason,
} from "@/lib/status/equipmentStatus";
import type { Equipment, PublicEquipmentSummary } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

const outOfOrderMessage =
  "This equipment is currently out of use. The issue has been logged and the team has been notified.";

export async function getEquipmentStatusReview(
  equipment: Equipment,
  options: { includePublicMirror?: boolean } = {},
) {
  const includePublicMirror = options.includePublicMirror ?? true;
  const [issues, outOfOrderEvents, publicEquipment, spotChecks, tasks] = await Promise.all([
    getEquipmentIssues(equipment),
    getEquipmentOutOfOrderEvents(equipment),
    includePublicMirror ? getPublicEquipmentSummary(equipment) : Promise.resolve(null),
    getEquipmentSpotChecks(equipment),
    getEquipmentTasks(equipment),
  ]);

  return calculateEquipmentStatus({
    equipment,
    issues,
    outOfOrderEvents,
    publicEquipment,
    spotChecks,
    tasks,
  });
}

export async function syncEquipmentStatus(equipmentId: string) {
  const equipmentSnapshot = await getDoc(doc(firestore, "equipment", equipmentId));

  if (!equipmentSnapshot.exists()) {
    return null;
  }

  const equipment = equipmentSnapshot.data() as Equipment;
  const review = await getEquipmentStatusReview(equipment, {
    includePublicMirror: false,
  });
  const now = new Date().toISOString();
  const equipmentUpdatedAt = equipment.status === review.status ? equipment.updatedAt : now;

  if (equipment.status !== review.status) {
    await updateDoc(doc(firestore, "equipment", equipment.id), {
      status: review.status,
      updatedAt: now,
    });
  }

  if (equipment.publicSlug) {
    const publicSnapshot = await getDoc(doc(firestore, "publicEquipment", equipment.publicSlug));
    const publicEquipment = publicSnapshot.exists()
      ? (publicSnapshot.data() as PublicEquipmentSummary)
      : null;
    const hasActivePublicFault = review.reasons.some(
      (reason) =>
        reason.message.includes("issue") ||
        reason.message.includes("out of order") ||
        reason.message.includes("Out of order"),
    );
    const outOfOrderStatusMessage = review.status === "red" ? outOfOrderMessage : "";
    const publicNeedsSync =
      publicEquipment &&
      (publicEquipment.hasActivePublicFault !== hasActivePublicFault ||
        publicEquipment.outOfOrderMessage !== outOfOrderStatusMessage ||
        publicEquipment.publicStatus !== review.status ||
        publicEquipment.publicStatusCopy !== review.statusCopy);

    if (!publicEquipment || publicNeedsSync) {
      await updateDoc(doc(firestore, "publicEquipment", equipment.publicSlug), {
        hasActivePublicFault,
        outOfOrderMessage: outOfOrderStatusMessage,
        publicStatus: review.status,
        publicStatusCopy: review.statusCopy,
        ...(publicEquipment?.publicVisible === false ? { publicVisible: false } : {}),
      });
    }
  }

  return {
    ...equipment,
    status: review.status,
    statusReason: getPrimaryEquipmentStatusReason(review),
    updatedAt: equipmentUpdatedAt,
  };
}

async function getEquipmentIssues(equipment: Equipment) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "issues"),
      where("facilityId", "==", equipment.facilityId),
      where("equipmentId", "==", equipment.id),
    ),
  );

  return snapshot.docs.map((issueDoc) => issueDoc.data() as ManagedIssue);
}

async function getPublicEquipmentSummary(equipment: Equipment) {
  if (!equipment.publicSlug) {
    return null;
  }

  const snapshot = await getDoc(doc(firestore, "publicEquipment", equipment.publicSlug));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as PublicEquipmentSummary;
}

async function getEquipmentOutOfOrderEvents(equipment: Equipment) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "outOfOrderEvents"),
      where("facilityId", "==", equipment.facilityId),
      where("equipmentId", "==", equipment.id),
    ),
  );

  return snapshot.docs.map((eventDoc) => eventDoc.data() as OutOfOrderEvent);
}

async function getEquipmentSpotChecks(equipment: Equipment) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "spotChecks"),
      where("facilityId", "==", equipment.facilityId),
      where("equipmentId", "==", equipment.id),
    ),
  );

  return snapshot.docs.map((spotCheckDoc) => spotCheckDoc.data() as SpotCheck);
}

async function getEquipmentTasks(equipment: Equipment) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "careTaskInstances"),
      where("facilityId", "==", equipment.facilityId),
      where("equipmentId", "==", equipment.id),
    ),
  );

  return snapshot.docs.map((taskDoc) => taskDoc.data() as CareTaskInstance);
}
