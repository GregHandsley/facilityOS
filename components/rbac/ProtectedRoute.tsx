"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import type { Permission } from "@/lib/rbac/permissions";
import { can } from "@/lib/rbac/can";
import { getHomeRouteForUser } from "@/lib/auth/redirects";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingCard } from "@/components/shared/LoadingCard";

export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: Permission;
  children: React.ReactNode;
}) {
  const { status, user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, status]);

  useEffect(() => {
    if (status === "authenticated" && user && permission && !can(user, permission)) {
      window.location.replace(getHomeRouteForUser(user));
    }
  }, [permission, status, user]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div>
        <LoadingCard title="Checking access" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (permission && !can(user, permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="This area needs manager access"
        description="FacilityOS protects operational controls at the route and component level. You are being redirected to your workspace."
      />
    );
  }

  return children;
}
