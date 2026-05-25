import type { AppUser } from "@/types/auth";
import type { Permission } from "@/lib/rbac/permissions";
import { can, canAccessFacility } from "@/lib/rbac/can";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertAuthenticated(user: AppUser | null | undefined): asserts user is AppUser {
  if (!user) {
    throw new AuthorizationError("You must be signed in to access this area.");
  }
}

export function assertPermission(
  user: AppUser | null | undefined,
  permission: Permission,
): asserts user is AppUser {
  assertAuthenticated(user);

  if (!can(user, permission)) {
    throw new AuthorizationError();
  }
}

export function assertFacilityAccess(
  user: AppUser | null | undefined,
  facilityId: string,
): asserts user is AppUser {
  assertAuthenticated(user);

  if (!canAccessFacility(user, facilityId)) {
    throw new AuthorizationError("You cannot access another facility's data.");
  }
}

export function assertActionAllowed(
  user: AppUser | null | undefined,
  permission: Permission,
  facilityId: string,
): asserts user is AppUser {
  assertPermission(user, permission);
  assertFacilityAccess(user, facilityId);
}
