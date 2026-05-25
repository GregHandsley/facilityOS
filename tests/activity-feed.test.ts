import { describe, expect, it } from "vitest";
import { formatActivityMeta, toActivityCardItem } from "@/lib/activity/feed";
import type { ActivityFeedItem } from "@/types/activity";

const activity = {
  id: "activity-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  taskId: "task-1",
  issueId: "",
  type: "task_completed",
  title: "Cable checks completed",
  meta: "inspection",
  actorId: "staff-1",
  actorName: "Becky",
  actorRole: "staff",
  managerOnly: false,
  createdAt: "2026-05-25T10:00:00.000Z",
} satisfies ActivityFeedItem;

describe("activity feed", () => {
  it("maps stored activity into card items", () => {
    expect(toActivityCardItem(activity)).toMatchObject({
      id: "activity-1",
      title: "Cable checks completed",
      tone: "green",
    });
  });

  it("formats public activity without exposing a staff name", () => {
    expect(
      formatActivityMeta({
        ...activity,
        actorName: "Public user",
        actorRole: "public",
        type: "fault_reported",
      }),
    ).toContain("Public report");
  });
});
