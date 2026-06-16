"use client";

// ============================================================
// JOURNAL PAGE — two phases:
//
// Phase A — Writing:
//   Textarea + passive typing tracker running in background.
//   Live stats bar shows WPM, word count, timer.
//   Autosaves every 30 seconds.
//
// Phase B — Self-report:
//   After clicking "Done writing", user rates mood/stress/etc.
//   Submitting sends everything to DB and redirects to dashboard.
// ============================================================

import { useTypingTracker } from "@/hooks/useTypingTracker";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { autosaveSessionAction, createDraftSessionsAction, submitSessionAction } from "./actions";
import type { ActionState } from "@/types";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const MIN_WORDS = 10;
const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

type JournalStep = "writing" | "self-report";

// ── Score definitions for the self-report step ──────────────
const SCORE_FIELDS = [
  { name: "mood_score",    label: "Mood",    low: "Very low",  high: "Excellent" },
  { name: "stress_score",  label: "Stress",  low: "None",      high: "Overwhelming" },
  { name: "anxiety_score", label: "Anxiety", low: "None",      high: "Severe" },
  { name: "focus_score",   label: "Focus",   low: "Scattered", high: "Sharp" },
  { name: "fatigue_score", label: "Fatigue", low: "Energised", high: "Exhausted" },
] as const;

type ScoreName = typeof SCORE_FIELDS[number]["name"];

