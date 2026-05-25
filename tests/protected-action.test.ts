import { describe, expect, it } from "vitest";
import { filterToUserFacility } from "@/lib/db/facility-scope";
import { createProtectedAction } from "@/lib/rbac/protected-action";
import { AuthorizationError } from "@/lib/rbac/guards";
import type { AppUser } from "@/types/auth";

const staffUser: AppUser = {
  id: "staff-1",
  name: "Staff User",
  email: "staff@example.com",
  role: "staff",
  facilityId: "facility-a",
  createdAt: "2026-05-24T00:00:00.000Z",
};

const managerUser: AppUser = {
  ...staffUser,
  id: "manager-1",
  role: "manager",
};

describe("protected actions", () => {
  it("allows permitted actions inside the user's facility", async () => {
    const action = createProtectedAction({
      permission: "manage_locations",
      getFacilityId: (input: { facilityId: string }) => input.facilityId,
      handler: ({ user }) => user.role,
    });

    await expect(action({ facilityId: "facility-a" }, managerUser)).resolves.toBe(
      "manager",
    );
  });

  it("rejects staff users attempting manager actions", async () => {
    const action = createProtectedAction({
      permission: "manage_locations",
      getFacilityId: (input: { facilityId: string }) => input.facilityId,
      handler: () => "created",
    });

    await expect(action({ facilityId: "facility-a" }, staffUser)).rejects.toThrow(
      AuthorizationError,
    );
  });

  it("rejects cross-facility manager actions", async () => {
    const action = createProtectedAction({
      permission: "manage_locations",
      getFacilityId: (input: { facilityId: string }) => input.facilityId,
      handler: () => "created",
    });

    await expect(action({ facilityId: "facility-b" }, managerUser)).rejects.toThrow(
      AuthorizationError,
    );
  });
});

describe("facility scoped data helpers", () => {
  it("filters records to the current user's facility", () => {
    expect(
      filterToUserFacility(staffUser, [
        { id: "a", facilityId: "facility-a" },
        { id: "b", facilityId: "facility-b" },
      ]),
    ).toEqual([{ id: "a", facilityId: "facility-a" }]);
  });

  it("returns no records without a user", () => {
    expect(filterToUserFacility(null, [{ id: "a", facilityId: "facility-a" }])).toEqual(
      [],
    );
  });
});
