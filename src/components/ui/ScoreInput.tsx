"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface ScoreInputProps {
  label: string;
  value: number;       // 1–10
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  disabled?: boolean;
}

export function ScoreInput({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  disabled = false,
}: ScoreInputProps) {
  const decrement = () => onChange(Math.max(1, value - 1));
  const increment = () => onChange(Math.min(10, value + 1));

  return (
    <div className={cn("space-y-3", disabled && "opacity-50 pointer-events-none")}>
      {/* label row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink dark:text-[#d8d5ce]">
          {label}
        </span>
        {/* current value — prominent, anchored right */}
        <span className="text-2xl font-medium text-forest dark:text-sage w-8 text-right leading-none">
          {value}
        </span>
      </div>

      {/* controls row: minus — track — plus */}
      <div className="flex items-center gap-3">
        {/* decrement */}
        <button
          type="button"
          onClick={decrement}
          disabled={value <= 1 || disabled}
          aria-label={`Decrease ${label}`}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border shrink-0",
            "transition-colors duration-150",
            "border-parchment dark:border-dark-border",
            "text-ink-muted dark:text-[#888480]",
            "hover:border-forest hover:text-forest",
            "dark:hover:border-sage dark:hover:text-sage",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-parchment disabled:hover:text-ink-muted"
          )}
        >
          <Minus size={14} />
        </button>

        {/* track — 10 clickable dots */}
        <div className="flex-1 flex items-center justify-between">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((dot) => (
            <button
              key={dot}
              type="button"
              onClick={() => onChange(dot)}
              disabled={disabled}
              aria-label={`Set ${label} to ${dot}`}
              className={cn(
                "rounded-full transition-all duration-150 cursor-pointer",
                dot === value
                  // Active dot: larger, accent color
                  ? "w-4 h-4 bg-forest dark:bg-sage scale-110"
                  : dot < value
                  // Past dots: smaller, semi-filled
                  ? "w-2.5 h-2.5 bg-forest/30 dark:bg-sage/30 hover:bg-forest/60 dark:hover:bg-sage/60"
                  // Future dots: smallest, faint
                  : "w-2 h-2 bg-parchment dark:bg-dark-border hover:bg-forest/20 dark:hover:bg-sage/20"
              )}
            />
          ))}
        </div>

        {/* increment */}
        <button
          type="button"
          onClick={increment}
          disabled={value >= 10 || disabled}
          aria-label={`Increase ${label}`}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border shrink-0",
            "transition-colors duration-150",
            "border-parchment dark:border-dark-border",
            "text-ink-muted dark:text-[#888480]",
            "hover:border-forest hover:text-forest",
            "dark:hover:border-sage dark:hover:text-sage",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-parchment disabled:hover:text-ink-muted"
          )}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* extreme labels */}
      <div className="flex justify-between px-11">
        <span className="text-xs text-ink-subtle dark:text-[#555250]">{lowLabel}</span>
        <span className="text-xs text-ink-subtle dark:text-[#555250]">{highLabel}</span>
      </div>
    </div>
  )
}