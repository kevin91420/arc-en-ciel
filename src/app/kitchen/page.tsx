"use client";

/**
 * /kitchen — KDS (Kitchen Display System).
 *
 * Fullscreen display meant for a TV or tablet landscape in the kitchen.
 * A chef taps items to move them through pending → cooking → ready → served.
 *
 * Realtime: listens on orders + order_items via Supabase Realtime. Falls back
 * to a 10s poll when realtime is disconnected.
 *
 * Auth: reuses the staff cookie (a chef logs in with a PIN on /staff/login).
 * Enforced in src/proxy.ts.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OliveBranch } from "@/components/Decorations";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import type {
  KitchenTicket,
  OrderItem,
  OrderItemStatus,
  Station,
} from "@/lib/db/pos-types";

/* ═══════════════════════════════════════════════════════════
   Config
   ═══════════════════════════════════════════════════════════ */

const POLL_MS = 10_000;
const ARCHIVED_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

type StationFilter = "all" | Station;

const STATION_LABELS: Record<StationFilter, string> = {
  all: "Tout",
  main: "Cuisine",
  pizza: "Pizza",
  grill: "Grill",
  cold: "Froid",
  dessert: "Dessert",
  bar: "Bar",
};

const STATION_FILTERS: StationFilter[] = [
  "all",
  "pizza",
  "grill",
  "cold",
  "dessert",
];

const SOURCE_LABELS: Record<string, string> = {
  dine_in: "Salle",
  dine_in_qr: "Salle · QR",
  takeaway: "À emporter",
  delivery: "Livraison",
};

/* ═══════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════ */

type ArchivedItem = OrderItem & {
  table_number: number | null;
  archived_at: number;
};

