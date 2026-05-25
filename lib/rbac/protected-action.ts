import type { Permission } from "@/lib/rbac/permissions";
import { assertActionAllowed } from "@/lib/rbac/guards";
import type { AppUser } from "@/types/auth";

export type ProtectedActionHandler<TInput, TResult> = (args: {
  input: TInput;
  user: AppUser;
}) => Promise<TResult> | TResult;

export function createProtectedAction<TInput, TResult>({
  permission,
  getFacilityId,
  handler,
}: {
  permission: Permission;
  getFacilityId: (input: TInput) => string;
  handler: ProtectedActionHandler<TInput, TResult>;
}) {
  return async (input: TInput, user: AppUser | null | undefined) => {
    const facilityId = getFacilityId(input);

    assertActionAllowed(user, permission, facilityId);

    return handler({ input, user });
  };
}
