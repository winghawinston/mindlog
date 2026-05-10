"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "../actions";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionState } from "@/types";

const initialState: ActionState = {};

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  );

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
        <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
          Start monitoring your mental well-being
        </p>
      </div>

      {/* card */}
      <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-xl p-6">
        {state.error && (
          <div
            className="mb-4 px-3 py-2.5 rounded-lg bg-[#FCECEA] dark:bg-[#2a1414] border border-[#EDAAA6] dark:border-[#5a2020]"
            role="alert"
          >
            <p className="text-sm text-danger dark:text-[#e87070]">
              {state.error}
            </p>
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-4" noValidate>
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
            isLoading={isPending}
            className="w-full mt-2"
          >
            {isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        {/* Privacy note — important for a research tool */}
        <p className="mt-4 text-xs text-ink-subtle dark:text-[#555250] text-center leading-relaxed">
          Your data is private and used solely for personal behavioral research.
          We do not share or sell any data.
        </p>
      </div>

      {/* Switch to login */}
      <p className="mt-5 text-center text-sm text-ink-muted dark:text-[#888480]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-forest dark:text-sage hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}