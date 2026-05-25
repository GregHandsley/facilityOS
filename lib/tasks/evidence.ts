import type { CareTaskInstance, EvidenceLevel } from "@/types/task";

export const evidenceLevelOptions: Array<{
  description: string;
  label: string;
  value: EvidenceLevel;
}> = [
  {
    description: "Staff can complete with one confirmation.",
    label: "Quick confirmation",
    value: "quick",
  },
  {
    description: "Staff must tick every checklist item.",
    label: "Checklist",
    value: "checklist",
  },
  {
    description: "Staff must enter the equipment QR slug.",
    label: "QR confirmation",
    value: "qr",
  },
  {
    description: "Staff must add a note and photo/reference.",
    label: "Photo and note",
    value: "photo_note",
  },
];

export const evidenceLevelLabels = Object.fromEntries(
  evidenceLevelOptions.map((level) => [level.value, level.label]),
) as Record<EvidenceLevel, string>;

export function parseChecklistItems(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getEvidenceValidationError({
  publicSlug,
  task,
}: {
  publicSlug: string;
  task: Pick<
    CareTaskInstance,
    | "checklistCompleted"
    | "checklistItems"
    | "evidenceLevel"
    | "note"
    | "photoUrl"
    | "qrConfirmation"
  >;
}) {
  if (task.evidenceLevel === "checklist") {
    const completedItems = new Set(task.checklistCompleted);
    const hasCompletedChecklist =
      task.checklistItems.length > 0 &&
      task.checklistItems.every((item) => completedItems.has(item));

    if (!hasCompletedChecklist) {
      return "Complete every checklist item before marking this task done.";
    }
  }

  if (task.evidenceLevel === "qr" && task.qrConfirmation.trim() !== publicSlug) {
    return "Enter the equipment QR slug to confirm you are at the right item.";
  }

  if (task.evidenceLevel === "photo_note") {
    if (!task.note.trim()) {
      return "Add a note before completing this task.";
    }

    if (!task.photoUrl.trim()) {
      return "Add a photo/reference before completing this task.";
    }
  }

  return null;
}
