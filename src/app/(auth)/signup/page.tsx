"use client";

// CHANGED: completely rewritten to handle two steps:
//   Step 1 — email/password form (signupAction)
//   Step 2 — OTP verification (verifySignupOtpAction + resendOtpAction)
//
// WHY TWO useActionState instances?
// Each action needs its own state tracker. signupActionState tells us
// whether to show the OTP step. otpActionState carries OTP errors/success.
// resendActionState carries the resend feedback independently.

// CHANGED: replaced useActionState with useTransition for all steps.
// WHY: signup is a multi-step flow (form → OTP → redirect). useActionState
// is designed for single-step forms. useTransition gives us direct control
// over when and how each server action is called — same pattern as onboarding.
//
// FIXED: removed `form action={customFunction}` — that pattern is only valid
// for direct Server Actions. Client-side logic before submission must use
// `form onSubmit` with event.preventDefault() instead.

import { useState, useTransition } from "react";
import Link from "next/link";
import { resendOtpAction, signupAction, verifySignupOtpAction } from "../actions";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/types";
import { OtpInput } from "@/components/ui/OtpInput";
import { Card } from "@/components/ui/Card";

type SignupStep = "form" | "otp";

export default function SignupPage() {
  const [step, setStep] = useState<SignupStep>("form");

  // We store the email locally so we can:
  //   1. Pass it as a hidden input to the OTP verification form
  //   2. Display it in the "check your inbox at X" message
  const [submittedEmail, setSubmittedEmail] = useState("");

  // seperate error states for each action, since they can fail independently
  // and they surface in different parts of the UI
  const [formError, setFormError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // CHANGED: split into three independent transitions.
  // WHY: the OTP step renders two buttons (Verify, Resend) at once.
  // A shared isPending makes clicking one show loading on the other —
  // same bug class as the onboarding Save/Skip buttons.
  const [isFormPending, startFormTransition]   = useTransition();
  const [isOtpPending, startOtpTransition]     = useTransition();
  const [isResendPending, startResendTransition] = useTransition();

  // step 1: submit signup form
  const handleSignupSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    // IMPORTANT: prevent the browser's native form submission.
    // Without this, the browser would try to POST the form itself,
    // bypassing our server action entirely.
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string).trim().toLowerCase();

    startFormTransition(async () => {
      const result: ActionState = await signupAction({}, formData);

      if (result?.error) {
        setFormError(result.error);
        return;
      }

      // no error = supabase sent the OTP email, so we can move to the next step
      setSubmittedEmail(email);
      setStep("otp");
    });
  }

  // step 2: verify OTP
  const handleOtpSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpError(null);

    const formData = new FormData(e.currentTarget);

    startOtpTransition(async () => {
      const result: ActionState = await verifySignupOtpAction({}, formData);

      if (result?.error) {
        setOtpError(result.error);
      }
      // No error = verifySignupOtpAction called redirect("/onboarding")
      // The page navigates automatically — nothing more needed here
    });
  };

  // resend OTP
  const handleResend = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResendMessage(null);

    const formData = new FormData(e.currentTarget);

    startResendTransition(async () => {
      const result: ActionState = await resendOtpAction({}, formData);

      setResendMessage(
        result?.error
          ? { type: "error", text: result.error }
          : { type: "success", text: "A new code has been sent." }
      );
    });
  };

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

        {step === "otp" ? (
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
      <Card className="">
        {/* step 1: signup form */}
        {step === "form" && (
          <>
            {formError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#EDAAA6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {formError}
                </p>
              </div>
            )}

            {/* on submit — correct pattern for client logic before server action */}
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4" noValidate>
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
                isLoading={isFormPending}
                className="w-full mt-2"
              >
                {isFormPending ? "Creating account…" : "Create account"}
              </Button>
            </form>

            {/* privacy note — important for a research tool */}
            <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center leading-relaxed">
              Your data is private and used solely for personal behavioral research.
              We do not share or sell any data.
            </p>
          </>
        )}

        {/* step 2: OTP verification */}
        {step === "otp" && (
          <>
            {/* OTP error */}
            {otpError && (
              <div
                className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
                role="alert"
              >
                <p className="text-sm text-danger dark:text-[#e87070]">
                  {otpError}
                </p>
              </div>
            )}

            {/* OTP form — hidden email + OTP input boxes */}
            <form onSubmit={handleOtpSubmit} className="flex flex-col items-center gap-5">
              {/*
                * Hidden input carries the email to the server action.
                * The user already proved they own this email address
                * (it was validated at signup), so we trust it here.
                */}
              <input type="hidden" name="email" value={submittedEmail} />

              <OtpInput name="token" disabled={isOtpPending} />

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

            {/* resend — seperate form so it doesn't submit the OTP form */}
            <form onSubmit={handleResend} className="mt-4 text-center">
                <input type="hidden" name="email" value={submittedEmail} />

                {resendMessage && (
                <p
                  className={`text-xs mb-2 ${
                    resendMessage.type === "success"
                      ? "text-[#3b6d11] dark:text-[#6dbf82]"
                      : "text-danger"
                  }`}
                >
                  {resendMessage.text}
                </p>
              )}

              {/* resend form — separate form */}
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
      </Card>


      {/* switch to login */}
      {step === "form" && (
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