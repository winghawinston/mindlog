import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Past Logs" };

// Energy badge config — matches the selector in journal/page.tsx
const ENERGY_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  heavy: { label: "Heavy",  emoji: "🌧️", className: "bg-[#F5EDE4] text-[#8B6E4E] dark:bg-[#2A1E10] dark:text-[#B89070]" },
  muted: { label: "Muted",  emoji: "🌥️", className: "bg-linen text-ink-muted dark:bg-dark-raised dark:text-[#888480]"    },
  calm:  { label: "Calm",   emoji: "✨", className: "bg-mint text-forest dark:bg-[#1A2E1E] dark:text-sage"              },
  wired: { label: "Wired",  emoji: "⚡", className: "bg-[#FDF3E0] text-[#854F0B] dark:bg-[#2A2010] dark:text-[#E8A838]" },
};

export default async function PastLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sessions, error } = await supabase
    .from("journaling_sessions")
    .select("id, title, content, word_count, duration_secs, energy_level, submitted_at")
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) console.error("[past-logs] fetch:", error.message);

  const entries = sessions ?? [];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink dark:text-[#F0EDE8]">Past Logs</h1>
        <p className="text-sm text-ink-muted dark:text-[#888480] mt-1">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} logged
        </p>
      </div>

      {/* empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-mint dark:bg-[#1A2E1E] mb-4">
            <BookOpen size={22} className="text-forest dark:text-sage" aria-hidden="true" />
          </div>

          <h2 className="text-base font-medium text-ink dark:text-[#F0EDE8] mb-2">
            No entries yet
          </h2>

          <p className="text-sm text-ink-muted dark:text-[#888480] max-w-xs mb-6">
            Start journaling to see your past entries here. Every session builds your personal picture.
          </p>

          <Link
            href="/journal"
            className="text-sm font-medium text-forest dark:text-sage hover:underline"
          >
            Write your first entry →
          </Link>
        </div>
      )}

      {/* entry list */}
      {entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => {
            const date = new Date(entry.submitted_at);

            const dateLabel = date.toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            });

            const timeLabel = date.toLocaleTimeString("en-US", {
              hour: "numeric", minute: "2-digit",
            });

            const energy = entry.energy_level
              ? ENERGY_CONFIG[entry.energy_level]
              : null;
            // Preview: first 160 chars of content
            const preview = entry.content?.slice(0, 160).trim();

            return (
              <Card key={entry.id} className="p-5 hover:border-forest/30 dark:hover:border-sage/30 transition-colors duration-150">
                {/* Date + metadata row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-xs text-ink-subtle dark:text-[#555250]">
                      {dateLabel} · {timeLabel}
                    </p>
                    <h3 className="text-base font-medium text-ink dark:text-[#F0EDE8] mt-0.5">
                      {entry.title || "Untitled entry"}
                    </h3>
                  </div>

                  {/* energy badge */}
                  {energy && (
                    <span className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                      energy.className
                    )}>
                      {energy.emoji} {energy.label}
                    </span>
                  )}
                </div>

                {/* content preview */}
                <p className="text-sm text-ink-muted dark:text-[#888480] leading-relaxed line-clamp-2">
                  {preview}{entry.content?.length > 160 ? "…" : ""}
                </p>

                {/* Footer: word count + read link */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-parchment dark:border-dark-border">
                  <span className="text-xs text-ink-subtle dark:text-[#555250]">
                    {entry.word_count} words
                  </span>
                  
                  <Link
                    href={`/journal/past-logs/${entry.id}`}
                    className="text-xs font-medium text-forest dark:text-sage hover:underline"
                  >
                    Read →
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}