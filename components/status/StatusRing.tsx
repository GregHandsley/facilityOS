type Status = "green" | "amber" | "red";

const strokeColor: Record<Status, string> = {
  green: "#36d98c",
  amber: "#ffb020",
  red: "#ff4d5e",
};

export function StatusRing({
  status,
  label,
  value,
}: {
  status: Status;
  label: string;
  value: number;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
        <circle
          cx="48"
          cy="48"
          r="38"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r="38"
          fill="none"
          stroke={strokeColor[status]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-semibold leading-none">{normalized}%</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
