"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------
// BUTTON VARIANTS
// Defined as a map so adding a new variant is one line.
// forwardRef lets parent components attach refs to this button
// (e.g. for programmatic focus) — standard practice for UI primitives.
// ------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "bg-forest text-white border-transparent",
    "hover:bg-[#245c43] active:bg-[#1e5040]",
    "dark:bg-forest-dark dark:hover:bg-forest",
  ].join(" "),

  secondary: [
    "bg-white text-ink border-parchment",
    "hover:bg-linen active:bg-parchment",
    "dark:bg-dark-raised dark:text-[#f0ede8] dark:border-dark-border",
    "dark:hover:bg-[#2e2e2c]",
  ].join(" "),

  ghost: [
    "bg-transparent text-ink-muted border-transparent",
    "hover:bg-linen hover:text-ink active:bg-parchment",
    "dark:text-[#888480] dark:hover:bg-dark-surface dark:hover:text-[#f0ede8]",
  ].join(" "),

  danger: [
    "bg-danger text-white border-transparent",
    "hover:bg-[#a83830] active:bg-[#922f29]",
  ].join(" "),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-4 text-sm rounded-lg",
  lg: "h-11 px-6 text-sm rounded-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className,
  children,
  ...props
  },
  ref
) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        // Base styles shared across all variants
        "inline-flex items-center justify-center gap-2",
        "font-medium border transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "cursor-pointer select-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {/* Loading spinner — CSS only, no library needed */}
      {isLoading && (
        <span
          className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button