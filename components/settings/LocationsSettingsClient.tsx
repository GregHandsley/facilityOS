"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, MapPinned, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  archiveLocation,
  createLocation,
  getFacilityLocations,
} from "@/lib/db/facilities";
import {
  buildLocationTree,
  getLocationParentOptions,
} from "@/lib/locations/tree";
import type {
  FacilityLocation,
  LocationNode,
  LocationType,
} from "@/types/facility";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

const locationTypes: LocationType[] = ["facility", "zone", "room", "area"];

export function LocationsSettingsClient() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType>("area");
  const [parentLocationId, setParentLocationId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const locationTree = useMemo(() => buildLocationTree(locations), [locations]);
  const parentOptions = useMemo(
    () => getLocationParentOptions(locations),
    [locations],
  );

  async function refreshLocations() {
    if (!user) {
      return;
    }

    setStatus("loading");

    try {
      setLocations(await getFacilityLocations(user.facilityId));
    } catch {
      setMessage("We could not load locations yet.");
    } finally {
      setStatus("idle");
    }
  }

  useEffect(() => {
    void refreshLocations();
    // refreshLocations is intentionally scoped to the current user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.facilityId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      await createLocation({
        facilityId: user.facilityId,
        name,
        type,
        parentLocationId,
      });
      setName("");
      setType("area");
      setParentLocationId("");
      setMessage("Location created.");
      await refreshLocations();
    } catch {
      setMessage("Location could not be created.");
      setStatus("idle");
    }
  }

  async function handleArchive(locationId: string) {
    setStatus("saving");
    setMessage(null);

    try {
      await archiveLocation(locationId);
      setMessage("Location archived.");
      await refreshLocations();
    } catch {
      setMessage("Location could not be archived.");
      setStatus("idle");
    }
  }

  const isBusy = status === "loading" || status === "saving";

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <PremiumCard>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-facility-green/15 text-facility-green">
            <MapPinned className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Create location</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Build the hierarchy that equipment and tasks will attach to in the
              next sprints.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Name</span>
            <input
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
              disabled={isBusy}
              onChange={(event) => setName(event.target.value)}
              placeholder="Cardio area"
              required
              value={name}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Type</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              disabled={isBusy}
              onChange={(event) => setType(event.target.value as LocationType)}
              value={type}
            >
              {locationTypes.map((locationType) => (
                <option key={locationType} value={locationType}>
                  {locationType}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Parent location
            </span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              disabled={isBusy}
              onChange={(event) => setParentLocationId(event.target.value)}
              value={parentLocationId}
            >
              <option value="">No parent</option>
              {parentOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.type}
                </option>
              ))}
            </select>
          </label>

          {message ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <Button disabled={isBusy} type="submit">
            <Plus className="h-4 w-4" />
            Create location
          </Button>
        </form>
      </PremiumCard>

      <PremiumCard>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Location hierarchy</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Archived locations are hidden from the active tree.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
            {locations.filter((location) => !location.archived).length} active
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {locationTree.length > 0 ? (
            locationTree.map((node) => (
              <LocationTreeItem
                isBusy={isBusy}
                key={node.id}
                node={node}
                onArchive={handleArchive}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
              No active locations yet.
            </p>
          )}
        </div>
      </PremiumCard>
    </section>
  );
}

function LocationTreeItem({
  isBusy,
  node,
  onArchive,
}: {
  isBusy: boolean;
  node: LocationNode;
  onArchive: (locationId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{node.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{node.type}</p>
        </div>
        <Button
          disabled={isBusy}
          onClick={() => void onArchive(node.id)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Archive className="h-4 w-4" />
          Archive
        </Button>
      </div>

      {node.children.length > 0 ? (
        <div className="mt-3 space-y-3 border-l border-white/10 pl-3">
          {node.children.map((child) => (
            <LocationTreeItem
              isBusy={isBusy}
              key={child.id}
              node={child}
              onArchive={onArchive}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
