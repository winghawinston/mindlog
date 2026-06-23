"use client";

// ============================================================
// CORRELATION SCATTER — plots two variables against each other,
// one dot per session, plus the computed Pearson r as a badge.
//
// Unlike TrendChart (which plots over time), the x-axis here is
// NOT time — it's one of the variables itself (e.g. WPM), and the
// y-axis is the other (e.g. stress score). Each dot is one session.
// ============================================================

import { interpretCorrelation, pearsonCorrelation } from "@/lib/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { cn } from "@/lib/utils";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";

interface CorrelationScatterProps {
  title: string;
  xLabel: string;
  yLabel: string;
  points: { x: number; y: number }[];
  color: string;
  /** Minimum points needed before showing the correlation badge. */
  minPoints?: number;
}

export function CorrelationScatter({
  title,
  xLabel,
  yLabel,
  points,
  color,
  minPoints = 5,
}: CorrelationScatterProps) {
  const r = pearsonCorrelation(
    points.map((p) => p.x),
    points.map((p) => p.y)
  );

  const hasEnoughData = points.length >= minPoints;

  return (
    <Card className="p-0 md:p-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {xLabel} vs {yLabel}
            </CardDescription>
          </div>

          {/* Correlation badge — only meaningful with enough points */}
          {hasEnoughData && r !== null && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap shrink-0",
                Math.abs(r) >= 0.3
                  ? "bg-mint text-forest dark:bg-[#1A2E1E] dark:text-sage"
                  : "bg-linen text-ink-muted dark:bg-dark-raised dark:text-[#888480]"
              )}
            >
              r = {r.toFixed(2)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="min-w-0 text-ink-subtle dark:text-[#555250]" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />

              <XAxis
                type="number"
                dataKey="x"
                name={xLabel}
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yLabel}
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              {/* ZAxis with a fixed range controls dot size — kept
                  uniform here since we're not encoding a third variable */}
              <ZAxis range={[40, 40]} />

              <Scatter data={points} fill={color} fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {!hasEnoughData && (
          <p className="text-xs text-ink-subtle dark:text-[#555250] mt-3">
            Need at least {minPoints} sessions for a meaningful correlation —
            you have {points.length} so far.
          </p>
        )}

        {hasEnoughData && (
          <p className="text-xs text-ink-subtle dark:text-[#555250] mt-3">
            {interpretCorrelation(r)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}