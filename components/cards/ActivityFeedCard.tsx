import type { LucideIcon } from "lucide-react";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { cn } from "@/lib/utils";

export type ActivityTone = "green" | "amber" | "red" | "ice";

const toneClasses: Record<ActivityTone, string> = {
  green: "bg-facility-green/15 text-facility-green",
  amber: "bg-facility-amber/15 text-facility-amber",
  red: "bg-facility-red/15 text-facility-red",
  ice: "bg-facility-ice/15 text-facility-ice",
};

export function ActivityFeedCard({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    icon: LucideIcon;
    title: string;
    meta: string;
    tone: ActivityTone;
  }>;
}) {
  return (
    <PremiumCard>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
          Live
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  toneClasses[item.tone],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}
