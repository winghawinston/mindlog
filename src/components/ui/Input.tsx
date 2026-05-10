"use client";

import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    // Generate a stable id if none provided, for label association
    const inputId = id ?? `input-${props.name}`;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-ink-muted dark:text-[#888480] uppercase tracking-wide"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Light mode: white field on linen background — softer contrast
            "w-full h-10 px-3 text-sm rounded-lg",
            "bg-white border border-parchment text-ink",
            "placeholder:text-ink-subtle",
            // Dark mode: dark surface, warm border
            "dark:bg-dark-surface dark:border-dark-border",
            "dark:text-[#d8d5ce] dark:placeholder:text-[#555250]",
            // States
            "transition-colors duration-150",
            "hover:border-[#c4c1ba] dark:hover:border-[#444440]",
            "focus:border-forest focus:outline-none",
            "dark:focus:border-sage",
            // Error state overrides border color
            error && "border-danger focus:border-danger dark:border-danger",
            className
          )}
          {...props}
        />

        {/* Error or hint — error takes priority */}
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-ink-subtle dark:text-[#555250]">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };