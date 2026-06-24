"use server";

// ============================================================
// PROFILE SERVER ACTIONS
//
// Covers all mutations the profile page needs:
//   - updateUsernameAction       → update display name
//   - toggleEditPastLogsAction   → enable/disable past log editing
//   - resetMetricsAction         → wipe keystroke_metrics for the user
//   - enrollMfaAction            → start TOTP enrollment (returns uri + factorId)
//   - verifyMfaEnrollmentAction  → verify code, complete enrollment
//   - unenrollMfaAction          → remove TOTP factor
// ============================================================

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

// ── Update username ──────────────────────────────────────────
export async function updateUsernameAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const username = (formData.get("username") as string)?.trim();

  if (!username)               return { error: "Username cannot be empty." };
  if (username.length < 2)     return { error: "Username must be at least 2 characters." };
  if (username.length > 30)    return { error: "Username must be 30 characters or fewer." };

  const { error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update username:", error.message);
    return { error: "Could not update username. Please try again." };
  }

  revalidatePath("/profile");
  return { success: "Username updated." };
}

// ── Toggle edit past logs preference ────────────────────────
// Called directly (not via useActionState) since it's a toggle
// with no form — just pass the current value to flip it.
export async function toggleEditPastLogsAction(
  currentValue: boolean
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({
      edit_past_logs: !currentValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] toggle edit past logs:", error.message);
    return { error: "Could not update preference. Please try again." };
  }

  revalidatePath("/profile");
  return { success: `Past log editing ${!currentValue ? "enabled" : "disabled"}.` };
}

// ── Reset keystroke metrics ──────────────────────────────────
// Deletes ALL keystroke_metrics rows for this user.
// Journal content and self-reports are preserved — only the
// behavioral data is wiped. Useful when early sessions have
// corrupted data (e.g. wpm=0 from the pre-fix bug).
export async function resetMetricsAction(): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("keystroke_metrics")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("[profile] reset metrics:", error.message);
    return { error: "Could not reset metrics. Please try again." };
  }

  // revalidate dashboard so charts reflect the cleared data immediately
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  return { success: "All keystroke metrics have been reset." };
}

// ── MFA: start enrollment ────────────────────────────────────
// Asks Supabase to create a new TOTP factor and returns:
//   uri       → the otpauth:// URI that QR code libraries render
//   factorId  → needed to verify and complete enrollment
//
// The URI contains the TOTP secret. It never leaves the client
// after this call — the QR code is rendered client-side from it.
export async function enrollMfaAction(): Promise<
  { uri: string; factorId: string } | ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Cadence",
  });

  if (error || !data) {
    console.error("[mfa] enroll:", error?.message);
    return { error: "Could not start MFA setup. Please try again." };
  }

  return { uri: data.totp.uri, factorId: data.id };
}

// ── MFA: verify enrollment ───────────────────────────────────
// Two-step Supabase MFA verification:
//   1. challenge() — tells Supabase which factor we're verifying
//   2. verify()    — submits the TOTP code against the challenge
// On success, sets mfa_enabled = true on the user's profile row.
export async function verifyMfaEnrollmentAction(
  factorId: string,
  code: string
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  // step 1 — create the challenge
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challengeData) {
    console.error("[mfa] challenge:", challengeError?.message);
    return { error: "Could not create MFA challenge. Please try again." };
  }

  // step 2 — verify the user's code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: code.trim(),
  });

  if (verifyError) {
    console.error("[mfa] verify:", verifyError.message);
    return { error: "Incorrect code. Please check your authenticator app." };
  }

  // mirror the enrolled state in our profiles table so layout
  // and MfaPrompt can read it without calling listFactors() every time
  await supabase
    .from("profiles")
    .update({ mfa_enabled: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { success: "Two-factor authentication is now active." };
}

// ── MFA: unenroll ────────────────────────────────────────────
export async function unenrollMfaAction(
  factorId: string
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    console.error("[mfa] unenroll:", error.message);
    return { error: "Could not remove MFA. Please try again." };
  }

  await supabase
    .from("profiles")
    .update({ mfa_enabled: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { success: "Two-factor authentication removed." };
}