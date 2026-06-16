import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Next.js font optimization — fonts are downloaded at build time,
// self-hosted, and injected as CSS variables. Zero layout shift,
// no external font request at runtine.

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: {
    default: "Cadence",
    template: "%s · Cadence",
  },
  description: "A private journaling space that mirrors your inner peace by listening to the rhythm of your hands.",
  // PWA manifest — I'll add this later
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ee"},
    { media: "(prefers-color-scheme: dark)", color: "#141412"}
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required when managing dark mode
    // via a class on <html>. Without it, React warns about a mismatch
    // between server HTML (no class) and client HMTL (class added by JS)
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="">{children}</body>
    </html>
  );
}
