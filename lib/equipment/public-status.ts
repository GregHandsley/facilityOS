import type { EquipmentStatus } from "@/types/equipment";

export function getPublicStatusCopy(status: EquipmentStatus) {
  switch (status) {
    case "green":
      return "Ready to use";
    case "amber":
      return "Use with awareness";
    case "red":
      return "Out of order";
  }
}
