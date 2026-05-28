import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeFaultReport, validateAiIssueAnalysis } from "@/lib/ai/fault-analysis";
import type { ManagedIssue } from "@/types/issue";

const issue: ManagedIssue = {
  category: "equipment_fault",
  contactEmail: "",
  createdAt: "2026-05-27T20:00:00.000Z",
  description: "The machine has a few specs of dust on top",
  equipmentId: "equipment-1",
  facilityId: "facility-1",
  id: "issue-1",
  locationId: "location-1",
  photoUrl: "",
  priority: "medium",
  publicSlug: "machine-1",
  reporterType: "public",
  status: "new",
};

describe("AI fault analysis validation", () => {
  it("accepts a valid structured fault analysis", () => {
    expect(
      validateAiIssueAnalysis({
        affectedComponent: "Pulley",
        category: "equipment_fault",
        duplicateOrRepeat: true,
        isSafetyRelated: false,
        priority: "high",
        recommendedAction: "Inspect the pulley before returning to service.",
        summary: "The report suggests a repeated pulley fault.",
      }),
    ).toEqual({
      affectedComponent: "Pulley",
      category: "equipment_fault",
      duplicateOrRepeat: true,
      isSafetyRelated: false,
      priority: "high",
      recommendedAction: "Inspect the pulley before returning to service.",
      summary: "The report suggests a repeated pulley fault.",
    });
  });

  it("rejects invalid categories and priorities", () => {
    expect(() =>
      validateAiIssueAnalysis({
        affectedComponent: "Unknown",
        category: "bad_category",
        duplicateOrRepeat: false,
        isSafetyRelated: false,
        priority: "medium",
        recommendedAction: "Review.",
        summary: "Review required.",
      }),
    ).toThrow("invalid category");

    expect(() =>
      validateAiIssueAnalysis({
        affectedComponent: "Unknown",
        category: "other",
        duplicateOrRepeat: false,
        isSafetyRelated: false,
        priority: "urgent",
        recommendedAction: "Review.",
        summary: "Review required.",
      }),
    ).toThrow("invalid priority");
  });

  it("keeps minor dust reports as low-priority cleaning issues", async () => {
    await expect(
      analyzeFaultReport({
        equipmentName: "Ski-Erg",
        issue,
        locationName: "Cardio Area",
        recentIssues: [
          {
            ...issue,
            category: "safety_concern",
            description: "Cable snapped last week",
            id: "issue-2",
            priority: "critical",
            status: "resolved",
          },
        ],
      }),
    ).resolves.toMatchObject({
      category: "cleaning_issue",
      duplicateOrRepeat: false,
      isSafetyRelated: false,
      priority: "low",
    });
  });

  it("marks serious injury or explosion language as critical safety", async () => {
    await expect(
      analyzeFaultReport({
        equipmentName: "Ski-Erg",
        issue: {
          ...issue,
          description: "it blew up, I lost an arm",
        },
        locationName: "Cardio Area",
      }),
    ).resolves.toMatchObject({
      category: "safety_concern",
      duplicateOrRepeat: false,
      isSafetyRelated: true,
      priority: "critical",
    });
  });

  it("marks equipment failure with a reported strain as high-priority safety", async () => {
    await expect(
      analyzeFaultReport({
        equipmentName: "Watt Bike",
        issue: {
          ...issue,
          description: "The pedal fell off and I strained my leg",
        },
        locationName: "Cardio Area",
      }),
    ).resolves.toMatchObject({
      category: "safety_concern",
      duplicateOrRepeat: false,
      isSafetyRelated: true,
      priority: "high",
    });
  });

  it("marks severe eye injury language as critical safety", async () => {
    await expect(
      analyzeFaultReport({
        equipmentName: "Watt Bike",
        issue: {
          ...issue,
          description:
            "The handle bars fell off and I impaled my eye with the upright. I have lost an eye",
        },
        locationName: "Cardio Area",
      }),
    ).resolves.toMatchObject({
      category: "safety_concern",
      duplicateOrRepeat: false,
      isSafetyRelated: true,
      priority: "critical",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it("analyses non-cleaning reports without sending recent report history", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        output: [
          {
            content: [
              {
                text: JSON.stringify({
                  affectedComponent: "Handle",
                  category: "equipment_fault",
                  duplicateOrRepeat: true,
                  isSafetyRelated: false,
                  priority: "medium",
                  recommendedAction: "Inspect the handle.",
                  summary: "A handle issue has been reported.",
                }),
                type: "output_text",
              },
            ],
          },
        ],
      }),
      ok: true,
    } as Response);

    await expect(
      analyzeFaultReport({
        equipmentName: "Ski-Erg",
        issue: {
          ...issue,
          description: "The handle is not moving properly",
        },
        locationName: "Cardio Area",
        recentIssues: [
          {
            ...issue,
            category: "safety_concern",
            description: "Cable snapped last week",
            id: "issue-2",
            priority: "critical",
          },
        ],
      }),
    ).resolves.toMatchObject({
      duplicateOrRepeat: false,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const userPayload = JSON.parse(body.input[1].content);

    expect(userPayload.recentReports).toBeUndefined();
  });

  it("raises model safety suggestions to at least high priority", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        output: [
          {
            content: [
              {
                text: JSON.stringify({
                  affectedComponent: "Unknown component",
                  category: "equipment_fault",
                  duplicateOrRepeat: false,
                  isSafetyRelated: true,
                  priority: "medium",
                  recommendedAction: "Inspect before use.",
                  summary: "The report may affect safe use.",
                }),
                type: "output_text",
              },
            ],
          },
        ],
      }),
      ok: true,
    } as Response);

    await expect(
      analyzeFaultReport({
        equipmentName: "Ski-Erg",
        issue: {
          ...issue,
          description: "The machine feels wrong when used",
        },
        locationName: "Cardio Area",
      }),
    ).resolves.toMatchObject({
      category: "safety_concern",
      duplicateOrRepeat: false,
      isSafetyRelated: true,
      priority: "high",
    });
  });
});
