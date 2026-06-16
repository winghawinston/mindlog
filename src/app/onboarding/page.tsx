"use client";

// useTransition is used here instead of useActionState because this is a
// multi-step form — the data lives in local state across steps, not in
// FormData at submission time. We manually build the FormData on submit
// and call the server action directly inside startTransition.
//
// useActionState is better when you have a single <form> with one submit.
// useTransition is better when you control the submission imperatively.
import type { ActionState, MentalHealthCondition } from "@/types";
import { useState, useTransition } from "react";
import { saveOnboardingAction, skipOnboardingAction } from "./actions";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

// ============================================================
// TYPES
// ============================================================

type Step = 1 | 2 | 3;

interface ConditionConfig {
  value: MentalHealthCondition;
  label: string;
  description: string;
}

// ============================================================
// CONSTANTS
// ============================================================

// Conditions rendered as pill toggles in Step 2.
// "none" and "prefer_not_to_say" are exclusive — selecting them
// deselects everything else. The rest are combinable.
const CONDITIONS: ConditionConfig[] = [
  { value: "anxiety",          label: "Anxiety",            description: "Worry, tension, restlessness" },
  { value: "depression",       label: "Depression",         description: "Low mood, loss of interest" },
  { value: "burnout",          label: "Burnout",            description: "Exhaustion from chronic stress" },
  { value: "adhd",             label: "ADHD",               description: "Attention & focus difficulties" },
  { value: "insomnia",         label: "Insomnia",           description: "Difficulty sleeping" },
  { value: "other",            label: "Other",              description: "Something not listed here" },
];

const EXCLUSIVE_CONDITIONS: MentalHealthCondition[] = [
  "none",
  "prefer_not_to_say",
];

