"use client";

import type { UserRole } from "@/types/auth";
import { useAuth } from "@/lib/auth/AuthProvider";

export function RequireRole({
  role,
  children,
  fallback = null,
}: {
  role: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user } = useAuth();
  const roles = Array.isArray(role) ? role : [role];

  if (!user || !roles.includes(user.role)) {
    return fallback;
  }

  return children;
}
