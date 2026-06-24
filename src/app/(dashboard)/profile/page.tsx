// Server Component — fetches everything the profile page needs,
// then hands it to the client-side tab UI.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

export const metadata = { title: "Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // profile row — includes MFA flag and preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, mfa_enabled, edit_past_logs")
    .eq("id", user.id)
    .single();

  // enrolled TOTP factor — needed for unenroll and status display
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactor = factorsData?.totp?.[0] ?? null;

  // session + metrics counts shown on the Data tab before reset
  const { count: sessionCount } = await supabase
    .from("journaling_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "submitted");

  const { count: metricsCount } = await supabase
    .from("keystroke_metrics")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // MfaPrompt passes ?tab=security when the user clicks "Set up now"
  const { tab } = await searchParams;
  const defaultTab = tab === "security" ? "security" : "account";

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink dark:text-[#F0EDE8]">
          Profile
        </h1>
        <p className="text-sm text-ink-muted dark:text-[#888480] mt-1">
          {user.email}
        </p>
      </div>

      <ProfileTabs
        userEmail={user.email ?? ""}
        username={profile?.username ?? ""}
        mfaEnabled={profile?.mfa_enabled ?? false}
        editPastLogs={profile?.edit_past_logs ?? false}
        totpFactorId={totpFactor?.id ?? null}
        sessionCount={sessionCount ?? 0}
        metricsCount={metricsCount ?? 0}
        defaultTab={defaultTab as "account" | "security" | "preferences" | "data"}
      />
    </div>
  );
}