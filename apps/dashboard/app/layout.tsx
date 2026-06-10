import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Viral Cut Manager",
  description: "Hub data & revenus pour vidéos virales multi-plateformes",
};

const NAV = [
  { href: "/", label: "Vue d'ensemble" },
  { href: "/projects", label: "Projets" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-surface p-5 md:block">
            <Link href="/" className="block">
              <div className="text-lg font-bold">Viral Cut Manager</div>
              <div className="text-xs text-muted">data &amp; revenus</div>
            </Link>
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-10 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
              v1 — Phase 0. Publication suivie manuellement (sans abonnement tiers).
            </div>
          </aside>
          <main className="flex-1 p-6 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
