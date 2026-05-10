"use client";

// useActionState is React 19's hook for managing Server Action state.
// It replaces the older useFormState from react-dom.
// It gives us: [currentState, formAction, isPending]
// - currentState: whatever the server action last returned
// - formAction: pass this to <form action={...}>
// - isPending: true while the server action is running

import type { ActionState } from "@/types";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Link from "next/link";

const initialState: ActionState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

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
        <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8]">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-[#888480]">
          Sign in to your MindLog account
        </p>
      </div>

      {/* card */}
      <div className="bg-white dark:bg-dark-surface border border-parchment dark:border-dark-border rounded-xl p-6 shadow-none">
        {/* Global error from server action */}
        {state.error && (
          <div
            className="mb-4 px-3 py-2.5 rounded-lg bg-[#FCECEA] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
            role="alert"
          >
            <p className="text-sm text-danger dark:text-[#e87070]">
              {state.error}
            </p>
          </div>
        )}

        {/* form action={formAction} is the Server Action pattern.
            When the form submits, Next.js serializes the FormData
            and sends it to the server action — no fetch() needed. */}
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
      </div>

      {/* switch to signup */}
      <p className="mt-5 text-center text-sm text-ink-muted dark:text-[#888480]">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-forest dark:text-sage hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
