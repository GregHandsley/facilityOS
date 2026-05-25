import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  PackagePlus,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityFeedItem, ActivityFeedType } from "@/types/activity";

export type ActivityTone = "green" | "amber" | "red" | "ice";

const iconByType: Record<ActivityFeedType, LucideIcon> = {
  ai_insight_created: Bot,
  equipment_created: PackagePlus,
  equipment_marked_out_of_order: ShieldAlert,
  equipment_returned_to_service: RotateCcw,
  fault_reported: AlertTriangle,
  issue_status_changed: AlertTriangle,
  spot_check_completed: ClipboardCheck,
  task_completed: CheckCircle2,
};

const toneByType: Record<ActivityFeedType, ActivityTone> = {
  ai_insight_created: "ice",
  equipment_created: "ice",
  equipment_marked_out_of_order: "red",
  equipment_returned_to_service: "green",
  fault_reported: "amber",
  issue_status_changed: "amber",
  spot_check_completed: "green",
  task_completed: "green",
};

export function toActivityCardItem(item: ActivityFeedItem) {
  return {
    id: item.id,
    icon: iconByType[item.type],
    meta: formatActivityMeta(item),
    title: item.title,
    tone: toneByType[item.type],
  };
}

export function formatActivityMeta(item: ActivityFeedItem) {
  const actor =
    item.actorRole === "public"
      ? "Public report"
      : item.actorName || item.actorRole || "FacilityOS";
  const timeLabel = item.createdAt
    ? new Date(item.createdAt).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  return [actor, item.meta, timeLabel].filter(Boolean).join(" · ");
}
