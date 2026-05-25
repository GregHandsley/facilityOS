import { describe, expect, it } from "vitest";
import {
  createEquipmentSlug,
  slugifyEquipmentName,
} from "@/lib/equipment/slug";

describe("equipment slug helpers", () => {
  it("creates URL-safe slugs from equipment names", () => {
    expect(slugifyEquipmentName("Technogym Treadmill 04")).toBe(
      "technogym-treadmill-04",
    );
    expect(slugifyEquipmentName("  Cable / Pulley #2  ")).toBe("cable-pulley-2");
  });

  it("adds an id suffix to keep public slugs unique", () => {
    expect(
      createEquipmentSlug({
        equipmentNumber: "T04",
        id: "ABCDEF123456",
        name: "Technogym Treadmill",
      }),
    ).toBe("technogym-treadmill-t04-abcdef12");
  });
});
