"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Save,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import {
  getIssue,
  getIssuePhotoDownloadUrl,
  updateIssueManagement,
} from "@/lib/db/issues";
import {
  getIssueTone,
  issueCategoryLabels,
  issuePriorityLabels,
  issuePriorityOptions,
  issueStatusLabels,
  issueStatusOptions,
} from "@/lib/issues/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type { IssuePriority, IssueStatus, ManagedIssue } from "@/types/issue";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export function IssueDetailClient({ issueId }: { issueId: string }) {
  const { user } = useAuth();
  const [issue, setIssue] = useState<ManagedIssue | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [status, setStatus] = useState<IssueStatus>("new");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [internalNotes, setInternalNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const issueRecord = await getIssue(issueId);

        if (!isMounted) {
          return;
        }

        if (!issueRecord || issueRecord.facilityId !== user.facilityId) {
          setMessage("Issue was not found.");
          return;
        }

        const [equipmentRecord, locationRecords] = await Promise.all([
          getEquipment(issueRecord.equipmentId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        setIssue(issueRecord);
        setEquipment(equipmentRecord);
        setLocations(locationRecords);
        setStatus(issueRecord.status);
        setPriority(issueRecord.priority);
        setInternalNotes(issueRecord.internalNotes ?? "");

        if (issueRecord.photoUrl) {
          try {
            const downloadUrl = await getIssuePhotoDownloadUrl(issueRecord.photoUrl);

            if (isMounted) {
              setPhotoUrl(downloadUrl);
            }
          } catch {
            if (isMounted) {
              setPhotoUrl("");
            }
          }
        }
      } catch {
        if (isMounted) {
          setMessage("Issue could not be loaded.");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [issueId, user]);

  const locationName = useMemo(() => {
    return locations.find((location) => location.id === issue?.locationId)?.name;
  }, [issue?.locationId, locations]);

  async function handleSave() {
    if (!issue) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const updatedIssue = await updateIssueManagement({
        internalNotes,
        issue,
        priority,
        status,
      });
      setIssue(updatedIssue);
      setMessage("Issue updated.");
    } catch {
      setMessage("Issue could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  if (message && !issue) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">{message}</p>
      </PremiumCard>
    );
  }

  if (!issue) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">Loading issue.</p>
      </PremiumCard>
    );
  }

  const tone = getIssueTone(issue.status, issue.priority);
  const ToneIcon = tone === "green" ? CheckCircle2 : AlertTriangle;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <PremiumCard>
        <Button asChild variant="ghost" className="mb-6 w-fit px-3">
          <Link href="/app/issues">
            <ArrowLeft className="h-4 w-4" />
            Issues
          </Link>
        </Button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              tone === "green"
                ? "bg-facility-green/15 text-facility-green"
                : tone === "red"
                  ? "bg-facility-red/15 text-facility-red"
                  : "bg-facility-amber/15 text-facility-amber"
            }`}
          >
            <ToneIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {issueCategoryLabels[issue.category]} · {issue.reporterType}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {equipment?.name ?? "Equipment issue"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {locationName ?? "Facility area"} · Reported{" "}
              {new Date(issue.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Public report
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">{issue.description}</p>
        </div>

        {issue.contactEmail ? (
          <InfoTile label="Contact email" value={issue.contactEmail} />
        ) : null}

        {issue.photoUrl ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4 text-facility-green" />
              Photo evidence
            </div>
            {photoUrl ? (
              <a
                className="mt-4 block overflow-hidden rounded-2xl border border-white/10"
                href={photoUrl}
                rel="noreferrer"
                target="_blank"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Issue evidence"
                  className="max-h-96 w-full object-cover"
                  src={photoUrl}
                />
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Evidence is attached, but the image could not be previewed.
              </p>
            )}
          </div>
        ) : null}
      </PremiumCard>

      <PremiumCard>
        <h2 className="text-xl font-semibold">Manage issue</h2>
        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setStatus(event.target.value as IssueStatus)}
              value={status}
            >
              {issueStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Priority</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setPriority(event.target.value as IssuePriority)}
              value={priority}
            >
              {issuePriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Internal notes
            </span>
            <textarea
              className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Manager notes, follow-up actions or contractor context."
              value={internalNotes}
            />
          </label>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Button
          className="mt-5 w-full"
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving" : "Save issue"}
        </Button>

        <div className="mt-5 grid gap-3 text-sm">
          <InfoTile label="Current status" value={issueStatusLabels[issue.status]} />
          <InfoTile label="Current priority" value={issuePriorityLabels[issue.priority]} />
          <InfoTile label="Issue reference" value={issue.id} />
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/public/equipment/${issue.publicSlug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              Public QR page
            </Link>
          </Button>
        </div>
      </PremiumCard>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
