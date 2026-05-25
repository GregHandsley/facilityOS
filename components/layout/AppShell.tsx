import { Dumbbell, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("min-h-screen px-4 py-5 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">FacilityOS</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Equipment care layer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-facility-green" />
            Live foundation
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
