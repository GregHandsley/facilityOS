import type { Permission } from "@/lib/rbac/permissions";
import type { AppUser } from "@/types/auth";

export type FacilityScopedRecord = {
  facilityId: string;
};

export type ProtectedActionContext = {
  user: AppUser | null | undefined;
  permission: Permission;
  facilityId: string;
};

export type ProtectedQueryContext = {
  user: AppUser | null | undefined;
  facilityId: string;
};
