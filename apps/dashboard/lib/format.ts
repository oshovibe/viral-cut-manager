export function euros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function toCents(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function num(value: FormDataEntryValue | null): number {
  const n = parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

export function fnum(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function str(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export function compact(n: number): string {
  return n.toLocaleString("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
}

export function dateFR(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
