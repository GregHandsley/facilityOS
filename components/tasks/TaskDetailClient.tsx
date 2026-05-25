"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import {
  getTaskEvidencePhotoDownloadUrl,
  getTaskInstance,
  updateTaskStatus,
  uploadTaskEvidencePhoto,
} from "@/lib/db/tasks";
import {
  evidenceLevelLabels,
  getEvidenceValidationError,
} from "@/lib/tasks/evidence";
import {
  formatTaskDueLabel,
  taskCategoryLabels,
  taskStatusLabels,
} from "@/lib/tasks/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type { CareTaskInstance } from "@/types/task";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export function TaskDetailClient({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [task, setTask] = useState<CareTaskInstance | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [checklistCompleted, setChecklistCompleted] = useState<string[]>([]);
  const [qrConfirmation, setQrConfirmation] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const taskRecord = await getTaskInstance(taskId);

        if (!isMounted) {
          return;
        }

        if (!taskRecord || taskRecord.facilityId !== user.facilityId) {
          setMessage("Task was not found.");
          return;
        }

        const [equipmentRecord, locationRecords] = await Promise.all([
          getEquipment(taskRecord.equipmentId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        setTask(taskRecord);
        setEquipment(equipmentRecord);
        setLocations(locationRecords);
        setNote(taskRecord.note);
        setEvidence(taskRecord.evidence);
        setChecklistCompleted(taskRecord.checklistCompleted ?? []);
        setQrConfirmation(taskRecord.qrConfirmation ?? "");
        setPhotoUrl(taskRecord.photoUrl ?? "");
        if (taskRecord.photoUrl) {
          try {
            const downloadUrl = await getTaskEvidencePhotoDownloadUrl(taskRecord.photoUrl);

            if (isMounted) {
              setPhotoPreviewUrl(downloadUrl);
            }
          } catch {
            if (isMounted) {
              setPhotoPreviewUrl("");
            }
          }
        }
      } catch {
        if (isMounted) {
          setMessage("Task could not be loaded.");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [taskId, user]);

  const locationName = useMemo(() => {
    return locations.find((location) => location.id === task?.locationId)?.name;
  }, [locations, task?.locationId]);

  async function completeTask() {
    if (!task || !user) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    let nextPhotoUrl = photoUrl;

    if (task.evidenceLevel === "photo_note" && photoFile) {
      try {
        nextPhotoUrl = await uploadTaskEvidencePhoto({
          facilityId: task.facilityId,
          file: photoFile,
          taskId: task.id,
        });
        setPhotoUrl(nextPhotoUrl);
      } catch {
        setMessage("Photo evidence could not be uploaded.");
        setIsSaving(false);
        return;
      }
    }

    const evidenceError = getEvidenceValidationError({
      publicSlug: equipment?.publicSlug ?? "",
      task: {
        ...task,
        checklistCompleted,
        note,
        photoUrl: nextPhotoUrl,
        qrConfirmation,
      },
    });

    if (evidenceError) {
      setMessage(evidenceError);
      setIsSaving(false);
      return;
    }

    try {
      const updatedTask = await updateTaskStatus({
        checklistCompleted,
        completedBy: user.id,
        evidence,
        note,
        photoUrl: nextPhotoUrl,
        publicSlug: equipment?.publicSlug ?? "",
        qrConfirmation,
        status: "completed",
        task,
      });
      setTask(updatedTask);
      setMessage("Task completed. Equipment care history has been updated.");
    } catch {
      setMessage("Task could not be completed.");
    } finally {
      setIsSaving(false);
    }
  }

  if (message && !task) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">{message}</p>
      </PremiumCard>
    );
  }

  if (!task) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">Loading task.</p>
      </PremiumCard>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <PremiumCard>
        <Button asChild variant="ghost" className="mb-6 w-fit px-3">
          <Link href="/app/tasks">
            <ArrowLeft className="h-4 w-4" />
            Tasks
          </Link>
        </Button>

        <p className="text-sm text-facility-green">
          {taskCategoryLabels[task.category]}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">{task.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {task.description || "No extra task instructions were added."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoTile label="Equipment" value={equipment?.name ?? "Equipment"} />
          <InfoTile label="Location" value={locationName ?? "Facility area"} />
          <InfoTile label="Due" value={formatTaskDueLabel(task.dueAt)} />
          <InfoTile label="Status" value={taskStatusLabels[task.status]} />
          <InfoTile
            label="Evidence"
            value={evidenceLevelLabels[task.evidenceLevel]}
          />
        </div>
      </PremiumCard>

      <PremiumCard>
        <h2 className="text-xl font-semibold">Complete task</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Complete the required evidence before marking the work done.
        </p>

        {task.evidenceLevel === "checklist" ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Checklist</p>
            {task.checklistItems.map((item) => (
              <label
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm"
                key={item}
              >
                <input
                  checked={checklistCompleted.includes(item)}
                  className="h-4 w-4 accent-facility-green"
                  onChange={(event) => {
                    setChecklistCompleted((current) =>
                      event.target.checked
                        ? [...current, item]
                        : current.filter((completedItem) => completedItem !== item),
                    );
                  }}
                  type="checkbox"
                />
                {item}
              </label>
            ))}
          </div>
        ) : null}

        {task.evidenceLevel === "qr" ? (
          <label className="mt-5 block">
            <span className="text-sm font-medium text-muted-foreground">
              QR confirmation
            </span>
            <input
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => setQrConfirmation(event.target.value)}
              placeholder={equipment?.publicSlug ?? "Equipment QR slug"}
              value={qrConfirmation}
            />
          </label>
        ) : null}

        <label className="mt-5 block">
          <span className="text-sm font-medium text-muted-foreground">Evidence</span>
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
            onChange={(event) => setEvidence(event.target.value)}
            placeholder="Photo reference, checklist note or confirmation"
            value={evidence}
          />
        </label>

        {task.evidenceLevel === "photo_note" ? (
          <div className="mt-4">
            <span className="text-sm font-medium text-muted-foreground">
              Photo evidence
            </span>
            <label className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <Camera className="h-5 w-5 shrink-0 text-facility-green" />
              <input
                accept="image/*"
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-sm file:text-foreground"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setPhotoFile(nextFile);
                  setPhotoUrl(nextFile ? "" : photoUrl);
                  setPhotoPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
                }}
                type="file"
              />
            </label>
            {photoPreviewUrl ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Task evidence preview"
                  className="max-h-64 w-full object-contain"
                  src={photoPreviewUrl}
                />
              </div>
            ) : null}
            {photoUrl && !photoPreviewUrl ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Existing evidence photo is attached.
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-muted-foreground">Note</span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything the manager should know?"
            value={note}
          />
        </label>

        {message ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Button
          className="mt-5 w-full"
          disabled={isSaving || task.status === "completed"}
          onClick={() => void completeTask()}
          type="button"
        >
          {task.status === "completed" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {task.status === "completed"
            ? "Task completed"
            : isSaving
              ? "Completing"
              : "Mark complete"}
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
