import type { AppUser, UserRole } from "@/types/auth";
import type { Permission } from "@/lib/rbac/permissions";
import { rolePermissions } from "@/lib/rbac/permissions";

export function roleCan(role: UserRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function can(user: Pick<AppUser, "role"> | null | undefined, permission: Permission) {
  if (!user) {
    return permission === "view_public_equipment" || permission === "report_fault";
  }

  return roleCan(user.role, permission);
}

export function canAccessFacility(
  user: Pick<AppUser, "facilityId"> | null | undefined,
  facilityId: string,
) {
  return Boolean(user?.facilityId && user.facilityId === facilityId);
}
