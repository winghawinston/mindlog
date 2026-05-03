import { createBrowserClient } from "@supabase/ssr";

// This client runs in the browser.
// Uses the anon key — safe to expose publicly (RLS protects my data).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}