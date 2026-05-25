"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEquipment } from "@/lib/db/equipment";
import {
  createOutOfOrderEvent,
  createOutOfOrderEventId,
  uploadOutOfOrderPhoto,
} from "@/lib/db/out-of-order";
import {
  outOfOrderSeverityOptions,
  outOfOrderSeverityLabels,
} from "@/lib/out-of-order/labels";
import type { Equipment } from "@/types/equipment";
import type { OutOfOrderSeverity } from "@/types/out-of-order";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export function OutOfOrderClient({ equipmentId }: { equipmentId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<OutOfOrderSeverity>("medium");
  const [unsafe, setUnsafe] = useState(true);
  const [unavailable, setUnavailable] = useState(true);
  const [note, setNote] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      if (!user) {
        return;
      }

      try {
        const equipmentRecord = await getEquipment(equipmentId);

        if (!isMounted) {
          return;
        }

        if (!equipmentRecord || equipmentRecord.facilityId !== user.facilityId) {
          setMessage("Equipment was not found.");
          return;
        }

        setEquipment(equipmentRecord);
      } catch {
        if (isMounted) {
          setMessage("Equipment could not be loaded.");
        }
      }
    }

    void loadEquipment();

    return () => {
      isMounted = false;
    };
  }, [equipmentId, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!equipment || !user) {
      return;
    }

    if (!reason.trim()) {
      setMessage("Add a reason before marking this equipment out of order.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const eventId = createOutOfOrderEventId();
      const photoUrl = photoFile
        ? await uploadOutOfOrderPhoto({
            eventId,
            facilityId: equipment.facilityId,
            file: photoFile,
          })
        : "";

      await createOutOfOrderEvent({
        createdBy: user.id,
        equipmentId: equipment.id,
        eventId,
        facilityId: equipment.facilityId,
        locationId: equipment.locationId,
        note,
        photoUrl,
        publicSlug: equipment.publicSlug,
        reason,
        severity,
        unavailable,
        unsafe,
      });

      router.push(`/app/equipment/${equipment.id}`);
    } catch {
      setMessage("Equipment could not be marked out of order.");
    } finally {
      setIsSaving(false);
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
      <PremiumCard>
        <Button asChild variant="ghost" className="mb-6 w-fit px-3">
          <Link href={`/app/equipment/${equipment.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Equipment
          </Link>
        </Button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-facility-red/15 text-facility-red">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Marking out of order</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {equipment.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This immediately turns the public QR status red and creates a manager
              issue for follow-up.
            </p>
          </div>
        </div>
      </PremiumCard>

      <PremiumCard>
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Reason</span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setReason(event.target.value)}
              placeholder="What is wrong or unsafe?"
              required
              value={reason}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Severity</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setSeverity(event.target.value as OutOfOrderSeverity)}
              value={severity}
            >
              {outOfOrderSeverityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">
              Current severity: {outOfOrderSeverityLabels[severity]}
            </p>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <input
                checked={unsafe}
                className="h-4 w-4 accent-facility-green"
                onChange={(event) => setUnsafe(event.target.checked)}
                type="checkbox"
              />
              Unsafe to use
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <input
                checked={unavailable}
                className="h-4 w-4 accent-facility-green"
                onChange={(event) => setUnavailable(event.target.checked)}
                type="checkbox"
              />
              Unavailable
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Photo</span>
            <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <Camera className="h-5 w-5 shrink-0 text-facility-green" />
              <input
                accept="image/*"
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-sm file:text-foreground"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setPhotoFile(nextFile);
                  setPhotoPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
                }}
                type="file"
              />
            </div>
          </label>

          {photoPreviewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Out of order evidence preview"
                className="max-h-64 w-full object-contain"
                src={photoPreviewUrl}
              />
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Staff note</span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional context for the manager."
              value={note}
            />
          </label>

          {message ? (
            <p className="rounded-2xl border border-facility-red/25 bg-facility-red/10 px-4 py-3 text-sm text-facility-red">
              {message}
            </p>
          ) : null}

          <Button disabled={isSaving} type="submit" className="w-full">
            <AlertTriangle className="h-4 w-4" />
            {isSaving ? "Marking out of order" : "Mark out of order"}
          </Button>
        </form>
      </PremiumCard>
    </section>
  );
}
