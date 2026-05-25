import type {
  IssueCategory,
  PublicIssueReport,
  PublicIssueReportInput,
} from "@/types/issue";

export const publicIssueCategories: Array<{
  label: string;
  value: IssueCategory;
}> = [
  { label: "Equipment fault", value: "equipment_fault" },
  { label: "Cleaning issue", value: "cleaning_issue" },
  { label: "Safety concern", value: "safety_concern" },
  { label: "Stock issue", value: "stock_issue" },
  { label: "Building issue", value: "building_issue" },
  { label: "Other", value: "other" },
];

export function isPublicIssueCategory(value: string): value is IssueCategory {
  return publicIssueCategories.some((category) => category.value === value);
}

export function createPublicIssueReport(
  id: string,
  input: PublicIssueReportInput,
  createdAt = new Date().toISOString(),
): PublicIssueReport {
  return {
    id,
    facilityId: input.facilityId,
    locationId: input.locationId,
    equipmentId: input.equipmentId,
    publicSlug: input.publicSlug,
    category: input.category,
    description: input.description.trim(),
    photoUrl: input.photoUrl?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    reporterType: "public",
    status: "new",
    priority: "medium",
    createdAt,
  };
}

export function validatePublicIssueReport(input: PublicIssueReportInput) {
  if (!input.facilityId || !input.locationId || !input.equipmentId || !input.publicSlug) {
    return "This equipment profile is missing report details.";
  }

  if (!isPublicIssueCategory(input.category)) {
    return "Choose a fault category.";
  }

  if (input.description.trim().length < 3) {
    return "Add a short description of the issue.";
  }

  return null;
}
