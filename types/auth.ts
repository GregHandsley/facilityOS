export type UserRole = "staff" | "manager";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facilityId: string;
  createdAt: string;
  lastLoginAt?: string;
};
