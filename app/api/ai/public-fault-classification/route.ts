import { NextResponse } from "next/server";
import { analyzeFaultReport } from "@/lib/ai/fault-analysis";
import type { ManagedIssue } from "@/types/issue";

export const runtime = "nodejs";

type PublicFaultClassificationRequest = {
  description?: string;
  equipmentName?: string;
  locationName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublicFaultClassificationRequest;
    const description = body.description?.trim() ?? "";

    if (description.length < 3) {
      return NextResponse.json(
        { error: "A short description is required." },
        { status: 400 },
      );
    }

    const issue: ManagedIssue = {
      id: "public-draft",
      facilityId: "public-draft",
      locationId: "public-draft",
      equipmentId: "public-draft",
      publicSlug: "public-draft",
      category: "equipment_fault",
      contactEmail: "",
      createdAt: new Date().toISOString(),
      description: description.slice(0, 1200),
      photoUrl: "",
      priority: "medium",
      reporterType: "public",
      status: "new",
    };
    const analysis = await analyzeFaultReport({
      equipmentName: body.equipmentName?.trim() || "Equipment",
      issue,
      locationName: body.locationName?.trim() || "Facility area",
      recentIssues: [],
    });

    return NextResponse.json({
      category: analysis.category,
      priority: analysis.priority,
    });
  } catch {
    return NextResponse.json(
      {
        category: "equipment_fault",
        priority: "medium",
      },
      { status: 200 },
    );
  }
}
