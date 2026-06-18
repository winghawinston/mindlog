// ============================================================
// DASHBOARD PAGE — Server Component
//
// Fetches all submitted sessions joined with their keystroke metrics
// and self-reports, flattens them into chart-ready rows, computes
// summary stats, and renders everything. Charts themselves are client
// components (Recharts needs the browser), but the data fetching and
// shaping happens here, server-side, before any HTML is sent.
//
// WHY ONE BIG QUERY INSTEAD OF THREE?
// Supabase/PostgREST supports nested selects across foreign-key
// relationships in a single request — one round trip instead of three,
// and the join happens in Postgres (fast) rather than in application code.
// ============================================================

import { CorrelationScatter } from "@/components/dashboard/CorrelationScatter";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { createClient } from "@/lib/supabase/server";
import { DashboardDataPoint } from "@/types";
import { redirect } from "next/navigation";
import { StableDayCard } from "@/components/dashboard/StableDayCard";

export const metadata = { title: "Dashboard" };

// Raw shape returned by the Supabase query below. Nested relations may
// come back as either an object or a single-element array depending on
// how PostgREST resolves the foreign key — `firstOrNull` below normalizes
// both cases so the rest of the code doesn't need to care.
interface RawKeystrokeMetrics {
  wpm: number | null;
  pause_count: number | null;
  avg_pause_duration_ms: number | null;
  backspace_count: number | null;
  error_rate: number | null;
  focus_loss_count: number | null;
}

interface RawSelfReport {
  mood_score: number;
  stress_score: number;
  anxiety_score: number;
  focus_score: number;
  fatigue_score: number;
}

interface RawSessionRow {
  id: string;
  submitted_at: string;
  word_count: number;
  duration_secs: number;
  keystroke_metrics: RawKeystrokeMetrics | RawKeystrokeMetrics[] | null;
  self_reports: RawSelfReport | RawSelfReport[] | null;
}

