"use client";

// CHANGED: completely rewritten to handle two steps:
//   Step 1 — email/password form (signupAction)
//   Step 2 — OTP verification (verifySignupOtpAction + resendOtpAction)
//
// WHY TWO useActionState instances?
// Each action needs its own state tracker. signupActionState tells us
// whether to show the OTP step. otpActionState carries OTP errors/success.
// resendActionState carries the resend feedback independently.

import { useActionState, useState } from "react";
import Link from "next/link";
import { resendOtpAction, signupAction, verifySignupOtpAction } from "../actions";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/types";
import { OtpInput } from "@/components/ui/OtpInput";

const initialState: ActionState = {};

export default function SignupPage() {
  // tracks signup form submission state
  const [signupState, signupFormAction, isSignupPending] = useActionState(
    signupAction,
    initialState
  );

  // tracks OTP verification state
  const [otpState, otpFormAction, isOtpPending] = useActionState(
    verifySignupOtpAction,
    initialState
  );

  // tracks resend OTP state
  const [resendState, resendFormAction, isResendPending] = useActionState(
    resendOtpAction,
    initialState
  );

  // We store the email locally so we can:
  //   1. Pass it as a hidden input to the OTP verification form
  //   2. Display it in the "check your inbox at X" message
  const [submittedEmail, setSubmittedEmail] = useState("");

  // intercept the signup form submission to capture the email
  // before passing FormData to the action
  const handleSignupSubmit = (formData: FormData) => {
    const email = formData.get("email") as string;
    setSubmittedEmail(email.trim().toLowerCase());
    signupFormAction(formData);
  }

  // show OTP step if signup succeeded (requiresOtp signal from server)
  const showOtpStep = signupState.requiresOtp === true;

  return (
    <div>
      {/* brand header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-forest mb-4">
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

        {showOtpStep ? (
          <>
            <h1 className="text-2xl font-medium text-ink dark:text-[#F0EDE8]">
              Check your email
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-ink dark:text-[#D8D5CE]">
                {submittedEmail}
              </span>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
              Start monitoring your mental well-being
            </p>
          </>
        )}
      </div>

      {/* card */}
      <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-xl p-6">
        {/* step 1: signup form */}
        {!showOtpStep && (
          <>
            {signupState.error && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#FCECEA] dark:bg-[#2a1414] border border-[#EDAAA6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {signupState.error}
                </p>
              </div>
            )}

            <form action={handleSignupSubmit} className="flex flex-col gap-4" noValidate>
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
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                hint="At least 8 characters"
                required
              />

              <Input
                label="Confirm password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSignupPending}
                className="w-full mt-2"
              >
                {isSignupPending ? "Creating account…" : "Create account"}
              </Button>
            </form>

            {/* privacy note — important for a research tool */}
            <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center leading-relaxed">
              Your data is private and used solely for personal behavioral research.
              We do not share or sell any data.
            </p>
          </>
        )}
        
        {/* step 2: otp verification */}
        {showOtpStep && (
          <>
            {/* OTP error */}
            {otpState.error && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {otpState.error}
                </p>
              </div>
            )}

            {/* resend success */}
            {resendState.success && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#eef5e8] dark:bg-[#1a2e1e] border border-[#b8dda8] dark:border-[#2a5a30]"
                role="status"
              >
                <p className="text-sm text-[#3B6D11] dark:text-[#6dbf82]">
                  {resendState.success}
                </p>
              </div>
            )}

            {/* OTP form — hidden email + OTP input boxes */}
            <form action={otpFormAction} className="flex flex-col items-center gap-5">
              {/*
                * Hidden input carries the email to the server action.
                * The user already proved they own this email address
                * (it was validated at signup), so we trust it here.
                */}
              <input type="hidden" name="email" value={submittedEmail} />

              <OtpInput
                name="token"
                disabled={isOtpPending}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isOtpPending}
                className="w-full"
              >
                {isOtpPending ? "Verifying…" : "Verify email"}
              </Button>
            </form>

            {/* resend form — separate form, separate action */}
            <form action={resendFormAction} className="mt-4 text-center">
              <input type="hidden" name="email" value={submittedEmail} />
              <p className="text-xs text-ink-subtle dark:text-[#555250] mb-1">
                Didn&apos;t receive it?
              </p>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                isLoading={isResendPending}
              >
                {isResendPending ? "Sending…" : "Resend code"}
              </Button>
            </form>
          </>
        )}
      </div>


      {/* switch to login */}
      {!showOtpStep && (
        <p className="mt-5 text-center text-sm text-ink-muted dark:text-[#888480]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-forest dark:text-sage hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}