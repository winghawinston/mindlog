// Server Component — checks auth and redirects logged-in users straight
// to their dashboard. Unauthenticated visitors see the landing page.
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Cadence — Your mind has a rhythm. Discover it.",
  description:
    "A private, distraction-free journal that passively captures the natural rhythm of your typing to help you understand yourself better.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // authenticated users don't need to see the landing page
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#0E0E0C] text-white overflow-x-hidden">
      {/* ── nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-64 h-16 bg-[#0E0E0C]/20 backdrop-blur-lg border-b border-white/5">
        {/* logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-forest">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 10h3l2-6 3 12 2-8 1 2h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-wider text-white">cadence</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm px-4 py-2 text-white/60 hover:text-white transition-colors duration-150"
            // className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/70 hover:text-white text-sm font-medium transition-all duration-150 text-center"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-4 py-2 rounded-lg bg-forest hover:bg-[#245C43] transition-colors duration-150"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
        {/* atmospheric background — two soft glows */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: `
              radial-gradient(ellipse at 15% 40%, rgba(45,106,79,0.18) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 20%, rgba(201,169,110,0.10) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 90%, rgba(45,106,79,0.08) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* research badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
            Research-backed · Private by design · Free
          </div>

          {/* headline */}
          <h1 className="text-5xl md:text-7xl font-medium leading-[1.08] tracking-tight text-white mb-6">
            Your mind has{" "}
            <span
              className="text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #52B788 0%, #C9A96E 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
              }}
            >
              a rhythm.
            </span>
            <br />
            Discover it.
          </h1>

          {/* subtext */}
          <p className="text-lg md:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto mb-10">
            Cadence is a distraction-free journal that passively learns the
            natural cadence of your typing — helping you discover how the
            way you write reflects how you feel.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest hover:bg-[#245C43] text-white text-sm font-medium transition-colors duration-150 text-center"
            >
              Start writing — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-white/70 hover:text-white text-sm font-medium transition-all duration-150 text-center"
            >
              I already have an account
            </Link>
          </div>

          {/* scroll hint */}
          <p className="mt-14 text-xs text-white/25 tracking-widest uppercase">
            Scroll to learn more
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest text-center mb-4">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-medium text-center text-white mb-16">
            Write naturally. The rest is passive.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: "⌨️",
                title: "Write freely",
                body: "Open your canvas and write whatever you feel. No prompts required, no minimum word count. Cadence captures the timing of your keystrokes silently in the background — never the words themselves.",
              },
              {
                step: "02",
                icon: "📊",
                title: "Rate how you feel",
                body: "After writing, spend 30 seconds rating your mood, stress, focus, and fatigue on a simple 1–10 scale. This self-report pairs with your behavioral data to reveal patterns.",
              },
              {
                step: "03",
                icon: "✦",
                title: "Watch patterns emerge",
                body: "Your dashboard shows how your typing rhythm correlates with your emotional state over time. Discover your own personal signals — the ones only you would know.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors duration-200"
              >
                <span className="text-xs text-white/20 font-mono mb-4 block">
                  {item.step}
                </span>
                <span className="text-2xl mb-4 block" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="text-base font-medium text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEHAVIORAL SIGNALS ───────────────────────────────── */}
      <section className="px-6 py-16 border-y border-white/5 bg-white/2">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-white/30 uppercase tracking-widest text-center mb-10">
            What Cadence listens to
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Typing speed (WPM)",
              "Key hold duration",
              "Gap between keystrokes",
              "Pause frequency",
              "Correction patterns",
              "Writing bursts",
              "Focus loss events",
              "Session duration",
              "Idle periods",
            ].map((signal) => (
              <span
                key={signal}
                className="px-4 py-2 rounded-full border border-white/8 bg-white/4 text-sm text-white/50"
              >
                {signal}
              </span>
            ))}
          </div>

          <p className="text-center text-xs text-white/25 mt-8 max-w-md mx-auto">
            Behavioral patterns only. Cadence does not record, read, or store
            the content of what you write.
          </p>
        </div>
      </section>

      {/* ── PRIVACY PLEDGE ───────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            Privacy
          </p>
          <h2 className="text-3xl md:text-4xl font-medium text-white mb-6">
            Built for trust, not engagement.
          </h2>
          <p className="text-base text-white/45 mb-12 leading-relaxed">
            Most apps want you to spend more time inside them. Cadence is
            different — it exists to help you understand yourself, then
            let you get on with your day.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {[
              { check: true,  text: "Journal content stays on your device" },
              { check: true,  text: "No advertising, ever" },
              { check: true,  text: "No data sold to third parties" },
              { check: true,  text: "Behavioral aggregates only — not raw keystrokes" },
              { check: false, text: "Not a diagnostic tool" },
              { check: false, text: "Not a replacement for professional care" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 p-4 rounded-xl border border-white/8 bg-white/3">
                <span
                  className={`mt-0.5 shrink-0 text-sm ${
                    item.check ? "text-sage" : "text-white/30"
                  }`}
                >
                  {item.check ? "✓" : "✕"}
                </span>
                <span
                  className={`text-sm ${
                    item.check ? "text-white/70" : "text-white/30"
                  }`}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE SECTION ────────────────────────────────────── */}
      <section
        className="px-6 py-24 text-center relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(45,106,79,0.12) 0%, transparent 70%)",
        }}
      >
        <blockquote className="max-w-2xl mx-auto">
          <p className="text-2xl md:text-3xl font-medium text-white/80 leading-relaxed italic mb-6">
            &ldquo;It feels almost sacred: A completely private digital
            space.&rdquo;
          </p>
          <cite className="text-sm text-white/30 not-italic">
            — The New York Times, on the act of journaling
          </cite>
        </blockquote>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-medium text-white mb-4">
          Ready to find your rhythm?
        </h2>
        <p className="text-white/40 mb-8 text-base">
          Free to use. No credit card required.
        </p>
        <Link
          href="/signup"
          className="inline-block px-10 py-4 rounded-xl bg-forest hover:bg-[#245C43] text-white font-medium text-base transition-colors duration-150"
        >
          Open your canvas
        </Link>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="px-6 md:px-50 py-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-forest">
            <svg width="9" height="9" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 10h3l2-6 3 12 2-8 1 2h5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs text-white/30">Cadence</span>
        </div>
        <p className="text-xs text-white/20">
          A research project exploring keystroke dynamics and psychological
          well-being.
        </p>
        <p className="text-xs text-white/20">© 2025</p>
      </footer>
    </div>
  )
}