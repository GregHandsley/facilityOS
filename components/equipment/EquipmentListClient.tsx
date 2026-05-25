"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Box, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFacilityEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import { can } from "@/lib/rbac/can";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export function EquipmentListClient() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const canManageEquipment = can(user, "manage_equipment");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const [equipmentRecords, locationRecords] = await Promise.all([
          getFacilityEquipment(user.facilityId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        setEquipment(equipmentRecords);
        setLocations(locationRecords);
      } catch {
        if (isMounted) {
          setMessage("Equipment could not be loaded.");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const locationNames = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location.name]));
  }, [locations]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {equipment.length} active equipment profiles
        </p>
        {canManageEquipment ? (
          <Button asChild>
            <Link href="/app/equipment/new">
              <Plus className="h-4 w-4" />
              New equipment
            </Link>
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {equipment.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {equipment.map((item) => (
            <Link href={`/app/equipment/${item.id}`} key={item.id}>
              <PremiumCard className="h-full transition hover:border-primary/40 hover:bg-white/[0.065]">
                <div className="flex gap-4">
                  <EquipmentImage imageUrl={item.imageUrl} name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="truncate text-lg font-semibold">{item.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.manufacturer || "Unknown manufacturer"} ·{" "}
                          {item.model || "No model"}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {locationNames.get(item.locationId) ?? "Unassigned location"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      QR slug: {item.publicSlug}
                    </p>
                  </div>
                </div>
              </PremiumCard>
            </Link>
          ))}
        </div>
      ) : (
        <PremiumCard className="flex min-h-56 flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-facility-green">
            <Box className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">No equipment yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Add equipment profiles once your facility locations are ready.
          </p>
        </PremiumCard>
      )}
    </section>
  );
}

function EquipmentImage({ imageUrl, name }: { imageUrl: string; name: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="h-24 w-24 shrink-0 rounded-2xl object-cover"
        src={imageUrl}
      />
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-facility-green">
      <Box className="h-8 w-8" />
    </div>
  );
}
