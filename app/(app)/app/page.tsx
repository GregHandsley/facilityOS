"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getHomeRouteForUser } from "@/lib/auth/redirects";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LoadingCard } from "@/components/shared/LoadingCard";

export default function AppIndexPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(getHomeRouteForUser(user));
    }
  }, [router, status, user]);

  return <LoadingCard title="Opening your workspace" />;
}