// ============================================================
// MAIN PAGE — orchestrates step state and data across steps
// ============================================================

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);

  // Step 2 state
  const [selectedConditions, setSelectedConditions] = useState<MentalHealthCondition[]>([]);
  const [otherText, setOtherText] = useState("");

  // Step 3 state
  const [sleepHours, setSleepHours] = useState("");
  const [caffeineMg, setCaffeineMg] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");

  // Submission state
  const [error, setError] = useState<string | null>(null);

  // CHANGED: two separate transitions so each button has its own pending state.
  // WHY: a single useTransition means both buttons show their loading state
  // simultaneously, which is visually wrong and confusing for the user.
  const [isSavePending, startSaveTransition] = useTransition();
  const [isSkipPending, startSkipTransition] = useTransition();

  // Toggle a condition pill on/off with exclusivity logic
  const toggleCondition = (condition: MentalHealthCondition) => {
    setSelectedConditions((prev) => {
      // Selecting "none" or "prefer_not_to_say" clears all others
      if (EXCLUSIVE_CONDITIONS.includes(condition)) {
        return prev.includes(condition) ? [] : [condition];
      }
      // Selecting a normal condition removes any exclusive ones
      const withoutExclusive = prev.filter(
        (c) => !EXCLUSIVE_CONDITIONS.includes(c)
      );
      return withoutExclusive.includes(condition)
        ? withoutExclusive.filter((c) => c !== condition)
        : [...withoutExclusive, condition];
    });
  };

  const handleSubmit = () => {
    setError(null);

    // ADDED: validate that at least one lifestyle field is filled.
    // WHY: "Complete setup" implies there's something to save. If all
    // fields are empty, the button is semantically identical to "Skip" —
    // so we prompt the user to either fill something in or use Skip.
    const hasInput =
      selectedConditions.length > 0 ||
      otherText.trim() !== "" ||
      sleepHours.trim() !== "" ||
      caffeineMg.trim() !== "" ||
      medicationNotes.trim() !== "";

    if (!hasInput) {
      setError(
        "Please fill in at least one field, or use 'Skip this step' to go to your dashboard."
      );
      return;
    }

    // Manually build FormData from local state across all steps.
    // Arrays must be JSON-stringified since FormData doesn't support them natively.
    const formData = new FormData();
    formData.set("conditions", JSON.stringify(selectedConditions));
    formData.set("condition_other_text", otherText.trim());
    formData.set("medication_notes", medicationNotes.trim());
    formData.set("avg_sleep_hours", sleepHours);
    formData.set("daily_caffeine_mg", caffeineMg);

    // startTransition marks this as a non-urgent state update.
    // isPending becomes true while the server action is running,
    // which we use to show the loading state on the submit button.
    startSaveTransition(async () => {
      const result: ActionState = await saveOnboardingAction({}, formData);
      if (result?.error) setError(result.error);
      // No error = server called redirect("/dashboard"), page navigates automatically
    });
  };

  const handleSkip = () => {
    startSkipTransition(async () => {
      await skipOnboardingAction();
    });
  };

  return (
    <div className="min-h-screen bg-linen dark:bg-dark-bg flex flex-col items-center justify-center px-4 py-12">
      {/* ambient background — same treatment as auth layout for visual continuity */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(82,183,136,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(201,169,110,0.05) 0%, transparent 50%)
          `,
        }}
      />

      <div className="relative w-full max-w-md">
        <StepIndicator currentStep={step} totalSteps={3} />

        {step === 1 && (
          <StepWelcome
            onNext={() => setStep(2)}
            onSkip={handleSkip}
            isSkipPending={isSkipPending}
          />
        )}

        {step === 2 && (
          <StepConditions
            selectedConditions={selectedConditions}
            otherText={otherText}
            onToggle={toggleCondition}
            onOtherTextChange={setOtherText}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepLifestyle
            sleepHours={sleepHours}
            caffeineMg={caffeineMg}
            medicationNotes={medicationNotes}
            error={error}
            isSavePending={isSavePending}
            isSkipPending={isSkipPending}
            onSleepChange={(v) => { setSleepHours(v); setError(null); }}
            onCaffeineChange={(v) => { setCaffeineMg(v); setError(null); }}
            onMedicationChange={(v) => { setMedicationNotes(v); setError(null); }}
            onBack={() => { setStep(2); setError(null); }}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// STEP INDICATOR
// Shows progress through the 3-step flow.
// ============================================================

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: Step;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              s === currentStep
                ? "bg-forest dark:bg-sage w-6" // active step is wider
                : s < currentStep
                ? "bg-forest/40 dark:bg-sage/40" // completed steps
                : "bg-parchment dark:bg-dark-border" // upcoming steps
            )}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STEP 1 — WELCOME
// Explains what Cadence is and what this setup does.
// Sets expectations before asking for any sensitive info.
// ============================================================

function StepWelcome({
  onNext,
  onSkip,
  isSkipPending,
}: {
  onNext: () => void;
  onSkip: () => void;
  isSkipPending: boolean;
}) {
  return (
    <div>
      <div className="mb-8 text-center">
        {/* logo mark */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-forest dark:bg-forest-dark mb-5">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M2 10h3l2-6 3 12 2-8 1 2h5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-medium text-ink dark:text-[#f0ede8] mb-2">
          Welcome to Cadence
        </h1>
        <p className="text-sm text-ink-muted dark:text-[#888480] leading-relaxed">
          Let&apos;s set up your profile. This helps give your data more context —
          everything here is optional and private.
        </p>
      </div>

      {/* What we collect — transparency is important for a research tool */}
      <Card className="p-5 mb-4 space-y-3">
        <p className="text-xs font-medium text-ink-subtle dark:text-[#555250] uppercase tracking-wide">
          What Cadence tracks
        </p>

        {[
          {
            icon: "⌨️",
            label: "Typing behavior",
            desc: "Speed, pauses, corrections — passively during journaling",
          },
          {
            icon: "📝",
            label: "Journal entries",
            desc: "What you write, with optional daily reflections",
          },
          {
            icon: "📊",
            label: "Self-reported scores",
            desc: "Mood, stress, focus, fatigue — after each session",
          },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span className="text-base mt-0.5" aria-hidden="true">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-ink dark:text-[#d8d5ce]">
                {item.label}
              </p>
              <p className="text-xs text-ink-subtle dark:text-[#555250]">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </Card>

      {/* privacy note */}
      <p className="text-xs text-ink-subtle dark:text-[#555250] text-center mb-6 leading-relaxed">
        Cadence is a behavioral research tool. It does not diagnose, treat,
        or provide medical advice. Your data is never shared.
      </p>

      <Button
        variant="primary"
        size="lg"
        className="w-full mb-3"
        onClick={onNext}
      >
        Set up my profile
      </Button>

      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={onSkip}
        isLoading={isSkipPending}
      >
        Skip setup, go to dashboard
      </Button>
    </div>
  );
}

// ============================================================
// STEP 2 — CONDITIONS
// Pill-style multi-select for mental health context.
// ============================================================

function StepConditions({
  selectedConditions,
  otherText,
  onToggle,
  onOtherTextChange,
  onBack,
  onNext,
}: {
  selectedConditions: MentalHealthCondition[];
  otherText: string;
  onToggle: (c: MentalHealthCondition) => void;
  onOtherTextChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const showOtherInput = selectedConditions.includes("other");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium text-ink dark:text-[#f0ede8] mb-1">
          Mental health context
        </h2>
        <p className="text-sm text-ink-muted dark:text-[#888480]">
          Select any that apply. This provides context for your data — nothing
          is stored externally.
        </p>
      </div>

      <Card className="p-5 mb-4">
        {/* regular conditions — multi-select */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CONDITIONS.map((condition) => (
            <ConditionPill
              key={condition.value}
              config={condition}
              isSelected={selectedConditions.includes(condition.value)}
              onToggle={() => onToggle(condition.value)}
            />
          ))}
        </div>

        {/* "Other" free text — only shown when "other" is selected */}
        {showOtherInput && (
          <div className="mt-3 pt-3 border-t border-parchment dark:border-dark-border">
            <Input
              label="Please describe"
              placeholder="e.g. chronic pain, OCD, grief..."
              value={otherText}
              onChange={(e) => onOtherTextChange(e.target.value)}
              maxLength={200}
            />
          </div>
        )}

        {/* Divider between conditions and exclusive options */}
        <div className="my-4 border-t border-parchment dark:border-dark-border" />

        {/* Exclusive options — selecting either clears all above */}
        <div className="flex flex-wrap gap-2">
          {(["none", "prefer_not_to_say"] as MentalHealthCondition[]).map((value) => (
            <ConditionPill
              key={value}
              config={{
                value,
                label: value === "none" ? "None" : "Prefer not to say",
                description:
                  value === "none"
                    ? "No relevant conditions"
                    : "I'd rather not disclose",
              }}
              isSelected={selectedConditions.includes(value)}
              onToggle={() => onToggle(value)}
            />
          ))}
        </div>
      </Card>

      <p className="text-xs text-ink-subtle dark:text-[#555250] text-center mb-6">
        You can update this anytime from your profile settings.
      </p>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" size="lg" className="flex-1" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// CONDITION PILL
// Toggleable pill button for condition selection.
// ============================================================

function ConditionPill({
  config,
  isSelected,
  onToggle,
}: {
  config: ConditionConfig;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={config.description}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
        "cursor-pointer select-none",
        isSelected
          ? [
              "bg-forest text-white border-forest",
              "dark:bg-forest-dark dark:border-forest-dark",
            ].join(" ")
          : [
              "bg-white text-ink-muted border-parchment",
              "hover:border-forest/40 hover:text-forest",
              "dark:bg-dark-raised dark:text-[#888480] dark:border-dark-border",
              "dark:hover:border-sage/40 dark:hover:text-sage",
            ].join(" ")
      )}
    >
      {config.label}
    </button>
  );
}

// ============================================================
// STEP 3 — LIFESTYLE
// Optional numeric/text fields for contextual lifestyle data.
// ============================================================

function StepLifestyle({
  sleepHours,
  caffeineMg,
  medicationNotes,
  error,
  isSavePending,
  isSkipPending,
  onSleepChange,
  onCaffeineChange,
  onMedicationChange,
  onBack,
  onSubmit,
  onSkip,
}: {
  sleepHours: string;
  caffeineMg: string;
  medicationNotes: string;
  error: string | null;
  isSavePending: boolean;
  isSkipPending: boolean;
  onSleepChange: (v: string) => void;
  onCaffeineChange: (v: string) => void;
  onMedicationChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const isAnythingPending = isSavePending || isSkipPending;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium text-ink dark:text-[#f0ede8] mb-1">
          Lifestyle context
        </h2>
        <p className="text-sm text-ink-muted dark:text-[#888480]">
          Optional. These factors can influence typing behavior and mental state.
        </p>
      </div>

      <Card className="p-5 mb-4 space-y-4">
        <Input
          label="Average sleep hours"
          name="avg_sleep_hours"
          type="number"
          placeholder="e.g. 7.5"
          min="0"
          max="24"
          step="0.5"
          value={sleepHours}
          onChange={(e) => onSleepChange(e.target.value)}
          hint="How many hours you typically sleep per night"
        />

        <Input
          label="Daily caffeine intake (mg)"
          name="daily_caffeine_mg"
          type="number"
          placeholder="e.g. 200"
          min="0"
          step="50"
          value={caffeineMg}
          onChange={(e) => onCaffeineChange(e.target.value)}
          hint="1 cup of coffee ≈ 95mg, 1 energy drink ≈ 80–150mg"
        />

        {/* Textarea styled consistently with Input component */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted dark:text-[#888480] uppercase tracking-wide">
            Medication notes{" "}
            <span className="normal-case font-normal text-ink-subtle dark:text-[#555250]">
              — optional
            </span>
          </label>
          <textarea
            placeholder="e.g. SSRIs, stimulants, sleep aids..."
            rows={3}
            maxLength={500}
            value={medicationNotes}
            onChange={(e) => onMedicationChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2.5 text-sm rounded-lg resize-none",
              "bg-white border border-parchment text-ink",
              "placeholder:text-ink-subtle",
              "dark:bg-dark-surface dark:border-dark-border",
              "dark:text-[#d8d5ce] dark:placeholder:text-[#555250]",
              "transition-colors duration-150",
              "hover:border-[#c4c1ba] dark:hover:border-[#444440]",
              "focus:border-forest focus:outline-none",
              "dark:focus:border-sage"
            )}
          />
          <p className="text-xs text-ink-subtle dark:text-[#555250]">
            Medication context only — no prescriptions or dosages needed.
          </p>
        </div>
      </Card>

      {/* submission error */}
      {error && (
        <div
          className="mb-4 px-3 py-2.5 rounded-lg bg-[#fcecea] dark:bg-[#2a1414] border border-[#edaaa6] dark:border-[#5a2020]"
          role="alert"
        >
          <p className="text-sm text-danger dark:text-[#e87070]">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={onBack}
          disabled={isAnythingPending}
        >
          Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onSubmit}
          isLoading={isSavePending}
          // disable skip button while save is running and vice versa
          disabled={isSkipPending}
        >
          {isSavePending ? "Saving…" : "Complete setup"}
        </Button>
      </div>

      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={onSkip}
        isLoading={isSkipPending}
        disabled={isSavePending}
      >
        Skip this step
      </Button>
    </div>
  );
}