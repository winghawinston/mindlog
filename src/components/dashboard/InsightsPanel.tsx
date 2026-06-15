import { interpretCorrelation, pearsonCorrelation } from "@/lib/stats";
import { Card, CardHeader, CardTitle,CardDescription, CardContent } from "../ui/Card";

interface InsightsPanelProps {
  pairs: {
    label: string;
    x: number[];
    y: number[];
  }[];
  sessionCount: number;
}

/**
 * Plain-language summary of all computed correlations, framed for an
 * n-of-1 (single-subject) study — this is the language your thesis
 * methodology section already establishes (personal baseline comparison,
 * not population-level claims).
 */
export function InsightsPanel({ pairs, sessionCount }: InsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal trends</CardTitle>
        <CardDescription>
          Based on {sessionCount} session{sessionCount === 1 ? "" : "s"} —
          relationships are specific to your own patterns, not a general
          population claim.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pairs.map((pair) => {
          const r = pearsonCorrelation(pair.x, pair.y);
          return (
            <div
              key={pair.label}
              className="flex items-center justify-between gap-4 py-2 border-b border-parchment dark:border-dark-border last:border-0"
            >
              <span className="text-sm text-ink dark:text-[#d8d5ce]">{pair.label}</span>
              <span className="text-xs text-ink-muted dark:text-[#888480] text-right">
                {interpretCorrelation(r)}
              </span>
            </div>
          );
        })}

        <p className="text-xs text-ink-subtle dark:text-[#555250] pt-2">
          Correlation does not imply causation. These figures describe
          patterns in your own data and become more stable as you log
          more sessions.
        </p>
      </CardContent>
    </Card>
  );
}