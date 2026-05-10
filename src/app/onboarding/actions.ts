"use server";

// ============================================================
// ONBOARDING SERVER ACTION
//
// Saves the user's optional mental health context to the DB.
// All fields are optional — we never force medical disclosure.
// ============================================================

import type { ActionState, MentalHealthCondition } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function saveOnboardingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  // Always fetch the user server-side — never trust a client-passed user ID.
  // This is the secure pattern for any authenticated server action.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Session expired. Please sign in again." };
  }

  // Conditions are sent as a JSON string because FormData can't
  // natively serialize arrays. We parse and validate server-side.
  let conditions: MentalHealthCondition[] = [];
  try {
    const raw = formData.get("conditions") as string;
    conditions = raw ? JSON.parse(raw) : [];
  } catch {
    // Malformed JSON — treat as no selection rather than erroring
    conditions = [];
  }

  const conditionOtherText = formData.get("condition_other_text") as string | null;
  const medicationNotes = formData.get("medication_notes") as string | null;
  const sleepRaw = formData.get("avg_sleep_hours") as string | null;
  const caffeineRaw = formData.get("daily_caffeine_mg") as string | null;

  // Parse numerics — null if empty string (user left field blank)
  const avgSleepHours = sleepRaw ? parseFloat(sleepRaw) : null;
  const dailyCaffeineMg = caffeineRaw ? parseInt(caffeineRaw, 10) : null;

  // Sanity validation on sleep — can't sleep 25 hours
  if (avgSleepHours !== null && (avgSleepHours < 0 || avgSleepHours > 24)) {
    return { error: "Sleep hours must be between 0 and 24." };
  }

  // Only save other text if "other" is actually selected
  const resolvedOtherText = conditions.includes("other")
    ? conditionOtherText?.trim() || null
    : null;

  // upsert = INSERT or UPDATE if user_id already exists.
  // This means onboarding can be re-visited from profile settings later.
  const { error } = await supabase.from("mental_health_context").upsert(
    {
      user_id: user.id,
      conditions,
      condition_other_text: resolvedOtherText,
      medication_notes: medicationNotes?.trim() || null,
      avg_sleep_hours: avgSleepHours,
      daily_caffeine_mg: dailyCaffeineMg,
      updated_at: new Date().toISOString(),
    },
    {
      // matches the unique(user_id) constraint we defined in the schema
      onConflict: "user_id",
    }
  );

  if (error) {
    // Log server-side for debugging, return generic message to client
    console.error("[onboarding] upsert failed:", error.message);
    return { error: "Could not save your profile. Please try again." };
  }

  redirect("/dashboard");
}

// Lets users skip onboarding entirely — all fields are optional.
// Still redirects to dashboard, just without saving any context.
export async function skipOnboardingAction(): Promise<void> {
  redirect("/dashboard");
}