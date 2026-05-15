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
import { useActionState } from "react";
import { loginAction, verifyMfaAction } from "../actions";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { OtpInput } from "@/components/ui/OtpInput";

const initialState: ActionState = {};

export default function LoginPage() {
  const [loginState, loginFormAction, isLoginPending] = useActionState(
    loginAction,
    initialState
  );

  const [mfaState, mfaFormAction, isMfaPending] = useActionState(
    verifyMfaAction,
    initialState
  );

  // show MFA step if login succeeded but user has MFA enrolled
  const showMfaStep = loginState.requiresMfa === true;

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

        {showMfaStep ? (
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
      <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-xl p-6 shadow-none">
        {/* step 1: password login */}
        {!showMfaStep && (
          <>
            {loginState.error && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {loginState.error}
                </p>
              </div>
            )}

            {/* form action={formAction} is the Server Action pattern.
                When the form submits, Next.js serializes the FormData
                and sends it to the server action — no fetch() needed. */}
            <form action={loginFormAction} className="flex flex-col gap-4" noValidate>
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
                isLoading={isLoginPending}
                className="w-full mt-2"
              >
                {isLoginPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </>
        )}

        {/* step 2: MFA TOTP challenge */}
        {showMfaStep && (
          <>
            {mfaState.error && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {mfaState.error}
                </p>
              </div>
            )}

            <form action={mfaFormAction} className="flex flex-col items-center gap-5">
              <OtpInput
                name="code"
                disabled={isMfaPending}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isMfaPending}
                className="w-full"
              >
                {isMfaPending ? "Verifying…" : "Verify"}
              </Button>
            </form>

            <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center">
              Open Google Authenticator, Authy, or similar app to find your code.
            </p>
          </>
        )}
      </div>

      {/* switch to signup */}
      {!showMfaStep && (
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
