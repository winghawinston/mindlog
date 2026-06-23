export const metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <span className="text-3xl mb-4">📈</span>
      <h1 className="text-xl font-medium text-ink dark:text-[#F0EDE8] mb-2">
        Insights
      </h1>
      <p className="text-sm text-ink-muted dark:text-[#888480] max-w-xs">
        Dedicated analytical views are coming soon. Your data is already being collected — patterns will surface here.
      </p>
    </div>
  );
}