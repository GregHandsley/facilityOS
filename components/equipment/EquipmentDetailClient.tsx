"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Box, Edit3, MapPinned, QrCode } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { archiveEquipment, getEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import { can } from "@/lib/rbac/can";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export function EquipmentDetailClient({ equipmentId }: { equipmentId: string }) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const [equipmentRecord, locationRecords] = await Promise.all([
          getEquipment(equipmentId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        if (!equipmentRecord || equipmentRecord.facilityId !== user.facilityId) {
          setMessage("Equipment was not found.");
          return;
        }

        setEquipment(equipmentRecord);
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
  }, [equipmentId, user]);

  const locationName = useMemo(() => {
    return locations.find((location) => location.id === equipment?.locationId)?.name;
  }, [equipment?.locationId, locations]);

  async function handleArchive() {
    if (!equipment) {
      return;
    }

    setIsArchiving(true);

    try {
      await archiveEquipment(equipment.id);
      setEquipment({ ...equipment, archived: true });
      setMessage("Equipment archived.");
    } catch {
      setMessage("Equipment could not be archived.");
    } finally {
      setIsArchiving(false);
    }
  }

  if (message && !equipment) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">{message}</p>
      </PremiumCard>
    );
  }

  if (!equipment) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">Loading equipment.</p>
      </PremiumCard>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <PremiumCard className="overflow-hidden">
        {equipment.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={equipment.name}
            className="aspect-[4/3] w-full rounded-2xl object-cover"
            src={equipment.imageUrl}
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-white/[0.06] text-facility-green">
            <Box className="h-12 w-12" />
          </div>
        )}
      </PremiumCard>

      <PremiumCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-facility-green">{equipment.equipmentType}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {equipment.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {equipment.manufacturer || "Unknown manufacturer"} ·{" "}
              {equipment.model || "No model"}
            </p>
          </div>
          <StatusBadge status={equipment.status} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Equipment number" value={equipment.equipmentNumber || "-"} />
          <InfoTile label="Public QR slug" value={equipment.publicSlug} />
          <InfoTile
            icon={<MapPinned className="h-4 w-4" />}
            label="Location"
            value={locationName ?? "Unassigned"}
          />
          <InfoTile
            icon={<QrCode className="h-4 w-4" />}
            label="Public page"
            value={equipment.publicVisible ? "Enabled" : "Hidden"}
          />
        </div>

        {equipment.description ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-muted-foreground">
            {equipment.description}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href="/app/equipment">Back to equipment</Link>
          </Button>
          {can(user, "manage_equipment") && !equipment.archived ? (
            <>
              <Button asChild variant="secondary">
                <Link href={`/app/equipment/${equipment.id}/edit`}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button
                disabled={isArchiving}
                onClick={() => void handleArchive()}
                type="button"
                variant="ghost"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            </>
          ) : null}
        </div>
      </PremiumCard>
    </section>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
