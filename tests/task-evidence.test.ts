import { describe, expect, it } from "vitest";
import {
  getEvidenceValidationError,
  parseChecklistItems,
} from "@/lib/tasks/evidence";

const baseTask = {
  checklistCompleted: [],
  checklistItems: [],
  evidenceLevel: "quick" as const,
  note: "",
  photoUrl: "",
  qrConfirmation: "",
};

describe("task evidence", () => {
  it("parses checklist text into required items", () => {
    expect(parseChecklistItems("Pads wiped\n\nCable checked ")).toEqual([
      "Pads wiped",
      "Cable checked",
    ]);
  });

  it("allows quick confirmation without extra evidence", () => {
    expect(getEvidenceValidationError({ publicSlug: "abc", task: baseTask })).toBeNull();
  });

  it("requires checklist items to be completed", () => {
    expect(
      getEvidenceValidationError({
        publicSlug: "abc",
        task: {
          ...baseTask,
          checklistCompleted: ["Pads wiped"],
          checklistItems: ["Pads wiped", "Cable checked"],
          evidenceLevel: "checklist",
        },
      }),
    ).toBe("Complete every checklist item before marking this task done.");
  });

  it("requires QR confirmation to match the equipment slug", () => {
    expect(
      getEvidenceValidationError({
        publicSlug: "ski-erg-123",
        task: {
          ...baseTask,
          evidenceLevel: "qr",
          qrConfirmation: "wrong",
        },
      }),
    ).toBe("Enter the equipment QR slug to confirm you are at the right item.");
  });

  it("requires photo and note evidence together", () => {
    expect(
      getEvidenceValidationError({
        publicSlug: "abc",
        task: {
          ...baseTask,
          evidenceLevel: "photo_note",
          note: "Completed",
        },
      }),
    ).toBe("Add a photo/reference before completing this task.");
  });
});
