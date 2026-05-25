export type EquipmentStatus = "green" | "amber" | "red";

export type Equipment = {
  id: string;
  facilityId: string;
  locationId: string;
  name: string;
  manufacturer: string;
  model: string;
  equipmentType: string;
  equipmentNumber: string;
  description: string;
  imageUrl: string;
  publicSlug: string;
  publicVisible: boolean;
  status: EquipmentStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicEquipmentStatus = {
  equipmentId: string;
  facilityId: string;
  locationId: string;
  publicSlug: string;
  name: string;
  imageUrl: string;
  locationName: string;
  manufacturer: string;
  model: string;
  status: EquipmentStatus;
  statusCopy: string;
  lastCleanedLabel: string;
  lastMaintainedLabel: string;
  lastInspectedLabel: string;
  hasActiveFault: boolean;
  isOutOfOrder: boolean;
};

export type PublicEquipmentSummary = {
  id: string;
  facilityId: string;
  locationId: string;
  equipmentId: string;
  publicSlug: string;
  publicVisible: boolean;
  publicName: string;
  publicImageUrl: string;
  publicLocationName: string;
  publicStatus: EquipmentStatus;
  publicStatusCopy: string;
  publicManufacturer: string;
  publicModel: string;
  showLastCleaned: boolean;
  showLastMaintained: boolean;
  showLastInspected: boolean;
  lastCleanedAt: string;
  lastMaintainedAt: string;
  lastInspectedAt: string;
  hasActivePublicFault: boolean;
  outOfOrderMessage: string;
  archived: boolean;
};

export type CreateEquipmentInput = {
  facilityId: string;
  locationId: string;
  name: string;
  manufacturer: string;
  model: string;
  equipmentType: string;
  equipmentNumber: string;
  description: string;
  imageUrl: string;
  publicVisible: boolean;
};

export type UpdateEquipmentInput = CreateEquipmentInput & {
  id: string;
};
