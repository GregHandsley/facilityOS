import { describe, expect, it } from "vitest";
import { formatTaskDueLabel, getTaskStatusTone } from "@/lib/tasks/labels";

describe("task labels", () => {
  it("maps task status to operational tones", () => {
    expect(getTaskStatusTone("completed")).toBe("green");
    expect(getTaskStatusTone("overdue")).toBe("red");
    expect(getTaskStatusTone("skipped")).toBe("red");
    expect(getTaskStatusTone("pending")).toBe("amber");
  });

  it("formats empty due dates safely", () => {
    expect(formatTaskDueLabel("")).toBe("No due date");
  });
});
