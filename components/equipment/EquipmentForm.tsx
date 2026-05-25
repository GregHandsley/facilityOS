"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { getFacilityLocations } from "@/lib/db/facilities";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export type EquipmentFormValues = {
  name: string;
  manufacturer: string;
  model: string;
  equipmentType: string;
  equipmentNumber: string;
  description: string;
  imageUrl: string;
  locationId: string;
  publicVisible: boolean;
};

const emptyForm: EquipmentFormValues = {
  name: "",
  manufacturer: "",
  model: "",
  equipmentType: "",
  equipmentNumber: "",
  description: "",
  imageUrl: "",
  locationId: "",
  publicVisible: true,
};

export function EquipmentForm({
  equipment,
  facilityId,
  isSaving,
  message,
  onSubmit,
  submitLabel,
}: {
  equipment?: Equipment;
  facilityId: string;
  isSaving: boolean;
  message: string | null;
  onSubmit: (values: EquipmentFormValues) => Promise<void>;
  submitLabel: string;
}) {
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [form, setForm] = useState<EquipmentFormValues>(
    equipment
      ? {
          name: equipment.name,
          manufacturer: equipment.manufacturer,
          model: equipment.model,
          equipmentType: equipment.equipmentType,
          equipmentNumber: equipment.equipmentNumber,
          description: equipment.description,
          imageUrl: equipment.imageUrl,
          locationId: equipment.locationId,
          publicVisible: equipment.publicVisible,
        }
      : emptyForm,
  );
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLocations() {
      try {
        const records = await getFacilityLocations(facilityId);

        if (!isMounted) {
          return;
        }

        const activeLocations = records.filter((location) => !location.archived);
        setLocations(activeLocations);
        setForm((current) => ({
          ...current,
          locationId: current.locationId || activeLocations[0]?.id || "",
        }));
      } catch {
        if (isMounted) {
          setLocationMessage("Locations could not be loaded.");
        }
      }
    }

    void loadLocations();

    return () => {
      isMounted = false;
    };
  }, [facilityId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  function updateField(field: keyof EquipmentFormValues, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <PremiumCard>
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Equipment name"
            onChange={(value) => updateField("name", value)}
            placeholder="Technogym Treadmill 04"
            required
            value={form.name}
          />
          <TextField
            label="Equipment number"
            onChange={(value) => updateField("equipmentNumber", value)}
            placeholder="T04"
            value={form.equipmentNumber}
          />
          <TextField
            label="Manufacturer"
            onChange={(value) => updateField("manufacturer", value)}
            placeholder="Technogym"
            value={form.manufacturer}
          />
          <TextField
            label="Model"
            onChange={(value) => updateField("model", value)}
            placeholder="Run Excite"
            value={form.model}
          />
          <TextField
            label="Equipment type"
            onChange={(value) => updateField("equipmentType", value)}
            placeholder="Treadmill"
            required
            value={form.equipmentType}
          />
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">Location</span>
            <select
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-facility-graphite px-4 text-sm outline-none transition focus:border-primary"
              onChange={(event) => updateField("locationId", event.target.value)}
              required
              value={form.locationId}
            >
              <option value="">Choose location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} · {location.type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TextField
          label="Image URL"
          onChange={(value) => updateField("imageUrl", value)}
          placeholder="https://..."
          type="url"
          value={form.imageUrl}
        />

        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">Description</span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition focus:border-primary"
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Operational notes, key features or care context."
            value={form.description}
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
          <input
            checked={form.publicVisible}
            className="h-4 w-4 accent-facility-green"
            onChange={(event) => updateField("publicVisible", event.target.checked)}
            type="checkbox"
          />
          Generate a public QR profile for this equipment
        </label>

        {message || locationMessage ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            {message ?? locationMessage}
          </p>
        ) : null}

        <Button disabled={isSaving || locations.length === 0} type="submit">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving" : submitLabel}
        </Button>
      </form>
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
