"use client";

import { type InputHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, type, ...props }, ref) => {
    // Generate a stable id if none provided, for label association
    const inputId = id ?? `input-${props.name}`;

    // ADDED: track password visibility state.
    // Only relevant when type="password" — ignored otherwise.
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";

    // If it's a password field, we swap between "password" and "text"
    // based on the toggle state. All other field types pass through unchanged.
    const resolvedType = isPasswordField ? showPassword ? "text" : "password" : type;

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

        {/* wrapper needed to position the toggle button inside the input */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            autoComplete="off" // prevents the browser from suggesting past emails or passwords, which can interfere with our custom UI and styling. ps: it did. don't ask.
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
              // add right padding when toggle button is present so text
              // doesn't run under the eye icon
              isPasswordField && "pr-10",
              // Error state overrides border color
              error && "border-danger focus:border-danger dark:border-danger",
              className
            )}
            {...props}
          />

          {/* eye toggle — only renders for password fields */}
          {isPasswordField && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              // Keep this button out of the form's tab order — the user
              // can still reach it, but it doesn't interrupt normal flow
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-ink-subtle hover:text-ink-muted",
                "dark:text-[#555250] dark:hover:text-[#888480]",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:text-forest",
                "dark:focus-visible:text-sage"
              )}
            >
              {showPassword
                ? <EyeOff size={16} aria-hidden="true" />
                : <Eye size={16} aria-hidden="true" />
              }
            </button>
          )}
        </div>

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