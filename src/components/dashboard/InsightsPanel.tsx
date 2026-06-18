import { pearsonCorrelation } from "@/lib/stats";
import { Card, CardHeader, CardTitle,CardDescription, CardContent } from "../ui/Card";

interface InsightsPanelProps {
  pairs: {
    xKey: string;
    yKey: string;
    x: number[];
    y: number[];
  }[];
  sessionCount: number;
}

// maps metric keys to readable names for sentence construction
const METRIC_NAMES: Record<string, string> = {
  wpm:               "typing speed",
  pauseCount:        "pause frequency",
  errorRatePercent:  "correction rate",
  mood:              "mood",
  stress:            "stress",
  fatigue:           "fatigue",
  focus:             "focus",
  anxiety:           "anxiety",
};

// Generates a human-centered sentence for each correlation pair.
// Avoids clinical framing — reads like a personal observation.
function generateInsight(xKey: string, yKey: string, r: number | null, n: number): string {
  if (n < 5) {
    return `${n} session${n === 1 ? "" : "s"} logged. Keep writing — patterns will surface around session 5.`;
  }
  if (r === null) return "Not enough overlapping data to compare these two yet.";

  const abs = Math.abs(r);
  const xName = METRIC_NAMES[xKey] ?? xKey;
  const yName = METRIC_NAMES[yKey] ?? yKey;

  if (abs < 0.1) {
    return `Your ${xName} and ${yName} don't appear to be related yet. More sessions may reveal a pattern.`;
  }

  const direction = r < 0 ? "opposite" : "same";
  const strength = abs < 0.3 ? "slightly" : abs < 0.5 ? "noticeably" : "strongly";

  // Pair-specific natural language
  if (xKey === "wpm" && yKey === "stress") {
    if (r < 0) return `On your higher-stress days, your typing tends to slow down — fingers matching the weight of the moment (r = ${r.toFixed(2)}).`;
    return `Your stress seems to speed up your typing — an acute stress pattern common in research (r = ${r.toFixed(2)}).`;
  }

  if (xKey === "pauseCount" && yKey === "mood") {
    if (r < 0) return `Better mood days show fewer hesitations in your typing — thoughts flowing more freely (r = ${r.toFixed(2)}).`;
    return `On lighter days, you seem to pause more — perhaps more reflective (r = ${r.toFixed(2)}).`;
  }

  if (xKey === "errorRatePercent" && yKey === "fatigue") {
    if (r > 0) return `Tired days show more corrections in your writing — your hands tell on you before you do (r = ${r.toFixed(2)}).`;
    return `Fatigue and correction rate don't clearly track together for you yet (r = ${r.toFixed(2)}).`;
  }

  // Generic fallback
  return `Your ${xName} and ${yName} tend to move in the ${direction} direction — ${strength} (r = ${r.toFixed(2)}).`;
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
          Based on {sessionCount} session{sessionCount === 1 ? "" : "s"}.
          Personal observations from your own data — not population-level claims.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-0 divide-y divide-parchment dark:divide-dark-border">
        {pairs.map((pair) => {
          const r = pearsonCorrelation(pair.x, pair.y);
          const n = pair.x.length;

          return (
            <div key={`${pair.xKey}-${pair.yKey}`} className="py-4 first:pt-0 last:pb-0">
              {/* Pair label + r badge */}
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide">
                  {METRIC_NAMES[pair.xKey] ?? pair.xKey}
                  {" ↔ "}
                  {METRIC_NAMES[pair.yKey] ?? pair.yKey}
                </span>
                {r !== null && n >= 5 && (
                  <span className="text-xs text-ink-subtle dark:text-[#555250] font-mono shrink-0">
                    r = {r.toFixed(2)}
                  </span>
                )}
              </div>
              {/* Conversational insight */}
              <p className="text-sm text-ink dark:text-[#d8d5ce] leading-relaxed">
                {generateInsight(pair.xKey, pair.yKey, r, n)}
              </p>
            </div>
          );
        })}

        <p className="text-xs text-ink-subtle dark:text-[#555250] pt-4">
          Correlations describe patterns, not causes. These are observations about
          your own rhythm — not clinical assessments.
        </p>
      </CardContent>
    </Card>
  );
}