export default function KitchenDisplayPage() {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [archived, setArchived] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stationFilter, setStationFilter] = useState<StationFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState<string>("");
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Refs to keep stable values inside callbacks.
  const knownOrderIds = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

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
      osc.frequency.exponentialRampToValueAtTime(
        1320,
        ctx.currentTime + 0.12
      );
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.25
      );
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
      const res = await fetch("/api/kitchen/tickets", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { tickets: KitchenTicket[] } = await res.json();
      const incoming = data.tickets || [];

      // Detect new tickets (for sound notification).
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
  }, [soundOn, playPing]);

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
    async (item: OrderItem, next: OrderItemStatus, tableNumber: number | null) => {
      // Optimistic: remove from ticket if served; otherwise update its status.
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
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        // Rollback: reload from server.
        load();
      }
    },
    [load]
  );

  /* ── Ticket filtering per station ───────────────────────── */
  const filteredTickets = useMemo(() => {
    if (stationFilter === "all") return tickets;
    return tickets
      .map((t) => ({
        ...t,
        items: t.items.filter((i) => i.station === stationFilter),
      }))
      .filter((t) => t.items.length > 0);
  }, [tickets, stationFilter]);

  const totalInFlight = filteredTickets.reduce(
    (sum, t) => sum + t.items.length,
    0
  );

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(184,146,47,0.08), transparent 60%), #1a0f0a",
      }}
    >
      {/* ═══ Top bar ═══ */}
      <TopBar
        clock={clock}
        ticketsCount={filteredTickets.length}
        itemsCount={totalInFlight}
        realtimeConnected={connected}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((s) => !s)}
        stationFilter={stationFilter}
        onChangeStation={setStationFilter}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((s) => !s)}
      />

      {/* ═══ Main grid ═══ */}
      <main className="px-4 md:px-6 pt-24 pb-10">
        {loading && tickets.length === 0 ? (
          <LoadingState />
        ) : error && tickets.length === 0 ? (
          <ErrorState message={error} onRetry={load} />
        ) : filteredTickets.length === 0 ? (
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
              {filteredTickets.map((ticket) => (
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Top bar
   ═══════════════════════════════════════════════════════════ */

function TopBar({
  clock,
  ticketsCount,
  itemsCount,
  realtimeConnected,
  soundOn,
  onToggleSound,
  stationFilter,
  onChangeStation,
  showArchived,
  onToggleArchived,
}: {
  clock: string;
  ticketsCount: number;
  itemsCount: number;
  realtimeConnected: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  stationFilter: StationFilter;
  onChangeStation: (s: StationFilter) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
}) {
  return (
    <header className="fixed top-0 inset-x-0 z-20 h-auto md:h-14 bg-[#12080500]/95 backdrop-blur-md border-b border-[#3a2418]">
      <div className="px-4 md:px-6 py-3 md:py-0 md:h-14 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-5">
        {/* Left: brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-baseline gap-2 leading-none">
            <span className="font-[family-name:var(--font-display)] text-gold-light text-lg md:text-xl font-semibold tracking-tight">
              CUISINE
            </span>
            <span className="text-cream/40 text-sm">·</span>
            <span className="font-[family-name:var(--font-script)] text-gold text-base md:text-lg">
              L&apos;Arc en Ciel
            </span>
          </div>
        </div>

        {/* Middle: filters */}
        <div className="flex items-center gap-1 flex-wrap order-3 md:order-2 w-full md:w-auto md:mx-auto">
          {STATION_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => onChangeStation(s)}
              className={[
                "px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.14em] font-bold transition-all",
                stationFilter === s
                  ? "bg-gold text-[#1a0f0a] shadow-[0_0_0_1px_rgba(184,146,47,0.5)]"
                  : "bg-cream/5 text-cream/60 hover:bg-cream/10 hover:text-cream/90",
              ].join(" ")}
            >
              {STATION_LABELS[s]}
            </button>
          ))}
          <button
            onClick={onToggleArchived}
            className={[
              "ml-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.14em] font-bold transition-all",
              showArchived
                ? "bg-green-500/80 text-[#0a1f10]"
                : "bg-cream/5 text-cream/50 hover:text-cream/80",
            ].join(" ")}
            aria-pressed={showArchived}
          >
            Servis 30min
          </button>
        </div>

        {/* Right: meta + controls */}
        <div className="flex items-center gap-3 md:gap-4 ml-auto order-2 md:order-3">
          {/* Counter */}
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="font-[family-name:var(--font-display)] text-gold-light text-base md:text-lg font-semibold">
              {ticketsCount}
              <span className="text-cream/40 text-xs font-normal">
                {" "}
                ticket{ticketsCount > 1 ? "s" : ""}
              </span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-cream/40">
              {itemsCount} plat{itemsCount > 1 ? "s" : ""}
            </span>
          </div>

          {/* Clock */}
          <div
            className="hidden md:block font-mono text-cream/90 text-lg tabular-nums"
            aria-live="off"
          >
            {clock}
          </div>

          {/* Live pill */}
          <div
            className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-bold",
              realtimeConnected
                ? "bg-green-500/15 text-green-400"
                : "bg-cream/5 text-cream/40",
            ].join(" ")}
            title={
              realtimeConnected
                ? "Realtime connecté"
                : "Realtime déconnecté — polling toutes les 10s"
            }
          >
            <span
              className={[
                "w-1.5 h-1.5 rounded-full",
                realtimeConnected ? "bg-green-400 animate-pulse" : "bg-cream/40",
              ].join(" ")}
            />
            {realtimeConnected ? "Live" : "Offline"}
          </div>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg bg-cream/5 hover:bg-cream/10 text-cream/80 transition"
            aria-label={soundOn ? "Couper le son" : "Activer le son"}
            title={soundOn ? "Son activé" : "Son coupé"}
          >
            {soundOn ? (
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                aria-hidden
              >
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
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                aria-hidden
              >
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

          {/* Exit */}
          <Link
            href="/staff"
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-cream/50 hover:text-gold-light transition"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5"
              fill="none"
              aria-hidden
            >
              <path
                d="M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sortir
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   Ticket card
   ═══════════════════════════════════════════════════════════ */

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
    const firedAt = ticket.fired_at ? new Date(ticket.fired_at).getTime() : nowTick;
    return Math.max(0, Math.floor((nowTick - firedAt) / 60000));
  }, [ticket.fired_at, nowTick]);

  const urgent = elapsed >= 15;
  const warning = elapsed >= 10 && elapsed < 15;
  const allReady = ticket.items.every((i) => i.status === "ready");

  const borderColor = urgent
    ? "rgba(192,57,43,0.8)"
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
      {/* Urgent pulse halo */}
      {urgent && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 2px rgba(192,57,43,0.35)" }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
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

      {/* Serveur + meta */}
      <div className="flex items-center gap-2 text-[11px] text-cream/50 mb-3 flex-wrap">
        {ticket.staff_name && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cream/5">
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3"
              fill="none"
              aria-hidden
            >
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
      </div>

      {/* Divider */}
      <div
        className="h-px mb-3"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(184,146,47,0.4), transparent)",
        }}
      />

      {/* Items */}
      <ul className="flex-1 space-y-2">
        {ticket.items.map((item) => (
          <KitchenItemRow
            key={item.id}
            item={item}
            onTap={(next) => onItemTap(item, next, ticket.table_number ?? null)}
          />
        ))}
      </ul>

      {/* Notes */}
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
  onTap,
}: {
  item: OrderItem;
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
    >
      <button
        onClick={() => onTap(nextStatus)}
        className={[
          "w-full text-left rounded-xl px-3 py-3 flex items-start gap-3 transition-colors active:scale-[0.985]",
          isReady
            ? "bg-gold/15 border border-gold/50"
            : isCooking
              ? "bg-cream/[0.04] border border-cream/10 hover:bg-cream/[0.07]"
              : "bg-cream/[0.02] border border-cream/10",
        ].join(" ")}
      >
        {/* Checkbox */}
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

        {/* Name + modifiers */}
        <span className="flex-1 min-w-0">
          <span
            className={[
              "font-[family-name:var(--font-display)] font-semibold leading-tight block",
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

        {/* Status chip */}
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
        Cuisine vide
      </p>
      <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-semibold text-cream mb-2">
        Bien joué, chef.
      </h2>
      <p className="text-cream/50 text-sm md:text-base max-w-sm">
        Aucun ticket en cours. Les nouvelles commandes s&apos;afficheront ici
        automatiquement.
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
    <div className="max-w-md mx-auto mt-16 rounded-2xl border border-red/40 bg-red/10 p-6 text-cream">
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
