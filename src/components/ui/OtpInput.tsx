"use client";

import { cn } from "@/lib/utils";
import { ClipboardEvent, KeyboardEvent, useRef, useState } from "react";

interface OtpInputProps {
  // how many digits. default 6 — matches Supabase's OTP length.
  length?: number;
  // called when all boxes are filled — useful for auto-submitting
  onComplete?: (otp: string) => void;
  // name used for the hidden input that submits the full OTP string
  name?: string;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  onComplete,
  name = "otp",
  disabled = false,
}: OtpInputProps) {
  // each box is its own string charater, or empty string if not filled
  const [values, setValues] = useState<string[]>(Array(length).fill(""));

  // we keep refs to each input so we can programmatically focus the next one after each entry
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // the complete OTP string derived from the individual boxes. This is what gets submitted in the hidden input.
  const fullValue = values.join("");

  const focusBox = (index: number) => {
    inputRefs.current[index]?.focus();
  }

  const handleChange = (index: number, char: string) => {
    // only allow digits, and only one character per box
    if (!/^\d?$/.test(char)) return;

    const next = [...values];
    next[index] = char;
    setValues(next);

    // auto-advance focus if a digit was entered
    if (index < length - 1) {
      focusBox(index + 1);
    }

    // notify parent if all boxes are filled
    const complete = next.join("");
    if (complete.length === length && !next.includes("")) {
      onComplete?.(complete);
    }
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...values];

      if (values[index]) {
        // clear current box if it has a value
        next[index] = "";
        setValues(next);
      } else if (index > 0) {
        // move back and clear previous box if current is already empty
        next[index - 1] = "";
        setValues(next);
        focusBox(index - 1);
      }
    }

    if (event.key === "ArrowLeft" && index > 0) focusBox(index - 1);
    if (event.key === "ArrowRight" && index < length - 1) focusBox(index + 1);
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    // extract digits from pasted text and fill boxes starting from the first one
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const next = [...values];
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });
    setValues(next);

    // focus the box after the last pasted digit
    const nextFocusIndex = Math.min(pasted.length, length - 1);
    focusBox(nextFocusIndex);

    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2.5">
        {values.map((values, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            // change to off to prevent browser autofill
            autoComplete="one-time-code" // changes keyboard on mobile to show numbers and may trigger OTP autofill
            value={values}
            disabled={disabled}
            // we handle input ourselves to control auto-advancing and pasting behavior
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            // select all text on focus — makes replacing a digit easier if user clicks a box after filling it
            onFocus={(e) => e.target.select()}
            className={cn(
              "w-11 h-14 text-center text-xl font-medium rounded-lg",
              "border bg-white text-ink",
              "dark:bg-dark-surface dark:text-[#d8d5ce]",
              "transition-colors duration-150",
              values 
                ? "border-forest dark:border-sage" // filled box gets accent border
                : "border-parchment dark:border-dark-border", // empty box gets default
              "focus:border-forest focus:outline-none ring-0",
              "dark:focus:border-sage",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        ))}
      </div>

      {/*
        * Hidden input that actually submits the full OTP string when the form submits.
        * This allows the parent form to receive the OTP as a single value, while we manage the individual boxes in the UI.
      */}
      <input type="hidden" name={name} value={fullValue} />
    </div>
  )
}