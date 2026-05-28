import { describe, expect, it } from "vitest";
import { getPublicStatusCopy } from "@/lib/equipment/public-status";
import type { PublicEquipmentSummary } from "@/types/equipment";

describe("public equipment status copy", () => {
  it("maps traffic light statuses to public-safe copy", () => {
    expect(getPublicStatusCopy("green")).toBe("Ready to use");
    expect(getPublicStatusCopy("amber")).toBe("Use with awareness");
    expect(getPublicStatusCopy("red")).toBe("Out of order");
  });
});

export const staleActiveFaultSummary = {
  id: "treadmill-01",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  publicSlug: "treadmill-01",
  publicVisible: true,
  publicName: "Treadmill 01",
  publicImageUrl: "",
  publicLocationName: "Cardio",
  publicStatus: "green",
  publicStatusCopy: "Ready to use",
  publicManufacturer: "Technogym",
  publicModel: "Skill Run",
  showLastCleaned: true,
  showLastMaintained: true,
  showLastInspected: true,
  lastCleanedAt: "",
  lastMaintainedAt: "",
  lastInspectedAt: "",
  hasActivePublicFault: true,
  outOfOrderMessage: "",
  archived: false,
} satisfies PublicEquipmentSummary;
