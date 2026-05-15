import { createBrowserClient } from "@supabase/ssr";

// This client runs in the browser.
// Uses the publishable key — safe to expose publicly (RLS protects my data).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!
  );
}