"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Box,
  ChevronDown,
  Edit3,
  MapPinned,
  QrCode,
  RotateCcw,
  Wrench,
} from "lucide-react";
import { ActivityFeedCard } from "@/components/cards/ActivityFeedCard";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toActivityCardItem } from "@/lib/activity/feed";
import { getEquipmentActivityFeed } from "@/lib/db/activity";
import { archiveEquipment, getEquipmentWithDerivedStatus } from "@/lib/db/equipment";
import { getEquipmentStatusReview, syncEquipmentStatus } from "@/lib/db/equipment-status";
import { getFacilityLocations } from "@/lib/db/facilities";
import { returnEquipmentToService } from "@/lib/db/out-of-order";
import {
  getEquipmentReplacementIntelligence,
  updateReplacementReviewState,
} from "@/lib/db/replacement-intelligence";
import { getProxiedImageUrl } from "@/lib/images/proxy";
import { can } from "@/lib/rbac/can";
import type { Equipment } from "@/types/equipment";
import type { FacilityLocation } from "@/types/facility";
import type { ActivityFeedItem } from "@/types/activity";
import type { EquipmentStatusResult } from "@/lib/status/equipmentStatus";
import type { ReplacementIntelligence, ReplacementSignal } from "@/types/replacement";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";

export function EquipmentDetailClient({ equipmentId }: { equipmentId: string }) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [activity, setActivity] = useState<ActivityFeedItem[]>([]);
  const [locations, setLocations] = useState<FacilityLocation[]>([]);
  const [statusReview, setStatusReview] = useState<EquipmentStatusResult | null>(null);
  const [replacementIntelligence, setReplacementIntelligence] =
    useState<ReplacementIntelligence | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPulseReviewExpanded, setIsPulseReviewExpanded] = useState(false);
  const [expandedPulseSignalLabels, setExpandedPulseSignalLabels] = useState<string[]>([]);
  const [isReturningToService, setIsReturningToService] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        const [equipmentRecord, locationRecords] = await Promise.all([
          getEquipmentWithDerivedStatus(equipmentId),
          getFacilityLocations(user.facilityId),
        ]);

        if (!isMounted) {
          return;
        }

        if (!equipmentRecord || equipmentRecord.facilityId !== user.facilityId) {
          setMessage("Equipment was not found.");
          return;
        }

        setEquipment(equipmentRecord);
        setLocations(locationRecords);

        const activityRecords = await getEquipmentActivityFeed({
          equipmentId,
          facilityId: user.facilityId,
        }).catch(() => []);

        if (isMounted) {
          setActivity(activityRecords);
        }

        if (can(user, "view_manager_pulse")) {
          const review = await getEquipmentStatusReview(equipmentRecord).catch(() => null);
          const syncedEquipment = await syncEquipmentStatus(equipmentRecord.id).catch(() => null);

          if (isMounted) {
            setStatusReview(review);
            if (syncedEquipment) {
              setEquipment({ ...equipmentRecord, status: syncedEquipment.status });
            }
          }
        }

        if (can(user, "view_replacement_intelligence")) {
          const replacementReview = await getEquipmentReplacementIntelligence(
            equipmentRecord.id,
          ).catch(() => null);

          if (isMounted) {
            setReplacementIntelligence(replacementReview);
          }
        }
      } catch {
        if (isMounted) {
          setMessage("Equipment could not be loaded.");
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [equipmentId, user]);

  const locationName = useMemo(() => {
    return locations.find((location) => location.id === equipment?.locationId)?.name;
  }, [equipment?.locationId, locations]);
  const imageUrl = getProxiedImageUrl(equipment?.imageUrl ?? "");

  async function handleArchive() {
    if (!equipment) {
      return;
    }

    setIsArchiving(true);

    try {
      await archiveEquipment(equipment.id);
      setEquipment({ ...equipment, archived: true });
      setMessage("Equipment archived.");
    } catch {
      setMessage("Equipment could not be archived.");
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleReturnToService() {
    if (!equipment) {
      return;
    }

    setIsReturningToService(true);
    setMessage(null);

    try {
      const updatedEquipment = await returnEquipmentToService({
        facilityId: equipment.facilityId,
        equipmentId: equipment.id,
        locationId: equipment.locationId,
        publicSlug: equipment.publicSlug,
      });
      setEquipment({ ...equipment, status: updatedEquipment?.status ?? "green" });
      if (updatedEquipment) {
        setStatusReview(await getEquipmentStatusReview(updatedEquipment));
      }
      setMessage(
        updatedEquipment?.status === "green"
          ? "Equipment returned to service."
          : updatedEquipment?.status === "amber"
            ? "Equipment is back in service, but still needs attention."
            : "Equipment still has a red status because a critical signal remains active.",
      );
    } catch {
      setMessage("Equipment could not be returned to service.");
    } finally {
      setIsReturningToService(false);
    }
  }

  async function handleReplacementState(state: "acknowledged" | "dismissed") {
    if (!replacementIntelligence || !user) {
      return;
    }

    try {
      await updateReplacementReviewState({
        equipmentId: replacementIntelligence.equipmentId,
        facilityId: replacementIntelligence.facilityId,
        score: replacementIntelligence.score,
        state,
        status: replacementIntelligence.status,
        summary: replacementIntelligence.summary,
        userId: user.id,
      });
      setReplacementIntelligence({
        ...replacementIntelligence,
        state,
        updatedAt: new Date().toISOString(),
      });
      setIsPulseReviewExpanded(false);
      setExpandedPulseSignalLabels([]);
      setMessage(
        state === "acknowledged"
          ? "Pulse review acknowledged."
          : "Pulse review dismissed.",
      );
    } catch {
      setMessage("Pulse review could not be updated.");
    }
  }

  if (message && !equipment) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">{message}</p>
      </PremiumCard>
    );
  }

  if (!equipment) {
    return (
      <PremiumCard>
        <p className="text-sm text-muted-foreground">Loading equipment.</p>
      </PremiumCard>
    );
  }

  const canViewReplacementIntelligence = user
    ? can(user, "view_replacement_intelligence")
    : false;
  const activeReplacementReview =
    replacementIntelligence &&
    replacementIntelligence.status !== "none" &&
    replacementIntelligence.state !== "dismissed"
      ? replacementIntelligence
      : null;
  const dismissedReplacementReview =
    replacementIntelligence &&
    replacementIntelligence.status !== "none" &&
    replacementIntelligence.state === "dismissed"
      ? replacementIntelligence
      : null;
  const visibleReplacementReview = activeReplacementReview ?? dismissedReplacementReview;
  const isHighPriorityReplacementReview =
    activeReplacementReview?.status === "high_priority_review";

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <PremiumCard className="overflow-hidden p-4">
          {imageUrl ? (
            <div className="flex h-[26rem] max-h-[58vh] min-h-80 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={equipment.name}
                className="max-h-full max-w-full object-contain"
                src={imageUrl}
              />
            </div>
          ) : (
            <div className="flex h-[26rem] max-h-[58vh] min-h-80 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-facility-green">
              <Box className="h-12 w-12" />
            </div>
          )}
        </PremiumCard>

        <PremiumCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-facility-green">{equipment.equipmentType}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">
                {equipment.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {equipment.manufacturer || "Unknown manufacturer"} ·{" "}
                {equipment.model || "No model"}
              </p>
            </div>
            <StatusBadge status={equipment.status} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Equipment number" value={equipment.equipmentNumber || "-"} />
            <InfoTile label="Public QR slug" value={equipment.publicSlug} />
            <InfoTile
              icon={<MapPinned className="h-4 w-4" />}
              label="Location"
              value={locationName ?? "Unassigned"}
            />
            <InfoTile
              icon={<QrCode className="h-4 w-4" />}
              label="Public page"
              value={equipment.publicVisible ? "Enabled" : "Hidden"}
            />
            <InfoTile
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Availability"
              value={
                equipment.status === "red"
                  ? "Out of order"
                  : equipment.status === "amber"
                    ? "Needs attention"
                    : "In service"
              }
            />
            {canViewReplacementIntelligence ? (
              <PulseReviewTile
                activeReview={activeReplacementReview}
                dismissedReview={dismissedReplacementReview}
                isExpanded={isPulseReviewExpanded}
                onToggle={() => setIsPulseReviewExpanded((current) => !current)}
                healthScore={replacementIntelligence?.healthScore ?? 100}
                visibleReview={visibleReplacementReview}
              />
            ) : null}
          </div>

          {statusReview ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Status reasoning
              </p>
              <p className="mt-2 text-sm font-medium">{statusReview.statusCopy}</p>
              <div className="mt-3 grid gap-2">
                {statusReview.reasons.slice(0, 4).map((reason) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                    key={`${reason.severity}-${reason.message}`}
                  >
                    <span className="text-muted-foreground">{reason.message}</span>
                    <StatusBadge status={reason.severity} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {equipment.description ? (
            <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-muted-foreground">
              {equipment.description}
            </p>
          ) : null}

          {visibleReplacementReview && isPulseReviewExpanded ? (
            <div
              className={
                activeReplacementReview
                  ? isHighPriorityReplacementReview
                    ? "mt-6 rounded-2xl border border-facility-red/25 bg-facility-red/10 p-4"
                    : "mt-6 rounded-2xl border border-facility-amber/25 bg-facility-amber/10 p-4"
                  : "mt-6 rounded-2xl border border-white/10 bg-black/20 p-4"
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    activeReplacementReview
                      ? isHighPriorityReplacementReview
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-facility-red/15 text-facility-red"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-facility-amber/15 text-facility-amber"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground"
                  }
                >
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      activeReplacementReview
                        ? isHighPriorityReplacementReview
                          ? "text-xs font-medium uppercase text-facility-red"
                          : "text-xs font-medium uppercase text-facility-amber"
                        : "text-xs font-medium uppercase text-muted-foreground"
                    }
                  >
                    Pulse equipment review
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold">
                        {activeReplacementReview
                          ? replacementReviewHeadlines[activeReplacementReview.status]
                          : "1 Pulse flag dismissed"}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Health {visibleReplacementReview.healthScore}%
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsPulseReviewExpanded(false)}
                      size="sm"
                      type="button"
                      variant={activeReplacementReview ? "secondary" : "ghost"}
                    >
                      Hide details
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {activeReplacementReview
                      ? "Current equipment health needs review. Repairs and clean time in service help it recover."
                      : "This Pulse flag has been dismissed, but the detail is kept here for audit and context."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {visibleReplacementReview.summary}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {visibleReplacementReview.signals.slice(0, 4).map((signal) => (
                      <ReplacementSignalDisclosure
                        isOpen={expandedPulseSignalLabels.includes(signal.label)}
                        key={signal.label}
                        onToggle={() =>
                          setExpandedPulseSignalLabels((current) =>
                            current.includes(signal.label)
                              ? current.filter((label) => label !== signal.label)
                              : [...current, signal.label],
                          )
                        }
                        signal={signal}
                      />
                    ))}
                  </div>
                  {activeReplacementReview ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {can(user, "mark_out_of_order") && equipment.status !== "red" ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/app/equipment/${equipment.id}/out-of-order`}>
                            <AlertTriangle className="h-4 w-4" />
                            Mark out of order
                          </Link>
                        </Button>
                      ) : null}
                      {can(user, "manage_care_plans") ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/app/tasks">Create maintenance task</Link>
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => void handleReplacementState("acknowledged")}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Acknowledge review
                      </Button>
                      <Button
                        onClick={() => void handleReplacementState("dismissed")}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/app/equipment">Back to equipment</Link>
            </Button>
            {can(user, "manage_equipment") && !equipment.archived ? (
              <>
                <Button asChild variant="secondary">
                  <Link href={`/app/equipment/${equipment.id}/edit`}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button
                  disabled={isArchiving}
                  onClick={() => void handleArchive()}
                  type="button"
                  variant="ghost"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              </>
            ) : null}
            {can(user, "mark_out_of_order") && equipment.status !== "red" ? (
              <Button asChild variant="ghost">
                <Link href={`/app/equipment/${equipment.id}/out-of-order`}>
                  <AlertTriangle className="h-4 w-4" />
                  Out of order
                </Link>
              </Button>
            ) : null}
            {can(user, "return_to_service") && equipment.status === "red" ? (
              <Button
                disabled={isReturningToService}
                onClick={() => void handleReturnToService()}
                type="button"
                variant="secondary"
              >
                <RotateCcw className="h-4 w-4" />
                {isReturningToService ? "Returning" : "Return to service"}
              </Button>
            ) : null}
          </div>
        </PremiumCard>
      </div>

      <ActivityFeedCard
        title="Equipment Activity"
        items={
          activity.length > 0
            ? activity.map(toActivityCardItem)
            : [
                {
                  id: "empty-equipment-activity",
                  icon: QrCode,
                  meta: "Tasks, reports and status changes",
                  title: "Activity for this equipment will appear here",
                  tone: "ice",
                },
              ]
        }
      />
    </section>
  );
}

const replacementReviewHeadlines: Record<ReplacementIntelligence["status"], string> = {
  high_priority_review: "High priority review needed",
  none: "No review needed",
  review_recommended: "Manager review recommended",
  watch: "Review and monitor",
};

const replacementStatusLabels: Record<ReplacementIntelligence["status"], string> = {
  high_priority_review: "High priority review",
  none: "No review",
  review_recommended: "Review recommended",
  watch: "Watch",
};

function PulseReviewTile({
  activeReview,
  dismissedReview,
  healthScore,
  isExpanded,
  onToggle,
  visibleReview,
}: {
  activeReview: ReplacementIntelligence | null;
  dismissedReview: ReplacementIntelligence | null;
  healthScore: number;
  isExpanded: boolean;
  onToggle: () => void;
  visibleReview: ReplacementIntelligence | null;
}) {
  const isHighPriority = activeReview?.status === "high_priority_review";
  const displayedHealth = visibleReview?.healthScore ?? healthScore;
  const tileClass = activeReview
    ? isHighPriority
      ? "rounded-2xl border border-facility-red/25 bg-facility-red/10 p-4"
      : "rounded-2xl border border-facility-amber/25 bg-facility-amber/10 p-4"
    : "rounded-2xl border border-white/10 bg-white/[0.04] p-4";
  const labelClass = activeReview
    ? isHighPriority
      ? "flex items-center gap-2 text-xs text-facility-red"
      : "flex items-center gap-2 text-xs text-facility-amber"
    : "flex items-center gap-2 text-xs text-muted-foreground";

  return (
    <div className={tileClass}>
      <div className={labelClass}>
        <Wrench className="h-4 w-4" />
        Pulse review
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {activeReview
              ? replacementReviewHeadlines[activeReview.status]
              : dismissedReview
                ? "1 flag dismissed"
                : "No review required"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {visibleReview
              ? `Health ${displayedHealth}% · ${replacementStatusLabels[visibleReview.status]}`
              : `Health ${displayedHealth}%`}
          </p>
        </div>
        {visibleReview ? (
          <Button
            className="shrink-0"
            onClick={onToggle}
            size="sm"
            type="button"
            variant={activeReview ? "secondary" : "ghost"}
          >
            {isExpanded ? "Hide" : "Review"}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.08]">
        <div
          className={`h-full rounded-full ${
            displayedHealth < 35
              ? "bg-facility-red"
              : displayedHealth < 65
                ? "bg-facility-amber"
                : "bg-facility-green"
          }`}
          style={{ width: `${displayedHealth}%` }}
        />
      </div>
    </div>
  );
}

function ReplacementSignalDisclosure({
  isOpen,
  onToggle,
  signal,
}: {
  isOpen: boolean;
  onToggle: () => void;
  signal: ReplacementSignal;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 text-sm">
      <button
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 text-muted-foreground">
          {signal.label}
          {signal.details.length > 0 ? (
            <span className="ml-2 text-xs text-muted-foreground/70">
              {isOpen ? "Hide records" : "View records"}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs text-muted-foreground">
            +{signal.points}
          </span>
          {signal.details.length > 0 ? (
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          ) : null}
        </span>
      </button>
      {isOpen && signal.details.length > 0 ? (
        <div className="border-t border-white/10 px-3 py-2">
          <div className="grid gap-2">
            {signal.details.map((detail) => {
              const content = (
                <>
                  <p className="font-medium text-foreground">{detail.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail.meta}</p>
                </>
              );

              return detail.href ? (
                <Link
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:border-facility-green/40"
                  href={detail.href}
                  key={detail.id}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                  key={detail.id}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}
