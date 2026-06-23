"use server";

// ============================================================
// AUTH SERVER ACTIONS
//
// These functions run exclusively on the server.
// They are called directly from Client Components — no fetch(),
// no API route, no JSON. Next.js handles the network layer.
//
// Why Server Actions instead of Route Handlers?
// Route Handlers (app/api/...) are for external HTTP clients
// (mobile apps, third-party services). Server Actions are for
// your own UI — they're type-safe, co-located, and simpler.
// ============================================================

import { ActionState } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------
// CHANGED: after successful password check, we now inspect
// the user's MFA Assurance Level (AAL). Supabase tracks this:
//   aal1 = authenticated with password only
//   aal2 = authenticated with password + second factor (TOTP)
//
// If the user enrolled MFA, Supabase sets nextLevel = 'aal2'.
// We return requiresMfa: true to signal the login page to
// show the TOTP challenge screen instead of redirecting.
export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // BAsic server-side validatio — never trust client-only validation
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  // CHANGED: wrapped in try/catch to distinguish network errors from auth errors.
  // WHY: supabase throws a TypeError when the request times out, rather than
  // returning { error }. Without this, any network issue shows "Invalid password".
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    if (error) {
      // ADDED: log the real error server-side so you can see it in your terminal.
      // Always log the actual error on the server, return a safe message to the client.
      // The user sees "Invalid email or password" — you see the real reason in terminal.
      console.error("[login] Supabase error:", error.message);
      
      // Supabase returns "Email not confirmed" if the user tries to log in before verifying their email.
      if (error?.message.toLowerCase().includes("email not confirmed")) {
        return { error: "Please verify your email before logging in. Check your inbox." };
      }
      
      // Supabase returns "Invalid login credentials" for both wrong email
      // and wrong passwrd — this is intentional (prevents user enumeration)
      return { error: "Invalid email or password. Please try again."};
    }
  } catch (e) {
    const isNetworkError = e instanceof TypeError && e.message.includes("fetch failed");

    if (isNetworkError) {
      return { error: "Network error. Please check your connection and try again." };
    }

    return { error: "Something went wrong. Please try again." };
  }

  // check if this user has MFA enrolled and needs to complete it.
  // getAuthenticatorAssuranceLevel() reads the current session's JWT claims.
  // nextLevel === 'aal2' means MFA is enrolled but the challenge hasn't
  // been completed yet for this session.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (
    aalData?.nextLevel === "aal2" && // user has MFA enrolled but hasn't completed challenge yet
    aalData.currentLevel !== "aal2" // current session isn't authenticated with MFA yet
  ) {
    // signal the login page to show the MFA challenge screen.
    // we do NOT redirect here because the user still needs to complete the MFA challenge on the client side before we consider them fully "logged in".
    // the session is at aal1 and we need aal2 before we redirect to the dashboard.
    return { requiresMfa: true };
  }

  // redirect() throws a special Next.js error internally — it must NOT
  // be inside a try/catch or it won't work. Always call it after your
  // error handling is done.
  redirect("/dashboard");
}

// ------------------------------------------------------------
// VERIFY MFA (TOTP — Time-based One-Time Password)
//
// Called from the MFA challenge screen after the user enters
// their 6-digit authenticator app code.
//
// Supabase MFA works in two steps:
//   1. challenge() — tells Supabase "I'm about to verify factor X"
//      Returns a challengeId that expires in 5 minutes.
//   2. verify()   — submits the TOTP code against the challengeId.
//      If correct, upgrades the session from aal1 to aal2.
// ------------------------------------------------------------
export async function verifyMfaAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const code = (formData.get("code") as string)?.trim();

  if (!code || code.length !== 6) {
    return { error: "Enter the 6-digit code from your authenticator app." };
  }

  const supabase = await createClient();

  // get the list of enrolled TOTP factor for this user
  const { data: factorsData, error: listError } = 
    await supabase.auth.mfa.listFactors();

  if (listError || !factorsData?.totp?.length) {
    console.error("[mfa] listFactors error:", listError?.message);
    return { error: "No MFA factor found. Please contact support."};
  }

  // take the first enrolled TOTP factor (users typicaly have one)
  const factorId = factorsData.totp[0].id;

  // step 1: create a challenge for this factor
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challengeData) {
    console.error("[mfa] challenge error:", challengeError?.message);
    return { error: "Could not initiate MFA challenge. Please try again." }
  }

  // step 2: verify the TOTP code against the challenge
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    console.error("[mfa] verify error:", verifyError?.message);
    return { error: "Invalid code. Please check your authenticator app." };
  }

  // session is now upgraded to aal2 (password + MFA), we can redirect to dashboard
  redirect("/dashboard");
}

