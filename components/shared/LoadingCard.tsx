import { PremiumCard } from "@/components/cards/PremiumCard";

export function LoadingCard({ title }: { title: string }) {
  return (
    <PremiumCard className="min-h-56">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="h-3 w-3 animate-pulse rounded-full bg-facility-green" />
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="h-20 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
    </PremiumCard>
  );
}
