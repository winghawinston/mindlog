"use client";

// ============================================================
// JOURNAL PAGE — two phases:
//
// Phase A — Mood check:
//   User rates 5 emotional dimensions BEFORE writing. Pre-writing
//   ratings capture a truer baseline — post-writing state can be
//   altered by the catharsis of the session itself.
//   Skipped automatically if a draft is restored from localStorage,
//   since the original mood scores are restored alongside the content.
//
// Phase B — Writing canvas:
//   Textarea + passive typing tracker running in the background.
//   Live stats bar shows WPM, word count, and elapsed time.
//   Autosaves to Supabase every 30 seconds.
//   "Done writing" validates, captures final keystroke metrics,
//   shows a context-aware toast, and submits everything to the DB.
// ============================================================

import { useTypingTracker } from "@/hooks/useTypingTracker";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { autosaveSessionAction, createDraftSessionsAction, submitSessionAction } from "./actions";
import type { ActionState } from "@/types";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import type { ComputedMetrics } from "@/hooks/useTypingTracker";
import { ScoreInput } from "@/components/ui/ScoreInput";

const MIN_WORDS = 10;
const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

// ADDED: localStorage key for crash-recovery draft persistence.
// Keyed to "cadence" not the session ID so it survives page refreshes
// before a session ID is even created.
const DRAFT_STORAGE_KEY = "cadence-journal-draft";

interface StoredDraft {
  content: string;
  sessionId: string | null;
  savedAt: string; // ISO timestamp, shown to user as "Restored from {time}"
  // ADDED: scores are saved alongside content so crash recovery can
  // skip the mood-check phase and restore the original ratings.
  scores?: Record<string, number>;
}

// ── Two phases now: mood check BEFORE writing, then writing + submit ──
// WHY: pre-writing mood captures emotional state before any catharsis
// from the journaling itself. More scientifically valid as a baseline.
type JournalStep = "mood-check" | "writing";

// ── Score definitions for the self-report step ──────────────
const SCORE_FIELDS = [
  { name: "mood_score",    label: "Mood",    low: "Struggling",      high: "Thriving" },
  { name: "stress_score",  label: "Stress",  low: "Completely calm", high: "Overwhelming" },
  { name: "anxiety_score", label: "Anxiety", low: "At ease",         high: "On edge" },
  { name: "focus_score",   label: "Focus",   low: "Scattered",       high: "Locked in" },
  { name: "fatigue_score", label: "Fatigue", low: "Fully rested",    high: "Exhausted" },
] as const;

type ScoreName = typeof SCORE_FIELDS[number]["name"];

// context-aware toast message based on pre-writing mood score
function getMoodToast(mood: number): { message: string; subtext: string } {
  if (mood <= 3) {
    return {
      message: "That took courage to write.",
      subtext: "Even on hard days, showing up matters.",
    };
  }
  if (mood <= 5) {
    return {
      message: "Session captured.",
      subtext: "Your rhythm is building a picture over time.",
    };
  }
  if (mood <= 7) {
    return {
      message: "Good session.",
      subtext: "Keep the momentum going.",
    };
  }
  return {
    message: "Great energy today.",
    subtext: "Cadence noticed — high days look different when you type.",
  };
}

