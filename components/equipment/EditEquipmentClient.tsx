"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEquipment, updateEquipment } from "@/lib/db/equipment";
import type { Equipment } from "@/types/equipment";
import {
  EquipmentForm,
  type EquipmentFormValues,
} from "@/components/equipment/EquipmentForm";
import { PremiumCard } from "@/components/cards/PremiumCard";

export function EditEquipmentClient({ equipmentId }: { equipmentId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEquipment() {
      if (!user) {
        return;
      }

      try {
        const record = await getEquipment(equipmentId);

        if (!isMounted) {
          return;
        }

        if (!record || record.facilityId !== user.facilityId) {
          setMessage("Equipment was not found.");
          return;
        }

        setEquipment(record);
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

  async function handleSubmit(values: EquipmentFormValues) {
    if (!user || !equipment) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await updateEquipment({
        id: equipment.id,
        facilityId: user.facilityId,
        ...values,
      });

      router.push(`/app/equipment/${equipment.id}`);
    } catch {
      setMessage("Equipment could not be updated.");
      setIsSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  if (!equipment) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">
          {message ?? "Loading equipment."}
        </p>
      </PremiumCard>
    );
  }

  return (
    <EquipmentForm
      equipment={equipment}
      facilityId={user.facilityId}
      isSaving={isSaving}
      message={message}
      onSubmit={handleSubmit}
      submitLabel="Save changes"
    />
  );
}
