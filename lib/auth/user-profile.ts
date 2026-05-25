import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { isUserRole } from "@/lib/rbac/roles";
import type { AppUser } from "@/types/auth";

const DEFAULT_FACILITY_ID = "demo-facility";

export async function getOrCreateUserProfile(firebaseUser: User): Promise<AppUser> {
  const userRef = doc(firestore, "users", firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);
  const now = new Date().toISOString();

  if (userSnapshot.exists()) {
    const data = userSnapshot.data();
    const role = isUserRole(data.role) ? data.role : "staff";

    await setDoc(userRef, { lastLoginAt: now }, { merge: true });

    return {
      id: firebaseUser.uid,
      name: String(data.name ?? firebaseUser.displayName ?? "FacilityOS user"),
      email: String(data.email ?? firebaseUser.email ?? ""),
      role,
      facilityId: String(data.facilityId ?? DEFAULT_FACILITY_ID),
      createdAt: String(data.createdAt ?? now),
      lastLoginAt: now,
    };
  }

  const profile: AppUser = {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? "FacilityOS user",
    email: firebaseUser.email ?? "",
    role: "staff",
    facilityId: DEFAULT_FACILITY_ID,
    createdAt: now,
    lastLoginAt: now,
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  return profile;
}
