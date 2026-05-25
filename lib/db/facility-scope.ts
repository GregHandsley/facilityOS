import type { QueryConstraint } from "firebase/firestore";
import { where } from "firebase/firestore";
import { assertFacilityAccess } from "@/lib/rbac/guards";
import type { ProtectedQueryContext } from "@/types/security";

export function assertScopedQuery({ user, facilityId }: ProtectedQueryContext) {
  assertFacilityAccess(user, facilityId);
}

export function facilityScopeConstraint({
  user,
  facilityId,
}: ProtectedQueryContext): QueryConstraint {
  assertScopedQuery({ user, facilityId });

  return where("facilityId", "==", facilityId);
}

export function filterToUserFacility<T extends { facilityId: string }>(
  user: ProtectedQueryContext["user"],
  records: T[],
) {
  if (!user) {
    return [];
  }

  return records.filter((record) => record.facilityId === user.facilityId);
}
