import { describe, expect, it } from "vitest";
import { getIssueTone, isIssueOpen } from "@/lib/issues/labels";

describe("issue labels", () => {
  it("treats resolved and closed issues as inactive", () => {
    expect(isIssueOpen("new")).toBe(true);
    expect(isIssueOpen("in_progress")).toBe(true);
    expect(isIssueOpen("resolved")).toBe(false);
    expect(isIssueOpen("closed")).toBe(false);
  });

  it("uses urgent tones for high-risk open issues", () => {
    expect(getIssueTone("new", "critical")).toBe("red");
    expect(getIssueTone("in_progress", "high")).toBe("red");
    expect(getIssueTone("new", "medium")).toBe("amber");
    expect(getIssueTone("resolved", "critical")).toBe("green");
  });
});
