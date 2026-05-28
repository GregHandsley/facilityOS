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
import { tryCreateActivityFeedItem } from "@/lib/db/activity";
import { firestore } from "@/lib/firebase/client";
import { getPublicStatusCopy } from "@/lib/equipment/public-status";
import { createEquipmentSlug } from "@/lib/equipment/slug";
import type {
  CreateEquipmentInput,
  Equipment,
  PublicEquipmentSummary,
  PublicEquipmentStatus,
  UpdateEquipmentInput,
} from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";

const activeIssueStatuses = ["new", "acknowledged", "assigned", "in_progress", "waiting"];

export async function getFacilityEquipment(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "equipment"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((equipmentDoc) => equipmentDoc.data() as Equipment)
    .filter((equipment) => !equipment.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFacilityEquipmentWithDerivedStatus(facilityId: string) {
  const [equipment, issues] = await Promise.all([
    getFacilityEquipment(facilityId),
    getActiveFacilityEquipmentIssues(facilityId),
  ]);
  const publicSummaries = await Promise.all(
    equipment.map((item) => getPublicEquipmentSummary(item.publicSlug)),
  );

  const activeIssueEquipmentIds = new Set(issues.map((issue) => issue.equipmentId));
  const activePublicFaultEquipmentIds = new Set(
    publicSummaries
      .filter((summary): summary is PublicEquipmentSummary => Boolean(summary))
      .filter(
        (summary) =>
          summary.publicStatus === "red" ||
          summary.publicStatus === "amber" ||
          summary.hasActivePublicFault,
      )
      .map((summary) => summary.equipmentId),
  );

  return equipment.map((item) => {
    if (
      item.status !== "green" ||
      (!activeIssueEquipmentIds.has(item.id) &&
        !activePublicFaultEquipmentIds.has(item.id))
    ) {
      return item;
    }

    return {
      ...item,
      status: "amber" as const,
    };
  });
}

export async function getEquipment(equipmentId: string) {
  const snapshot = await getDoc(doc(firestore, "equipment", equipmentId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Equipment;
}

export async function getEquipmentWithDerivedStatus(equipmentId: string) {
  const equipment = await getEquipment(equipmentId);

  if (!equipment || equipment.status !== "green") {
    return equipment;
  }

  const [issues, publicSummary] = await Promise.all([
    getActiveEquipmentIssues(equipment),
    getPublicEquipmentSummary(equipment.publicSlug),
  ]);

  const hasPublicFault =
    publicSummary?.publicStatus === "red" ||
    publicSummary?.publicStatus === "amber" ||
    publicSummary?.hasActivePublicFault;

  if (issues.length === 0 && !hasPublicFault) {
    return equipment;
  }

  return {
    ...equipment,
    status: publicSummary?.publicStatus === "red" ? ("red" as const) : ("amber" as const),
  };
}

export async function getPublicEquipmentBySlug(
  publicSlug: string,
): Promise<PublicEquipmentStatus | null> {
  const snapshot = await getDoc(doc(firestore, "publicEquipment", publicSlug));

  if (!snapshot.exists()) {
    return null;
  }

  const equipment = snapshot.data() as PublicEquipmentSummary;

  if (!equipment.publicVisible || equipment.archived) {
    return null;
  }

  const publicStatus =
    equipment.publicStatus === "green" && equipment.hasActivePublicFault
      ? "amber"
      : equipment.publicStatus;

  return {
    equipmentId: equipment.equipmentId,
    facilityId: equipment.facilityId,
    locationId: equipment.locationId,
    publicSlug: equipment.publicSlug,
    name: equipment.publicName,
    imageUrl: equipment.publicImageUrl,
    locationName: equipment.publicLocationName || "Facility area",
    manufacturer: equipment.publicManufacturer,
    model: equipment.publicModel,
    status: publicStatus,
    statusCopy:
      publicStatus === equipment.publicStatus
        ? equipment.publicStatusCopy
        : getPublicStatusCopy(publicStatus),
    lastCleanedLabel: equipment.lastCleanedAt || "Cleaning history coming soon",
    lastMaintainedLabel: equipment.lastMaintainedAt || "Maintenance history coming soon",
    lastInspectedLabel: equipment.lastInspectedAt || "Inspection history coming soon",
    hasActiveFault: equipment.hasActivePublicFault,
    isOutOfOrder: publicStatus === "red",
  };
}

export async function createEquipment(input: CreateEquipmentInput) {
  const now = new Date().toISOString();
  const equipmentRef = doc(collection(firestore, "equipment"));
  const publicSlug = createEquipmentSlug({
    equipmentNumber: input.equipmentNumber,
    id: equipmentRef.id,
    name: input.name,
  });

  const equipment: Equipment = {
    id: equipmentRef.id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    name: input.name.trim(),
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    equipmentType: input.equipmentType.trim(),
    equipmentNumber: input.equipmentNumber.trim(),
    description: input.description.trim(),
    imageUrl: input.imageUrl.trim(),
    publicSlug,
    publicVisible: input.publicVisible,
    status: "green",
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(equipmentRef, equipment);
  await upsertPublicEquipmentSummary(equipment);
  await tryCreateActivityFeedItem({
    actorId: "",
    actorName: "Manager",
    actorRole: "manager",
    equipmentId: equipment.id,
    facilityId: equipment.facilityId,
    issueId: "",
    locationId: equipment.locationId,
    managerOnly: false,
    meta: equipment.equipmentType || "Equipment profile",
    taskId: "",
    title: `${equipment.name} was added`,
    type: "equipment_created",
  });

  return equipment;
}

export async function archiveEquipment(equipmentId: string) {
  const equipment = await getEquipment(equipmentId);

  await updateDoc(doc(firestore, "equipment", equipmentId), {
    archived: true,
    updatedAt: new Date().toISOString(),
  });

  if (equipment) {
    await setDoc(
      doc(firestore, "publicEquipment", equipment.publicSlug),
      {
        archived: true,
      },
      { merge: true },
    );
  }
}

export async function updateEquipment(input: UpdateEquipmentInput) {
  const updates = {
    facilityId: input.facilityId,
    locationId: input.locationId,
    name: input.name.trim(),
    manufacturer: input.manufacturer.trim(),
    model: input.model.trim(),
    equipmentType: input.equipmentType.trim(),
    equipmentNumber: input.equipmentNumber.trim(),
    description: input.description.trim(),
    imageUrl: input.imageUrl.trim(),
    publicVisible: input.publicVisible,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(doc(firestore, "equipment", input.id), updates);

  const existingEquipment = await getEquipment(input.id);

  if (existingEquipment) {
    await upsertPublicEquipmentSummary({
      ...existingEquipment,
      ...updates,
    });
  }

  return updates;
}

async function upsertPublicEquipmentSummary(equipment: Equipment) {
  const locationName = await getLocationName(equipment.locationId);
  const publicStatusCopy = getPublicStatusCopy(equipment.status);
  const summary: PublicEquipmentSummary = {
    id: equipment.publicSlug,
    facilityId: equipment.facilityId,
    locationId: equipment.locationId,
    equipmentId: equipment.id,
    publicSlug: equipment.publicSlug,
    publicVisible: equipment.publicVisible,
    publicName: equipment.name,
    publicImageUrl: equipment.imageUrl,
    publicLocationName: locationName,
    publicStatus: equipment.status,
    publicStatusCopy,
    publicManufacturer: equipment.manufacturer,
    publicModel: equipment.model,
    showLastCleaned: true,
    showLastMaintained: true,
    showLastInspected: true,
    lastCleanedAt: "",
    lastMaintainedAt: "",
    lastInspectedAt: "",
    hasActivePublicFault: false,
    outOfOrderMessage:
      equipment.status === "red"
        ? "This equipment is currently out of use. The issue has been logged and the team has been notified."
        : "",
    archived: equipment.archived,
  };

  await setDoc(doc(firestore, "publicEquipment", equipment.publicSlug), summary);
}

async function getLocationName(locationId: string) {
  if (!locationId) {
    return "";
  }

  const snapshot = await getDoc(doc(firestore, "locations", locationId));

  if (!snapshot.exists()) {
    return "";
  }

  return String(snapshot.data().name ?? "");
}

async function getActiveFacilityEquipmentIssues(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "issues"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((issueDoc) => issueDoc.data() as ManagedIssue)
    .filter((issue) => activeIssueStatuses.includes(issue.status));
}

async function getPublicEquipmentSummary(publicSlug: string) {
  if (!publicSlug) {
    return null;
  }

  const snapshot = await getDoc(doc(firestore, "publicEquipment", publicSlug));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as PublicEquipmentSummary;
}

async function getActiveEquipmentIssues(equipment: Equipment) {
  const snapshot = await getDocs(
    query(
      collection(firestore, "issues"),
      where("facilityId", "==", equipment.facilityId),
      where("equipmentId", "==", equipment.id),
    ),
  );

  return snapshot.docs
    .map((issueDoc) => issueDoc.data() as ManagedIssue)
    .filter((issue) => activeIssueStatuses.includes(issue.status));
}
