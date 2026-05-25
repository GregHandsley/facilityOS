"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { getHomeRouteForUser } from "@/lib/auth/redirects";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AuthRedirect() {
  const { status, user } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    const next = searchParams.get("next");
    window.location.replace(
      next && next.startsWith("/app") ? next : getHomeRouteForUser(user),
    );
  }, [searchParams, status, user]);

  return null;
}
