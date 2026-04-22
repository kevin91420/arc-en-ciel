/**
 * Shared formatting + parsing helpers used by POS, KDS, and customer-facing
 * menus. Kept framework-agnostic (no "use client") so both server and client
 * code can import it.
 */

/** 4870 -> "48,70 €" (FR locale). */
export function formatCents(cents: number | null | undefined): string {
  const v = typeof cents === "number" ? cents : 0;
  return (v / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

/**
 * Parse a FR-formatted price string ("9,50 €", "12.00€", "  7,5 ", "15")
 * into integer cents. Returns 0 for unparseable input.
 */
export function parsePriceToCents(price: string | number | null | undefined): number {
  if (typeof price === "number" && Number.isFinite(price)) {
    return Math.round(price * 100);
  }
  if (typeof price !== "string") return 0;
  /* Strip currency symbols, NBSP, narrow no-break space, then normalize comma → dot. */
  const cleaned = price
    .replace(/[€$\s\u00A0\u202F]/g, "")
    .replace(/,/g, ".")
    .trim();
  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

/** Minutes since a timestamp, clamped to 0. Accepts ISO strings or null. */
export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / 60000));
}

/** "14 min", "1 h 20", "à l'instant". */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
