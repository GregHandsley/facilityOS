import { cn } from "@/lib/utils";

type Status = "green" | "amber" | "red";

const statusConfig: Record<Status, { label: string; className: string }> = {
  green: {
    label: "Green",
    className: "bg-facility-green/15 text-facility-green ring-facility-green/25",
  },
  amber: {
    label: "Amber",
    className: "bg-facility-amber/15 text-facility-amber ring-facility-amber/25",
  },
  red: {
    label: "Red",
    className: "bg-facility-red/15 text-facility-red ring-facility-red/25",
  },
};

export function StatusBadge({
  status,
  label,
}: {
  status: Status;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        statusConfig[status].className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? statusConfig[status].label}
    </span>
  );
}
