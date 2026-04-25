"use client";

/**
 * KitchenBoard — the actual KDS surface (tickets grid, ping sound, timers,
 * realtime refresh). Used by both `/kitchen/all` (chef principal) and the
 * per-station views `/kitchen/[station]`.
 *
 * Props:
 *   - `station`: "all" | Station — what the screen is locked to. Drives:
 *       · the colored header band + label
 *       · the query string sent to /api/kitchen/tickets
 *       · the `X-Station` header attached to every PATCH (server enforces)
 *       · the client-side item filtering (belt-and-braces)
 *
 * Everything else (realtime, polling, ping sound, urgent timer, archived
 * drawer) is carried over from the previous /kitchen page unchanged.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OliveBranch } from "@/components/Decorations";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { useRestaurantBranding } from "@/lib/hooks/useRestaurantBranding";
import type {
  KitchenTicket,
  OrderItem,
  OrderItemStatus,
  OrderFlag,
} from "@/lib/db/pos-types";
import { ORDER_FLAGS_META } from "@/lib/db/pos-types";
import {
  getStationConfig,
  STATIONS_ORDER,
  type StationKey,
} from "./stations";

/* ═══════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════ */

const POLL_MS = 10_000;
const ARCHIVED_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "Salle · QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

type ArchivedItem = OrderItem & {
  table_number: number | null;
  archived_at: number;
};

interface Props {
  station: StationKey;
}

