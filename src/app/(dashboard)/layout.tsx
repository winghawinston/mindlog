// server component — reads the session to populate the nav with the user's
// identity. no "use client" needed since there's no interactivity here.

import DashboardNav from "@/components/shared/DashboardNav";
import { MfaPrompt } from "@/components/ui/MfaPrompt";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/login");

  // fetch the user's profile to check MFA status for the prompt
  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_enabled")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-linen dark:bg-dark-bg flex">
      {/* sidebar navigation */}
      <DashboardNav userEmail={user.email ?? ""} />

      {/* page content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>

      {/* MFA prompt — renders as a modal overlay if MFA not set up */}
      <MfaPrompt mfaEnabled={profile?.mfa_enabled ?? false} />
    </div>
  )
}