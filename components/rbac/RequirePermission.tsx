"use client";

import type { Permission } from "@/lib/rbac/permissions";
import { can } from "@/lib/rbac/can";
import { useAuth } from "@/lib/auth/AuthProvider";

export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!can(user, permission)) {
    return fallback;
  }

  return children;
}
