"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types";
import { redirect } from "next/navigation";

// ── Create draft session on page load ──────────────────────
// Called once when the user opens the journal page.
// Returns the session ID so subsequent saves know which row to update.
export async function createDraftSessionsAction(): Promise<
  { sessionId: string } | ActionState
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Not authenticated." };

  const { data, error } = await supabase
    .from("journaling_sessions")
    .insert({
      user_id:      user.id,
      content:      "",
      word_count:   0,
      duration_secs: 0,
      status:       "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[journal] create draft:", error?.message);
    return { error: "Could not start session." };
  }

  return { sessionId: data.id };
}

// ── Autosave draft every 30 seconds ────────────────────────
// Not a useActionState action — called imperatively from useEffect.
// Returns nothing on success; we don't need to signal the UI.
export async function autosaveSessionAction(
  sessionId: string,
  content: string,
  wordCount: number,
  durationSecs: number
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("journaling_sessions")
    .update({ content, word_count: wordCount, duration_secs: durationSecs })
    .eq("id", sessionId)
    .eq("user_id", user.id); // ownership check — users can only update their own rows

  if (error) console.error("[journal] autosave:", error.message);
  return error ? { error: "Autosave failed." } : { success: "Saved." };
}

// ── Submit complete session ─────────────────────────────────
// Finalizes the session, saves keystroke metrics and self-report.
// All three DB writes happen in sequence; metrics failure is non-fatal.
export async function submitSessionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) return { error: "Session expired. Please sign in again." };

  const sessionId  = formData.get("session_id")  as string;
  const content    = formData.get("content")      as string;
  const wordCount  = parseInt(formData.get("word_count")    as string, 10) || 0;
  const durationSecs = parseInt(formData.get("duration_secs") as string, 10) || 0;

  // ADDED: title and energy level
  const title       = (formData.get("title")        as string)?.trim() || null;
  const energyLevel = (formData.get("energy_level") as string) || null;

  // minimum entry length guard
  if (wordCount < 10) {
    return { error: "Your entry is too short. Please write at least a few sentences before submitting." };
  }

  // keystroke metrics — sent as JSON string from client
  let metrics: Record<string, number> = {};
  try {
    metrics = JSON.parse(formData.get("metrics") as string);
  } catch {
    console.error("[journal] metrics JSON parse failed");
  }

  // self-report scores (1–10)
  const scores = {
    mood_score:    parseInt(formData.get("mood_score")    as string, 10),
    stress_score:  parseInt(formData.get("stress_score")  as string, 10),
    anxiety_score: parseInt(formData.get("anxiety_score") as string, 10),
    focus_score:   parseInt(formData.get("focus_score")   as string, 10),
    fatigue_score: parseInt(formData.get("fatigue_score") as string, 10),
  };

  const invalidScore = Object.values(scores).some(
    (s) => isNaN(s) || s < 1 || s > 10
  );
  if (invalidScore) {
    return { error: "All scores must be between 1 and 10." };
  }

  // 1. finalize the session row
  const { error: sessionError } = await supabase
    .from("journaling_sessions")
    .update({
      content,
      title,                              // ADDED
      energy_level: energyLevel || null,  // ADDED
      word_count:   wordCount,
      duration_secs: durationSecs,
      status:       "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionError) {
    console.error("[journal] finalize session:", sessionError.message);
    return { error: "Could not save your session. Please try again." };
  }

  // 2. save keystroke metrics (upsert in case of retry)
  const { error: metricsError } = await supabase
    .from("keystroke_metrics")
    .upsert(
      {
        session_id:                 sessionId,
        user_id:                    user.id,
        wpm:                        metrics.wpm                        ?? null,
        avg_dwell_time_ms:          metrics.avgDwellTimeMs             ?? null,
        avg_flight_time_ms:         metrics.avgFlightTimeMs            ?? null,
        pause_count:                metrics.pauseCount                 ?? 0,
        avg_pause_duration_ms:      metrics.avgPauseDurationMs         ?? null,
        backspace_count:            metrics.backspaceCount             ?? 0,
        delete_count:               metrics.deleteCount                ?? 0,
        error_rate:                 metrics.errorRate                  ?? null,
        burst_count:                metrics.burstCount                 ?? 0,
        avg_burst_length:           metrics.avgBurstLength             ?? null,
        total_idle_ms:              metrics.totalIdleMs                ?? 0,
        total_keystrokes:           metrics.totalKeystrokes            ?? 0,
        focus_loss_count:           metrics.focusLossCount             ?? 0,
        paste_count:                metrics.pasteCount                 ?? 0,
        productive_keystroke_ratio: metrics.productiveKeystrokeRatio   ?? null,
      },
      { onConflict: "session_id" }
    );

  // Metrics failure is non-fatal — the journal entry is saved.
  // Log it but don't block the user.
  if (metricsError) {
    console.error("[journal] metrics save:", metricsError.message);
  }

  // 3. save self-report
  const { error: reportError } = await supabase
    .from("self_reports")
    .upsert(
      { session_id: sessionId, user_id: user.id, ...scores },
      { onConflict: "session_id" }
    );

  if (reportError) {
    console.error("[journal] self-report save:", reportError.message);
    return { error: "Could not save your ratings. Please try again." };
  }

  redirect("/dashboard");
}