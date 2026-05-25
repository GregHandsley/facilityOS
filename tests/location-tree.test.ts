import { describe, expect, it } from "vitest";
import {
  buildLocationTree,
  getLocationParentOptions,
} from "@/lib/locations/tree";
import type { FacilityLocation } from "@/types/facility";

const locations: FacilityLocation[] = [
  {
    id: "area-2",
    facilityId: "facility-a",
    name: "Weights",
    type: "area",
    parentLocationId: "room-1",
    archived: false,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
  {
    id: "room-1",
    facilityId: "facility-a",
    name: "Gym Floor",
    type: "room",
    archived: false,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
  {
    id: "area-1",
    facilityId: "facility-a",
    name: "Cardio",
    type: "area",
    parentLocationId: "room-1",
    archived: false,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
  {
    id: "archived",
    facilityId: "facility-a",
    name: "Old Studio",
    type: "room",
    archived: true,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  },
];

describe("location tree helpers", () => {
  it("builds an active nested location tree sorted by name", () => {
    expect(buildLocationTree(locations)).toEqual([
      {
        ...locations[1],
        children: [
          { ...locations[2], children: [] },
          { ...locations[0], children: [] },
        ],
      },
    ]);
  });

  it("excludes archived locations from parent options", () => {
    expect(getLocationParentOptions(locations).map((location) => location.name)).toEqual([
      "Cardio",
      "Gym Floor",
      "Weights",
    ]);
  });
});
