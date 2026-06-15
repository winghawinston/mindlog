import { BookOpen } from "lucide-react";
import { Card } from "../ui/Card";
import Link from "next/link";
import Button from "../ui/Button";

/**
 * Shown when the user has zero submitted journaling sessions.
 * Server-renderable — no interactivity beyond a Link, so no
 * "use client" needed.
 */
export function EmptyState() {
  return (
    <Card className="p-8 flex flex-col items-center text-center max-w-md mx-auto mt-12">
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-mint dark:bg-[#1a2e1e] mb-4">
        <BookOpen size={22} className="text-forest dark:text-sage" aria-hidden="true" />
      </div>

      <h2 className="text-lg font-medium text-ink dark:text-[#f0ede8] mb-2">
        No data yet
      </h2>
      <p className="text-sm text-ink-muted dark:text-[#888480] leading-relaxed mb-6">
        Complete your first journaling session to start seeing trends and
        correlations between your typing behavior and how you feel.
      </p>

      <Link href="/journal">
        <Button variant="primary" size="md">
          Start journaling
        </Button>
      </Link>
    </Card>
  )
}