// ------------------------------------------------------------
// SIGNUP
// ------------------------------------------------------------
// CHANGED: we no longer redirect here. Instead we return
// requiresOtp: true. The signup page switches to the OTP
// input step. This keeps the user inside the app — no email
// link that breaks PWA session context.
export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  // Server-side validation
  if (!email || !password || !confirmPassword) {
    return { error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // OWASP minimum: 8 chars. For a research app this is sufficient.
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase =  await createClient();

  // CHANGED: wrapped in try/catch to distinguish network errors from auth errors.
  // WHY: supabase throws a TypeError when the request times out, rather than
  // returning { error }. Without this, any network issue shows "Invalid password".
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      // no emailRedirectTo — we're using OTP verification instead of email links, so the user stays in the app and doesn't lose session context
      // the user will enter the code manually in-app
    });
      
    // handle actual system errors first
    if (error) {
      // "User already registered" is the Supabase message for duplicate email
      // ADDED: same pattern — real error in your terminal, safe message to user
      console.error("[signup] Supabase error:", error.message, "| code:", error.status);

      // When "Confirm Email" is OFF, Supabase sends a 422 error for duplicates
      if (error.message.includes("already registered") || error.status === 422) {
        return { error: "An account with this email already exists." };
      }
      return { error: "Could not create account. Please try again." };
    }

    // ADDED: detect existing email without Supabase returning an error.
    // When email already exists with confirmation ON, Supabase returns
    // success but data.user.identities is an empty array.
    if (data.user && data.user.identities?.length === 0) {
      return { error: "An account with this email already exists. Please sign in instead." };
    }
  } catch (e) {
    const isNetworkError = e instanceof TypeError && e.message.includes("fetch failed");

    if (isNetworkError) {
      return { error: "Network error. Please check your connection and try again." };
    }
    
    return { error: "Something went wrong. Please try again." };
  }

  // signal the page to show the OTP input step.
  // Supabase has sent a 6-digit code to the user's email.
  return { requiresOtp: true };
}

// ------------------------------------------------------------
// VERIFY SIGNUP OTP
//
// Called from the OTP input step after the user enters the
// 6-digit code from their confirmation email.
//
// type: "signup" tells Supabase this is email confirmation,
// not a magic link login or password reset.
// ------------------------------------------------------------
export async function verifySignupOtpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  if (!token || token.length !== 6) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: "signup",
  });

  if (error) {
    console.error("[verify-otp] error:", error.message);

    if (error.message.toLowerCase().includes("expired")) {
      return { error: "This code has expired. Request a new one." };
    }

    return { error: "Invalid code. Please check the code and try again." };
  }

  // email confirmed, session established — redirect to onboarding to collect mental health context before showing dashboard.
  redirect("/onboarding");
}

// ------------------------------------------------------------
// RESEND OTP
//
// Lets the user request a new code if theirs expired or
// they didn't receive it.
// ------------------------------------------------------------
export async function resendOtpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;

  if (!email) return { error: "Email is required to resend code." };

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });

  if (error) {
    console.error("[resend-otp] error:", error.message);
    return { error: "Could not resend code. Please try again in a moment." };
  }

  return { success: "A new code has been sent to your email." };
}

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}