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

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    // Supabase returns "Invalid login credentials" for both wrong email
    // and wrong passwrd — this is intentional (prevents user enumeration)
    // ADDED: log the real error server-side so you can see it in your terminal.
    // Always log the actual error on the server, return a safe message to the client.
    // The user sees "Invalid email or password" — you see the real reason in terminal.
    console.error("[login] Supabase error:", error.message);
    return { error: "Invalid email or password. Please try again."};
  }

  // redirect() throws a special Next.js error internally — it must NOT
  // be inside a try/catch or it won't work. Always call it after your
  // error handling is done.
  redirect("/dashboard");
}

// ------------------------------------------------------------
// SIGNUP
// ------------------------------------------------------------
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

  const { error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      // After signup, redirect the user to onboarding.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/onboarding`,
    },
  });
    
  
  if (error) {
    // "User already registered" is the Supabase message for duplicate email
    // ADDED: same pattern — real error in your terminal, safe message to user
    console.error("[signup] Supabase error:", error.message, "| code:", error.status);
    if (error.message.includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Could not create account. Please try again." };
  }

  // Redirect to onboarding to complete the mental health context profile
  redirect("/onboarding");
}

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}