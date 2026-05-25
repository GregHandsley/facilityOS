import { describe, expect, it } from "vitest";
import { getPublicStatusCopy } from "@/lib/equipment/public-status";

describe("public equipment status copy", () => {
  it("maps traffic light statuses to public-safe copy", () => {
    expect(getPublicStatusCopy("green")).toBe("Ready to use");
    expect(getPublicStatusCopy("amber")).toBe("Use with awareness");
    expect(getPublicStatusCopy("red")).toBe("Out of order");
  });
});
