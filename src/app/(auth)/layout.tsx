// This has no "use client" directive — it's a Server Comoponent.
// Server Components render on the server and send HMTL to the browser.
// They can't use useState/userEffect but they can be async and fetch data.
// This layout just provides structure, so server-only is fine.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linen dark:bg-dark-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Subtle background texture — two overlapping radial gradients
          that evoke a clean, clinical softness without being distracting */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(82,183,136,0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(201,169,110,0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Content sits above the background */}
      <div className="relative w-full max-w-sm">{children}</div>

      {/* Footer note — important for a research tool */}
      <p className="relative mt-8 text-xs text-ink-subtle dark:text-[#555250] text-center max-w-xs">
        MindLog is a behavioral research tool, not a diagnostic system.
        <br />
        It does not provide medical advice.
      </p>
    </div>
  )
}