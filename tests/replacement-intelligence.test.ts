import { describe, expect, it } from "vitest";
import { evaluateReplacementIntelligence } from "@/lib/replacement-intelligence/evaluate";
import type { Equipment } from "@/types/equipment";
import type { ManagedIssue } from "@/types/issue";
import type { OutOfOrderEvent } from "@/types/out-of-order";
import type { SpotCheck } from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

const now = new Date("2026-05-26T12:00:00.000Z");

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
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z",
} satisfies Equipment;

const issue = {
  id: "issue-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  publicSlug: "treadmill-01",
  category: "equipment_fault",
  description: "Belt issue",
  photoUrl: "",
  contactEmail: "",
  reporterType: "public",
  status: "new",
  priority: "medium",
  createdAt: "2026-05-20T10:00:00.000Z",
} satisfies ManagedIssue;

const outOfOrderEvent = {
  id: "out-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  createdBy: "staff-1",
  reason: "Unsafe belt",
  severity: "critical",
  photoUrl: "",
  unsafe: true,
  unavailable: true,
  note: "",
  linkedIssueId: "issue-1",
  resolvedAt: "",
  returnedToServiceBy: "",
  createdAt: "2026-05-24T10:00:00.000Z",
} satisfies OutOfOrderEvent;

const failedSpotCheck = {
  id: "spot-check-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  taskId: "task-1",
  staffUserId: "staff-1",
  status: "failed",
  sampleReason: "Default sample",
  managerNote: "",
  reviewedBy: "manager-1",
  reviewedAt: "2026-05-25T10:00:00.000Z",
  createdAt: "2026-05-25T09:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies SpotCheck;

const completedMaintenanceTask = {
  id: "task-1",
  scheduleId: "schedule-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  title: "Repair treadmill belt",
  description: "Replace belt",
  category: "maintenance",
  evidenceLevel: "photo_note",
  checklistItems: [],
  checklistCompleted: [],
  qrConfirmation: "",
  photoUrl: "",
  status: "completed",
  dueAt: "2026-05-22T10:00:00.000Z",
  completedAt: "2026-05-22T12:00:00.000Z",
  completedBy: "staff-1",
  evidence: "",
  note: "Belt replaced",
  createdAt: "2026-05-22T09:00:00.000Z",
  updatedAt: "2026-05-22T12:00:00.000Z",
} satisfies CareTaskInstance;

describe("replacement intelligence", () => {
  it("returns none when equipment has no reliability signals", () => {
    expect(evaluateReplacementIntelligence({ equipment, now })).toMatchObject({
      healthScore: 100,
      score: 0,
      status: "none",
    });
  });

  it("flags watch when repeated faults appear", () => {
    const review = evaluateReplacementIntelligence({
        equipment,
        issues: [
          issue,
          { ...issue, id: "issue-2", createdAt: "2026-05-21T10:00:00.000Z" },
        ],
        now,
      });

    expect(review).toMatchObject({
      healthScore: 62,
      status: "watch",
    });
    expect(review.signals).toHaveLength(1);
    expect(review.signals[0]).toMatchObject({
      label: "2 repeated equipment fault reports",
      points: 38,
    });
  });

  it("recommends review for repeated downtime and failed checks", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [issue, { ...issue, id: "issue-2", priority: "high" }],
        now,
        outOfOrderEvents: [outOfOrderEvent, { ...outOfOrderEvent, id: "out-2" }],
        spotChecks: [failedSpotCheck],
      }),
    ).toMatchObject({
      status: "high_priority_review",
    });
  });

  it("flags high priority review for repeated safety issues", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, category: "safety_concern", priority: "critical" },
          { ...issue, id: "issue-2", category: "safety_concern", priority: "critical" },
          { ...issue, id: "issue-3", category: "safety_concern", priority: "critical" },
        ],
        now,
      }),
    ).toMatchObject({
      status: "high_priority_review",
    });
  });

  it("flags a one-off safety or long out-of-order incident for watch", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [{ ...issue, category: "safety_concern", priority: "critical" }],
        now,
        outOfOrderEvents: [outOfOrderEvent],
      }),
    ).toMatchObject({
      healthScore: 70,
      score: 30,
      status: "watch",
    });
  });

  it("shows a visible health impact for a quick current out-of-order incident", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        now,
        outOfOrderEvents: [
          {
            ...outOfOrderEvent,
            createdAt: "2026-05-26T10:00:00.000Z",
            linkedIssueId: "",
          },
        ],
      }),
    ).toMatchObject({
      healthScore: 85,
      score: 15,
      status: "none",
    });
  });

  it("moves a single day of downtime into watch", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        now,
        outOfOrderEvents: [
          {
            ...outOfOrderEvent,
            createdAt: "2026-05-25T10:00:00.000Z",
            linkedIssueId: "",
          },
        ],
      }),
    ).toMatchObject({
      healthScore: 70,
      score: 30,
      status: "watch",
    });
  });

  it("ignores non-reliability issue categories for replacement health", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, category: "cleaning_issue", description: "A bit dirty" },
          { ...issue, id: "issue-2", category: "cleaning_issue", description: "Still dirty" },
        ],
        now,
      }),
    ).toMatchObject({
      healthScore: 100,
      score: 0,
      status: "none",
    });
  });

  it("lets old resolved faults recover out of the current health score", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, status: "closed", createdAt: "2025-12-01T10:00:00.000Z" },
          { ...issue, id: "issue-2", status: "closed", createdAt: "2025-12-02T10:00:00.000Z" },
        ],
        now,
      }),
    ).toMatchObject({
      healthScore: 100,
      score: 0,
      status: "none",
    });
  });

  it("keeps repaired fault clusters visible during early clean-service recovery", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, status: "closed", createdAt: "2026-05-20T10:00:00.000Z" },
          { ...issue, id: "issue-2", status: "closed", createdAt: "2026-05-21T10:00:00.000Z" },
        ],
        now,
        tasks: [completedMaintenanceTask],
      }),
    ).toMatchObject({
      status: "watch",
    });
  });

  it("only gives a small health bump immediately after repair", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, status: "closed", createdAt: "2026-05-20T10:00:00.000Z" },
          { ...issue, id: "issue-2", status: "closed", createdAt: "2026-05-21T10:00:00.000Z" },
        ],
        now: new Date("2026-05-22T12:00:00.000Z"),
        tasks: [completedMaintenanceTask],
      }),
    ).toMatchObject({
      healthScore: 66,
      status: "watch",
    });
  });

  it("regenerates health slowly over clean service after repair", () => {
    expect(
      evaluateReplacementIntelligence({
        equipment,
        issues: [
          { ...issue, status: "closed", createdAt: "2026-05-20T10:00:00.000Z" },
          { ...issue, id: "issue-2", status: "closed", createdAt: "2026-05-21T10:00:00.000Z" },
        ],
        now: new Date("2026-08-20T12:00:00.000Z"),
        tasks: [completedMaintenanceTask],
      }),
    ).toMatchObject({
      healthScore: 100,
      score: 0,
      status: "none",
    });
  });
});
