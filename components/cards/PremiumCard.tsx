import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PremiumCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6",
        className,
      )}
    >
      {children}
    </Card>
  );
}
