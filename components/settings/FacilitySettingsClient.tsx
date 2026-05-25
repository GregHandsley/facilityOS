"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFacility, saveFacility } from "@/lib/db/facilities";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

const DEFAULT_BRAND_COLOR = "#36d98c";

export function FacilitySettingsClient() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR);
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFacility() {
      if (!user) {
        return;
      }

      setStatus("loading");

      try {
        const facility = await getFacility(user.facilityId);

        if (!isMounted) {
          return;
        }

        setName(facility?.name ?? "FacilityOS Demo Facility");
        setBrandColor(facility?.brandColor ?? DEFAULT_BRAND_COLOR);
        setLogoUrl(facility?.logoUrl ?? "");
        setStatus("idle");
      } catch {
        if (!isMounted) {
          return;
        }

        setMessage("We could not load facility settings yet.");
        setStatus("idle");
      }
    }

    void loadFacility();

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setStatus("saving");
    setMessage(null);

    try {
      await saveFacility({
        id: user.facilityId,
        name,
        brandColor,
        logoUrl,
      });
      setMessage("Facility settings saved.");
    } catch {
      setMessage("Facility settings could not be saved.");
    } finally {
      setStatus("idle");
    }
  }

  const isBusy = status === "loading" || status === "saving";

  return (
    <PremiumCard>
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-background"
          style={{ backgroundColor: brandColor }}
        >
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Facility profile</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This creates the core facility record used by locations, equipment and
            future operational data.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block">
          <span className="text-sm font-medium text-muted-foreground">
            Facility name
          </span>
          <input
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
            disabled={isBusy}
            onChange={(event) => setName(event.target.value)}
            placeholder="Facility name"
            required
            value={name}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Brand colour
            </span>
            <input
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3"
              disabled={isBusy}
              onChange={(event) => setBrandColor(event.target.value)}
              type="color"
              value={brandColor}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-muted-foreground">
              Logo URL
            </span>
            <input
              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm outline-none transition focus:border-primary"
              disabled={isBusy}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="Optional logo URL"
              type="url"
              value={logoUrl}
            />
          </label>
        </div>

        {message ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <Button disabled={isBusy} type="submit">
          <Save className="h-4 w-4" />
          {status === "saving" ? "Saving" : "Save facility"}
        </Button>
      </form>
    </PremiumCard>
  );
}
