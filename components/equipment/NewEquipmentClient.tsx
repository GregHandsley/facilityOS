"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createEquipment } from "@/lib/db/equipment";
import {
  EquipmentForm,
  type EquipmentFormValues,
} from "@/components/equipment/EquipmentForm";

export function NewEquipmentClient() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(values: EquipmentFormValues) {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const equipment = await createEquipment({
        facilityId: user.facilityId,
        ...values,
      });

      router.push(`/app/equipment/${equipment.id}`);
    } catch {
      setMessage("Equipment could not be created.");
      setIsSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <EquipmentForm
      facilityId={user.facilityId}
      isSaving={isSaving}
      message={message}
      onSubmit={handleSubmit}
      submitLabel="Create equipment"
    />
  );
}
