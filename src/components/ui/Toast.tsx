"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, X } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  subtext?: string;
  visible: boolean;
  onDismiss: () => void;
  duration?: number; // ms before auto-dismiss, default 4000
}

export function Toast({
  message,
  subtext,
  visible,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  // CHANGED: removed mounted state and its useEffect entirely.
  // WHY: setMounted(true) inside useEffect was a synchronous setState
  // triggered by a prop change — React 19 flags this as an anti-pattern
  // (causes cascading renders for no benefit).
  // FIX: keep the element in the DOM always. CSS transitions handle
  // visibility. pointer-events-none prevents interaction when invisible.

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  return (
    // CHANGED: moved from bottom-6 to top-4 — matches where "Done writing"
    // button lives so the user's eye is already in that area.
    // CHANGED: larger padding, wider max-w, bigger icon for visibility.
    // CHANGED: animation now slides DOWN from top (translate-y negative → 0)
    // instead of sliding up from bottom.
    <div
      className={cn(
        "fixed top-4 right-4 md:right-6 z-50",
        "flex items-start gap-4 px-5 py-4 rounded-2xl",
        "bg-white dark:bg-dark-surface",
        "border border-parchment dark:border-dark-border",
        "shadow-xl max-w-sm w-full",
        // slide-in/out animation
        "transition-all duration-300 ease-out",
        visible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-3 opacity-0 pointer-events-none"
      )}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      {/* icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-mint dark:bg-[#1A2E1E] shrink-0">
        <CheckCircle size={20} className="text-forest dark:text-sage" aria-hidden="true" />
      </div>

      {/* text */}
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-base font-medium text-ink dark:text-[#f0ede8] leading-tight">
          {message}
        </p>
        {subtext && (
          <p className="text-sm text-ink-muted dark:text-[#888480] mt-1">
            {subtext}
          </p>
        )}
      </div>

      {/* dismiss button */}
      <button
        onClick={onDismiss}
        className="text-ink-subtle dark:text-[#555250] hover:text-ink dark:hover:text-[#d8d5ce] transition-colors shrink-0 mt-1"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}