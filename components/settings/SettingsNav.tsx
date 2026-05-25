import Link from "next/link";
import { Building2, MapPinned } from "lucide-react";
import { PremiumCard } from "@/components/cards/PremiumCard";

const settingsLinks = [
  {
    href: "/app/settings/facility",
    label: "Facility",
    description: "Name, brand colour and facility profile.",
    icon: Building2,
  },
  {
    href: "/app/settings/locations",
    label: "Locations",
    description: "Zones, rooms and areas inside the facility.",
    icon: MapPinned,
  },
];

export function SettingsNav() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {settingsLinks.map((item) => {
        const Icon = item.icon;

        return (
          <Link href={item.href} key={item.href}>
            <PremiumCard className="h-full transition hover:border-primary/40 hover:bg-white/[0.065]">
              <Icon className="h-5 w-5 text-facility-green" />
              <h2 className="mt-4 text-lg font-semibold">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </PremiumCard>
          </Link>
        );
      })}
    </div>
  );
}
