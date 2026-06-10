import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {children}
      </h2>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: "bg-surface-2 text-foreground border-border",
  good: "bg-good/15 text-good border-good/30",
  warn: "bg-warn/15 text-warn border-warn/30",
  bad: "bg-bad/15 text-bad border-bad/30",
  accent: "bg-accent/15 text-accent border-accent/30",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        TONES[tone] ?? TONES.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-foreground";
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </Card>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:opacity-90"
      : variant === "danger"
        ? "bg-bad/20 text-bad border border-bad/40 hover:bg-bad/30"
        : "bg-surface-2 text-foreground border border-border hover:bg-border";
  return (
    <button
      {...props}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${styles}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium transition hover:bg-border"
    >
      {children}
    </Link>
  );
}
