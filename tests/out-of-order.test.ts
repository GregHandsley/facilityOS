import { describe, expect, it } from "vitest";
import { getIssuePriorityForOutOfOrder } from "@/lib/out-of-order/labels";

describe("out of order labels", () => {
  it("maps severity to issue priority", () => {
    expect(getIssuePriorityForOutOfOrder("critical")).toBe("critical");
    expect(getIssuePriorityForOutOfOrder("high")).toBe("high");
    expect(getIssuePriorityForOutOfOrder("medium")).toBe("medium");
    expect(getIssuePriorityForOutOfOrder("low")).toBe("medium");
  });
});
