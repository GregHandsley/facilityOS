import Link from "next/link";
import { SearchX } from "lucide-react";
import { PremiumCard } from "@/components/cards/PremiumCard";
import { Button } from "@/components/ui/button";

export default function PublicEquipmentNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <PremiumCard className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-facility-amber">
          <SearchX className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Equipment not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This QR code does not match an active public equipment profile.
        </p>
        <Button asChild className="mt-6" variant="secondary">
          <Link href="/">Go to FacilityOS</Link>
        </Button>
      </PremiumCard>
    </main>
  );
}
