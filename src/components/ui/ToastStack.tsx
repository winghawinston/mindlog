"use client";

import { cn } from "@/lib/utils";
import { Info, CheckCircle, X } from "lucide-react";
import { useEffect } from "react";

export interface ToastItem {
  id: string;
  message: string;
  subtext?: string;
  type?: "success" | "info";
  duration?: number; // ms before auto-dismiss, default 4000
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

// The stack renders at bottom-right. Each toast is offset upward by its
// index so they don't overlap — newest on top, oldest at the bottom.
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div
      className="fixed bottom-6 right-4 md:right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(
      () => onDismiss(toast.id),
      toast.duration ?? 5000
    );
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const isSuccess = toast.type !== "info";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl",
        "bg-white dark:bg-dark-surface",
        "border border-parchment dark:border-dark-border",
        "shadow-lg w-80",
        // Slides up from below on mount
        "animate-in slide-in-from-bottom-2 fade-in duration-300"
      )}
    >
      {/* icon */}
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
          isSuccess
            ? "bg-mint dark:bg-[#1A2E1E]"
            : "bg-[#E8F1FA] dark:bg-[#1A2030]"
        )}
      >
        {isSuccess ? (
          <CheckCircle
            size={18}
            className="text-forest dark:text-sage"
            aria-hidden="true"
          />
        ) : (
          <Info
            size={18}
            className="text-info dark:text-[#7BAEDD]"
            aria-hidden="true"
          />
        )}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-medium text-ink dark:text-[#F0EDE8] leading-tight">
          {toast.message}
        </p>
        {toast.subtext && (
          <p className="text-xs text-ink-muted dark:text-[#888480] mt-0.5">
            {toast.subtext}
          </p>
        )}
      </div>

      {/* dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-ink-subtle dark:text-[#555250] hover:text-ink dark:hover:text-[#D8D5CE] transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}