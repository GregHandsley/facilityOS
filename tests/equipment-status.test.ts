import { describe, expect, it } from "vitest";
import { calculateEquipmentStatus } from "@/lib/status/equipmentStatus";
import type { Equipment } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

const now = new Date("2026-05-26T10:00:00.000Z");

const equipment = {
  id: "equipment-1",
  facilityId: "facility-1",
  locationId: "location-1",
  name: "Treadmill 01",
  manufacturer: "Technogym",
  model: "Skill Run",
  equipmentType: "Treadmill",
  equipmentNumber: "01",
  description: "",
  imageUrl: "",
  publicSlug: "treadmill-01",
  publicVisible: true,
  status: "green",
  archived: false,
  createdAt: "2026-05-25T10:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies Equipment;

const issue = {
  id: "issue-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  publicSlug: "treadmill-01",
  category: "equipment_fault",
  description: "Belt tracking poorly",
  photoUrl: "",
  contactEmail: "",
  reporterType: "public",
  status: "new",
  priority: "medium",
  createdAt: "2026-05-25T10:00:00.000Z",
} satisfies ManagedIssue;

const task = {
  id: "task-1",
  scheduleId: "schedule-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  title: "Emergency stop check",
  description: "",
  category: "safety",
  evidenceLevel: "quick",
  checklistItems: [],
  checklistCompleted: [],
  qrConfirmation: "",
  photoUrl: "",
  status: "pending",
  dueAt: "2026-05-26T09:00:00.000Z",
  completedAt: "",
  completedBy: "",
  evidence: "",
  note: "",
  createdAt: "2026-05-25T10:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies CareTaskInstance;

const spotCheck = {
  id: "spot-check-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  taskId: "task-1",
  staffUserId: "staff-1",
  status: "pending",
  sampleReason: "Default sample",
  managerNote: "",
  reviewedBy: "",
  reviewedAt: "",
  createdAt: "2026-05-25T10:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies SpotCheck;

const outOfOrderEvent = {
  id: "out-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  createdBy: "staff-1",
  reason: "Unsafe belt movement",
  severity: "critical",
  photoUrl: "",
  unsafe: true,
  unavailable: true,
  note: "",
  linkedIssueId: "issue-1",
  resolvedAt: "",
  returnedToServiceBy: "",
  createdAt: "2026-05-25T10:00:00.000Z",
} satisfies OutOfOrderEvent;

describe("equipment status engine", () => {
  it("returns green when no risk signals are active", () => {
    expect(calculateEquipmentStatus({ equipment, now })).toMatchObject({
      status: "green",
      statusCopy: "Ready to use",
    });
  });

  it("returns amber for minor active issues and pending spot checks", () => {
    expect(
      calculateEquipmentStatus({
        equipment,
        issues: [issue],
        now,
        spotChecks: [spotCheck],
      }),
    ).toMatchObject({
      status: "amber",
      statusCopy: "Use with awareness",
    });
  });

  it("returns amber when the public status mirror has an active fault", () => {
    expect(
      calculateEquipmentStatus({
        equipment,
        now,
        publicEquipment: {
          id: "treadmill-01",
          archived: false,
          equipmentId: equipment.id,
          facilityId: equipment.facilityId,
          hasActivePublicFault: true,
          lastCleanedAt: "",
          lastInspectedAt: "",
          lastMaintainedAt: "",
          locationId: equipment.locationId,
          outOfOrderMessage: "",
          publicImageUrl: "",
          publicLocationName: "Cardio",
          publicManufacturer: "Technogym",
          publicModel: "Skill Run",
          publicName: "Treadmill 01",
          publicSlug: equipment.publicSlug,
          publicStatus: "amber",
          publicStatusCopy: "Use with awareness",
          publicVisible: true,
          showLastCleaned: true,
          showLastInspected: true,
          showLastMaintained: true,
        },
      }),
    ).toMatchObject({
      reasons: expect.arrayContaining([
        expect.objectContaining({ message: "Public fault is active" }),
      ]),
      status: "amber",
      statusCopy: "Use with awareness",
    });
  });

  it("returns amber for failed spot checks that need follow-up", () => {
    expect(
      calculateEquipmentStatus({
        equipment,
        now,
        spotChecks: [{ ...spotCheck, status: "failed" }],
      }),
    ).toMatchObject({
      status: "amber",
      statusCopy: "Use with awareness",
    });
  });

  it("returns red for unresolved out-of-order events", () => {
    expect(
      calculateEquipmentStatus({
        equipment,
        now,
        outOfOrderEvents: [outOfOrderEvent],
      }),
    ).toMatchObject({
      status: "red",
      statusCopy: "Out of order",
    });
  });

  it("returns red for safety issues and critical overdue tasks", () => {
    expect(
      calculateEquipmentStatus({
        equipment,
        issues: [{ ...issue, category: "safety_concern", priority: "critical" }],
        now,
        tasks: [task],
      }),
    ).toMatchObject({
      status: "red",
    });
  });
});
