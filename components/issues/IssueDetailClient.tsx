"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { firebaseAuth } from "@/lib/firebase/client";
import { can } from "@/lib/rbac/can";
import { getEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import {
  getFacilityIssues,
  getIssue,
  getIssuePhotoDownloadUrl,
  updateIssueAiAnalysis,
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
import { publicIssueCategories } from "@/lib/issues/public-report";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type {
  AiIssueAnalysis,
  IssueCategory,
  IssuePriority,
  IssueStatus,
  ManagedIssue,
} from "@/types/issue";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export function IssueDetailClient({ issueId }: { issueId: string }) {
  const { user } = useAuth();
  const [issue, setIssue] = useState<ManagedIssue | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [category, setCategory] = useState<IssueCategory>("equipment_fault");
  const [status, setStatus] = useState<IssueStatus>("new");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [internalNotes, setInternalNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
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

        const [equipmentRecord, locationRecords, issueRecords] = await Promise.all([
          getEquipment(issueRecord.equipmentId),
          getFacilityLocations(user.facilityId),
          getFacilityIssues(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        setIssue(issueRecord);
        setEquipment(equipmentRecord);
        setLocations(locationRecords);
        setCategory(issueRecord.aiAnalysis?.category ?? issueRecord.category);
        setStatus(issueRecord.status);
        setPriority(issueRecord.aiAnalysis?.priority ?? issueRecord.priority);
        setInternalNotes(issueRecord.internalNotes ?? "");

        if (
          can(user, "view_ai_insights") &&
          equipmentRecord &&
          !issueRecord.aiAnalysis &&
          !issueRecord.aiError
        ) {
          const resolvedLocationName =
            locationRecords.find((location) => location.id === issueRecord.locationId)
              ?.name ?? "Facility area";

          void handleAnalyzeIssue({
            equipmentName: equipmentRecord.name,
            issueRecord,
            locationLabel: resolvedLocationName,
            recentIssues: issueRecords,
          });
        }

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
    // Assistant review is intentionally triggered only by the initial issue load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        category,
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

  async function handleAnalyzeIssue({
    equipmentName = equipment?.name ?? "Equipment",
    issueRecord = issue,
    locationLabel = locationName ?? "Facility area",
    recentIssues = [],
  }: {
    equipmentName?: string;
    issueRecord?: ManagedIssue | null;
    locationLabel?: string;
    recentIssues?: ManagedIssue[];
  } = {}) {
    if (!issueRecord || !user || !can(user, "view_ai_insights") || isAiAnalyzing) {
      return;
    }

    setIsAiAnalyzing(true);

    try {
      const token = await firebaseAuth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Authentication token was unavailable.");
      }

      const response = await fetch("/api/ai/fault-analysis", {
        body: JSON.stringify({
          equipmentName,
          issue: issueRecord,
          locationName: locationLabel,
          recentIssues,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Assistant review request failed.");
      }

      const payload = (await response.json()) as { analysis?: AiIssueAnalysis };

      if (!payload.analysis) {
        throw new Error("Assistant review response was empty.");
      }

      const updatedIssue = await updateIssueAiAnalysis({
        analysis: payload.analysis,
        issue: issueRecord,
      });
      setIssue(updatedIssue);
      setCategory(payload.analysis.category);
      setPriority(payload.analysis.priority);
    } catch (error) {
      console.error("Assistant review failed", error);
      try {
        const updatedIssue = await updateIssueAiAnalysis({
          error:
            "Assistant review could not be generated. The issue is still available for manager review.",
          issue: issueRecord,
        });
        setIssue(updatedIssue);
      } catch (saveError) {
        console.error("Assistant review save failed", saveError);
        setMessage(
          saveError instanceof Error
            ? `Assistant review could not be saved: ${saveError.message}`
            : "Assistant review could not be saved.",
        );
      }
    } finally {
      setIsAiAnalyzing(false);
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
  const hasManualChanges =
    category !== issue.category ||
    priority !== issue.priority ||
    status !== issue.status ||
    internalNotes.trim() !== (issue.internalNotes ?? "").trim();

  return (
    <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)]">
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
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {issueCategoryLabels[issue.category]} · {issue.reporterType}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-3xl font-semibold tracking-normal">
                {equipment?.name ?? "Equipment issue"}
              </h1>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                  {issueStatusLabels[issue.status]}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                  {issuePriorityLabels[issue.priority]}
                </span>
              </div>
            </div>
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
          <p className="mt-3 text-base leading-7 text-foreground">
            {issue.description}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Issue reference" value={issue.id} />
          {issue.contactEmail ? (
            <InfoTile label="Contact email" value={issue.contactEmail} />
          ) : (
            <InfoTile label="Reporter" value="No follow-up email supplied" />
          )}
        </div>

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

        {issue.internalNotes?.trim() ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Manager log
            </p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-facility-graphite/70 p-4">
              <p className="text-sm leading-6 text-foreground">
                {issue.internalNotes}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {issue.updatedAt
                  ? `Updated ${new Date(issue.updatedAt).toLocaleString()}`
                  : "Manager note"}
              </p>
            </div>
          </div>
        ) : null}
      </PremiumCard>

      <PremiumCard>
        <h2 className="text-xl font-semibold">Manage issue</h2>

        {can(user, "view_ai_insights") ? (
          <AiAnalysisCard
            analysis={issue.aiAnalysis}
            equipment={equipment}
            error={issue.aiError}
            isAnalyzing={isAiAnalyzing}
            issue={issue}
            onRetry={() => void handleAnalyzeIssue()}
          />
        ) : null}

        <div className="mt-5 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Category</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setCategory(event.target.value as IssueCategory)}
              value={category}
            >
              {publicIssueCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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

        {hasManualChanges ? (
          <Button
            className="mt-5 w-full"
            disabled={isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving" : "Save update"}
          </Button>
        ) : null}

        <Button asChild variant="secondary" className="mt-3 w-full">
          <Link href={`/public/equipment/${issue.publicSlug}`} target="_blank">
            <ExternalLink className="h-4 w-4" />
            Public QR page
          </Link>
        </Button>
      </PremiumCard>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function AiAnalysisCard({
  analysis,
  equipment,
  error,
  isAnalyzing,
  issue,
  onRetry,
}: {
  analysis?: AiIssueAnalysis;
  equipment: Equipment | null;
  error?: string;
  isAnalyzing: boolean;
  issue: ManagedIssue;
  onRetry: () => void;
}) {
  const cardTone = analysis?.isSafetyRelated
    ? "border-facility-red/25 bg-facility-red/10"
    : analysis?.priority === "high" || analysis?.priority === "critical"
      ? "border-facility-amber/25 bg-facility-amber/10"
      : "border-primary/20 bg-primary/5";
  const potentialFixes = analysis ? getPotentialFixes({ analysis, equipment, issue }) : [];

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${cardTone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">Assistant review</h3>
            <p className="text-xs text-muted-foreground">
              Category and priority are filled in for you.
            </p>
          </div>
        </div>
        <Button
          className="h-9 px-3 text-xs"
          disabled={isAnalyzing}
          onClick={onRetry}
          type="button"
          variant="secondary"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {analysis ? "Review again" : "Check"}
        </Button>
      </div>

      {isAnalyzing ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          Checking the report and filling in the details.
        </p>
      ) : analysis ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm leading-6 text-foreground">{analysis.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-muted-foreground">
              {analysis.affectedComponent}
            </span>
            {analysis.isSafetyRelated ? (
              <span className="rounded-full border border-facility-red/25 bg-facility-red/10 px-3 py-1 text-facility-red">
                Safety signal
              </span>
            ) : null}
            {analysis.duplicateOrRepeat ? (
              <span className="rounded-full border border-facility-amber/25 bg-facility-amber/10 px-3 py-1 text-facility-amber">
                Possible repeat
              </span>
            ) : null}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Potential fixes
            </p>
            <ul className="mt-2 grid gap-2 text-sm leading-5 text-muted-foreground">
              {potentialFixes.map((fix) => (
                <li className="flex gap-2" key={fix}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{fix}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {error || "Assistant review will run when this issue is opened by a manager."}
        </p>
      )}
    </div>
  );
}

function getPotentialFixes({
  analysis,
  equipment,
  issue,
}: {
  analysis: AiIssueAnalysis;
  equipment: Equipment | null;
  issue: ManagedIssue;
}) {
  const equipmentLabel = equipment?.name ?? "this equipment";
  const equipmentText = `${equipment?.name ?? ""} ${equipment?.equipmentType ?? ""} ${
    equipment?.manufacturer ?? ""
  } ${equipment?.model ?? ""}`.toLowerCase();
  const reportText = `${issue.description} ${analysis.affectedComponent}`.toLowerCase();
  const fixes = new Set<string>();

  fixes.add(analysis.recommendedAction);

  if (analysis.isSafetyRelated || issue.category === "safety_concern") {
    fixes.add(`Keep ${equipmentLabel} out of service until a physical inspection is complete.`);
  }

  if (matchesAny(`${equipmentText} ${reportText}`, ["bike", "cycle", "spin", "watt"])) {
    if (matchesAny(reportText, ["pedal", "crank", "fell off", "came off", "detached"])) {
      fixes.add("Check pedal threads, crank arm, retaining bolts and signs of rounding or cross-threading.");
      fixes.add("Replace the pedal or crank assembly if there is movement, stripped threading or impact damage.");
    } else {
      fixes.add("Check pedals, crank arms, saddle, handlebars and resistance mechanism for looseness or play.");
    }
  } else if (matchesAny(`${equipmentText} ${reportText}`, ["treadmill", "running"])) {
    fixes.add("Inspect belt alignment, deck condition, rollers and emergency stop before returning to use.");
    fixes.add("Run a low-speed test and listen for slipping, rubbing or motor strain.");
  } else if (matchesAny(`${equipmentText} ${reportText}`, ["ski", "row", "erg"])) {
    fixes.add("Inspect handle, strap/cable, chain path, flywheel and return mechanism for wear or snagging.");
  } else if (matchesAny(`${equipmentText} ${reportText}`, ["stair", "step"])) {
    fixes.add("Inspect steps, side rails, drive motion and emergency stop for instability or sticking.");
  } else if (matchesAny(`${equipmentText} ${reportText}`, ["bench", "rack", "platform"])) {
    fixes.add("Check frame welds, pads, fasteners and floor contact points for movement or damage.");
  } else if (analysis.category === "cleaning_issue") {
    fixes.add(`Add ${equipmentLabel} to the next cleaning round and confirm once wiped down.`);
  } else {
    fixes.add(`Inspect ${equipmentLabel} against its normal safe operating condition before closing the issue.`);
  }

  if (analysis.duplicateOrRepeat) {
    fixes.add("Check recent history before closing; repeated reports may need maintenance rather than another quick fix.");
  }

  return [...fixes].filter(Boolean).slice(0, 4);
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
