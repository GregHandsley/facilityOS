import { NextResponse } from "next/server";
import { analyzeFaultReport } from "@/lib/ai/fault-analysis";
import type { ManagedIssue } from "@/types/issue";

export const runtime = "nodejs";

type FaultAnalysisRequest = {
  equipmentName?: string;
  issue?: ManagedIssue;
  locationName?: string;
  recentIssues?: ManagedIssue[];
};

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
  }>;
};

type FirestoreDocument = {
  fields?: Record<string, FirestoreValue>;
};

type FirestoreValue = {
  stringValue?: string;
};

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as FaultAnalysisRequest;

    if (!body.issue || !body.equipmentName || !body.locationName) {
      return NextResponse.json(
        { error: "Issue context is incomplete." },
        { status: 400 },
      );
    }

    const userProfile = await getAuthenticatedUserProfile(token);

    if (userProfile.role !== "manager") {
      return NextResponse.json(
        { error: "Manager access is required." },
        { status: 403 },
      );
    }

    if (userProfile.facilityId !== body.issue.facilityId) {
      return NextResponse.json(
        { error: "Facility access is not allowed." },
        { status: 403 },
      );
    }

    const analysis = await analyzeFaultReport({
      equipmentName: body.equipmentName,
      issue: body.issue,
      locationName: body.locationName,
      recentIssues: body.recentIssues?.filter(
        (issue) =>
          issue.facilityId === body.issue?.facilityId &&
          issue.equipmentId === body.issue.equipmentId &&
          issue.id !== body.issue.id,
      ),
    });

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "AI fault analysis could not be generated." },
      { status: 500 },
    );
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

async function getAuthenticatedUserProfile(token: string) {
  const uid = await lookupFirebaseUid(token);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Firebase project id is not configured.");
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("User profile could not be loaded.");
  }

  const document = (await response.json()) as FirestoreDocument;
  const role = document.fields?.role?.stringValue;
  const facilityId = document.fields?.facilityId?.stringValue;

  if (role !== "staff" && role !== "manager") {
    throw new Error("User profile role is invalid.");
  }

  if (!facilityId) {
    throw new Error("User profile facility is invalid.");
  }

  return { facilityId, role };
}

async function lookupFirebaseUid(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Firebase API key is not configured.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      body: JSON.stringify({ idToken: token }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Firebase token is invalid.");
  }

  const payload = (await response.json()) as FirebaseLookupResponse;
  const uid = payload.users?.[0]?.localId;

  if (!uid) {
    throw new Error("Firebase token returned no user.");
  }

  return uid;
}
