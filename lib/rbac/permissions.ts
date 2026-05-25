import type { UserRole } from "@/types/auth";

export type Permission =
  | "view_public_equipment"
  | "report_fault"
  | "view_staff_tasks"
  | "complete_task"
  | "mark_out_of_order"
  | "return_to_service"
  | "view_manager_pulse"
  | "manage_equipment"
  | "manage_locations"
  | "manage_users"
  | "manage_care_plans"
  | "manage_issues"
  | "review_spot_checks"
  | "view_ai_insights"
  | "view_replacement_intelligence"
  | "manage_public_visibility";

export const rolePermissions: Record<UserRole, Permission[]> = {
  staff: [
    "view_public_equipment",
    "report_fault",
    "view_staff_tasks",
    "complete_task",
    "mark_out_of_order",
  ],
  manager: [
    "view_public_equipment",
    "report_fault",
    "view_staff_tasks",
    "complete_task",
    "mark_out_of_order",
    "return_to_service",
    "view_manager_pulse",
    "manage_equipment",
    "manage_locations",
    "manage_users",
    "manage_care_plans",
    "manage_issues",
    "review_spot_checks",
    "view_ai_insights",
    "view_replacement_intelligence",
    "manage_public_visibility",
  ],
};

export const routePermissions: Record<string, Permission> = {
  "/app/today": "view_staff_tasks",
  "/app/tasks": "view_staff_tasks",
  "/app/pulse": "view_manager_pulse",
  "/app/issues": "manage_issues",
  "/app/equipment": "view_staff_tasks",
  "/app/spot-checks": "review_spot_checks",
  "/app/insights": "view_ai_insights",
  "/app/settings": "manage_users",
};
