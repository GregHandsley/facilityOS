import { describe, expect, it } from "vitest";
import {
  createPublicIssueReport,
  isPublicIssueCategory,
  validatePublicIssueReport,
} from "@/lib/issues/public-report";

const validInput = {
  category: "equipment_fault" as const,
  description: "Belt is slipping",
  equipmentId: "equipment-1",
  facilityId: "facility-1",
  locationId: "location-1",
  publicSlug: "treadmill-01-abc12345",
};

describe("public fault reports", () => {
  it("accepts planned public issue categories", () => {
    expect(isPublicIssueCategory("equipment_fault")).toBe(true);
    expect(isPublicIssueCategory("cleaning_issue")).toBe(true);
    expect(isPublicIssueCategory("safety_concern")).toBe(true);
    expect(isPublicIssueCategory("manager_note")).toBe(false);
  });

  it("blocks empty descriptions", () => {
    expect(
      validatePublicIssueReport({
        ...validInput,
        description: " ",
      }),
    ).toBe("Add a short description of the issue.");
  });

  it("creates safe default fields for public reports", () => {
    const report = createPublicIssueReport("issue-1", validInput, "2026-05-25T10:00:00.000Z");

    expect(report).toMatchObject({
      id: "issue-1",
      priority: "medium",
      reporterType: "public",
      status: "new",
    });
    expect(report).not.toHaveProperty("assignedTo");
    expect(report).not.toHaveProperty("internalNotes");
  });
});
