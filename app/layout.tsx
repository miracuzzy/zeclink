import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZecLink — private payment links for shielded ZEC",
  description: "Stripe-style invoice and tip links for shielded Zcash. Get paid without exposing your income.",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#07070a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-white/5 bg-[#07070a]/80 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" aria-label="ZecLink home">
              <Logo />
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <Link href="/new" className="rounded-lg px-3 py-1.5 text-zinc-300 hover:text-white">
                Invoice
              </Link>
              <Link href="/tip" className="rounded-lg px-3 py-1.5 text-zinc-300 hover:text-white">
                Tip jar
              </Link>
              <Link href="/privacy" className="rounded-lg px-3 py-1.5 text-zinc-300 hover:text-white">
                Privacy
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-zinc-500">
          No analytics · no trackers · no cookies · shielded addresses only ·{" "}
          <Link href="/privacy" className="underline hover:text-zinc-300">
            what we store (almost nothing)
          </Link>
        </footer>
      </body>
    </html>
  );
}
