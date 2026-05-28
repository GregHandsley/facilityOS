"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, Send } from "lucide-react";
import {
  createPublicFaultReportWithId,
  createPublicIssueId,
  uploadPublicFaultPhoto,
} from "@/lib/db/issues";
import { validatePublicIssueReport } from "@/lib/issues/public-report";
import type { IssueCategory } from "@/types/issue";
import type { PublicEquipmentStatus } from "@/types/equipment";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export function PublicFaultReportClient({
  equipment,
}: {
  equipment: PublicEquipmentStatus;
}) {
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submittedIssueId, setSubmittedIssueId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const issueId = createPublicIssueId();
    const baseInput = {
      category: "equipment_fault" as IssueCategory,
      contactEmail,
      description,
      equipmentId: equipment.equipmentId,
      facilityId: equipment.facilityId,
      locationId: equipment.locationId,
      publicSlug: equipment.publicSlug,
    };
    const validationError = validatePublicIssueReport(baseInput);

    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const photoUrl = photo
        ? await uploadPublicFaultPhoto({
            facilityId: equipment.facilityId,
            file: photo,
            issueId,
          })
        : "";

      await createPublicFaultReportWithId({
        id: issueId,
        input: {
          ...baseInput,
          photoUrl,
        },
      });

      setSubmittedIssueId(issueId);
    } catch {
      setMessage("The report could not be submitted. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedIssueId) {
    return (
      <PublicReportShell equipment={equipment}>
        <PremiumCard>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-facility-green/15 text-facility-green">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Report sent</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Thanks. The team has been notified and this equipment profile now
            shows that an issue has been reported.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            Reference: {submittedIssueId}
          </div>
          <Button asChild className="mt-6 w-full">
            <Link href={`/public/equipment/${equipment.publicSlug}`}>
              Back to equipment status
            </Link>
          </Button>
        </PremiumCard>
      </PublicReportShell>
    );
  }

  return (
    <PublicReportShell equipment={equipment}>
      <PremiumCard>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-facility-amber/15 text-facility-amber">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Report a fault</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Tell the team what you noticed. You do not need an account.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              What is wrong?
            </span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="For example: belt is slipping, loose handle, unusual noise, needs cleaning..."
              required
              value={description}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Photo
            </span>
            <div className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <Camera className="h-5 w-5 shrink-0 text-facility-green" />
              <input
                accept="image/*"
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-sm file:text-foreground"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                type="file"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Email for follow-up
            </span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="Optional"
              type="email"
              value={contactEmail}
            />
          </label>

          {message ? (
            <p className="rounded-2xl border border-facility-amber/25 bg-facility-amber/10 px-4 py-3 text-sm text-facility-amber">
              {message}
            </p>
          ) : null}

          <Button disabled={isSubmitting} type="submit" className="w-full">
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending report" : "Send report"}
          </Button>
        </form>
      </PremiumCard>
    </PublicReportShell>
  );
}

function PublicReportShell({
  children,
  equipment,
}: {
  children: React.ReactNode;
  equipment: PublicEquipmentStatus;
}) {
  return (
    <main className="min-h-screen px-4 py-4 pb-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <Button asChild variant="ghost" className="w-fit px-3">
          <Link href={`/public/equipment/${equipment.publicSlug}`}>
            <ArrowLeft className="h-4 w-4" />
            Status
          </Link>
        </Button>

        <PremiumCard className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Reporting for
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold">{equipment.name}</h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {equipment.locationName}
              </p>
            </div>
            <StatusBadge label={equipment.statusCopy} status={equipment.status} />
          </div>
        </PremiumCard>

        {children}
      </div>
    </main>
  );
}
