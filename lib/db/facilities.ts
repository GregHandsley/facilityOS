import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import type { Facility, FacilityLocation, LocationType } from "@/types/facility";

type SaveFacilityInput = {
  id: string;
  name: string;
  brandColor: string;
  logoUrl?: string;
};

type CreateLocationInput = {
  facilityId: string;
  name: string;
  type: LocationType;
  parentLocationId?: string;
};

export async function getFacility(facilityId: string): Promise<Facility | null> {
  const snapshot = await getDoc(doc(firestore, "facilities", facilityId));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Facility;
}

export async function saveFacility(input: SaveFacilityInput) {
  const now = new Date().toISOString();
  const facilityRef = doc(firestore, "facilities", input.id);
  const existingFacility = await getDoc(facilityRef);
  const facility: Facility = {
    id: input.id,
    name: input.name.trim(),
    brandColor: input.brandColor,
    logoUrl: input.logoUrl?.trim() || "",
    createdAt: existingFacility.exists()
      ? String(existingFacility.data().createdAt ?? now)
      : now,
    updatedAt: now,
  };

  await setDoc(facilityRef, facility, { merge: true });

  return facility;
}

export async function getFacilityLocations(facilityId: string) {
  const snapshot = await getDocs(
    query(collection(firestore, "locations"), where("facilityId", "==", facilityId)),
  );

  return snapshot.docs
    .map((locationDoc) => locationDoc.data() as FacilityLocation)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLocation(input: CreateLocationInput) {
  const now = new Date().toISOString();
  const locationRef = doc(collection(firestore, "locations"));
  const location: FacilityLocation = {
    id: locationRef.id,
    facilityId: input.facilityId,
    name: input.name.trim(),
    type: input.type,
    parentLocationId: input.parentLocationId || "",
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(locationRef, location);

  return location;
}

export async function archiveLocation(locationId: string) {
  await updateDoc(doc(firestore, "locations", locationId), {
    archived: true,
    updatedAt: new Date().toISOString(),
  });
}
