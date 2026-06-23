import { cn } from "@/lib/utils";
import { Card } from "../ui/Card";

interface SummaryCardsProps {
  totalSessions: number;
  avgMood: number | null;
  avgStress: number | null;
  avgWpm: number | null;
}

/**
 * Four at-a-glance numbers at the top of the dashboard.
 * Server-renderable — pure presentation, no interactivity.
 */
export function SummaryCards({
  totalSessions,
  avgMood,
  avgStress,
  avgWpm,
}: SummaryCardsProps) {
  const stats = [
    { label: "Sessions logged", value: totalSessions.toString() },
    { label: "Avg. mood", value: formatScore(avgMood), suffix: "/10" },
    { label: "Avg. stress", value: formatScore(avgStress), suffix: "/10" },
    { label: "Avg. typing speed", value: formatScore(avgWpm, 0), suffix: " wpm" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <p className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-1">
            {stat.label}
          </p>
          <p className={cn("text-2xl font-medium text-ink dark:text-[#f0ede8]")}>
            {stat.value}
            {stat.value !== "—" && (
              <span className="text-sm font-normal text-ink-subtle dark:text-[#555250]">
                {stat.suffix}
              </span>
            )}
          </p>
        </Card>
      ))}
    </div>
  );
}

/** Formats a number to N decimals, or "—" if null (no data). */
function formatScore(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return value.toFixed(decimals);
}