export default function KitchenBoard({ station }: Props) {
  const stationCfg = getStationConfig(station);
  const isLocked = station !== "all";

  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [archived, setArchived] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState<string>("");
  const [nowTick, setNowTick] = useState<number>(Date.now());

  const knownOrderIds = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const branding = useRestaurantBranding();
  const runnerTicketsEnabled = Boolean(branding.feature_runner_tickets);

  /* ── Clock (updates every second) ───────────────────────── */
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  /* ── "now" tick every 10s so minutes_elapsed labels keep animating. */
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  /* ── Short "ping" via Web Audio ─────────────────────────── */
  const playPing = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      osc.onended = () => ctx.close();
    } catch {
      /* sound is best effort */
    }
  }, []);

  /* ── Fetch tickets ──────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const qs = isLocked ? `?station=${encodeURIComponent(station)}` : "";
      const res = await fetch(`/api/kitchen/tickets${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { tickets: KitchenTicket[] } = await res.json();
      const incoming = data.tickets || [];

      /* Detect new tickets (sound ping). */
      const prevIds = knownOrderIds.current;
      const nextIds = new Set(incoming.map((t) => t.order_id));
      let hasNew = false;
      for (const id of nextIds) {
        if (!prevIds.has(id)) hasNew = true;
      }
      knownOrderIds.current = nextIds;

      if (hasNew && !firstLoadRef.current && soundOn) {
        playPing();
      }
      firstLoadRef.current = false;

      setTickets(incoming);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [station, isLocked, soundOn, playPing]);

  /* ── Initial load + poll fallback ───────────────────────── */
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  /* ── Realtime subscription ──────────────────────────────── */
  const { connected } = useRealtimeTable(
    useMemo(() => ["orders", "order_items"], []),
    load
  );

  /* ── Prune archived items older than 30 min ─────────────── */
  useEffect(() => {
    const t = setInterval(() => {
      setArchived((prev) =>
        prev.filter((a) => Date.now() - a.archived_at < ARCHIVED_WINDOW_MS)
      );
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  /* ── Patch item status + optimistic update ──────────────── */
  const patchItem = useCallback(
    async (
      item: OrderItem,
      next: OrderItemStatus,
      tableNumber: number | null
    ) => {
      /* Station guard on the client too — should never happen because the
       * server pre-filters, but a paranoid extra check can't hurt. */
      if (isLocked && item.station !== station) {
        setError(`Refusé : ce plat (${item.station}) n'est pas de cette station.`);
        return;
      }

      /* Optimistic: remove from ticket if served; otherwise update status. */
      setTickets((prev) =>
        prev
          .map((t) => {
            if (t.order_id !== item.order_id) return t;
            const items =
              next === "served"
                ? t.items.filter((i) => i.id !== item.id)
                : t.items.map((i) =>
                    i.id === item.id ? { ...i, status: next } : i
                  );
            return { ...t, items };
          })
          .filter((t) => t.items.length > 0)
      );

      if (next === "served") {
        setArchived((prev) => [
          ...prev,
          {
            ...item,
            status: "served",
            served_at: new Date().toISOString(),
            table_number: tableNumber,
            archived_at: Date.now(),
          },
        ]);
      }

      try {
        const res = await fetch(`/api/kitchen/items/${item.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Station": station,
          },
          cache: "no-store",
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          if (res.status === 403) {
            setError("Refusé : plat hors de votre station.");
          }
          throw new Error(`HTTP ${res.status}`);
        }
        /* Runner ticket auto-open : when the chef passes a plate to `ready`,
         * pop a small window that auto-prints the runner marker. Opt-in via
         * settings.feature_runner_tickets — silent no-op when disabled. */
        if (next === "ready" && runnerTicketsEnabled && typeof window !== "undefined") {
          window.open(
            `/kitchen/runner/${item.id}`,
            `runner-${item.id}`,
            "width=420,height=620,noopener,noreferrer"
          );
        }
      } catch {
        /* Rollback via full reload. */
        load();
      }
    },
    [station, isLocked, load, runnerTicketsEnabled]
  );

  /* ── Client-side belt-and-braces filter for items ───────── */
  const visibleTickets = useMemo(() => {
    if (!isLocked) return tickets;
    return tickets
      .map((t) => ({
        ...t,
        items: t.items.filter((i) => i.station === station),
      }))
      .filter((t) => t.items.length > 0);
  }, [tickets, isLocked, station]);

  const totalInFlight = visibleTickets.reduce(
    (sum, t) => sum + t.items.length,
    0
  );

  /* ── Header gradient derived from the station color ─────── */
  const bandBg = isLocked
    ? `linear-gradient(90deg, ${stationCfg.color} 0%, ${stationCfg.color}dd 100%)`
    : "linear-gradient(90deg, #2C1810 0%, #1a0f0a 100%)";

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden pb-24"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(184,146,47,0.08), transparent 60%), #1a0f0a",
      }}
    >
      {/* ═══ Colored station band — the anti-error headline ═══ */}
      <div
        className="relative z-10 px-4 md:px-8 flex items-center gap-4 md:gap-6"
        style={{
          minHeight: 72,
          background: bandBg,
          color: stationCfg.onColor,
          boxShadow: "0 2px 0 rgba(0,0,0,0.25)",
        }}
      >
        <span
          className="text-4xl md:text-5xl leading-none select-none"
          aria-hidden
        >
          {stationCfg.icon}
        </span>
        <div className="min-w-0 leading-tight">
          <div
            className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] font-bold opacity-80"
            style={{ color: stationCfg.onColor }}
          >
            Station
          </div>
          <div
            className="font-[family-name:var(--font-display)] text-2xl md:text-4xl font-bold tracking-tight"
            style={{ color: stationCfg.onColor }}
          >
            {stationCfg.label.toUpperCase()}
          </div>
        </div>

        {/* Station switcher (compact dropdown-ish) */}
        <StationSwitcher current={station} />

        <div className="ml-auto flex items-center gap-3 md:gap-5">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span
              className="font-[family-name:var(--font-display)] text-lg md:text-2xl font-bold tabular-nums"
              style={{ color: stationCfg.onColor }}
            >
              {visibleTickets.length}
              <span className="text-xs font-normal opacity-70">
                {" "}
                ticket{visibleTickets.length > 1 ? "s" : ""}
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-70">
              {totalInFlight} plat{totalInFlight > 1 ? "s" : ""}
            </span>
          </div>
          <div
            className="hidden md:block font-mono text-lg tabular-nums"
            style={{ color: stationCfg.onColor }}
            aria-live="off"
          >
            {clock}
          </div>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold"
            style={{
              background: "rgba(0,0,0,0.25)",
              color: stationCfg.onColor,
            }}
            title={
              connected
                ? "Realtime connecté"
                : "Realtime déconnecté — polling 10s"
            }
          >
            <span
              className={[
                "w-1.5 h-1.5 rounded-full",
                connected ? "bg-green-400 animate-pulse" : "bg-cream/40",
              ].join(" ")}
            />
            {connected ? "Live" : "Offline"}
          </div>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="p-2 rounded-lg transition"
            style={{
              background: "rgba(0,0,0,0.25)",
              color: stationCfg.onColor,
            }}
            aria-label={soundOn ? "Couper le son" : "Activer le son"}
            title={soundOn ? "Son activé" : "Son coupé"}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden>
                <path
                  d="M4 9v6h4l5 4V5L8 9H4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden>
                <path
                  d="M4 9v6h4l5 4V5L8 9H4z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 9l5 6M22 9l-5 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="hidden md:inline-flex px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.14em] font-bold transition"
            style={{
              background: showArchived
                ? "rgba(74,163,92,0.85)"
                : "rgba(0,0,0,0.25)",
              color: showArchived ? "#0a1f10" : stationCfg.onColor,
            }}
          >
            Servis 30min
          </button>
        </div>
      </div>

      {/* Error banner (station refuse / network) */}
      {error && tickets.length > 0 && (
        <div className="px-4 md:px-8 py-2 bg-red-600/20 border-b border-red-500/40 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* ═══ Main grid ═══ */}
      <main className="px-4 md:px-6 pt-6 pb-10">
        {loading && tickets.length === 0 ? (
          <LoadingState />
        ) : error && tickets.length === 0 ? (
          <ErrorState message={error} onRetry={load} />
        ) : visibleTickets.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="grid gap-4 md:gap-5"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            }}
          >
            <AnimatePresence mode="popLayout">
              {visibleTickets.map((ticket) => (
                <TicketCard
                  key={ticket.order_id}
                  ticket={ticket}
                  nowTick={nowTick}
                  onItemTap={patchItem}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ═══ Archived drawer ═══ */}
        {showArchived && archived.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 border-t border-cream/10 pt-6"
          >
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-cream/50 font-bold mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              Servis ces 30 dernières min · {archived.length}
            </h2>
            <div className="flex flex-wrap gap-2">
              {archived
                .slice()
                .reverse()
                .map((a) => (
                  <div
                    key={`${a.id}-${a.archived_at}`}
                    className="px-3 py-2 rounded-lg bg-cream/5 text-cream/70 text-xs border border-cream/10"
                  >
                    <span className="font-semibold text-cream/90">
                      T{a.table_number ?? "-"}
                    </span>{" "}
                    · {a.quantity}× {a.menu_item_name}
                  </div>
                ))}
            </div>
          </motion.section>
        )}
      </main>

      {/* ═══ Footer: back to station picker ═══ */}
      <div className="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none z-20">
        <Link
          href="/kitchen"
          className="pointer-events-auto inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#12080599] backdrop-blur-md border border-cream/15 text-cream/85 text-sm font-semibold uppercase tracking-[0.18em] hover:bg-[#120805] hover:text-gold-light transition"
        >
          <span aria-hidden>←</span> Retour aux stations
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Station switcher (compact menu in the header)
   ═══════════════════════════════════════════════════════════ */

function StationSwitcher({ current }: { current: StationKey }) {
  const [open, setOpen] = useState(false);
  const cfg = getStationConfig(current);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-[11px] uppercase tracking-[0.16em] font-bold transition"
        style={{
          background: "rgba(0,0,0,0.25)",
          color: cfg.onColor,
        }}
      >
        Changer
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/30 z-50"
          style={{ background: "#211509" }}
          role="menu"
        >
          {STATIONS_ORDER.map((key) => {
            const c = getStationConfig(key);
            const active = current === key;
            return (
              <Link
                key={key}
                href={`/kitchen/${key}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/30 transition"
                style={{ color: active ? c.color : "#f5e8d3" }}
              >
                <span className="text-base" aria-hidden>
                  {c.icon}
                </span>
                <span className="flex-1">{c.label}</span>
                {active && (
                  <span className="text-[10px] uppercase tracking-wider opacity-70">
                    ici
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/kitchen/all"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/30 transition border-t border-cream/10"
            style={{ color: current === "all" ? "#E8C97A" : "#f5e8d3" }}
          >
            <span className="text-base" aria-hidden>
              📋
            </span>
            <span className="flex-1">Tout voir</span>
            {current === "all" && (
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                ici
              </span>
            )}
          </Link>
          <Link
            href="/kitchen"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.14em] font-bold text-cream/60 hover:text-cream hover:bg-black/30 transition border-t border-cream/10"
          >
            <span aria-hidden>←</span> Retour menu
          </Link>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Ticket card
   ═══════════════════════════════════════════════════════════ */

/* Threshold (ms) beyond which a second fire on the same order is considered
 * an "add-on after fire" and the item gets the red-pulse treatment. 30s is
 * long enough to ignore jitter (batch fire sends N PATCH calls back-to-back)
 * while short enough that a legit add-on is flagged. */
const LATE_FIRE_THRESHOLD_MS = 30_000;

function TicketCard({
  ticket,
  nowTick,
  onItemTap,
}: {
  ticket: KitchenTicket;
  nowTick: number;
  onItemTap: (
    item: OrderItem,
    next: OrderItemStatus,
    tableNumber: number | null
  ) => void;
}) {
  const elapsed = useMemo(() => {
    const firedAt = ticket.fired_at
      ? new Date(ticket.fired_at).getTime()
      : nowTick;
    return Math.max(0, Math.floor((nowTick - firedAt) / 60000));
  }, [ticket.fired_at, nowTick]);

  /* Earliest fired_at across the ticket's items — anything later than that
   * + LATE_FIRE_THRESHOLD_MS is an add-on AFTER the original fire. */
  const earliestFired = useMemo(() => {
    const times = ticket.items
      .map((i) => (i.fired_at ? new Date(i.fired_at).getTime() : null))
      .filter((t): t is number => t !== null);
    return times.length > 0 ? Math.min(...times) : null;
  }, [ticket.items]);

  const urgent = elapsed >= 15;
  const warning = elapsed >= 10 && elapsed < 15;
  const allReady = ticket.items.every((i) => i.status === "ready");
  const flags = (ticket.flags ?? []) as OrderFlag[];
  /* Priority order : rush > allergy > vip > birthday — picks the dominant
   * tone for the card border. Urgent timer still wins over flags. */
  const dominantFlag: OrderFlag | null = flags.includes("rush")
    ? "rush"
    : flags.includes("allergy")
      ? "allergy"
      : flags.includes("vip")
        ? "vip"
        : flags.includes("birthday")
          ? "birthday"
          : null;
  const dominantTone = dominantFlag ? ORDER_FLAGS_META[dominantFlag].tone : null;

  const borderColor = urgent
    ? "rgba(192,57,43,0.8)"
    : dominantTone
      ? dominantTone
      : allReady
        ? "rgba(74,163,92,0.7)"
        : "rgba(184,146,47,0.55)";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.28 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="relative rounded-2xl bg-[#211509] p-4 md:p-5 flex flex-col"
      style={{
        border: `1.5px dashed ${borderColor}`,
        boxShadow: urgent
          ? "0 0 0 1px rgba(192,57,43,0.25), 0 20px 40px -20px rgba(192,57,43,0.3)"
          : "0 20px 40px -24px rgba(0,0,0,0.6)",
      }}
    >
      {urgent && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 2px rgba(192,57,43,0.35)" }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {flags.map((flag) => {
            const meta = ORDER_FLAGS_META[flag];
            return (
              <span
                key={flag}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.16em] text-white"
                style={{
                  backgroundColor: meta.tone,
                  boxShadow: `0 0 0 1.5px ${meta.tone}cc`,
                }}
              >
                <span aria-hidden>{meta.icon}</span>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      <header className="flex items-start gap-3 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-gold text-2xl leading-none" aria-hidden>
            🔔
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.22em] text-cream/50 font-bold">
                Table
              </span>
            </div>
            <div className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-cream leading-none mt-0.5">
              {ticket.table_number ?? "—"}
            </div>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div
            className={[
              "inline-flex items-center gap-1 font-mono tabular-nums text-lg font-bold leading-none",
              urgent
                ? "text-red-400"
                : warning
                  ? "text-gold-light"
                  : "text-cream/80",
            ].join(" ")}
          >
            {urgent && (
              <motion.span
                aria-hidden
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                ⏱
              </motion.span>
            )}
            {!urgent && <span aria-hidden>⏱</span>}
            <span>{elapsed} min</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-cream/45 mt-1">
            {SOURCE_LABELS[ticket.source] ?? ticket.source}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 text-[11px] text-cream/50 mb-3 flex-wrap">
        {ticket.staff_name && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cream/5">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {ticket.staff_name}
          </span>
        )}
        <span className="text-cream/30">
          #{ticket.order_id.slice(0, 6).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.open(
              `/kitchen/ticket/${ticket.order_id}`,
              `print-${ticket.order_id}`,
              "width=400,height=800"
            );
          }}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded bg-cream/5 hover:bg-gold/20 hover:text-gold-light text-cream/70 text-[10px] uppercase tracking-[0.14em] font-bold transition-colors"
          title="Imprimer le ticket cuisine"
          aria-label="Imprimer le ticket cuisine"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" aria-hidden>
            <path
              d="M6 9V4h12v5M6 18H4v-7h16v7h-2M8 14h8v6H8z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Imprimer
        </button>
      </div>

      <div
        className="h-px mb-3"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(184,146,47,0.4), transparent)",
        }}
      />

      <ul className="flex-1 space-y-2">
        {ticket.items.map((item) => {
          const firedMs = item.fired_at
            ? new Date(item.fired_at).getTime()
            : null;
          const lateAdd =
            firedMs !== null &&
            earliestFired !== null &&
            firedMs - earliestFired > LATE_FIRE_THRESHOLD_MS;
          return (
            <KitchenItemRow
              key={item.id}
              item={item}
              lateAdd={lateAdd}
              onTap={(next) => onItemTap(item, next, ticket.table_number ?? null)}
            />
          );
        })}
      </ul>

      {ticket.notes && ticket.notes.trim().length > 0 && (
        <div
          className="mt-3 p-3 rounded-lg border border-gold/30 bg-gold/5 text-cream/90 text-sm"
          role="note"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold-light font-bold mb-1">
            Note commande
          </div>
          <p className="italic leading-snug">{ticket.notes}</p>
        </div>
      )}
    </motion.article>
  );
}

/* ═══════════════════════════════════════════════════════════
   Item row — big tap target
   ═══════════════════════════════════════════════════════════ */

function KitchenItemRow({
  item,
  lateAdd,
  onTap,
}: {
  item: OrderItem;
  lateAdd?: boolean;
  onTap: (next: OrderItemStatus) => void;
}) {
  const isCooking = item.status === "cooking";
  const isReady = item.status === "ready";
  const nextStatus: OrderItemStatus = isReady ? "served" : "ready";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="relative"
    >
      {lateAdd && !isReady && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-red-400/70"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <button
        onClick={() => onTap(nextStatus)}
        className={[
          "w-full text-left rounded-xl px-3 py-3 flex items-start gap-3 transition-colors active:scale-[0.985] relative",
          isReady
            ? "bg-gold/15 border border-gold/50"
            : lateAdd
              ? "bg-red-500/15 border border-red-500/50"
              : isCooking
                ? "bg-cream/[0.04] border border-cream/10 hover:bg-cream/[0.07]"
                : "bg-cream/[0.02] border border-cream/10",
        ].join(" ")}
      >
        <span
          className={[
            "mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all",
            isReady
              ? "bg-gold text-[#1a0f0a] shadow-[0_0_0_1px_rgba(184,146,47,0.5)]"
              : "bg-transparent border-2 border-cream/30",
          ].join(" ")}
          aria-hidden
        >
          {isReady ? (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>

        <span className="flex-1 min-w-0">
          {lateAdd && !isReady && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.2em] font-black bg-red-500 text-cream px-1.5 py-0.5 rounded mr-1.5 align-middle">
              <span aria-hidden>⚡</span>
              Rajout
            </span>
          )}
          <span
            className={[
              "font-[family-name:var(--font-display)] font-semibold leading-tight inline",
              isReady ? "text-gold-light" : "text-cream",
              isReady ? "line-through decoration-gold/60" : "",
            ].join(" ")}
            style={{ fontSize: "1.05rem" }}
          >
            <span className="text-gold mr-1 font-bold tabular-nums">
              {item.quantity}×
            </span>
            {item.menu_item_name}
          </span>
          {item.modifiers && item.modifiers.length > 0 && (
            <span className="block text-xs italic text-cream/60 mt-0.5">
              {item.modifiers.join(" · ")}
            </span>
          )}
          {item.notes && item.notes.trim().length > 0 && (
            <span className="block text-xs text-terracotta mt-0.5 font-medium">
              ⚠ {item.notes}
            </span>
          )}
        </span>

        <span
          className={[
            "flex-shrink-0 text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-1 rounded-full",
            isReady
              ? "bg-gold text-[#1a0f0a]"
              : isCooking
                ? "bg-cream/10 text-cream/70"
                : "bg-cream/5 text-cream/40",
          ].join(" ")}
        >
          {isReady ? "Prêt" : isCooking ? "En cuisson" : item.status}
        </span>
      </button>
    </motion.li>
  );
}

/* ═══════════════════════════════════════════════════════════
   States: empty / loading / error
   ═══════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 md:py-32 max-w-xl mx-auto">
      <div className="text-gold/50 w-[240px] mb-6">
        <OliveBranch className="w-full h-auto" />
      </div>
      <p className="font-[family-name:var(--font-script)] text-gold text-3xl md:text-4xl mb-3">
        ✨ Aucun ticket
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold text-cream mb-2">
        Bien joué !
      </h2>
      <p className="text-cream/50 text-sm md:text-base max-w-sm">
        Aucun ticket pour le moment. Les nouvelles commandes s&apos;afficheront
        ici automatiquement.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24 text-cream/40">
      <div className="flex items-center gap-3">
        <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:150ms]" />
        <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:300ms]" />
        <span className="ml-2 text-sm uppercase tracking-[0.2em]">
          Chargement de la cuisine
        </span>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="max-w-md mx-auto mt-16 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-cream">
      <p className="font-[family-name:var(--font-display)] text-xl text-red-300 font-semibold mb-2">
        Impossible de charger la cuisine
      </p>
      <p className="text-sm text-cream/70 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-gold text-[#1a0f0a] text-sm font-bold hover:bg-gold/90 transition"
      >
        Réessayer
      </button>
    </div>
  );
}