export default function JournalPage() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ADDED: stores metrics captured at the moment "Done writing" is clicked.
  // WHY: calling getComputedMetrics() on submit is too late — the textarea
  // has already unmounted (it's inside {step === "writing" && (...)}), so
  // textareaRef.current is null and wordCount/wpm compute as 0.
  const capturedMetricsRef = useRef<ComputedMetrics | null>(null);

  const [step, setStep]           = useState<JournalStep>("mood-check");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [content, setContent]     = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [autosaveLabel, setAutosaveLabel] = useState<"saved" | "saving" | "unsaved">("unsaved");

  // ADDED: restore notice — shown briefly when a draft was recovered
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  // self-report scores — all default to 5 (midpoint)
  const [scores, setScores] = useState<Record<ScoreName, number>>({
    mood_score:    5,
    stress_score:  5,
    anxiety_score: 5,
    focus_score:   5,
    fatigue_score: 5,
  });

  // ADDED: toast state for the completion animation
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSubtext, setToastSubtext] = useState("");

  const [isSubmitPending, startSubmitTransition] = useTransition();

  // typing tracker only runs during the writing phase
  const { liveMetrics, getComputedMetrics } = useTypingTracker(
    textareaRef,
    step === "writing"
  );

  // ── Create draft session on mount ───────────────────────
  useEffect(() => {
    (async () => {
      // ADDED: check localStorage for an existing draft before creating a
      // new session. This is the crash-recovery mechanism — if the user
      // closed the tab mid-session, their content is still here.
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const draft: StoredDraft = JSON.parse(raw);
          if (draft.content.trim()) {
            setContent(draft.content);

            // ADDED: if the draft includes mood scores from the original session,
            // restore them and skip mood-check entirely.
            // WHY: the saved scores correspond to this specific draft — showing
            // mood-check again would capture a different (current) emotional state
            // unrelated to the session being continued.
            if (draft.scores) {
              setScores(draft.scores as Record<ScoreName, number>);
              setStep("writing"); // skip mood-check — scores already captured
            }

            const savedTime = new Date(draft.savedAt).toLocaleTimeString(
              "en-US",
              { hour: "numeric", minute: "2-digit" }
            );
            setRestoredNotice(`Draft restored from ${savedTime}`);
            // Clear the notice after 4 seconds
            setTimeout(() => setRestoredNotice(null), 4000);
          }
        }
      } catch {
        // localStorage read failed — silent, non-fatal
      }

      const result = await createDraftSessionsAction();
      if ("sessionId" in result) {
        setSessionId(result.sessionId);
      } else {
        setError("Could not start session. Please refresh the page.");
      }
    })();

    // Clear canvas mode when leaving the journal page
    // return () => setCanvasMode(false);
  }, []);

  // ── Save to localStorage on every content change ─────────
  // This is the actual crash-recovery save — runs on every keystroke.
  // The autosave to Supabase runs on a 30s interval separately.
  useEffect(() => {
    if (!content.trim()) return; // don't save empty content

    try {
      const draft: StoredDraft = {
        content,
        sessionId,
        savedAt: new Date().toISOString(),
        // ADDED: only save scores once the user has passed mood-check.
        // Before that, step === "mood-check" and scores aren't finalised yet.
        ...(step === "writing" && { scores }),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // localStorage write failed (e.g. private browsing quota) — silent
    }
  }, [content, sessionId, step, scores]);

  // ── Autosave every 30 seconds ───────────────────────────
  const doAutosave = useCallback(async () => {
    if (!sessionId || step !== "writing" || !content.trim()) return;

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

  // ── Canvas mode: signal when textarea is focused ──────────
  // const handleFocus = () => setCanvasMode(true);
  // const handleBlur  = () => setCanvasMode(false);

  // ── Phase 1 → Phase 2: start writing ──────────────────────
  const handleStartWriting = () => {
    setError(null);
    setStep("writing");
  };

  // ── Phase 2: done writing → validate → submit ─────────────
  // CHANGED: "Done writing" now submits directly — no third step.
  // WHY: the self-report is already captured (mood-check phase above).
  // Capturing metrics is safe here because the textarea is still mounted.
  const handleDoneWriting = () => {
    setError(null);

    if (liveMetrics.wordCount < MIN_WORDS) {
      setError(`Please write at least ${MIN_WORDS} words before submitting.`);
      return;
    }

    // Use what we captured at "Done writing" time.
    // Fallback to getComputedMetrics() for safety, but in practice
    // capturedMetricsRef.current will always be set by this point.
    const metrics: ComputedMetrics = getComputedMetrics();

    // CHANGED: clear localStorage BEFORE the server call, not after.
    // WHY: submitSessionAction calls redirect() server-side, which navigates
    // before the client's callback can run localStorage.removeItem().
    // Clearing here is safe — content is in React state; if submission fails,
    // the user stays on this page and can retry with content intact.
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch { /* silent */ }

    // show context-aware toast immediately (before redirect)
    const { message, subtext } = getMoodToast(scores.mood_score);
    setToastMessage(message);
    setToastSubtext(subtext);
    setToastVisible(true);

    // ADDED: show completion toast with session stats
    const mins = Math.floor(liveMetrics.elapsedSecs / 60);
    const secs = liveMetrics.elapsedSecs % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    setToastSubtext(`${liveMetrics.wordCount} words · ${timeStr} · ${liveMetrics.wpm} wpm`);

    const formData = new FormData();
    formData.set("session_id",    sessionId!);
    formData.set("content",       content);
    formData.set("word_count",    String(liveMetrics.wordCount));
    formData.set("duration_secs", String(metrics.durationSecs));
    formData.set("metrics",       JSON.stringify(metrics));

    Object.entries(scores).forEach(([key, val]) => formData.set(key, String(val)));

    startSubmitTransition(async () => {
      const result: ActionState = await submitSessionAction({}, formData);
      if (result?.error) {
        setError(result.error);
        setToastVisible(false);
      }
      // No error = server called redirect("/dashboard")
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
      <header
        className={cn(
          "flex items-center justify-between px-6 py-4 shrink-0",
          "border-b border-parchment dark:border-dark-border",
          "bg-white/90 dark:bg-dark-surface/90 backdrop-blur-sm",
        )}
      >
        <div>
          <h1 className="text-base font-medium text-ink dark:text-[#f0ede8]">
            {step === "mood-check" ? "Before you write…" : "Today's entry"}
          </h1>
          <p className="text-xs text-ink-subtle dark:text-[#555250]">
            {step === "mood-check"
              ? "Cadence works best when you're honest with yourself. How are you feeling right now, before you start writing?"
              : "Write freely. Your typing is being captured passively. Don't worry about editing — just get your thoughts out. When you're done, click the button to submit."}
          </p>
        </div>

        {step === "writing" && (
          <Button
            variant="primary"
            size="md"
            onClick={handleDoneWriting}
            disabled={!sessionId}
            isLoading={isSubmitPending}
          >
            {isSubmitPending ? "Saving…" : "Done writing →"}
          </Button>
        )}
      </header>

      {/* ── error banner ─────────────────────────────────── */}
      {error && (
        <div className="px-6 py-3 bg-[#fcecea] dark:bg-[#2a1414] border-b border-[#edaaa6] dark:border-[#5a2020]" role="alert">
          <p className="text-sm text-danger dark:text-[#e87070]">{error}</p>
        </div>
      )}

      {/* ── draft restored notice ─────────────────────────────── */}
      {restoredNotice && (
        <div className="px-6 py-2 bg-mint/30 dark:bg-[#1a2e1e] border-b border-sage/20 dark:border-sage/10">
          <p className="text-xs text-forest dark:text-sage">{restoredNotice}</p>
        </div>
      )}

      {/* ── PHASE 1: Mood check (before writing) ─────────── */}
      {step === "mood-check" && (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-lg mx-auto space-y-6">
            {SCORE_FIELDS.map((field) => (
              <Card key={field.name} className="p-5">
                <ScoreInput
                  label={field.label}
                  value={scores[field.name]}
                  onChange={(val) =>
                    setScores((prev) => ({ ...prev, [field.name]: val }))
                  }
                  lowLabel={field.low}
                  highLabel={field.high}
                  disabled={!sessionId}
                />
              </Card>
            ))}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartWriting}
              disabled={!sessionId}
            >
              Start writing →
            </Button>

            <p className="text-xs text-ink-subtle dark:text-[#555250] text-center pb-4">
              These ratings are captured before you write so they reflect your
              true state — not one shaped by the session itself.
            </p>
          </div>
        </div>
      )}

      {/* ── PHASE 2: Writing canvas ───────────────────────── */}
      {step === "writing" && (
        <>
          {/* textarea — fills remaining height */}
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
                "text-base leading-relaxed text-ink dark:text-[#d8d5ce]",
                "bg-transparent placeholder:text-ink-subtle dark:placeholder:text-[#444440]",
                "focus:outline-none"
              )}
              disabled={!sessionId}
              spellCheck
            />
          </div>

          {/* stats bar */}
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

      {/* ── Toast notification ────────────────────────────────── */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        subtext={toastSubtext}
        onDismiss={() => setToastVisible(false)}
      />
    </div>
  )
}