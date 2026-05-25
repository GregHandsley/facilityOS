import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequirePermission } from "@/components/rbac/RequirePermission";
import { RequireRole } from "@/components/rbac/RequireRole";
import type { AppUser } from "@/types/auth";

const mockUseAuth = vi.fn();

vi.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

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

describe("RBAC component guards", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it("renders permitted content for staff permissions", () => {
    mockUseAuth.mockReturnValue({ user: staffUser });

    render(
      <RequirePermission permission="view_staff_tasks">
        <p>Staff tasks</p>
      </RequirePermission>,
    );

    expect(screen.getByText("Staff tasks")).toBeInTheDocument();
  });

  it("renders fallback when a staff user lacks a manager permission", () => {
    mockUseAuth.mockReturnValue({ user: staffUser });

    render(
      <RequirePermission permission="manage_users" fallback={<p>No access</p>}>
        <p>User settings</p>
      </RequirePermission>,
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByText("User settings")).not.toBeInTheDocument();
  });

  it("renders manager-only content for manager users", () => {
    mockUseAuth.mockReturnValue({ user: managerUser });

    render(
      <RequireRole role="manager">
        <p>Manager pulse</p>
      </RequireRole>,
    );

    expect(screen.getByText("Manager pulse")).toBeInTheDocument();
  });
});
