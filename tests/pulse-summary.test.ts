import { describe, expect, it } from "vitest";
import { getPulseSummary, isTaskOverdue } from "@/lib/pulse/summary";
import type { Equipment } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { CareTaskInstance } from "@/types/task";

const now = new Date("2026-05-25T10:00:00.000Z");

const task = {
  id: "task-1",
  scheduleId: "schedule-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  title: "Cable check",
  description: "",
  category: "inspection",
  evidenceLevel: "quick",
  checklistItems: [],
  checklistCompleted: [],
  qrConfirmation: "",
  photoUrl: "",
  dueAt: "2026-05-25T09:00:00.000Z",
  completedAt: "",
  completedBy: "",
  evidence: "",
  note: "",
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
} satisfies Omit<CareTaskInstance, "status">;

const issue = {
  id: "issue-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  publicSlug: "equipment-1",
  category: "equipment_fault",
  description: "Cable fraying",
  photoUrl: "",
  contactEmail: "",
  reporterType: "public",
  status: "new",
  priority: "critical",
  createdAt: "2026-05-24T09:00:00.000Z",
} satisfies ManagedIssue;

const equipment = {
  id: "equipment-1",
  facilityId: "facility-1",
  locationId: "location-1",
  name: "Cable 01",
  manufacturer: "Technogym",
  model: "Cable",
  equipmentType: "Cable machine",
  equipmentNumber: "01",
  description: "",
  imageUrl: "",
  publicSlug: "cable-01",
  publicVisible: true,
  status: "red",
  archived: false,
  createdAt: "2026-05-24T09:00:00.000Z",
  updatedAt: "2026-05-24T09:00:00.000Z",
} satisfies Equipment;

describe("pulse summary", () => {
  it("treats incomplete past-due tasks as overdue", () => {
    expect(isTaskOverdue({ ...task, status: "pending" }, now)).toBe(true);
    expect(isTaskOverdue({ ...task, status: "completed" }, now)).toBe(false);
  });

  it("summarises live facility risk signals", () => {
    expect(
      getPulseSummary({
        equipment: [equipment],
        issues: [issue],
        now,
        tasks: [{ ...task, status: "pending" }, { ...task, id: "task-2", status: "completed" }],
      }),
    ).toMatchObject({
      completedTasks: 1,
      criticalIssues: 1,
      openIssues: 1,
      outOfOrderEquipment: 1,
      overdueTasks: 1,
      tone: "red",
    });
  });
});
