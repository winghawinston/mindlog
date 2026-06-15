"use client";

// ============================================================
// TYPING TRACKER HOOK
//
// Attaches to a textarea and passively records behavioral signals
// while the user writes. All computation happens in the browser —
// nothing is sent to the server until the user submits.
//
// We use refs (not state) for raw data accumulation because:
// - State updates are async and batched — we'd miss rapid events
// - We don't need React to re-render on every keystroke
// - Refs are synchronous and always current
//
// Only liveMetrics (WPM, word count, timer) uses state because
// it needs to trigger UI updates.
// ============================================================

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

// a gap longer than this between keystrokes = a pause
const PAUSE_THRESHOLD_MS = 1500;

// a gap shorter than this between keystrokes = same typing burst
const BURST_GAP_MS = 300;

// minimum keystrokes in a row to qualify as a burst
const MIN_BURST_LENGTH = 3;

// keys that don't produce characters — excluded from productive count
// and don't count as "typing" for burst/flight calculations
const NON_PRODUCTIVE_KEYS = new Set([
  "Shift", "Control", "Alt", "Meta", "CapsLock", "Tab",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Home", "End", "PageUp", "PageDown", "Insert",
  "Escape", "ContextMenu",
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),

]);

export interface ComputedMetrics {
  wpm: number;
  avgDwellTimeMs: number;       // how long keys are held down
  avgFlightTimeMs: number;      // time between keyup and next keydown
  pauseCount: number;           // gaps > 1500ms
  avgPauseDurationMs: number;
  backspaceCount: number;
  deleteCount: number;
  errorRate: number;            // (backspace + delete) / total keystrokes
  burstCount: number;           // rapid typing sequences
  avgBurstLength: number;       // average keystrokes per burst
  totalIdleMs: number;          // total time with no typing
  totalKeystrokes: number;
  focusLossCount: number;       // times user left the tab/textarea
  pasteCount: number;
  productiveKeystrokeRatio: number; // actual chars / total keystrokes
  durationSecs: number;
}

export interface LiveMetrics {
  wpm: number;
  wordCount: number;
  elapsedSecs: number;
}