export default function JournalPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ADDED: stores metrics captured at the moment "Done writing" is clicked.
  // WHY: calling getComputedMetrics() on submit is too late — the textarea
  // has already unmounted (it's inside {step === "writing" && (...)}), so
  // textareaRef.current is null and wordCount/wpm compute as 0.
  const capturedMetricsRef = useRef<ReturnType<typeof getComputedMetrics> | null>(null);

  const [step, setStep]           = useState<JournalStep>("writing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [content, setContent]     = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState<"saved" | "saving" | "unsaved">("unsaved");

  // self-report scores — all default to 5 (midpoint)
  const [scores, setScores] = useState<Record<ScoreName, number>>({
    mood_score:    5,
    stress_score:  5,
    anxiety_score: 5,
    focus_score:   5,
    fatigue_score: 5,
  });

  const [isSubmitPending, startSubmitTransition] = useTransition();

  // typing tracker only runs during the writing phase
  const { liveMetrics, getComputedMetrics } = useTypingTracker(
    textareaRef,
    step === "writing"
  );

  // ── Create draft session on mount ───────────────────────
  useEffect(() => {
    (async () => {
      const result = await createDraftSessionsAction();
      if ("sessionId" in result) {
        setSessionId(result.sessionId);
      } else {
        setError("Could not start session. Please refresh the page.");
      }
    })();
  }, []);

  // ── Autosave every 30 seconds ───────────────────────────
  const doAutosave = useCallback(async () => {
    if (!sessionId || step !== "writing") return;

    setAutosaveLabel("saving");
    await autosaveSessionAction(
      sessionId,
      content,
      liveMetrics.wordCount,
      liveMetrics.elapsedSecs
    );
    setAutosaveLabel("saved");
  }, [sessionId, content, liveMetrics, step]);

  useEffect(() => {
    const interval = setInterval(doAutosave, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [doAutosave]);

  // ── "Done writing" → validate and move to self-report ──
  // CHANGED: capture metrics HERE, before step changes and textarea unmounts
  const handleDoneWriting = () => {
    setError(null);
    if (liveMetrics.wordCount < MIN_WORDS) {
      setError(`Please write at least ${MIN_WORDS} words before submitting.`);
      return;
    }
    // Textarea is still mounted here — ref is valid — metrics are correct
    capturedMetricsRef.current = getComputedMetrics();
    setStep("self-report");
  };

  // ── Submit everything ────────────────────────────────────
  // CHANGED: use capturedMetricsRef instead of calling getComputedMetrics() again
  const handleSubmit = () => {
    if (!sessionId) return;
    setError(null);

    // Use what we captured at "Done writing" time.
    // Fallback to getComputedMetrics() for safety, but in practice
    // capturedMetricsRef.current will always be set by this point.
    const metrics = capturedMetricsRef.current ?? getComputedMetrics();

    const formData = new FormData();
    formData.set("session_id",   sessionId);
    formData.set("content",      content);
    formData.set("word_count",   String(liveMetrics.wordCount));
    formData.set("duration_secs", String(metrics.durationSecs));
    formData.set("metrics",      JSON.stringify(metrics));

    Object.entries(scores).forEach(([key, val]) => {
      formData.set(key, String(val));
    });

    startSubmitTransition(async () => {
      const result: ActionState = await submitSessionAction({}, formData);
      if (result?.error) setError(result.error);
      // No error = submitSessionAction called redirect("/dashboard")
    });
  };

  // ── Format elapsed time as MM:SS ────────────────────────
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ── top bar ───────────────────────────────────────  */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-parchment dark:border-dark-border bg-white dark:bg-dark-surface shrink-0">
        <div>
          <h1 className="text-base font-medium text-ink dark:text-[#F0EDE8]">
            {step === "writing" ? "Today's entry" : "How are you feeling?"}
          </h1>
          <p className="text-xs text-ink-subtle dark:text-[#555250]">
            {step === "writing"
              ? "Write freely. Your typing is being recorded passively."
              : "Rate each dimension honestly. There are no right answers."}
          </p>
        </div>

        {step === "writing" && (
          <Button
            variant="primary"
            size="md"
            onClick={handleDoneWriting}
            disabled={!sessionId}
          >
            Done writing →
          </Button>
        )}
      </header>

      {/* ── error banner ─────────────────────────────────── */}
      {error && (
        <div className="px-6 py-3 bg-[#FCECEA] dark:bg-[#2A1414] border-b border-[#EDAAA6] dark:border-[#5A2020]" role="alert">
          <p className="text-sm text-danger dark:text-[#E87070]">{error}</p>
        </div>
      )}

      {/* ── WRITING PHASE ────────────────────────────────── */}
      {step === "writing" && (
        <>
          {/* Textarea — fills remaining height */}
          <div className="flex-1 p-6 overflow-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setAutosaveLabel("unsaved");
              }}
              placeholder="Start writing your thoughts, feelings, or anything on your mind…"
              className={cn(
                "w-full h-full min-h-100 resize-none",
                "text-base leading-relaxed text-ink dark:text-[#D8D5CE]",
                "bg-transparent placeholder:text-ink-subtle dark:placeholder:text-[#444440]",
                "focus:outline-none"
              )}
              disabled={!sessionId}
              spellCheck
            />
          </div>

          {/* Stats bar */}
          <footer className="px-6 py-3 border-t border-parchment dark:border-dark-border bg-white dark:bg-dark-surface shrink-0">
            <div className="flex items-center gap-6 text-xs text-ink-subtle dark:text-[#555250]">
              <span>
                <span className={cn(
                  "font-medium",
                  liveMetrics.wordCount >= MIN_WORDS
                    ? "text-forest dark:text-sage"
                    : "text-ink dark:text-[#888480]"
                )}>
                  {liveMetrics.wordCount}
                </span>{" "}
                words
                {liveMetrics.wordCount < MIN_WORDS && (
                  <span className="text-ink-subtle dark:text-[#555250]">
                    {" "}(min {MIN_WORDS})
                  </span>
                )}
              </span>

              <span>{formatTime(liveMetrics.elapsedSecs)}</span>

              <span>
                {liveMetrics.wpm > 0 ? `${liveMetrics.wpm} wpm` : "—"}
              </span>

              <span className="ml-auto">
                {autosaveLabel === "saving" && "Saving…"}
                {autosaveLabel === "saved"  && "✓ Saved"}
                {autosaveLabel === "unsaved" && ""}
              </span>
            </div>
          </footer>
        </>
      )}

      {/* ── SELF-REPORT PHASE ────────────────────────────── */}
      {step === "self-report" && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-lg mx-auto space-y-4">
            {SCORE_FIELDS.map((field) => (
              <Card key={field.name} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ink dark:text-[#D8D5CE]">
                    {field.label}
                  </span>
                  <span className="text-lg font-medium text-forest dark:text-sage w-8 text-right">
                    {scores[field.name]}
                  </span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={scores[field.name]}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [field.name]: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full accent-forest dark:accent-sage cursor-pointer"
                />

                <div className="flex justify-between mt-1">
                  <span className="text-xs text-ink-subtle dark:text-[#555250]">
                    {field.low}
                  </span>
                  <span className="text-xs text-ink-subtle dark:text-[#555250]">
                    {field.high}
                  </span>
                </div>
              </Card>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => { setStep("writing"); setError(null); }}
                disabled={isSubmitPending}
              >
                ← Back to writing
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleSubmit}
                isLoading={isSubmitPending}
                disabled={!sessionId}
              >
                {isSubmitPending ? "Saving…" : "Submit session"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}