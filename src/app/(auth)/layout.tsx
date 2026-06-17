// This has no "use client" directive — it's a Server Comoponent.
// Server Components render on the server and send HMTL to the browser.
// They can't use useState/userEffect but they can be async and fetch data.
// This layout just provides structure, so server-only is fine.

// Split layout: form on the left, inspirational quote on the right.
// The quote panel is hidden on mobile — form goes full width.
// This pattern is used by Notion, Linear, Vercel, and most quality SaaS.
const QUOTES = [
  {
    text: "Writing is the painting of the voice.",
    author: "Voltaire",
  },
  {
    text: "Journal writing is a voyage to the interior.",
    author: "Christina Baldwin",
  },
  {
    text: "In the journal I do not just express myself more openly than I could to any person; I create myself.",
    author: "Susan Sontag",
  },
  {
    text: "The act of writing is the act of discovering what you believe.",
    author: "David Hare",
  },
];

function getQuote() {
  // Pick a quote deterministically by hour so it changes throughout the day
  // but doesn't flicker on every server render.
  const hour = new Date().getHours();
  return QUOTES[hour % QUOTES.length];
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const quote = getQuote();

  return (
    <div className="min-h-screen flex justify-center">
      {/* ── LEFT PANEL — the form ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-linen dark:bg-dark-bg relative">
        {/* subtle ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(82,183,136,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(201,169,110,0.05) 0%, transparent 50%)
            `,
          }}
        />

        <div className="relative w-full max-w-sm">{children}</div>

        {/* footer note */}
        <p className="relative mt-8 text-xs text-ink-subtle dark:text-[#555250] text-center max-w-xs">
          Cadence is a behavioral research tool, not a diagnostic system.
          <br />
          It does not provide medical advice.
        </p>
      </div>

      {/* ── RIGHT PANEL — quote ─────────────────────────────── */}
      {/* hidden on mobile — takes up half the screen on desktop */}
      <div
        className="hidden lg:flex flex-col items-center justify-center  shrink-0 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #0E1A14 0%, #141412 40%, #1C1A0E 100%)",
        }}
      >
        {/* background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: `
              radial-gradient(ellipse at 30% 40%, rgba(45,106,79,0.25) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 70%, rgba(201,169,110,0.12) 0%, transparent 50%)
            `,
          }}
        />

        {/* Cadence logo mark — large, watermark-style */}
        <div className="absolute top-10 left-10 flex items-center gap-2 opacity-60">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-forest/70">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M2 10h3l2-6 3 12 2-8 1 2h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs font-medium text-white/50">Cadence</span>
        </div>

        {/* Quote */}
        <div className="relative px-12 text-center">
          <span className="block text-5xl text-white/10 font-serif leading-none mb-4">
            &ldquo;
          </span>
          <blockquote className="text-xl font-medium text-white/75 leading-relaxed italic mb-6">
            {quote.text}
          </blockquote>
          <cite className="text-sm text-white/30 not-italic">
            — {quote.author}
          </cite>
        </div>

        {/* Bottom label */}
        <p className="absolute bottom-8 text-xs text-white/20 tracking-widest uppercase">
          Write freely. Understand yourself.
        </p>
      </div>
    </div>
  )
}