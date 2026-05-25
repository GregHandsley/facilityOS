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

export async function getFacilityEquipment(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "equipment"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((equipmentDoc) => equipmentDoc.data() as Equipment)
    .filter((equipment) => !equipment.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getEquipment(equipmentId: string) {
  const snapshot = await getDoc(doc(firestore, "equipment", equipmentId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Equipment;
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
    status: equipment.publicStatus,
    statusCopy: equipment.publicStatusCopy,
    lastCleanedLabel: equipment.lastCleanedAt || "Cleaning history coming soon",
    lastMaintainedLabel: equipment.lastMaintainedAt || "Maintenance history coming soon",
    lastInspectedLabel: equipment.lastInspectedAt || "Inspection history coming soon",
    hasActiveFault: equipment.hasActivePublicFault,
    isOutOfOrder: equipment.publicStatus === "red",
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
