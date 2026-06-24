"use client";

// ============================================================
// PROFILE TABS — Client Component
//
// Four tabs:
//   Account     → email display + username
//   Security    → MFA enrollment / removal
//   Preferences → edit past logs toggle
//   Data        → reset keystroke metrics
//
// MFA enrollment is a multi-step flow within the Security tab:
//   idle → enrolling (shows QR + code input) → enrolled
// ============================================================

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import {
  enrollMfaAction,
  resetMetricsAction,
  toggleEditPastLogsAction,
  unenrollMfaAction,
  updateUsernameAction,
  verifyMfaEnrollmentAction,
} from "@/app/(dashboard)/profile/actions";
import type { ActionState } from "@/types";
import { CheckCircle, ShieldCheck, ShieldOff, TriangleAlert } from "lucide-react";
import Image from "next/image";

type Tab = "account" | "security" | "preferences" | "data";

const TABS: { key: Tab; label: string }[] = [
  { key: "account",     label: "Account"     },
  { key: "security",    label: "Security"    },
  { key: "preferences", label: "Preferences" },
  { key: "data",        label: "Data"        },
];

interface ProfileTabsProps {
  userEmail: string;
  username: string;
  mfaEnabled: boolean;
  editPastLogs: boolean;
  totpFactorId: string | null;
  sessionCount: number;
  metricsCount: number;
  defaultTab: Tab;
}

export function ProfileTabs({
  userEmail,
  username: initialUsername,
  mfaEnabled: initialMfaEnabled,
  editPastLogs: initialEditPastLogs,
  totpFactorId: initialFactorId,
  sessionCount,
  metricsCount,
  defaultTab,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div>
      {/* tab bar */}
      <div className="flex gap-1 border-b border-parchment dark:border-dark-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors duration-150",
              "border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-forest text-forest dark:border-sage dark:text-sage"
                : "border-transparent text-ink-muted hover:text-ink dark:text-[#888480] dark:hover:text-[#D8D5CE]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* tab panels */}
      {activeTab === "account" && (
        <AccountTab
          userEmail={userEmail}
          initialUsername={initialUsername}
        />
      )}
      {activeTab === "security" && (
        <SecurityTab
          initialMfaEnabled={initialMfaEnabled}
          initialFactorId={initialFactorId}
        />
      )}
      {activeTab === "preferences" && (
        <PreferencesTab initialEditPastLogs={initialEditPastLogs} />
      )}
      {activeTab === "data" && (
        <DataTab sessionCount={sessionCount} metricsCount={metricsCount} />
      )}
    </div>
  );
}

