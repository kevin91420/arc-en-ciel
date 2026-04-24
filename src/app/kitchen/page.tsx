/**
 * /kitchen — Station picker (KDS home).
 *
 * Before: this page was the single KDS screen for the whole restaurant.
 * After: it shows a tile grid where each chef picks HIS station
 * (Pizza, Grill, Froid, Desserts, Bar) or the chef-principal "Tout voir".
 *
 * Why it matters: once a chef is locked to his station, the server refuses
 * any item update that crosses station boundaries (see
 * /api/kitchen/items/[id]/route.ts + X-Station header) — so a pizzaiolo
 * cannot mark a grill plate as ready by mistake.
 *
 * Server component — counts are fetched fresh on every visit (cheap, one
 * aggregate query). The tiles themselves are plain links; the live board
 * is rendered by /kitchen/[station].
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getTicketCountsByStation } from "@/lib/db/pos-client";
import {
  ALL_STATION_CONFIG,
  STATIONS_CONFIG,
  STATIONS_ORDER,
  type StationConfig,
} from "./_lib/stations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cuisine · L'Arc en Ciel",
  robots: { index: false, follow: false },
};

export default async function KitchenHomePage() {
  let counts: Record<string, number> = {};
  let loadError: string | null = null;
  try {
    counts = await getTicketCountsByStation();
  } catch (err) {
    loadError = (err as Error).message || "Erreur de chargement";
  }
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(184,146,47,0.08), transparent 60%), #1a0f0a",
      }}
    >
      {/* Header */}
      <header className="px-6 md:px-10 pt-10 md:pt-14 pb-8 md:pb-10 max-w-6xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cream/40 font-bold mb-3">
          Kitchen Display System
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-6xl font-bold text-cream leading-[1.02] tracking-tight">
          Cuisine
          <span className="block font-[family-name:var(--font-script)] text-gold text-3xl md:text-5xl font-normal mt-1">
            L&apos;Arc en Ciel
          </span>
        </h1>
        <p className="mt-6 text-cream/65 text-base md:text-lg max-w-2xl">
          Choisis ta station. Tu ne verras que tes plats — impossible de valider
          un plat qui n&apos;est pas de ton poste.
        </p>
      </header>

      {loadError && (
        <div className="max-w-6xl mx-auto px-6 md:px-10 mb-6">
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200 text-sm">
            Impossible de charger les compteurs : {loadError}
          </div>
        </div>
      )}

      {/* Tile grid */}
      <main className="px-6 md:px-10 pb-24 max-w-6xl mx-auto">
        <div
          className="grid gap-4 md:gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {STATIONS_ORDER.map((key) => (
            <StationTile
              key={key}
              cfg={STATIONS_CONFIG[key]}
              count={counts[key] ?? 0}
            />
          ))}
          <StationTile cfg={ALL_STATION_CONFIG} count={totalAll} wide />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-cream/40 text-xs uppercase tracking-[0.18em]">
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 hover:text-gold-light transition"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" aria-hidden>
              <path
                d="M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sortir de la cuisine
          </Link>
          <span>
            {totalAll} ticket{totalAll > 1 ? "s" : ""} actif
            {totalAll > 1 ? "s" : ""} au total
          </span>
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function StationTile({
  cfg,
  count,
  wide = false,
}: {
  cfg: StationConfig;
  count: number;
  wide?: boolean;
}) {
  const busy = count > 0;
  return (
    <Link
      href={`/kitchen/${cfg.key}`}
      className={[
        "group relative overflow-hidden rounded-2xl p-6 md:p-7 flex flex-col justify-between",
        "border border-transparent transition-all duration-200",
        "hover:scale-[1.015] active:scale-[0.99]",
        wide ? "md:col-span-2 md:min-h-[160px]" : "min-h-[180px]",
      ].join(" ")}
      style={{
        background: `linear-gradient(145deg, ${cfg.color}f0 0%, ${cfg.color}b0 100%)`,
        color: cfg.onColor,
        boxShadow: `0 22px 50px -30px ${cfg.color}cc, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
        style={{ background: cfg.onColor }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className="text-5xl md:text-6xl leading-none select-none drop-shadow"
          aria-hidden
        >
          {cfg.icon}
        </span>
        <div
          className={[
            "flex flex-col items-end text-right leading-tight font-mono tabular-nums",
            busy ? "" : "opacity-60",
          ].join(" ")}
        >
          <span
            className="font-[family-name:var(--font-display)] font-bold"
            style={{
              fontSize: "2.5rem",
              color: cfg.onColor,
              textShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
          >
            {count}
          </span>
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold opacity-70"
            style={{ color: cfg.onColor }}
          >
            {count > 1 ? "tickets" : "ticket"}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div
          className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold leading-none tracking-tight"
          style={{ color: cfg.onColor }}
        >
          {cfg.label}
        </div>
        <div
          className="mt-1 text-[11px] md:text-xs uppercase tracking-[0.22em] font-semibold opacity-75"
          style={{ color: cfg.onColor }}
        >
          {cfg.tagline}
        </div>
      </div>

      {/* "Pulse" indicator when there are tickets */}
      {busy && (
        <span
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold"
          style={{
            background: "rgba(0,0,0,0.3)",
            color: cfg.onColor,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: cfg.onColor }}
          />
          En cours
        </span>
      )}

      <span
        className="absolute bottom-4 right-4 text-xs uppercase tracking-[0.2em] font-bold opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition"
        style={{ color: cfg.onColor }}
        aria-hidden
      >
        Entrer →
      </span>
    </Link>
  );
}
