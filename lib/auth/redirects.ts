import type { AppUser } from "@/types/auth";

export function getHomeRouteForUser(user: Pick<AppUser, "role">) {
  return user.role === "manager" ? "/app/pulse" : "/app/today";
}