// ── Account Tab ──────────────────────────────────────────────
function AccountTab({
  userEmail,
  initialUsername,
}: {
  userEmail: string;
  initialUsername: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateUsernameAction({}, formData);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-1">
          Email
        </p>
        <p className="text-sm text-ink dark:text-[#D8D5CE]">{userEmail}</p>
        <p className="text-xs text-ink-subtle dark:text-[#555250] mt-1">
          Email address cannot be changed.
        </p>
      </Card>

      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display name"
            name="username"
            defaultValue={initialUsername}
            placeholder="How should we call you?"
            hint="Used in greetings on your dashboard."
          />

          {result?.error && (
            <p className="text-sm text-danger dark:text-[#E87070]">{result.error}</p>
          )}
          {result?.success && (
            <p className="text-sm text-forest dark:text-sage">{result.success}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isPending}
          >
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────
type MfaFlowState = "idle" | "enrolling" | "enrolled";

function SecurityTab({
  initialMfaEnabled,
  initialFactorId,
}: {
  initialMfaEnabled: boolean;
  initialFactorId: string | null;
}) {
  // local state mirrors server state so the UI updates without a reload
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [factorId, setFactorId]     = useState(initialFactorId);
  const [flow, setFlow]             = useState<MfaFlowState>(
    initialMfaEnabled ? "enrolled" : "idle"
  );

  // MFA enrollment state
  const [qrDataUrl, setQrDataUrl]   = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode]             = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleStartEnroll = () => {
    setError(null);
    startTransition(async () => {
      const result = await enrollMfaAction();
      
      // CHANGED: was checking "error" in result — that doesn't narrow the union
      // because ActionState.error is optional (may not be a key at all).
      // Checking "uri" in result narrows to the success branch correctly.
      if (!("uri" in result)) {
        setError((result as ActionState).error ?? "Something went wrong.");
        return;
      }
      // TypeScript now knows result is { uri: string; factorId: string }
      try {
        const dataUrl = await QRCode.toDataURL(result.uri, { width: 200, margin: 2 });
        setQrDataUrl(dataUrl);
        setPendingFactorId(result.factorId);
        setFlow("enrolling");
      } catch {
        setError("Could not generate QR code. Please try again.");
      }
    });
  };

  const handleVerify = () => {
    if (!pendingFactorId) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyMfaEnrollmentAction(pendingFactorId, code);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMfaEnabled(true);
      setFactorId(pendingFactorId);
      setFlow("enrolled");
      setSuccess("Two-factor authentication is now active.");
    });
  };

  const handleUnenroll = () => {
    if (!factorId) return;
    setError(null);
    startTransition(async () => {
      const result = await unenrollMfaAction(factorId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMfaEnabled(false);
      setFactorId(null);
      setFlow("idle");
      setSuccess("Two-factor authentication removed.");
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
              mfaEnabled
                ? "bg-mint dark:bg-[#1A2E1E]"
                : "bg-linen dark:bg-dark-raised"
            )}>
              {mfaEnabled ? (
                <ShieldCheck size={20} className="text-forest dark:text-sage" aria-hidden="true" />
              ) : (
                <ShieldOff size={20} className="text-ink-muted dark:text-[#888480]" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-ink dark:text-[#F0EDE8]">
                Two-factor authentication
              </p>
              <p className="text-xs text-ink-muted dark:text-[#888480] mt-0.5">
                {mfaEnabled
                  ? "Your account is protected with an authenticator app."
                  : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>

          {/* status badge */}
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-md shrink-0",
            mfaEnabled
              ? "bg-mint text-forest dark:bg-[#1A2E1E] dark:text-sage"
              : "bg-linen text-ink-muted dark:bg-dark-raised dark:text-[#888480]"
          )}>
            {mfaEnabled ? "Active" : "Inactive"}
          </span>
        </div>

        {/* error / success messages */}
        {error && (
          <p className="text-sm text-danger dark:text-[#E87070] mt-4">{error}</p>
        )}
        {success && (
          <p className="text-sm text-forest dark:text-sage mt-4">{success}</p>
        )}

        {/* idle state — prompt to enroll */}
        {flow === "idle" && (
          <Button
            variant="primary"
            size="md"
            className="mt-5"
            onClick={handleStartEnroll}
            isLoading={isPending}
          >
            Set up authenticator
          </Button>
        )}

        {/* enrolling state — QR code + code input */}
        {flow === "enrolling" && qrDataUrl && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-ink dark:text-[#D8D5CE]">
              Scan this QR code with your authenticator app (Google Authenticator,
              Authy, etc.), then enter the 6-digit code below.
            </p>

            {/* QR code */}
            <div className="flex justify-center">
              <Image
                src={qrDataUrl}
                alt="MFA QR code — scan with your authenticator app"
                width={200}
                height={200}
                unoptimized
                className="rounded-lg border border-parchment dark:border-dark-border"
              />
            </div>

            {/* code input */}
            <Input
              label="Verification code"
              name="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              hint="Enter the 6-digit code from your authenticator app."
              autoComplete="one-time-code"
              inputMode="numeric"
            />

            <div className="flex gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleVerify}
                disabled={code.length !== 6}
                isLoading={isPending}
              >
                Verify and activate
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => { setFlow("idle"); setQrDataUrl(null); setCode(""); }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* enrolled state — option to remove */}
        {flow === "enrolled" && (
          <Button
            variant="ghost"
            size="md"
            className="mt-5 text-danger hover:bg-[#FCECEA] dark:hover:bg-[#2A1414] dark:text-[#E87070]"
            onClick={handleUnenroll}
            isLoading={isPending}
          >
            Remove two-factor authentication
          </Button>
        )}
      </Card>
    </div>
  );
}

// ── Preferences Tab ──────────────────────────────────────────
function PreferencesTab({
  initialEditPastLogs,
}: {
  initialEditPastLogs: boolean;
}) {
  const [editPastLogs, setEditPastLogs] = useState(initialEditPastLogs);
  const [isPending, startTransition]    = useTransition();
  const [result, setResult]             = useState<ActionState | null>(null);

  const handleToggle = () => {
    setResult(null);
    startTransition(async () => {
      const res = await toggleEditPastLogsAction(editPastLogs);
      if (!res?.error) setEditPastLogs((v) => !v);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink dark:text-[#F0EDE8]">
              Allow editing past logs
            </p>
            <p className="text-xs text-ink-muted dark:text-[#888480] mt-0.5">
              When enabled, past journal entries can be edited from Past Logs.
              Disabled by default to preserve behavioral data integrity.
            </p>
          </div>

          {/* toggle button */}
          <button
            type="button"
            role="switch"
            aria-checked={editPastLogs}
            onClick={handleToggle}
            disabled={isPending}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0",
              "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
              editPastLogs
                ? "bg-forest dark:bg-sage"
                : "bg-parchment dark:bg-dark-border"
            )}
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white",
              "transition-transform duration-200",
              editPastLogs ? "translate-x-5" : "translate-x-0"
            )} />
          </button>
        </div>

        {result?.error && (
          <p className="text-sm text-danger dark:text-[#E87070] mt-3">{result.error}</p>
        )}
        {result?.success && (
          <p className="text-sm text-forest dark:text-sage mt-3">{result.success}</p>
        )}
      </Card>
    </div>
  );
}

// ── Data Tab ─────────────────────────────────────────────────
function DataTab({
  sessionCount,
  metricsCount,
}: {
  sessionCount: number;
  metricsCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult]          = useState<ActionState | null>(null);
  const [confirmed, setConfirmed]    = useState(false);

  const handleReset = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setResult(null);
    setConfirmed(false);
    startTransition(async () => {
      const res = await resetMetricsAction();
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      {/* session summary */}
      <Card className="p-5">
        <p className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide mb-3">
          Your data
        </p>
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-medium text-ink dark:text-[#F0EDE8]">
              {sessionCount}
            </p>
            <p className="text-xs text-ink-subtle dark:text-[#555250]">
              journal sessions
            </p>
          </div>
          <div>
            <p className="text-2xl font-medium text-ink dark:text-[#F0EDE8]">
              {metricsCount}
            </p>
            <p className="text-xs text-ink-subtle dark:text-[#555250]">
              metric records
            </p>
          </div>
        </div>
      </Card>

      {/* reset metrics */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FEF2F2] dark:bg-[#2A1414] shrink-0">
            <TriangleAlert size={16} className="text-danger dark:text-[#E87070]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink dark:text-[#F0EDE8]">
              Reset keystroke metrics
            </p>
            <p className="text-xs text-ink-muted dark:text-[#888480] mt-0.5">
              Deletes all {metricsCount} metric record{metricsCount !== 1 ? "s" : ""} from your account.
              Journal entries and mood scores are not affected. This cannot be undone.
            </p>
          </div>
        </div>

        {result?.success && (
          <div className="flex items-center gap-2 text-sm text-forest dark:text-sage mb-3">
            <CheckCircle size={14} />
            {result.success}
          </div>
        )}
        {result?.error && (
          <p className="text-sm text-danger dark:text-[#E87070] mb-3">{result.error}</p>
        )}

        <Button
          variant="danger"
          size="md"
          onClick={handleReset}
          isLoading={isPending}
          disabled={metricsCount === 0}
        >
          {confirmed ? "Click again to confirm" : "Reset all metrics"}
        </Button>

        {confirmed && (
          <p className="text-xs text-ink-muted dark:text-[#888480] mt-2">
            This will delete {metricsCount} record{metricsCount !== 1 ? "s" : ""}. Are you sure?
          </p>
        )}
      </Card>
    </div>
  );
}