import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const firestoreRules = readFileSync("firestore.rules", "utf8");
const storageRules = readFileSync("storage.rules", "utf8");
const publicFaultCreateRule = firestoreRules.slice(
  firestoreRules.indexOf("function isPublicFaultCreate()"),
  firestoreRules.indexOf("function isPublicFaultStateUpdate()"),
);

describe("Firestore security rules", () => {
  it("defaults unknown collections to deny", () => {
    expect(firestoreRules).toContain("match /{document=**}");
    expect(firestoreRules).toContain("allow read, write: if false;");
  });

  it("requires facility membership for team data", () => {
    expect(firestoreRules).toContain("function belongsToFacility(facilityId)");
    expect(firestoreRules).toContain("userFacilityId() == facilityId");
    expect(firestoreRules).toContain("function teamForFacility(facilityId)");
  });

  it("keeps manager-only data away from staff and public users", () => {
    expect(firestoreRules).toContain("match /aiInsights/{insightId}");
    expect(firestoreRules).toContain("match /replacementReviews/{reviewId}");
    expect(firestoreRules).toContain("managerForFacility(resource.data.facilityId)");
  });

  it("limits manager issue updates to issue management fields", () => {
    expect(firestoreRules).toContain("match /issues/{issueId}");
    expect(firestoreRules).toContain('"internalNotes"');
    expect(firestoreRules).toContain('"resolvedAt"');
    expect(firestoreRules).toContain(
      "request.resource.data.equipmentId == resource.data.equipmentId",
    );
    expect(firestoreRules).toContain("allow delete: if false;");
  });

  it("prevents staff from approving their own spot checks", () => {
    expect(firestoreRules).toContain(
      "request.resource.data.reviewedBy != request.resource.data.staffUserId",
    );
  });

  it("limits public fault reports to safe create-only fields", () => {
    expect(publicFaultCreateRule).toContain("function isPublicFaultCreate()");
    expect(publicFaultCreateRule).toContain("documents/publicEquipment");
    expect(publicFaultCreateRule).toContain(
      "publicEquipment.data.equipmentId == request.resource.data.equipmentId",
    );
    expect(publicFaultCreateRule).toContain(
      'request.resource.data.reporterType == "public"',
    );
    expect(publicFaultCreateRule).toContain("request.resource.data.keys().hasOnly");
    expect(publicFaultCreateRule).toContain('"publicSlug"');
    expect(publicFaultCreateRule).not.toContain('"internalNotes"');
  });

  it("exposes QR data through public summaries only", () => {
    expect(firestoreRules).toContain("match /publicEquipment/{slug}");
    expect(firestoreRules).toContain("allow get: if true;");
    expect(firestoreRules).toContain("allow list: if false;");
    expect(firestoreRules).toContain("function isPublicFaultStateUpdate()");
    expect(firestoreRules).toContain("function isCareSummaryUpdate()");
    expect(firestoreRules).toContain('"lastCleanedAt"');
    expect(firestoreRules).toContain("allow delete: if false;");
    expect(firestoreRules).not.toContain('"aiSummary"');
    expect(firestoreRules).not.toContain('"replacementStatus"');
  });

  it("allows staff task completion fields without schedule edits", () => {
    expect(firestoreRules).toContain("match /careTaskInstances/{taskId}");
    expect(firestoreRules).toContain("function taskEvidenceSatisfied()");
    expect(firestoreRules).toContain("staffForFacility(resource.data.facilityId)");
    expect(firestoreRules).toContain('"completedAt"');
    expect(firestoreRules).toContain('"completedBy"');
    expect(firestoreRules).toContain('"checklistCompleted"');
    expect(firestoreRules).toContain('"qrConfirmation"');
    expect(firestoreRules).toContain('"photoUrl"');
    expect(firestoreRules).not.toContain('"frequency"');
  });

  it("allows narrow out-of-order equipment updates", () => {
    expect(firestoreRules).toContain("function staffMarksEquipmentOutOfOrder()");
    expect(firestoreRules).toContain("function teamMarksPublicEquipmentOutOfOrder()");
    expect(firestoreRules).toContain("function managerReturnsPublicEquipmentToService()");
    expect(firestoreRules).toContain("match /outOfOrderEvents/{eventId}");
    expect(firestoreRules).toContain('"linkedIssueId"');
    expect(firestoreRules).toContain('"returnedToServiceBy"');
  });
});

describe("Storage security rules", () => {
  it("scopes private facility files by user facility", () => {
    expect(storageRules).toContain("function belongsToFacility(facilityId)");
    expect(storageRules).toContain("userProfile().data.facilityId == facilityId");
    expect(storageRules).toContain(
      "match /facilities/{facilityId}/{allPaths=**}",
    );
  });

  it("allows public report image creation without exposing private reads", () => {
    expect(storageRules).toContain("match /public-reports/{facilityId}/{allPaths=**}");
    expect(storageRules).toContain("allow create:");
    expect(storageRules).toContain("request.resource.contentType.matches('image/.*')");
    expect(storageRules).toContain("allow read, update, delete: if belongsToFacility");
  });
});
