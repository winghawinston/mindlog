"use-client";

import { useState } from "react";
import { Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "cadence-privacy-consent";

export function PrivacyConsentModal() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false; // SSR: hide by default
    return !localStorage.getItem(CONSENT_KEY);       // show if not dismissed
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleAgree = () => {
    if (dontShowAgain) {
      localStorage.setItem(CONSENT_KEY, "true");
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28, 28, 26, 0.5)" }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface rounded-2xl border border-parchment dark:border-dark-border p-6 shadow-xl">
        {/* icon */}
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-forest/10 dark:bg-forest/20 mb-4">
          <Shield size={22} className="text-forest dark:text-sage" aria-hidden="true" />
        </div>

        {/* heading */}
        <h2 className="text-lg font-medium text-ink dark:text-[#F0EDE8] mb-1">
          Your words stay with you
        </h2>
        <p className="text-xs text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-4">
          Local-first privacy
        </p>

        {/* commitments */}
        <div className="space-y-2.5 mb-5">
          {[
            "Cadence captures how you type — not what you type.",
            "Your journal text is stored privately under your account.",
            "Only timing gaps between keystrokes are sent to analytics.",
            "No text is ever shared with third parties.",
          ].map((line) => (
            <div key={line} className="flex items-start gap-2.5">
              <span className="text-forest dark:text-sage text-sm mt-0.5 shrink-0">✓</span>
              <p className="text-sm text-ink dark:text-[#D8D5CE] leading-snug">{line}</p>
            </div>
          ))}
        </div>

        {/* don't show again toggle */}
        <label className="flex items-center gap-2.5 mb-5 cursor-pointer group">
          <div
            onClick={() => setDontShowAgain((v) => !v)}
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0",
              dontShowAgain
                ? "bg-forest border-forest dark:bg-sage dark:border-sage"
                : "border-parchment dark:border-dark-border group-hover:border-forest dark:group-hover:border-sage"
            )}
          >
            {dontShowAgain && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-xs text-ink-muted dark:text-[#888480]">
            Don&apos;t show this again
          </span>
        </label>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleAgree}
        >
          I understand
        </Button>
      </div>
    </div>
  )
}