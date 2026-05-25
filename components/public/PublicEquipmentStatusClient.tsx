"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import type { PublicEquipmentStatus } from "@/types/equipment";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export function PublicEquipmentStatusClient({
  equipment,
}: {
  equipment: PublicEquipmentStatus;
}) {
  return (
    <main className="min-h-screen px-4 py-4 pb-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold">FacilityOS</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Public equipment status
            </p>
          </div>
          <StatusBadge label={equipment.statusCopy} status={equipment.status} />
        </header>

        <PremiumCard className="p-4 sm:p-5">
          <div className="flex gap-4">
            <EquipmentImage imageUrl={equipment.imageUrl} name={equipment.name} />

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{equipment.locationName}</span>
              </p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">
                {equipment.name}
              </h1>
              <p className="mt-2 truncate text-sm text-muted-foreground">
                {[equipment.manufacturer, equipment.model].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Current status
                </p>
                <p className="mt-1 text-xl font-semibold">{equipment.statusCopy}</p>
              </div>
              <StatusBadge
                label={equipment.status.toUpperCase()}
                status={equipment.status}
              />
            </div>

            {equipment.isOutOfOrder ? (
              <div className="mt-4 rounded-xl border border-facility-red/25 bg-facility-red/10 p-3 text-sm leading-6 text-facility-red">
                This equipment is currently out of use. The issue has been logged
                and the team has been notified.
              </div>
            ) : null}

            <Button asChild className="mt-4 w-full">
              <Link href={`/public/equipment/${equipment.publicSlug}/report`}>
                Report a fault
              </Link>
            </Button>
          </div>
        </PremiumCard>

        <section className="grid grid-cols-2 gap-3">
          <PublicFact
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Cleaning"
            value={equipment.lastCleanedLabel}
          />
          <PublicFact
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Maintenance"
            value={equipment.lastMaintainedLabel}
          />
          <PublicFact
            icon={<Clock3 className="h-5 w-5" />}
            label="Inspection"
            value={equipment.lastInspectedLabel}
          />
          <PublicFact
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Active faults"
            value={equipment.hasActiveFault ? "Issue active" : "No active public faults"}
          />
        </section>
      </div>
    </main>
  );
}

function EquipmentImage({
  imageUrl,
  name,
}: {
  imageUrl: string;
  name: string;
}) {
  return (
    <div className="relative flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] sm:h-28 sm:w-28">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={name} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-facility-green">
          <Box className="h-9 w-9" />
        </div>
      )}
    </div>
  );
}

function PublicFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <PremiumCard className="p-4">
      <div className="flex min-h-28 flex-col justify-between gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-facility-green">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{value}</p>
        </div>
      </div>
    </PremiumCard>
  );
}
