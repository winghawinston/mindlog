"use client";

// ============================================================
// TREND CHART — area chart with gradient fills and baseline halo.
//
// Uses AreaChart (not LineChart) to enable the gradient fill
// under each line. The fill fades from the line color at 20%
// opacity down to 0% at the bottom — soft, non-clinical visual.
//
// Baseline halo: a dashed reference line at the metric's personal
// average. Acts as an emotional anchor — not a performance target.
//
// Height: uses style={{ height: N }} instead of a Tailwind class
// because ResponsiveContainer needs an explicit pixel ancestor.
// ============================================================

import type { DashboardDataPoint } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface LineConfig {
  dataKey: keyof DashboardDataPoint;
  label: string;
  color: string;
}

interface TrendChartProps {
  title: string;
  description?: string;
  data: DashboardDataPoint[];
  lines: LineConfig[];
  /** optional fixed y-axis range, e.g. [1, 10] for score fields. */
  yDomain?: [number, number];
  // Personal averages for each metric — rendered as dashed baseline halos
  baselines?: Partial<Record<keyof DashboardDataPoint, number>>;
  height?: number;
}

export function TrendChart({
  title,
  description,
  data,
  lines,
  yDomain,
  baselines,
  height = 240,
}: TrendChartProps) {
  return (
    <Card className="p-0 md:p-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent>
        {/* text-* classes here are inherited by currentColor in the SVG below */}
        <div className="text-ink-subtle dark:text-[#555250]" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              {/* ── Gradient definitions ─────────────────────── */}
              {/* SVG <defs> can live directly inside an AreaChart */}
              <defs>
                {lines.map((line) => (
                  <linearGradient
                    key={`grad-${String(line.dataKey)}`}
                    id={`grad-${String(line.dataKey)}`}
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    {/* Top of gradient: line color at 20% opacity */}
                    <stop offset="5%"  stopColor={line.color} stopOpacity={0.20} />
                    {/* Bottom of gradient: fully transparent */}
                    <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>


              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />

              <XAxis
                dataKey="date"
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                // CHANGED: was ["auto", "auto"] — that let Recharts pick arbitrary
                // tick values outside the data range, causing the 0→7→4→1 ordering.
                // [0, "auto"] anchors the floor at 0 for count data (pauses, WPM).
                // For mood/stress the caller passes yDomain={[1, 10]} which overrides this.
                // WHY: "auto" on both ends causes Recharts to sometimes reverse or
                // scatter ticks when data is sparse.
                domain={yDomain ?? [0, "auto"]}
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={32}
                // ADDED: tickCount forces evenly spaced ticks (5 is the sweet spot
                // for chart heights we're using — not too crowded, not too sparse)
                tickCount={5}
                // ADDED: no 7.5-style decimals on count data (pauses, WPM, corrections)
                allowDecimals={false}
              />

              <Tooltip content={<ChartTooltip lines={lines} />} />

              {/* ── Baseline halos ────────────────────────────── */}
              {/* dashed reference lines for each metric's personal average.
                  Rendered BEFORE the areas so they sit behind the data. */}
              {lines.map((line) => {
                const baseVal = baselines?.[line.dataKey];
                if (baseVal === undefined) return null;
                return (
                  <ReferenceLine
                    key={`base-${String(line.dataKey)}`}
                    y={baseVal}
                    stroke={line.color}
                    strokeDasharray="4 4"
                    strokeOpacity={0.35}
                    strokeWidth={1.5}
                  />
                );
              })}

              {/* ── area lines with gradient fills ───────────── */}
              {lines.map((line) => (
                <Area
                  key={String(line.dataKey)}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  // References the gradient defined in <defs> above
                  fill={`url(#grad-${String(line.dataKey)})`}
                  // No dots on the line — cleaner, less clinical
                  dot={false}
                  // Subtle dot on hover
                  activeDot={{ r: 4, strokeWidth: 0, fill: line.color }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Custom tooltip matching our design tokens — Recharts' default tooltip
 * is a hardcoded white box that looks wrong in dark mode.
 */
function ChartTooltip({
  active,
  payload,
  label,
  lines,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  lines: LineConfig[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-lg px-3 py-2.5 shadow-sm">
      <p className="text-xs font-medium text-ink dark:text-[#f0ede8] mb-1.5">{label}</p>
      {payload.map((entry) => {
        const config = lines.find((l) => l.dataKey === entry.dataKey);
        return (
          <p key={entry.dataKey} className="text-xs flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: config?.color }}
            />
            <span className="text-ink-muted dark:text-[#888480]">{config?.label}:</span>
            <span className="font-medium text-ink dark:text-[#d8d5ce]">{entry.value}</span>
          </p>
        );
      })}
    </div>
  );
}