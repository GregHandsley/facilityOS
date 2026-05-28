"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  ListChecks,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFacilityEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import { getFacilitySamplingStates } from "@/lib/db/sampling";
import { getFacilitySpotChecks, updateSpotCheckReview } from "@/lib/db/spot-checks";
import {
  getFacilityTaskInstances,
  getTaskEvidencePhotoDownloadUrl,
} from "@/lib/db/tasks";
import {
  getSpotCheckTone,
  isSpotCheckOpen,
  spotCheckStatusLabels,
  spotCheckStatusOptions,
} from "@/lib/spot-checks/labels";
import { formatTaskDueLabel } from "@/lib/tasks/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type {
  SamplingConfidence,
  SamplingState,
  SpotCheck,
  SpotCheckStatus,
} from "@/types/spot-check";
import type { CareTaskInstance } from "@/types/task";

export function SpotChecksClient() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [spotChecks, setSpotChecks] = useState<SpotCheck[]>([]);
  const [samplingStates, setSamplingStates] = useState<SamplingState[]>([]);
  const [tasks, setTasks] = useState<CareTaskInstance[]>([]);
  const [taskPhotoUrls, setTaskPhotoUrls] = useState<Record<string, string>>({});
  const [activeStatus, setActiveStatus] = useState<Record<string, SpotCheckStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSpotChecks() {
      if (!user) {
        return;
      }

      try {
        const [
          equipmentRecords,
          locationRecords,
          samplingRecords,
          spotCheckRecords,
          taskRecords,
        ] =
          await Promise.all([
            getFacilityEquipment(user.facilityId),
            getFacilityLocations(user.facilityId),
            getFacilitySamplingStates(user.facilityId),
            getFacilitySpotChecks(user.facilityId),
            getFacilityTaskInstances(user.facilityId),
          ]);

        if (!isMounted) {
          return;
        }

        setEquipment(equipmentRecords);
        setLocations(locationRecords);
        setSamplingStates(samplingRecords);
        setSpotChecks(spotCheckRecords);
        setTasks(taskRecords);
        setActiveStatus(
          Object.fromEntries(
            spotCheckRecords.map((spotCheck) => [spotCheck.id, spotCheck.status]),
          ),
        );
        setNotes(
          Object.fromEntries(
            spotCheckRecords.map((spotCheck) => [spotCheck.id, spotCheck.managerNote]),
          ),
        );

        const photoEntries = await Promise.all(
          taskRecords
            .filter((task) => task.photoUrl)
            .map(async (task) => {
              try {
                return [task.id, await getTaskEvidencePhotoDownloadUrl(task.photoUrl)] as const;
              } catch {
                return [task.id, ""] as const;
              }
            }),
        );

        if (isMounted) {
          setTaskPhotoUrls(Object.fromEntries(photoEntries.filter(([, url]) => url)));
        }
      } catch {
        if (isMounted) {
          setMessage("Spot checks could not be loaded.");
        }
      }
    }

    void loadSpotChecks();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const equipmentNames = useMemo(
    () => new Map(equipment.map((item) => [item.id, item.name])),
    [equipment],
  );
  const locationNames = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const visibleSpotChecks = useMemo(() => {
    const supersededSpotCheckIds = new Set(
      tasks.map((task) => task.sourceSpotCheckId).filter(Boolean),
    );

    return spotChecks.filter((spotCheck) => !supersededSpotCheckIds.has(spotCheck.id));
  }, [spotChecks, tasks]);
  const pendingCount = visibleSpotChecks.filter((spotCheck) =>
    isSpotCheckOpen(spotCheck.status),
  ).length;
  const failedCount = visibleSpotChecks.filter(
    (spotCheck) => spotCheck.status === "failed" || spotCheck.status === "escalated",
  ).length;
  const passedCount = visibleSpotChecks.filter((spotCheck) => spotCheck.status === "passed").length;

  async function saveReview(spotCheck: SpotCheck) {
    if (!user) {
      return;
    }

    setSavingId(spotCheck.id);
    setMessage(null);

    try {
      const updatedSpotCheck = await updateSpotCheckReview({
        managerNote: notes[spotCheck.id] ?? "",
        reviewedBy: user.id,
        spotCheck,
        status: activeStatus[spotCheck.id] ?? spotCheck.status,
        task: tasksById.get(spotCheck.taskId) ?? fallbackTaskFromSpotCheck(spotCheck),
      });
      let samplingRecords = samplingStates;

      try {
        samplingRecords = await getFacilitySamplingStates(user.facilityId);
      } catch {
        // The review has saved; keep the current confidence cards if the refresh cannot complete.
      }

      setSpotChecks((current) =>
        current.map((item) => (item.id === spotCheck.id ? updatedSpotCheck : item)),
      );
      setSamplingStates(samplingRecords);
      setMessage("Spot check reviewed.");
    } catch {
      setMessage("Spot check could not be reviewed.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SpotCheckMetric label="Open checks" value={String(pendingCount)} />
        <SpotCheckMetric label="Passed" value={String(passedCount)} />
        <SpotCheckMetric label="Failed or escalated" value={String(failedCount)} />
      </div>

      <PremiumCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Sampling confidence</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sampling rates adapt by facility, location, staff member and task category.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
            {samplingStates.length} active signals
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {samplingStates.length > 0 ? (
            samplingStates.slice(0, 6).map((state) => (
              <SamplingStateCard key={state.id} state={state} />
            ))
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-muted-foreground md:col-span-2">
              Confidence states will appear after managers review spot checks.
            </p>
          )}
        </div>
      </PremiumCard>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {visibleSpotChecks.length > 0 ? (
        <div className="grid gap-4">
          {visibleSpotChecks.map((spotCheck) => {
            const task = tasksById.get(spotCheck.taskId);

            return (
              <SpotCheckCard
                activeStatus={activeStatus[spotCheck.id] ?? spotCheck.status}
                equipmentName={equipmentNames.get(spotCheck.equipmentId) ?? "Equipment"}
                isSaving={savingId === spotCheck.id}
                isOwnWork={spotCheck.staffUserId === user?.id}
                key={spotCheck.id}
                locationName={locationNames.get(spotCheck.locationId) ?? "Facility area"}
                managerNote={notes[spotCheck.id] ?? ""}
                onChangeNote={(value) =>
                  setNotes((current) => ({ ...current, [spotCheck.id]: value }))
                }
                onChangeStatus={(value) =>
                  setActiveStatus((current) => ({ ...current, [spotCheck.id]: value }))
                }
                onSave={() => void saveReview(spotCheck)}
                photoUrl={task ? taskPhotoUrls[task.id] ?? "" : ""}
                spotCheck={spotCheck}
                task={task}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="No spot checks yet"
          description="Completed Level 4 tasks and sampled task completions will appear here for manager review."
        />
      )}
    </section>
  );
}

function fallbackTaskFromSpotCheck(spotCheck: SpotCheck): CareTaskInstance {
  const now = new Date().toISOString();

  return {
    category: "inspection",
    checklistCompleted: [],
    checklistItems: [],
    completedAt: spotCheck.reviewedAt || now,
    completedBy: spotCheck.staffUserId,
    createdAt: spotCheck.createdAt,
    description: "",
    dueAt: spotCheck.createdAt,
    equipmentId: spotCheck.equipmentId,
    evidence: "",
    evidenceLevel: "quick",
    facilityId: spotCheck.facilityId,
    id: spotCheck.taskId,
    locationId: spotCheck.locationId,
    note: "",
    photoUrl: "",
    qrConfirmation: "",
    scheduleId: "",
    status: "completed",
    title: "Spot check task",
    updatedAt: spotCheck.updatedAt,
  };
}

function SpotCheckMetric({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </PremiumCard>
  );
}

function SamplingStateCard({ state }: { state: SamplingState }) {
  const toneClass = getConfidenceClass(state.confidence);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {state.scope} · {state.scopeId}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {state.explanation}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>
          {state.confidence}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <span className="rounded-xl bg-white/[0.04] p-2">
          {Math.round(state.sampleRate * 100)}% sample
        </span>
        <span className="rounded-xl bg-white/[0.04] p-2">
          {state.passedChecks} passed
        </span>
        <span className="rounded-xl bg-white/[0.04] p-2">
          {state.failedChecks} failed
        </span>
      </div>
    </div>
  );
}

function getConfidenceClass(confidence: SamplingConfidence) {
  if (confidence === "red") {
    return "bg-facility-red/15 text-facility-red";
  }

  if (confidence === "amber") {
    return "bg-facility-amber/15 text-facility-amber";
  }

  return "bg-facility-green/15 text-facility-green";
}

function SpotCheckCard({
  activeStatus,
  equipmentName,
  isSaving,
  isOwnWork,
  locationName,
  managerNote,
  onChangeNote,
  onChangeStatus,
  onSave,
  photoUrl,
  spotCheck,
  task,
}: {
  activeStatus: SpotCheckStatus;
  equipmentName: string;
  isSaving: boolean;
  isOwnWork: boolean;
  locationName: string;
  managerNote: string;
  onChangeNote: (value: string) => void;
  onChangeStatus: (value: SpotCheckStatus) => void;
  onSave: () => void;
  photoUrl: string;
  spotCheck: SpotCheck;
  task?: CareTaskInstance;
}) {
  const tone = getSpotCheckTone(spotCheck.status);
  const Icon = tone === "green" ? ShieldCheck : tone === "red" ? AlertTriangle : ClipboardCheck;

  return (
    <PremiumCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              tone === "green"
                ? "bg-facility-green/15 text-facility-green"
                : tone === "red"
                  ? "bg-facility-red/15 text-facility-red"
                  : "bg-facility-amber/15 text-facility-amber"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-facility-green">{locationName}</p>
            <h2 className="mt-1 text-xl font-semibold">{task?.title ?? "Task review"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{equipmentName}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {spotCheckStatusLabels[spotCheck.status]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {spotCheck.sampleReason}
              </span>
              {task ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  Completed {formatTaskDueLabel(task.completedAt)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Button asChild size="sm" variant="secondary">
          <Link href={`/app/tasks/${spotCheck.taskId}`}>
            Review task
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <TaskEvidencePanel photoUrl={photoUrl} task={task} />

      <div className="mt-5 grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Review outcome</span>
          <select
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
            disabled={isOwnWork}
            onChange={(event) => onChangeStatus(event.target.value as SpotCheckStatus)}
            value={activeStatus}
          >
            {spotCheckStatusOptions
              .filter((status) => status.value !== "pending")
              .map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Manager note</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
            disabled={isOwnWork}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder="What did you check, and what happens next?"
            value={managerNote}
          />
        </label>
      </div>

      {isOwnWork ? (
        <p className="mt-4 rounded-2xl border border-facility-amber/25 bg-facility-amber/10 px-4 py-3 text-sm text-facility-amber">
          This spot check was generated from work completed by your account. Another manager
          must review it so the assurance check remains independent.
        </p>
      ) : null}

      <Button
        className="mt-4"
        disabled={isSaving || isOwnWork}
        onClick={onSave}
        type="button"
      >
        <CheckCircle2 className="h-4 w-4" />
        {isSaving ? "Saving" : "Save review"}
      </Button>
    </PremiumCard>
  );
}

function TaskEvidencePanel({
  photoUrl,
  task,
}: {
  photoUrl: string;
  task?: CareTaskInstance;
}) {
  if (!task) {
    return (
      <div className="mt-5 rounded-2xl border border-facility-amber/25 bg-facility-amber/10 p-4 text-sm text-facility-amber">
        Task evidence could not be loaded. Open the task before saving this review.
      </div>
    );
  }

  const hasEvidence =
    task.note ||
    task.evidence ||
    task.qrConfirmation ||
    task.checklistCompleted.length > 0 ||
    task.photoUrl;

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Staff evidence</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Review the evidence before passing or failing this spot check.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
          {task.evidenceLevel.replace("_", " ")}
        </span>
      </div>

      {hasEvidence ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {task.note ? (
            <EvidenceTile icon={FileText} label="Staff note" value={task.note} />
          ) : null}
          {task.evidence ? (
            <EvidenceTile icon={FileText} label="Evidence" value={task.evidence} />
          ) : null}
          {task.qrConfirmation ? (
            <EvidenceTile icon={QrCode} label="QR confirmation" value={task.qrConfirmation} />
          ) : null}
          {task.checklistCompleted.length > 0 ? (
            <EvidenceTile
              icon={ListChecks}
              label="Checklist completed"
              value={task.checklistCompleted.join(", ")}
            />
          ) : null}
          {task.photoUrl ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                <Camera className="h-4 w-4" />
                Photo evidence
              </div>
              {photoUrl ? (
                <div className="flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Staff task evidence"
                    className="max-h-44 w-auto max-w-full rounded-lg object-contain"
                    src={photoUrl}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Photo evidence is attached. Open the task if the preview does not load.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm text-muted-foreground">
          No staff note or evidence text was submitted for this task.
        </p>
      )}
    </div>
  );
}

function EvidenceTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{value}</p>
    </div>
  );
}
