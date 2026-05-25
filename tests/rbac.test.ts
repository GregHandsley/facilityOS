import { describe, expect, it } from "vitest";
import { getHomeRouteForUser } from "@/lib/auth/redirects";
import { can, canAccessFacility, roleCan } from "@/lib/rbac/can";
import {
  assertActionAllowed,
  assertFacilityAccess,
  assertPermission,
  AuthorizationError,
} from "@/lib/rbac/guards";
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
  id: "manager-1",
  name: "Manager User",
  email: "manager@example.com",
  role: "manager",
  facilityId: "facility-a",
  createdAt: "2026-05-24T00:00:00.000Z",
};

describe("RBAC permission checks", () => {
  it("allows public users to read public QR pages and report faults only", () => {
    expect(can(null, "view_public_equipment")).toBe(true);
    expect(can(null, "report_fault")).toBe(true);
    expect(can(null, "view_staff_tasks")).toBe(false);
    expect(can(null, "view_manager_pulse")).toBe(false);
  });

  it("allows staff users to complete operational work but not manager actions", () => {
    expect(roleCan("staff", "view_staff_tasks")).toBe(true);
    expect(roleCan("staff", "complete_task")).toBe(true);
    expect(roleCan("staff", "mark_out_of_order")).toBe(true);
    expect(roleCan("staff", "view_manager_pulse")).toBe(false);
    expect(roleCan("staff", "manage_users")).toBe(false);
    expect(roleCan("staff", "return_to_service")).toBe(false);
  });

  it("allows manager users to access manager-only permissions", () => {
    expect(roleCan("manager", "view_manager_pulse")).toBe(true);
    expect(roleCan("manager", "manage_users")).toBe(true);
    expect(roleCan("manager", "return_to_service")).toBe(true);
    expect(roleCan("manager", "view_replacement_intelligence")).toBe(true);
  });
});

describe("facility access checks", () => {
  it("allows users to access their own facility only", () => {
    expect(canAccessFacility(staffUser, "facility-a")).toBe(true);
    expect(canAccessFacility(staffUser, "facility-b")).toBe(false);
  });

  it("rejects cross-facility action attempts", () => {
    expect(() =>
      assertActionAllowed(managerUser, "manage_equipment", "facility-b"),
    ).toThrow(AuthorizationError);
  });

  it("allows permitted manager actions inside the assigned facility", () => {
    expect(() =>
      assertActionAllowed(managerUser, "manage_equipment", "facility-a"),
    ).not.toThrow();
  });
});

describe("guard helpers", () => {
  it("rejects unauthenticated protected actions", () => {
    expect(() => assertPermission(null, "view_staff_tasks")).toThrow(
      AuthorizationError,
    );
  });

  it("rejects staff users attempting manager permissions", () => {
    expect(() => assertPermission(staffUser, "manage_users")).toThrow(
      AuthorizationError,
    );
  });

  it("rejects access to a different facility", () => {
    expect(() => assertFacilityAccess(staffUser, "facility-b")).toThrow(
      AuthorizationError,
    );
  });
});

describe("role redirects", () => {
  it("sends staff to the Today workspace", () => {
    expect(getHomeRouteForUser(staffUser)).toBe("/app/today");
  });

  it("sends managers to the Pulse workspace", () => {
    expect(getHomeRouteForUser(managerUser)).toBe("/app/pulse");
  });
});
