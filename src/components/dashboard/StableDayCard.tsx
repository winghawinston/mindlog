import { cn } from "@/lib/utils";
import { Card } from "../ui/Card";

interface StableDayCardProps {
  baselineMatch: number;   // 0–100, how close recent typing is to personal average
  greeting: string;        // personalized message based on recent mood trend
  sessionCount: number;
}

export function StableDayCard({ baselineMatch, greeting, sessionCount }: StableDayCardProps) {
  // stability tier determines color and label
  const stable = baselineMatch >= 75;
  const moderate = baselineMatch >= 50;

  const statusLabel = stable ? "Steady" : moderate ? "Shifting" : "Diverging";
  const statusColor = stable
    ? "text-forest dark:text-sage"
    : moderate
    ? "text-warning"
    : "text-danger";

  const ringColor = stable
    ? "border-forest/30 dark:border-sage/30"
    : moderate
    ? "border-warning/30"
    : "border-danger/30";

  return (
    <Card className="p-6">
      <div className="flex items-start gap-6">
        {/* stability ring — visual anchor */}
        <div className={cn(
          "flex flex-col items-center justify-center",
          "w-24 h-24 rounded-full border-4 shrink-0",
          "bg-linen dark:bg-dark-raised",
          ringColor
        )}>
          <span className={cn("text-2xl font-medium leading-none", statusColor)}>
            {baselineMatch}%
          </span>
          <span className={cn("text-xs mt-1", statusColor)}>
            {statusLabel}
          </span>
        </div>

        {/* copy */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-2">
            My Daily Cadence
          </p>
          <p className="text-base font-medium text-ink dark:text-[#F0EDE8] leading-snug mb-2">
            {greeting}
          </p>
          {sessionCount < 5 ? (
            <p className="text-xs text-ink-subtle dark:text-[#555250]">
              Baseline accuracy improves after 5 sessions. You have {sessionCount} so far.
            </p>
          ) : (
            <p className="text-xs text-ink-subtle dark:text-[#555250]">
              Baseline match compares your recent typing rhythm to your personal average.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}