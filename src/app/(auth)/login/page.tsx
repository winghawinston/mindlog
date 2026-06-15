"use client";

// useActionState is React 19's hook for managing Server Action state.
// It replaces the older useFormState from react-dom.
// It gives us: [currentState, formAction, isPending]
// - currentState: whatever the server action last returned
// - formAction: pass this to <form action={...}>
// - isPending: true while the server action is running

// CHANGED: added MFA challenge step.
// If loginAction returns requiresMfa: true, we show the TOTP
// input instead of redirecting. The user enters their 6-digit
// authenticator app code, which verifyMfaAction validates.

import type { ActionState } from "@/types";
import { useActionState, useState, useTransition } from "react";
import { loginAction, verifyMfaAction } from "../actions";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { OtpInput } from "@/components/ui/OtpInput";
import { Card } from "@/components/ui/Card";

type LoginStep =  "form" | "mfa";

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("form");

  const [formError, setFormError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleLoginSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    // IMPORTANT: prevent the browser's native form submission.
    // Without this, the browser would try to POST the form itself,
    // bypassing our server action entirely.
    e.preventDefault();
    setFormError(null); // clear previous errors

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result: ActionState = await loginAction({}, formData);

      if (result?.error) {
        setFormError(result.error);
        return;
      }

      if (result?.requiresMfa) {
        setStep("mfa");
        return;
      }

      // no error, no MFA = loginAction called redirect("/dashboard")
    });
  }

  const handleMfaSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMfaError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result: ActionState = await verifyMfaAction({}, formData);

      if (result?.error) {
        setMfaError(result.error);
      }
      // no error = verifyMfaAction called redirect("/dashboard")
    });
  };

  return (
    <div className="">
      {/* brand header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-forest mb-4">
          {/* Simple pulse icon — represents the monitoring/heartbeat concept */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 10h3l2-6 3 12 2-8 1 2h5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {step === "mfa" ? (
          <>
            <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
              Two-factor authentication
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
              Enter the code from your authenticator app
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
              Sign in to your MindLog account
            </p>
          </>
        )}
      </div>

      {/* card */}
      <Card className="shadow-none">
        {/* step 1: password login */}
        {step === "form" && (
          <>
            {formError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {formError}
                </p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4" noValidate>
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isPending}
                className="w-full mt-2"
              >
                {isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </>
        )}

        {/* step 2: MFA TOTP challenge */}
        {step === "mfa" && (
          <>
            {mfaError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {mfaError}
                </p>
              </div>
            )}

            <form onSubmit={handleMfaSubmit} className="flex flex-col items-center gap-5">
              <OtpInput name="code" disabled={isPending} />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isPending}
                className="w-full"
              >
                {isPending ? "Verifying…" : "Verify"}
              </Button>
            </form>

            <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center">
              Open Google Authenticator, Authy, or similar app to find your code.
            </p>
          </>
        )}
      </Card>

      {/* switch to signup */}
      {step === "form" && (
        <p className="mt-5 text-center text-sm text-ink-muted dark:text-[#888480]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-forest dark:text-sage hover:underline"
          >
            Create one
          </Link>
        </p>
      )}
    </div>
  )
}