export function useTypingTracker(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  isActive: boolean
) {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    wpm: 0,
    wordCount: 0,
    elapsedSecs: 0,
  });

   // --- raw data refs (never cause re-renders) ---
  const sessionStart       = useRef<number | null>(null);
  const keydownTimestamps  = useRef(new Map<string, number>());
  const lastKeyupTime      = useRef<number | null>(null);

  const dwellTimes         = useRef<number[]>([]);
  const flightTimes        = useRef<number[]>([]);
  const allKeystrokeTimes  = useRef<number[]>([]); // for burst analysis
  const pauseCount         = useRef(0);
  const pauseDurations     = useRef<number[]>([]);

  const backspaceCount     = useRef(0);
  const deleteCount        = useRef(0);
  const pasteCount         = useRef(0);
  const totalKeystrokes    = useRef(0);
  const productiveKeys     = useRef(0);
  const focusLossCount     = useRef(0);

  // idle tracking: record when typing stops, accumulate idle time on resume
  const idleStartTime      = useRef<number | null>(null);
  const totalIdleMs        = useRef(0);
  const idleTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── reset all accumulators (called between sessions) ──
  const reset = useCallback(() => {
    sessionStart.current = null;
    keydownTimestamps.current.clear();
    lastKeyupTime.current = null;
    dwellTimes.current = [];
    flightTimes.current = [];
    allKeystrokeTimes.current = [];
    pauseCount.current = 0;
    pauseDurations.current = [];
    backspaceCount.current = 0;
    deleteCount.current = 0;
    pasteCount.current = 0;
    totalKeystrokes.current = 0;
    productiveKeys.current = 0;
    focusLossCount.current = 0;
    idleStartTime.current = null;
    totalIdleMs.current = 0;
    setLiveMetrics({ wpm: 0, wordCount: 0, elapsedSecs: 0 });
  }, []);

  // ── update live display metrics (runs every 2 seconds) ──
  const updateLiveMetrics = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !sessionStart.current) return;

    const now = Date.now();
    const elapsedSecs = Math.floor((now - sessionStart.current) / 1000);
    const elapsedMins = elapsedSecs / 60;

    const text = textarea.value.trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const wpm = elapsedMins > 0.1 ? Math.round(wordCount / elapsedMins) : 0;

    setLiveMetrics({ wpm, wordCount, elapsedSecs });
  }, [textareaRef]);

  // ── compute final aggregate metrics on session submit ──
  const getComputedMetrics = useCallback((): ComputedMetrics => {
    const textarea = textareaRef.current;
    const now = Date.now();
    const start = sessionStart.current ?? now;
    const durationSecs = Math.max(1, Math.floor((now - start) / 1000));
    const elapsedMins = durationSecs / 60;

    // WPM from current textarea content
    const text = textarea?.value.trim() ?? "";
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const wpm = elapsedMins > 0 ? Math.round(wordCount / elapsedMins) : 0;

    // average dwell time — how long keys are physically held
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const avgDwellTimeMs  = avg(dwellTimes.current);
    const avgFlightTimeMs = avg(flightTimes.current);
    const avgPauseDurationMs = avg(pauseDurations.current);

    // error rate
    const errors = backspaceCount.current + deleteCount.current;
    const total  = totalKeystrokes.current;
    const errorRate = total > 0 ? errors / total : 0;

    // productive ratio
    const productiveKeystrokeRatio = total > 0 ? productiveKeys.current / total : 0;

    // burst analysis — find sequences of keystrokes with < BURST_GAP_MS between them
    const times = allKeystrokeTimes.current;
    let burstCount = 0;
    const burstLengths: number[] = [];
    let currentBurst = 1;

    for (let i = 1; i < times.length; i++) {
      if (times[i] - times[i - 1] < BURST_GAP_MS) {
        currentBurst++;
      } else {
        if (currentBurst >= MIN_BURST_LENGTH) {
          burstCount++;
          burstLengths.push(currentBurst);
        }
        currentBurst = 1;
      }
    }
    // finalize the last burst
    if (currentBurst >= MIN_BURST_LENGTH) {
      burstCount++;
      burstLengths.push(currentBurst);
    }
    const avgBurstLength = avg(burstLengths);

    // finalize idle time if the user stopped typing before submitting
    let finalIdleMs = totalIdleMs.current;
    if (idleStartTime.current !== null) {
      finalIdleMs += now - idleStartTime.current;
    }

    // round to 2 decimal places for DB storage
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const r4 = (n: number) => Math.round(n * 10000) / 10000;

    return {
      wpm,
      avgDwellTimeMs:          r2(avgDwellTimeMs),
      avgFlightTimeMs:         r2(avgFlightTimeMs),
      pauseCount:              pauseCount.current,
      avgPauseDurationMs:      r2(avgPauseDurationMs),
      backspaceCount:          backspaceCount.current,
      deleteCount:             deleteCount.current,
      errorRate:               r4(errorRate),
      burstCount,
      avgBurstLength:          r2(avgBurstLength),
      totalIdleMs:             finalIdleMs,
      totalKeystrokes:         total,
      focusLossCount:          focusLossCount.current,
      pasteCount:              pasteCount.current,
      productiveKeystrokeRatio: r4(productiveKeystrokeRatio),
      durationSecs,
    };
  }, [textareaRef])

  // ── attach/detach event listeners ──
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isActive) return;

    if (!sessionStart.current) {
      sessionStart.current = Date.now();
    }

    const onKeydown = (e: KeyboardEvent) => {
      const now = Date.now();
      const key = e.key;

      totalKeystrokes.current++;
      if (!NON_PRODUCTIVE_KEYS.has(key)) productiveKeys.current++;
      if (key === "Backspace") backspaceCount.current++;
      if (key === "Delete")    deleteCount.current++;

      // store timestamp for dwell time calculation on keyup
      keydownTimestamps.current.set(key, now);

      // flight time = gap between last keyup and this keydown
      if (lastKeyupTime.current !== null) {
        const gap = now - lastKeyupTime.current;
        flightTimes.current.push(gap);

        if (gap > PAUSE_THRESHOLD_MS) {
          pauseCount.current++;
          pauseDurations.current.push(gap);
        }
      }

      // if there was an idle period, close it
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      if (idleStartTime.current !== null) {
        totalIdleMs.current += now - idleStartTime.current;
        idleStartTime.current = null;
      }

      allKeystrokeTimes.current.push(now);
    }

    const onKeyup = (e: KeyboardEvent) => {
      const now = Date.now();
      const key = e.key;

      // dwell time = how long the key was physically held
      const downTime = keydownTimestamps.current.get(key);
      if (downTime !== undefined) {
        dwellTimes.current.push(now - downTime);
        keydownTimestamps.current.delete(key);
      }

      lastKeyupTime.current = now;

      // ADDED: clear any existing idle timer before scheduling a new one.
      // WHY: rapid keyup events (e.g. releasing two keys quickly) could
      // otherwise leave an orphaned timer that fires later and overwrites
      // idleStartTime with a stale timestamp, slightly skewing totalIdleMs.
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        idleStartTime.current = now;
      }, PAUSE_THRESHOLD_MS);
    }

    const onPaste = () => { pasteCount.current++; };

    // focus loss — user left the textarea or switched tabs
    const onBlur = () => { focusLossCount.current++; };
    const onVisibility = () => {
      if (document.hidden) focusLossCount.current++;
    };

    textarea.addEventListener("keydown", onKeydown);
    textarea.addEventListener("keyup",   onKeyup);
    textarea.addEventListener("paste",   onPaste);
    textarea.addEventListener("blur",    onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    // update live display every 2 seconds
    liveIntervalRef.current = setInterval(updateLiveMetrics, 2000);

    return () => {
      textarea.removeEventListener("keydown", onKeydown);
      textarea.removeEventListener("keyup",   onKeyup);
      textarea.removeEventListener("paste",   onPaste);
      textarea.removeEventListener("blur",    onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (idleTimerRef.current)    clearTimeout(idleTimerRef.current);
    };
  }, [isActive, textareaRef, updateLiveMetrics]);

  return { liveMetrics, getComputedMetrics, reset };
}