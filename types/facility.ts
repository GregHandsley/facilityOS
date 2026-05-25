export type Facility = {
  id: string;
  name: string;
  brandColor: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocationType = "facility" | "zone" | "room" | "area";

export type FacilityLocation = {
  id: string;
  facilityId: string;
  name: string;
  type: LocationType;
  parentLocationId?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocationNode = FacilityLocation & {
  children: LocationNode[];
};
