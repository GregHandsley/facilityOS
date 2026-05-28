import { describe, expect, it, vi } from "vitest";
import {
  getNextSamplingState,
  getSampleRateForConfidence,
  getSpotCheckSampleReason,
  getSamplingRateForTask,
  shouldGenerateSpotCheck,
} from "@/lib/spot-checks/sampling";
import { getSpotCheckTone, isSpotCheckOpen } from "@/lib/spot-checks/labels";
import type { CareTaskInstance } from "@/types/task";

const task = {
  id: "task-1",
  scheduleId: "schedule-1",
  facilityId: "facility-1",
  locationId: "location-1",
  equipmentId: "equipment-1",
  title: "Clean platform",
  description: "",
  category: "cleaning",
  evidenceLevel: "quick",
  checklistItems: [],
  checklistCompleted: [],
  qrConfirmation: "",
  photoUrl: "",
  status: "completed",
  dueAt: "2026-05-25T11:00:00.000Z",
  completedAt: "2026-05-25T10:00:00.000Z",
  completedBy: "staff-1",
  evidence: "",
  note: "",
  createdAt: "2026-05-25T09:00:00.000Z",
  updatedAt: "2026-05-25T10:00:00.000Z",
} satisfies CareTaskInstance;

describe("spot check sampling", () => {
  it("always samples Level 4 evidence tasks", () => {
    expect(shouldGenerateSpotCheck({ ...task, evidenceLevel: "photo_note" })).toBe(true);
    expect(getSpotCheckSampleReason({ ...task, evidenceLevel: "photo_note" })).toBe(
      "Level 4 evidence always sampled",
    );
  });

  it("always samples corrective rework tasks", () => {
    expect(shouldGenerateSpotCheck({ ...task, sourceSpotCheckId: "spot-check-1" })).toBe(true);
    expect(getSpotCheckSampleReason({ ...task, sourceSpotCheckId: "spot-check-1" })).toBe(
      "Corrective rework requires review",
    );
  });

  it("uses the default sample rate for ordinary tasks", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0.09).mockReturnValueOnce(0.11);

    expect(shouldGenerateSpotCheck(task)).toBe(true);
    expect(shouldGenerateSpotCheck(task)).toBe(false);

    vi.restoreAllMocks();
  });

  it("uses adaptive confidence sampling rates", () => {
    expect(getSampleRateForConfidence("green")).toBe(0.08);
    expect(getSampleRateForConfidence("amber")).toBe(0.25);
    expect(getSampleRateForConfidence("red")).toBe(0.5);
    expect(
      getSamplingRateForTask(task, new Date(), {
        confidence: "red",
        explanation: "Failed checks recorded.",
        failedChecks: 1,
        facilityId: "facility-1",
        id: "state-1",
        passedChecks: 0,
        sampleRate: 0.5,
        scope: "facility",
        scopeId: "facility-1",
        totalReviewed: 1,
        updatedAt: "2026-05-25T10:00:00.000Z",
      }),
    ).toBe(0.5);
  });

  it("moves confidence red after failed review", () => {
    const next = getNextSamplingState({
      current: {
        confidence: "green",
        explanation: "Default.",
        failedChecks: 0,
        facilityId: "facility-1",
        id: "state-1",
        passedChecks: 0,
        sampleRate: 0.08,
        scope: "facility",
        scopeId: "facility-1",
        totalReviewed: 0,
        updatedAt: "2026-05-25T10:00:00.000Z",
      },
      reviewedStatus: "failed",
    });

    expect(next.confidence).toBe("red");
    expect(next.sampleRate).toBe(0.5);
    expect(next.failedChecks).toBe(1);
  });
});

describe("spot check labels", () => {
  it("marks failed assurance outcomes as red", () => {
    expect(getSpotCheckTone("failed")).toBe("red");
    expect(getSpotCheckTone("escalated")).toBe("red");
    expect(getSpotCheckTone("passed")).toBe("green");
  });

  it("treats unresolved assurance outcomes as open", () => {
    expect(isSpotCheckOpen("pending")).toBe(true);
    expect(isSpotCheckOpen("failed")).toBe(true);
    expect(isSpotCheckOpen("recheck_required")).toBe(true);
    expect(isSpotCheckOpen("passed")).toBe(false);
  });
});
