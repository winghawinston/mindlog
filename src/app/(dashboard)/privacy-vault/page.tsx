export const metadata = { title: "Privacy Vault" };

export default function PrivacyVaultPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <span className="text-3xl mb-4">🔒</span>
      <h1 className="text-xl font-medium text-ink dark:text-[#F0EDE8] mb-2">
        Privacy Vault
      </h1>
      <p className="text-sm text-ink-muted dark:text-[#888480] max-w-xs">
        Transparency controls and data management tools are coming soon. Your behavioral data is stored securely and is only accessible to you.
      </p>
    </div>
  );
}