"use client";

// ============================================================
// MFA PROMPT MODAL
//
// Shown once when the user lands on the dashboard if:
//   1. They haven't enabled MFA
//   2. They haven't dismissed this prompt before
//
// "Set up now" → routes to /profile (settings page, Phase 5)
// "Not now"    → dismisses and stores flag in localStorage
//
// We check the flag in a useEffect so it only runs in the
// browser — localStorage doesn't exist on the server.
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "./Card";
import { ShieldCheck, X } from "lucide-react";
import Button from "./Button";

// CHANGED: localStorage key + body copy
const DISMISSED_KEY = "cadence-mfa-prompt-dismissed";

interface MfaPromptProps {
  // pass the user's mfa_enabled value from their profile.
  // if true, this component renders nothing.
  mfaEnabled: boolean;
}

export function MfaPrompt({ mfaEnabled }: MfaPromptProps) {
  // start hidden — we check localStorage before showing
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // don't show if MFA is already on
    if (mfaEnabled) return;

    // don't show if user already dismissed it
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // small delay so the dashboard loads first — less jarring than
    // showing the modal instantly on navigation
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [mfaEnabled]);

  const handleDismiss = () => {
    // store dismissal so prompt doesn't reappear this browser session.
    // We use localStorage (persists across sessions) rather than
    // sessionStorage — showing this every single login is annoying.
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  const handleSetUp = () => {
    handleDismiss();
    // routes to profile/security settings where MFA enrollment lives
    router.push("/profile?tab=security");
  };

  if (!visible) return null;

  return (
    // backdrop — fixed overlay behind the modal
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(28, 28, 26, 0.4)" }}
      // clicking the backdrop dismisses the modal
      onClick={handleDismiss}
    >
      {/* stop clicks inside the card from closing the modal */}
      <div
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="relative p-6">
          {/* dismiss X */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute top-4 right-4 text-ink-subtle hover:text-ink dark:text-[#555250] dark:hover:text-[#d8d5ce] transition-colors"
          >
            <X size={16} />
          </button>

          {/* icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-mint dark:bg-[#1a2e1e] mb-4">
            <ShieldCheck
              size={20}
              className="text-forest dark:text-sage"
              aria-hidden="true"
            />

          </div>
          
          {/* copy */}
          <h2 className="text-base font-medium text-ink dark:text-[#f0ede8] mb-1">
            Secure your account
          </h2>
          <p className="text-sm text-ink-muted dark:text-[#888480] leading-relaxed mb-5">
            Cadence stores sensitive behavioral and mood data. Two-factor
            authentication ensures only you can access your journal — even
            if your password is ever compromised.
          </p>

          {/* actions */}
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleSetUp}
            >
              Set up two-factor authentication
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={handleDismiss}
            >
              Not now
            </Button>
          </div>

          {/* reassurance */}
          <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center">
            You can enable this anytime in Profile → Security.
          </p>
        </Card>
      </div>
    </div>
  )
}