/** Normalizes a Supabase nested relation that might be an object or a 1-element array. */
function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// Computes the personal average for a numeric field across all sessions
function computeBaseline(
  data: DashboardDataPoint[],
  key: keyof DashboardDataPoint
): number | undefined {
  const values = data
    .map((d) => d[key])
    .filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (values.length < 2) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Computes how closely recent sessions match the personal baseline (0–100)
function computeBaselineMatch(data: DashboardDataPoint[]): number {
  if (data.length < 2) return 100;
  const validWpm = data.filter((d) => d.wpm !== null).map((d) => d.wpm as number);
  if (validWpm.length < 2) return 100;
  const avg = validWpm.reduce((a, b) => a + b, 0) / validWpm.length;
  const recent = validWpm[validWpm.length - 1];
  const deviation = Math.abs(recent - avg) / (avg || 1);
  return Math.min(100, Math.round(Math.max(0, (1 - deviation) * 100)));
}

// Generates a personalized greeting based on recent mood trend
function generateGreeting(data: DashboardDataPoint[]): string {
  if (data.length === 0) return "Welcome. Your story is just beginning.";
  if (data.length < 3) return "Early days. Keep writing — patterns will emerge.";

  const recent = data.slice(-3);
  const avgMood = recent.reduce((acc, d) => acc + (d.mood ?? 5), 0) / recent.length;

  if (avgMood >= 7.5) return "Your rhythm is bright this week. Something's working.";
  if (avgMood >= 5.5) return "Your mind is holding a steady rhythm.";
  if (avgMood >= 3.5) return "A heavier week. Writing through it still counts.";
  return "A tough stretch. Showing up anyway is its own kind of strength.";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("journaling_sessions")
    .select(
      `
      id,
      submitted_at,
      word_count,
      duration_secs,
      keystroke_metrics ( wpm, pause_count, avg_pause_duration_ms, backspace_count, error_rate, focus_loss_count ),
      self_reports ( mood_score, stress_score, anxiety_score, focus_score, fatigue_score )
    `
    )
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true });

  if (error) {
    console.error("[dashboard] fetch sessions:", error.message);
  }

  const rawSessions = (data ?? []) as unknown as RawSessionRow[];

  // ── Flatten into chart-ready rows ──────────────────────────
  // Only sessions WITH a self-report are useful for the dashboard —
  // a session without one (shouldn't happen given submitSessionAction's
  // validation, but defensively filtered here) can't contribute to any
  // mood/stress correlation.
  const chartData: DashboardDataPoint[] = rawSessions
    .map((session) => {
      const metrics = firstOrNull(session.keystroke_metrics);
      const report = firstOrNull(session.self_reports);
      if (!report) return null;

      const date = new Date(session.submitted_at);

      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        rawDate: session.submitted_at,
        mood: report.mood_score,
        stress: report.stress_score,
        anxiety: report.anxiety_score,
        focus: report.focus_score,
        fatigue: report.fatigue_score,
        wpm: metrics?.wpm ?? null,
        pauseCount: metrics?.pause_count ?? null,
        avgPauseDurationMs: metrics?.avg_pause_duration_ms ?? null,
        backspaceCount: metrics?.backspace_count ?? null,
        errorRatePercent:
          metrics?.error_rate !== null && metrics?.error_rate !== undefined
            ? Math.round(metrics.error_rate * 1000) / 10 // 0.0423 -> 4.2
            : null,
        focusLossCount: metrics?.focus_loss_count ?? null,
      };
    })
    .filter((row): row is DashboardDataPoint => row !== null);

  // ── Empty state ─────────────────────────────────────────────
  if (chartData.length === 0) {
    return (
      <div className="flex flex-col h-full p-8">
        <PageHeader sessionCount={0} greeting="Welcome. Your story is just beginning." />
        {/* CHANGED: centered empty state with flex-1 */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState />
        </div>
      </div>
    );
  }

  // ── Summary stats ───────────────────────────────────────────
  const avg = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length > 0
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : null;
  };

  const avgMood = avg(chartData.map((d) => d.mood));
  const avgStress = avg(chartData.map((d) => d.stress));
  const avgWpm = avg(chartData.map((d) => d.wpm));

  const baselineMatch = computeBaselineMatch(chartData);
  const greeting      = generateGreeting(chartData);

  // Personal baselines (averages) for the baseline halo on charts
  const baselines = {
    mood:   computeBaseline(chartData, "mood"),
    stress: computeBaseline(chartData, "stress"),
    wpm:    computeBaseline(chartData, "wpm"),
  };

  // ── Correlation pairs (filter out nulls per-pair) ───────────
  const pairFrom = (
    xKey: keyof DashboardDataPoint,
    yKey: keyof DashboardDataPoint
  ) => {
    const x: number[] = [];
    const y: number[] = [];
    for (const row of chartData) {
      const xVal = row[xKey];
      const yVal = row[yKey];
      if (typeof xVal === "number" && typeof yVal === "number") {
        x.push(xVal);
        y.push(yVal);
      }
    }
    return { x, y };
  };

  const stressVsWpm = pairFrom("wpm", "stress");
  const moodVsPause = pairFrom("pauseCount", "mood");
  const fatigueVsError = pairFrom("errorRatePercent", "fatigue");

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-5">
      <PageHeader sessionCount={chartData.length} greeting={greeting} />

      {/* Stable Day + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <StableDayCard
            baselineMatch={baselineMatch}
            greeting={greeting}
            sessionCount={chartData.length}
          />
        </div>
        <div className="md:col-span-2">
          <SummaryCards
            totalSessions={chartData.length}
            avgMood={avgMood}
            avgStress={avgStress}
            avgWpm={avgWpm}
          />
        </div>
      </div>

      {/* Mood & Stress over time — fixed 1-10 scale for readability */}
      <TrendChart
        title="Mood & stress over time"
        description="How you felt going into each session"
        data={chartData}
        yDomain={[1, 10]}
        baselines={{ mood: baselines.mood, stress: baselines.stress }}
        lines={[
          { dataKey: "mood", label: "Mood", color: "#52B788" },   // sage
          { dataKey: "stress", label: "Stress", color: "#C0433A" }, // danger
        ]}
      />

      {/* Typing speed over time */}
      <TrendChart
        title="Typing speed over time"
        description="Words per minute, per session"
        data={chartData}
        baselines={{ wpm: baselines.wpm }}
        lines={[{ dataKey: "wpm", label: "WPM", color: "#5B9BD4" }]} // info
      />

      {/* Pause behavior over time */}
      <TrendChart
        title="Pauses & corrections over time"
        description="Number of pauses (>1.5s gaps) and corrections accross session"
        data={chartData}
        lines={[
          { dataKey: "pauseCount", label: "Pauses", color: "#C9A96E" },     // sand
          { dataKey: "backspaceCount", label: "Corrections", color: "#D4952A" }, // warning
        ]}
      />

      {/* Correlation scatter plots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CorrelationScatter
          title="Stress vs typing speed"
          xLabel="WPM"
          yLabel="Stress"
          color="#5B9BD4"
          points={stressVsWpm.x.map((x, i) => ({ x, y: stressVsWpm.y[i] }))}
        />
        <CorrelationScatter
          title="Mood vs pauses"
          xLabel="Pauses"
          yLabel="Mood"
          color="#52B788"
          points={moodVsPause.x.map((x, i) => ({ x, y: moodVsPause.y[i] }))}
        />
        <CorrelationScatter
          title="Fatigue vs corrections"
          xLabel="Error %"
          yLabel="Fatigue"
          color="#C0433A"
          points={fatigueVsError.x.map((x, i) => ({ x, y: fatigueVsError.y[i] }))}
        />
      </div>

      {/* Personal Trends — Conversational insights */}
      <InsightsPanel
        sessionCount={chartData.length}
        pairs={[
          { xKey: "wpm",              yKey: "stress",  ...stressVsWpm   },
          { xKey: "pauseCount",       yKey: "mood",    ...moodVsPause   },
          { xKey: "errorRatePercent", yKey: "fatigue", ...fatigueVsError },
        ]}
      />
    </div>
  )
}

function PageHeader({ sessionCount, greeting }: { sessionCount: number; greeting: string }) {
  return (
    <div>
      <p className="text-xs text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-1">
        My Inner Cadence
      </p>
      <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
        {greeting}
      </h1>
      {sessionCount > 0 && (
        <p className="text-sm text-ink-muted dark:text-[#888480] mt-1">
          {sessionCount} session{sessionCount === 1 ? "" : "s"} logged.
        </p>
      )}
    </div>
  );
}