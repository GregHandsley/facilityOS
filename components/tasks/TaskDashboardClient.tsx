"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, ClipboardList, Plus, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFacilityEquipment } from "@/lib/db/equipment";
import { getFacilityLocations } from "@/lib/db/facilities";
import {
  createCareTaskSchedule,
  getFacilityCareSchedules,
  getFacilityTaskInstances,
} from "@/lib/db/tasks";
import { can } from "@/lib/rbac/can";
import {
  evidenceLevelLabels,
  evidenceLevelOptions,
  parseChecklistItems,
} from "@/lib/tasks/evidence";
import {
  formatTaskDueLabel,
  getTaskStatusTone,
  taskCategoryLabels,
  taskCategoryOptions,
  taskFrequencyOptions,
  taskStatusLabels,
} from "@/lib/tasks/labels";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type {
  CareTaskCategory,
  CareTaskFrequency,
  CareTaskInstance,
  CareTaskSchedule,
  EvidenceLevel,
} from "@/types/task";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

type ScheduleForm = {
  category: CareTaskCategory;
  description: string;
  dueDate: string;
  dueTime: string;
  equipmentId: string;
  evidenceLevel: EvidenceLevel;
  checklistText: string;
  frequency: CareTaskFrequency;
  locationId: string;
  title: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyScheduleForm: ScheduleForm = {
  category: "cleaning",
  description: "",
  dueDate: today,
  dueTime: "09:00",
  equipmentId: "",
  evidenceLevel: "quick",
  checklistText: "",
  frequency: "weekly",
  locationId: "",
  title: "",
};

export function TaskDashboardClient() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CareTaskInstance[]>([]);
  const [schedules, setSchedules] = useState<CareTaskSchedule[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [form, setForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canManageCarePlans = can(user, "manage_care_plans");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const [taskRecords, scheduleRecords, equipmentRecords, locationRecords] =
          await Promise.all([
            getFacilityTaskInstances(user.facilityId),
            getFacilityCareSchedules(user.facilityId),
            getFacilityEquipment(user.facilityId),
            getFacilityLocations(user.facilityId),
          ]);

        if (!isMounted) {
          return;
        }

        const activeLocations = locationRecords.filter((location) => !location.archived);
        setTasks(taskRecords);
        setSchedules(scheduleRecords);
        setEquipment(equipmentRecords);
        setLocations(activeLocations);
        setForm((current) => ({
          ...current,
          equipmentId: current.equipmentId || equipmentRecords[0]?.id || "",
          locationId: current.locationId || activeLocations[0]?.id || "",
        }));
      } catch {
        if (isMounted) {
          setMessage("Tasks could not be loaded.");
        }
      }
    }

    void loadData();

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
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const { schedule, task } = await createCareTaskSchedule({
        facilityId: user.facilityId,
        checklistItems: parseChecklistItems(form.checklistText),
        ...form,
      });
      setSchedules((current) => [schedule, ...current]);
      setTasks((current) => [task, ...current].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
      setForm({
        ...emptyScheduleForm,
        equipmentId: form.equipmentId,
        locationId: form.locationId,
      });
      setMessage("Care schedule created and the first task is ready.");
    } catch {
      setMessage("Care schedule could not be created.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateForm(field: keyof ScheduleForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <TaskMetric label="Open tasks" value={String(openTasks.length)} />
        <TaskMetric label="Completed" value={String(completedTasks.length)} />
        <TaskMetric label="Care schedules" value={String(schedules.length)} />
      </div>

      {canManageCarePlans ? (
        <PremiumCard>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-facility-green">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Create care schedule</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create a recurring care plan and generate the first task for staff.
              </p>
            </div>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={(event) => void handleCreateSchedule(event)}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Task title"
                onChange={(value) => updateForm("title", value)}
                placeholder="Treadmill weekly checks"
                required
                value={form.title}
              />
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Equipment</span>
                <select
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
                  onChange={(event) => updateForm("equipmentId", event.target.value)}
                  required
                  value={form.equipmentId}
                >
                  <option value="">Choose equipment</option>
                  {equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <select
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
                  onChange={(event) => updateForm("locationId", event.target.value)}
                  required
                  value={form.locationId}
                >
                  <option value="">Choose location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Category</span>
                <select
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
                  onChange={(event) =>
                    updateForm("category", event.target.value as CareTaskCategory)
                  }
                  value={form.category}
                >
                  {taskCategoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">Frequency</span>
                <select
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
                  onChange={(event) =>
                    updateForm("frequency", event.target.value as CareTaskFrequency)
                  }
                  value={form.frequency}
                >
                  {taskFrequencyOptions.map((frequency) => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">
                  Evidence level
                </span>
                <select
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
                  onChange={(event) =>
                    updateForm("evidenceLevel", event.target.value as EvidenceLevel)
                  }
                  value={form.evidenceLevel}
                >
                  {evidenceLevelOptions.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="First due date"
                  onChange={(value) => updateForm("dueDate", value)}
                  placeholder=""
                  required
                  type="date"
                  value={form.dueDate}
                />
                <TextField
                  label="Due time"
                  onChange={(value) => updateForm("dueTime", value)}
                  placeholder=""
                  required
                  type="time"
                  value={form.dueTime}
                />
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
                onChange={(event) => updateForm("description", event.target.value)}
                placeholder="What needs checking, cleaning or maintaining?"
                value={form.description}
              />
            </label>
            {form.evidenceLevel === "checklist" ? (
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground">
                  Checklist items
                </span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
                  onChange={(event) => updateForm("checklistText", event.target.value)}
                  placeholder={"Emergency stop works\nBelt condition checked\nArea is clear"}
                  required
                  value={form.checklistText}
                />
              </label>
            ) : null}
            <Button disabled={isSaving || equipment.length === 0 || locations.length === 0} type="submit">
              <Plus className="h-4 w-4" />
              {isSaving ? "Creating" : "Create schedule"}
            </Button>
          </form>
        </PremiumCard>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      {tasks.length > 0 ? (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Link href={`/app/tasks/${task.id}`} key={task.id}>
              <TaskCard
                equipmentName={equipmentNames.get(task.equipmentId) ?? "Equipment"}
                locationName={locationNames.get(task.locationId) ?? "Facility area"}
                task={task}
              />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No care tasks yet"
          description="Managers can create schedules to generate staff care tasks for equipment, rooms and areas."
        />
      )}
    </section>
  );
}

function TaskMetric({ label, value }: { label: string; value: string }) {
  return (
    <PremiumCard className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </PremiumCard>
  );
}

function TaskCard({
  equipmentName,
  locationName,
  task,
}: {
  equipmentName: string;
  locationName: string;
  task: CareTaskInstance;
}) {
  const tone = getTaskStatusTone(task.status);
  const Icon = task.status === "completed" ? CheckCircle2 : task.category === "maintenance" ? Wrench : CalendarCheck;

  return (
    <PremiumCard className="transition hover:border-primary/40 hover:bg-white/[0.065]">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            tone === "green"
              ? "bg-facility-green/15 text-facility-green"
              : tone === "red"
                ? "bg-facility-red/15 text-facility-red"
                : "bg-facility-amber/15 text-facility-amber"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {taskCategoryLabels[task.category]} · {locationName}
              </p>
              <h2 className="mt-1 text-lg font-semibold">{task.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{equipmentName}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                {taskStatusLabels[task.status]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                {evidenceLevelLabels[task.evidenceLevel]}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-muted-foreground">
                Due {formatTaskDueLabel(task.dueAt)}
              </span>
            </div>
          </div>
          {task.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>
    </PremiumCard>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
