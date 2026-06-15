"use client";

// ============================================================
// TREND CHART — line chart showing one or more metrics over time.
//
// RECHARTS PRIMER (if this is your first time):
// - <ResponsiveContainer> makes the chart fill its parent's width/height.
//   Requires the parent to have an explicit height (we set h-64 below).
// - <LineChart data={...}> takes an array of objects; each object is
//   one point on the x-axis. Every <Line dataKey="x"> reads that key
//   from each object in `data`.
// - <CartesianGrid> draws the background gridlines.
// - <Tooltip> shows values on hover — customized below to match our
//   design system instead of Recharts' default white box.
//
// The wrapping div's text color (text-ink-subtle dark:text-[...]) is
// inherited by any SVG element using stroke="currentColor" or
// fill="currentColor" — this is how axis/grid lines adapt to dark mode
// without us hardcoding two sets of colors.
// ============================================================

import type { DashboardDataPoint } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
}

export function TrendChart({ title, description, data, lines, yDomain }: TrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent>
        {/* text-* classes here are inherited by currentColor in the SVG below */}
        <div className="text-ink-subtle dark:text-[#555250]" style={{ height: 256, minHeight: 256 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />

              <XAxis
                dataKey="date"
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={yDomain ?? ["auto", "auto"]}
                stroke="currentColor"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={32}
              />

              <Tooltip content={<ChartTooltip lines={lines} />} />

              {lines.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: line.color }}
                  // connectNulls: if a session is missing this metric
                  // (e.g. wpm null), draw through the gap rather than
                  // breaking the line.
                  connectNulls
                />
              ))}
            </LineChart>
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
    <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-lg px-3 py-2 shadow-sm">
      <p className="text-xs font-medium text-ink dark:text-[#F0EDE8] mb-1">{label}</p>
      {payload.map((entry) => {
        const config = lines.find((l) => l.dataKey === entry.dataKey);
        return (
          <p key={entry.dataKey} className="text-xs flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: config?.color }}
            />
            <span className="text-ink-muted dark:text-[#888480]">{config?.label}:</span>
            <span className="font-medium text-ink dark:text-[#D8D5CE]">{entry.value}</span>
          </p>
        );
      })}
    </div>
  );
}