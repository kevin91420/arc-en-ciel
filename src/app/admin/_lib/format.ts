/**
 * Tiny formatting helpers shared across admin pages.
 * Kept inside /admin/_lib so the underscore prefix keeps this folder out of
 * Next's route tree.
 */

/** 4870 -> "48,70 €" */
export function formatCents(cents: number | null | undefined): string {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

/** "2026-04-15" + "19:30" -> "15 avril 2026 à 19h30" */
export function formatFrenchDateTime(date: string, time?: string): string {
  const d = new Date(`${date}T${time || "00:00"}:00`);
  if (Number.isNaN(d.getTime())) return `${date}${time ? ` à ${time}` : ""}`;
  const datePart = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (!time) return datePart;
  const [h, m] = time.split(":");
  return `${datePart} à ${h}h${m}`;
}

/** "2026-04-15" -> "mercredi 15 avril 2026" */
export function formatFrenchDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Minutes since a timestamp, clamped to 0. */
export function minutesAgo(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 60000));
}

/** Human-friendly "il y a X min" (< 60 min) or fallback to locale time. */
export function relativeFr(iso: string): string {
  const mins = minutesAgo(iso);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

/** YYYY-MM-DD for today in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
